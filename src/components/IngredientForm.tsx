import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ImagePlus, Trash2 } from 'lucide-react'
import { Modal, Label, Segmented, InfoNote, FreshRing } from './ui'
import { CATALOG_MAP, CATEGORY_LABEL, CATEGORY_EMOJI, CATEGORY_TINT, INGREDIENTS, STORAGE_LABEL } from '../lib/catalog'
import { resolveCatalog } from '../lib/match'
import { fromBase, unitOptions } from '../lib/units'
import { findMergeTarget, type NewItem } from '../lib/inventory'
import type { Category, InventoryItem, StorageType } from '../lib/types'
import { addDays, today } from '../lib/util'
import { thumbnail } from '../lib/image'
import { useData } from '../store/AppStore'

interface Props {
  open: boolean
  onClose: () => void
  initial?: InventoryItem | null
  onSave: (item: NewItem, id?: string) => void
}

const CATS = Object.keys(CATEGORY_LABEL) as Category[]

export function IngredientForm({ open, onClose, initial, onSave }: Props) {
  const { data, toast } = useData()
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState('개')
  const [category, setCategory] = useState<Category>('etc')
  const [storage, setStorage] = useState<StorageType>('fridge')
  const [purchasedAt, setPurchasedAt] = useState(today())
  const [expiresAt, setExpiresAt] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [qtySource, setQtySource] = useState<'user' | 'ai' | 'unknown'>('user')
  const [err, setErr] = useState<string | null>(null)
  const [estimated, setEstimated] = useState(false)
  const [more, setMore] = useState(false)

  useEffect(() => {
    if (!open) return
    setErr(null)
    if (initial) {
      setName(initial.name); setQty(String(initial.qty)); setUnit(initial.unit); setCategory(initial.category); setStorage(initial.storage)
      setPurchasedAt(initial.purchasedAt ?? ''); setExpiresAt(initial.expiresAt ?? ''); setImage(initial.image); setMemo(initial.memo); setQtySource(initial.qtySource ?? 'user')
      setEstimated(!!initial.expiryEstimated); setMore(false)
    } else {
      setName(''); setQty('1'); setUnit('개'); setCategory('etc'); setStorage('fridge'); setPurchasedAt(today()); setExpiresAt(''); setImage(null); setMemo(''); setQtySource('user')
      setEstimated(false); setMore(false)
    }
  }, [open, initial])

  const cid = useMemo(() => resolveCatalog(name), [name])
  const cat = cid ? CATALOG_MAP[cid] : null
  const units = unitOptions(cid)

  // 재료 이름이 정해지면 단위·분류·보관 장소 기본값 채우기 (새 등록일 때만)
  useEffect(() => {
    if (initial || !cat) return
    setUnit(cat.unit); setCategory(cat.category); setStorage(cat.storage); setQty(String(cat.pack.size))
  }, [cat, initial])
  useEffect(() => { if (!units.includes(unit)) setUnit(units[0]) }, [units, unit])

  const shelf = cat?.shelf?.[storage]
  const showMore = more || (!!name.trim() && !cat)
  const merge = !initial && name.trim() ? findMergeTarget(data.inventory, { name, catalogId: cid, expiresAt: expiresAt || null, storage, unit, qty: Number(qty) }) : null

  const pickImage = async (f: File | undefined) => {
    if (!f) return
    try { setImage(await thumbnail(f)) } catch (e) { toast((e as Error).message, 'error') }
  }

  const submit = () => {
    const q = Number(qty)
    if (!name.trim()) return setErr('식재료 이름을 입력해 주세요.')
    if (!isFinite(q) || q <= 0) return setErr('수량은 0보다 큰 숫자로 입력해 주세요.')
    onSave({
      name: name.trim(), catalogId: cid, qty: q, unit, category, storage, purchasedAt: purchasedAt || null, expiresAt: expiresAt || null,
      image, memo: memo.trim(), source: initial?.source ?? 'manual', spoiled: initial?.spoiled, favorite: initial?.favorite, qtySource, aiNote: initial?.aiNote,
      expiryEstimated: !!expiresAt && estimated,
    }, initial?.id)
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? '식재료 수정' : '식재료 직접 등록'} wide
      footer={<><button className="btn btn-line" onClick={onClose}>취소</button><button className="btn btn-primary" onClick={submit}>{initial ? '저장' : merge ? '기존 재고에 합치기' : '냉장고에 넣기'}</button></>}>
      <div className="space-y-5">
        <div className="flex gap-4 items-center">
          <label className="relative cursor-pointer group" title="사진 추가">
            <FreshRing emoji={cat?.emoji ?? CATEGORY_EMOJI[category]} image={image} expiresAt={expiresAt || null} size={76} tint={CATEGORY_TINT[category]} />
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-basil text-paper grid place-items-center shadow"><ImagePlus className="w-3.5 h-3.5" /></span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickImage(e.target.files?.[0])} />
          </label>
          <div className="flex-1 min-w-0">
            <Label htmlFor="ing-name" hint={cat ? `→ ${cat.name}(으)로 인식` : name ? '레시피 DB에 없는 재료예요' : undefined}>식재료 이름</Label>
            <input id="ing-name" className="field" list="ing-list" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 두부, 계란, 대파" autoFocus />
            <datalist id="ing-list">{INGREDIENTS.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            {image && <button className="mt-1.5 text-[12.5px] text-sub inline-flex items-center gap-1" onClick={() => setImage(null)}><Trash2 className="w-3.5 h-3.5" />사진 지우기</button>}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <Label htmlFor="ing-qty" hint={qtySource === 'ai' ? 'AI 추정치' : qtySource === 'unknown' ? '대략' : undefined}>수량·용량</Label>
            <div className="flex gap-1.5">
              <button type="button" className="btn btn-line !px-3" aria-label="줄이기" onClick={() => { setQty(String(Math.max(0, +(Number(qty) - (unit === 'g' || unit === 'ml' ? 50 : 1)).toFixed(3)))); setQtySource('user') }}>−</button>
              <input id="ing-qty" className="field num text-center" inputMode="decimal" value={qty} onChange={(e) => { setQty(e.target.value); setQtySource('user') }} />
              <button type="button" className="btn btn-line !px-3" aria-label="늘리기" onClick={() => { setQty(String(+(Number(qty) + (unit === 'g' || unit === 'ml' ? 50 : 1)).toFixed(3))); setQtySource('user') }}>+</button>
            </div>
          </div>
          <div><Label htmlFor="ing-unit">단위</Label>
            <select id="ing-unit" className="field" value={unit} onChange={(e) => setUnit(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select>
          </div>
        </div>
        <div className="-mt-2 flex flex-wrap items-center gap-1.5">
          <label className="inline-flex items-center gap-1.5 text-[13px] text-sub mr-1 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[#1F4A35]" checked={qtySource === 'unknown'} onChange={(e) => setQtySource(e.target.checked ? 'unknown' : 'user')} />정확한 용량을 모르겠어요
          </label>
          {cat && (
            <>
              <span className="text-[12.5px] text-mute">대략:</span>
              {[['가득', 1], ['절반', 0.5], ['¼', 0.25], ['조금', 0.1]].map(([l, f]) => (
                <button key={l} type="button" className="h-7 px-2.5 rounded-full border border-line-2 text-[12.5px] bg-white hover:border-leaf"
                  onClick={() => { const v = (fromBase(cid, cat.pack.size, unit) ?? cat.pack.size) * (f as number); setQty(String(+v.toFixed(unit === 'g' || unit === 'ml' ? 0 : 2))); setQtySource('unknown') }}>{l}</button>
              ))}
              <span className="text-[11.5px] text-mute">({cat.pack.label} 기준)</span>
            </>
          )}
        </div>

        <div>
          <Label htmlFor="ing-exp" hint={estimated ? '일반 보관 기간으로 추정' : '포장지 날짜'}>유통·소비기한</Label>
          <input id="ing-exp" type="date" className="field" value={expiresAt} onChange={(e) => { setExpiresAt(e.target.value); setEstimated(false) }} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[['오늘', 0], ['3일', 3], ['1주', 7], ['2주', 14]].map(([l, n]) => (
              <button key={l} type="button" className="h-8 px-3 rounded-full border border-line-2 bg-white text-[13px] hover:border-leaf" onClick={() => { setExpiresAt(addDays(today(), n as number)); setEstimated(false) }}>{l}</button>
            ))}
            {shelf && (
              <button type="button" className="h-8 px-3 rounded-full bg-pea text-basil text-[13px] font-semibold" onClick={() => { setExpiresAt(addDays(purchasedAt || today(), shelf)); setEstimated(true) }}>
                날짜 모름 · {STORAGE_LABEL[storage]} 약 {shelf}일
              </button>
            )}
            {expiresAt && <button type="button" className="h-8 px-2 text-[13px] text-sub underline" onClick={() => { setExpiresAt(''); setEstimated(false) }}>비우기</button>}
          </div>
        </div>

        <div>
          <Label>보관 장소</Label>
          <Segmented value={storage} onChange={setStorage} options={(['fridge', 'freezer', 'room'] as StorageType[]).map((s) => ({ value: s, label: STORAGE_LABEL[s] }))} />
        </div>

        <button type="button" className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-sub hover:text-ink" aria-expanded={showMore} onClick={() => setMore((v) => !v)}>
          <ChevronDown className={`w-4 h-4 transition ${showMore ? 'rotate-180' : ''}`} />구매일·분류·메모 (선택)
        </button>
        {showMore && (
          <div className="space-y-5 fade-in">
            <div className="sm:w-1/2"><Label htmlFor="ing-buy">구매일</Label><input id="ing-buy" type="date" className="field" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} /></div>
            <div>
              <Label>분류</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATS.map((c) => <button key={c} type="button" className="chip !h-8 !text-[13px]" aria-pressed={category === c} onClick={() => setCategory(c)}>{CATEGORY_LABEL[c]}</button>)}
              </div>
            </div>
            <div><Label htmlFor="ing-memo">메모</Label><textarea id="ing-memo" className="field" rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 개봉함, 반찬통 왼쪽" /></div>
          </div>
        )}

        {merge && <InfoNote>같은 재료·같은 기한·같은 보관 장소의 <b>{merge.name}</b>이(가) 이미 있어서 수량이 합쳐져요. 기한이 다르면 따로 보관돼요.</InfoNote>}
        {err && <p role="alert" className="text-[14px] text-cherry">{err}</p>}
      </div>
    </Modal>
  )
}
