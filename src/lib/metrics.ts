import { CATALOG_MAP } from './catalog'
import { expiryInfo } from './expiry'
import { isLowStock, itemCatalogId } from './inventory'
import type { AppData } from './types'
import { addDays, diffDays, fmtDate, today, weekStart } from './util'
import { toBase, fmtQty } from './units'
import { itemNeed } from './shopping'

export interface Notice {
  id: string
  level: 'danger' | 'warn' | 'info'
  title: string
  body: string
  to: string
}

export function notifications(data: AppData): Notice[] {
  const out: Notice[] = []
  const t = today()
  for (const it of data.inventory) {
    const e = expiryInfo(it.expiresAt, t)
    if (it.spoiled) { out.push({ id: `sp-${it.id}`, level: 'danger', title: `${it.name} 상태 이상 표시됨`, body: '추천에서 제외했어요. 확인 후 버리기를 눌러 정리하세요.', to: '/app/fridge' }); continue }
    if (e.level === 'expired') out.push({ id: `ex-${it.id}`, level: 'danger', title: `${it.name} 기한 경과`, body: `${e.label}. 섭취하지 말고 상태를 확인한 뒤 정리하세요.`, to: '/app/fridge' })
    else if (e.level === 'today' || e.level === 'soon') out.push({ id: `so-${it.id}`, level: 'warn', title: `${it.name} ${e.label}`, body: '이 재료를 쓰는 메뉴를 먼저 추천해 드려요.', to: '/app/recommend' })
    if (isLowStock(it) && e.level !== 'expired') out.push({ id: `lo-${it.id}`, level: 'info', title: `${it.name} 재고 부족`, body: `${fmtQty(it.qty, it.unit)} 남았어요.`, to: '/app/shopping' })
  }
  for (const p of data.plans) {
    if (p.status !== 'active') continue
    for (const m of p.meals) {
      if (m.date !== t || m.status !== 'planned' || !m.recipeId) continue
      out.push({ id: `pl-${m.id}`, level: 'info', title: `오늘 ${m.slot}: ${m.name}`, body: m.uses.filter((u) => !u.optional).map((u) => `${u.name} ${fmtQty(u.amount, u.unit)}`).join(', ') + ' 사용 예정', to: `/app/plan?id=${p.id}` })
    }
  }
  const need = data.shopping.filter((s) => !s.checked).length
  if (need) out.push({ id: 'shop', level: 'info', title: `장보기 필요 ${need}개`, body: data.shopping.slice(0, 3).map((s) => s.name).join(', ') + (need > 3 ? ' 외' : ''), to: '/app/shopping' })
  const order = { danger: 0, warn: 1, info: 2 }
  return out.sort((a, b) => order[a.level] - order[b.level])
}

export interface WeekSpend { spent: number; hasEstimate: boolean; budget: number; remain: number; todaySpent: number }

export function weekSpend(data: AppData): WeekSpend {
  const ws = weekStart(today())
  const we = addDays(ws, 6)
  let spent = 0
  let todaySpent = 0
  let hasEstimate = false
  for (const p of data.purchases) {
    if (p.date < ws || p.date > we || p.price == null) continue
    spent += p.price
    if (p.date === today()) todaySpent += p.price
    if (p.priceType === 'estimate') hasEstimate = true
  }
  return { spent, hasEstimate, budget: data.settings.weeklyBudget, remain: data.settings.weeklyBudget - spent, todaySpent }
}

export interface UsageStats { usedCount: number; discardCount: number; rate: number | null; rescued: number; rescuedValue: number }

/** 최근 30일 활용 지표 (추정) */
export function usageStats(data: AppData): UsageStats {
  const from = addDays(today(), -30)
  let usedCount = 0, discardCount = 0, rescued = 0, rescuedValue = 0
  for (const u of data.usage) {
    if (u.date < from) continue
    if (u.kind === 'discard') { discardCount++; continue }
    usedCount++
    if (u.urgent) {
      rescued++
      const cid = u.catalogId ?? null
      const c = cid ? CATALOG_MAP[cid] : null
      const b = cid ? toBase(cid, u.qty, u.unit) : null
      if (c && b != null) rescuedValue += (b / c.pack.size) * c.pack.price
    }
  }
  const total = usedCount + discardCount
  return { usedCount, discardCount, rate: total ? usedCount / total : null, rescued, rescuedValue }
}

export function fridgeStats(data: AppData) {
  const t = today()
  let urgent = 0, expired = 0
  const byStorage = { fridge: 0, freezer: 0, room: 0 }
  for (const it of data.inventory) {
    const e = expiryInfo(it.expiresAt, t)
    if (e.level === 'expired') expired++
    else if (e.level === 'today' || e.level === 'soon') urgent++
    byStorage[it.storage]++
  }
  return { count: data.inventory.length, urgent, expired, byStorage }
}

/** 오늘 계획된 소진 예정 재료 */
export function todayConsumption(data: AppData) {
  const t = today()
  const agg: Record<string, { name: string; amount: number; unit: string }> = {}
  for (const p of data.plans) {
    if (p.status !== 'active') continue
    for (const m of p.meals) {
      if (m.date !== t || m.status !== 'planned') continue
      for (const u of m.uses) {
        const k = u.catalogId ?? u.name
        agg[k] = { name: u.name, unit: u.unit, amount: (agg[k]?.amount ?? 0) + u.amount }
      }
    }
  }
  return Object.values(agg)
}

/** 이번 주 계획 끼니 */
export function weekMeals(data: AppData) {
  const t = today()
  const end = addDays(t, 6)
  return data.plans.filter((p) => p.status === 'active').flatMap((p) => p.meals.filter((m) => m.date >= t && m.date <= end).map((m) => ({ ...m, planId: p.id, planTitle: p.title })))
    .sort((a, b) => (a.date === b.date ? ['아침', '점심', '저녁'].indexOf(a.slot) - ['아침', '점심', '저녁'].indexOf(b.slot) : a.date < b.date ? -1 : 1))
}

export function purchaseStats(data: AppData) {
  const byName: Record<string, { name: string; count: number; total: number; priced: number; last: string }> = {}
  for (const p of data.purchases) {
    const k = p.catalogId ?? p.name
    const e = (byName[k] ??= { name: p.name, count: 0, total: 0, priced: 0, last: p.date })
    e.count++
    if (p.price != null && p.priceType === 'actual') { e.total += p.price; e.priced++ }
    if (p.date > e.last) e.last = p.date
  }
  return Object.values(byName).sort((a, b) => b.count - a.count)
}

export function shoppingNeedLabel(it: { catalogId: string | null; unit: string; manualQty?: number; contributions: Record<string, { need: number }> }) {
  if (!it.catalogId) return `${it.manualQty ?? 1}${it.unit}`
  const need = itemNeed(it as never)
  return need > 0 ? fmtQty(need, it.unit) : ''
}

export function itemDaysLeft(expiresAt: string | null) {
  return expiresAt ? diffDays(today(), expiresAt) : null
}

export { fmtDate, itemCatalogId }
