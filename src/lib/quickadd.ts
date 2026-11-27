// 빠른 등록: 체크한 재료·한 줄 입력을 재고 항목으로 만들기
import { CATALOG_MAP, INGREDIENTS } from './catalog'
import type { NewItem } from './inventory'
import { resolveCatalog } from './match'
import type { AppData } from './types'
import { addDays, today } from './util'

/** 자취생이 자주 사는 재료 (기록이 없을 때 기본 순서) */
export const COMMON_IDS = [
  'egg', 'tofu', 'green_onion', 'onion', 'kimchi', 'rice', 'pork', 'chicken_breast', 'milk', 'zucchini', 'potato', 'cabbage',
  'spam', 'tuna', 'bean_sprout', 'king_oyster', 'carrot', 'sausage', 'fish_cake', 'ramen', 'cheese', 'garlic', 'beef', 'dumpling',
]

/** 내 구매·사용·재고 기록이 많은 재료를 앞으로 */
export function frequentIds(data: AppData, limit = 18): string[] {
  const count = new Map<string, number>()
  const bump = (id: string | null | undefined, n = 1) => { if (id && CATALOG_MAP[id]?.kind === 'ingredient') count.set(id, (count.get(id) ?? 0) + n) }
  data.purchases.forEach((p) => bump(p.catalogId, 2))
  data.usage.forEach((u) => bump(u.catalogId))
  data.inventory.forEach((i) => bump(i.catalogId ?? resolveCatalog(i.name)))
  const mine = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  return Array.from(new Set([...mine, ...COMMON_IDS])).filter((id) => CATALOG_MAP[id]).slice(0, limit)
}

export interface QuickPick { id: string | null; name: string; qty: number; unit: string }

/** 기본 수량: 일반 포장 1개 (예: 두부 1모, 계란 10개, 돼지고기 300g) */
export function defaultPick(id: string): QuickPick {
  const c = CATALOG_MAP[id]
  return { id, name: c.name.replace(/\(.*\)/, '').trim(), qty: c.pack.size, unit: c.unit }
}

/**
 * "두부, 대파 2, 계란 10개, 돼지고기 300g" → 재료별 항목
 * 수량이 없으면 일반 포장 1개, 단위가 없으면 재료 기준 단위
 */
export function parseQuickText(text: string): QuickPick[] {
  const out: QuickPick[] = []
  for (const raw of text.split(/[,，、\n]+/)) {
    const t = raw.trim()
    if (!t) continue
    const m = t.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*([a-zA-Z가-힣]{0,3})$/)
    const name = (m && m[1].trim() ? m[1] : t).trim().slice(0, 20)
    const id = resolveCatalog(name)
    const c = id ? CATALOG_MAP[id] : null
    if (c && c.kind !== 'ingredient') continue
    const qty = m && m[1].trim() ? Number(m[2]) : c ? c.pack.size : 1
    const unit = m && m[1].trim() && m[3] ? m[3] : c ? c.unit : '개'
    out.push({ id: c ? c.id : null, name: c ? c.name.replace(/\(.*\)/, '').trim() : name, qty: qty > 0 ? qty : 1, unit })
  }
  return out
}

/**
 * 체크한 재료를 재고 항목으로
 * fillExpiry: 포장지 날짜 대신 일반적인 보관 기간으로 기한을 채움 (화면에 '기한 추정'으로 표시)
 */
export function picksToItems(picks: QuickPick[], fillExpiry: boolean): NewItem[] {
  const t = today()
  return picks.map((p) => {
    const c = p.id ? CATALOG_MAP[p.id] : null
    const storage = c?.storage ?? 'fridge'
    const shelf = c?.shelf?.[storage]
    const est = fillExpiry && shelf != null
    return {
      name: p.name, catalogId: p.id, qty: p.qty, unit: p.unit, category: c?.category ?? 'etc', storage,
      purchasedAt: t, expiresAt: est ? addDays(t, shelf!) : null, image: null, memo: '', source: 'manual', qtySource: 'user',
      ...(est ? { expiryEstimated: true } : {}),
    }
  })
}

export const ALL_QUICK = INGREDIENTS
