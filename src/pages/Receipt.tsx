import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Crop, Loader2, PenLine, Plus, RefreshCw, RotateCcw, ScanText, Trash2, HelpCircle } from 'lucide-react'
import { useData } from '../store/AppStore'
import { Badge, InfoNote, Label, PageHeader, SectionTitle } from '../components/ui'
import { AISetup } from '../components/AISetup'
import { PhotoCanvas, manualRow, namedPatch, rowFromRecognized, rowsReady, type ReviewRow } from '../components/Recognition'
import { ImagePicker } from './FridgeScan'
import { compressImage, cropImage } from '../lib/image'
import { aiReceipt, type Box } from '../lib/ai'
import { registerRecognized } from '../lib/actions'
import { CATALOG_MAP, INGREDIENTS, STORAGE_LABEL } from '../lib/catalog'
import { resolveCatalog } from '../lib/match'
import { toBase, unitOptions } from '../lib/units'
import type { StorageType } from '../lib/types'
import { fmtDate, today, won } from '../lib/util'

type Img = { data: string; mediaType: string; dataUrl: string }

export default function Receipt() {
  const { data, update, toast, aiOn } = useData()
  const [img, setImg] = useState<Img | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [store, setStore] = useState('')
  const [total, setTotal] = useState('')
  const [date, setDate] = useState(today())
  const [dateRead, setDateRead] = useState<boolean | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [usedAI, setUsedAI] = useState(false)

  const pick = async (f: File) => {
    setErr(null); setRows(null); setDone(null)
    try { setImg(await compressImage(f, 1600, 0.88)) } catch (e) { setErr((e as Error).message) }
  }

  const runOCR = async () => {
    if (!img) return
    setBusy('ocr'); setErr(null)
    try {
      const r = await aiReceipt(img)
      setStore(r.store); setTotal(r.total != null ? String(r.total) : '')
      if (r.date) { setDate(r.date); setDateRead(true) } else { setDate(today()); setDateRead(false) }
      setRows(r.items.map((x) => ({ ...rowFromRecognized(x), box: null })))
      setUsedAI(true)
      if (!r.items.length) setErr('영수증에서 품목을 읽지 못했어요. 영수증 전체가 평평하고 밝게 나오도록 다시 찍거나, 영역을 골라 다시 읽거나, 직접 입력해 주세요.')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  const readArea = async (box: Box) => {
    setSelecting(false)
    if (!img) return
    setBusy('area'); setErr(null)
    try {
      const crop = await cropImage(img.dataUrl, box, 1600)
      const r = await aiReceipt(crop, true)
      if (!r.items.length) { toast('고른 부분에서 품목을 읽지 못했어요.', 'warn'); return }
      setRows((rs) => [...(rs ?? []), ...r.items.map((x) => ({ ...rowFromRecognized(x), box: null }))])
      toast(`${r.items.length}개 줄을 추가로 읽었어요. 중복된 줄은 지워 주세요.`)
      setUsedAI(true)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  const patch = (key: string, p: Partial<ReviewRow>) => setRows((rs) => (rs ?? []).map((r) => (r.key === key ? { ...r, ...p } : r)))
  const manual = () => setRows([...(rows ?? []), { ...manualRow(), price: '' }])

  const register = () => {
    if (!rows) return
    const ready = rowsReady(rows)
    if (!ready.ok) return setErr(ready.msg!)
    const sel = rows.filter((r) => r.include)
    const r = registerRecognized(
      data,
      sel.map((x) => ({ name: x.name.trim(), qty: Number(x.qty), unit: x.unit, storage: x.storage, expiresAt: x.expiresAt || null, price: x.price ? Number(x.price) : null, category: x.category, qtySource: 'user' })),
      'receipt',
      { store: store.trim() || '이름 없는 가게', total: total ? Number(total) : null, mode: usedAI ? 'ai' : 'manual', date },
    )
    update(() => r.data)
    setDone(`새로 ${r.added}개, 기존 재고에 ${r.merged}개를 합쳤어요. 구매 내역(${fmtDate(date)})에도 저장했어요.`)
    toast('영수증 품목을 등록했어요.')
    setRows(null); setImg(null); setErr(null)
  }

  const sum = rows?.filter((r) => r.include && r.price).reduce((s, r) => s + Number(r.price), 0) ?? 0
  const unknownCount = rows?.filter((r) => r.unknown).length ?? 0

  return (
    <div>
      <PageHeader title="영수증으로 등록" desc="영수증 글자를 AI가 실제로 읽어 상품명·수량·가격·구매일을 표로 만들어요. 읽지 못한 상품은 '상품명 미확인'으로 남겨 두니 직접 고쳐 주세요." />
      <div className="space-y-5">
        {!aiOn && <AISetup feature="영수증 인식" />}
        {done && (
          <div className="panel p-5 bg-pea/50 border-pea-2 flex flex-wrap items-center gap-3 max-w-3xl">
            <p className="flex-1 text-[15px]">{done}</p>
            <Link to="/app/fridge" className="btn btn-primary btn-sm">냉장고 보기</Link>
          </div>
        )}
        {!img && !rows && (
          <div className="max-w-3xl space-y-3">
            {aiOn && <ImagePicker onPick={pick} label="영수증 사진 고르기" />}
            <button className="btn btn-line" onClick={manual}><PenLine className="w-4 h-4" />영수증 없이 직접 입력</button>
          </div>
        )}

        {img && !rows && (
          <div className="panel p-5 max-w-3xl">
            <PhotoCanvas src={img.dataUrl} rows={[]} selectedKey={null} selecting={false} onPick={() => {}} onSelectBox={() => {}} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={!aiOn || !!busy} onClick={runOCR}>{busy ? <Loader2 className="w-4 h-4 spin" /> : <ScanText className="w-4 h-4" />}{busy ? '영수증 읽는 중 (10~40초)' : 'AI로 영수증 읽기'}</button>
              <button className="btn btn-line" onClick={manual}><PenLine className="w-4 h-4" />직접 입력</button>
              <button className="btn btn-ghost" onClick={() => setImg(null)}><RotateCcw className="w-4 h-4" />다른 사진</button>
            </div>
          </div>
        )}

        {err && <div className="max-w-3xl"><InfoNote tone="cherry">{err}</InfoNote></div>}

        {rows && (
          <div className={img ? 'grid xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)] gap-6 items-start' : ''}>
            {img && (
              <div className="panel p-4 xl:sticky xl:top-[84px]">
                <PhotoCanvas src={img.dataUrl} rows={[]} selectedKey={null} selecting={selecting} onPick={() => {}} onSelectBox={readArea} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn btn-soft btn-sm" disabled={!aiOn || !!busy} onClick={runOCR}><RefreshCw className="w-4 h-4" />다시 OCR 실행</button>
                  {selecting
                    ? <button className="btn btn-line btn-sm" onClick={() => setSelecting(false)}>영역 선택 취소</button>
                    : <button className="btn btn-line btn-sm" disabled={!aiOn || !!busy} onClick={() => setSelecting(true)}><Crop className="w-4 h-4" />빠진 줄: 영역 골라 다시 읽기</button>}
                </div>
                {busy && <p className="mt-2 text-[13px] text-sub flex items-center gap-2"><Loader2 className="w-4 h-4 spin" />영수증 읽는 중</p>}
                <p className="mt-2 text-[12.5px] text-mute">"다시 OCR 실행"은 지금 표를 새 결과로 바꿔요. 직접 고친 내용이 있으면 영역 다시 읽기를 쓰세요.</p>
              </div>
            )}

            <div className="min-w-0">
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <div><Label htmlFor="store">가게 이름</Label><input id="store" className="field" value={store} onChange={(e) => setStore(e.target.value)} placeholder="예: OO마트" /></div>
                <div>
                  <Label htmlFor="date">구매일</Label><input id="date" type="date" className="field" value={date} max={today()} onChange={(e) => { setDate(e.target.value); setDateRead(null) }} />
                  {dateRead === false && <p className="mt-1 text-[12px] text-[#86600A]">영수증에서 날짜를 읽지 못해 오늘로 넣었어요.</p>}
                  {dateRead === true && <p className="mt-1 text-[12px] text-leaf">영수증에서 읽은 날짜예요.</p>}
                </div>
                <div><Label htmlFor="total" hint="영수증 합계">총액(원)</Label><input id="total" className="field num" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, ''))} /></div>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h2 className="title text-[18px]">인식 결과 {rows.length}줄{unknownCount > 0 && <span className="text-cherry text-[15px]"> · 상품명 미확인 {unknownCount}</span>}</h2>
                <span className="text-[13px] text-sub">유통기한은 영수증에 없어서 비워 둬요</span>
              </div>
              <div className="panel overflow-hidden">
                <ul className="divide-y divide-line">
                  {rows.map((r) => <ReceiptRow key={r.key} row={r} onChange={(p) => patch(r.key, p)} onRemove={() => setRows((rs) => (rs ?? []).filter((x) => x.key !== r.key))} />)}
                </ul>
              </div>
              <datalist id="rc-ing">{INGREDIENTS.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              <button className="btn btn-line btn-sm mt-3" onClick={manual}><Plus className="w-4 h-4" />직접 한 줄 추가</button>
              <p className="mt-4 text-[14px]">선택한 품목 합계 <b className="num">{won(sum)}</b>{total && Number(total) !== sum && <span className="text-sub"> · 영수증 총액 {won(Number(total))}과 차이 {won(Math.abs(Number(total) - sum))} (생활용품·할인 등)</span>}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="btn btn-primary btn-lg" onClick={register}>선택한 {rows.filter((r) => r.include).length}개 등록</button>
                <button className="btn btn-ghost btn-lg" onClick={() => { setRows(null); setErr(null) }}>취소</button>
              </div>
            </div>
          </div>
        )}

        {data.receipts.length > 0 && (
          <section className="pt-4 max-w-3xl">
            <SectionTitle>영수증 기록</SectionTitle>
            <ul className="panel divide-y divide-line">
              {data.receipts.slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-[14px]">
                  <span className="text-sub w-16">{fmtDate(r.date)}</span>
                  <span className="flex-1 font-semibold truncate">{r.store}</span>
                  {r.mode === 'ai' ? <Badge tone="sky">AI 인식</Badge> : r.mode === 'manual' ? <Badge tone="line">직접 입력</Badge> : <Badge tone="yolk">예전 예시</Badge>}
                  <span className="text-sub">{r.itemCount}품목</span>
                  <span className="num w-24 text-right">{r.total != null ? won(r.total) : '-'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

function ReceiptRow({ row, onChange, onRemove }: { row: ReviewRow; onChange: (p: Partial<ReviewRow>) => void; onRemove: () => void }) {
  const cid = resolveCatalog(row.name)
  const c = cid ? CATALOG_MAP[cid] : null
  const units = Array.from(new Set([...unitOptions(cid), '개', 'g', 'ml', '봉', '팩']))
  const badUnit = c && toBase(cid, 1, row.unit) == null
  const needsCheck = !row.unknown && row.confidence !== 'high' && !row.confirmed
  return (
    <li className={`px-4 py-3 ${!row.include ? 'bg-paper/50' : ''}`}>
      <div className="grid grid-cols-[28px_1fr_28px] gap-x-2 gap-y-2 items-start">
        <input type="checkbox" aria-label="등록" className="w-5 h-5 mt-2.5 accent-[#1F4A35]" checked={row.include} onChange={(e) => onChange({ include: e.target.checked })} />
        <div className="min-w-0">
          {row.raw && <p className="text-[12px] text-sub truncate" title={row.raw}>영수증 표기: {row.raw}</p>}
          {row.unknown && <p className="text-[12.5px] font-semibold text-cherry flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" />상품명 미확인 — 이 상품은 무엇인가요?</p>}
          <input className={`field !h-10 ${row.unknown ? '!border-cherry bg-cherry-soft/30' : ''}`} list="rc-ing" value={row.name} placeholder="이 상품은 무엇인가요? (직접 입력)"
            onChange={(e) => onChange({ ...(row.amount != null || row.unknown ? namedPatch(row, e.target.value) : { name: e.target.value }), unknown: !e.target.value.trim(), confirmed: true, include: e.target.value.trim() ? (row.isFood ? true : row.include) : false })} aria-label="상품명" />
          <div className="flex flex-wrap gap-x-3 mt-0.5">
            {c && !row.unknown && <p className="text-[12px] text-sub">{c.emoji} {c.name}(으)로 재고 계산</p>}
            {needsCheck && <p className="text-[12px] text-[#86600A]">AI가 확실하지 않대요. <button className="underline font-semibold" onClick={() => onChange({ confirmed: true })}>맞아요</button></p>}
          </div>
        </div>
        <button className="text-mute hover:text-cherry p-1 mt-1.5" aria-label="이 줄 삭제" onClick={onRemove}><Trash2 className="w-4 h-4" /></button>
        <div className="col-start-2 grid grid-cols-2 sm:grid-cols-[1.3fr_1fr_.9fr_.8fr_1.2fr] gap-2">
          <label className="text-[11.5px] text-sub">수량·단위
            <div className="flex gap-1 mt-0.5">
              <input className="field !h-10 num !px-2 min-w-0" inputMode="decimal" value={row.qty} onChange={(e) => onChange({ qty: e.target.value, amount: null })} aria-label="수량" />
              <select className={`field !h-10 !w-[74px] !pl-2 shrink-0 ${badUnit ? '!border-cherry' : ''}`} value={row.unit} onChange={(e) => onChange({ unit: e.target.value, amount: null })} aria-label="단위">{units.map((u) => <option key={u}>{u}</option>)}</select>
            </div>
          </label>
          <label className="text-[11.5px] text-sub">가격(원)<input className="field !h-10 num mt-0.5" inputMode="numeric" placeholder="가격" value={row.price} onChange={(e) => onChange({ price: e.target.value.replace(/[^0-9]/g, '') })} aria-label="가격" /></label>
          <label className="text-[11.5px] text-sub">식재료 여부
            <button type="button" className={`mt-0.5 w-full h-10 rounded-xl text-[13px] font-semibold border ${row.isFood ? 'bg-pea text-basil border-pea-2' : 'bg-white text-sub border-line-2'}`} onClick={() => onChange({ isFood: !row.isFood, include: !row.isFood && !row.unknown })} aria-pressed={row.isFood}>{row.isFood ? '식재료' : '식재료 아님'}</button>
          </label>
          <label className="text-[11.5px] text-sub">보관<select className="field !h-10 mt-0.5" value={row.storage} onChange={(e) => onChange({ storage: e.target.value as StorageType })} aria-label="보관 장소">{(['fridge', 'freezer', 'room'] as StorageType[]).map((s) => <option key={s} value={s}>{STORAGE_LABEL[s]}</option>)}</select></label>
          <label className="text-[11.5px] text-sub col-span-2 sm:col-span-1">유통기한(포장지 보고)<input type="date" className="field !h-10 mt-0.5" value={row.expiresAt} onChange={(e) => onChange({ expiresAt: e.target.value })} aria-label="유통기한" /></label>
        </div>
      </div>
      {badUnit && <p className="ml-9 mt-1 text-[12px] text-cherry">{c?.name}은(는) {row.unit} 단위로 재고 계산을 할 수 없어요. {c?.unit} 등으로 바꿔 주세요.</p>}
    </li>
  )
}
