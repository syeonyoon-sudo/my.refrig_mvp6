import { describe, expect, it } from 'vitest'
import { addSamples, completeMeal, completePurchase, defaultData, syncShopping, undoMeal, upsertPlan, addRecipeShortages, cookRecipe } from '../src/lib/actions'
import { recommend, evaluateNow } from '../src/lib/engine'
import { addToInventory, consumeInventory, restoreDeductions, totalHave } from '../src/lib/inventory'
import { makePlan, summarizePlan } from '../src/lib/planner'
import { RECIPE_MAP, RECIPES } from '../src/lib/recipes'
import { CATALOG_MAP } from '../src/lib/catalog'
import { applySubs } from '../src/lib/substitutes'
import { addManual, itemNeed } from '../src/lib/shopping'
import { blockedReasons, resolveCatalog } from '../src/lib/match'
import type { AppData, InventoryItem } from '../src/lib/types'
import { addDays, today } from '../src/lib/util'
import { usesFromEval } from '../src/lib/planner'

function item(name: string, qty: number, unit: string, days: number | null, extra: Partial<InventoryItem> = {}): Omit<InventoryItem, 'id' | 'createdAt'> {
  return { name, catalogId: resolveCatalog(name), qty, unit, category: 'etc', storage: 'fridge', purchasedAt: null, expiresAt: days == null ? null : addDays(today(), days), image: null, memo: '', source: 'manual', ...extra }
}
function withItems(...items: Omit<InventoryItem, 'id' | 'createdAt'>[]): AppData {
  const d = defaultData('테스트')
  let inv = d.inventory
  for (const i of items) inv = addToInventory(inv, i).inventory
  return { ...d, inventory: inv }
}

describe('재료 이름 연결', () => {
  it('영수증 상품명·별칭을 재료로 연결', () => {
    expect(resolveCatalog('풀무원 국산콩 두부 300g')).toBe('tofu')
    expect(resolveCatalog('순두부')).toBe('soft_tofu')
    expect(resolveCatalog('다진 돼지고기')).toBe('pork_mince')
    expect(resolveCatalog('달걀 30구')).toBe('egg')
    expect(resolveCatalog('파프리카')).toBe('bell_pepper')
    expect(resolveCatalog('양파')).toBe('onion')
    expect(resolveCatalog('고추장')).toBe('gochujang')
    expect(resolveCatalog('물티슈')).toBe(null)
  })
  it('알레르기 판단', () => {
    expect(blockedReasons('마요네즈', 'mayo', { allergens: ['계란'], banned: [] }).length).toBe(1)
    expect(blockedReasons('새우', null, { allergens: [], banned: ['새우'] }).length).toBe(1)
    expect(blockedReasons('양파', 'onion', { allergens: ['계란'], banned: [] }).length).toBe(0)
  })
})

describe('재고 수량 계산', () => {
  it('두부 1모에서 ½모 사용 → ½모 남음, 되돌리면 1모', () => {
    const d = withItems(item('두부', 1, '모', 3))
    const r = consumeInventory(d.inventory, 'tofu', 0.5)
    expect(r.inventory[0].qty).toBe(0.5)
    expect(r.short).toBe(0)
    const back = restoreDeductions(r.inventory, r.deductions)
    expect(back[0].qty).toBe(1)
  })
  it('g 단위로 등록한 두부도 모 단위로 계산', () => {
    const d = withItems(item('두부', 300, 'g', 3))
    expect(totalHave(d.inventory, 'tofu')).toBeCloseTo(1)
    const r = consumeInventory(d.inventory, 'tofu', 0.25)
    expect(r.inventory[0].qty).toBeCloseTo(225)
  })
  it('기한 임박 묶음부터 차감, 부족분 표시', () => {
    const d = withItems(item('계란', 2, '개', 1), item('계란', 10, '개', 20))
    expect(d.inventory.length).toBe(2) // 기한이 달라 따로 보관
    const r = consumeInventory(d.inventory, 'egg', 3)
    const soon = r.inventory.find((x) => x.expiresAt === addDays(today(), 1))
    expect(soon).toBeUndefined() // 임박 2개 모두 사용
    expect(r.inventory[0].qty).toBe(9)
    expect(r.urgent).toBe(true)
    const r2 = consumeInventory(r.inventory, 'egg', 20)
    expect(r2.short).toBe(11)
  })
  it('같은 재료·같은 기한은 수량 합산', () => {
    const d = withItems(item('두부', 1, '모', 3), item('두부', 300, 'g', 3))
    expect(d.inventory.length).toBe(1)
    expect(d.inventory[0].qty).toBeCloseTo(2)
  })
  it('기한 지난 재료는 사용하지 않음', () => {
    const d = withItems(item('우유', 1000, 'ml', -1))
    expect(totalHave(d.inventory, 'milk')).toBe(0)
    const r = consumeInventory(d.inventory, 'milk', 200)
    expect(r.short).toBe(200)
  })
})

describe('메뉴 추천 조건 준수', () => {
  const base = addSamples(defaultData('테스트'))
  it('알레르기(계란) 재료가 들어간 메뉴는 추천하지 않음', () => {
    const d = { ...base, settings: { ...base.settings, allergens: ['계란' as const] } }
    const r = recommend(d, { limit: 50 })
    expect(r.items.length).toBeGreaterThan(0)
    for (const e of r.items) {
      for (const l of e.lines) expect(CATALOG_MAP[l.catalogId].allergens).not.toContain('계란')
      for (const s of e.seasonings) expect(s.item.allergens).not.toContain('계란')
    }
  })
  it('조리 시간·난이도 준수', () => {
    const d = { ...base, settings: { ...base.settings, maxTime: 10 as const, skill: 1 as const } }
    const r = recommend(d, { limit: 50 })
    for (const e of r.items) { expect(e.recipe.time).toBeLessThanOrEqual(10); expect(e.recipe.difficulty).toBe(1) }
  })
  it('추가 구매 금지면 부족 재료가 있는 메뉴 제외', () => {
    const d = { ...base, settings: { ...base.settings, allowPurchase: false } }
    const r = recommend(d, { limit: 50 })
    for (const e of r.items) expect(e.purchaseCount).toBe(0)
  })
  it('기한 임박 재료(두부 D-1)를 쓰는 메뉴가 상위', () => {
    const r = recommend(base, { limit: 3 })
    expect(r.items.some((e) => e.lines.some((l) => l.catalogId === 'tofu' || l.catalogId === 'zucchini'))).toBe(true)
  })
  it('기한 지난 우유는 보유 재료로 쓰지 않음', () => {
    const d = withItems(item('우유', 1000, 'ml', -2), item('파스타', 500, 'g', 100), item('양파', 2, '개', 10))
    const ev = evaluateNow(d, RECIPE_MAP['milk-cream-pasta'])
    const milk = ev.lines.find((l) => l.catalogId === 'milk')!
    expect(milk.have).toBe(0)
    expect(milk.short).toBe(200)
  })
  it('빠른 추천: 전자레인지 조건', () => {
    const r = recommend(base, { quick: ['microwave'], limit: 20 })
    for (const e of r.items) expect(e.recipe.tags.some((t) => t === 'microwave' || t === 'noFire')).toBe(true)
  })
})

describe('다회차 소진 계획', () => {
  it('두부 1모를 여러 끼니에 나눠 쓰고, 계획 사용량이 재고를 넘지 않음', () => {
    const d0 = withItems(
      item('두부', 1, '모', 3), item('계란', 6, '개', 10), item('대파', 2, '대', 5), item('밥', 3, '공기', 30),
      item('김치', 300, 'g', 20), item('양파', 2, '개', 20), item('애호박', 1, '개', 4),
    )
    const d = { ...d0, settings: { ...d0.settings, allowPurchase: false } }
    const plan = makePlan(d, { kind: 'plan', startDate: today(), days: 2, slots: ['아침', '저녁'], mode: 'noPurchase' })
    expect(plan.meals.length).toBe(4)
    const tofuUses = plan.meals.flatMap((m) => m.uses).filter((u) => u.catalogId === 'tofu').reduce((s, u) => s + u.amount, 0)
    expect(tofuUses).toBeLessThanOrEqual(1 + 1e-9)
    const s = summarizePlan(d, plan)
    expect(s.shortages.length).toBe(0) // 구매 금지 → 부족 없음
    for (const it of s.items) expect(it.planned).toBeLessThanOrEqual(it.have + 1e-9)
    // 기한 3일 이내 두부를 실제로 사용
    expect(tofuUses).toBeGreaterThan(0)
  })

  it('구매 허용 시 부족분이 장보기 목록에 한 번만 반영되고, 재동기화해도 중복되지 않음', () => {
    const d0 = withItems(item('밥', 2, '공기', 30), item('대파', 1, '대', 5))
    const plan = makePlan(d0, { kind: 'plan', startDate: today(), days: 2, slots: ['점심', '저녁'], mode: 'allow' })
    let d = upsertPlan(d0, plan)
    const s = summarizePlan(d, plan)
    const n1 = d.shopping.length
    expect(n1).toBe(s.shortages.length + s.missingSeasonings.length)
    for (const sh of s.shortages) {
      const it = d.shopping.find((x) => x.catalogId === sh.catalogId)!
      expect(itemNeed(it)).toBeCloseTo(sh.short)
    }
    d = syncShopping(syncShopping(d))
    expect(d.shopping.length).toBe(n1)
  })

  it('끼니 완료 시 실제 재고 차감, 완료 취소 시 정확히 복구', () => {
    const d0 = withItems(item('두부', 1, '모', 3), item('계란', 6, '개', 10), item('대파', 2, '대', 5), item('밥', 3, '공기', 30))
    const plan = makePlan(d0, { kind: 'plan', startDate: today(), days: 1, slots: ['저녁'], mode: 'noPurchase' })
    let d = upsertPlan(d0, plan)
    const meal = plan.meals[0]
    expect(meal.recipeId).not.toBeNull()
    const before = JSON.stringify(d.inventory.map((x) => [x.name, x.qty]).sort())
    d = completeMeal(d, plan.id, meal.id).data
    for (const u of meal.uses) {
      const now = totalHave(d.inventory, u.catalogId!)
      const was = totalHave(d0.inventory, u.catalogId!)
      expect(now).toBeCloseTo(was - u.amount)
    }
    d = undoMeal(d, plan.id, meal.id)
    const after = JSON.stringify(d.inventory.map((x) => [x.name, x.qty]).sort())
    expect(after).toBe(before)
  })

  it('예산 식단: 계획 구매 비용이 예산을 넘지 않음', () => {
    const d0 = withItems(item('밥', 3, '공기', 30), item('계란', 4, '개', 10))
    const plan = makePlan(d0, { kind: 'budget', startDate: today(), days: 3, slots: ['점심', '저녁'], mode: 'allow', budget: 10000 })
    const cost = plan.meals.reduce((s, m) => s + m.estCost, 0)
    expect(cost).toBeLessThanOrEqual(10000)
  })
})

describe('장보기 · 구매', () => {
  it('레시피 부족 재료 담기 → 구매 완료 → 냉장고 등록 및 목록에서 제거', () => {
    const d0 = withItems(item('밥', 1, '공기', 30))
    const ev = evaluateNow(d0, RECIPE_MAP['egg-fried-rice'])
    let d = addRecipeShortages(d0, ev)
    const egg = d.shopping.find((x) => x.catalogId === 'egg')!
    expect(itemNeed(egg)).toBe(2)
    expect(egg.packs).toBe(1)
    const r = completePurchase(d, [{ shoppingId: egg.id, packs: 1, expiresAt: addDays(today(), 14), storage: 'fridge', price: null }])
    d = r.data
    expect(totalHave(d.inventory, 'egg')).toBe(10)
    expect(d.shopping.find((x) => x.id === egg.id)).toBeUndefined()
    expect(d.purchases[0].priceType).toBe('estimate')
  })
  it('직접 추가 시 같은 재료는 한 줄로 합침', () => {
    let list = addManual([], '양파', 1, '개')
    list = addManual(list, '양파', 2, '개')
    expect(list.length).toBe(1)
    expect(itemNeed(list[0])).toBe(3)
  })
})

describe('대체 재료', () => {
  it('우유 → 순두부 대체 시 양 환산 및 알레르기 반영', () => {
    const r = applySubs(RECIPE_MAP['milk-cream-pasta'], { milk: 'soft_tofu' })
    const st = r.ingredients.find((i) => i.id === 'soft_tofu')!
    expect(st.amount).toBeCloseTo(200 / 350, 2)
    expect(r.ingredients.some((i) => i.id === 'milk')).toBe(false)
  })
})

describe('요리 완료 차감', () => {
  it('계란볶음밥 요리 시 밥 1·계란 2 차감', () => {
    const d0 = withItems(item('밥', 2, '공기', 30), item('계란', 5, '개', 10), item('대파', 1, '대', 5))
    const ev = evaluateNow(d0, RECIPE_MAP['egg-fried-rice'])
    const r = cookRecipe(d0, ev, usesFromEval(ev))
    expect(totalHave(r.data.inventory, 'rice')).toBe(1)
    expect(totalHave(r.data.inventory, 'egg')).toBe(3)
    expect(totalHave(r.data.inventory, 'green_onion')).toBe(0.5)
  })
})

describe('레시피 데이터 무결성', () => {
  it('모든 레시피 재료가 카탈로그에 있음', () => {
    for (const r of RECIPES) for (const i of r.ingredients) expect(CATALOG_MAP[i.id], `${r.id}:${i.id}`).toBeTruthy()
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length)
  })
})

import { aiMenuToRecipe } from '../src/lib/ai'
describe('AI 메뉴 검증', () => {
  const d = defaultData('t')
  it('AI 메뉴를 내부 레시피로 변환 (단위 환산 포함)', () => {
    const r = aiMenuToRecipe({ name: '두부 스테이크', ingredients: [{ name: '두부', amount: 150, unit: 'g' }, { name: '계란', amount: 1, unit: '개' }], seasonings: [{ name: '간장', text: '1큰술' }], steps: ['굽기'] }, d)
    expect('recipe' in r).toBe(true)
    if ('recipe' in r) expect(r.recipe.ingredients.find((i) => i.id === 'tofu')!.amount).toBeCloseTo(0.5)
  })
  it('알레르기 재료가 있으면 거부', () => {
    const dd = { ...d, settings: { ...d.settings, allergens: ['대두' as const] } }
    const r = aiMenuToRecipe({ name: 'x', ingredients: [{ name: '계란', amount: 2, unit: '개' }], seasonings: [{ name: '간장' }], steps: ['a'] }, dd)
    expect('error' in r).toBe(true)
  })
  it('알 수 없는 주재료는 거부', () => {
    const r = aiMenuToRecipe({ name: 'x', ingredients: [{ name: '트러플', amount: 1, unit: '개' }], steps: ['a'] }, d)
    expect('error' in r).toBe(true)
  })
})

import { aiFridge, aiReceipt } from '../src/lib/ai'
import { applyCustom } from '../src/lib/substitutes'
import { toBase as toBase2 } from '../src/lib/units'
import { applyAskUpdate, rowFromRecognized, rowsReady, manualRow } from '../src/components/Recognition'
import { vi } from 'vitest'

function mockFetch(result: unknown) {
  return vi.fn(async () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ ok: true, result }) })) as unknown as typeof fetch
}

describe('사진·영수증 AI 결과 처리', () => {
  it('미확인 재료는 이름 없이 후보만, 우유는 용량(ml)으로 변환', async () => {
    globalThis.fetch = mockFetch({ items: [
      { name: '우유', qty: 1, unit: '개', amount: 1000, amountUnit: 'ml', confidence: 'high', box: [0.1, 0.1, 0.2, 0.3] },
      { name: null, unknown: true, candidates: ['된장', '고추장'], qty: 1, unit: '개', confidence: 'low', packaging: '갈색 플라스틱 통' },
    ] })
    const items = await aiFridge({ data: 'x', mediaType: 'image/jpeg' })
    expect(items[0].qty).toBe(1000); expect(items[0].unit).toBe('ml')
    expect(items[1].unknown).toBe(true); expect(items[1].name).toBeNull(); expect(items[1].candidates).toEqual(['된장', '고추장'])
    const rows = items.map(rowFromRecognized)
    expect(rows[1].include).toBe(false)
    // 미확인을 선택한 채 등록하면 막음
    expect(rowsReady([{ ...rows[1], include: true }]).ok).toBe(false)
  })
  it('영수증: 날짜 형식 검사, 상품명 미확인 표시', async () => {
    globalThis.fetch = mockFetch({ store: 'A마트', date: '2026-11-04', total: 9000, items: [
      { raw: '부침두부300', name: '두부', qty: 1, unit: '모', price: 2000, isFood: true, confidence: 'high' },
      { raw: '■■■ 2입', name: null, qty: 1, unit: '개', price: 3000, isFood: true, confidence: 'low' },
      { raw: '봉투', name: '봉투', qty: 1, unit: '개', price: 100, isFood: false, confidence: 'high' },
    ] })
    const r = await aiReceipt({ data: 'x', mediaType: 'image/jpeg' })
    expect(r.date).toBe('2026-11-04')
    expect(r.items[1].unknown).toBe(true)
    expect(rowFromRecognized(r.items[2]).include).toBe(false)
  })
  it('AI 추가 질문의 수정안 적용 (번호 기준, AI 추정 표시)', () => {
    const rows = [{ ...manualRow(), name: '우유', qty: '1000', unit: 'ml' }]
    const next = applyAskUpdate(rows, { index: 1, amount: 500, amountUnit: 'ml', amountText: '절반 정도' })
    expect(next[0].qty).toBe('500'); expect(next[0].qtySource).toBe('ai')
  })
  it('팩·봉 단위는 일반 포장 1개로 계산', () => {
    expect(toBase2('egg', 1, '팩')).toBe(10)
    expect(toBase2('chicken_breast', 0.5, '팩')).toBe(200)
  })
})

describe('AI 대체·재료 빼기', () => {
  it('두부 → 계란(AI 추정량 2개), 대파 빼기', () => {
    const r = applyCustom(RECIPE_MAP['tofu-egg-scramble'], { tofu: { to: 'egg', amount: 1 } }, ['green_onion'])
    expect(r.ingredients.find((i) => i.id === 'egg')!.amount).toBe(3) // 원래 계란 2 + 대체 1
    expect(r.ingredients.some((i) => i.id === 'tofu' || i.id === 'green_onion')).toBe(false)
  })
})
