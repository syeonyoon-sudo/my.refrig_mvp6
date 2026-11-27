import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, Minus, MoreHorizontal, Plus, Receipt, Search, Star, Trash2, PenLine, AlertOctagon, BookOpen, ShoppingBasket, ListChecks, ChefHat } from 'lucide-react'
import { useData } from '../store/AppStore'
import { IngredientForm } from '../components/IngredientForm'
import { QuickAdd } from '../components/QuickAdd'
import { Badge, Empty, ExpiryBadge, FreshRing, InfoNote, Modal, PageHeader, RemainBar, Segmented } from '../components/ui'
import { CATALOG_MAP, CATEGORY_EMOJI, CATEGORY_LABEL, CATEGORY_TINT, CATEGORY_TIP, STORAGE_LABEL } from '../lib/catalog'
import { addItem, adjustQty, deleteItem, discardItem, updateItem } from '../lib/actions'
import { expiryInfo } from '../lib/expiry'
import { isLowStock, itemCatalogId } from '../lib/inventory'
import { norm } from '../lib/match'
import { addManual } from '../lib/shopping'
import type { Category, InventoryItem, StorageType } from '../lib/types'
import { fmtQty } from '../lib/units'
import { fmtDate, won } from '../lib/util'

type Sort = 'expiry' | 'recent' | 'name'
const SOURCE_LABEL: Record<InventoryItem['source'], string> = { manual: '직접', photo: '사진 AI', receipt: '영수증', shopping: '장보기', sample: '예시' }

function stepFor(it: InventoryItem): number {
  if (it.unit === 'g' || it.unit === 'ml') return it.qty >= 200 ? 50 : 10
  if (['모', '대', '송이', '통'].includes(it.unit)) return 0.25
  return 1
}

export default function Fridge() {
  const { data, update, toast } = useData()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [storage, setStorage] = useState<'all' | StorageType>('all')
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [sort, setSort] = useState<Sort>('expiry')
  const [onlyUrgent, setOnlyUrgent] = useState(false)
  const [form, setForm] = useState<{ open: boolean; item: InventoryItem | null }>({ open: false, item: null })
  const [detail, setDetail] = useState<InventoryItem | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [quick, setQuick] = useState(false)

  useEffect(() => {
    if (params.get('add')) { setForm({ open: true, item: null }); params.delete('add'); setParams(params, { replace: true }) }
    if (params.get('quick')) { setQuick(true); params.delete('quick'); setParams(params, { replace: true }) }
  }, [params, setParams])
  useEffect(() => {
    const h = () => setMenuFor(null)
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])

  const cats = useMemo(() => Array.from(new Set(data.inventory.map((i) => i.category))), [data.inventory])
  const list = useMemo(() => {
    let l = data.inventory.slice()
    if (q.trim()) l = l.filter((i) => norm(i.name).includes(norm(q)) || norm(i.memo).includes(norm(q)))
    if (cat !== 'all') l = l.filter((i) => i.category === cat)
    if (onlyUrgent) l = l.filter((i) => { const e = expiryInfo(i.expiresAt); return i.spoiled || ['expired', 'today', 'soon'].includes(e.level) })
    l.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'ko')
      if (sort === 'recent') return b.createdAt.localeCompare(a.createdAt)
      const da = a.spoiled ? -999 : expiryInfo(a.expiresAt).days ?? 9999
      const db = b.spoiled ? -999 : expiryInfo(b.expiresAt).days ?? 9999
      return da - db
    })
    return l
  }, [data.inventory, q, cat, sort, onlyUrgent])

  const groups: StorageType[] = storage === 'all' ? ['fridge', 'freezer', 'room'] : [storage]

  const save = (item: Omit<InventoryItem, 'id' | 'createdAt'>, id?: string) => {
    if (id) { update((d) => updateItem(d, id, { ...item, catalogId: itemCatalogId(item) })); toast('수정했어요.') }
    else {
      const r = addItem(data, item)
      update(() => r.data)
      toast(r.merged ? `기존 ${item.name}에 수량을 합쳤어요.` : `${item.name}을(를) 냉장고에 넣었어요.`)
    }
    setForm({ open: false, item: null })
  }

  const discard = (it: InventoryItem) => {
    const before = data
    update((d) => discardItem(d, it.id))
    toast(`${it.name}을(를) 버린 것으로 기록했어요.`, 'ok', { label: '되돌리기', run: () => update(() => before) })
  }
  const remove = (it: InventoryItem) => {
    const before = data
    update((d) => deleteItem(d, it.id))
    toast(`${it.name}을(를) 목록에서 지웠어요.`, 'ok', { label: '되돌리기', run: () => update(() => before) })
  }

  return (
    <div>
      <PageHeader
        title="냉장고 관리"
        desc="링이 초록 → 노랑 → 빨강으로 바뀔수록 기한이 가까워요."
        actions={<>
          <button className="btn btn-primary" onClick={() => setQuick(true)}><ListChecks className="w-4 h-4" />빠르게 추가</button>
          <button className="btn btn-line" onClick={() => setForm({ open: true, item: null })}><Plus className="w-4 h-4" />직접</button>
          <Link to="/app/fridge/scan" className="btn btn-line"><Camera className="w-4 h-4" />사진</Link>
          <Link to="/app/fridge/receipt" className="btn btn-line"><Receipt className="w-4 h-4" />영수증</Link>
        </>}
      />

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
            <input className="field !pl-10" placeholder="재료 이름·메모 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="검색" />
          </div>
          <Segmented size="sm" value={storage} onChange={setStorage} options={[{ value: 'all', label: '전체' }, { value: 'fridge', label: '냉장' }, { value: 'freezer', label: '냉동' }, { value: 'room', label: '실온' }]} />
          <select className="field !h-9 !w-auto !text-[13.5px]" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
            <option value="expiry">유통기한 임박순</option><option value="recent">최근 등록순</option><option value="name">이름순</option>
          </select>
        </div>
        <div className="scroll-x flex gap-1.5">
          <button className="chip !h-8 !text-[13px] shrink-0" aria-pressed={onlyUrgent} onClick={() => setOnlyUrgent((v) => !v)}>⚠️ 임박·지남만</button>
          <button className="chip !h-8 !text-[13px] shrink-0" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>모든 분류</button>
          {cats.map((c) => <button key={c} className="chip !h-8 !text-[13px] shrink-0" aria-pressed={cat === c} onClick={() => setCat(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</button>)}
        </div>
      </div>

      {data.inventory.length === 0 ? (
        <div className="panel"><Empty emoji="🧊" title="냉장고가 비어 있어요" desc="재료를 넣으면 기한을 대신 챙기고 메뉴를 추천해 드려요." action={<><button className="btn btn-primary" onClick={() => setQuick(true)}><ListChecks className="w-4 h-4" />자주 쓰는 재료 체크하기</button><Link to="/app/fridge/scan" className="btn btn-line">사진으로 등록</Link></>} /></div>
      ) : list.length === 0 ? (
        <div className="panel"><Empty emoji="🔍" title="조건에 맞는 재료가 없어요" desc="검색어나 필터를 바꿔 보세요." /></div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => {
            const items = list.filter((i) => i.storage === g)
            if (!items.length) return null
            return (
              <section key={g}>
                <h2 className="title text-[17px] mb-3">{STORAGE_LABEL[g]} <span className="text-sub font-semibold num">{items.length}</span></h2>
                <ul className="panel divide-y divide-line">
                  {items.map((it) => {
                    const c = it.catalogId ? CATALOG_MAP[it.catalogId] : null
                    const low = isLowStock(it)
                    return (
                      <li key={it.id} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 sm:gap-4 px-4 sm:px-5 py-3.5">
                        <button onClick={() => setDetail(it)} aria-label={`${it.name} 보관 방법·이력 보기`}>
                          <FreshRing emoji={c?.emoji ?? CATEGORY_EMOJI[it.category]} image={it.image} expiresAt={it.expiresAt} spoiled={it.spoiled} size={52} tint={CATEGORY_TINT[it.category]} />
                        </button>
                        <div className="flex-1 min-w-[calc(100%-68px)] sm:min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button className="font-bold text-[15.5px] text-left hover:underline underline-offset-4" onClick={() => setDetail(it)}>{it.name}</button>
                            {it.favorite && <Star className="w-3.5 h-3.5 fill-yolk text-yolk" />}
                            <ExpiryBadge expiresAt={it.expiresAt} spoiled={it.spoiled} />
                            {low && <Badge tone="sky">재고 부족</Badge>}
                            {it.source !== 'manual' && <Badge tone="line">{SOURCE_LABEL[it.source]}</Badge>}
                            {it.qtySource === 'ai' && <Badge tone="sky">양 AI 추정</Badge>}
                            {it.qtySource === 'unknown' && <Badge tone="yolk">양 대략</Badge>}
                            {it.expiryEstimated && <Badge tone="line">기한 추정</Badge>}
                          </div>
                          <p className="text-[12.5px] text-sub mt-0.5 truncate">
                            {it.expiresAt ? `기한 ${fmtDate(it.expiresAt, false)}` : '기한 미입력'}{it.purchasedAt ? ` · 구매 ${fmtDate(it.purchasedAt, false)}` : ''}{it.memo ? ` · ${it.memo}` : ''}{it.aiNote ? ` · ${it.aiNote}` : ''}
                            {!c && ' · 레시피 DB에 없는 재료'}
                          </p>
                        </div>
                        <div className="ml-[64px] sm:ml-0 flex items-center gap-1 rounded-full bg-paper p-1">
                          <button className="w-8 h-8 rounded-full grid place-items-center hover:bg-card" aria-label="수량 줄이기" onClick={() => update((d) => adjustQty(d, it.id, -stepFor(it)))}><Minus className="w-4 h-4" /></button>
                          <span className="min-w-[56px] text-center text-[14px] font-bold num leading-tight">{fmtQty(it.qty, it.unit)}<RemainBar qty={it.qty} initial={it.initialQty} className="!flex justify-center mt-0.5" /></span>
                          <button className="w-8 h-8 rounded-full grid place-items-center hover:bg-card" aria-label="수량 늘리기" onClick={() => update((d) => adjustQty(d, it.id, stepFor(it)))}><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="relative ml-auto sm:ml-0" onClick={(e) => e.stopPropagation()}>
                          <button className="w-9 h-9 rounded-full grid place-items-center hover:bg-paper" aria-label="더보기" onClick={() => setMenuFor(menuFor === it.id ? null : it.id)}><MoreHorizontal className="w-5 h-5" /></button>
                          {menuFor === it.id && (
                            <div className="absolute right-0 top-10 z-20 w-48 panel shadow-xl p-1.5 fade-in">
                              {c && <MenuItem icon={ChefHat} onClick={() => { nav(`/app/recommend?use=${c.id}`); setMenuFor(null) }}>이 재료로 요리</MenuItem>}
                              <MenuItem icon={PenLine} onClick={() => { setForm({ open: true, item: it }); setMenuFor(null) }}>수정</MenuItem>
                              <MenuItem icon={Star} onClick={() => { update((d) => updateItem(d, it.id, { favorite: !it.favorite })); setMenuFor(null) }}>{it.favorite ? '즐겨찾기 해제' : '즐겨찾기'}</MenuItem>
                              <MenuItem icon={BookOpen} onClick={() => { setDetail(it); setMenuFor(null) }}>보관 방법·이력</MenuItem>
                              <MenuItem icon={ShoppingBasket} onClick={() => { update((d) => ({ ...d, shopping: addManual(d.shopping, it.name, c?.pack.size ?? 1, it.unit) })); toast(`${it.name}을(를) 장보기 목록에 넣었어요.`); setMenuFor(null) }}>장보기에 추가</MenuItem>
                              <MenuItem icon={AlertOctagon} onClick={() => { update((d) => updateItem(d, it.id, { spoiled: !it.spoiled })); setMenuFor(null) }}>{it.spoiled ? '상태 정상으로' : '상한 것 같아요'}</MenuItem>
                              <MenuItem icon={Trash2} onClick={() => { discard(it); setMenuFor(null) }}>버렸어요 (폐기 기록)</MenuItem>
                              <MenuItem icon={Trash2} danger onClick={() => { remove(it); setMenuFor(null) }}>목록에서 삭제</MenuItem>
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <QuickAdd open={quick} onClose={() => setQuick(false)} />
      <IngredientForm open={form.open} initial={form.item} onClose={() => setForm({ open: false, item: null })} onSave={save} />
      <DetailModal item={detail} onClose={() => setDetail(null)} onStorage={(s) => { if (detail) { update((d) => updateItem(d, detail.id, { storage: s })); setDetail({ ...detail, storage: s }) } }} />
    </div>
  )
}

function MenuItem({ icon: I, children, onClick, danger }: { icon: typeof Star; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-[14px] hover:bg-paper text-left ${danger ? 'text-cherry' : ''}`}><I className="w-4 h-4" />{children}</button>
}

function DetailModal({ item, onClose, onStorage }: { item: InventoryItem | null; onClose: () => void; onStorage: (s: StorageType) => void }) {
  const { data } = useData()
  if (!item) return null
  const cid = itemCatalogId(item)
  const c = cid ? CATALOG_MAP[cid] : null
  const purchases = data.purchases.filter((p) => (cid ? p.catalogId === cid : p.name === item.name))
  const priced = purchases.filter((p) => p.price != null && p.priceType === 'actual')
  const avg = priced.length ? priced.reduce((s, p) => s + (p.price ?? 0), 0) / priced.length : null
  const usage = data.usage.filter((u) => (cid ? u.catalogId === cid : u.name === item.name)).slice(0, 6)
  return (
    <Modal open onClose={onClose} title={`${item.name} 보관·이력`} wide>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <FreshRing emoji={c?.emoji ?? CATEGORY_EMOJI[item.category]} image={item.image} expiresAt={item.expiresAt} spoiled={item.spoiled} size={64} tint={CATEGORY_TINT[item.category]} />
          <div>
            <p className="title text-[18px]">{fmtQty(item.qty, item.unit)} <ExpiryBadge expiresAt={item.expiresAt} spoiled={item.spoiled} className="ml-1 align-middle" /></p>
            <p className="text-[13px] text-sub">{c ? `권장 보관: ${STORAGE_LABEL[c.storage]}` : CATEGORY_LABEL[item.category]}</p>
          </div>
        </div>
        <div>
          <p className="text-[13.5px] font-semibold mb-2">지금 보관 장소</p>
          <Segmented value={item.storage} onChange={onStorage} options={(['fridge', 'freezer', 'room'] as StorageType[]).map((s) => ({ value: s, label: STORAGE_LABEL[s] }))} />
        </div>
        <div className="rounded-2xl bg-paper p-4 space-y-2 text-[14.5px] leading-relaxed">
          <p><b>보관 방법</b> {c?.tip ?? CATEGORY_TIP[item.category]}</p>
          {c?.opened && <p><b>개봉 후</b> {c.opened}</p>}
          {c?.sign && <p><b>신선도 확인</b> {c.sign}</p>}
          {c?.shelf && <p className="text-sub text-[13.5px]">일반적인 참고 기간: {Object.entries(c.shelf).map(([k, v]) => `${STORAGE_LABEL[k as StorageType]} 약 ${v}일`).join(', ')}</p>}
        </div>
        <InfoNote tone="sky">보관 기간은 제품·온도·개봉 여부에 따라 달라요. 포장지 표시를 우선하고, 냄새·색·질감이 이상하면 기한 전이라도 드시지 마세요.</InfoNote>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[13.5px] font-semibold mb-2">구매 이력 {avg != null && <span className="text-sub font-normal">· 평균 {won(avg)}</span>}</p>
            {purchases.length === 0 ? <p className="text-[13.5px] text-sub">아직 기록이 없어요.</p> : (
              <ul className="space-y-1 text-[13.5px]">{purchases.slice(0, 6).map((p) => <li key={p.id} className="flex justify-between"><span>{fmtDate(p.date)} · {fmtQty(p.qty, p.unit)}</span><span className="num text-sub">{p.price != null ? `${won(p.price)}${p.priceType === 'estimate' ? '(예상)' : ''}` : '가격 없음'}</span></li>)}</ul>
            )}
          </div>
          <div>
            <p className="text-[13.5px] font-semibold mb-2">사용 이력</p>
            {usage.length === 0 ? <p className="text-[13.5px] text-sub">아직 기록이 없어요.</p> : (
              <ul className="space-y-1 text-[13.5px]">{usage.map((u) => <li key={u.id} className="flex justify-between gap-2"><span className="truncate">{fmtDate(u.date)} · {u.kind === 'discard' ? '버림' : u.meal ?? '사용'}</span><span className="num text-sub">{fmtQty(u.qty, u.unit)}</span></li>)}</ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
