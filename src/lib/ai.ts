// 브라우저 → 서버(/api/ai) 호출. API 키는 서버에만 있습니다.
// 고정된 예시 결과는 쓰지 않습니다. AI가 연결되지 않았으면 오류와 설정 방법을 보여줍니다.
import { CATALOG, CATALOG_MAP, INGREDIENTS, SEASONINGS } from './catalog'
import { expiryInfo, isUsable } from './expiry'
import { itemCatalogId } from './inventory'
import { blockedReasons, resolveCatalog } from './match'
import type { AppData, Category, Recipe, RecipeIng, Tool } from './types'
import { toBase } from './units'

export interface AIStatus { ai: boolean; model: string | null; checked: boolean; reachable: boolean }

export async function fetchStatus(): Promise<AIStatus> {
  try {
    const r = await fetch('/api/status', { cache: 'no-store' })
    const type = r.headers.get('content-type') ?? ''
    if (!r.ok || !type.includes('json')) return { ai: false, model: null, checked: true, reachable: false }
    const j = await r.json()
    return { ai: !!j.ai, model: j.model ?? null, checked: true, reachable: true }
  } catch {
    return { ai: false, model: null, checked: true, reachable: false }
  }
}

export class AIError extends Error {
  code?: string
  constructor(msg: string, code?: string) { super(msg); this.code = code }
}

async function callAI<T>(task: string, payload: unknown): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 120_000)
  try {
    const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task, payload }), signal: ctrl.signal })
    const type = r.headers.get('content-type') ?? ''
    if (!type.includes('json')) throw new AIError('AI 서버(/api/ai)를 찾지 못했어요. Vercel에 배포된 주소에서 실행하거나, 내 컴퓨터에서는 "vercel dev"로 실행해 주세요.', 'NO_SERVER')
    const j = await r.json().catch(() => null)
    if (r.status === 413) throw new AIError('사진 용량이 너무 커요. 더 작은 사진으로 다시 시도해 주세요.')
    if (!r.ok || !j?.ok) throw new AIError(j?.error ?? `AI 서버 오류 (${r.status})`, j?.code)
    return j.result as T
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new AIError('AI 응답이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.')
    if (e instanceof AIError) throw e
    throw new AIError(`AI 서버에 연결하지 못했어요: ${(e as Error).message}`)
  } finally {
    clearTimeout(timer)
  }
}

const VOCAB = CATALOG.map((c) => `${c.name.replace(/\(.*\)/, '')}(${c.unit})`)
const TOOLS: Tool[] = ['프라이팬', '냄비', '전자레인지', '에어프라이어', '오븐', '전기밥솥']

const CATEGORY_FROM_KO: Record<string, Category> = {
  채소: 'veg', 과일: 'fruit', 육류: 'meat', 수산: 'seafood', '계란·유제품': 'egg_dairy', 유제품: 'egg_dairy', 계란: 'egg_dairy',
  '두부·콩': 'tofu_bean', '밥·면·빵': 'grain', 가공식품: 'processed', '양념·소스': 'sauce', 기타: 'etc',
}
export function categoryFromText(s: string | undefined | null): Category | null {
  if (!s) return null
  return CATEGORY_FROM_KO[s.trim()] ?? null
}

// ─────────────── 이미지 인식 ───────────────

export type Box = [number, number, number, number]

export interface Recognized {
  name: string | null
  unknown: boolean
  candidates: string[]
  category: Category | null
  qty: number
  unit: string
  amount: number | null
  amountUnit: string | null
  amountText: string
  packaging: string
  box: Box | null
  confidence: 'high' | 'medium' | 'low'
  note: string
  price: number | null
  isFood: boolean
  raw: string
  reason?: string
}

type RawRec = Partial<Omit<Recognized, 'category' | 'box'>> & { category?: string; box?: number[] | null; name?: string | null }

function clean(x: RawRec): Recognized {
  const name = typeof x.name === 'string' && x.name.trim() ? x.name.trim() : null
  const unknown = !!x.unknown || !name
  const cid = name ? resolveCatalog(name) : null
  const c = cid ? CATALOG_MAP[cid] : null
  let qty = Number(x.qty)
  let unit = String(x.unit || c?.unit || '개')
  if (!(qty > 0)) qty = 1
  // 용량(amount)이 재료 기준 단위로 바로 쓸 수 있으면 그걸 우선 사용 (예: 우유 1개 → 1000ml)
  const amount = Number(x.amount)
  const amountUnit = x.amountUnit ? String(x.amountUnit) : null
  if (c && amount > 0 && amountUnit && toBase(cid, amount, amountUnit) != null && (c.unit === 'g' || c.unit === 'ml' || toBase(cid, qty, unit) == null)) {
    qty = amount; unit = amountUnit
  }
  const box = Array.isArray(x.box) && x.box.length === 4 && x.box.every((v) => typeof v === 'number') ? (x.box.map((v) => Math.max(0, Math.min(1, v))) as Box) : null
  return {
    name, unknown,
    candidates: Array.isArray(x.candidates) ? x.candidates.filter((s) => typeof s === 'string' && s.trim()).slice(0, 4) : [],
    category: categoryFromText(x.category) ?? c?.category ?? null,
    qty, unit,
    amount: amount > 0 ? amount : null, amountUnit,
    amountText: String(x.amountText ?? ''), packaging: String(x.packaging ?? ''), box,
    confidence: x.confidence === 'high' || x.confidence === 'medium' ? x.confidence : 'low',
    note: String(x.note ?? ''), price: typeof x.price === 'number' ? x.price : null,
    isFood: x.isFood ?? true, raw: String(x.raw ?? ''), reason: x.reason ? String(x.reason) : undefined,
  }
}

export interface ImageData { data: string; mediaType: string }

export async function aiFridge(image: ImageData, hint?: string): Promise<Recognized[]> {
  const r = await callAI<{ items: RawRec[] }>('fridge', { image: image.data, mediaType: image.mediaType, hint })
  return (r.items ?? []).map(clean)
}

/** 사용자가 사진에서 고른 영역(잘라낸 이미지)을 다시 분석 */
export async function aiIdentify(crop: ImageData, hint?: string): Promise<Recognized> {
  const r = await callAI<RawRec>('identify', { image: crop.data, mediaType: crop.mediaType, hint })
  return clean(r)
}

export interface ChatTurn { role: 'user' | 'ai'; text: string }
export interface AskUpdate { index: number | null; name?: string; qty?: number; unit?: string; amount?: number; amountUnit?: string; amountText?: string }

/** 사진에 대한 추가 질문 ("이 우유 몇 ml 정도예요?") */
export async function aiAsk(image: ImageData, items: { index: number; name: string; qty: number; unit: string; amountText?: string }[], history: ChatTurn[], question: string): Promise<{ answer: string; updates: AskUpdate[] }> {
  const r = await callAI<{ answer?: string; updates?: AskUpdate[] }>('ask', { image: image.data, mediaType: image.mediaType, items, history: history.slice(-8), question })
  return { answer: String(r.answer ?? ''), updates: Array.isArray(r.updates) ? r.updates.filter((u) => u && (u.index == null || typeof u.index === 'number')) : [] }
}

export interface ReceiptResult { store: string; date: string | null; total: number | null; items: Recognized[] }

export async function aiReceipt(image: ImageData, partial = false): Promise<ReceiptResult> {
  const r = await callAI<{ store?: string; date?: string | null; total?: number | null; items?: RawRec[] }>('receipt', { image: image.data, mediaType: image.mediaType, partial })
  const date = typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null
  return {
    store: r.store ?? '', date, total: typeof r.total === 'number' ? r.total : null,
    items: (r.items ?? []).filter((x) => x?.name || x?.raw).map((x) => clean({ ...x, unknown: x.unknown || !x.name })),
  }
}

// ─────────────── 메뉴 추천 ───────────────

interface AIMenu {
  name: string; emoji?: string; desc?: string; reason?: string; time?: number; difficulty?: number; tools?: string[]; spicy?: number; tastes?: string[]
  ingredients?: { name: string; amount?: number; unit?: string; optional?: boolean }[]
  seasonings?: { name: string; text?: string }[]
  steps?: string[]; tip?: string; leftoverTips?: string[]
}

export interface AIRecipe { recipe: Recipe; reason: string }

export async function aiRecommend(data: AppData, exclude: string[]): Promise<{ recipes: AIRecipe[]; rejected: string[] }> {
  const s = data.settings
  const inventory = data.inventory.filter((it) => isUsable(it)).map((it) => {
    const cid = itemCatalogId(it)
    return {
      name: cid ? CATALOG_MAP[cid]?.name.replace(/\(.*\)/, '') ?? it.name : it.name,
      qty: it.qty, unit: it.unit, daysLeft: expiryInfo(it.expiresAt).days, approx: it.qtySource === 'unknown' || it.qtySource === 'ai' ? true : undefined,
    }
  })
  const seasonings = s.seasonings.map((id) => CATALOG_MAP[id]?.name).filter(Boolean)
  const res = await callAI<{ menus: AIMenu[] }>('recommend', {
    count: 3, inventory, seasonings, exclude, vocabulary: VOCAB,
    settings: {
      skill: s.skill, maxTime: s.maxTime, tools: s.tools, allergens: s.allergens, banned: s.banned, dislikes: s.dislikes,
      tastes: s.tastes, spicy: s.spicy, allowPurchase: s.allowPurchase, maxPurchase: s.maxPurchase, dailyBudget: s.dailyBudget,
    },
  })
  const recipes: AIRecipe[] = []
  const rejected: string[] = []
  for (const m of res.menus ?? []) {
    const r = aiMenuToRecipe(m, data)
    if ('error' in r) rejected.push(`${m.name}: ${r.error}`)
    else recipes.push({ recipe: r.recipe, reason: m.reason ?? '' })
  }
  return { recipes, rejected }
}

function slugify(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0
  return `ai-${Math.abs(h).toString(36)}`
}

export function aiMenuToRecipe(m: AIMenu, data: AppData): { recipe: Recipe } | { error: string } {
  if (!m.name || !Array.isArray(m.ingredients) || !Array.isArray(m.steps) || !m.steps.length) return { error: '응답 형식이 올바르지 않음' }
  const ingredients: RecipeIng[] = []
  for (const i of m.ingredients) {
    const cid = resolveCatalog(i.name)
    const c = cid ? CATALOG_MAP[cid] : null
    if (!c) {
      if (i.optional) continue
      return { error: `재료 "${i.name}"을(를) 확인할 수 없음` }
    }
    const blocked = blockedReasons(i.name, cid, data.settings)
    if (blocked.length) return { error: `${i.name} ${blocked.join(', ')}` }
    if (c.kind === 'seasoning') { ingredients.push({ id: c.id, text: '적당량', optional: i.optional }); continue }
    const base = toBase(cid, Number(i.amount ?? 1), i.unit ?? c.unit) ?? (i.unit ? null : Number(i.amount ?? 1))
    if (base == null || !isFinite(base) || base <= 0) return { error: `${i.name}의 양(${i.amount}${i.unit})을 계산할 수 없음` }
    if (!ingredients.some((x) => x.id === c.id)) ingredients.push({ id: c.id, amount: Math.round(base * 1000) / 1000, optional: !!i.optional })
  }
  for (const sn of m.seasonings ?? []) {
    const cid = resolveCatalog(sn.name)
    const c = cid ? CATALOG_MAP[cid] : null
    const blocked = blockedReasons(sn.name, cid, data.settings)
    if (blocked.length) return { error: `양념 ${sn.name} ${blocked.join(', ')}` }
    if (c && !ingredients.some((x) => x.id === c.id)) ingredients.push({ id: c.id, text: sn.text ?? '적당량' })
  }
  if (!ingredients.some((x) => CATALOG_MAP[x.id].kind === 'ingredient')) return { error: '주재료가 없음' }
  const tools = (m.tools ?? []).filter((t): t is Tool => TOOLS.includes(t as Tool))
  const recipe: Recipe = {
    id: slugify(m.name), name: m.name, emoji: m.emoji || '🍽️', desc: m.desc ?? '', ai: true,
    time: Math.max(1, Math.round(Number(m.time) || 20)),
    difficulty: (Math.min(3, Math.max(1, Math.round(Number(m.difficulty) || 1))) as 1 | 2 | 3),
    tools, spicy: (Math.min(3, Math.max(0, Math.round(Number(m.spicy) || 0))) as 0 | 1 | 2 | 3),
    tastes: m.tastes ?? [], tags: tools.length <= 1 ? ['onePan'] : [], ingredients, steps: m.steps, tip: m.tip || undefined,
    leftoverTips: Array.isArray(m.leftoverTips) ? m.leftoverTips.filter((x) => typeof x === 'string').slice(0, 3) : undefined,
  }
  return { recipe }
}

// ─────────────── 대체 재료 질문 ───────────────

export interface SubAnswer {
  answer: string
  target: string | null
  canOmit: boolean | null
  options: { name: string; amount: number | null; unit: string | null; reason: string; taste: string; method: string }[]
}

export async function aiSubQA(data: AppData, recipe: Recipe, question: string, ingredient?: string): Promise<SubAnswer> {
  const owned = data.inventory.filter((it) => isUsable(it)).map((it) => it.name)
  const blocked = [...data.settings.allergens, ...data.settings.banned]
  const ingredients = recipe.ingredients.map((i) => {
    const c = CATALOG_MAP[i.id]
    return { name: c?.name.replace(/\(.*\)/, ''), amount: i.amount ?? i.text, unit: c?.kind === 'ingredient' ? c.unit : undefined, optional: i.optional || undefined }
  })
  const r = await callAI<Partial<SubAnswer>>('subqa', { recipe: recipe.name, ingredients, question, ingredient, owned, blocked, vocabulary: VOCAB })
  return {
    answer: String(r.answer ?? ''), target: r.target ? String(r.target) : null,
    canOmit: typeof r.canOmit === 'boolean' ? r.canOmit : null,
    options: (Array.isArray(r.options) ? r.options : []).filter((o) => o?.name).map((o) => ({
      name: String(o.name), amount: typeof o.amount === 'number' ? o.amount : null, unit: o.unit ? String(o.unit) : null,
      reason: String(o.reason ?? ''), taste: String(o.taste ?? ''), method: String(o.method ?? ''),
    })),
  }
}

export const ALL_TOOLS = TOOLS
export { INGREDIENTS, SEASONINGS, itemCatalogId }
