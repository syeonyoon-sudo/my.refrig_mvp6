// 데이터 변경 함수 모음 (모두 순수 함수: 이전 데이터 → 새 데이터)
import { CATALOG_MAP } from './catalog'
import type { Evaluation } from './engine'
import { addToInventory, consumeInventory, restoreDeductions, type NewItem } from './inventory'
import { resolveCatalog } from './match'
import { summarizePlan } from './planner'
import { purchasedBase, setContributions, estUnitPrice } from './shopping'
import type { AppData, Deduction, HistoryEntry, InventoryItem, Plan, Purchase, Recipe, Settings, UseLine, UsageLog } from './types'
import { addDays, round, today, uid } from './util'
import { fromBase } from './units'

export const DEFAULT_SETTINGS: Settings = {
  nickname: '',
  skill: 1,
  maxTime: 30,
  allowPurchase: true,
  maxPurchase: 2,
  tools: ['프라이팬', '냄비', '전자레인지'],
  allergens: [],
  banned: [],
  dislikes: [],
  likes: [],
  tastes: [],
  spicy: 2,
  dailyBudget: 10000,
  weeklyBudget: 60000,
  seasonings: ['soy', 'salt', 'sugar', 'oil', 'pepper', 'sesame_oil', 'garlic_minced', 'gochugaru', 'gochujang'],
  useAI: true,
  slots: ['아침', '점심', '저녁'],
  notify: false,
}

export function defaultData(nickname = ''): AppData {
  return {
    version: 1, onboarded: false, inventory: [], settings: { ...DEFAULT_SETTINGS, nickname },
    plans: [], shopping: [], cart: [], purchases: [], receipts: [], usage: [], history: [], ratings: [], favorites: [], aiRecipes: [],
  }
}

/** 저장된 데이터가 옛 형식이어도 빠진 값을 기본값으로 채움 */
export function normalizeData(raw: unknown, nickname = ''): AppData {
  const d = defaultData(nickname)
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Partial<AppData>
  return {
    ...d, ...r,
    settings: { ...d.settings, ...(r.settings ?? {}) },
    inventory: r.inventory ?? [], plans: r.plans ?? [], shopping: r.shopping ?? [], cart: r.cart ?? [],
    purchases: r.purchases ?? [], receipts: r.receipts ?? [], usage: r.usage ?? [], history: r.history ?? [],
    ratings: r.ratings ?? [], favorites: r.favorites ?? [], aiRecipes: r.aiRecipes ?? [],
  }
}

// ───────────── 재고 ─────────────

export function addItem(data: AppData, item: NewItem): { data: AppData; merged: boolean } {
  const r = addToInventory(data.inventory, item)
  return { data: { ...data, inventory: r.inventory }, merged: !!r.merged }
}

export function updateItem(data: AppData, id: string, patch: Partial<InventoryItem>): AppData {
  if (patch.qty != null) {
    const cur = data.inventory.find((x) => x.id === id)
    if (cur && (cur.initialQty == null || patch.qty > cur.initialQty || patch.unit !== undefined && patch.unit !== cur.unit)) patch = { ...patch, initialQty: patch.qty }
  }
  return { ...data, inventory: data.inventory.map((x) => (x.id === id ? { ...x, ...patch, catalogId: patch.name != null && patch.catalogId === undefined ? resolveCatalog(patch.name) : (patch.catalogId !== undefined ? patch.catalogId : x.catalogId) } : x)) }
}

export function deleteItem(data: AppData, id: string): AppData {
  return { ...data, inventory: data.inventory.filter((x) => x.id !== id) }
}

/** 버리기: 음식물 쓰레기 통계에 기록 */
export function discardItem(data: AppData, id: string): AppData {
  const it = data.inventory.find((x) => x.id === id)
  if (!it) return data
  const log: UsageLog = { id: uid('u'), date: today(), name: it.name, catalogId: it.catalogId, qty: it.qty, unit: it.unit, kind: 'discard', urgent: false }
  return { ...data, inventory: data.inventory.filter((x) => x.id !== id), usage: [log, ...data.usage].slice(0, 500) }
}

/** 수량 조절 (+/-). 줄인 양은 "사용"으로 기록 */
export function adjustQty(data: AppData, id: string, delta: number): AppData {
  const it = data.inventory.find((x) => x.id === id)
  if (!it) return data
  const qty = Math.max(0, round(it.qty + delta, 4))
  let usage = data.usage
  if (delta < 0) {
    usage = [{ id: uid('u'), date: today(), name: it.name, catalogId: it.catalogId, qty: Math.min(it.qty, -delta), unit: it.unit, kind: 'cook' as const, urgent: false }, ...usage].slice(0, 500)
  }
  if (qty <= 0) return { ...data, usage, inventory: data.inventory.filter((x) => x.id !== id) }
  return { ...data, usage, inventory: data.inventory.map((x) => (x.id === id ? { ...x, qty, initialQty: x.initialQty != null && qty > x.initialQty ? qty : x.initialQty } : x)) }
}

// ───────────── 요리하기(재고 차감) ─────────────

export interface CookResult { data: AppData; deductions: Deduction[]; shortNotes: string[]; logIds: string[] }

export function consumeUses(data: AppData, uses: UseLine[], kind: 'cook' | 'plan', mealName: string): CookResult {
  let inventory = data.inventory
  const deductions: Deduction[] = []
  const logs: UsageLog[] = []
  const shortNotes: string[] = []
  for (const u of uses) {
    if (!u.catalogId) continue
    const r = consumeInventory(inventory, u.catalogId, u.amount)
    inventory = r.inventory
    deductions.push(...r.deductions)
    for (const d of r.deductions) {
      logs.push({ id: uid('u'), date: today(), name: d.name, catalogId: u.catalogId, qty: d.qty, unit: d.unit, kind, urgent: r.urgent, meal: mealName })
    }
    if (r.short > 1e-6 && !u.optional) {
      const c = CATALOG_MAP[u.catalogId]
      shortNotes.push(`${c.name} ${round(r.short, 2)}${c.unit} 부족`)
    }
  }
  return { data: { ...data, inventory, usage: [...logs, ...data.usage].slice(0, 500) }, deductions, shortNotes, logIds: logs.map((l) => l.id) }
}

export function cookRecipe(data: AppData, ev: Evaluation, uses: UseLine[]): CookResult {
  const r = consumeUses(data, uses, 'cook', ev.recipe.name)
  const h: HistoryEntry = { id: uid('h'), date: new Date().toISOString(), recipeId: ev.recipe.id, name: ev.recipe.name, emoji: ev.recipe.emoji, context: 'cook' }
  return { ...r, data: { ...r.data, history: [h, ...r.data.history].slice(0, 100) } }
}

export function undoCook(data: AppData, deductions: Deduction[], logIds: string[]): AppData {
  const ids = new Set(logIds)
  return { ...data, inventory: restoreDeductions(data.inventory, deductions), usage: data.usage.filter((u) => !ids.has(u.id)) }
}

// ───────────── 식단 계획 ─────────────

export function upsertPlan(data: AppData, plan: Plan): AppData {
  const exists = data.plans.some((p) => p.id === plan.id)
  const plans = exists ? data.plans.map((p) => (p.id === plan.id ? plan : p)) : [plan, ...data.plans]
  return syncShopping({ ...data, plans })
}

export function completeMeal(data: AppData, planId: string, mealId: string): { data: AppData; shortNotes: string[] } {
  const plan = data.plans.find((p) => p.id === planId)
  const meal = plan?.meals.find((m) => m.id === mealId)
  if (!plan || !meal || meal.status === 'done') return { data, shortNotes: [] }
  const r = consumeUses(data, meal.uses, 'plan', meal.name)
  const meals = plan.meals.map((m) => (m.id === mealId ? { ...m, status: 'done' as const, deducted: r.deductions, logIds: r.logIds, shortNote: r.shortNotes.join(', ') || undefined } : m))
  const allDone = meals.every((m) => m.status !== 'planned')
  const nextPlan: Plan = { ...plan, meals, status: allDone ? 'done' : plan.status }
  let next: AppData = { ...r.data, plans: data.plans.map((p) => (p.id === planId ? nextPlan : p)) }
  if (meal.recipeId) {
    next = { ...next, history: [{ id: uid('h'), date: new Date().toISOString(), recipeId: meal.recipeId, name: meal.name, emoji: meal.emoji, context: 'cook' as const }, ...next.history].slice(0, 100) }
  }
  return { data: syncShopping(next), shortNotes: r.shortNotes }
}

/** 완료 취소: 차감했던 재고를 정확히 되돌림 */
export function undoMeal(data: AppData, planId: string, mealId: string): AppData {
  const plan = data.plans.find((p) => p.id === planId)
  const meal = plan?.meals.find((m) => m.id === mealId)
  if (!plan || !meal || meal.status !== 'done') return data
  const inventory = restoreDeductions(data.inventory, meal.deducted ?? [])
  const meals = plan.meals.map((m) => (m.id === mealId ? { ...m, status: 'planned' as const, deducted: undefined, logIds: undefined, shortNote: undefined } : m))
  const ids = new Set(meal.logIds ?? [])
  const usage = data.usage.filter((u) => !ids.has(u.id))
  return syncShopping({ ...data, inventory, usage, plans: data.plans.map((p) => (p.id === planId ? { ...plan, meals, status: 'active' } : p)) })
}

export function skipMeal(data: AppData, planId: string, mealId: string, skip: boolean): AppData {
  return syncShopping({
    ...data,
    plans: data.plans.map((p) => (p.id !== planId ? p : { ...p, meals: p.meals.map((m) => (m.id === mealId && m.status !== 'done' ? { ...m, status: skip ? 'skipped' as const : 'planned' as const } : m)) })),
  })
}

export function cancelPlan(data: AppData, planId: string): AppData {
  // 이미 완료한 끼니의 차감은 실제로 먹은 것이므로 유지, 예정 끼니는 재고에 손대지 않음
  return syncShopping({ ...data, plans: data.plans.map((p) => (p.id === planId ? { ...p, status: 'cancelled' as const } : p)) })
}

export function deletePlan(data: AppData, planId: string): AppData {
  return syncShopping({ ...data, plans: data.plans.filter((p) => p.id !== planId) })
}

/** 진행 중인 모든 계획의 부족 재료를 장보기 목록에 반영 */
export function syncShopping(data: AppData): AppData {
  let shopping = data.shopping
  const activeKeys = new Set<string>()
  for (const plan of data.plans) {
    const key = `plan:${plan.id}`
    if (plan.status !== 'active') { shopping = setContributions(shopping, key, plan.title, []); continue }
    activeKeys.add(key)
    const s = summarizePlan(data, plan)
    shopping = setContributions(shopping, key, plan.title, [
      ...s.shortages.map((x) => ({ catalogId: x.catalogId, name: x.name, need: x.short, unit: x.unit, total: (() => { const it = s.items.find((i) => i.catalogId === x.catalogId); return it ? Math.min(it.planned, it.have + x.short) : undefined })() })),
      ...s.missingSeasonings.map((x) => ({ catalogId: x.catalogId, name: x.name, need: 1, unit: '병' })),
    ])
  }
  // 삭제된 계획의 흔적 정리
  const planIds = new Set(data.plans.map((p) => `plan:${p.id}`))
  for (const it of shopping) for (const k of Object.keys(it.contributions)) if (k.startsWith('plan:') && !planIds.has(k)) shopping = setContributions(shopping, k, '', [])
  return { ...data, shopping }
}

// ───────────── 장보기 · 구매 ─────────────

/** 레시피 하나의 부족 재료를 장보기에 담기 */
export function addRecipeShortages(data: AppData, ev: Evaluation): AppData {
  return {
    ...data,
    shopping: setContributions(data.shopping, `recipe:${ev.recipe.id}`, ev.recipe.name, [
      ...ev.missing.map((m) => ({ catalogId: m.catalogId, name: m.name, need: m.short, unit: m.unit, total: m.need })),
      ...ev.missingSeasonings.map((m) => ({ catalogId: m.id, name: m.name, need: 1, unit: '병' })),
    ]),
  }
}

export interface PurchaseEntry {
  shoppingId: string
  packs: number
  expiresAt: string | null
  storage: InventoryItem['storage']
  price: number | null // 실제 결제 금액(입력 시)
}

/** 구매 완료 → 냉장고 등록 + 구매 기록 + 장보기·장바구니에서 제거 */
export function completePurchase(data: AppData, entries: PurchaseEntry[]): { data: AppData; added: number; merged: number } {
  let inventory = data.inventory
  let settings = data.settings
  const purchases: Purchase[] = []
  let added = 0
  let merged = 0
  const done = new Set<string>()
  for (const e of entries) {
    const it = data.shopping.find((s) => s.id === e.shoppingId)
    if (!it) continue
    done.add(it.id)
    const c = it.catalogId ? CATALOG_MAP[it.catalogId] : null
    const estimate = estUnitPrice(it.catalogId)
    purchases.push({
      id: uid('b'), date: today(), name: it.name, catalogId: it.catalogId, qty: purchasedBase({ ...it, packs: e.packs }), unit: it.unit,
      price: e.price != null ? e.price : estimate != null ? estimate * e.packs : null,
      priceType: e.price != null ? 'actual' : 'estimate', source: 'shopping',
    })
    if (c?.kind === 'seasoning') {
      if (!settings.seasonings.includes(c.id)) settings = { ...settings, seasonings: [...settings.seasonings, c.id] }
      added++
      continue
    }
    const r = addToInventory(inventory, {
      name: it.name, catalogId: it.catalogId, qty: purchasedBase({ ...it, packs: e.packs }), unit: it.unit, category: it.category,
      storage: e.storage, purchasedAt: today(), expiresAt: e.expiresAt, image: null, memo: '', source: 'shopping',
    })
    inventory = r.inventory
    if (r.merged) merged++
    else added++
  }
  const next: AppData = {
    ...data, inventory, settings,
    purchases: [...purchases, ...data.purchases].slice(0, 1000),
    shopping: data.shopping.filter((s) => !done.has(s.id)),
    cart: data.cart.filter((c) => !c.shoppingId || !done.has(c.shoppingId)),
  }
  return { data: syncShopping(next), added, merged }
}

// ───────────── 인식 결과 등록 ─────────────

export interface RecognizedEntry {
  name: string
  qty: number
  unit: string
  storage: InventoryItem['storage']
  expiresAt: string | null
  price?: number | null
  category?: InventoryItem['category'] | null
  qtySource?: InventoryItem['qtySource']
  aiNote?: string
}

export function registerRecognized(
  data: AppData, entries: RecognizedEntry[], source: 'photo' | 'receipt' | 'manual',
  receipt?: { store: string; total: number | null; mode: 'ai' | 'test' | 'manual'; date?: string },
): { data: AppData; added: number; merged: number } {
  let inventory = data.inventory
  let added = 0
  let merged = 0
  const receiptId = receipt ? uid('r') : undefined
  const purchases: Purchase[] = []
  for (const e of entries) {
    const cid = resolveCatalog(e.name)
    const c = cid ? CATALOG_MAP[cid] : null
    if (c?.kind === 'seasoning') {
      // 양념은 보유 양념 목록에 추가
      continue
    }
    const r = addToInventory(inventory, {
      name: e.name, catalogId: cid, qty: e.qty, unit: e.unit, category: c?.category ?? e.category ?? 'etc', storage: e.storage,
      purchasedAt: source === 'receipt' ? receipt?.date ?? today() : null, expiresAt: e.expiresAt, image: null, memo: '', source,
      qtySource: e.qtySource ?? 'user', aiNote: e.aiNote || undefined,
    })
    inventory = r.inventory
    if (r.merged) merged++
    else added++
    if (receipt) {
      purchases.push({ id: uid('b'), date: receipt.date ?? today(), name: e.name, catalogId: cid, qty: e.qty, unit: e.unit, price: e.price ?? null, priceType: receipt.mode === 'test' ? 'estimate' : 'actual', source: 'receipt', receiptId })
    }
  }
  const seasoningIds = entries.map((e) => resolveCatalog(e.name)).filter((id): id is string => !!id && CATALOG_MAP[id]?.kind === 'seasoning')
  const settings = { ...data.settings, seasonings: Array.from(new Set([...data.settings.seasonings, ...seasoningIds])) }
  return {
    data: syncShopping({
      ...data, inventory, settings,
      purchases: [...purchases, ...data.purchases].slice(0, 1000),
      receipts: receipt ? [{ id: receiptId!, date: receipt.date ?? today(), store: receipt.store, total: receipt.total, itemCount: entries.length, mode: receipt.mode }, ...data.receipts] : data.receipts,
    }),
    added: added + seasoningIds.length, merged,
  }
}

// ───────────── 기타 ─────────────

export function addHistory(data: AppData, recipe: Recipe, context: HistoryEntry['context']): AppData {
  const h: HistoryEntry = { id: uid('h'), date: new Date().toISOString(), recipeId: recipe.id, name: recipe.name, emoji: recipe.emoji, context }
  const recent = data.history.filter((x) => !(x.recipeId === recipe.id && x.context === context && Date.now() - new Date(x.date).getTime() < 3600_000))
  return { ...data, history: [h, ...recent].slice(0, 100) }
}

export function rateRecipe(data: AppData, recipe: Recipe, stars: number, comment: string): AppData {
  const others = data.ratings.filter((r) => r.recipeId !== recipe.id)
  return { ...data, ratings: [{ recipeId: recipe.id, name: recipe.name, stars, comment, date: today() }, ...others] }
}

export function toggleFavorite(data: AppData, recipeId: string): AppData {
  return { ...data, favorites: data.favorites.includes(recipeId) ? data.favorites.filter((x) => x !== recipeId) : [recipeId, ...data.favorites] }
}

/** 체험용 예시 재료 (화면에 "예시"로 표시됨) */
export function sampleItems(): NewItem[] {
  const t = today()
  const mk = (name: string, qty: number, unit: string, days: number | null, storage: InventoryItem['storage'] = 'fridge'): NewItem => {
    const cid = resolveCatalog(name)
    return {
      name, catalogId: cid, qty, unit, category: cid ? CATALOG_MAP[cid].category : 'etc', storage,
      purchasedAt: addDays(t, -2), expiresAt: days == null ? null : addDays(t, days), image: null, memo: '체험용 예시 재료', source: 'sample',
    }
  }
  return [
    mk('두부', 1, '모', 1), mk('계란', 6, '개', 12), mk('대파', 1, '대', 3), mk('양파', 2, '개', 20, 'room'),
    mk('김치', 400, 'g', 25), mk('밥', 2, '공기', 60, 'room'), mk('애호박', 1, '개', 2), mk('우유', 500, 'ml', 0),
    mk('돼지고기', 200, 'g', 2), mk('감자', 2, '개', 14, 'room'), mk('참치캔', 2, '캔', 300, 'room'), mk('양배추', 300, 'g', 6),
  ]
}

export function addSamples(data: AppData): AppData {
  let inv = data.inventory
  for (const s of sampleItems()) inv = addToInventory(inv, s).inventory
  return { ...data, inventory: inv }
}

export function removeSamples(data: AppData): AppData {
  return { ...data, inventory: data.inventory.filter((x) => x.source !== 'sample') }
}

/** 표시용: 기준 단위 수량을 재고 단위로 */
export function displayIn(catalogId: string | null, base: number, unit: string): number {
  return fromBase(catalogId, base, unit) ?? base
}
