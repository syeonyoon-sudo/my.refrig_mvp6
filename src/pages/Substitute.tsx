import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBasket } from 'lucide-react'
import { useData } from '../store/AppStore'
import { RECIPES, RECIPE_MAP } from '../lib/recipes'
import { CATALOG_MAP } from '../lib/catalog'
import { SUB_RULES, SUBSTITUTABLE, substitutesFor } from '../lib/substitutes'
import { blockedReasons } from '../lib/match'
import { totalHave } from '../lib/inventory'
import { addManual } from '../lib/shopping'
import { fmtQty } from '../lib/units'
import { Badge, Empty, Label, PageHeader, SectionTitle, InfoNote } from '../components/ui'
import { shortName } from '../lib/util'

export default function Substitute() {
  const { data, update, toast } = useData()
  const s = data.settings
  const [recipeId, setRecipeId] = useState('milk-cream-pasta')
  const recipe = RECIPE_MAP[recipeId]
  const ings = recipe.ingredients.filter((i) => CATALOG_MAP[i.id].kind === 'ingredient')
  const [fromId, setFromId] = useState<string>('milk')
  const from = ings.some((i) => i.id === fromId) ? fromId : ings[0]?.id
  const opts = from ? substitutesFor(from, recipeId, s) : []

  // 알레르기·금지 재료 때문에 못 먹는 메뉴 중, 대체하면 가능한 메뉴
  const safeVersions = useMemo(() => {
    if (!s.allergens.length && !s.banned.length) return []
    return RECIPES.flatMap((r) => {
      const blocked = r.ingredients.filter((i) => !i.optional && blockedReasons(CATALOG_MAP[i.id].name, i.id, s).length)
      if (!blocked.length) return []
      const subs: Record<string, string> = {}
      for (const b of blocked) {
        const o = substitutesFor(b.id, r.id, s).find((x) => !x.blocked.length)
        if (!o) return []
        subs[b.id] = o.to
      }
      return [{ r, subs, blocked: blocked.map((b) => shortName(CATALOG_MAP[b.id].name)) }]
    })
  }, [s])

  const addToShop = (id: string, amount: number) => {
    const c = CATALOG_MAP[id]
    update((d) => ({ ...d, shopping: addManual(d.shopping, c.name, amount, c.unit) }))
    toast(`${shortName(c.name)}을(를) 장보기 목록에 넣었어요.`)
  }

  return (
    <div>
      <PageHeader title="식재료 대체 추천" desc="재료가 없거나 싫을 때, 또는 알레르기가 있을 때 바꿔 쓸 수 있는 재료를 알려 드려요. 맛·조리 방식이 실제로 비슷한 경우만 보여줘요." />

      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        <div className="panel p-5 space-y-4">
          <div>
            <Label htmlFor="sub-recipe">메뉴</Label>
            <select id="sub-recipe" className="field" value={recipeId} onChange={(e) => { setRecipeId(e.target.value); setFromId('') }}>
              {RECIPES.map((r) => <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}
            </select>
          </div>
          <div>
            <Label>바꾸고 싶은 재료</Label>
            <div className="flex flex-wrap gap-1.5">
              {ings.map((i) => {
                const c = CATALOG_MAP[i.id]
                const n = substitutesFor(i.id, recipeId, s).length
                const have = totalHave(data.inventory, i.id) >= (i.amount ?? 0)
                return (
                  <button key={i.id} className="chip !h-9 !text-[13.5px]" aria-pressed={from === i.id} onClick={() => setFromId(i.id)} disabled={!n} style={!n ? { opacity: 0.45 } : undefined} title={n ? '' : '등록된 대체 재료 없음'}>
                    {c.emoji} {shortName(c.name)}{!have && <span className="text-[11px] text-cherry">없음</span>}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[12.5px] text-mute">흐리게 보이는 재료는 이 메뉴에서 확실한 대체 재료가 없어요.</p>
          </div>
        </div>

        <div>
          {from ? (
            <>
              <SectionTitle>{recipe.name}에서 {shortName(CATALOG_MAP[from].name)} 대신</SectionTitle>
              {opts.length === 0 ? <div className="panel"><Empty emoji="🤔" title="확실한 대체 재료가 없어요" desc="억지로 바꾸면 맛과 조리법이 크게 달라질 수 있어 추천하지 않아요." /></div> : (
                <div className="space-y-3">
                  {opts.map((o) => {
                    const need = (recipe.ingredients.find((i) => i.id === from)?.amount ?? 0) * o.ratio
                    const have = totalHave(data.inventory, o.to)
                    const enough = have >= need - 1e-6
                    return (
                      <article key={o.to} className={`panel p-5 ${o.blocked.length ? 'opacity-60' : ''}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[22px]">{o.toEmoji}</span>
                          <h3 className="title text-[18px]">{shortName(o.toName)}</h3>
                          <span className="text-[13.5px] text-sub num">{fmtQty(need, o.toUnit)} 사용</span>
                          {enough ? <Badge>보유 {fmtQty(have, o.toUnit)}</Badge> : <Badge tone="yolk">{have > 0 ? `${fmtQty(have, o.toUnit)}만 있음` : '없음'}</Badge>}
                          {o.blocked.length > 0 && <Badge tone="cherry">{o.blocked.join(', ')} — 쓸 수 없음</Badge>}
                          {o.disliked && <Badge tone="line">싫어하는 재료</Badge>}
                        </div>
                        <p className="mt-3 text-[15px] leading-relaxed">{o.reason}</p>
                        <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-[14px]">
                          <div className="rounded-2xl bg-paper px-4 py-3"><dt className="text-[12.5px] text-sub">맛 변화</dt><dd>{o.taste}</dd></div>
                          <div className="rounded-2xl bg-paper px-4 py-3"><dt className="text-[12.5px] text-sub">조리 방법 변화</dt><dd>{o.method}</dd></div>
                        </dl>
                        {!o.blocked.length && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link to={`/app/recipe/${recipeId}?sub=${from}:${o.to}`} className="btn btn-primary btn-sm">바꾼 레시피 보기</Link>
                            {!enough && <button className="btn btn-soft btn-sm" onClick={() => addToShop(o.to, need - have)}><ShoppingBasket className="w-4 h-4" />장보기에 추가</button>}
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          ) : <div className="panel"><Empty emoji="👈" title="바꾸고 싶은 재료를 골라 주세요" /></div>}

          <div className="mt-10">
            <SectionTitle>알레르기 재료를 빼고 먹을 수 있는 메뉴</SectionTitle>
            {!s.allergens.length && !s.banned.length ? (
              <InfoNote tone="sky">마이페이지에서 알레르기나 섭취 금지 재료를 설정하면, 그 재료를 안전하게 바꾼 메뉴를 여기서 보여드려요. <Link to="/app/mypage#prefs" className="font-semibold underline">설정하러 가기</Link></InfoNote>
            ) : safeVersions.length === 0 ? (
              <p className="text-sub text-[14px]">대체해서 만들 수 있는 메뉴가 없어요. 대체가 확실하지 않은 메뉴는 보여주지 않아요.</p>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {safeVersions.map(({ r, subs, blocked }) => (
                  <li key={r.id} className="tile p-4 flex items-center gap-3">
                    <span className="text-[26px]">{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{r.name}</p>
                      <p className="text-[13px] text-sub">{Object.entries(subs).map(([f, t]) => `${shortName(CATALOG_MAP[f].name)} → ${shortName(CATALOG_MAP[t].name)}`).join(', ')}</p>
                      <p className="text-[12px] text-cherry">원래 재료: {blocked.join(', ')}</p>
                    </div>
                    <Link to={`/app/recipe/${r.id}?${Object.entries(subs).map(([f, t]) => `sub=${f}:${t}`).join('&')}`} className="btn btn-soft btn-sm">보기</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-10">
            <SectionTitle>재료별 대체 가이드</SectionTitle>
            <div className="panel divide-y divide-line">
              {SUBSTITUTABLE.map((id) => {
                const rules = SUB_RULES.filter((r) => r.from === id)
                return (
                  <div key={id} className="px-5 py-3 flex flex-wrap gap-x-3 gap-y-1 text-[14px]">
                    <span className="font-semibold w-28 shrink-0">{CATALOG_MAP[id].emoji} {shortName(CATALOG_MAP[id].name)}</span>
                    <span className="text-sub flex-1 min-w-[200px]">{rules.map((r) => `${shortName(CATALOG_MAP[r.to].name)}${r.onlyIn ? `(${r.onlyIn.map((x) => RECIPE_MAP[x]?.name).filter(Boolean).slice(0, 2).join('·')}${r.onlyIn.length > 2 ? ' 등' : ''})` : ''}`).join(', ')}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
