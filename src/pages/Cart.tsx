import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, Minus, Plus, Trash2 } from 'lucide-react'
import { useData } from '../store/AppStore'
import { CATALOG_MAP } from '../lib/catalog'
import { estUnitPrice, MALLS, MALL_MAP, packLabel, searchQuery } from '../lib/shopping'
import type { CartItem, Mall } from '../lib/types'
import { won, shortName } from '../lib/util'
import { Empty, PageHeader, Segmented, TestModeNote } from '../components/ui'

export default function Cart() {
  const { data, update } = useData()
  const nav = useNavigate()
  const cart = data.cart
  const patch = (id: string, p: Partial<CartItem>) => update((d) => ({ ...d, cart: d.cart.map((c) => (c.id === id ? { ...c, ...p } : c)) }))
  const total = cart.reduce((s, c) => s + (estUnitPrice(c.catalogId) ?? 0) * c.packs, 0)
  const unknown = cart.filter((c) => estUnitPrice(c.catalogId) == null).length
  const allMall = cart.length && cart.every((c) => c.mall === cart[0].mall) ? cart[0].mall : null

  return (
    <div>
      <PageHeader title="장바구니" desc="살 재료와 수량을 정하고 쇼핑몰을 고르면 상품 검색 결과로 바로 이동해요. 결제는 각 쇼핑몰에서 직접 해요." />
      {cart.length === 0 ? (
        <div className="panel"><Empty emoji="🛒" title="장바구니가 비어 있어요" desc="장보기 목록에서 '담기'를 누르면 여기로 와요." action={<Link to="/app/shopping" className="btn btn-primary">장보기 목록으로</Link>} /></div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[14px] font-semibold">모두 같은 쇼핑몰로</span>
              <Segmented size="sm" value={(allMall ?? '') as Mall} onChange={(m) => update((d) => ({ ...d, cart: d.cart.map((c) => ({ ...c, mall: m })) }))} options={MALLS.map((m) => ({ value: m.id, label: m.name }))} />
            </div>
            <ul className="panel divide-y divide-line">
              {cart.map((c) => {
                const cat = c.catalogId ? CATALOG_MAP[c.catalogId] : null
                const price = estUnitPrice(c.catalogId)
                const mall = MALL_MAP[c.mall]
                return (
                  <li key={c.id} className="px-4 sm:px-5 py-4 flex flex-wrap items-center gap-3">
                    <span className="text-[24px]">{cat?.emoji ?? '🧺'}</span>
                    <div className="flex-1 min-w-[150px]">
                      <p className="font-bold text-[15.5px]">{shortName(c.name)}</p>
                      <p className="text-[12.5px] text-sub">{c.catalogId ? packLabel({ catalogId: c.catalogId, unit: '', manualQty: undefined }) : '수량 단위 직접 확인'} 기준 · 검색어 "{searchQuery(c.name, c.catalogId)}"</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-paper p-1">
                      <button className="w-8 h-8 rounded-full grid place-items-center hover:bg-card" aria-label="줄이기" onClick={() => patch(c.id, { packs: Math.max(1, c.packs - 1) })}><Minus className="w-4 h-4" /></button>
                      <span className="w-8 text-center font-bold num">{c.packs}</span>
                      <button className="w-8 h-8 rounded-full grid place-items-center hover:bg-card" aria-label="늘리기" onClick={() => patch(c.id, { packs: c.packs + 1 })}><Plus className="w-4 h-4" /></button>
                    </div>
                    <select className="field !h-9 !w-auto !text-[13.5px]" value={c.mall} onChange={(e) => patch(c.id, { mall: e.target.value as Mall })} aria-label="쇼핑몰">
                      {MALLS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <span className="w-24 text-right num text-[14px]">{price != null ? won(price * c.packs) : <span className="text-mute text-[12.5px]">가격 모름</span>}</span>
                    <a className="btn btn-ghost btn-sm !px-2" href={mall.url(searchQuery(c.name, c.catalogId))} target="_blank" rel="noopener noreferrer" aria-label={`${mall.name}에서 검색`}><ExternalLink className="w-4 h-4" /></a>
                    <button className="btn btn-ghost btn-sm !px-2" aria-label="삭제" onClick={() => update((d) => ({ ...d, cart: d.cart.filter((x) => x.id !== c.id) }))}><Trash2 className="w-4 h-4" /></button>
                  </li>
                )
              })}
            </ul>
          </div>
          <aside className="panel p-5 lg:sticky lg:top-[84px] space-y-4">
            <div>
              <p className="text-[13px] text-sub">예상 총액</p>
              <p className="title text-[28px] num">{won(total)}</p>
              <p className="text-[12.5px] text-mute">{cart.length}개 상품{unknown ? `, 가격 모름 ${unknown}개 제외` : ''}</p>
            </div>
            <TestModeNote title="예상가">쇼핑몰의 실제 가격이 아니에요. 정확한 가격은 이동한 쇼핑몰에서 확인하세요.</TestModeNote>
            <button className="btn btn-primary btn-lg w-full" onClick={() => nav('/app/cart/go')}>쇼핑몰로 이동하기</button>
          </aside>
        </div>
      )}
    </div>
  )
}
