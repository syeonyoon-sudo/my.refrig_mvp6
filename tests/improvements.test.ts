import { describe, expect, it } from 'vitest'
import { adjustQty, defaultData, updateItem, cookRecipe } from '../src/lib/actions'
import { diversify, dishStyle, recommend, evaluateNow, likedMatch } from '../src/lib/engine'
import { addToInventory } from '../src/lib/inventory'
import { parseQuickText, picksToItems, defaultPick, frequentIds } from '../src/lib/quickadd'
import { rescuePlan, urgentEntries, ownedSubHints } from '../src/lib/rescue'
import { RECIPE_MAP } from '../src/lib/recipes'
import { resolveCatalog } from '../src/lib/match'
import { usesFromEval } from '../src/lib/planner'
import type { AppData, InventoryItem } from '../src/lib/types'
import { addDays, today } from '../src/lib/util'

function item(name: string, qty: number, unit: string, days: number | null, extra: Partial<InventoryItem> = {}): Omit<InventoryItem, 'id' | 'createdAt'> {
  return { name, catalogId: resolveCatalog(name), qty, unit, category: 'etc', storage: 'fridge', purchasedAt: null, expiresAt: days == null ? null : addDays(today(), days), image: null, memo: '', source: 'manual', ...extra }
}
function withItems(...items: Omit<InventoryItem, 'id' | 'createdAt'>[]): AppData {
  const d = defaultData('테스트')
  let inv = d.inventory
  for (const i of items) inv = addToInventory(inv, i).inventory
  return { ...d, inventory: inv }
}
const FRIDGE = () => withItems(
  item('두부', 1, '모', 0), item('계란', 6, '개', 10), item('대파', 1, '대', 2), item('양파', 2, '개', 20),
  item('김치', 400, 'g', 25), item('밥', 3, '공기', 60), item('애호박', 1, '개', 1), item('돼지고기', 300, 'g', 2),
  item('감자', 2, '개', 14), item('참치캔', 2, '캔', 300), item('양배추', 300, 'g', 6),
)

describe('빠른 등록', () => {
  it('한 줄 입력을 재료별로 나누고 수량·단위를 읽음', () => {
    const r = parseQuickText('두부, 대파 2, 돼지고기 300g,  계란 10개')
    expect(r.map((x) => x.id)).toEqual(['tofu', 'green_onion', 'pork', 'egg'])
    expect(r[0].qty).toBeGreaterThan(0)
    expect(r[1]).toMatchObject({ qty: 2 })
    expect(r[2]).toMatchObject({ qty: 300, unit: 'g' })
    expect(r[3]).toMatchObject({ qty: 10, unit: '개' })
  })
  it('목록에 없는 재료도 이름 그대로 담음', () => {
    const r = parseQuickText('고수')
    expect(r[0]).toMatchObject({ id: null, name: '고수', qty: 1 })
  })
  it('추정 기한은 표시 플래그와 함께, "나중에"면 기한 없이', () => {
    const est = picksToItems([defaultPick('tofu')], true)[0]
    expect(est.expiresAt).not.toBeNull()
    expect(est.expiryEstimated).toBe(true)
    const later = picksToItems([defaultPick('tofu')], false)[0]
    expect(later.expiresAt).toBeNull()
    expect(later.expiryEstimated).toBeUndefined()
  })
  it('자주 쓰는 재료는 내 기록이 먼저', () => {
    const d = withItems(item('브로콜리', 1, '개', 5))
    expect(frequentIds(d)[0]).toBe('broccoli')
  })
})

describe('남은 양 표시 (initialQty)', () => {
  it('등록 시 처음 양 저장, 합치면 함께 늘고, 쓰면 그대로', () => {
    let d = withItems(item('계란', 6, '개', 10))
    expect(d.inventory[0].initialQty).toBe(6)
    d = { ...d, inventory: addToInventory(d.inventory, item('계란', 4, '개', 10)).inventory }
    expect(d.inventory[0]).toMatchObject({ qty: 10, initialQty: 10 })
    d = adjustQty(d, d.inventory[0].id, -3)
    expect(d.inventory[0]).toMatchObject({ qty: 7, initialQty: 10 })
  })
  it('직접 더 많이 고치면 처음 양도 올라감', () => {
    let d = withItems(item('계란', 6, '개', 10))
    d = updateItem(d, d.inventory[0].id, { qty: 12, unit: '개' })
    expect(d.inventory[0].initialQty).toBe(12)
  })
})

describe('추천 개인화·다양성', () => {
  it('3개 추천은 종류(밥·국·면·반찬)가 최대한 겹치지 않음', () => {
    const d = FRIDGE()
    const r = recommend(d, { limit: 3 })
    const styles = new Set(r.items.map((e) => dishStyle(e.recipe)))
    expect(r.items.length).toBe(3)
    expect(styles.size).toBeGreaterThanOrEqual(2)
  })
  it('추가 구매가 없는 메뉴가 먼저 보임', () => {
    const d = FRIDGE()
    const r = recommend(d, { limit: 4 })
    const counts = r.items.map((e) => e.purchaseCount)
    expect(counts).toEqual([...counts].sort((a, b) => a - b))
  })
  it('재료 지정(use)이면 그 재료를 실제로 쓰는 메뉴만', () => {
    const d = FRIDGE()
    const r = recommend(d, { limit: 5, use: 'tofu' })
    expect(r.items.length).toBeGreaterThan(0)
    for (const e of r.items) expect(e.lines.some((l) => l.catalogId === 'tofu' && l.use > 0)).toBe(true)
  })
  it('좋아하는 음식이 이름·주재료에 있으면 점수가 오름', () => {
    const base = FRIDGE()
    const r = RECIPE_MAP['kimchi-fried-rice']
    expect(likedMatch(r, ['볶음밥'])).toBe('볶음밥')
    expect(likedMatch(r, ['파스타'])).toBeNull()
    const s0 = evaluateNow(base, r).score
    const s1 = evaluateNow({ ...base, settings: { ...base.settings, likes: ['볶음밥'] } }, r).score
    expect(s1).toBeGreaterThan(s0)
  })
  it('최근 요리한 메뉴는 감점', () => {
    const d = FRIDGE()
    const r = RECIPE_MAP['kimchi-fried-rice']
    const ev = evaluateNow(d, r)
    const cooked = cookRecipe(d, ev, usesFromEval(ev)).data
    expect(evaluateNow(cooked, r).recent).toBe(true)
  })
  it('diversify는 같은 종류 반복보다 다른 종류를 고름', () => {
    const d = FRIDGE()
    const all = recommend(d, { limit: 999, diverse: false }).items
    const picked = diversify(all, 3)
    expect(new Set(picked.map((e) => e.recipe.id)).size).toBe(3)
  })
})

describe('임박 재료 소진', () => {
  it('3일 이내 재료를 묶고, 메뉴 수를 셈', () => {
    const d = FRIDGE()
    const u = urgentEntries(d)
    expect(u.map((x) => x.catalogId)).toEqual(['tofu', 'zucchini', 'green_onion', 'pork'])
    expect(u[0].days).toBe(0)
    expect(u.find((x) => x.catalogId === 'tofu')!.menuCount).toBeGreaterThan(0)
  })
  it('소진 계획은 최대 3끼로 임박 재료를 최대한 덮고, 메뉴가 겹치지 않음', () => {
    const d = FRIDGE()
    const p = rescuePlan(d)
    expect(p.steps.length).toBeGreaterThan(0)
    expect(p.steps.length).toBeLessThanOrEqual(3)
    const covered = new Set(p.steps.flatMap((s) => s.covers.map((c) => c.catalogId)))
    expect(covered.has('tofu')).toBe(true)
    expect(covered.size + p.leftovers.length).toBe(p.urgent.length)
    expect(new Set(p.steps.map((s) => s.ev.recipe.id)).size).toBe(p.steps.length)
  })
  it('기한 지난 재료는 임박 목록·계획에 넣지 않음', () => {
    const d = withItems(item('두부', 1, '모', -1), item('계란', 6, '개', 1), item('밥', 2, '공기', 30), item('대파', 1, '대', 5))
    expect(urgentEntries(d).map((x) => x.catalogId)).toEqual(['egg'])
  })
})

describe('대체 재료 힌트', () => {
  it('부족한 재료를 냉장고의 대체 재료로 안내 (등록된 규칙만)', () => {
    // 김치찌개: 돼지고기 대신 참치(규칙 있음)
    const d = withItems(item('김치', 400, 'g', 10), item('참치캔', 2, '캔', 300), item('두부', 1, '모', 3), item('대파', 1, '대', 5), item('양파', 1, '개', 10))
    const ev = evaluateNow(d, RECIPE_MAP['kimchi-jjigae'])
    const hints = ownedSubHints(ev, d)
    expect(hints.some((h) => h.from === 'pork' && (h.to === 'tuna' || h.to === 'spam'))).toBe(true)
  })
  it('알레르기 재료로는 대체 안내를 하지 않음', () => {
    const d0 = withItems(item('김치', 400, 'g', 10), item('참치캔', 2, '캔', 300), item('두부', 1, '모', 3))
    const d = { ...d0, settings: { ...d0.settings, allergens: ['생선' as const] } }
    const ev = evaluateNow(d, RECIPE_MAP['kimchi-jjigae'])
    expect(ownedSubHints(ev, d).some((h) => h.to === 'tuna')).toBe(false)
  })
})
