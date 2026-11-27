import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, ExternalLink, PackageCheck } from 'lucide-react'
import { useData } from '../store/AppStore'
import { CATALOG_MAP } from '../lib/catalog'
import { MALLS, MALL_MAP, packLabel, searchQuery } from '../lib/shopping'
import type { Mall } from '../lib/types'
import { shortName } from '../lib/util'
import { Empty, InfoNote, PageHeader } from '../components/ui'

export default function CartGo() {
  const { data, update, toast } = useData()
  const nav = useNavigate()
  const [opened, setOpened] = useState<string[]>([])
  const cart = data.cart
  const malls = Array.from(new Set(cart.map((c) => c.mall))) as Mall[]

  const text = cart.map((c) => `- ${shortName(c.name)} ${c.catalogId ? CATALOG_MAP[c.catalogId].pack.label : ''} × ${c.packs}`).join('\n')
  const copy = async () => {
    try { await navigator.clipboard.writeText(`[냉장고 한 끼 장보기]\n${text}`); toast('구매 목록을 복사했어요.') } catch { toast('복사하지 못했어요. 목록을 길게 눌러 직접 복사해 주세요.', 'warn') }
  }
  const markBought = () => {
    const ids = new Set(cart.map((c) => c.shoppingId).filter(Boolean) as string[])
    update((d) => ({ ...d, shopping: d.shopping.map((s) => (ids.has(s.id) ? { ...s, checked: true, packs: d.cart.find((c) => c.shoppingId === s.id)?.packs ?? s.packs, packsEdited: true } : s)) }))
    nav('/app/shopping?buy=1')
  }

  if (!cart.length) return <div className="panel"><Empty emoji="🛒" title="장바구니가 비어 있어요" action={<Link to="/app/shopping" className="btn btn-primary">장보기 목록으로</Link>} /></div>

  return (
    <div className="max-w-3xl">
      <button onClick={() => nav('/app/cart')} className="btn btn-ghost btn-sm -ml-3 mb-3"><ArrowLeft className="w-4 h-4" />장바구니</button>
      <PageHeader title="외부 쇼핑몰로 이동" desc="상품 상세 주소는 확인할 수 없어서, 재료 이름으로 각 쇼핑몰의 검색 결과를 열어요. 아래 목록과 수량을 보면서 담아 주세요." />
      <InfoNote tone="sky">결제·주문·배송은 이 서비스에서 하지 않아요. 쇼핑몰에서 구매를 마치면 돌아와서 "구매 완료"를 눌러 냉장고에 넣으세요.</InfoNote>

      <div className="mt-6 space-y-6">
        {malls.map((m) => {
          const mall = MALL_MAP[m]
          const items = cart.filter((c) => c.mall === m)
          return (
            <section key={m} className="panel overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-3 border-b border-line" style={{ background: `${mall.color}10` }}>
                <span className="w-3 h-3 rounded-full" style={{ background: mall.color }} />
                <h2 className="title text-[17px]">{mall.name}</h2>
                <span className="text-[13px] text-sub">{items.length}개 상품</span>
              </div>
              <ul className="divide-y divide-line">
                {items.map((c) => {
                  const q = searchQuery(c.name, c.catalogId)
                  return (
                    <li key={c.id} className="px-5 py-3.5 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[160px]">
                        <p className="font-bold">{shortName(c.name)} <span className="num text-basil">× {c.packs}</span></p>
                        <p className="text-[12.5px] text-sub">{c.catalogId ? `${packLabel({ catalogId: c.catalogId, unit: '', manualQty: undefined })} 기준` : '수량 직접 확인'}</p>
                      </div>
                      <a href={mall.url(q)} target="_blank" rel="noopener noreferrer" onClick={() => setOpened((o) => [...o, c.id])} className={`btn btn-sm ${opened.includes(c.id) ? 'btn-soft' : 'btn-primary'}`}>
                        <ExternalLink className="w-4 h-4" />{opened.includes(c.id) ? '다시 열기' : `${mall.name}에서 검색`}
                      </a>
                      <details className="text-[12.5px] text-sub">
                        <summary className="cursor-pointer">다른 쇼핑몰</summary>
                        <div className="mt-1 flex gap-2">{MALLS.filter((x) => x.id !== m).map((x) => <a key={x.id} className="underline" href={x.url(q)} target="_blank" rel="noopener noreferrer">{x.name}</a>)}</div>
                      </details>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <div className="mt-6 panel p-5">
        <p className="text-[14px] font-semibold mb-2">구매할 목록</p>
        <pre className="whitespace-pre-wrap font-sans text-[14px] bg-paper rounded-2xl p-4">{text}</pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-line" onClick={copy}><Copy className="w-4 h-4" />목록 복사</button>
          <button className="btn btn-primary" onClick={markBought}><PackageCheck className="w-4 h-4" />구매 완료 — 냉장고에 넣기</button>
        </div>
      </div>
    </div>
  )
}
