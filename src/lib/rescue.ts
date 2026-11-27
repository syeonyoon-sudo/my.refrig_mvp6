// 소비기한 임박 재료 소진 도우미
// - 임박 재료 목록 + 그 재료로 만들 수 있는 메뉴 수
// - 여러 임박 재료를 가장 적은 메뉴로 다 쓰는 순서 (소진 계획)
// - 부족한 재료를 냉장고에 있는 다른 재료로 대체할 수 있는지 (등록된 대체 규칙만 사용)
import { CATALOG_MAP, STORAGE_LABEL } from './catalog'
import { dishStyle, recommend, type Evaluation } from './engine'
import { expiryInfo } from './expiry'
import { itemCatalogId, totalHave } from './inventory'
import { substitutesFor } from './substitutes'
import type { AppData, InventoryItem } from './types'
import { EPS, today } from './util'

export interface UrgentEntry {
  key: string // catalog id 또는 이름
  catalogId: string | null
  name: string
  days: number // 0 = 오늘까지
  items: InventoryItem[]
  menuCount: number // 지금 조건으로 이 재료를 쓰는 메뉴 수
}

/** 기한이 3일 이내인 재료 (상한 것·기한 지난 것 제외), 같은 재료는 하나로 묶음 */
export function urgentEntries(data: AppData, okList?: Evaluation[]): UrgentEntry[] {
  const ref = today()
  const ok = okList ?? recommend(data, { limit: 999, diverse: false }).items
  const map = new Map<string, UrgentEntry>()
  for (const it of data.inventory) {
    if (it.spoiled || it.qty <= 0) continue
    const e = expiryInfo(it.expiresAt, ref)
    if (e.days == null || e.days < 0 || e.days > 3) continue
    const cid = itemCatalogId(it)
    const key = cid ?? it.name
    const cur = map.get(key)
    if (cur) { cur.items.push(it); cur.days = Math.min(cur.days, e.days); continue }
    map.set(key, { key, catalogId: cid, name: cid ? CATALOG_MAP[cid].name.replace(/\(.*\)/, '') : it.name, days: e.days, items: [it], menuCount: 0 })
  }
  for (const u of map.values()) {
    if (u.catalogId) u.menuCount = ok.filter((ev) => ev.lines.some((l) => l.catalogId === u.catalogId && l.use > EPS)).length
  }
  return [...map.values()].sort((a, b) => a.days - b.days || a.name.localeCompare(b.name, 'ko'))
}

export interface RescueStep { ev: Evaluation; covers: UrgentEntry[] }
export interface RescuePlan { steps: RescueStep[]; leftovers: { entry: UrgentEntry; tip: string }[]; urgent: UrgentEntry[] }

const weight = (d: number) => (d <= 0 ? 4 : d === 1 ? 3 : d === 2 ? 2.2 : 1.6)

/** 임박 재료를 최대 3끼 안에 다 쓰는 순서 (그리디: 가장 많은·가장 급한 재료를 쓰는 메뉴부터) */
export function rescuePlan(data: AppData): RescuePlan {
  const ok = recommend(data, { limit: 999, diverse: false }).items
  const urgent = urgentEntries(data, ok)
  const left = new Map(urgent.filter((u) => u.catalogId).map((u) => [u.catalogId!, u]))
  const steps: RescueStep[] = []
  while (left.size && steps.length < 3) {
    let best: RescueStep | null = null
    let bestVal = 0
    for (const ev of ok) {
      if (steps.some((s) => s.ev.recipe.id === ev.recipe.id)) continue
      const covers = ev.lines.filter((l) => l.use > EPS && left.has(l.catalogId)).map((l) => left.get(l.catalogId)!)
      if (!covers.length) continue
      const sameStyle = steps.some((s) => dishStyle(s.ev.recipe) === dishStyle(ev.recipe)) ? 0.5 : 0
      const val = covers.reduce((a, c) => a + weight(c.days), 0) * 10 + ev.score - ev.purchaseCount * 2 - sameStyle - (ev.recent ? 15 : 0)
      if (val > bestVal) { bestVal = val; best = { ev, covers } }
    }
    if (!best) break
    best.covers.forEach((c) => left.delete(c.catalogId!))
    steps.push(best)
  }
  const leftovers = urgent.filter((u) => !u.catalogId || left.has(u.catalogId)).map((u) => ({ entry: u, tip: keepTip(u) }))
  return { steps, leftovers, urgent }
}

/** 메뉴로 못 쓰는 임박 재료 보관 팁 */
function keepTip(u: UrgentEntry): string {
  const c = u.catalogId ? CATALOG_MAP[u.catalogId] : null
  if (!c) return '레시피 정보에 없는 재료예요. 상태를 확인하고 간단히 데치거나 볶아 반찬으로 드세요.'
  const fz = c.shelf?.freezer
  if (fz && u.items.some((i) => i.storage !== 'freezer')) return `오늘 못 쓰면 소분해서 ${STORAGE_LABEL.freezer} 보관하세요 (약 ${fz}일).`
  return '지금 조건에 맞는 메뉴가 없어요. 조리 시간·추가 구매 조건을 넓히거나 상태를 확인해 주세요.'
}

export interface SubHint { from: string; fromName: string; to: string; toName: string }

/** 부족한 재료 중 냉장고에 있는 재료로 바꿀 수 있는 것 (알레르기·싫어하는 재료 제외) */
export function ownedSubHints(ev: Evaluation, data: AppData): SubHint[] {
  const out: SubHint[] = []
  for (const m of ev.missing) {
    const opt = substitutesFor(m.catalogId, ev.recipe.id, data.settings)
      .find((o) => !o.blocked.length && !o.disliked && totalHave(data.inventory, o.to) > EPS && !ev.recipe.ingredients.some((i) => i.id === o.to))
    if (opt) out.push({ from: m.catalogId, fromName: m.name, to: opt.to, toName: opt.toName.replace(/\(.*\)/, '') })
  }
  return out
}

export function subLink(recipeId: string, hints: SubHint[]): string {
  const q = hints.map((h) => `sub=${encodeURIComponent(`${h.from}:${h.to}`)}`).join('&')
  return `/app/recipe/${recipeId}${q ? `?${q}` : ''}`
}
