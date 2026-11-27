import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Wand2 } from 'lucide-react'
import { useData } from '../store/AppStore'
import { makePlan, SLOT_ORDER } from '../lib/planner'
import { upsertPlan } from '../lib/actions'
import type { Plan, Slot } from '../lib/types'
import { fmtDate, today, won } from '../lib/util'
import { Empty, Label, PageHeader, Segmented, Badge } from './ui'
import { PlanView } from './PlanView'

export interface PlanPageProps {
  kind: Plan['kind']
  title: string
  desc: ReactNode
  dayOptions: number[]
  defaultDays: number
  modeOptions: { value: Plan['mode']; label: string; desc: string }[]
  defaultMode: Plan['mode']
  budget?: boolean
  intro?: ReactNode
  createLabel: string
}

export function PlanPage(p: PlanPageProps) {
  const { data, update, toast } = useData()
  const [params, setParams] = useSearchParams()
  const plans = data.plans.filter((x) => x.kind === p.kind)
  const selectedId = params.get('id') ?? plans.find((x) => x.status === 'active')?.id ?? null
  const selected = plans.find((x) => x.id === selectedId) ?? null
  const [creating, setCreating] = useState(plans.length === 0)
  const [start, setStart] = useState(today())
  const [days, setDays] = useState(p.defaultDays)
  const [slots, setSlots] = useState<Slot[]>(data.settings.slots.length ? data.settings.slots : ['점심', '저녁'])
  const [mode, setMode] = useState<Plan['mode']>(p.defaultMode)
  const [budget, setBudget] = useState(String(Math.round((data.settings.dailyBudget || 10000) * p.defaultDays)))
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (p.budget) setBudget(String(Math.round((data.settings.dailyBudget || 10000) * days))) }, [days, p.budget, data.settings.dailyBudget])

  const create = () => {
    if (!slots.length) return toast('끼니를 하나 이상 골라 주세요.', 'warn')
    if (p.budget && !(Number(budget) >= 0)) return toast('예산을 숫자로 입력해 주세요.', 'warn')
    setBusy(true)
    setTimeout(() => {
      const plan = makePlan(data, { kind: p.kind, startDate: start, days, slots, mode, budget: p.budget ? Number(budget) : undefined })
      update((d) => upsertPlan(d, plan))
      setParams({ id: plan.id })
      setCreating(false)
      setBusy(false)
      const empty = plan.meals.filter((m) => !m.recipeId).length
      toast(empty ? `계획을 만들었어요. ${empty}끼는 조건에 맞는 메뉴가 없어 비워 뒀어요.` : '계획을 만들었어요.', empty ? 'warn' : 'ok')
    }, 30)
  }

  return (
    <div>
      <PageHeader title={p.title} desc={p.desc} actions={!creating && <button className="btn btn-primary" onClick={() => setCreating(true)}><Wand2 className="w-4 h-4" />{p.createLabel}</button>} />
      {p.intro}

      {creating && (
        <div className="panel p-5 sm:p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-5">
            <div><Label htmlFor="pl-start">시작 날짜</Label><input id="pl-start" type="date" className="field" min={today()} value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>기간</Label><Segmented value={days} onChange={setDays} options={p.dayOptions.map((d) => ({ value: d, label: d === 1 ? '오늘 하루' : `${d}일` }))} /></div>
            <div>
              <Label>끼니</Label>
              <div className="flex gap-1.5">{SLOT_ORDER.map((s) => <button key={s} className="chip" aria-pressed={slots.includes(s)} onClick={() => setSlots((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}>{s}</button>)}</div>
            </div>
            {p.budget && (
              <div>
                <Label htmlFor="pl-budget" hint={`하루 ${won(data.settings.dailyBudget)} × ${days}일`}>이 기간 추가 구매 예산(원)</Label>
                <input id="pl-budget" className="field num" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ''))} />
              </div>
            )}
            <div className="md:col-span-2">
              <Label>재료 구매</Label>
              <div className="grid sm:grid-cols-3 gap-2">
                {p.modeOptions.map((m) => (
                  <button key={m.value} onClick={() => setMode(m.value)} aria-pressed={mode === m.value} className={`text-left rounded-2xl border p-3.5 transition ${mode === m.value ? 'border-basil bg-pea/50' : 'border-line-2 bg-white hover:border-leaf'}`}>
                    <p className="font-bold text-[14.5px]">{m.label}</p><p className="text-[13px] text-sub mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-[13px] text-sub">설정한 알레르기·조리 시간·도구·매운 정도를 지켜요. 끼니마다 그 시점에 남은 재고로 계산하고, 기한이 지나는 재료는 그날부터 쓰지 않아요.</p>
          <div className="mt-5 flex gap-2">
            <button className="btn btn-primary btn-lg" onClick={create} disabled={busy}>{busy && <Loader2 className="w-4 h-4 spin" />}{p.createLabel}</button>
            {plans.length > 0 && <button className="btn btn-ghost btn-lg" onClick={() => setCreating(false)}>닫기</button>}
          </div>
        </div>
      )}

      {plans.length > 1 && (
        <div className="scroll-x flex gap-2 mb-6">
          {plans.map((pl) => (
            <button key={pl.id} onClick={() => setParams({ id: pl.id })} className={`shrink-0 h-10 px-4 rounded-full text-[13.5px] font-semibold border inline-flex items-center gap-2 ${pl.id === selected?.id ? 'bg-basil text-paper border-basil' : 'bg-card border-line text-sub'}`}>
              {pl.title} <span className="font-normal opacity-80">{fmtDate(pl.startDate, false)}~</span>
              {pl.status !== 'active' && <Badge tone="line" className={pl.id === selected?.id ? '!text-paper !border-white/40' : ''}>{pl.status === 'done' ? '완료' : '취소'}</Badge>}
            </button>
          ))}
        </div>
      )}

      {selected ? <PlanView plan={selected} /> : !creating && plans.length > 0 ? null : !creating && (
        <div className="panel"><Empty emoji="🗓️" title="아직 계획이 없어요" action={<button className="btn btn-primary" onClick={() => setCreating(true)}>{p.createLabel}</button>} /></div>
      )}
      {!selected && plans.length > 0 && !creating && <p className="text-sub">위에서 계획을 골라 주세요.</p>}
    </div>
  )
}
