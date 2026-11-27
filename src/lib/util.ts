// 날짜·숫자·ID 공통 함수

export function uid(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 8)
  return `${prefix}${Date.now().toString(36)}${r}`
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string { return toDateStr(new Date()) }

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return toDateStr(dt)
}

/** b - a (일) */
export function diffDays(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  const t1 = Date.UTC(y1, m1 - 1, d1)
  const t2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((t2 - t1) / 86400000)
}

export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = (dt.getDay() + 6) % 7 // 월요일 = 0
  dt.setDate(dt.getDate() - day)
  return toDateStr(dt)
}

const WD = ['일', '월', '화', '수', '목', '금', '토']
export function fmtDate(date: string, withWeekday = true): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${m}/${d}${withWeekday ? `(${WD[dt.getDay()]})` : ''}`
}

export function relDay(date: string, base = today()): string {
  const n = diffDays(base, date)
  if (n === 0) return '오늘'
  if (n === 1) return '내일'
  if (n === 2) return '모레'
  return fmtDate(date)
}

export function won(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

export function round(n: number, digits = 2): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

export const EPS = 1e-6

export function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)) }

export function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

/** 받침에 따라 조사 선택 (예: josa('두부', '을', '를') → '를') */
export function josa(word: string, withBatchim: string, without: string): string {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return without
  return code % 28 ? withBatchim : without
}

/** "돼지고기(찌개·볶음용)" → "돼지고기" */
export function shortName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, '').trim() || name
}
