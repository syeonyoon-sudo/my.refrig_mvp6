import { CATALOG_MAP } from './catalog'
import { evaluateRecipe, makeCtx, packCost, type Evaluation } from './engine'
import { buildPool, clonePool, expirePool, poolHave, takeFromPool, totalHave, type Pool } from './inventory'
import { RECIPES, RECIPE_MAP } from './recipes'
import type { AppData, Plan, PlanMeal, Recipe, Slot, UseLine } from './types'
import { addDays, diffDays, EPS, round, today, uid } from './util'

export const SLOT_ORDER: Slot[] = ['아침', '점심', '저녁']

export interface PlanInput {
  kind: Plan['kind']
  title?: string
  startDate: string
  days: number
  slots: Slot[]
  mode: Plan['mode']
  budget?: number
}

function sortMeals(meals: PlanMeal[]) {
  return meals.slice().sort((a, b) => (a.date === b.date ? SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) : a.date < b.date ? -1 : 1))
}

function modeOpts(mode: Plan['mode'], maxPurchase: number) {
  if (mode === 'noPurchase') return { allowPurchase: false, maxPurchase: 0 }
  if (mode === 'minPurchase') return { allowPurchase: true, maxPurchase: 1 }
  return { allowPurchase: true, maxPurchase: Math.max(2, maxPurchase) }
}

/** 평가 결과 → 계획에 저장할 사용량 */
export function usesFromEval(ev: Evaluation): UseLine[] {
  return ev.lines
    .filter((l) => (l.optional ? l.use > EPS : true))
    .map((l) => ({ catalogId: l.catalogId, name: l.name, amount: round(l.optional ? l.use : l.need, 4), unit: l.unit, optional: l.optional }))
}

function mealFromEval(ev: Evaluation, date: string, slot: Slot, estCost: number): PlanMeal {
  return {
    id: uid('m'), date, slot, recipeId: ev.recipe.id, name: ev.recipe.name, emoji: ev.recipe.emoji,
    uses: usesFromEval(ev),
    seasonings: ev.seasonings.filter((x) => !x.optional).map((x) => x.item.id),
    status: 'planned', estCost,
  }
}

/**
 * 다회차 식단 계획 생성
 * - 날짜·끼니 순서대로 진행하며, 그 시점 기준 남은 재고(시뮬레이션)로 메뉴를 고릅니다.
 * - 재료를 사야 하는 경우 "포장 단위"로 산 것으로 보고 남은 양은 다음 끼니에서 이어 씁니다.
 * - 기한이 지난 재료는 그 날짜부터 계산에서 빠집니다.
 */
export function makePlan(data: AppData, input: PlanInput): Plan {
  const ctx = makeCtx(data, input.startDate)
  const pool: Pool = buildPool(data.inventory, input.startDate)
  const startTotals: Record<string, number> = {}
  for (const k of Object.keys(pool)) startTotals[k] = poolHave(pool, k)
  const opts = modeOpts(input.mode, data.settings.maxPurchase)
  const meals: PlanMeal[] = []
  let spent = 0
  const slots = SLOT_ORDER.filter((s) => input.slots.includes(s))

  for (let d = 0; d < input.days; d++) {
    const date = addDays(input.startDate, d)
    expirePool(pool, date)
    ctx.ref = date
    for (const slot of slots) {
      const evals: { ev: Evaluation; score: number; cost: number }[] = []
      for (const r of RECIPES) {
        const ev = evaluateRecipe(r, pool, ctx, opts)
        if (!ev.ok) continue
        let score = ev.score
        const recent = meals.slice(-3).filter((m) => m.recipeId === r.id).length
        const total = meals.filter((m) => m.recipeId === r.id).length
        score -= recent * 8 + total * 4
        if (meals.some((m) => m.date === date && m.recipeId === r.id)) score -= 10
        if (slot === '아침') score += r.time <= 15 ? 1.5 : r.time > 20 ? -2 : 0
        if (input.kind === 'empty') {
          let share = 0
          for (const l of ev.lines) if (l.use > EPS && startTotals[l.catalogId]) share += l.use / startTotals[l.catalogId]
          score += 4 * share + ev.lines.filter((l) => l.use > EPS).length * 0.8 - ev.purchaseCount * 3
        }
        const cost = ev.purchaseCost
        if (input.kind === 'budget' && input.budget != null) {
          if (spent + cost > input.budget + EPS) continue
          score -= cost / 1500
        }
        evals.push({ ev, score, cost })
      }
      evals.sort((a, b) => b.score - a.score)
      const best = evals[0]
      if (!best) {
        meals.push({
          id: uid('m'), date, slot, recipeId: null, name: '추천 가능한 메뉴 없음', emoji: '🫥', uses: [], seasonings: [],
          status: 'planned', estCost: 0,
          note: input.mode === 'noPurchase' ? '남은 재료로 만들 수 있는 메뉴가 없어요. 추가 구매를 허용하거나 끼니를 줄여 보세요.' : '조건에 맞는 메뉴가 없어요.',
        })
        continue
      }
      // 구매 반영: 부족한 재료를 포장 단위로 사서 풀에 추가
      let cost = 0
      for (const m of best.ev.missing) {
        const { packs, cost: c } = packCost(m.catalogId, m.short)
        cost += c
        const cat = CATALOG_MAP[m.catalogId]
        const shelf = cat.shelf?.[cat.storage] ?? 7
        ;(pool[m.catalogId] ??= []).push({ invId: `virtual-${uid()}`, name: cat.name, base: packs * cat.pack.size, expiresAt: addDays(date, shelf) })
      }
      for (const s of best.ev.missingSeasonings) { cost += s.pack.price; ctx.ownedSeasonings.add(s.id) }
      spent += cost
      const meal = mealFromEval(best.ev, date, slot, cost)
      for (const u of meal.uses) if (u.catalogId) takeFromPool(pool, u.catalogId, u.amount)
      meals.push(meal)
    }
  }

  const titles = { plan: `${input.days}일 식단`, empty: input.days === 1 ? '오늘 냉장고 비우기' : `${input.days}일 냉장고 비우기`, budget: `${input.days}일 예산 식단` }
  return {
    id: uid('p'), kind: input.kind, title: input.title ?? titles[input.kind], createdAt: new Date().toISOString(),
    startDate: input.startDate, days: input.days, slots, mode: input.mode, budget: input.budget, meals, status: 'active',
  }
}

// ───────────────── 계획 검증 · 요약 ─────────────────

export interface ItemSummary {
  catalogId: string
  name: string
  emoji: string
  unit: string
  have: number // 현재 보유
  planned: number // 계획상 사용량
  short: number // 부족(사야 할 양)
  remain: number // 계획 후 남는 양
}

export interface PlanSummary {
  items: ItemSummary[]
  shortages: { catalogId: string; name: string; unit: string; short: number; packs: number; cost: number }[]
  missingSeasonings: { catalogId: string; name: string; cost: number }[]
  mealShort: Record<string, string[]> // 끼니별 부족 재료
  leftovers: { name: string; emoji: string; qty: number; unit: string; expiresAt: string | null; expiresInPlan: boolean }[]
  shoppingCost: number
  plannedCost: number
  plannedMeals: number
  doneMeals: number
}

/**
 * 현재 실제 재고 기준으로 남은(예정) 끼니를 순서대로 다시 배정해
 * 같은 재료를 여러 끼니에 써도 부족하지 않은지 검증합니다.
 */
export function summarizePlan(data: AppData, plan: Plan): PlanSummary {
  const ref = today()
  const pool = buildPool(data.inventory, ref)
  const meals = sortMeals(plan.meals).filter((m) => m.status === 'planned')
  const plannedUse: Record<string, number> = {}
  const shortByItem: Record<string, number> = {}
  const mealShort: Record<string, string[]> = {}
  const ctx = makeCtx(data, ref)
  const missingSeason = new Set<string>()

  for (const m of meals) {
    const date = m.date < ref ? ref : m.date
    expirePool(pool, date)
    for (const u of m.uses) {
      if (!u.catalogId) continue
      plannedUse[u.catalogId] = (plannedUse[u.catalogId] ?? 0) + u.amount
      const { taken } = takeFromPool(pool, u.catalogId, u.amount)
      const short = u.amount - taken
      if (short > EPS && !u.optional) {
        shortByItem[u.catalogId] = (shortByItem[u.catalogId] ?? 0) + short
        ;(mealShort[m.id] ??= []).push(u.name)
      }
    }
    for (const s of m.seasonings) if (!ctx.ownedSeasonings.has(s)) missingSeason.add(s)
  }

  const ids = Array.from(new Set([...Object.keys(plannedUse)]))
  const items: ItemSummary[] = ids.map((id) => {
    const c = CATALOG_MAP[id]
    const have = totalHave(data.inventory, id, ref)
    const planned = plannedUse[id] ?? 0
    const short = shortByItem[id] ?? 0
    return { catalogId: id, name: c.name, emoji: c.emoji, unit: c.unit, have: round(have, 4), planned: round(planned, 4), short: round(short, 4), remain: round(Math.max(0, have - (planned - short)), 4) }
  }).sort((a, b) => b.planned - a.planned)

  const shortages = Object.entries(shortByItem).filter(([, v]) => v > EPS).map(([id, short]) => {
    const c = CATALOG_MAP[id]
    const pc = packCost(id, short)
    return { catalogId: id, name: c.name, unit: c.unit, short: round(short, 4), packs: pc.packs, cost: pc.cost }
  })
  const missingSeasonings = Array.from(missingSeason).map((id) => ({ catalogId: id, name: CATALOG_MAP[id].name, cost: CATALOG_MAP[id].pack.price }))

  // 계획 후 남는 재고 (계획 종료일 기준 기한이 지나는지 표시)
  const endDate = addDays(plan.startDate, plan.days - 1)
  const leftovers: PlanSummary['leftovers'] = []
  const remainPool = clonePool(pool)
  for (const [id, lots] of Object.entries(remainPool)) {
    const c = CATALOG_MAP[id]
    for (const l of lots) {
      if (l.base <= EPS) continue
      leftovers.push({ name: c.name, emoji: c.emoji, qty: round(l.base, 4), unit: c.unit, expiresAt: l.expiresAt, expiresInPlan: !!l.expiresAt && diffDays(l.expiresAt, endDate) > 0 })
    }
  }
  leftovers.sort((a, b) => Number(b.expiresInPlan) - Number(a.expiresInPlan))

  return {
    items, shortages, missingSeasonings, mealShort, leftovers,
    shoppingCost: shortages.reduce((s, x) => s + x.cost, 0) + missingSeasonings.reduce((s, x) => s + x.cost, 0),
    plannedCost: plan.meals.reduce((s, m) => s + (m.status !== 'skipped' ? m.estCost : 0), 0),
    plannedMeals: meals.length,
    doneMeals: plan.meals.filter((m) => m.status === 'done').length,
  }
}

/** 특정 끼니를 바꿀 때 후보: 그 끼니 이전 계획을 반영한 재고로 평가 */
export function swapCandidates(data: AppData, plan: Plan, mealId: string, limit = 8): Evaluation[] {
  const ref = today()
  const sorted = sortMeals(plan.meals)
  const target = sorted.find((m) => m.id === mealId)
  if (!target) return []
  const pool = buildPool(data.inventory, ref)
  for (const m of sorted) {
    if (m.id === mealId) break
    if (m.status !== 'planned') continue
    expirePool(pool, m.date < ref ? ref : m.date)
    for (const u of m.uses) if (u.catalogId) takeFromPool(pool, u.catalogId, u.amount)
  }
  expirePool(pool, target.date < ref ? ref : target.date)
  const ctx = makeCtx(data, target.date < ref ? ref : target.date)
  const opts = { ...modeOpts(plan.mode === 'noPurchase' ? 'minPurchase' : plan.mode, data.settings.maxPurchase), requireOwned: false }
  return RECIPES.filter((r) => r.id !== target.recipeId)
    .map((r) => evaluateRecipe(r, pool, ctx, opts))
    .filter((e) => e.ok)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function replaceMeal(plan: Plan, mealId: string, ev: Evaluation): Plan {
  return {
    ...plan,
    meals: plan.meals.map((m) => (m.id === mealId ? { ...mealFromEval(ev, m.date, m.slot, ev.purchaseCost), id: m.id } : m)),
  }
}

/** 레시피를 계획의 특정 날짜·끼니에 추가 */
export function addRecipeToPlan(plan: Plan, recipe: Recipe, ev: Evaluation, date: string, slot: Slot): Plan {
  const meal = mealFromEval({ ...ev, recipe }, date, slot, ev.purchaseCost)
  return { ...plan, meals: sortMeals([...plan.meals.filter((m) => !(m.date === date && m.slot === slot && m.recipeId == null)), meal]) }
}

export function sortedMeals(plan: Plan) { return sortMeals(plan.meals) }

export function recipeOfMeal(m: PlanMeal, data: AppData): Recipe | null {
  if (!m.recipeId) return null
  return RECIPE_MAP[m.recipeId] ?? data.aiRecipes.find((r) => r.id === m.recipeId) ?? null
}

/** 레시피 하나를 넣기 위한 빈 1일 식단 */
export function emptyPlan(date: string, slot: Slot): Plan {
  return { id: uid('p'), kind: 'plan', title: `${date.slice(5).replace('-', '/')} 식단`, createdAt: new Date().toISOString(), startDate: date, days: 1, slots: [slot], mode: 'allow', meals: [], status: 'active' }
}
