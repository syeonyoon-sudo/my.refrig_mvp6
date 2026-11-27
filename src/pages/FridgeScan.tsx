import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Crop, ImageUp, Loader2, PenLine, Plus, RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import { useData } from '../store/AppStore'
import { InfoNote, PageHeader } from '../components/ui'
import { AISetup } from '../components/AISetup'
import { AskPanel, FridgeRowCard, PhotoCanvas, applyAskUpdate, manualRow, rowFromRecognized, rowsReady, type ReviewRow } from '../components/Recognition'
import { compressImage, cropImage } from '../lib/image'
import { aiFridge, aiIdentify, type Box } from '../lib/ai'
import { registerRecognized } from '../lib/actions'

export function ImagePicker({ onPick, label }: { onPick: (f: File) => void; label: string }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <label className="panel p-6 cursor-pointer hover:border-leaf flex flex-col items-center text-center gap-2">
        <Camera className="w-8 h-8 text-leaf" />
        <span className="title text-[16px]">카메라로 찍기</span>
        <span className="text-[13px] text-sub">휴대폰에서는 바로 카메라가 열려요</span>
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f) }} />
      </label>
      <label className="panel p-6 cursor-pointer hover:border-leaf flex flex-col items-center text-center gap-2">
        <ImageUp className="w-8 h-8 text-leaf" />
        <span className="title text-[16px]">{label}</span>
        <span className="text-[13px] text-sub">JPG·PNG·HEIC 사진</span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f) }} />
      </label>
    </div>
  )
}

type Img = { data: string; mediaType: string; dataUrl: string }

export default function FridgeScan() {
  const { data, update, toast, aiOn } = useData()
  const [img, setImg] = useState<Img | null>(null)
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [selectingFor, setSelectingFor] = useState<string | null>(null) // 행 key 또는 'new'
  const [done, setDone] = useState<{ added: number; merged: number } | null>(null)

  const pick = async (f: File) => {
    setErr(null); setRows(null); setDone(null); setSelected(null)
    try { setImg(await compressImage(f)) } catch (e) { setErr((e as Error).message) }
  }

  const analyze = async () => {
    if (!img) return
    setBusy('analyze'); setErr(null)
    try {
      const items = await aiFridge(img, hint.trim() || undefined)
      setRows(items.map(rowFromRecognized))
      if (!items.length) setErr('사진에서 식재료를 찾지 못했어요. 더 밝고 가깝게 다시 찍거나, 영역을 선택해서 다시 분석하거나, 직접 추가해 주세요.')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  const patch = (key: string, p: Partial<ReviewRow>) => setRows((rs) => (rs ?? []).map((r) => (r.key === key ? { ...r, ...p } : r)))

  // 사용자가 그린 영역을 잘라서 다시 분석
  const onSelectBox = async (box: Box) => {
    const target = selectingFor
    setSelectingFor(null)
    if (!img || !target) return
    setBusy(target); setErr(null)
    try {
      const crop = await cropImage(img.dataUrl, box)
      const r = await aiIdentify(crop)
      const known = !!r.name && !r.unknown && r.confidence !== 'low'
      const p: Partial<ReviewRow> = {
        box, candidates: Array.from(new Set([...(r.name && !known ? [r.name] : []), ...r.candidates])), reason: r.reason,
        packaging: r.packaging, amountText: r.amountText,
        ...(known ? { name: r.name!, unknown: false, include: true, confidence: r.confidence, confirmed: r.confidence === 'high', qty: String(r.qty), unit: r.unit, qtySource: 'ai' as const, category: r.category } : {}),
      }
      if (target === 'new') {
        const row: ReviewRow = { ...manualRow(), ...p, unknown: !known, include: known, name: known ? r.name! : '', qtySource: 'ai', confidence: known ? r.confidence : 'low', confirmed: r.confidence === 'high' }
        setRows((rs) => [...(rs ?? []), row]); setSelected(row.key)
        toast(known ? `${r.name}을(를) 찾았어요.` : '이 부분은 무엇인지 확실하지 않대요. 이름을 골라 주세요.', known ? 'ok' : 'warn')
      } else {
        patch(target, p)
        if (!known) toast('다시 봐도 확실하지 않대요. 후보 중에서 고르거나 직접 입력해 주세요.', 'warn')
      }
    } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  const manual = () => { setRows([...(rows ?? []), manualRow()]) }

  const register = () => {
    if (!rows) return
    const ready = rowsReady(rows)
    if (!ready.ok) return setErr(ready.msg!)
    const sel = rows.filter((r) => r.include)
    const r = registerRecognized(
      data,
      sel.map((x) => ({ name: x.name.trim(), qty: Number(x.qty), unit: x.unit, storage: x.storage, expiresAt: x.expiresAt || null, category: x.category, qtySource: x.qtySource, aiNote: [x.packaging, x.amountText].filter(Boolean).join(' · ') })),
      img ? 'photo' : 'manual',
    )
    update(() => r.data)
    setDone({ added: r.added, merged: r.merged })
    toast(`${sel.length}개 재료를 냉장고에 넣었어요.`)
    setRows(null); setImg(null); setErr(null)
  }

  const unknownCount = rows?.filter((r) => r.unknown).length ?? 0

  return (
    <div>
      <PageHeader title="냉장고 사진으로 등록" desc="사진 속 재료를 AI가 실제로 분석해요. 모르는 재료는 '미확인'으로 남겨 두고 직접 이름을 정하거나, 부분만 골라 다시 분석할 수 있어요." />
      <div className="space-y-5">
        {!aiOn && <AISetup feature="사진 인식" />}

        {done && (
          <div className="panel p-5 bg-pea/50 border-pea-2 flex flex-wrap items-center gap-3 max-w-3xl">
            <p className="flex-1 text-[15px]">새로 {done.added}개, 기존 재고에 {done.merged}개를 합쳤어요.</p>
            <Link to="/app/fridge" className="btn btn-primary btn-sm">냉장고 보기</Link>
            <Link to="/app/recommend" className="btn btn-line btn-sm">메뉴 추천 받기</Link>
          </div>
        )}

        {!img && !rows && (
          <div className="max-w-3xl space-y-3">
            {aiOn && <ImagePicker onPick={pick} label="앨범에서 고르기" />}
            <button className="btn btn-line" onClick={manual}><PenLine className="w-4 h-4" />사진 없이 직접 입력</button>
          </div>
        )}

        {img && !rows && (
          <div className="panel p-5 max-w-3xl">
            <PhotoCanvas src={img.dataUrl} rows={[]} selectedKey={null} selecting={false} onPick={() => {}} onSelectBox={() => {}} />
            <label className="block mt-4 text-[13.5px] font-semibold">참고 메모 <span className="font-normal text-mute">(선택) 예: 맨 아래 칸은 김치통이에요</span>
              <input className="field mt-1.5" value={hint} onChange={(e) => setHint(e.target.value)} />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={!aiOn || !!busy} onClick={analyze}>{busy ? <Loader2 className="w-4 h-4 spin" /> : <Sparkles className="w-4 h-4" />}{busy ? '사진 분석 중 (10~40초)' : 'AI로 재료 찾기'}</button>
              <button className="btn btn-line" onClick={manual}><PenLine className="w-4 h-4" />직접 입력</button>
              <button className="btn btn-ghost" onClick={() => setImg(null)}><RotateCcw className="w-4 h-4" />다른 사진</button>
            </div>
          </div>
        )}

        {err && <div className="max-w-3xl"><InfoNote tone="cherry">{err}</InfoNote></div>}

        {rows && (
          <div className={img ? 'grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 items-start' : 'max-w-3xl'}>
            {img && (
              <div className="space-y-4 lg:sticky lg:top-[84px]">
                <div className="panel p-4">
                  <PhotoCanvas src={img.dataUrl} rows={rows} selectedKey={selected} selecting={!!selectingFor} onPick={setSelected} onSelectBox={onSelectBox} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectingFor ? (
                      <button className="btn btn-line btn-sm" onClick={() => setSelectingFor(null)}>영역 선택 취소</button>
                    ) : (
                      <button className="btn btn-soft btn-sm" disabled={!aiOn || !!busy} onClick={() => setSelectingFor('new')}><Crop className="w-4 h-4" />놓친 재료: 영역 선택해서 분석</button>
                    )}
                    <button className="btn btn-ghost btn-sm" disabled={!aiOn || !!busy} onClick={analyze}><RefreshCw className="w-4 h-4" />사진 전체 다시 분석</button>
                  </div>
                  {busy && <p className="mt-2 text-[13px] text-sub flex items-center gap-2"><Loader2 className="w-4 h-4 spin" />AI가 다시 보는 중</p>}
                  <p className="mt-2 text-[12.5px] text-mute">번호는 아래 목록과 같아요. 빨간 점선(?)은 미확인 재료예요.</p>
                </div>
                <AskPanel image={img} rows={rows} onApply={(u) => { setRows((rs) => applyAskUpdate(rs ?? [], u)); toast('AI 추정치를 적용했어요. 필요하면 직접 고쳐 주세요.') }} />
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 className="title text-[18px]">인식 결과 {rows.length}개{unknownCount > 0 && <span className="text-cherry text-[15px]"> · 미확인 {unknownCount}개</span>}</h2>
                <span className="text-[13px] text-sub">확인하고 고친 것만 냉장고에 들어가요</span>
              </div>
              <ul className="space-y-3">
                {rows.map((r, i) => (
                  <FridgeRowCard key={r.key} row={r} index={i} selected={selected === r.key} image={img} aiOn={aiOn}
                    onFocus={() => setSelected(r.key)} onChange={(p) => patch(r.key, p)} onRemove={() => setRows((rs) => (rs ?? []).filter((x) => x.key !== r.key))}
                    onSelectArea={() => { setSelected(r.key); setSelectingFor(r.key); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
                ))}
              </ul>
              <button className="btn btn-line btn-sm mt-3" onClick={manual}><Plus className="w-4 h-4" />직접 한 줄 추가</button>
              <div className="mt-6 flex flex-wrap gap-2 items-center">
                <button className="btn btn-primary btn-lg" onClick={register}>선택한 {rows.filter((r) => r.include).length}개 냉장고에 넣기</button>
                <button className="btn btn-ghost btn-lg" onClick={() => { setRows(null); setErr(null) }}>취소</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
