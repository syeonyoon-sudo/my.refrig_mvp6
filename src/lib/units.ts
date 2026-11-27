import { CATALOG_MAP } from './catalog'
import { round } from './util'

/** 재료에서 선택할 수 있는 단위 목록 (기준 단위가 맨 앞) */
export function unitOptions(catalogId: string | null): string[] {
  if (!catalogId) return ['개', 'g', 'kg', 'ml', 'L', '봉', '팩', '캔', '장', '병', '모', '대', '공기']
  const c = CATALOG_MAP[catalogId]
  if (!c) return ['개']
  const list = [c.unit, ...Object.keys(c.conv ?? {})]
  if (c.unit === 'g' || c.conv?.g != null) list.push('g', 'kg')
  if (c.unit === 'ml' || c.conv?.ml != null) list.push('ml', 'L')
  if (c.kind === 'ingredient') list.push('팩', '봉') // 1팩·1봉 = 일반 포장 1개
  return Array.from(new Set(list))
}

/** 재고 수량을 카탈로그 기준 단위로 변환. 변환할 수 없으면 null */
export function toBase(catalogId: string | null, qty: number, unit: string): number | null {
  if (!catalogId) return null
  const c = CATALOG_MAP[catalogId]
  if (!c) return null
  if (unit === c.unit) return qty
  const conv = c.conv?.[unit]
  if (conv != null) return qty * conv
  if (c.unit === 'g' && unit === 'kg') return qty * 1000
  if (c.unit === 'ml' && unit === 'L') return qty * 1000
  if (c.unit === 'g' && unit === 'g') return qty
  // g ↔ 기준 단위 간접 변환 (예: 기준이 '개'이고 conv에 g가 있을 때 kg 입력)
  if (unit === 'kg' && c.conv?.g != null) return qty * 1000 * c.conv.g
  if (unit === 'L' && c.conv?.ml != null) return qty * 1000 * c.conv.ml
  if ((unit === '팩' || unit === '봉') && c.kind === 'ingredient') return qty * c.pack.size
  return null
}

/** 기준 단위 수량을 특정 단위로 변환 */
export function fromBase(catalogId: string | null, base: number, unit: string): number | null {
  const one = toBase(catalogId, 1, unit)
  if (!one) return null
  return base / one
}

const FRAC: [number, string][] = [[0.25, '¼'], [0.5, '½'], [0.75, '¾'], [1 / 3, '⅓'], [2 / 3, '⅔']]

/** 사람이 읽기 쉬운 수량 표시 (예: 0.5모 → ½모, 1.25개 → 1¼개) */
export function fmtQty(qty: number, unit: string): string {
  if (!isFinite(qty)) return `- ${unit}`
  const q = Math.max(0, qty)
  if (unit === 'g' || unit === 'ml') {
    if (q >= 1000 && q % 100 === 0) return `${round(q / 1000, 2)}${unit === 'g' ? 'kg' : 'L'}`
    return `${Math.round(q)}${unit}`
  }
  const whole = Math.floor(q + 1e-9)
  const rest = q - whole
  if (rest < 0.02) return `${whole}${unit}`
  for (const [v, s] of FRAC) {
    if (Math.abs(rest - v) < 0.03) return `${whole > 0 ? whole : ''}${s}${unit}`
  }
  return `${round(q, 2)}${unit}`
}
