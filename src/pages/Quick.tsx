import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useData } from '../store/AppStore'
import { QUICK_OPTIONS, recommend, SKILL_LABEL, type QuickKey } from '../lib/engine'
import { addHistory } from '../lib/actions'
import { fmtQty } from '../lib/units'
import { Empty, PageHeader, Plate, Badge } from '../components/ui'

export default function Quick() {
  const { data, update } = useData()
  const [keys, setKeys] = useState<QuickKey[]>(['t20'])
  const res = useMemo(() => recommend(data, { quick: keys, limit: 4 }), [data, keys])
  const toggle = (k: QuickKey) => setKeys((x) => {
    let n = x.includes(k) ? x.filter((y) => y !== k) : [...x, k]
    if (k === 't10' && n.includes('t10')) n = n.filter((y) => y !== 't20')
    if (k === 't20' && n.includes('t20')) n = n.filter((y) => y !== 't10')
    return n
  })

  return (
    <div>
      <PageHeader title="오늘의 한 끼" desc="복잡한 설정 없이 조건만 눌러 보세요. 지금 냉장고와 저장해 둔 취향·알레르기 설정으로 바로 골라 드려요." />
      <div className="flex flex-wrap gap-2 mb-8">
        {QUICK_OPTIONS.map((o) => (
          <button key={o.key} className="chip !h-11 !px-4 !text-[14.5px]" aria-pressed={keys.includes(o.key)} onClick={() => toggle(o.key)} title={o.desc}>
            <span aria-hidden>{o.emoji}</span>{o.label}
          </button>
        ))}
      </div>

      {res.items.length === 0 ? (
        <div className="panel"><Empty emoji="🥄" title="이 조건으로는 만들 수 있는 메뉴가 없어요" desc="조건을 하나 빼 보거나, 냉장고에 재료를 더 넣어 보세요." action={<button className="btn btn-primary" onClick={() => setKeys([])}>조건 모두 끄기</button>} /></div>
      ) : (
        <ol className="grid md:grid-cols-2 gap-4">
          {res.items.map((ev, i) => (
            <li key={ev.recipe.id} className={`panel p-5 ${i === 0 ? 'md:col-span-2 md:grid md:grid-cols-[auto_1fr_1.2fr] md:gap-6 md:items-start' : ''}`}>
              <Plate emoji={ev.recipe.emoji} size={i === 0 ? 96 : 64} />
              <div className={i === 0 ? '' : 'mt-3'}>
                {i === 0 && <p className="text-[13px] font-semibold text-leaf">지금 가장 잘 맞아요</p>}
                <h2 className="title text-[20px]">{ev.recipe.name}</h2>
                <div className="mt-1 flex flex-wrap gap-2 text-[13.5px] text-sub items-center">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{ev.recipe.time}분</span>
                  <span>{SKILL_LABEL[ev.recipe.difficulty]}</span>
                  {ev.purchaseCount ? <Badge tone="yolk">{ev.purchaseCount}개 구매</Badge> : <Badge>구매 없음</Badge>}
                </div>
                <p className="mt-3 text-[14px]">
                  <span className="text-sub">사용 재료 </span>
                  {ev.lines.filter((l) => l.use > 0).map((l) => `${l.name} ${fmtQty(l.use, l.unit)}`).join(', ')}
                  {ev.missing.length > 0 && <span className="text-[#A5591F]"> / 필요: {ev.missing.map((m) => m.name).join(', ')}</span>}
                </p>
              </div>
              <div className={i === 0 ? 'mt-4 md:mt-0' : 'mt-3'}>
                <ol className="space-y-1.5 text-[14px] leading-relaxed list-decimal pl-5 marker:text-mute">
                  {ev.recipe.steps.slice(0, i === 0 ? 4 : 3).map((s, j) => <li key={j}>{s}</li>)}
                </ol>
                <Link to={`/app/recipe/${ev.recipe.id}`} onClick={() => update((d) => addHistory(d, ev.recipe, 'quick'))} className="btn btn-soft btn-sm mt-4">전체 레시피·재고 차감</Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
