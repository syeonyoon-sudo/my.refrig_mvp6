import { Link } from 'react-router-dom'
import { Clock, Heart, Repeat, ShoppingBasket, Sparkles } from 'lucide-react'
import type { Evaluation } from '../lib/engine'
import { isBeginnerFriendly, SKILL_LABEL } from '../lib/engine'
import { ownedSubHints, subLink } from '../lib/rescue'
import { fmtQty } from '../lib/units'
import { won } from '../lib/util'
import { Plate, Badge } from './ui'
import { useData } from '../store/AppStore'
import { toggleFavorite } from '../lib/actions'

export function RecipeCard({ ev, rank, compact, aiReason }: { ev: Evaluation; rank?: number; compact?: boolean; aiReason?: string }) {
  const { data, update } = useData()
  const r = ev.recipe
  const fav = data.favorites.includes(r.id)
  const used = ev.lines.filter((l) => l.use > 0)
  const hints = ownedSubHints(ev, data)
  const match = Math.round(ev.coverage * 100)
  const to = subLink(r.id, hints)
  return (
    <article className={`panel ${compact ? 'p-4' : 'p-5'} flex flex-col`}>
      <div className="flex gap-4">
        <Link to={to} aria-hidden tabIndex={-1}><Plate emoji={r.emoji} size={compact ? 60 : 72} tone={ev.urgent.length ? '#FBEFCF' : '#EAF0E2'} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {rank != null && <p className="text-[12.5px] font-semibold text-leaf mb-0.5">추천 {rank}</p>}
              <h3 className="title text-[18px] leading-tight"><Link to={to} className="hover:underline underline-offset-4">{r.name}</Link></h3>
            </div>
            <button className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-full hover:bg-paper" aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기'} aria-pressed={fav} onClick={() => update((d) => toggleFavorite(d, r.id))}>
              <Heart className={`w-5 h-5 ${fav ? 'fill-cherry text-cherry' : 'text-mute'}`} />
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 items-center text-[13px] text-sub">
            <span className="inline-flex items-center gap-1 num"><Clock className="w-3.5 h-3.5" />{r.time}분</span>
            <span>{SKILL_LABEL[r.difficulty]}</span>
            {isBeginnerFriendly(r) && <Badge tone="sky">초보 추천</Badge>}
            {r.ai && <Badge tone="sky"><Sparkles className="w-3 h-3" />AI 제안</Badge>}
            {ev.purchaseCount === 0 ? <Badge tone="basil">장보기 없이</Badge> : <Badge tone="yolk"><ShoppingBasket className="w-3 h-3" />{ev.purchaseCount}개 구매</Badge>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12.5px]" title="필수 주재료 중 지금 냉장고에 충분히 있는 비율">
        <span className="text-sub">보유 재료 일치</span>
        <span className="flex-1 h-1.5 rounded-full bg-[#ECE6D8] overflow-hidden"><span className="block h-full rounded-full bg-leaf" style={{ width: `${match}%` }} /></span>
        <b className="num text-basil">{match}%</b>
      </div>

      <p className="mt-3 text-[14.5px] leading-relaxed">{aiReason || ev.reasons[0]}</p>

      {!compact && used.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {used.map((l) => (
            <li key={l.catalogId} className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[13px] ${l.days != null && l.days <= 3 ? 'bg-yolk-soft text-[#7A560B] font-semibold' : 'bg-paper text-sub'}`}>
              {l.emoji} {l.name} <span className="num">{fmtQty(l.use, l.unit)}</span>
            </li>
          ))}
          {ev.missing.map((l) => (
            <li key={`m-${l.catalogId}`} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[13px] border border-dashed border-line-2 text-sub">
              {l.emoji} {l.name} <span className="num">{fmtQty(l.short, l.unit)}</span> 필요
            </li>
          ))}
        </ul>
      )}

      {hints.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-[13px] text-basil bg-pea/60 rounded-xl px-3 py-2">
          <Repeat className="w-4 h-4 shrink-0 mt-px" />
          <span>{hints.map((h) => `${h.fromName} 대신 냉장고의 ${h.toName}`).join(', ')}{hints.length === ev.purchaseCount ? '로 바꾸면 장보기 없이 만들 수 있어요' : '로 바꿀 수 있어요'}</span>
        </p>
      )}

      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
        <span className="text-[13px] text-sub">
          {ev.purchaseCost > 0 ? <>추가 비용 약 <b className="text-ink num">{won(ev.purchaseCost)}</b> <span className="text-mute">(예상가)</span></> : ev.recent ? '최근 3일 안에 만든 메뉴' : '추가 비용 없음'}
        </span>
        <Link to={to} className="btn btn-soft btn-sm">레시피 보기</Link>
      </div>
    </article>
  )
}
