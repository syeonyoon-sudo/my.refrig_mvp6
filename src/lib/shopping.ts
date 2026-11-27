import { CATALOG_MAP } from './catalog'
import { packCost } from './engine'
import { totalHave } from './inventory'
import { norm, resolveCatalog } from './match'
import type { AppData, Category, Mall, ShoppingItem } from './types'
import { EPS, round, uid } from './util'

export interface NeedInput {
  catalogId: string | null
  name: string
  need: number
  unit: string
  category?: Category
  total?: number // 계획 전체 필요량 (표시용)
}

export function itemNeed(it: ShoppingItem): number {
  return Object.values(it.contributions).reduce((s, c) => s + c.need, 0)
}

/** 필요량 → 포장 개수 */
export function defaultPacks(it: Pick<ShoppingItem, 'catalogId' | 'manualQty'>, need: number): number {
  if (!it.catalogId) return Math.max(1, Math.ceil(it.manualQty ?? 1))
  const c = CATALOG_MAP[it.catalogId]
  if (c.kind === 'seasoning') return 1
  return packCost(it.catalogId, need).packs || 1
}

/**
 * 출처(key)별 필요량을 장보기 목록에 반영.
 * 같은 재료는 한 줄로 합치고, 같은 출처를 다시 반영하면 이전 값을 덮어써서 중복 구매를 막습니다.
 */
export function setContributions(list: ShoppingItem[], key: string, label: string, needs: NeedInput[]): ShoppingItem[] {
  // 이미 "샀어요" 체크한 항목은 그대로 두어(구매 대기) 같은 재료가 두 줄로 생기지 않게 함
  const frozen = new Set(list.filter((it) => it.checked && it.contributions[key]).map((it) => it.catalogId ?? norm(it.name)))
  let next = list.map((it) => {
    if (it.checked || !it.contributions[key]) return it
    const contributions = { ...it.contributions }
    delete contributions[key]
    return { ...it, contributions }
  })
  for (const n of needs) {
    if (n.need <= EPS) continue
    const cid = n.catalogId ?? resolveCatalog(n.name)
    if (frozen.has(cid ?? norm(n.name))) continue
    const idx = next.findIndex((it) => !it.checked && (cid ? it.catalogId === cid : norm(it.name) === norm(n.name)))
    if (idx >= 0) {
      const it = next[idx]
      next[idx] = { ...it, contributions: { ...it.contributions, [key]: { label, need: n.need, total: n.total } } }
    } else {
      const c = cid ? CATALOG_MAP[cid] : null
      next.push({
        id: uid('s'), name: c?.name ?? n.name, catalogId: cid, category: c?.category ?? n.category ?? 'etc',
        unit: c?.unit ?? n.unit, contributions: { [key]: { label, need: n.need, total: n.total } }, packs: 1, checked: false, addedAt: new Date().toISOString(),
      })
    }
  }
  // 출처가 모두 사라진 자동 항목은 제거, 나머지는 포장 개수 재계산
  next = next.filter((it) => it.checked || Object.keys(it.contributions).length > 0 || it.manualQty != null)
  return next.map((it) => (it.packsEdited ? it : { ...it, packs: defaultPacks(it, itemNeed(it)) }))
}

export function addManual(list: ShoppingItem[], name: string, qty: number, unit: string): ShoppingItem[] {
  const cid = resolveCatalog(name)
  const c = cid ? CATALOG_MAP[cid] : null
  const existing = list.find((it) => !it.checked && (cid ? it.catalogId === cid : norm(it.name) === norm(name)))
  if (existing && c) {
    // 카탈로그 재료는 기준 단위로 합산
    return setContributions(list, `manual:${existing.id}`, '직접 추가', [{ catalogId: cid, name, need: (existing.contributions[`manual:${existing.id}`]?.need ?? 0) + qty, unit }])
  }
  if (c) {
    const tmp: ShoppingItem = { id: uid('s'), name: c.name, catalogId: cid, category: c.category, unit: c.unit, contributions: {}, packs: 1, checked: false, addedAt: new Date().toISOString() }
    tmp.contributions[`manual:${tmp.id}`] = { label: '직접 추가', need: qty }
    tmp.packs = defaultPacks(tmp, qty)
    return [...list, tmp]
  }
  return [...list, { id: uid('s'), name, catalogId: null, category: 'etc', unit, contributions: {}, manualQty: qty, packs: Math.max(1, Math.ceil(qty)), checked: false, addedAt: new Date().toISOString() }]
}

export function packLabel(it: Pick<ShoppingItem, 'catalogId' | 'unit' | 'manualQty'>): string {
  if (!it.catalogId) return it.unit
  return CATALOG_MAP[it.catalogId].pack.label
}

/** 테스트용 예상 단가 (카탈로그에 없는 재료는 null = 가격 모름) */
export function estUnitPrice(catalogId: string | null): number | null {
  return catalogId ? CATALOG_MAP[catalogId]?.pack.price ?? null : null
}

/** 구매 시 냉장고에 들어갈 수량(기준 단위) */
export function purchasedBase(it: Pick<ShoppingItem, 'catalogId' | 'packs' | 'manualQty'>): number {
  if (!it.catalogId) return it.manualQty ?? it.packs
  return it.packs * CATALOG_MAP[it.catalogId].pack.size
}

/** 이미 충분히 보유 중인지 (중복 구매 경고) */
export function alreadyHave(data: AppData, it: ShoppingItem): number {
  if (!it.catalogId) return 0
  return round(totalHave(data.inventory, it.catalogId), 3)
}

export const MALLS: { id: Mall; name: string; color: string; url: (q: string) => string }[] = [
  { id: 'coupang', name: '쿠팡', color: '#E3483B', url: (q) => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}` },
  { id: 'kurly', name: '컬리', color: '#5F0080', url: (q) => `https://www.kurly.com/search?sword=${encodeURIComponent(q)}` },
  { id: 'emart', name: '이마트몰', color: '#D4A800', url: (q) => `https://emart.ssg.com/search.ssg?query=${encodeURIComponent(q)}` },
  { id: 'naver', name: '네이버쇼핑', color: '#03A94D', url: (q) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}` },
]
export const MALL_MAP = Object.fromEntries(MALLS.map((m) => [m.id, m])) as Record<Mall, (typeof MALLS)[number]>

/** 검색어: 상품명 + 포장 크기 (예: "두부 1모") — 상세 페이지 링크는 만들지 않음 */
export function searchQuery(name: string, catalogId: string | null): string {
  if (!catalogId) return name
  const c = CATALOG_MAP[catalogId]
  return c.kind === 'seasoning' ? c.name : `${c.name}`
}
