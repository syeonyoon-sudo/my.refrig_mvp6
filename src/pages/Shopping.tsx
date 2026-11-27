import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Minus, Plus, RefreshCw, ShoppingCart, Trash2, PackageCheck } from 'lucide-react'
import { useData } from '../store/AppStore'
import { CATALOG_MAP, CATEGORY_EMOJI, CATEGORY_LABEL, INGREDIENTS, STORAGE_LABEL } from '../lib/catalog'
import { addManual, alreadyHave, estUnitPrice, itemNeed, packLabel, purchasedBase } from '../lib/shopping'
import { completePurchase, syncShopping, type PurchaseEntry } from '../lib/actions'
import { isLowStock, itemCatalogId } from '../lib/inventory'
import { fmtQty, unitOptions } from '../lib/units'
import { resolveCatalog } from '../lib/match'
import type { Category, ShoppingItem, StorageType } from '../lib/types'
import { addDays, today, uid, won, shortName } from '../lib/util'
import { Badge, Empty, Label, Modal, PageHeader, TestModeNote } from '../components/ui'

export default function Shopping() {
  const { data, update, toast } = useData()
  const [addOpen, setAddOpen] = useState(false)
  const [buyOpen, setBuyOpen] = useState(false)

  const [params, setParams] = useSearchParams()
  useEffect(() => { update((d) => syncShopping(d)) }, [update])
  useEffect(() => {
    if (params.get('buy')) { setBuyOpen(true); params.delete('buy'); setParams(params, { replace: true }) }
  }, [params, setParams])

  const list = data.shopping
  const cats = Array.from(new Set(list.map((i) => i.category))) as Category[]
  const checked = list.filter((i) => i.checked)
  const est = list.reduce((s, i) => s + (estUnitPrice(i.catalogId) ?? 0) * i.packs, 0)
  const unknownPrice = list.filter((i) => estUnitPrice(i.catalogId) == null).length
  const lowItems = data.inventory.filter((i) => isLowStock(i))

  const patch = (id: string, p: Partial<ShoppingItem>) => update((d) => ({ ...d, shopping: d.shopping.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const remove = (id: string) => update((d) => ({ ...d, shopping: d.shopping.filter((x) => x.id !== id), cart: d.cart.filter((c) => c.shoppingId !== id) }))
  const inCart = (id: string) => data.cart.some((c) => c.shoppingId === id)
  const toCart = (items: ShoppingItem[]) => {
    update((d) => ({ ...d, cart: [...d.cart, ...items.filter((i) => !d.cart.some((c) => c.shoppingId === i.id)).map((i) => ({ id: uid('c'), shoppingId: i.id, name: i.name, catalogId: i.catalogId, packs: i.packs, mall: 'coupang' as const }))] }))
    toast(`${items.length}개를 장바구니에 담았어요.`)
  }

  return (
    <div>
      <PageHeader
        title="장보기 목록"
        desc="식단과 레시피에서 모자란 재료가 자동으로 들어와요. 이미 냉장고에 있는 양은 빼고 계산해서, 같은 재료는 한 줄로 합쳐요."
        actions={<>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" />직접 추가</button>
          <button className="btn btn-line" onClick={() => { update((d) => syncShopping(d)); toast('진행 중인 식단 기준으로 다시 계산했어요.') }}><RefreshCw className="w-4 h-4" />다시 계산</button>
        </>}
      />

      {lowItems.length > 0 && (
        <div className="panel p-4 mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold mr-1">재고가 얼마 안 남았어요</span>
          {lowItems.map((it) => {
            const c = it.catalogId ? CATALOG_MAP[it.catalogId] : null
            const onList = list.some((s) => s.catalogId === itemCatalogId(it))
            return (
              <button key={it.id} disabled={onList} onClick={() => { update((d) => ({ ...d, shopping: addManual(d.shopping, it.name, c?.pack.size ?? 1, c?.unit ?? it.unit) })); toast(`${it.name}을(를) 추가했어요.`) }} className="chip !h-8 !text-[13px]" style={onList ? { opacity: 0.5 } : undefined}>
                {onList ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{it.name} {fmtQty(it.qty, it.unit)}
              </button>
            )
          })}
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel"><Empty emoji="🧺" title="사야 할 재료가 없어요" desc="식단을 만들거나 레시피에서 '부족한 재료 담기'를 누르면 여기에 모여요." action={<><Link to="/app/plan" className="btn btn-primary">식단 만들기</Link><button className="btn btn-line" onClick={() => setAddOpen(true)}>직접 추가</button></>} /></div>
      ) : (
        <>
          <div className="space-y-6">
            {cats.map((cat) => (
              <section key={cat}>
                <h2 className="title text-[16px] mb-2.5">{CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}</h2>
                <ul className="panel divide-y divide-line">
                  {list.filter((i) => i.category === cat).map((it) => {
                    const need = itemNeed(it)
                    const have = alreadyHave(data, it)
                    const price = estUnitPrice(it.catalogId)
                    const c = it.catalogId ? CATALOG_MAP[it.catalogId] : null
                    const sources = Object.values(it.contributions).map((x) => x.label)
                    return (
                      <li key={it.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 sm:px-5 py-3.5">
                        <button onClick={() => patch(it.id, { checked: !it.checked })} aria-pressed={it.checked} aria-label={it.checked ? '산 것 해제' : '샀어요'} className={`w-7 h-7 rounded-lg border-2 grid place-items-center shrink-0 ${it.checked ? 'bg-leaf border-leaf text-white' : 'border-line-2 bg-white'}`}>{it.checked && <Check className="w-4 h-4" />}</button>
                        <div className="flex-1 min-w-[160px]">
                          <p className={`font-bold text-[15.5px] ${it.checked ? 'line-through text-mute' : ''}`}>{c?.emoji} {shortName(it.name)}</p>
                          <p className="text-[12.5px] text-sub">
                            {!it.catalogId ? <>{it.manualQty}{it.unit}</> : c?.kind === 'seasoning' ? <>양념 · 집에 없어요</> : <>
                              {totalNeed(it) != null && <>필요 {fmtQty(totalNeed(it)!, it.unit)} · </>}보유 {fmtQty(have, it.unit)} · 부족 {fmtQty(need, it.unit)} → 구매 {packLabel(it)} × {it.packs}
                            </>}
                            {sources.length > 0 && <> · {sources.join(', ')}</>}
                          </p>
                          {have > 0 && totalNeed(it) == null && <p className="text-[12.5px] text-[#86600A]">냉장고에 있는 양은 빼고 부족분만 계산했어요</p>}
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-paper p-1">
                          <button className="w-8 h-8 rounded-full grid place-items-center hover:bg-card" aria-label="포장 개수 줄이기" onClick={() => patch(it.id, { packs: Math.max(1, it.packs - 1), packsEdited: true })}><Minus className="w-4 h-4" /></button>
                          <span className="w-8 text-center font-bold num text-[14px]">{it.packs}</span>
                          <button className="w-8 h-8 rounded-full grid place-items-center hover:bg-card" aria-label="포장 개수 늘리기" onClick={() => patch(it.id, { packs: it.packs + 1, packsEdited: true })}><Plus className="w-4 h-4" /></button>
                        </div>
                        <span className="w-24 text-right text-[13.5px] num">{price != null ? <>{won(price * it.packs)}<span className="block text-[11px] text-mute">예상가</span></> : <span className="text-mute">가격 정보 없음</span>}</span>
                        <div className="flex gap-1">
                          <button className={`btn btn-sm ${inCart(it.id) ? 'btn-soft' : 'btn-line'}`} disabled={inCart(it.id)} onClick={() => toCart([it])}><ShoppingCart className="w-4 h-4" />{inCart(it.id) ? '담김' : '담기'}</button>
                          <button className="btn btn-ghost btn-sm !px-2" aria-label="삭제" onClick={() => remove(it.id)}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-6 panel p-5 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <p className="text-[13px] text-sub">예상 총액 (참고용 예상가)</p>
              <p className="title text-[24px] num">{won(est)}</p>
              {unknownPrice > 0 && <p className="text-[12px] text-mute">가격 정보가 없는 {unknownPrice}개는 빠져 있어요.</p>}
            </div>
            <button className="btn btn-line" onClick={() => toCart(list.filter((i) => !i.checked && !inCart(i.id)))} disabled={!list.some((i) => !i.checked && !inCart(i.id))}><ShoppingCart className="w-4 h-4" />남은 것 전부 장바구니에</button>
            <button className="btn btn-primary" disabled={!checked.length} onClick={() => setBuyOpen(true)}><PackageCheck className="w-4 h-4" />산 것 냉장고에 넣기 ({checked.length})</button>
          </div>
          <p className="mt-2 text-[12.5px] text-mute">마트나 쇼핑몰에서 산 재료에 체크한 뒤 "냉장고에 넣기"를 누르면 재고에 등록되고 구매 기록이 남아요.</p>
        </>
      )}

      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={(name, qty, unit) => { update((d) => ({ ...d, shopping: addManual(d.shopping, name, qty, unit) })); setAddOpen(false); toast(`${name}을(를) 추가했어요.`) }} />
      <PurchaseModal open={buyOpen} items={checked} onClose={() => setBuyOpen(false)} onDone={(entries) => {
        const r = completePurchase(data, entries)
        update(() => r.data)
        setBuyOpen(false)
        toast(`냉장고에 넣었어요 (새로 ${r.added}개, 합침 ${r.merged}개).`)
      }} />
    </div>
  )
}

function AddModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (name: string, qty: number, unit: string) => void }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const cid = resolveCatalog(name)
  const units = unitOptions(cid)
  const [unit, setUnit] = useState('개')
  useEffect(() => { setUnit(units[0]) }, [cid]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setName(''); setQty('1') } }, [open])
  return (
    <Modal open={open} onClose={onClose} title="장보기에 직접 추가"
      footer={<><button className="btn btn-line" onClick={onClose}>취소</button><button className="btn btn-primary" disabled={!name.trim() || !(Number(qty) > 0)} onClick={() => onAdd(name.trim(), Number(qty), unit)}>추가</button></>}>
      <div className="space-y-4">
        <div><Label htmlFor="sh-name" hint={cid ? `${CATALOG_MAP[cid].name}(으)로 인식` : undefined}>이름</Label><input id="sh-name" className="field" list="sh-list" value={name} onChange={(e) => setName(e.target.value)} autoFocus /><datalist id="sh-list">{INGREDIENTS.map((c) => <option key={c.id} value={c.name} />)}</datalist></div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div><Label htmlFor="sh-qty">필요한 양</Label><input id="sh-qty" className="field num" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div><Label htmlFor="sh-unit">단위</Label><select id="sh-unit" className="field" value={unit} onChange={(e) => setUnit(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select></div>
        </div>
        <p className="text-[13px] text-sub">이미 목록에 같은 재료가 있으면 한 줄로 합쳐져요.</p>
      </div>
    </Modal>
  )
}

export function PurchaseModal({ open, items, onClose, onDone }: { open: boolean; items: ShoppingItem[]; onClose: () => void; onDone: (e: PurchaseEntry[]) => void }) {
  const [rows, setRows] = useState<Record<string, { packs: number; expiresAt: string; storage: StorageType; price: string }>>({})
  useEffect(() => {
    if (!open) return
    const r: typeof rows = {}
    for (const it of items) {
      const c = it.catalogId ? CATALOG_MAP[it.catalogId] : null
      r[it.id] = { packs: it.packs, expiresAt: '', storage: c?.storage ?? 'fridge', price: '' }
    }
    setRows(r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.map((i) => i.id).join()])
  const list = useMemo(() => items.filter((i) => rows[i.id]), [items, rows])
  return (
    <Modal open={open} onClose={onClose} title="산 재료 냉장고에 넣기" wide
      footer={<><button className="btn btn-line" onClick={onClose}>취소</button><button className="btn btn-primary" onClick={() => onDone(list.map((i) => ({ shoppingId: i.id, packs: rows[i.id].packs, expiresAt: rows[i.id].expiresAt || null, storage: rows[i.id].storage, price: rows[i.id].price ? Number(rows[i.id].price) : null })))}>{list.length}개 넣기</button></>}>
      <p className="text-[14px] text-sub mb-4">유통기한을 넣어 두면 임박 알림과 추천이 정확해져요. 결제 금액을 적으면 식비에 실제 금액으로 기록돼요(비우면 예상가).</p>
      <ul className="space-y-3">
        {list.map((it) => {
          const r = rows[it.id]
          const c = it.catalogId ? CATALOG_MAP[it.catalogId] : null
          const set = (p: Partial<typeof r>) => setRows((x) => ({ ...x, [it.id]: { ...x[it.id], ...p } }))
          const shelf = c?.shelf?.[r.storage]
          return (
            <li key={it.id} className="tile p-4">
              <p className="font-bold">{c?.emoji} {shortName(it.name)} <span className="text-sub font-normal text-[13px]">{c?.kind === 'seasoning' ? '→ 보유 양념에 추가' : `→ 냉장고에 ${fmtQty(purchasedBase({ ...it, packs: r.packs }), it.unit)}`}</span></p>
              {c?.kind === 'seasoning' ? <p className="text-[13px] text-sub mt-1">양념은 보유 양념 목록에 추가돼요.</p> : (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><Label>포장 개수</Label><input className="field num" inputMode="numeric" value={r.packs} onChange={(e) => set({ packs: Math.max(1, Number(e.target.value.replace(/[^0-9]/g, '')) || 1) })} /></div>
                  <div><Label>보관</Label><select className="field" value={r.storage} onChange={(e) => set({ storage: e.target.value as StorageType })}>{(['fridge', 'freezer', 'room'] as StorageType[]).map((s) => <option key={s} value={s}>{STORAGE_LABEL[s]}</option>)}</select></div>
                  <div className="col-span-2 sm:col-span-1"><Label>유통기한</Label><input type="date" className="field" value={r.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} />
                    {shelf && !r.expiresAt && <button type="button" className="text-[12px] text-leaf font-semibold mt-1" onClick={() => set({ expiresAt: addDays(today(), shelf) })}>참고값 {shelf}일 넣기</button>}
                  </div>
                  <div className="col-span-2 sm:col-span-1"><Label>결제 금액(원)</Label><input className="field num" inputMode="numeric" placeholder={estUnitPrice(it.catalogId) ? `예상 ${won((estUnitPrice(it.catalogId) ?? 0) * r.packs)}` : ''} value={r.price} onChange={(e) => set({ price: e.target.value.replace(/[^0-9]/g, '') })} /></div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {list.some((i) => !rows[i.id].price) && <div className="mt-4"><TestModeNote title="예상가 사용">금액을 비운 항목은 참고용 예상가로 식비에 기록되고, 기록에 '예상'으로 표시돼요.</TestModeNote></div>}
      {list.length === 0 && <Badge tone="line">선택한 항목이 없어요</Badge>}
    </Modal>
  )
}

/** 식단·레시피 기준 전체 필요량 (출처가 하나일 때만 정확히 표시) */
function totalNeed(it: ShoppingItem): number | null {
  const cs = Object.values(it.contributions)
  if (cs.length !== 1 || cs[0].total == null) return null
  return cs[0].total
}
