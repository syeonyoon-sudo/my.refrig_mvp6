import { CATALOG_MAP } from './catalog'
import { expiryInfo, isUsable } from './expiry'
import { norm, resolveCatalog } from './match'
import type { Deduction, InventoryItem } from './types'
import { EPS, round, today, uid } from './util'
import { fromBase, toBase } from './units'

// ───────────────── 계산용 재고 풀 (추천·계획 시뮬레이션) ─────────────────

export interface Lot {
  invId: string
  name: string
  base: number // 남은 수량(기준 단위)
  expiresAt: string | null
}
export type Pool = Record<string, Lot[]>

export function itemCatalogId(item: Pick<InventoryItem, 'catalogId' | 'name'>): string | null {
  return item.catalogId ?? resolveCatalog(item.name)
}

function sortLots(lots: Lot[]) {
  lots.sort((a, b) => {
    if (a.expiresAt === b.expiresAt) return 0
    if (!a.expiresAt) return 1
    if (!b.expiresAt) return -1
    return a.expiresAt < b.expiresAt ? -1 : 1
  })
}

/** 기준일(ref)에 사용할 수 있는 재고만 모아 재료별로 정리 */
export function buildPool(inventory: InventoryItem[], ref = today()): Pool {
  const pool: Pool = {}
  for (const it of inventory) {
    if (!isUsable(it, ref)) continue
    const cid = itemCatalogId(it)
    if (!cid) continue
    const base = toBase(cid, it.qty, it.unit)
    if (base == null || base <= EPS) continue
    ;(pool[cid] ??= []).push({ invId: it.id, name: it.name, base, expiresAt: it.expiresAt })
  }
  Object.values(pool).forEach(sortLots)
  return pool
}

export function clonePool(p: Pool): Pool {
  const out: Pool = {}
  for (const k of Object.keys(p)) out[k] = p[k].map((l) => ({ ...l }))
  return out
}

/** 기준일에 기한이 지난 묶음 제거 */
export function expirePool(p: Pool, ref: string) {
  for (const k of Object.keys(p)) {
    p[k] = p[k].filter((l) => !l.expiresAt || l.expiresAt >= ref)
    if (!p[k].length) delete p[k]
  }
}

export function poolHave(p: Pool, id: string): number {
  return (p[id] ?? []).reduce((s, l) => s + l.base, 0)
}

/** 가장 기한이 가까운 묶음부터 차감. 실제로 가져간 양과 사용된 묶음 정보를 돌려줌 */
export function takeFromPool(p: Pool, id: string, amount: number): { taken: number; minDays: string | null } {
  let left = amount
  let taken = 0
  let firstExp: string | null = null
  for (const lot of p[id] ?? []) {
    if (left <= EPS) break
    if (lot.base <= EPS) continue
    const t = Math.min(lot.base, left)
    if (firstExp == null && lot.expiresAt) firstExp = lot.expiresAt
    lot.base -= t
    left -= t
    taken += t
  }
  if (p[id]) {
    p[id] = p[id].filter((l) => l.base > EPS)
    if (!p[id].length) delete p[id]
  }
  return { taken, minDays: firstExp }
}

/** 해당 재료 중 가장 빠른 기한 */
export function earliestExpiry(p: Pool, id: string): string | null {
  const l = (p[id] ?? []).find((x) => x.expiresAt)
  return l?.expiresAt ?? null
}

// ───────────────── 실제 재고 변경 ─────────────────

export interface ConsumeResult {
  inventory: InventoryItem[]
  deductions: Deduction[]
  taken: number
  short: number
  urgent: boolean
}

/** 실제 재고에서 재료를 기준 단위만큼 차감 (기한 임박 묶음부터) */
export function consumeInventory(inventory: InventoryItem[], catalogId: string, amountBase: number, ref = today()): ConsumeResult {
  const candidates = inventory
    .filter((it) => isUsable(it, ref) && itemCatalogId(it) === catalogId && toBase(catalogId, it.qty, it.unit) != null)
    .sort((a, b) => {
      if (a.expiresAt === b.expiresAt) return 0
      if (!a.expiresAt) return 1
      if (!b.expiresAt) return -1
      return a.expiresAt < b.expiresAt ? -1 : 1
    })
  let left = amountBase
  const deductions: Deduction[] = []
  let next = inventory.slice()
  let urgent = false
  for (const it of candidates) {
    if (left <= EPS) break
    const haveBase = toBase(catalogId, it.qty, it.unit)!
    const t = Math.min(haveBase, left)
    const qtyInItemUnit = fromBase(catalogId, t, it.unit) ?? 0
    const e = expiryInfo(it.expiresAt, ref)
    if (e.days != null && e.days <= 3) urgent = true
    const remain = round(it.qty - qtyInItemUnit, 4)
    if (remain <= 0.0001) {
      deductions.push({ inventoryId: it.id, name: it.name, qty: it.qty, unit: it.unit, snapshot: { ...it } })
      next = next.filter((x) => x.id !== it.id)
    } else {
      deductions.push({ inventoryId: it.id, name: it.name, qty: round(qtyInItemUnit, 4), unit: it.unit })
      next = next.map((x) => (x.id === it.id ? { ...x, qty: remain } : x))
    }
    left -= t
  }
  return { inventory: next, deductions, taken: amountBase - Math.max(0, left), short: Math.max(0, left), urgent }
}

/** 차감 되돌리기 */
export function restoreDeductions(inventory: InventoryItem[], deductions: Deduction[]): InventoryItem[] {
  let next = inventory.slice()
  for (const d of deductions) {
    const idx = next.findIndex((x) => x.id === d.inventoryId)
    if (idx >= 0) {
      next[idx] = { ...next[idx], qty: round(next[idx].qty + d.qty, 4) }
    } else if (d.snapshot) {
      next.push({ ...d.snapshot, qty: d.qty })
    }
  }
  return next
}

export type NewItem = Omit<InventoryItem, 'id' | 'createdAt'>

/**
 * 재고 추가. 같은 재료·같은 유통기한·같은 보관 장소의 재고가 있으면 수량을 합산하고,
 * 기한이 다르면 따로 보관해 기한 계산이 섞이지 않도록 합니다.
 */
export function addToInventory(inventory: InventoryItem[], incoming: NewItem): { inventory: InventoryItem[]; merged: InventoryItem | null; id: string } {
  const cid = incoming.catalogId ?? resolveCatalog(incoming.name)
  const target = findMergeTarget(inventory, { ...incoming, catalogId: cid })
  if (target) {
    let addQty: number | null = incoming.qty
    if (target.unit !== incoming.unit) {
      const b = toBase(cid, incoming.qty, incoming.unit)
      addQty = b == null ? null : fromBase(cid, b, target.unit)
    }
    if (addQty != null) {
      const merged: InventoryItem = {
        ...target,
        qty: round(target.qty + addQty, 4),
        initialQty: round((target.initialQty ?? target.qty) + addQty, 4),
        purchasedAt: incoming.purchasedAt ?? target.purchasedAt,
        image: target.image ?? incoming.image,
        memo: [target.memo, incoming.memo].filter(Boolean).join(' / '),
      }
      return { inventory: inventory.map((x) => (x.id === target.id ? merged : x)), merged: target, id: target.id }
    }
  }
  const item: InventoryItem = { ...incoming, initialQty: incoming.initialQty ?? incoming.qty, catalogId: cid, id: uid('i'), createdAt: new Date().toISOString() }
  return { inventory: [...inventory, item], merged: null, id: item.id }
}

export function findMergeTarget(inventory: InventoryItem[], incoming: Pick<InventoryItem, 'name' | 'catalogId' | 'expiresAt' | 'storage' | 'unit' | 'qty'>): InventoryItem | null {
  const cid = incoming.catalogId ?? resolveCatalog(incoming.name)
  return inventory.find((x) => {
    if (x.spoiled) return false
    const sameIng = cid ? itemCatalogId(x) === cid : norm(x.name) === norm(incoming.name)
    if (!sameIng) return false
    if ((x.expiresAt ?? null) !== (incoming.expiresAt ?? null)) return false
    if (x.storage !== incoming.storage) return false
    if (x.unit === incoming.unit) return true
    return cid != null && toBase(cid, 1, x.unit) != null && toBase(cid, 1, incoming.unit) != null
  }) ?? null
}

/** 재고 부족 기준 */
export function isLowStock(item: InventoryItem): boolean {
  const cid = itemCatalogId(item)
  const c = cid ? CATALOG_MAP[cid] : null
  if (!c?.low) return false
  const b = toBase(cid, item.qty, item.unit)
  return b != null && b <= c.low + EPS
}

/** 같은 재료의 총 보유량(기준 단위) */
export function totalHave(inventory: InventoryItem[], catalogId: string, ref = today()): number {
  return inventory.reduce((s, it) => {
    if (!isUsable(it, ref) || itemCatalogId(it) !== catalogId) return s
    return s + (toBase(catalogId, it.qty, it.unit) ?? 0)
  }, 0)
}
