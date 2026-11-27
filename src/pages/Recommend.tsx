import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, RefreshCw, Sparkles, SlidersHorizontal, X } from 'lucide-react'
import { useData } from '../store/AppStore'
import { recommend, evaluateRecipe, makeCtx, SKILL_LABEL, SPICY_LABEL, type Evaluation } from '../lib/engine'
import { buildPool } from '../lib/inventory'
import { aiRecommend } from '../lib/ai'
import { RECIPES } from '../lib/recipes'
import { addHistory } from '../lib/actions'
import { RecipeCard } from '../components/RecipeCard'
import { Empty, InfoNote, PageHeader, Segmented, Toggle, SectionTitle, Badge } from '../components/ui'
import { AISetup } from '../components/AISetup'
import { expiryInfo } from '../lib/expiry'
import { CATALOG_MAP } from '../lib/catalog'
import { itemCatalogId } from '../lib/inventory'
import type { Settings } from '../lib/types'
import { josa, relDay } from '../lib/util'

export default function Recommend() {
  const { data, update, aiOn, ai, toast } = useData()
  const s = data.settings
  const [params, setParams] = useSearchParams()
  const use = params.get('use') && CATALOG_MAP[params.get('use')!] ? params.get('use')! : undefined
  const useName = use ? CATALOG_MAP[use].name.replace(/\(.*\)/, '') : ''
  const setUse = (id: string | null) => { setExclude([]); if (id) params.set('use', id); else params.delete('use'); setParams(params, { replace: true }) }
  const [exclude, setExclude] = useState<string[]>([])
  const [aiItems, setAiItems] = useState<{ ev: Evaluation; reason: string }[]>([])
  const [aiRejected, setAiRejected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [aiErr, setAiErr] = useState<string | null>(null)

  const res = useMemo(() => recommend(data, { exclude, limit: 3, use }), [data, exclude, use])
  const setS = (p: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...p } }))

  useEffect(() => {
    if (!res.items.length) return
    update((d) => res.items.reduce((acc, e) => addHistory(acc, e.recipe, 'recommend'), d))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.items.map((e) => e.recipe.id).join()])

  const urgent = data.inventory
    .map((it) => ({ it, e: expiryInfo(it.expiresAt) }))
    .filter(({ it, e }) => !it.spoiled && (e.level === 'today' || e.level === 'soon'))
    .sort((a, b) => (a.e.days ?? 0) - (b.e.days ?? 0))

  const reroll = () => {
    const ids = res.items.map((e) => e.recipe.id)
    if (!ids.length) { setExclude([]); return }
    setExclude((x) => [...x, ...ids])
  }

  const askAI = async () => {
    setBusy(true); setAiErr(null)
    try {
      const shownNames = [...res.items.map((e) => e.recipe.name), ...aiItems.map((x) => x.ev.recipe.name)]
      const r = await aiRecommend(data, shownNames)
      // AI 결과도 같은 규칙으로 다시 검사 (알레르기·시간·도구·기한 지난 재료)
      const ctx = makeCtx(data)
      const pool = buildPool(data.inventory)
      const ok: { ev: Evaluation; reason: string }[] = []
      const rejected = [...r.rejected]
      for (const x of r.recipes) {
        const ev = evaluateRecipe(x.recipe, pool, ctx, { allowPurchase: s.allowPurchase, maxPurchase: s.maxPurchase })
        if (ev.ok) ok.push({ ev, reason: x.reason })
        else rejected.push(`${x.recipe.name}: ${ev.excluded.join(', ')}`)
      }
      setAiItems(ok)
      setAiRejected(rejected)
      if (ok.length) update((d) => ({ ...d, aiRecipes: [...ok.map((x) => x.ev.recipe), ...d.aiRecipes.filter((a) => !ok.some((o) => o.ev.recipe.id === a.id))].slice(0, 40) }))
      if (!ok.length) setAiErr('AI가 제안한 메뉴가 모두 조건 검사에서 걸러졌어요. 아래 규칙 기반 추천을 이용하거나 조건을 바꿔 보세요.')
    } catch (e) {
      setAiErr((e as Error).message)
      toast('AI 추천에 실패해서 규칙 기반 추천만 보여 드려요.', 'warn')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <PageHeader
        title="맞춤 메뉴 추천"
        desc="기한이 가까운 재료부터, 내 실력·시간·도구에 맞는 메뉴를 골라요."
        actions={<Link to="/app/mypage#prefs" className="btn btn-line"><SlidersHorizontal className="w-4 h-4" />취향·알레르기</Link>}
      />

      <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
        <aside className="panel p-5 space-y-5 lg:sticky lg:top-[84px]">
          <div>
            <p className="text-[13.5px] font-semibold mb-2">조리 가능 시간</p>
            <Segmented size="sm" value={s.maxTime} onChange={(v) => setS({ maxTime: v })} options={[10, 20, 30, 60].map((v) => ({ value: v as Settings['maxTime'], label: `${v}분` }))} />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold mb-2">요리 실력</p>
            <Segmented size="sm" value={s.skill} onChange={(v) => setS({ skill: v })} options={([1, 2, 3] as const).map((v) => ({ value: v, label: SKILL_LABEL[v] }))} />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold mb-2">매운 정도 (최대)</p>
            <Segmented size="sm" value={s.spicy} onChange={(v) => setS({ spicy: v })} options={([0, 1, 2, 3] as const).map((v) => ({ value: v, label: SPICY_LABEL[v] }))} />
          </div>
          <Toggle checked={s.allowPurchase} onChange={(v) => setS({ allowPurchase: v })} label="추가 구매 허용" desc={s.allowPurchase ? `양념 포함 최대 ${s.maxPurchase}개까지` : '있는 재료로만'} />
          {s.allowPurchase && (
            <div>
              <p className="text-[13.5px] font-semibold mb-2">최대 구매 개수</p>
              <Segmented size="sm" value={s.maxPurchase} onChange={(v) => setS({ maxPurchase: v })} options={[1, 2, 3].map((v) => ({ value: v, label: `${v}개` }))} />
            </div>
          )}
          <div className="text-[13px] text-sub leading-relaxed border-t border-line pt-4">
            <p>조리도구: {s.tools.join(', ') || '없음'}</p>
            <p>알레르기: {s.allergens.join(', ') || '없음'}{s.banned.length ? ` / 금지: ${s.banned.join(', ')}` : ''}</p>
            <p>싫어하는 재료: {s.dislikes.join(', ') || '없음'}</p>
            <p>좋아하는 맛: {s.tastes.join(', ') || '상관없음'}</p>
          </div>
        </aside>

        <div className="space-y-6 min-w-0">
          {(urgent.length > 0 || use) && (
            <div className="panel p-4 flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold mr-1">먼저 쓸 재료</span>
              {urgent.map(({ it, e }) => {
                const cid = itemCatalogId(it)
                const on = !!cid && cid === use
                return cid
                  ? <button key={it.id} className="chip !h-8 !text-[13px]" aria-pressed={on} onClick={() => setUse(on ? null : cid)}>{it.name} · {e.days === 0 ? '오늘까지' : `${relDay(it.expiresAt!)}까지`}</button>
                  : <Badge key={it.id} tone="yolk">{it.name} {e.days === 0 ? '오늘까지' : `${relDay(it.expiresAt!)}까지`}</Badge>
              })}
              {use && !urgent.some(({ it }) => itemCatalogId(it) === use) && <button className="chip !h-8 !text-[13px]" aria-pressed onClick={() => setUse(null)}>{useName}</button>}
              {use && <button className="ml-auto inline-flex items-center gap-1 text-[13px] text-sub hover:text-ink" onClick={() => setUse(null)}><X className="w-3.5 h-3.5" />전체 보기</button>}
            </div>
          )}
          {res.expiredUsedWarning.length > 0 && <InfoNote tone="cherry">기한이 지난 {res.expiredUsedWarning.join(', ')}은(는) 추천에 쓰지 않았어요. 상태를 확인하고 냉장고에서 정리해 주세요.</InfoNote>}

          {aiOn && (
            <div>
              <SectionTitle right={<button className="btn btn-primary btn-sm" onClick={askAI} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 spin" /> : <Sparkles className="w-4 h-4" />}{busy ? 'AI가 고르는 중' : aiItems.length ? 'AI에게 다시 받기' : 'AI에게 새 메뉴 받기'}</button>}>AI가 제안하는 새 메뉴</SectionTitle>
              <p className="text-[13.5px] text-sub mb-3">재고·기한·취향을 보고 새 메뉴를 만들어요. 결과도 같은 규칙으로 다시 검사해요.</p>
              {aiErr && <InfoNote tone="cherry">{aiErr}</InfoNote>}
              {aiItems.length > 0 && <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4 mt-3">{aiItems.map((x) => <RecipeCard key={x.ev.recipe.id} ev={x.ev} aiReason={x.reason} />)}</div>}
              {aiRejected.length > 0 && (
                <details className="mt-3 text-[13px] text-sub"><summary className="cursor-pointer">조건 검사에서 뺀 AI 제안 {aiRejected.length}개</summary><ul className="mt-2 list-disc pl-5 space-y-0.5">{aiRejected.map((r) => <li key={r}>{r}</li>)}</ul></details>
              )}
            </div>
          )}

          {!aiOn && <AISetupInline />}
          <div>
            <SectionTitle right={<button className="btn btn-line btn-sm" onClick={reroll}><RefreshCw className="w-4 h-4" />다른 메뉴 보기</button>}>{use ? `${useName}${josa(useName, '으로', '로')} 만들 수 있는 메뉴` : '지금 냉장고로 만들 수 있는 메뉴'}</SectionTitle>
            <p className="-mt-1 mb-4 text-[13.5px] text-sub">조건에 맞는 {res.total}개 중 종류가 겹치지 않게 골랐어요 · 내장 레시피 {RECIPES.length}개 기준</p>
            {res.items.length === 0 ? (
              <div className="panel">
                <Empty emoji="🍳" title={exclude.length ? '더 보여 드릴 메뉴가 없어요' : '조건에 맞는 메뉴가 없어요'}
                  desc={exclude.length ? '처음 추천으로 돌아가거나 조건을 넓혀 보세요.' : use ? `${useName}${josa(useName, '을', '를')} 쓰면서 지금 조건에 맞는 메뉴가 없어요. 왼쪽에서 조리 시간을 늘리거나 추가 구매를 허용해 보세요.` : `${res.excludedCount}개 메뉴가 조건(시간·도구·구매 개수·알레르기 등)에 걸렸어요. 조리 시간을 늘리거나 추가 구매를 허용해 보세요.`}
                  action={exclude.length ? <button className="btn btn-primary" onClick={() => setExclude([])}>처음 추천 다시 보기</button> : use ? <button className="btn btn-primary" onClick={() => setUse(null)}>전체 메뉴 보기</button> : <Link to="/app/fridge" className="btn btn-primary">재료 더 넣기</Link>} />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {res.items.map((ev, i) => <RecipeCard key={ev.recipe.id} ev={ev} rank={exclude.length ? undefined : i + 1} />)}
              </div>
            )}
          </div>

          {data.history.filter((h) => h.context !== 'quick').length > 0 && (
            <div>
              <SectionTitle>최근 추천·요리 기록</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {data.history.slice(0, 12).map((h) => (
                  <Link key={h.id} to={`/app/recipe/${h.recipeId}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-card border border-line text-[13.5px] hover:border-leaf">
                    {h.emoji} {h.name}{h.context === 'cook' && <span className="text-leaf text-[12px] font-semibold">만듦</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AISetupInline() {
  return <AISetup feature="AI 메뉴 추천" />
}
