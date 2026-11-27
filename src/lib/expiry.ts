import type { InventoryItem } from './types'
import { diffDays, today } from './util'

export type ExpiryLevel = 'expired' | 'today' | 'soon' | 'week' | 'ok' | 'none'

export interface ExpiryInfo { days: number | null; level: ExpiryLevel; label: string }

export function expiryInfo(expiresAt: string | null | undefined, ref = today()): ExpiryInfo {
  if (!expiresAt) return { days: null, level: 'none', label: '기한 미입력' }
  const days = diffDays(ref, expiresAt)
  if (days < 0) return { days, level: 'expired', label: `기한 ${-days}일 지남` }
  if (days === 0) return { days, level: 'today', label: '오늘까지' }
  if (days <= 3) return { days, level: 'soon', label: `D-${days}` }
  if (days <= 7) return { days, level: 'week', label: `D-${days}` }
  return { days, level: 'ok', label: `D-${days}` }
}

/** 요리에 쓸 수 있는 재고인지 (기한 지남·상태 이상 제외) */
export function isUsable(item: InventoryItem, ref = today()): boolean {
  if (item.spoiled) return false
  if (item.qty <= 0) return false
  const e = expiryInfo(item.expiresAt, ref)
  return e.level !== 'expired'
}

/** 우선 소진 가중치: 기한이 가까울수록 큼 */
export function urgencyWeight(days: number | null): number {
  if (days == null) return 0.3
  if (days <= 0) return 5
  if (days <= 1) return 4
  if (days <= 3) return 3
  if (days <= 7) return 1.2
  return 0.4
}

export const LEVEL_STYLE: Record<ExpiryLevel, { bg: string; fg: string }> = {
  expired: { bg: '#F4D9D4', fg: '#9E3B2F' },
  today: { bg: '#F9DCCB', fg: '#A8461F' },
  soon: { bg: '#FBE8D5', fg: '#A5591F' },
  week: { bg: '#F6EFD3', fg: '#7A6420' },
  ok: { bg: '#E3EEDD', fg: '#2F5D43' },
  none: { bg: '#EEEAE1', fg: '#6B7268' },
}
