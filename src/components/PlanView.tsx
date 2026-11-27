import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, RotateCcw, Shuffle, SkipForward, ShoppingBasket, Trash2, XCircle, AlertTriangle, BookOpen } from 'lucide-react'
import type { Plan } from '../lib/types'
import { replaceMeal, sortedMeals, summarizePlan, swapCandidates } from '../lib/planner'
import { cancelPlan, completeMeal, deletePlan, skipMeal, undoMeal, upsertPlan } from '../lib/actions'
import { fmtQty } from '../lib/units'
import { fmtDate, relDay, today, won } from '../lib/util'
import { useData } from '../store/AppStore'
import { Badge, Modal, Plate, SectionTitle, Meter, InfoNote } from './ui'
import type { Evaluation } from '../lib/engine'

const MODE_LABEL = { noPurchase: '추가 구매 금지', minPurchase: '최소 구매 허용', allow: '구매 허용' }

export function PlanView({ plan }: { plan: Plan }) {
  const { data, update, toast } = useData()
  const summary = useMemo(() => summarizePlan(data, plan), [data, plan])
  const meals = sortedMeals(plan)
  const days = Array.from(new Set(meals.map((m) => m.date)))
  const [swapFor, setSwapFor] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const active = plan.status === 'active'
  const t = today()

  const done = (mealId: string) => {
    const r = completeMeal(data, plan.id, mealId)
    const notes = r.shortNotes
    update(() => r.data)
    toast(notes.length ? `재고에서 뺐어요. ${notes.join(', ')}이라 있는 만큼만 뺐어요.` : '먹은 재료를 재고에서 뺐어요.', notes.length ? 'warn' : 'ok', { label: '되돌리기', run: () => update((d) => undoMeal(d, plan.id, mealId)) })
  }

  return (
    <div className="space-y-8">
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="title text-[21px]">{plan.title}</h2>
              {plan.status === 'active' && <Badge>진행 중</Badge>}
              {plan.status === 'done' && <Badge tone="sky">완료</Badge>}
              {plan.status === 'cancelled' && <Badge tone="line">취소됨</Badge>}
            </div>
            <p className="mt-1 text-sub text-[14px]">{fmtDate(plan.startDate)}부터 {plan.days}일, {plan.slots.join('·')} — {MODE_LABEL[plan.mode]}{plan.budget != null ? `, 예산 ${won(plan.budget)}` : ''}</p>
          </div>
          <div className="flex gap-2">
            {active && <button className="btn btn-line btn-sm" onClick={() => setConfirmCancel(true)}><XCircle className="w-4 h-4" />계획 취소</button>}
            {!active && <button className="btn btn-ghost btn-sm" onClick={() => update((d) => deletePlan(d, plan.id))}><Trash2 className="w-4 h-4" />삭제</button>}
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="남은 끼니" value={`${summary.plannedMeals}끼`} />
          <Stat label="먹은 끼니" value={`${summary.doneMeals}끼`} />
          <Stat label="부족한 재료" value={`${summary.shortages.length + summary.missingSeasonings.length}개`} warn={summary.shortages.length + summary.missingSeasonings.length > 0} />
          <Stat label="추가 구매 예상" value={won(summary.shoppingCost)} note="참고용 예상가" />
        </dl>
        {active && (summary.shortages.length > 0 || summary.missingSeasonings.length > 0) && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-yolk-soft px-4 py-3 text-[14px] text-[#6E5410]">
            <ShoppingBasket className="w-5 h-5" />
            <span className="flex-1 min-w-[200px]">{[...summary.shortages.map((s) => `${s.name} ${fmtQty(s.short, s.unit)}`), ...summary.missingSeasonings.map((s) => s.name)].join(', ')}이(가) 부족해서 장보기 목록에 넣었어요.</span>
            <Link to="/app/shopping" className="btn btn-sm bg-[#6E5410] text-white">장보기 목록</Link>
          </div>
        )}
      </div>

      <section>
        <SectionTitle>끼니별 계획</SectionTitle>
        <div className="space-y-5">
          {days.map((date) => (
            <div key={date} className="grid sm:grid-cols-[96px_1fr] gap-2 sm:gap-4">
              <div className="pt-1">
                <p className={`title text-[16px] ${date === t ? 'text-basil' : ''}`}>{relDay(date)}</p>
                <p className="text-[13px] text-sub">{fmtDate(date)}</p>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {meals.filter((m) => m.date === date).map((m) => {
                  const short = summary.mealShort[m.id]
                  return (
                    <div key={m.id} className={`tile p-4 flex flex-col ${m.status === 'done' ? 'bg-pea/40 border-pea-2' : m.status === 'skipped' ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-3">
                        <Plate emoji={m.emoji} size={46} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] text-sub">{m.slot}{m.status === 'done' ? ' · 먹음' : m.status === 'skipped' ? ' · 건너뜀' : ''}</p>
                          <p className="font-bold text-[15.5px] leading-tight truncate">{m.name}</p>
                        </div>
                      </div>
                      {m.note && <p className="mt-2 text-[13px] text-sub">{m.note}</p>}
                      {m.uses.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-1">
                          {m.uses.map((u) => (
                            <li key={u.name} className={`text-[12.5px] px-2 h-6 rounded-full inline-flex items-center ${short?.includes(u.name) && m.status === 'planned' ? 'bg-cherry-soft text-cherry font-semibold' : 'bg-paper text-sub'}`}>
                              {u.name} <span className="num ml-1">{fmtQty(u.amount, u.unit)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {m.status === 'planned' && short && <p className="mt-2 text-[12.5px] text-cherry flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{short.join(', ')} 부족 (장보기 목록에 있음)</p>}
                      {m.shortNote && <p className="mt-2 text-[12.5px] text-[#86600A]">{m.shortNote} — 있는 만큼만 차감했어요</p>}
                      {active && (
                        <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                          {m.status === 'planned' && m.recipeId && <button className="btn btn-primary btn-sm" onClick={() => done(m.id)}><Check className="w-4 h-4" />먹었어요</button>}
                          {m.status === 'done' && <button className="btn btn-line btn-sm" onClick={() => update((d) => undoMeal(d, plan.id, m.id))}><RotateCcw className="w-4 h-4" />먹은 것 취소</button>}
                          {m.status === 'planned' && <button className="btn btn-ghost btn-sm" onClick={() => setSwapFor(m.id)}><Shuffle className="w-4 h-4" />바꾸기</button>}
                          {m.status === 'planned' && m.recipeId && <button className="btn btn-ghost btn-sm" onClick={() => update((d) => skipMeal(d, plan.id, m.id, true))}><SkipForward className="w-4 h-4" />건너뛰기</button>}
                          {m.status === 'skipped' && <button className="btn btn-ghost btn-sm" onClick={() => update((d) => skipMeal(d, plan.id, m.id, false))}>다시 계획에 넣기</button>}
                          {m.recipeId && <Link to={`/app/recipe/${m.recipeId}`} className="btn btn-ghost btn-sm"><BookOpen className="w-4 h-4" />레시피</Link>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {summary.items.length > 0 && (
        <section>
          <SectionTitle>재료별 소진 계산</SectionTitle>
          <div className="panel overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] px-5 py-3 text-[12.5px] font-semibold text-sub border-b border-line">
              <span>재료</span><span className="text-right">지금 보유</span><span className="text-right">사용 예정</span><span className="text-right">부족</span><span className="text-right">계획 후 남음</span>
            </div>
            {summary.items.map((it) => (
              <div key={it.catalogId} className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-y-1 px-5 py-3 border-b border-line last:border-0 text-[14px] items-center">
                <div className="col-span-2 sm:col-span-1">
                  <p className="font-semibold">{it.emoji} {it.name}</p>
                  <div className="mt-1.5 w-full sm:w-32"><Meter value={it.have ? Math.min(1, (it.planned - it.short) / it.have) : 0} tone={it.short > 0 ? 'yolk' : 'basil'} /></div>
                </div>
                <span className="sm:text-right num text-sub"><span className="sm:hidden">보유 </span>{fmtQty(it.have, it.unit)}</span>
                <span className="text-right num"><span className="sm:hidden text-sub">사용 </span>{fmtQty(it.planned, it.unit)}</span>
                <span className={`sm:text-right num ${it.short > 0 ? 'text-cherry font-semibold' : 'text-mute'}`}><span className="sm:hidden">부족 </span>{it.short > 0 ? fmtQty(it.short, it.unit) : '-'}</span>
                <span className="text-right num font-semibold text-basil"><span className="sm:hidden text-sub font-normal">남음 </span>{fmtQty(it.remain, it.unit)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-mute">아직 먹지 않은 끼니만 현재 재고에서 순서대로 계산해요. 같은 재료를 여러 끼니에 써도 보유량을 넘지 않게 확인해요.</p>
        </section>
      )}

      {summary.leftovers.length > 0 && active && (
        <section>
          <SectionTitle>계획이 끝나도 남는 재료</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {summary.leftovers.map((l, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13.5px] ${l.expiresInPlan ? 'bg-cherry-soft text-cherry font-semibold' : 'bg-card border border-line'}`}>
                {l.emoji} {l.name} <span className="num">{fmtQty(l.qty, l.unit)}</span>{l.expiresInPlan && ' · 계획 중 기한 지남'}
              </span>
            ))}
          </div>
          {summary.leftovers.some((l) => l.expiresInPlan) && <div className="mt-3"><InfoNote tone="cherry">빨간 재료는 계획 기간 안에 기한이 지나요. 메뉴를 바꾸거나 냉동 보관을 고려해 보세요.</InfoNote></div>}
        </section>
      )}

      <SwapModal plan={plan} mealId={swapFor} onClose={() => setSwapFor(null)} onPick={(ev) => { update((d) => upsertPlan(d, replaceMeal(plan, swapFor!, ev))); setSwapFor(null); toast(`${ev.recipe.name}(으)로 바꿨어요.`) }} />

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="계획을 취소할까요?"
        footer={<><button className="btn btn-line" onClick={() => setConfirmCancel(false)}>아니요</button><button className="btn btn-primary" onClick={() => { update((d) => cancelPlan(d, plan.id)); setConfirmCancel(false); toast('계획을 취소했어요.') }}>취소하기</button></>}>
        <p className="text-[15px] leading-relaxed">아직 먹지 않은 끼니는 재고에서 빠지지 않아요. 이미 "먹었어요"로 처리한 끼니의 차감은 그대로 유지돼요. 이 계획 때문에 장보기 목록에 들어간 재료도 함께 빠져요.</p>
      </Modal>
    </div>
  )
}

function Stat({ label, value, note, warn }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[12.5px] text-sub">{label}</dt>
      <dd className={`title text-[20px] num mt-0.5 ${warn ? 'text-[#A5591F]' : ''}`}>{value}</dd>
      {note && <dd className="text-[11.5px] text-mute">{note}</dd>}
    </div>
  )
}

function SwapModal({ plan, mealId, onClose, onPick }: { plan: Plan; mealId: string | null; onClose: () => void; onPick: (ev: Evaluation) => void }) {
  const { data } = useData()
  const list = useMemo(() => (mealId ? swapCandidates(data, plan, mealId) : []), [data, plan, mealId])
  return (
    <Modal open={!!mealId} onClose={onClose} title="다른 메뉴로 바꾸기" wide>
      <p className="text-[14px] text-sub mb-4">이 끼니 전까지의 계획을 반영한 남은 재고로 계산했어요.</p>
      {list.length === 0 && <p className="py-8 text-center text-sub">바꿀 수 있는 메뉴가 없어요. 설정에서 조리 시간이나 도구 조건을 넓혀 보세요.</p>}
      <div className="space-y-2">
        {list.map((ev) => (
          <button key={ev.recipe.id} onClick={() => onPick(ev)} className="w-full text-left tile p-3.5 flex items-center gap-3 hover:border-leaf">
            <Plate emoji={ev.recipe.emoji} size={44} />
            <div className="flex-1 min-w-0">
              <p className="font-bold">{ev.recipe.name} <span className="text-[13px] font-normal text-sub num">{ev.recipe.time}분</span></p>
              <p className="text-[13px] text-sub truncate">{ev.lines.filter((l) => l.use > 0).map((l) => `${l.name} ${fmtQty(l.use, l.unit)}`).join(', ')}</p>
            </div>
            {ev.purchaseCount ? <Badge tone="yolk">{ev.purchaseCount}개 구매</Badge> : <Badge>구매 없음</Badge>}
          </button>
        ))}
      </div>
    </Modal>
  )
}
