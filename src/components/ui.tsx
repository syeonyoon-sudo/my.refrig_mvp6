import { useEffect, type ReactNode } from 'react'
import { X, Loader2, FlaskConical, Info } from 'lucide-react'
import { expiryInfo, LEVEL_STYLE, type ExpiryLevel } from '../lib/expiry'

/** 신선도 링: 남은 일수만큼 원이 차고, 색으로 상태를 보여줌 */
const RING_COLOR: Record<ExpiryLevel, string> = {
  expired: '#C2392F', today: '#D9622B', soon: '#E7A21A', week: '#B9A22E', ok: '#4C8A5C', none: '#C9C2B2',
}
export function FreshRing({ emoji, image, expiresAt, size = 56, tint = '#F1EDE3', spoiled }: { emoji: string; image?: string | null; expiresAt: string | null; size?: number; tint?: string; spoiled?: boolean }) {
  const e = expiryInfo(expiresAt)
  const level: ExpiryLevel = spoiled ? 'expired' : e.level
  const stroke = 3.5
  const r = size / 2 - stroke / 2
  const len = 2 * Math.PI * r
  // 14일 이상 남으면 가득, 지났으면 빈 링 대신 체리색 전체
  const frac = level === 'none' ? 1 : level === 'expired' ? 1 : Math.max(0.08, Math.min(1, (e.days ?? 0) / 14))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ECE6D8" strokeWidth={stroke} />
        <circle
          className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={RING_COLOR[level]} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={level === 'none' ? '2 5' : len} strokeDashoffset={level === 'none' ? 0 : len * (1 - frac)}
          style={{ ['--ring-len' as string]: len }}
        />
      </svg>
      <div className="absolute rounded-full overflow-hidden grid place-items-center" style={{ inset: stroke + 2, background: tint }}>
        {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: size * 0.42, lineHeight: 1 }}>{emoji}</span>}
      </div>
    </div>
  )
}

export function ExpiryBadge({ expiresAt, spoiled, className = '' }: { expiresAt: string | null; spoiled?: boolean; className?: string }) {
  const e = expiryInfo(expiresAt)
  const st = spoiled ? LEVEL_STYLE.expired : LEVEL_STYLE[e.level]
  return (
    <span className={`inline-flex items-center h-6 px-2 rounded-full text-[12px] font-semibold num ${className}`} style={{ background: st.bg, color: st.fg }}>
      {spoiled ? '상태 이상' : e.label}
    </span>
  )
}

export function Badge({ children, tone = 'pea', className = '' }: { children: ReactNode; tone?: 'pea' | 'yolk' | 'cherry' | 'sky' | 'line' | 'basil'; className?: string }) {
  const tones = {
    pea: 'bg-pea text-basil', yolk: 'bg-yolk-soft text-[#86600A]', cherry: 'bg-cherry-soft text-cherry',
    sky: 'bg-sky text-[#2F5468]', line: 'border border-line-2 text-sub', basil: 'bg-basil text-paper',
  }
  return <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[12px] font-semibold whitespace-nowrap ${tones[tone]} ${className}`}>{children}</span>
}

/** 테스트 모드 표시 (실제 연동이 아닌 기능은 반드시 이걸로 표시) */
export function TestModeNote({ children, title = '테스트 모드' }: { children: ReactNode; title?: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#EBD9A6] bg-yolk-soft px-4 py-3 text-[14px] text-[#6E5410]">
      <FlaskConical className="w-5 h-5 shrink-0 mt-0.5" />
      <div><b className="font-bold">{title}</b> <span className="ml-1">{children}</span></div>
    </div>
  )
}

export function InfoNote({ children, tone = 'pea' }: { children: ReactNode; tone?: 'pea' | 'sky' | 'cherry' }) {
  const t = { pea: 'bg-pea/70 text-basil border-pea-2', sky: 'bg-sky/70 text-[#2F5468] border-[#C9DAE3]', cherry: 'bg-cherry-soft text-cherry border-[#EFC7C1]' }[tone]
  return (
    <div className={`flex gap-2.5 rounded-2xl border px-4 py-3 text-[14px] leading-relaxed ${t}`}>
      <Info className="w-[18px] h-[18px] shrink-0 mt-0.5" /><div>{children}</div>
    </div>
  )
}

export function PageHeader({ title, desc, actions, back }: { title: string; desc?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 lg:mb-8">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[28px] lg:text-[34px]">{title}</h1>
          {desc && <p className="mt-2 text-sub text-[15px] leading-relaxed max-w-[62ch]">{desc}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function SectionTitle({ children, right, className = '' }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
      <h2 className="title text-[18px]">{children}</h2>
      {right}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return <span className="inline-flex items-center gap-2 text-sub text-[14px]"><Loader2 className="w-4 h-4 spin" />{label}</span>
}

export function Empty({ emoji = '🧺', title, desc, action }: { emoji?: string; title: string; desc?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-[44px] mb-3">{emoji}</div>
      <p className="title text-[17px]">{title}</p>
      {desc && <p className="text-sub text-[14px] mt-1.5 max-w-[44ch] mx-auto leading-relaxed">{desc}</p>}
      {action && <div className="mt-5 flex justify-center gap-2 flex-wrap">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#1B2620]/40 fade-in" onClick={onClose} />
      <div className={`relative sheet-in w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92vh] flex flex-col bg-card rounded-t-[28px] sm:rounded-[28px] shadow-2xl`}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="title text-[19px]">{title}</h3>
          <button className="btn btn-ghost btn-sm !px-2" onClick={onClose} aria-label="닫기"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 pb-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line flex gap-2 justify-end pb-[calc(16px+env(safe-area-inset-bottom))] sm:pb-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block mb-1.5 text-[13.5px] font-semibold text-ink">
      {children}{hint && <span className="ml-1.5 font-normal text-mute">{hint}</span>}
    </label>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex flex-wrap p-1 rounded-full bg-[#EEE9DC] gap-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-full font-semibold transition ${size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-[14px]'} ${value === o.value ? 'bg-card text-ink shadow-sm' : 'text-sub hover:text-ink'}`}
        >{o.label}</button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; desc?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="w-full flex items-center justify-between gap-4 text-left py-1">
      <span><span className="block font-semibold text-[15px]">{label}</span>{desc && <span className="block text-sub text-[13px] mt-0.5">{desc}</span>}</span>
      <span className={`relative w-12 h-7 rounded-full shrink-0 transition ${checked ? 'bg-basil' : 'bg-[#D6CFBF]'}`}>
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
}

/** 메뉴 그림: 접시 위 이모지 */
export function Plate({ emoji, size = 72, tone = '#EAF0E2' }: { emoji: string; size?: number; tone?: string }) {
  return (
    <div className="relative shrink-0 rounded-full grid place-items-center" style={{ width: size, height: size, background: `radial-gradient(circle at 50% 50%, #FFFDF8 0 54%, ${tone} 55% 100%)`, boxShadow: 'inset 0 0 0 1px rgba(31,74,53,.08)' }} aria-hidden>
      <span style={{ fontSize: size * 0.44, lineHeight: 1 }}>{emoji}</span>
    </div>
  )
}

export function Meter({ value, tone = 'basil' }: { value: number; tone?: 'basil' | 'yolk' | 'cherry' }) {
  const c = { basil: 'bg-leaf', yolk: 'bg-yolk', cherry: 'bg-cherry' }[tone]
  return (
    <div className="h-2 rounded-full bg-[#ECE6D8] overflow-hidden">
      <div className={`h-full rounded-full ${c} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  )
}

/** 처음 넣은 양 대비 남은 양 (initialQty가 있는 재료만) */
export function RemainBar({ qty, initial, className = '' }: { qty: number; initial?: number; className?: string }) {
  if (initial == null || initial <= 0 || qty >= initial - 1e-6) return null
  const pct = Math.max(0, Math.min(100, Math.round((qty / initial) * 100)))
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={`처음 양의 ${pct}% 남음`}>
      <span className="w-12 h-1.5 rounded-full bg-[#ECE6D8] overflow-hidden"><span className={`block h-full rounded-full ${pct <= 30 ? 'bg-yolk' : 'bg-leaf'}`} style={{ width: `${pct}%` }} /></span>
      <span className="text-[11.5px] text-sub num">{pct}%</span>
    </span>
  )
}
