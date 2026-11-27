import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, Heart, Replace, ShoppingBasket, Sparkles, Star, CalendarPlus, Flame, ChefHat, AlertTriangle, Loader2 } from 'lucide-react'
import { useData } from '../store/AppStore'
import { RECIPE_MAP } from '../lib/recipes'
import { evaluateNow, recommend, SKILL_LABEL, SPICY_LABEL, packCost } from '../lib/engine'
import { applyCustom, applySubs, substitutesFor } from '../lib/substitutes'
import { addRecipeShortages, cookRecipe, rateRecipe, toggleFavorite, undoCook, upsertPlan } from '../lib/actions'
import { usesFromEval, addRecipeToPlan, emptyPlan } from '../lib/planner'
import { fmtQty } from '../lib/units'
import { addDays, today, won, fmtDate, josa } from '../lib/util'
import { Badge, InfoNote, Modal, Plate, SectionTitle, Label, Segmented, Empty } from '../components/ui'
import type { Slot } from '../lib/types'
import { CATALOG_MAP } from '../lib/catalog'
import { aiSubQA, type SubAnswer } from '../lib/ai'
import type { Recipe } from '../lib/types'
import { resolveCatalog, blockedReasons } from '../lib/match'
import { toBase } from '../lib/units'
import { totalHave } from '../lib/inventory'

export default function RecipeDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, update, toast, aiOn } = useData()
  const base = (id && (RECIPE_MAP[id] ?? data.aiRecipes.find((r) => r.id === id))) || null
  const [params] = useSearchParams()
  const [subs, setSubs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const v of params.getAll('sub')) { const [f, t] = v.split(':'); if (f && t && CATALOG_MAP[f] && CATALOG_MAP[t]) init[f] = t }
    return init
  })
  const [subFor, setSubFor] = useState<string | null>(null)
  const [checked, setChecked] = useState<number[]>([])
  const [planOpen, setPlanOpen] = useState(false)
  const [custom, setCustom] = useState<Record<string, { to: string; amount: number | null }>>({})
  const [omit, setOmit] = useState<string[]>([])
  const recipe = useMemo(() => (base ? applyCustom(applySubs(base, subs), custom, omit) : null), [base, subs, custom, omit])
  const applyAI = (from: string, to: string, amount: number | null) => {
    setCustom((c) => ({ ...c, [from]: { to, amount } }))
    setSubFor(null)
    toast(`${CATALOG_MAP[to].name.replace(/\(.*\)/, '')}(으)로 바꿨어요. AI 추정량이라 필요하면 조절해서 쓰세요.`)
  }
  const doOmit = (id: string) => { setOmit((o) => Array.from(new Set([...o, id]))); setSubFor(null); toast(`${CATALOG_MAP[id].name.replace(/\(.*\)/, '')} 없이 만드는 것으로 바꿨어요.`) }
  const ev = useMemo(() => (recipe ? evaluateNow(data, recipe) : null), [data, recipe])
  const rating = data.ratings.find((r) => r.recipeId === id)
  const [stars, setStars] = useState(rating?.stars ?? 0)
  const [comment, setComment] = useState(rating?.comment ?? '')

  if (!base || !recipe || !ev) {
    return <div className="panel"><Empty emoji="🍽️" title="레시피를 찾을 수 없어요" desc="삭제된 AI 메뉴이거나 잘못된 주소예요." action={<Link to="/app/recommend" className="btn btn-primary">메뉴 추천으로</Link>} /></div>
  }
  const fav = data.favorites.includes(base.id)
  const hardBlock = ev.excluded.filter((x) => x.includes('알레르기') || x.includes('섭취 금지'))
  const softExcluded = ev.excluded.filter((x) => !hardBlock.includes(x) && !x.startsWith('추가 구매') && !x.startsWith('보유한 재료'))

  const cook = () => {
    const uses = usesFromEval(ev).filter((u) => u.catalogId && totalHave(data.inventory, u.catalogId) > 0)
    const r = cookRecipe(data, ev, uses)
    update(() => r.data)
    toast(r.shortNotes.length ? `있는 재료만 뺐어요 (${r.shortNotes.join(', ')}).` : `${recipe.name} 재료를 냉장고에서 뺐어요.`, r.shortNotes.length ? 'warn' : 'ok', {
      label: '되돌리기', run: () => update((d) => undoCook(d, r.deductions, r.logIds)),
    })
  }

  const toCart = () => {
    update((d) => addRecipeShortages(d, ev))
    toast(`부족한 재료 ${ev.purchaseCount}개를 장보기 목록에 담았어요.`, 'ok', { label: '목록 보기', run: () => nav('/app/shopping') })
  }

  return (
    <div>
      <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm -ml-3 mb-3"><ArrowLeft className="w-4 h-4" />뒤로</button>

      <header className="flex flex-col sm:flex-row gap-5 sm:items-center mb-8">
        <Plate emoji={recipe.emoji} size={112} tone={ev.urgent.length ? '#FBEFCF' : '#EAF0E2'} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {base.ai && <Badge tone="sky"><Sparkles className="w-3 h-3" />AI가 만든 메뉴</Badge>}
            {(Object.keys(subs).length > 0 || Object.keys(custom).length > 0) && <Badge tone="yolk"><Replace className="w-3 h-3" />대체 재료 적용됨</Badge>}
            {omit.length > 0 && <Badge tone="yolk">{omit.map((o) => CATALOG_MAP[o].name.replace(/\(.*\)/, '')).join('·')} 빼고</Badge>}
            {ev.purchaseCount === 0 ? <Badge>지금 재료로 가능</Badge> : <Badge tone="yolk">{ev.purchaseCount}개 구매 필요</Badge>}
          </div>
          <h1 className="display text-[30px] lg:text-[38px]">{recipe.name}</h1>
          <p className="mt-1.5 text-sub text-[15px]">{base.desc}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-sub">
            <span className="inline-flex items-center gap-1"><Clock className="w-4 h-4" />{recipe.time}분</span>
            <span className="inline-flex items-center gap-1"><ChefHat className="w-4 h-4" />{SKILL_LABEL[recipe.difficulty]}</span>
            <span className="inline-flex items-center gap-1"><Flame className="w-4 h-4" />{SPICY_LABEL[recipe.spicy]}</span>
            <span>{recipe.tools.length ? recipe.tools.join(', ') : '불·도구 없이'}</span>
          </div>
        </div>
        <button className="btn btn-line self-start" aria-pressed={fav} onClick={() => update((d) => toggleFavorite(d, base.id))}><Heart className={`w-4 h-4 ${fav ? 'fill-cherry text-cherry' : ''}`} />{fav ? '즐겨찾기됨' : '즐겨찾기'}</button>
      </header>

      {hardBlock.length > 0 && <div className="mb-5"><InfoNote tone="cherry"><b>이 메뉴는 설정한 알레르기·섭취 금지 재료가 들어가요.</b> {hardBlock.join(', ')}. 해당 재료를 대체하거나 다른 메뉴를 고르세요.</InfoNote></div>}
      {softExcluded.length > 0 && hardBlock.length === 0 && <div className="mb-5"><InfoNote tone="sky">현재 추천 조건과 다른 점: {softExcluded.join(', ')}</InfoNote></div>}

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
        <div className="space-y-6">
          <section className="panel p-5">
            <SectionTitle>재료 (1인분)</SectionTitle>
            <div className="hidden sm:grid grid-cols-[1.5fr_.8fr_.8fr_.9fr_auto] gap-2 text-[12.5px] text-sub font-semibold pb-2 border-b border-line">
              <span>재료</span><span className="text-right">필요</span><span className="text-right">보유</span><span className="text-right">요리 후 남음</span><span className="w-[72px]" />
            </div>
            <ul className="divide-y divide-line">
              {recipe.ingredients.filter((ri) => CATALOG_MAP[ri.id]?.kind === 'ingredient').map((ri) => {
                const line = ev.lines.find((l) => l.catalogId === ri.id)
                const c = CATALOG_MAP[ri.id]
                const origId = Object.entries(subs).find(([, to]) => to === ri.id)?.[0]
                const customFrom = Object.entries(custom).find(([, v]) => v.to === ri.id)?.[0]
                const subOpts = substitutesFor(origId ?? ri.id, base.id, data.settings)
                const skipped = !line
                const blocked = blockedReasons(c.name, c.id, data.settings)
                return (
                  <li key={ri.id} className="grid grid-cols-2 sm:grid-cols-[1.5fr_.8fr_.8fr_.9fr_auto] gap-x-2 gap-y-1 py-3 items-center text-[14px]">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="font-semibold">{c.emoji} {c.name.replace(/\(.*\)/, '')} {ri.optional && <span className="text-[12px] text-mute font-normal">선택</span>}</p>
                      {origId && <p className="text-[12px] text-[#86600A]">{CATALOG_MAP[origId].name} 대신 · <button className="underline" onClick={() => setSubs((s) => { const n = { ...s }; delete n[origId]; return n })}>원래대로</button></p>}
                      {customFrom && <p className="text-[12px] text-[#86600A]">{CATALOG_MAP[customFrom].name} 대신 (AI 추천·추정량) · <button className="underline" onClick={() => setCustom((c) => { const n = { ...c }; delete n[customFrom]; return n })}>원래대로</button></p>}
                      {blocked.length > 0 && <p className="text-[12px] text-cherry">{blocked.join(', ')}</p>}
                      {skipped && ri.optional && !blocked.length && <p className="text-[12px] text-mute">없으면 빼고 만들어요</p>}
                    </div>
                    <span className="sm:text-right num"><span className="sm:hidden text-sub">필요 </span>{fmtQty(ri.amount ?? 0, c.unit)}</span>
                    <span className={`text-right num ${line && line.short > 0 ? 'text-cherry font-semibold' : 'text-sub'}`}><span className="sm:hidden">보유 </span>{fmtQty(line?.have ?? totalHave(data.inventory, ri.id), c.unit)}</span>
                    <span className="sm:text-right num text-basil font-semibold"><span className="sm:hidden text-sub font-normal">남음 </span>{line ? fmtQty(Math.max(0, line.have - line.use), c.unit) : '-'}</span>
                    <span className="text-right sm:w-[72px]">
                      {(subOpts.length > 0 || aiOn) && !customFrom && <button className="btn btn-ghost btn-sm !px-2 text-leaf" onClick={() => setSubFor(origId ?? ri.id)}><Replace className="w-4 h-4" />대체</button>}
                    </span>
                  </li>
                )
              })}
            </ul>
            {omit.length > 0 && <p className="mt-2 text-[13px] text-sub">빼고 만드는 재료: {omit.map((o) => <button key={o} className="underline mr-2" onClick={() => setOmit((x) => x.filter((y) => y !== o))}>{CATALOG_MAP[o].name.replace(/\(.*\)/, '')} 다시 넣기</button>)}</p>}
            <p className="mt-4 mb-2 text-[13.5px] font-semibold">양념</p>
            <div className="flex flex-wrap gap-1.5">
              {ev.seasonings.map((s) => (
                <span key={s.item.id} className={`h-7 px-2.5 rounded-full text-[13px] inline-flex items-center gap-1 ${s.have ? 'bg-paper text-sub' : s.optional ? 'border border-line text-mute' : 'bg-yolk-soft text-[#7A560B] font-semibold'}`}>
                  {s.item.name} {s.text}{!s.have && !s.optional && ' · 없음'}
                </span>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-line grid grid-cols-2 gap-3 text-[14px]">
              <div><p className="text-sub text-[12.5px]">추가 구매 예상 비용</p><p className="title text-[19px] num">{won(ev.purchaseCost)}</p></div>
              <div><p className="text-sub text-[12.5px]">사용하는 보유 재료 가치</p><p className="title text-[19px] num">{won(ev.usedValue)}</p></div>
              <p className="col-span-2 text-[12px] text-mute">실제 시세가 아닌 참고용 예상가로 계산했어요. 포장 단위로 사야 해서 실제 사용량보다 비용이 클 수 있어요.</p>
            </div>
            {ev.missing.length + ev.missingSeasonings.length > 0 && (
              <ul className="mt-3 text-[13.5px] text-sub space-y-0.5">
                {ev.missing.map((m) => { const pc = packCost(m.catalogId, m.short); return <li key={m.catalogId}>· {m.name} {fmtQty(m.short, m.unit)} 부족 → {CATALOG_MAP[m.catalogId].pack.label} {pc.packs}개 구매 (약 {won(pc.cost)})</li> })}
                {ev.missingSeasonings.map((m) => <li key={m.id}>· {m.name} 없음 → 1개 구매 (약 {won(m.pack.price)})</li>)}
              </ul>
            )}
          </section>

          <Leftovers ev={ev} tips={base.leftoverTips} />

          {ev.purchaseCount > 0 && <NoBuyAlternatives excludeId={base.id} />}

          <RecipeAsk recipe={recipe} onApply={applyAI} onOmit={doOmit} />

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary btn-lg" disabled={hardBlock.length > 0} onClick={cook}><Check className="w-4 h-4" />요리 완료 — 재고에서 빼기</button>
            {ev.purchaseCount > 0 && <button className="btn btn-soft btn-lg" onClick={toCart}><ShoppingBasket className="w-4 h-4" />부족한 재료 장보기에 담기</button>}
            <button className="btn btn-line btn-lg" disabled={hardBlock.length > 0} onClick={() => setPlanOpen(true)}><CalendarPlus className="w-4 h-4" />식단에 넣기</button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="panel p-5">
            <SectionTitle right={<span className="text-[13px] text-sub num">{checked.length}/{recipe.steps.length}</span>}>조리 순서</SectionTitle>
            <ol className="space-y-2">
              {recipe.steps.map((st, i) => {
                const on = checked.includes(i)
                return (
                  <li key={i}>
                    <button onClick={() => setChecked((c) => (on ? c.filter((x) => x !== i) : [...c, i]))} className={`w-full text-left flex gap-3 rounded-2xl px-3.5 py-3 transition ${on ? 'bg-pea/60 text-sub' : 'bg-paper'}`}>
                      <span className={`shrink-0 w-7 h-7 rounded-full grid place-items-center text-[13px] font-bold num ${on ? 'bg-leaf text-white' : 'bg-card border border-line-2'}`}>{on ? <Check className="w-4 h-4" /> : i + 1}</span>
                      <span className={`text-[15px] leading-relaxed ${on ? 'line-through decoration-1' : ''}`}>{st}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
            {recipe.tip && <p className="mt-4 text-[14px] bg-yolk-soft rounded-2xl px-4 py-3 text-[#6E5410]">💡 {recipe.tip}</p>}
            {base.ai && <p className="mt-3 text-[12.5px] text-mute flex gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" />AI가 만든 조리법이에요. 고기·해산물은 속까지 충분히 익혔는지 꼭 확인하세요.</p>}
          </section>

          <section className="panel p-5">
            <SectionTitle>평가</SectionTitle>
            <div className="flex gap-1 mb-3" role="radiogroup" aria-label="별점">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} role="radio" aria-checked={stars === n} aria-label={`${n}점`} onClick={() => setStars(n)} className="p-1"><Star className={`w-7 h-7 ${n <= stars ? 'fill-yolk text-yolk' : 'text-line-2'}`} /></button>
              ))}
            </div>
            <textarea className="field" rows={2} placeholder="다음 추천에 참고할 한 줄 (예: 간장 조금 줄이기)" value={comment} onChange={(e) => setComment(e.target.value)} />
            <button className="btn btn-soft btn-sm mt-3" disabled={!stars} onClick={() => { update((d) => rateRecipe(d, base, stars, comment.trim())); toast('평가를 저장했어요. 다음 추천에 반영돼요.') }}>평가 저장</button>
            {rating && <p className="mt-2 text-[12.5px] text-mute">{fmtDate(rating.date)}에 {rating.stars}점을 줬어요.</p>}
          </section>
        </div>
      </div>

      <SubstituteModal recipeId={base.id} recipe={recipe} fromId={subFor} onClose={() => setSubFor(null)} onApply={(from, to) => { setSubs((s) => ({ ...s, [from]: to })); setSubFor(null); toast('대체 재료를 적용했어요. 재고 계산과 장보기에 그대로 반영돼요.') }} onApplyAI={applyAI} onOmit={doOmit} />
      <AddToPlanModal open={planOpen} onClose={() => setPlanOpen(false)} recipeName={recipe.name} onAdd={(planId, date, slot) => {
        update((d) => {
          const plan = planId === 'new'
            ? emptyPlan(date, slot)
            : d.plans.find((p) => p.id === planId)!
          return upsertPlan(d, addRecipeToPlan(plan, recipe, ev, date, slot))
        })
        setPlanOpen(false)
        toast(`${fmtDate(date)} ${slot}에 넣었어요.`, 'ok', { label: '식단 보기', run: () => nav('/app/plan') })
      }} />
    </div>
  )
}

export function SubstituteModal({ recipeId, recipe, fromId, onClose, onApply, onApplyAI, onOmit }: {
  recipeId: string; recipe: Recipe; fromId: string | null; onClose: () => void
  onApply: (from: string, to: string) => void; onApplyAI: (from: string, to: string, amount: number | null) => void; onOmit: (id: string) => void
}) {
  const { data, aiOn } = useData()
  if (!fromId) return null
  const from = CATALOG_MAP[fromId]
  const opts = substitutesFor(fromId, recipeId, data.settings)
  const name = from.name.replace(/\(.*\)/, '')
  return (
    <Modal open onClose={onClose} title={`${name} 대신 쓸 재료`} wide>
      {opts.length === 0 && <p className="text-[14.5px] text-sub pb-3">이 요리에서 {name}을(를) 확실하게 대신할 재료가 등록돼 있지 않아요.{aiOn ? ' 아래에서 AI에게 물어볼 수 있어요.' : ''}</p>}
      <div className="space-y-3">
        {opts.map((o) => {
          const have = totalHave(data.inventory, o.to)
          const disabled = o.blocked.length > 0
          return (
            <div key={o.to} className={`tile p-4 ${disabled ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[20px]">{o.toEmoji}</span>
                <p className="font-bold text-[16px]">{o.toName.replace(/\(.*\)/, '')}</p>
                {have > 0 ? <Badge>보유 {fmtQty(have, o.toUnit)}</Badge> : <Badge tone="yolk">없음 · 장보기 필요</Badge>}
                {o.disliked && <Badge tone="line">싫어하는 재료</Badge>}
                {disabled && <Badge tone="cherry">{o.blocked.join(', ')}</Badge>}
              </div>
              <p className="mt-2 text-[14px] leading-relaxed">{o.reason}</p>
              <p className="mt-1 text-[13.5px] text-sub">맛: {o.taste} · 조리: {o.method}</p>
              <button className="btn btn-soft btn-sm mt-3" disabled={disabled} onClick={() => onApply(fromId, o.to)}>이걸로 바꾸기</button>
            </div>
          )
        })}
      </div>
      <div className="mt-4">
        <RecipeAsk recipe={recipe} focusId={fromId} onApply={onApplyAI} onOmit={onOmit} compact />
      </div>
    </Modal>
  )
}

/** 요리 후 남는 재료와 활용법 */
function Leftovers({ ev, tips }: { ev: ReturnType<typeof evaluateNow>; tips?: string[] }) {
  const left = ev.lines.filter((l) => l.have - l.use > 1e-6)
  if (!left.length && !tips?.length) return null
  return (
    <section className="panel p-5">
      <SectionTitle>남은 재료 활용</SectionTitle>
      {left.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {left.map((l) => (
            <span key={l.catalogId} className={`h-7 px-2.5 rounded-full text-[13px] inline-flex items-center gap-1 ${l.days != null && l.days <= 3 ? 'bg-yolk-soft text-[#7A560B] font-semibold' : 'bg-paper text-sub'}`}>
              {l.emoji} {l.name} {fmtQty(l.have - l.use, l.unit)} 남음{l.days != null && l.days <= 3 ? ` · D-${Math.max(0, l.days)}` : ''}
            </span>
          ))}
        </div>
      )}
      {tips && tips.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[14px]">{tips.map((t) => <li key={t} className="flex gap-2"><Sparkles className="w-4 h-4 text-leaf shrink-0 mt-0.5" />{t}</li>)}</ul>
      )}
      {left.some((l) => l.days != null && l.days <= 3) && <Link to="/app/plan" className="btn btn-soft btn-sm mt-3">남은 재료로 다음 끼니 계획하기</Link>}
    </section>
  )
}

/** "두부가 없는데 대체할 수 있나요?", "이 재료를 빼도 되나요?" — AI에게 질문 */
function RecipeAsk({ recipe, focusId, onApply, onOmit, compact }: { recipe: Recipe; focusId?: string; onApply: (from: string, to: string, amount: number | null) => void; onOmit: (id: string) => void; compact?: boolean }) {
  const { data, aiOn } = useData()
  const mains = recipe.ingredients.filter((i) => CATALOG_MAP[i.id]?.kind === 'ingredient')
  const focusName = focusId ? CATALOG_MAP[focusId].name.replace(/\(.*\)/, '') : mains[0] ? CATALOG_MAP[mains[0].id].name.replace(/\(.*\)/, '') : ''
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ans, setAns] = useState<SubAnswer | null>(null)
  const suggestions = [`${focusName}${josa(focusName, '이', '가')} 없는데 다른 재료로 대체할 수 있나요?`, `${focusName}${josa(focusName, '을', '를')} 빼도 요리가 가능한가요?`, ...(compact ? [] : ['우유 대신 사용할 수 있는 재료가 있나요?'])]
  const ask = async (question: string) => {
    if (!question.trim()) return
    setBusy(true); setErr(null); setQ('')
    try { setAns(await aiSubQA(data, recipe, question, focusId ? focusName : undefined)) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  // 질문 대상 재료 찾기: AI가 알려준 target → 포커스 재료
  const targetId = (() => {
    const t = ans?.target ? resolveCatalog(ans.target) : null
    if (t && recipe.ingredients.some((i) => i.id === t)) return t
    return focusId ?? null
  })()
  return (
    <section className={compact ? 'rounded-2xl bg-paper p-4' : 'panel p-5'}>
      <p className={`title ${compact ? 'text-[15px]' : 'text-[17px]'} flex items-center gap-2`}><Sparkles className="w-4 h-4 text-leaf" />AI에게 재료 질문하기</p>
      {!aiOn ? (
        <p className="mt-2 text-[13.5px] text-[#86600A]">AI가 연결되지 않아 질문할 수 없어요. 위의 등록된 대체 규칙은 그대로 쓸 수 있어요.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestions.map((s) => <button key={s} type="button" disabled={busy} className="h-8 px-3 rounded-full border border-line-2 bg-white text-[13px] hover:border-leaf disabled:opacity-50" onClick={() => ask(s)}>{s}</button>)}
          </div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q) }}>
            <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 두부가 없는데 다른 재료로 대체할 수 있나요?" aria-label="재료 질문" />
            <button className="btn btn-primary" disabled={busy || !q.trim()}>{busy ? <Loader2 className="w-4 h-4 spin" /> : '질문'}</button>
          </form>
          {busy && <p className="mt-2 text-[13px] text-sub">AI가 생각하는 중이에요.</p>}
          {err && <p className="mt-2 text-[13.5px] text-cherry">{err}</p>}
          {ans && (
            <div className="mt-3 space-y-2">
              <p className="text-[14.5px] leading-relaxed bg-card rounded-xl px-4 py-3 border border-line">{ans.answer}</p>
              {ans.canOmit === true && targetId && <button className="btn btn-line btn-sm" onClick={() => onOmit(targetId)}>{CATALOG_MAP[targetId].name.replace(/\(.*\)/, '')} 빼고 만들기</button>}
              {ans.options.map((o) => {
                const cid = resolveCatalog(o.name)
                const c = cid ? CATALOG_MAP[cid] : null
                const blocked = blockedReasons(o.name, cid, data.settings)
                const amount = c && o.amount != null ? toBase(cid, o.amount, o.unit ?? c.unit) : null
                const have = cid ? totalHave(data.inventory, cid) : 0
                return (
                  <div key={o.name} className="tile p-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="sky">AI 제안</Badge><p className="font-bold">{o.name}</p>
                      {o.amount != null && <span className="text-[13px] text-sub">{o.amount}{o.unit ?? ''} (추정)</span>}
                      {c && (have > 0 ? <Badge>보유 {fmtQty(have, c.unit)}</Badge> : <Badge tone="yolk">없음</Badge>)}
                      {blocked.length > 0 && <Badge tone="cherry">{blocked.join(', ')} — 쓸 수 없음</Badge>}
                    </div>
                    <p className="mt-1.5 text-[13.5px]">{o.reason}</p>
                    {(o.taste || o.method) && <p className="mt-1 text-[13px] text-sub">맛: {o.taste} · 조리: {o.method}</p>}
                    {!c && <p className="mt-1.5 text-[12.5px] text-mute">재료 정보에 없는 이름이라 재고 계산에 반영할 수 없어요. 참고용이에요.</p>}
                    {c && !blocked.length && targetId && targetId !== cid && (
                      <button className="btn btn-soft btn-sm mt-2" onClick={() => onApply(targetId, cid!, amount)}>{CATALOG_MAP[targetId].name.replace(/\(.*\)/, '')} 대신 이걸로 바꾸기</button>
                    )}
                    {c && !blocked.length && !targetId && <p className="mt-1.5 text-[12.5px] text-mute">어떤 재료를 바꿀지 알 수 없어요. 재료 옆 "대체" 버튼에서 다시 물어봐 주세요.</p>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function AddToPlanModal({ open, onClose, onAdd, recipeName }: { open: boolean; onClose: () => void; onAdd: (planId: string, date: string, slot: Slot) => void; recipeName: string }) {
  const { data } = useData()
  const active = data.plans.filter((p) => p.status === 'active')
  const [planId, setPlanId] = useState<string>('new')
  const [date, setDate] = useState(today())
  const [slot, setSlot] = useState<Slot>('저녁')
  return (
    <Modal open={open} onClose={onClose} title={`${recipeName} 식단에 넣기`}
      footer={<><button className="btn btn-line" onClick={onClose}>취소</button><button className="btn btn-primary" onClick={() => onAdd(planId, date, slot)}>넣기</button></>}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="plan-sel">어느 식단에</Label>
          <select id="plan-sel" className="field" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="new">새 식단 만들기</option>
            {active.map((p) => <option key={p.id} value={p.id}>{p.title} ({fmtDate(p.startDate)}~)</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="plan-date">날짜</Label>
          <input id="plan-date" type="date" className="field" min={today()} max={addDays(today(), 30)} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div><Label>끼니</Label><Segmented value={slot} onChange={setSlot} options={(['아침', '점심', '저녁'] as Slot[]).map((s) => ({ value: s, label: s }))} /></div>
        <p className="text-[13px] text-sub">식단에 넣으면 이 끼니까지의 재고를 계산해서 부족한 재료가 장보기 목록에 자동으로 들어가요.</p>
      </div>
    </Modal>
  )
}


/** 장보기가 필요한 메뉴일 때: 지금 재료만으로 만들 수 있는 다른 메뉴 */
function NoBuyAlternatives({ excludeId }: { excludeId: string }) {
  const { data } = useData()
  const alts = useMemo(() => recommend(data, { quick: ['noBuy'], exclude: [excludeId], limit: 3 }).items, [data, excludeId])
  if (!alts.length) return null
  return (
    <section className="panel p-5">
      <SectionTitle>장보기 없이 만들 수 있는 다른 메뉴</SectionTitle>
      <ul className="space-y-2">
        {alts.map((a) => (
          <li key={a.recipe.id}>
            <Link to={`/app/recipe/${a.recipe.id}`} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5 hover:bg-pea/60">
              <Plate emoji={a.recipe.emoji} size={44} tone={a.urgent.length ? '#FBEFCF' : '#EAF0E2'} />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[15px] truncate">{a.recipe.name}</span>
                <span className="block text-[12.5px] text-sub truncate">{a.recipe.time}분 · {SKILL_LABEL[a.recipe.difficulty]}{a.urgent.length ? ` · ${a.urgent.join('·')} 소진` : ''}</span>
              </span>
              <Badge tone="basil">구매 0</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
