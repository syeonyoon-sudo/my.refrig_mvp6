import { CATALOG_MAP } from './catalog'
import { expiryInfo, urgencyWeight } from './expiry'
import { buildPool, earliestExpiry, itemCatalogId, poolHave, type Pool } from './inventory'
import { blockedReasons, isDisliked, norm } from './match'
import { RECIPES } from './recipes'
import type { AppData, CatalogItem, Recipe, Settings } from './types'
import { diffDays, EPS, josa, shortName, today } from './util'

export interface NeedLine {
  catalogId: string
  name: string
  emoji: string
  unit: string
  need: number
  have: number
  use: number // 실제로 쓸 양
  short: number // 사야 할 양
  optional: boolean
  days: number | null // 가장 빠른 유통기한까지 남은 일수
}

export interface SeasoningLine { item: CatalogItem; text: string; have: boolean; optional: boolean }

export interface Evaluation {
  recipe: Recipe
  ok: boolean
  excluded: string[]
  lines: NeedLine[] // 사용하는 주재료·선택 재료
  skippedOptional: string[]
  missing: NeedLine[]
  seasonings: SeasoningLine[]
  missingSeasonings: CatalogItem[]
  purchaseCount: number
  urgent: string[]
  score: number
  reasons: string[]
  purchaseCost: number
  usedValue: number
  coverage: number
  likeHit: string | null // 좋아하는 음식·재료와 겹친 이름
  recent: boolean // 최근 3일 안에 만든 메뉴
}

export interface EvalOptions {
  allowPurchase: boolean
  maxPurchase: number
  requireOwned?: boolean
  extraFilter?: (r: Recipe) => string | null // 사유 문자열을 돌려주면 제외
}

export interface Ctx {
  settings: Settings
  ref: string
  ownedSeasonings: Set<string>
  ratings: Record<string, number>
  favorites: Set<string>
  recentCooked: Set<string>
}

export function makeCtx(data: AppData, ref = today()): Ctx {
  const owned = new Set<string>(data.settings.seasonings)
  for (const it of data.inventory) {
    const cid = itemCatalogId(it)
    if (cid && CATALOG_MAP[cid]?.kind === 'seasoning' && it.qty > 0 && !it.spoiled) owned.add(cid)
  }
  const ratings: Record<string, number> = {}
  for (const r of data.ratings) ratings[r.recipeId] = r.stars
  const since = Date.now() - 3 * 86400_000
  const recentCooked = new Set(data.history.filter((h) => h.context === 'cook' && new Date(h.date).getTime() >= since).map((h) => h.recipeId))
  return { settings: data.settings, ref, ownedSeasonings: owned, ratings, favorites: new Set(data.favorites), recentCooked }
}

export const SKILL_LABEL = { 1: '초보', 2: '중급', 3: '고급' } as const
export const SPICY_LABEL = ['안 매움', '약간', '보통', '매움'] as const

export function packCost(catalogId: string, amount: number): { packs: number; cost: number } {
  const c = CATALOG_MAP[catalogId]
  if (!c || amount <= EPS) return { packs: 0, cost: 0 }
  const packs = Math.max(1, Math.ceil(amount / c.pack.size - 1e-6))
  return { packs, cost: packs * c.pack.price }
}

/** 레시피 하나를 현재 재고(pool) 기준으로 평가 */
export function evaluateRecipe(recipe: Recipe, pool: Pool, ctx: Ctx, opt: EvalOptions): Evaluation {
  const s = ctx.settings
  const excluded: string[] = []
  const lines: NeedLine[] = []
  const missing: NeedLine[] = []
  const skippedOptional: string[] = []
  const seasonings: SeasoningLine[] = []

  for (const ri of recipe.ingredients) {
    const c = CATALOG_MAP[ri.id]
    if (!c) continue
    const blocked = blockedReasons(c.name, c.id, s)
    const disliked = isDisliked(c.name, c.id, s.dislikes)
    if (blocked.length || disliked) {
      if (ri.optional) { skippedOptional.push(c.name); continue }
      if (blocked.length) excluded.push(`${c.name}: ${blocked.join(', ')}`)
      else excluded.push(`싫어하는 재료(${c.name})`)
      continue
    }
    if (c.kind === 'seasoning') {
      const have = ctx.ownedSeasonings.has(c.id)
      seasonings.push({ item: c, text: ri.text ?? '', have, optional: !!ri.optional })
      continue
    }
    const need = ri.amount ?? 0
    const have = poolHave(pool, c.id)
    const exp = earliestExpiry(pool, c.id)
    const days = exp ? diffDays(ctx.ref, exp) : null
    if (ri.optional) {
      if (have <= EPS) { skippedOptional.push(c.name); continue }
      const use = Math.min(have, need)
      lines.push({ catalogId: c.id, name: shortName(c.name), emoji: c.emoji, unit: c.unit, need, have, use, short: 0, optional: true, days })
      continue
    }
    const use = Math.min(have, need)
    const short = Math.max(0, need - have)
    const line: NeedLine = { catalogId: c.id, name: shortName(c.name), emoji: c.emoji, unit: c.unit, need, have, use, short: short < EPS ? 0 : short, optional: false, days }
    lines.push(line)
    if (line.short > 0) missing.push(line)
  }

  if (!recipe.tools.every((t) => s.tools.includes(t))) {
    excluded.push(`조리도구 없음(${recipe.tools.filter((t) => !s.tools.includes(t)).join(', ')})`)
  }
  if (recipe.time > s.maxTime) excluded.push(`조리 시간 ${recipe.time}분 > 설정 ${s.maxTime}분`)
  if (recipe.difficulty > s.skill) excluded.push(`난이도 ${SKILL_LABEL[recipe.difficulty]}`)
  if (recipe.spicy > s.spicy) excluded.push(`매운 정도(${SPICY_LABEL[recipe.spicy]})`)
  const extra = opt.extraFilter?.(recipe)
  if (extra) excluded.push(extra)

  const missingSeasonings = seasonings.filter((x) => !x.have && !x.optional).map((x) => x.item)
  const purchaseCount = missing.length + missingSeasonings.length
  if (!opt.allowPurchase && purchaseCount > 0) excluded.push(`추가 구매 필요(${purchaseCount}개)`)
  else if (opt.allowPurchase && purchaseCount > opt.maxPurchase) excluded.push(`추가 구매 ${purchaseCount}개 > 허용 ${opt.maxPurchase}개`)

  const mains = lines.filter((l) => !l.optional)
  const mainCount = mains.length
  const coverage = mainCount ? mains.reduce((acc, l) => acc + (l.short <= EPS ? 1 : l.use > EPS ? 0.5 : 0), 0) / mainCount : 0
  const ownedAny = lines.some((l) => l.use > EPS)
  if ((opt.requireOwned ?? true) && !ownedAny) excluded.push('보유한 재료를 하나도 쓰지 않음')

  // 점수
  let urg = 0
  const urgent: string[] = []
  for (const l of lines) {
    if (l.use <= EPS) continue
    urg += urgencyWeight(l.days) * Math.min(1, l.use / Math.max(l.need, EPS))
    if (l.days != null && l.days <= 3) urgent.push(l.name)
  }
  const tasteHits = recipe.tastes.filter((t) => s.tastes.includes(t))
  const rating = ctx.ratings[recipe.id]
  let score = 10 * coverage + 2.2 * urg - 3.5 * purchaseCount + 1.2 * tasteHits.length + lines.filter((l) => l.optional).length * 0.4
  if (rating) score += (rating - 3) * 0.8
  if (ctx.favorites.has(recipe.id)) score += 1
  const likeHit = likedMatch(recipe, s.likes ?? [])
  if (likeHit) score += 4
  const recent = ctx.recentCooked.has(recipe.id)
  if (recent) score -= 8

  let purchaseCost = 0
  for (const m of missing) purchaseCost += packCost(m.catalogId, m.short).cost
  for (const ms of missingSeasonings) purchaseCost += ms.pack.price
  let usedValue = 0
  for (const l of lines) {
    const c = CATALOG_MAP[l.catalogId]
    usedValue += (l.use / c.pack.size) * c.pack.price
  }

  const reasons: string[] = []
  if (urgent.length) { const w = urgent.join('·'); reasons.push(`기한이 얼마 안 남은 ${w}${josa(w, '을', '를')} 먼저 써요`) }
  if (purchaseCount === 0) reasons.push('지금 있는 재료만으로 만들 수 있어요')
  else reasons.push(`${[...missing.map((m) => m.name), ...missingSeasonings.map((m) => m.name)].join('·')}만 사면 돼요`)
  if (likeHit) reasons.push(`좋아하는 '${likeHit}'`)
  else if (tasteHits.length) reasons.push(`좋아하는 ${tasteHits.join('·')} 맛`)
  reasons.push(`${recipe.time}분 · ${SKILL_LABEL[recipe.difficulty]} 난이도`)
  if (rating && rating >= 4) reasons.push(`전에 ${rating}점을 준 메뉴`)

  return {
    recipe, ok: excluded.length === 0, excluded, lines, skippedOptional, missing, seasonings, missingSeasonings,
    purchaseCount, urgent, score, reasons, purchaseCost, usedValue, coverage, likeHit, recent,
  }
}

/** 좋아하는 음식·재료가 메뉴 이름이나 주재료에 들어 있는지 */
export function likedMatch(recipe: Recipe, likes: string[]): string | null {
  if (!likes.length) return null
  const names = [recipe.name, ...recipe.ingredients.filter((i) => !i.optional && CATALOG_MAP[i.id]?.kind === 'ingredient').flatMap((i) => [CATALOG_MAP[i.id].name, ...CATALOG_MAP[i.id].aliases])]
  const hay = names.map(norm)
  for (const l of likes) {
    const k = norm(l)
    if (k && hay.some((h) => h.includes(k) || (h.length >= 2 && k.includes(h)))) return l
  }
  return null
}

/** 메뉴 종류 (다양성 계산용) */
export type DishStyle = 'rice' | 'soup' | 'noodle' | 'side'
export function dishStyle(r: Recipe): DishStyle {
  if (/면|파스타|라면|우동|국수|떡볶이|스파게티/.test(r.name)) return 'noodle'
  if (/찌개|국|탕|전골/.test(r.name)) return 'soup'
  if (/밥|덮밥|카레|리조또|오므라이스/.test(r.name) || r.ingredients.some((i) => i.id === 'rice' && !i.optional)) return 'rice'
  return 'side'
}
export const STYLE_LABEL: Record<DishStyle, string> = { rice: '밥', soup: '국·찌개', noodle: '면·분식', side: '반찬·일품' }

function primaryOf(r: Recipe): string {
  return r.ingredients.find((i) => !i.optional && CATALOG_MAP[i.id]?.kind === 'ingredient' && i.id !== 'rice')?.id ?? ''
}

/** 초보도 쉽게 따라 할 수 있는 메뉴 (초보 난이도 + 20분 이내) */
export function isBeginnerFriendly(r: Recipe): boolean {
  return r.difficulty === 1 && r.time <= 20
}

/**
 * 비슷한 메뉴가 몰리지 않게 고르기
 * - 점수가 높은 순으로 하나씩 고르되, 이미 고른 메뉴와 종류(밥·국·면·반찬)나 대표 재료가 같으면 감점
 * - 다 고른 뒤에는 추가 구매가 적은 메뉴가 먼저 보이게 정렬
 */
export function diversify(items: Evaluation[], limit: number): Evaluation[] {
  const pool = items.slice()
  const picked: Evaluation[] = []
  while (picked.length < limit && pool.length) {
    let bi = 0, best = -Infinity
    pool.forEach((e, i) => {
      const st = dishStyle(e.recipe), pr = primaryOf(e.recipe)
      const adj = e.score - picked.filter((p) => dishStyle(p.recipe) === st).length * 6 - picked.filter((p) => pr && primaryOf(p.recipe) === pr).length * 3
      if (adj > best) { best = adj; bi = i }
    })
    picked.push(pool.splice(bi, 1)[0])
  }
  return picked.map((e, i) => ({ e, i })).sort((a, b) => a.e.purchaseCount - b.e.purchaseCount || a.i - b.i).map((x) => x.e)
}

export type QuickKey = 't10' | 't20' | 'fewDishes' | 'microwave' | 'onePan' | 'beginner' | 'noBuy' | 'fridgeOnly'

export const QUICK_OPTIONS: { key: QuickKey; label: string; emoji: string; desc: string }[] = [
  { key: 't10', label: '10분 안에 먹기', emoji: '⚡', desc: '조리 10분 이하' },
  { key: 't20', label: '20분 안에 먹기', emoji: '⏱️', desc: '조리 20분 이하' },
  { key: 'fewDishes', label: '설거지 적게', emoji: '🧽', desc: '그릇·도구 최소' },
  { key: 'microwave', label: '전자레인지로', emoji: '📦', desc: '불 없이 조리' },
  { key: 'onePan', label: '프라이팬 하나로', emoji: '🍳', desc: '팬·냄비 하나' },
  { key: 'beginner', label: '초보자용', emoji: '🌱', desc: '난이도 초보' },
  { key: 'noBuy', label: '추가 구매 없이', emoji: '🛑', desc: '사러 가지 않기' },
  { key: 'fridgeOnly', label: '냉장고 재료만', emoji: '🧊', desc: '보유 재료 최대 활용' },
]

export interface RecommendOptions {
  quick?: QuickKey[]
  exclude?: string[]
  limit?: number
  includeAI?: boolean
  settingsOverride?: Partial<Settings>
  use?: string // 이 재료(catalog id)를 쓰는 메뉴만
  diverse?: boolean // 비슷한 메뉴 반복 줄이기 (기본 true)
}

export interface RecommendResult {
  items: Evaluation[]
  excludedCount: number
  expiredUsedWarning: string[]
  total: number // 조건을 통과한 메뉴 수
}

/** 현재 냉장고 기준 메뉴 추천 */
export function recommend(data: AppData, o: RecommendOptions = {}): RecommendResult {
  const ref = today()
  const ctx = makeCtx(data, ref)
  const q = new Set(o.quick ?? [])
  const settings: Settings = { ...data.settings, ...o.settingsOverride }
  if (q.has('t10')) settings.maxTime = Math.min(settings.maxTime, 10) as Settings['maxTime']
  if (q.has('t20')) settings.maxTime = Math.min(settings.maxTime, 20) as Settings['maxTime']
  if (q.has('beginner')) settings.skill = 1
  const noBuy = q.has('noBuy') || q.has('fridgeOnly')
  ctx.settings = settings
  const pool = buildPool(data.inventory, ref)
  const opt: EvalOptions = {
    allowPurchase: noBuy ? false : settings.allowPurchase,
    maxPurchase: settings.maxPurchase,
    extraFilter: (r) => {
      if (q.has('fewDishes') && !r.tags.includes('fewDishes')) return '설거지 많음'
      if (q.has('microwave') && !(r.tags.includes('microwave') || r.tags.includes('noFire'))) return '전자레인지·불 없이 불가'
      if (q.has('onePan') && !(r.tags.includes('onePan') || r.tools.length <= 1)) return '도구 2개 이상'
      if (o.use && !r.ingredients.some((i) => i.id === o.use)) return '선택한 재료를 쓰지 않음'
      return null
    },
  }
  const pool2 = [...RECIPES, ...(o.includeAI ? data.aiRecipes : [])]
  const all = pool2.filter((r) => !(o.exclude ?? []).includes(r.id)).map((r) => evaluateRecipe(r, pool, ctx, opt))
  const ok = all.filter((e) => e.ok)
  if (q.has('fridgeOnly')) ok.forEach((e) => { e.score += e.lines.filter((l) => l.use > EPS).length * 1.5 })
  const usable = o.use ? ok.filter((e) => e.lines.some((l) => l.catalogId === o.use && l.use > EPS)) : ok
  usable.sort((a, b) => b.score - a.score)
  const limit = o.limit ?? 6
  const items = o.diverse === false ? usable.slice(0, limit) : diversify(usable, limit)

  // 기한 지난 재료가 필요한 메뉴 안내용
  const expiredNames = data.inventory.filter((it) => !it.spoiled && expiryInfo(it.expiresAt, ref).level === 'expired').map((it) => it.name)
  return { items, excludedCount: all.length - usable.length, expiredUsedWarning: expiredNames, total: usable.length }
}

/** 하나의 레시피를 현재 재고로 평가 (상세 화면용, 제외 사유도 함께 보여줌) */
export function evaluateNow(data: AppData, recipe: Recipe): Evaluation {
  const ctx = makeCtx(data)
  const pool = buildPool(data.inventory)
  return evaluateRecipe(recipe, pool, ctx, { allowPurchase: true, maxPurchase: 99, requireOwned: false })
}
