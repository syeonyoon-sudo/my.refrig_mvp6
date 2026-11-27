// 사진·영수증 인식 결과를 확인·수정하는 화면 조각들
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { AlertCircle, Crop, HelpCircle, Loader2, MessageCircle, Minus, Plus, RefreshCw, Send, Sparkles, Trash2, X } from 'lucide-react'
import { CATALOG_MAP, INGREDIENTS, STORAGE_LABEL } from '../lib/catalog'
import { findMergeTarget } from '../lib/inventory'
import { resolveCatalog } from '../lib/match'
import { fmtQty, fromBase, toBase, unitOptions } from '../lib/units'
import type { Category, StorageType } from '../lib/types'
import type { AskUpdate, Box, ChatTurn, ImageData, Recognized } from '../lib/ai'
import { aiAsk, aiIdentify } from '../lib/ai'
import { cropImage } from '../lib/image'
import { useData } from '../store/AppStore'
import { Badge } from './ui'

export type QtySource = 'ai' | 'user' | 'unknown'

export interface ReviewRow {
  key: string
  include: boolean
  raw: string
  name: string
  unknown: boolean
  candidates: string[]
  category: Category | null
  qty: string
  unit: string
  qtySource: QtySource
  amountText: string
  packaging: string
  box: Box | null
  confidence: 'high' | 'medium' | 'low'
  confirmed: boolean
  storage: StorageType
  expiresAt: string
  price: string
  isFood: boolean
  note: string
  reason?: string
  amount?: number | null // AI가 읽은 용량 (예: 1.5 kg) — 이름을 정하면 재고 단위로 사용
  amountUnit?: string | null
}

/** 이름이 정해졌을 때 AI가 읽은 용량을 재고 단위로 쓸 수 있으면 적용 */
export function namedPatch(row: ReviewRow, name: string): Partial<ReviewRow> {
  const cid = resolveCatalog(name)
  const c = cid ? CATALOG_MAP[cid] : null
  const p: Partial<ReviewRow> = { name, category: c?.category ?? row.category, storage: c?.storage ?? row.storage }
  if (c && row.amount && row.amountUnit && toBase(cid, row.amount, row.amountUnit) != null) { p.qty = String(row.amount); p.unit = row.amountUnit }
  else if (c && toBase(cid, 1, row.unit) == null) p.unit = c.unit
  return p
}

const rid = () => Math.random().toString(36).slice(2)

export function rowFromRecognized(r: Recognized): ReviewRow {
  const cid = r.name ? resolveCatalog(r.name) : null
  const c = cid ? CATALOG_MAP[cid] : null
  return {
    key: rid(), include: !r.unknown && r.isFood, raw: r.raw, name: r.name ?? '', unknown: r.unknown, candidates: r.candidates,
    category: r.category, qty: String(r.qty), unit: r.unit, qtySource: 'ai', amountText: r.amountText, packaging: r.packaging,
    box: r.box, confidence: r.confidence, confirmed: r.confidence === 'high', storage: c?.storage ?? 'fridge', expiresAt: '',
    price: r.price != null ? String(r.price) : '', isFood: r.isFood, note: r.note, reason: r.reason, amount: r.amount, amountUnit: r.amountUnit,
  }
}

export function manualRow(): ReviewRow {
  return {
    key: rid(), include: true, raw: '', name: '', unknown: false, candidates: [], category: null, qty: '1', unit: '개', qtySource: 'user',
    amountText: '', packaging: '', box: null, confidence: 'high', confirmed: true, storage: 'fridge', expiresAt: '', price: '', isFood: true, note: '',
  }
}

export function rowsReady(rows: ReviewRow[]): { ok: boolean; msg?: string } {
  const sel = rows.filter((r) => r.include)
  if (!sel.length) return { ok: false, msg: '등록할 재료를 하나 이상 선택해 주세요.' }
  if (sel.some((r) => r.unknown || !r.name.trim())) return { ok: false, msg: '이름이 없는 "미확인" 항목이 선택돼 있어요. 이름을 입력하거나 선택을 해제해 주세요.' }
  if (sel.some((r) => !(Number(r.qty) > 0))) return { ok: false, msg: '수량은 0보다 큰 숫자로 입력해 주세요.' }
  if (sel.some((r) => r.confidence !== 'high' && !r.confirmed)) return { ok: false, msg: '"확인 필요" 항목의 "맞아요"를 눌러 확인해 주세요.' }
  const bad = sel.find((r) => { const cid = resolveCatalog(r.name); return cid && toBase(cid, 1, r.unit) == null })
  if (bad) return { ok: false, msg: `${bad.name}은(는) "${bad.unit}" 단위로 재고 계산을 할 수 없어요. 단위를 바꿔 주세요.` }
  return { ok: true }
}

// ───────────────────── 수량·용량 편집 ─────────────────────

const APPROX: { label: string; f: number }[] = [
  { label: '가득', f: 1 }, { label: '¾', f: 0.75 }, { label: '절반', f: 0.5 }, { label: '¼', f: 0.25 }, { label: '조금', f: 0.1 },
]
const SOURCE_BADGE: Record<QtySource, { t: string; tone: 'sky' | 'pea' | 'yolk' }> = {
  ai: { t: 'AI 추정치', tone: 'sky' }, user: { t: '직접 입력', tone: 'pea' }, unknown: { t: '대략 (정확한 양 모름)', tone: 'yolk' },
}

export function QtyEditor({ row, onChange }: { row: ReviewRow; onChange: (p: Partial<ReviewRow>) => void }) {
  const cid = resolveCatalog(row.name)
  const c = cid ? CATALOG_MAP[cid] : null
  const units = Array.from(new Set([...unitOptions(cid), ...(cid ? [] : ['g', 'kg', 'ml', 'L', '개', '봉', '팩'])]))
  const unit = units.includes(row.unit) ? row.unit : units[0]
  const q = Number(row.qty) || 0
  const step = unit === 'g' || unit === 'ml' ? (q >= 200 ? 50 : 10) : ['모', '대', '송이'].includes(unit) ? 0.25 : 1
  // "가득"의 기준: 일반 포장 1개
  const full = c ? fromBase(cid, c.pack.size, unit) : null
  const convertible = !c || toBase(cid, 1, unit) != null
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-paper p-1">
          <button type="button" className="w-8 h-8 rounded-full grid place-items-center hover:bg-card" aria-label="줄이기" onClick={() => onChange({ qty: String(Math.max(0, +(q - step).toFixed(3))), qtySource: 'user' })}><Minus className="w-4 h-4" /></button>
          <input className="w-16 h-8 text-center bg-transparent font-bold num outline-none" inputMode="decimal" value={row.qty} onChange={(e) => onChange({ qty: e.target.value, qtySource: 'user' })} aria-label="수량·용량" />
          <button type="button" className="w-8 h-8 rounded-full grid place-items-center hover:bg-card" aria-label="늘리기" onClick={() => onChange({ qty: String(+(q + step).toFixed(3)), qtySource: 'user' })}><Plus className="w-4 h-4" /></button>
        </div>
        <select className="field !h-10 !w-auto" value={unit} onChange={(e) => onChange({ unit: e.target.value, qtySource: row.qtySource === 'ai' ? 'user' : row.qtySource })} aria-label="단위">
          {units.map((u) => <option key={u}>{u}</option>)}
        </select>
        <Badge tone={SOURCE_BADGE[row.qtySource].tone}>{SOURCE_BADGE[row.qtySource].t}</Badge>
      </div>
      {!convertible && <p className="mt-1 text-[12px] text-cherry">이 단위는 {c?.name} 재고 계산에 쓸 수 없어요. 다른 단위를 골라 주세요.</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <label className="inline-flex items-center gap-1.5 text-[13px] text-sub mr-1 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[#1F4A35]" checked={row.qtySource === 'unknown'} onChange={(e) => onChange(e.target.checked ? { qtySource: 'unknown', qty: row.qty || String(full ?? 1) } : { qtySource: 'user' })} />
          정확한 용량을 모르겠어요
        </label>
        {full != null && (
          <>
            <span className="text-[12.5px] text-mute">대략:</span>
            {APPROX.map((a) => (
              <button key={a.label} type="button" className="h-7 px-2.5 rounded-full border border-line-2 text-[12.5px] hover:border-leaf bg-white" title={`${c?.pack.label} 기준 ${a.label}`}
                onClick={() => onChange({ qty: String(+(full * a.f).toFixed(unit === 'g' || unit === 'ml' ? 0 : 2)), unit, qtySource: 'unknown' })}>{a.label}</button>
            ))}
            <span className="text-[11.5px] text-mute">({c?.pack.label} 기준)</span>
          </>
        )}
      </div>
    </div>
  )
}

// ───────────────────── 사진 위 위치 표시 · 영역 선택 ─────────────────────

export function PhotoCanvas({ src, rows, selectedKey, selecting, onPick, onSelectBox }: {
  src: string; rows: ReviewRow[]; selectedKey: string | null; selecting: boolean; onPick: (key: string) => void; onSelectBox: (b: Box) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const pos = (e: RPointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) }
  }
  const down = (e: RPointerEvent) => { if (!selecting) return; e.preventDefault(); (e.target as Element).setPointerCapture?.(e.pointerId); const p = pos(e); setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }) }
  const move = (e: RPointerEvent) => { if (!drag) return; const p = pos(e); setDrag({ ...drag, x1: p.x, y1: p.y }) }
  const up = () => {
    if (!drag) return
    const b: Box = [Math.min(drag.x0, drag.x1), Math.min(drag.y0, drag.y1), Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0)]
    setDrag(null)
    if (b[2] > 0.02 && b[3] > 0.02) onSelectBox(b)
  }
  return (
    <div className="flex justify-center rounded-2xl bg-paper overflow-hidden">
      <div ref={ref} className={`relative inline-block select-none ${selecting ? 'cursor-crosshair outline outline-2 outline-yolk' : ''}`} style={{ touchAction: selecting ? 'none' : 'auto' }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
        <img src={src} alt="올린 사진" className="block max-w-full max-h-[520px] pointer-events-none" draggable={false} />
        <ImageBoxes src={src} rows={rows} selectedKey={selectedKey} onPick={onPick} disabled={selecting} />
        {drag && (
          <div className="absolute border-2 border-yolk bg-yolk/20 pointer-events-none" style={{ left: `${Math.min(drag.x0, drag.x1) * 100}%`, top: `${Math.min(drag.y0, drag.y1) * 100}%`, width: `${Math.abs(drag.x1 - drag.x0) * 100}%`, height: `${Math.abs(drag.y1 - drag.y0) * 100}%` }} />
        )}
        {selecting && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-max max-w-[90%] rounded-full bg-ink/85 text-paper text-[13px] px-3 py-1.5 pointer-events-none text-center">재료 부분을 네모로 그려 주세요</div>}
      </div>
    </div>
  )
}

function ImageBoxes({ rows, selectedKey, onPick, disabled }: { src: string; rows: ReviewRow[]; selectedKey: string | null; onPick: (key: string) => void; disabled: boolean }) {
  return (
    <>
      {rows.map((r, i) => r.box && (
        <button key={r.key} type="button" disabled={disabled} onClick={() => onPick(r.key)}
          className={`absolute border-2 rounded-md transition ${r.key === selectedKey ? 'border-yolk bg-yolk/15' : r.unknown ? 'border-cherry border-dashed' : 'border-white/90'} ${disabled ? 'pointer-events-none' : ''}`}
          style={{ left: `${r.box[0] * 100}%`, top: `${r.box[1] * 100}%`, width: `${r.box[2] * 100}%`, height: `${r.box[3] * 100}%`, boxShadow: '0 0 0 1px rgba(0,0,0,.25)' }}
          aria-label={`${i + 1}번 ${r.name || '미확인 식재료'}`}>
          <span className={`absolute -top-2.5 -left-2.5 min-w-[22px] h-[22px] px-1 rounded-full text-[12px] font-bold grid place-items-center num ${r.unknown ? 'bg-cherry text-white' : 'bg-basil text-paper'}`}>{r.unknown ? '?' : i + 1}</span>
        </button>
      ))}
    </>
  )
}

// ───────────────────── 미확인 식재료 해결 ─────────────────────

export function UnknownResolver({ row, index, image, onChange, onSelectArea, aiOn }: {
  row: ReviewRow; index: number; image: { dataUrl: string } | null; onChange: (p: Partial<ReviewRow>) => void; onSelectArea: () => void; aiOn: boolean
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const setNamed = (n: string) => {
    if (!n.trim()) return
    onChange({ ...namedPatch(row, n.trim()), unknown: false, include: true, confirmed: true })
  }
  const reanalyze = async () => {
    if (!image) return
    setBusy(true); setErr(null)
    try {
      const crop = await cropImage(image.dataUrl, row.box ?? [0, 0, 1, 1])
      const r = await aiIdentify(crop as ImageData, row.box ? undefined : `사진 속 ${index + 1}번째로 보이는 식재료. 포장: ${row.packaging || '모름'}`)
      if (r.name && !r.unknown && r.confidence !== 'low') {
        onChange({ name: r.name, unknown: false, include: true, confirmed: r.confidence === 'high', confidence: r.confidence, candidates: r.candidates, reason: r.reason, packaging: r.packaging || row.packaging, amountText: r.amountText || row.amountText })
      } else {
        onChange({ candidates: Array.from(new Set([...(r.name ? [r.name] : []), ...r.candidates])), reason: r.reason ?? '다시 봐도 확실하지 않아요.' })
      }
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="mt-3 rounded-2xl border border-[#EFC7C1] bg-cherry-soft/50 p-4">
      <p className="font-bold text-[15px] flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-cherry" />이 식재료를 인식하지 못했어요. 무엇인가요?</p>
      <p className="text-[13.5px] text-sub mt-0.5">직접 식재료명을 입력해 주세요. {row.packaging && <>AI가 본 모습: {row.packaging}</>}</p>
      <div className="mt-3 flex gap-2">
        <input className="field" list="ing-search" placeholder="식재료 검색 또는 직접 입력" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setNamed(name) } }} aria-label="식재료명 직접 입력" />
        <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={() => setNamed(name)}>이걸로 할게요</button>
      </div>
      <datalist id="ing-search">{INGREDIENTS.map((c) => <option key={c.id} value={c.name} />)}</datalist>
      {row.candidates.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] text-sub">AI 후보:</span>
          {row.candidates.map((c) => <button key={c} type="button" className="chip !h-8 !text-[13px]" onClick={() => setNamed(c)}>{c}</button>)}
        </div>
      )}
      {row.reason && <p className="mt-2 text-[12.5px] text-sub">AI 판단 근거: {row.reason}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-line btn-sm" disabled={!aiOn || busy || !image} onClick={reanalyze}>{busy ? <Loader2 className="w-4 h-4 spin" /> : <RefreshCw className="w-4 h-4" />}AI 재분석{row.box ? ' (이 부분만)' : ''}</button>
        <button type="button" className="btn btn-line btn-sm" disabled={!aiOn || !image} onClick={onSelectArea}><Crop className="w-4 h-4" />사진에서 영역 선택해 재분석</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ include: false })}>등록하지 않기</button>
      </div>
      {err && <p className="mt-2 text-[13px] text-cherry">{err}</p>}
    </div>
  )
}

// ───────────────────── 인식 결과 한 줄 (사진) ─────────────────────

export function FridgeRowCard({ row, index, selected, image, aiOn, onChange, onRemove, onSelectArea, onFocus }: {
  row: ReviewRow; index: number; selected: boolean; image: { dataUrl: string } | null; aiOn: boolean
  onChange: (p: Partial<ReviewRow>) => void; onRemove: () => void; onSelectArea: () => void; onFocus: () => void
}) {
  const { data } = useData()
  const cid = resolveCatalog(row.name)
  const c = cid ? CATALOG_MAP[cid] : null
  const merge = row.include && !row.unknown && row.name ? findMergeTarget(data.inventory, { name: row.name, catalogId: cid, expiresAt: row.expiresAt || null, storage: row.storage, unit: row.unit, qty: Number(row.qty) }) : null
  const needsCheck = !row.unknown && row.confidence !== 'high' && !row.confirmed
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => { if (selected) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [selected])
  return (
    <li ref={ref} onClick={onFocus} className={`tile p-4 transition ${selected ? 'ring-2 ring-yolk' : ''} ${!row.include && !row.unknown ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`min-w-[26px] h-[26px] px-1 rounded-full text-[13px] font-bold grid place-items-center num ${row.unknown ? 'bg-cherry text-white' : 'bg-basil text-paper'}`}>{row.unknown ? '?' : index + 1}</span>
        {!row.unknown && (
          <label className="inline-flex items-center gap-2 font-semibold text-[14px] cursor-pointer">
            <input type="checkbox" className="w-5 h-5 accent-[#1F4A35]" checked={row.include} onChange={(e) => onChange({ include: e.target.checked })} />등록
          </label>
        )}
        {row.unknown ? <Badge tone="cherry">미확인 식재료</Badge> : row.confidence === 'high' ? <Badge>확실</Badge> : row.confidence === 'medium' ? <Badge tone="yolk">확인 필요</Badge> : <Badge tone="cherry">불확실</Badge>}
        {c && !row.unknown && <span className="text-[12.5px] text-sub">{c.emoji} {c.name}(으)로 재고 계산</span>}
        {!c && row.name && !row.unknown && <span className="text-[12.5px] text-mute">레시피 DB에 없는 재료</span>}
        <button type="button" className="ml-auto text-mute hover:text-cherry p-1" aria-label="이 줄 삭제" onClick={(e) => { e.stopPropagation(); onRemove() }}><Trash2 className="w-4 h-4" /></button>
      </div>

      {row.unknown ? (
        <UnknownResolver row={row} index={index} image={image} onChange={onChange} onSelectArea={onSelectArea} aiOn={aiOn} />
      ) : (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <input className="field" value={row.name} onChange={(e) => onChange({ name: e.target.value, confirmed: true })} aria-label="식재료명" list="ing-search-all" />
            <select className="field sm:!w-28" value={row.storage} onChange={(e) => onChange({ storage: e.target.value as StorageType })} aria-label="보관 장소">{(['fridge', 'freezer', 'room'] as StorageType[]).map((s) => <option key={s} value={s}>{STORAGE_LABEL[s]}</option>)}</select>
          </div>
          <datalist id="ing-search-all">{INGREDIENTS.map((x) => <option key={x.id} value={x.name} />)}</datalist>
          <QtyEditor row={row} onChange={onChange} />
          {(row.amountText || row.packaging) && (
            <p className="text-[13px] text-[#2F5468] bg-sky/60 rounded-xl px-3 py-2"><Sparkles className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />AI가 본 정보: {[row.packaging, row.amountText].filter(Boolean).join(' · ')} <span className="text-mute">(추정)</span></p>
          )}
          <div className="grid sm:grid-cols-2 gap-2 items-center">
            <label className="text-[13px] text-sub flex items-center gap-2 whitespace-nowrap">유통기한 <input type="date" className="field !h-10" value={row.expiresAt} onChange={(e) => onChange({ expiresAt: e.target.value })} /></label>
            <span className="text-[12.5px] text-mute">{row.expiresAt ? '' : '사진으로는 알 수 없어서 비워 뒀어요. 포장지를 보고 넣어 주세요.'}</span>
          </div>
          {needsCheck && row.include && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-yolk-soft px-3 py-2 text-[13px] text-[#6E5410]">
              <AlertCircle className="w-4 h-4" />AI가 확실하지 않대요. 이름이 맞는지 확인해 주세요.
              <button type="button" className="btn btn-sm bg-[#6E5410] text-white ml-auto" onClick={() => onChange({ confirmed: true })}>맞아요</button>
              <button type="button" className="btn btn-sm btn-line" onClick={() => onChange({ unknown: true, include: false, candidates: row.name ? [row.name, ...row.candidates] : row.candidates, name: '' })}>아니에요</button>
            </div>
          )}
          {merge && <p className="text-[12.5px] text-leaf">기존 재고 {merge.name}에 수량이 합쳐져요.</p>}
        </div>
      )}
    </li>
  )
}

// ───────────────────── AI에게 추가 질문 ─────────────────────

export interface AskMessage extends ChatTurn { updates?: AskUpdate[]; applied?: number[] }

export function AskPanel({ image, rows, onApply }: { image: ImageData | null; rows: ReviewRow[]; onApply: (u: AskUpdate) => void }) {
  const { aiOn } = useData()
  const [msgs, setMsgs] = useState<AskMessage[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [msgs.length, busy])

  const named = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.name)
  const suggestions = [
    named[0] ? `${named[0].i + 1}번 ${named[0].r.name} 용량이 얼마인가요?` : '이거 용량이 얼마인가요?',
    named.find(({ r }) => /우유|두유|주스/.test(r.name)) ? `이 ${named.find(({ r }) => /우유|두유|주스/.test(r.name))!.r.name}는 몇 ml 정도인가요?` : '이 우유는 몇 ml 정도인가요?',
    '이 채소는 몇 g 정도 남아 있나요?',
    '이 사진에서 두 번째 식재료가 뭔가요?',
    '모든 재료의 양을 다시 추정해 주세요.',
  ]

  const ask = async (question: string) => {
    if (!image || !question.trim()) return
    const history = msgs.map((m) => ({ role: m.role, text: m.text }))
    setMsgs((m) => [...m, { role: 'user', text: question }])
    setQ(''); setBusy(true); setErr(null)
    try {
      const items = rows.map((r, i) => ({ index: i + 1, name: r.name || '미확인', qty: Number(r.qty) || 0, unit: r.unit, amountText: r.amountText || undefined }))
      const r = await aiAsk(image, items, history, question)
      setMsgs((m) => [...m, { role: 'ai', text: r.answer || '답을 만들지 못했어요.', updates: r.updates, applied: [] }])
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="panel p-5">
      <p className="title text-[17px] flex items-center gap-2"><MessageCircle className="w-5 h-5 text-leaf" />AI에게 추가로 물어보기</p>
      <p className="text-[13.5px] text-sub mt-1">용량·개수가 애매하면 물어보세요. 번호로 부를 수 있어요(예: "3번은 몇 g이에요?"). 답은 사진을 보고 한 <b>추정치</b>예요.</p>
      {!aiOn && <p className="mt-3 text-[13.5px] text-[#86600A]">AI가 연결되지 않아 질문할 수 없어요.</p>}
      <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={`rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed max-w-[90%] ${m.role === 'user' ? 'bg-basil text-paper' : 'bg-paper'}`}>
              {m.text}
              {m.role === 'ai' && m.updates && m.updates.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.updates.map((u, j) => {
                    const target = u.index != null ? rows[u.index - 1] : null
                    const done = m.applied?.includes(j)
                    return (
                      <div key={j} className="flex flex-wrap items-center gap-2 rounded-xl bg-card border border-line px-3 py-2 text-[13.5px]">
                        <Badge tone="sky">AI 추정</Badge>
                        <span className="flex-1 min-w-[160px]">
                          {u.index != null ? `${u.index}번 ${target?.name || u.name || '미확인'}` : `새 재료 ${u.name ?? ''}`}
                          {u.qty != null && u.unit ? ` → ${fmtQty(u.qty, u.unit)}` : ''}
                          {u.amount != null && u.amountUnit ? ` (${fmtQty(u.amount, u.amountUnit)})` : ''}
                          {u.amountText ? ` · ${u.amountText}` : ''}
                        </span>
                        <button type="button" disabled={done} className="btn btn-soft btn-sm" onClick={() => { onApply(u); setMsgs((all) => all.map((x, k) => (k === i ? { ...x, applied: [...(x.applied ?? []), j] } : x))) }}>{done ? '적용됨' : '이 값으로 적용'}</button>
                      </div>
                    )
                  })}
                  <p className="text-[12px] text-mute">적용한 뒤에도 수량을 직접 고칠 수 있어요.</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sub text-[13.5px] flex items-center gap-2"><Loader2 className="w-4 h-4 spin" />사진을 다시 보는 중</p>}
        <div ref={endRef} />
      </div>
      {err && <p className="mt-2 text-[13.5px] text-cherry">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {suggestions.map((s) => <button key={s} type="button" disabled={!aiOn || busy || !image} className="h-8 px-3 rounded-full border border-line-2 bg-white text-[13px] hover:border-leaf disabled:opacity-50" onClick={() => ask(s)}>{s}</button>)}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q) }}>
        <input className="field" placeholder="예: 이 김치통에 몇 g 정도 남았어요?" value={q} onChange={(e) => setQ(e.target.value)} disabled={!aiOn || !image} aria-label="AI에게 질문" />
        <button className="btn btn-primary !px-4" disabled={!aiOn || busy || !q.trim() || !image} aria-label="보내기"><Send className="w-4 h-4" /></button>
      </form>
      {msgs.length > 0 && <button type="button" className="mt-2 text-[12.5px] text-sub inline-flex items-center gap-1" onClick={() => setMsgs([])}><X className="w-3.5 h-3.5" />대화 지우기</button>}
    </div>
  )
}

/** AI 추가 질문 답변의 수정안을 행에 적용 */
export function applyAskUpdate(rows: ReviewRow[], u: AskUpdate): ReviewRow[] {
  if (u.index == null) {
    if (!u.name) return rows
    return [...rows, { ...manualRow(), name: u.name, qty: String(u.qty ?? 1), unit: u.unit ?? '개', qtySource: 'ai', amountText: u.amountText ?? '', confidence: 'medium', confirmed: false }]
  }
  return rows.map((r, i) => {
    if (i !== u.index! - 1) return r
    const p: Partial<ReviewRow> = { qtySource: 'ai' }
    if (u.name) { p.name = u.name; p.unknown = false; p.include = true }
    // 재고 단위로 쓸 수 있는 값을 우선 (용량 → 개수 순)
    const cid = resolveCatalog(u.name ?? r.name)
    if (u.amount != null && u.amountUnit && (!cid || toBase(cid, u.amount, u.amountUnit) != null)) { p.qty = String(u.amount); p.unit = u.amountUnit }
    else if (u.qty != null && u.unit) { p.qty = String(u.qty); p.unit = u.unit }
    if (u.amountText) p.amountText = u.amountText
    return { ...r, ...p }
  })
}
