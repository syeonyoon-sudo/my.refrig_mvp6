import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Download, Heart, KeyRound, Star, Trash2, X } from 'lucide-react'
import { useData } from '../store/AppStore'
import { backend } from '../backend'
import { LogoutButton } from '../components/Layout'
import { Badge, InfoNote, Label, Modal, PageHeader, Segmented, Toggle } from '../components/ui'
import { AISetup } from '../components/AISetup'
import { ALL_ALLERGENS, CATALOG_MAP, SEASONINGS } from '../lib/catalog'
import { ALL_TOOLS } from '../lib/ai'
import { RECIPE_MAP } from '../lib/recipes'
import { SKILL_LABEL, SPICY_LABEL } from '../lib/engine'
import { purchaseStats } from '../lib/metrics'
import { defaultData, removeSamples } from '../lib/actions'
import type { Settings, Slot } from '../lib/types'
import { fmtDate, won, shortName } from '../lib/util'
import { fmtQty } from '../lib/units'

const TASTES = ['담백', '매콤', '달콤', '짭짤', '고소', '새콤', '구수']

function Section({ id, title, desc, children }: { id?: string; title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="panel p-5 sm:p-6 scroll-mt-24">
      <h2 className="title text-[18px]">{title}</h2>
      {desc && <p className="text-[13.5px] text-sub mt-1">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [v, setV] = useState('')
  const add = () => { const t = v.trim(); if (t && !values.includes(t)) onChange([...values, t]); setV('') }
  return (
    <div>
      <div className="flex gap-2">
        <input className="field" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button type="button" className="btn btn-soft" onClick={add}>추가</button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((x) => <span key={x} className="inline-flex items-center gap-1 h-8 pl-3 pr-1.5 rounded-full bg-paper border border-line text-[13.5px]">{x}<button aria-label={`${x} 빼기`} onClick={() => onChange(values.filter((y) => y !== x))} className="p-0.5 rounded-full hover:bg-line"><X className="w-3.5 h-3.5" /></button></span>)}
        </div>
      )}
    </div>
  )
}

export default function MyPage() {
  const { data, update, toast, user, storageMode, ai, aiOn } = useData()
  const s = data.settings
  const loc = useLocation()
  const setS = (p: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...p } }))
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const [pwOpen, setPwOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const stats = purchaseStats(data)

  useEffect(() => {
    if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [loc.hash])

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fridge-one-meal-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <PageHeader title="마이페이지" desc="여기서 정한 취향·알레르기·조리도구·예산이 모든 추천과 식단 계산에 쓰여요." actions={storageMode === 'guest' ? undefined : <LogoutButton />} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6">
          <Section title="내 정보">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="nick">닉네임</Label><input id="nick" className="field" value={s.nickname} maxLength={20} onChange={(e) => setS({ nickname: e.target.value })} /></div>
              {storageMode !== 'guest' && <div><Label>이메일</Label><p className="h-11 flex items-center text-[15px]">{user?.email}</p></div>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              {storageMode !== 'guest' && <button className="btn btn-line btn-sm" onClick={() => setPwOpen(true)}><KeyRound className="w-4 h-4" />비밀번호 바꾸기</button>}
              {storageMode === 'guest' ? <Badge>로그인 없이 사용 · 이 브라우저에 저장</Badge> : storageMode === 'local' ? <Badge tone="yolk">개발용 로컬 저장</Badge> : <Badge>계정에 저장됨 · 다른 기기에서도 유지</Badge>}
            </div>
          </Section>

          <Section id="prefs" title="요리 조건과 취향">
            <div className="space-y-5">
              <div><Label>요리 실력</Label><Segmented value={s.skill} onChange={(v) => setS({ skill: v })} options={([1, 2, 3] as const).map((v) => ({ value: v, label: SKILL_LABEL[v] }))} /></div>
              <div><Label>보통 쓸 수 있는 조리 시간</Label><Segmented value={s.maxTime} onChange={(v) => setS({ maxTime: v })} options={[10, 20, 30, 60].map((v) => ({ value: v as Settings['maxTime'], label: `${v}분` }))} /></div>
              <div><Label>매운 정도 (최대)</Label><Segmented value={s.spicy} onChange={(v) => setS({ spicy: v })} options={([0, 1, 2, 3] as const).map((v) => ({ value: v, label: SPICY_LABEL[v] }))} /></div>
              <div><Label hint="여러 개 선택">좋아하는 맛</Label><div className="flex flex-wrap gap-1.5">{TASTES.map((t) => <button key={t} className="chip" aria-pressed={s.tastes.includes(t)} onClick={() => setS({ tastes: toggleIn(s.tastes, t) })}>{t}</button>)}</div></div>
              <div><Label hint="메뉴 이름이나 주재료에 들어 있으면 먼저 추천해요">좋아하는 음식·재료</Label><TagInput values={s.likes ?? []} onChange={(v) => setS({ likes: v })} placeholder="예: 볶음밥, 찌개, 계란" /></div>
              <div><Label hint="이 재료가 주재료인 메뉴는 빼요">싫어하는 재료·음식</Label><TagInput values={s.dislikes} onChange={(v) => setS({ dislikes: v })} placeholder="예: 버섯, 오이" /></div>
              <div><Label>사용할 수 있는 조리도구</Label><div className="flex flex-wrap gap-1.5">{ALL_TOOLS.map((t) => <button key={t} className="chip" aria-pressed={s.tools.includes(t)} onClick={() => setS({ tools: toggleIn(s.tools, t) })}>{t}</button>)}</div></div>
              <div><Label>보통 챙기는 끼니</Label><div className="flex gap-1.5">{(['아침', '점심', '저녁'] as Slot[]).map((t) => <button key={t} className="chip" aria-pressed={s.slots.includes(t)} onClick={() => setS({ slots: toggleIn(s.slots, t) })}>{t}</button>)}</div></div>
              <Toggle checked={s.allowPurchase} onChange={(v) => setS({ allowPurchase: v })} label="추천에 추가 구매 허용" desc={s.allowPurchase ? `양념 포함 최대 ${s.maxPurchase}개` : '있는 재료로만 추천'} />
            </div>
          </Section>

          <Section title="알레르기·섭취 금지" desc="여기 등록한 재료는 숨어 있는 양념(마요네즈의 계란, 간장의 대두·밀 등)까지 확인해서 추천에서 절대 빼요.">
            <Label>알레르기</Label>
            <div className="flex flex-wrap gap-1.5 mb-5">{ALL_ALLERGENS.map((a) => <button key={a} className="chip" aria-pressed={s.allergens.includes(a)} onClick={() => setS({ allergens: toggleIn(s.allergens, a) })}>{a}</button>)}</div>
            <Label hint="종교·식단 등 이유로 먹지 않는 재료">섭취 금지 재료</Label>
            <TagInput values={s.banned} onChange={(v) => setS({ banned: v })} placeholder="예: 돼지고기, 새우" />
            <div className="mt-4"><InfoNote tone="sky">알레르기 판단은 등록된 재료 정보 기준이에요. 가공식품은 실제 포장의 성분 표시를 꼭 확인해 주세요.</InfoNote></div>
          </Section>

          <Section title="집에 있는 양념" desc="체크한 양념은 '사야 할 재료'로 세지 않아요. 양념은 수량 대신 있는지만 확인해요.">
            <div className="flex flex-wrap gap-1.5">{SEASONINGS.map((x) => <button key={x.id} className="chip" aria-pressed={s.seasonings.includes(x.id)} onClick={() => setS({ seasonings: toggleIn(s.seasonings, x.id) })}>{x.emoji} {x.name}</button>)}</div>
          </Section>

          <Section id="notify" title="소비기한 알림" desc="화면 위 종 모양 알림에는 항상 임박·기한 경과 재료가 표시돼요.">
            <Toggle
              checked={!!s.notify}
              onChange={async (v) => {
                if (!v) { setS({ notify: false }); return }
                if (typeof Notification === 'undefined') { toast('이 브라우저는 알림을 지원하지 않아요. 종 모양 알림을 이용해 주세요.', 'warn'); return }
                const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
                if (p === 'granted') { setS({ notify: true }); toast('하루 한 번, 앱을 열 때 임박 재료를 알려 드려요.') }
                else toast('브라우저에서 알림이 차단돼 있어요. 주소창 왼쪽 자물쇠 아이콘에서 알림을 허용해 주세요.', 'warn')
              }}
              label="브라우저 알림 받기"
              desc="앱(웹사이트)을 연 날 하루 한 번, 오늘까지·3일 안에 끝나는 재료를 알려요. 앱을 닫아 둔 동안 보내는 푸시 알림은 아니에요."
            />
          </Section>

          <Section id="budget" title="식비 예산">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="b-day">하루 예산(원)</Label><input id="b-day" className="field num" inputMode="numeric" value={s.dailyBudget} onChange={(e) => setS({ dailyBudget: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })} /></div>
              <div><Label htmlFor="b-week">주간 예산(원)</Label><input id="b-week" className="field num" inputMode="numeric" value={s.weeklyBudget} onChange={(e) => setS({ weeklyBudget: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })} /></div>
            </div>
          </Section>

          <Section id="ai" title="AI 연결 상태">
            {ai.ai ? (
              <>
                <Toggle checked={s.useAI} onChange={(v) => setS({ useAI: v })} label="AI 기능 사용" desc={`서버에 AI 키가 설정돼 있어요${ai.model ? ` (모델: ${ai.model})` : ''}. 끄면 규칙 기반 테스트 모드로 동작해요.`} />
                {aiOn && <p className="mt-3 text-[13.5px] text-sub">사진·영수증 인식, AI 메뉴 제안, AI 대체 재료 질문이 실제로 작동해요. 요청할 때마다 API 사용료가 발생해요.</p>}
              </>
            ) : (
              <AISetup feature="사진·영수증 인식, AI 추천·질문" />
            )}
          </Section>

          <Section title="데이터 관리">
            <div className="flex flex-wrap gap-2">
              {data.inventory.some((i) => i.source === 'sample') && <button className="btn btn-line btn-sm" onClick={() => { update(removeSamples); toast('예시 재료를 지웠어요.') }}><Trash2 className="w-4 h-4" />예시 재료 지우기</button>}
              <button className="btn btn-line btn-sm" onClick={exportData}><Download className="w-4 h-4" />내 데이터 내려받기(JSON)</button>
              <button className="btn btn-danger btn-sm" onClick={() => setResetOpen(true)}><Trash2 className="w-4 h-4" />모든 데이터 초기화</button>
            </div>
          </Section>
        </div>

        <aside className="space-y-6">
          <Section title="즐겨찾는 메뉴">
            {data.favorites.length === 0 ? <p className="text-[14px] text-sub">레시피의 ♥를 누르면 여기에 모여요.</p> : (
              <ul className="space-y-1">
                {data.favorites.map((id) => { const r = RECIPE_MAP[id] ?? data.aiRecipes.find((x) => x.id === id); if (!r) return null; return <li key={id}><Link to={`/app/recipe/${id}`} className="flex items-center gap-2 px-2 py-2 -mx-2 rounded-xl hover:bg-paper text-[14.5px]"><Heart className="w-4 h-4 fill-cherry text-cherry" />{r.emoji} {r.name}</Link></li> })}
              </ul>
            )}
            {data.inventory.some((i) => i.favorite) && <p className="mt-3 text-[13px] text-sub">즐겨찾는 재료: {data.inventory.filter((i) => i.favorite).map((i) => i.name).join(', ')}</p>}
          </Section>

          <Section title="내 평가">
            {data.ratings.length === 0 ? <p className="text-[14px] text-sub">레시피 화면에서 별점을 남기면 추천 순서에 반영돼요.</p> : (
              <ul className="space-y-2 text-[14px]">
                {data.ratings.slice(0, 8).map((r) => <li key={r.recipeId}><Link to={`/app/recipe/${r.recipeId}`} className="flex items-center gap-2"><span className="flex">{Array.from({ length: r.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yolk text-yolk" />)}</span><span className="font-semibold">{r.name}</span></Link>{r.comment && <p className="text-[13px] text-sub ml-1">{r.comment}</p>}</li>)}
              </ul>
            )}
          </Section>

          <Section title="최근 추천·요리">
            {data.history.length === 0 ? <p className="text-[14px] text-sub">아직 기록이 없어요.</p> : (
              <ul className="space-y-1.5 text-[14px]">
                {data.history.slice(0, 10).map((h) => <li key={h.id} className="flex justify-between gap-2"><Link to={`/app/recipe/${h.recipeId}`} className="truncate hover:underline">{h.emoji} {h.name}</Link><span className="text-[12.5px] text-sub shrink-0">{h.context === 'cook' ? '만듦' : h.context === 'quick' ? '빠른 추천' : '추천'} · {fmtDate(h.date.slice(0, 10), false)}</span></li>)}
              </ul>
            )}
          </Section>

          <Section title="구매 내역" desc="영수증·장보기로 등록한 기록이에요.">
            {data.purchases.length === 0 ? <p className="text-[14px] text-sub">아직 구매 기록이 없어요.</p> : (
              <>
                <p className="text-[13px] font-semibold mb-2">재료별 평균 구매 가격 (실제 금액 기준)</p>
                <ul className="space-y-1 text-[13.5px] mb-4">
                  {stats.slice(0, 8).map((x) => <li key={x.name} className="flex justify-between"><span>{shortName(x.name)} <span className="text-sub">{x.count}회</span></span><span className="num">{x.priced ? won(x.total / x.priced) : <span className="text-mute">금액 기록 없음</span>}</span></li>)}
                </ul>
                <p className="text-[13px] font-semibold mb-2">최근 구매</p>
                <ul className="space-y-1 text-[13.5px]">
                  {data.purchases.slice(0, 8).map((p) => <li key={p.id} className="flex justify-between gap-2"><span className="truncate">{fmtDate(p.date, false)} {shortName(p.name)} {CATALOG_MAP[p.catalogId ?? ''] ? fmtQty(p.qty, p.unit) : ''}</span><span className="num shrink-0">{p.price != null ? `${won(p.price)}${p.priceType === 'estimate' ? ' 예상' : ''}` : '-'}</span></li>)}
                </ul>
              </>
            )}
          </Section>
        </aside>
      </div>

      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="모든 데이터를 지울까요?"
        footer={<><button className="btn btn-line" onClick={() => setResetOpen(false)}>취소</button><button className="btn btn-danger" onClick={() => { update(() => defaultData(s.nickname)); setResetOpen(false); toast('데이터를 초기화했어요.') }}>초기화</button></>}>
        <p className="text-[15px]">냉장고 재료, 식단, 장보기, 구매·추천 기록, 설정이 모두 지워져요. 되돌릴 수 없으니 필요하면 먼저 데이터를 내려받아 두세요.</p>
      </Modal>
    </div>
  )
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useData()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { if (open) { setPw(''); setPw2(''); setErr(null) } }, [open])
  const save = async () => {
    if (pw.length < 6) return setErr('비밀번호는 6자 이상으로 정해 주세요.')
    if (pw !== pw2) return setErr('비밀번호 확인이 일치하지 않아요.')
    try { await backend.updatePassword(pw); toast('비밀번호를 바꿨어요.'); onClose() } catch (e) { setErr((e as Error).message) }
  }
  return (
    <Modal open={open} onClose={onClose} title="비밀번호 바꾸기" footer={<><button className="btn btn-line" onClick={onClose}>취소</button><button className="btn btn-primary" onClick={save}>바꾸기</button></>}>
      <div className="space-y-4">
        <div><Label htmlFor="np">새 비밀번호</Label><input id="np" type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
        <div><Label htmlFor="np2">새 비밀번호 확인</Label><input id="np2" type="password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
        {err && <p className="text-[14px] text-cherry">{err}</p>}
      </div>
    </Modal>
  )
}
