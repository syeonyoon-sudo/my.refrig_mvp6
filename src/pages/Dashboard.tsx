import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Camera, ChefHat, ListChecks, PenLine, Receipt, Snowflake, Sparkles, CalendarDays, Leaf, ShoppingBasket } from 'lucide-react'
import { useData } from '../store/AppStore'
import { recommend } from '../lib/engine'
import { rescuePlan } from '../lib/rescue'
import { fridgeStats, usageStats, weekMeals, weekSpend } from '../lib/metrics'
import { CATALOG_MAP, CATEGORY_EMOJI, CATEGORY_TINT } from '../lib/catalog'
import { expiryInfo } from '../lib/expiry'
import { fmtQty } from '../lib/units'
import { fmtDate, relDay, today, won } from '../lib/util'
import { addSamples, onboard } from './_helpers'
import { ExpiryBadge, FreshRing, Meter, Plate, RemainBar } from '../components/ui'
import { RecipeCard } from '../components/RecipeCard'
import { QuickAdd } from '../components/QuickAdd'

export default function Dashboard() {
  const { data, update, toast } = useData()
  const [quick, setQuick] = useState(false)
  const stats = fridgeStats(data)
  const rec = useMemo(() => recommend(data, { limit: 3 }), [data])
  const plan = useMemo(() => rescuePlan(data), [data])
  const name = data.settings.nickname || '자취생'

  if (data.inventory.length === 0 && data.plans.length === 0) {
    return (
      <div>
        <h1 className="display text-[30px] lg:text-[38px]">{name}님, 냉장고부터 채워 볼까요?</h1>
        <p className="mt-2 text-sub text-[15.5px] max-w-[56ch]">재료를 알려 주면 기한이 가까운 재료부터 쓰는 메뉴를 바로 골라 드려요.</p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => setQuick(true)} className="panel p-6 text-left hover:border-leaf transition border-basil ring-1 ring-basil/20">
            <ListChecks className="w-7 h-7 text-leaf" />
            <p className="title text-[18px] mt-4">체크해서 한 번에</p>
            <p className="text-sub text-[14px] mt-1">자주 쓰는 재료를 눌러 고르기만 하면 돼요.</p>
          </button>
          {[
            { to: '/app/fridge/scan', i: Camera, t: '냉장고 사진으로', d: '사진 속 재료를 AI가 찾아요.' },
            { to: '/app/fridge/receipt', i: Receipt, t: '영수증으로', d: '산 재료와 가격을 한 번에.' },
            { to: '/app/fridge?add=1', i: PenLine, t: '직접 입력', d: '이름·수량·기한을 하나씩.' },
          ].map((x) => (
            <Link key={x.t} to={x.to} className="panel p-6 hover:border-leaf transition">
              <x.i className="w-7 h-7 text-leaf" />
              <p className="title text-[18px] mt-4">{x.t}</p>
              <p className="text-sub text-[14px] mt-1">{x.d}</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 panel p-5 flex flex-wrap items-center gap-4 bg-pea/50 border-pea-2">
          <Sparkles className="w-6 h-6 text-basil" />
          <p className="flex-1 min-w-[220px] text-[14.5px]">둘러보고 싶다면 예시 재료 12가지로 체험해 보세요. 마이페이지에서 한 번에 지울 수 있어요.</p>
          <button className="btn btn-primary" onClick={() => { update((d) => onboard(addSamples(d))); toast('예시 재료를 넣었어요.') }}>예시 재료로 체험하기</button>
        </div>
        <QuickAdd open={quick} onClose={() => setQuick(false)} />
      </div>
    )
  }

  const urgent = plan.urgent
  const shelf = data.inventory
    .filter((it) => !it.spoiled && (expiryInfo(it.expiresAt).days ?? -1) > 3)
    .sort((a, b) => (expiryInfo(a.expiresAt).days ?? 999) - (expiryInfo(b.expiresAt).days ?? 999))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sub text-[14px]">{fmtDate(today())}</p>
          <h1 className="display text-[28px] lg:text-[34px] mt-1">{name}님의 냉장고</h1>
          <div className="mt-2 flex gap-4 text-[14px] text-sub">
            <Link to="/app/fridge" className="hover:text-ink">보유 <b className="text-ink num">{stats.count}</b></Link>
            <span>3일 이내 <b className="text-[#A5591F] num">{stats.urgent}</b></span>
            {stats.expired > 0 && <Link to="/app/fridge" className="hover:text-ink">기한 지남 <b className="text-cherry num">{stats.expired}</b></Link>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setQuick(true)}><ListChecks className="w-4 h-4" />재료 추가</button>
          <Link to="/app/fridge/scan" className="btn btn-line" aria-label="사진으로 등록"><Camera className="w-4 h-4" /><span className="hidden sm:inline">사진</span></Link>
        </div>
      </div>

      {/* 1. 먼저 써야 할 재료 + 다 쓰는 순서 */}
      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-5">
        <section className="panel p-5 sm:p-6 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="title text-[18px]">먼저 써야 할 재료</h2>
            <Link to="/app/fridge" className="text-[13.5px] font-semibold text-leaf">냉장고 전체</Link>
          </div>
          {urgent.length ? (
            <ul className="mt-4 space-y-2">
              {urgent.slice(0, 5).map((u) => {
                const it = u.items[0]
                const c = u.catalogId ? CATALOG_MAP[u.catalogId] : null
                const qty = u.items.reduce((s, x) => s + (x.unit === it.unit ? x.qty : 0), 0)
                return (
                  <li key={u.key} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5">
                    <FreshRing emoji={c?.emoji ?? CATEGORY_EMOJI[it.category]} image={it.image} expiresAt={it.expiresAt} size={46} tint={CATEGORY_TINT[it.category]} />
                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1.5 font-bold text-[15px]"><span className="truncate">{u.name}</span><ExpiryBadge expiresAt={u.items.map((x) => x.expiresAt!).sort()[0]} /></p>
                      <p className="flex items-center gap-2 text-[12.5px] text-sub num whitespace-nowrap">{fmtQty(qty, it.unit)} <RemainBar qty={qty} initial={u.items.length === 1 ? it.initialQty : undefined} /></p>
                    </div>
                    {u.menuCount > 0 ? (
                      <Link to={`/app/recommend?use=${u.catalogId}`} className="btn btn-soft btn-sm shrink-0">메뉴 {u.menuCount}개<ArrowRight className="w-3.5 h-3.5" /></Link>
                    ) : (
                      <span className="shrink-0 text-[12px] text-mute text-right leading-tight">맞는 메뉴 없음</span>
                    )}
                  </li>
                )
              })}
              {urgent.length > 5 && <li className="text-[13px] text-sub px-1">외 {urgent.length - 5}개 · <Link to="/app/fridge" className="text-leaf font-semibold">모두 보기</Link></li>}
            </ul>
          ) : (
            <>
              <p className="mt-3 text-[14.5px] text-sub">3일 안에 기한이 끝나는 재료가 없어요. 다음으로 가까운 재료예요.</p>
              <ul className="mt-4 scroll-x flex gap-4 pb-1">
                {shelf.slice(0, 8).map((it) => {
                  const c = it.catalogId ? CATALOG_MAP[it.catalogId] : null
                  const e = expiryInfo(it.expiresAt)
                  return (
                    <li key={it.id} className="w-[72px] shrink-0 flex flex-col items-center text-center">
                      <FreshRing emoji={c?.emoji ?? CATEGORY_EMOJI[it.category]} image={it.image} expiresAt={it.expiresAt} size={58} tint={CATEGORY_TINT[it.category]} />
                      <span className="mt-1.5 text-[13px] font-semibold leading-tight line-clamp-1">{it.name}</span>
                      <span className="text-[12px] num text-sub">{e.level === 'none' ? fmtQty(it.qty, it.unit) : e.label}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {stats.expired > 0 && <p className="mt-4 text-[13px] text-cherry">기한 지난 재료 {stats.expired}개는 추천에서 뺐어요. <Link to="/app/fridge" className="underline font-semibold">확인하고 정리하기</Link></p>}
        </section>

        <section className="panel p-5 sm:p-6 min-w-0 flex flex-col">
          <h2 className="title text-[18px]">버리지 않고 다 쓰는 순서</h2>
          {plan.steps.length ? (
            <>
              <p className="mt-1 text-[13.5px] text-sub">임박 재료 {urgent.length}개 중 {urgent.length - plan.leftovers.length}개를 {plan.steps.length}끼로 소진해요.</p>
              <ol className="mt-4 space-y-2">
                {plan.steps.map((st, i) => (
                  <li key={st.ev.recipe.id}>
                    <Link to={`/app/recipe/${st.ev.recipe.id}`} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5 hover:border-leaf">
                      <span className="w-6 h-6 rounded-full bg-basil text-paper text-[12px] font-bold grid place-items-center shrink-0 num">{i + 1}</span>
                      <Plate emoji={st.ev.recipe.emoji} size={40} tone="#FBEFCF" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-[15px] truncate">{st.ev.recipe.name}</span>
                        <span className="block text-[12.5px] text-[#7A560B] truncate">{st.covers.map((c) => c.name).join('·')} 소진 · {st.ev.recipe.time}분{st.ev.purchaseCount ? ` · ${st.ev.purchaseCount}개 구매` : ''}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="mt-3 text-[14.5px] text-sub">{urgent.length ? '지금 조건으로는 임박 재료를 쓰는 메뉴가 없어요.' : '급하게 쓸 재료가 없어요. 아래 추천 메뉴를 확인해 보세요.'}</p>
          )}
          {plan.leftovers.length > 0 && (
            <ul className="mt-3 space-y-1 text-[13px] text-sub">
              {plan.leftovers.map((l) => <li key={l.entry.key} className="flex gap-1.5"><Snowflake className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#2F5468]" /><span><b className="text-ink">{l.entry.name}</b> · {l.tip}</span></li>)}
            </ul>
          )}
          {urgent.length > 0 && <div className="mt-auto pt-4"><Link to="/app/empty" className="btn btn-line btn-sm"><CalendarDays className="w-4 h-4" />며칠 식단으로 나눠 쓰기</Link></div>}
        </section>
      </div>

      {/* 2. 지금 바로 만들 수 있는 메뉴 */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="title text-[19px]">지금 바로 만들 수 있어요</h2>
          <Link to="/app/recommend" className="text-[13.5px] font-semibold text-leaf inline-flex items-center gap-1"><ChefHat className="w-4 h-4" />추천 더 보기</Link>
        </div>
        {rec.items.length ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rec.items.map((ev) => <RecipeCard key={ev.recipe.id} ev={ev} compact />)}
          </div>
        ) : (
          <div className="panel p-5 text-[14.5px] text-sub">
            지금 조건으로 만들 수 있는 메뉴가 없어요. 재료를 더 넣거나 조리 시간·추가 구매 조건을 넓혀 보세요.
            <div className="mt-3 flex gap-2"><button className="btn btn-soft btn-sm" onClick={() => setQuick(true)}>재료 추가</button><Link to="/app/recommend" className="btn btn-line btn-sm">조건 바꾸기</Link></div>
          </div>
        )}
      </section>

      <Summary />
      <QuickAdd open={quick} onClose={() => setQuick(false)} />
    </div>
  )
}

/** 이번 주 식단 · 식재료 활용 · 장보기를 한 줄로 */
function Summary() {
  const { data } = useData()
  const week = weekMeals(data).filter((m) => m.status === 'planned')
  const use = usageStats(data)
  const spend = weekSpend(data)
  const shop = data.shopping.filter((s) => !s.checked)
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Link to="/app/plan" className="panel p-5 hover:border-leaf transition block">
        <div className="flex items-center justify-between"><h2 className="title text-[16px]">이번 주 식단</h2><CalendarDays className="w-5 h-5 text-leaf" /></div>
        {week.length ? (
          <ul className="mt-3 space-y-1.5">
            {week.slice(0, 3).map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-[14px]">
                <span className="w-16 text-[12.5px] text-sub shrink-0">{relDay(m.date)} {m.slot}</span>
                <span aria-hidden>{m.emoji}</span><span className="font-semibold truncate">{m.name}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-[14px] text-sub">계획이 없어요. 레시피에서 "식단에 넣기"를 누르거나 식단을 만들어 보세요.</p>}
      </Link>
      <div className="panel p-5">
        <div className="flex items-center justify-between"><h2 className="title text-[16px]">살린 재료 (30일)</h2><Leaf className="w-5 h-5 text-leaf" /></div>
        <p className="mt-3 title text-[26px] num">{use.rescued}<span className="text-[15px] text-sub font-semibold ml-1">번</span></p>
        <p className="text-[13px] text-sub">기한 3일 이내 재료를 요리에 썼어요{use.rescuedValue > 0 ? ` · 약 ${won(use.rescuedValue)}어치` : ''}</p>
        {use.rate != null && <div className="mt-3"><Meter value={use.rate} /><p className="mt-1 text-[12px] text-mute">활용률 {Math.round(use.rate * 100)}% (사용 {use.usedCount} · 버림 {use.discardCount})</p></div>}
      </div>
      <Link to="/app/shopping" className="panel p-5 hover:border-leaf transition block">
        <div className="flex items-center justify-between"><h2 className="title text-[16px]">장보기 · 이번 주 식비</h2><ShoppingBasket className="w-5 h-5 text-leaf" /></div>
        <p className="mt-3 text-[14px]">{shop.length ? <>사야 할 재료 <b className="num">{shop.length}</b>개 · <span className="text-sub">{shop.slice(0, 3).map((s) => s.name).join(', ')}</span></> : <span className="text-sub">사야 할 재료가 없어요.</span>}</p>
        <p className="mt-2 text-[13px] text-sub num">{won(spend.spent)} / 예산 {won(spend.budget)}</p>
        <div className="mt-2"><Meter value={spend.budget ? spend.spent / spend.budget : 0} tone={spend.remain < 0 ? 'cherry' : spend.spent / Math.max(1, spend.budget) > 0.8 ? 'yolk' : 'basil'} /></div>
      </Link>
    </div>
  )
}
