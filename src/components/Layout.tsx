import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, ChefHat, CircleUserRound, Cloud, CloudOff, HardDrive, Home, LogOut, Refrigerator, ShoppingBasket, Sparkles, PlugZap } from 'lucide-react'
import { useData } from '../store/AppStore'
import { notifications } from '../lib/metrics'
import { expiryInfo } from '../lib/expiry'
import { today } from '../lib/util'
import { backend } from '../backend'

const GROUPS = [
  { to: '/app', label: '홈', icon: Home, end: true, subs: [] as { to: string; label: string }[] },
  { to: '/app/fridge', label: '냉장고', icon: Refrigerator, subs: [{ to: '/app/fridge', label: '재고 관리' }, { to: '/app/fridge/scan', label: '사진으로 등록' }, { to: '/app/fridge/receipt', label: '영수증으로 등록' }] },
  { to: '/app/recommend', label: '메뉴 추천', icon: ChefHat, match: ['/app/recommend', '/app/quick', '/app/substitute', '/app/recipe'], subs: [{ to: '/app/recommend', label: 'AI 맞춤 추천' }, { to: '/app/quick', label: '오늘의 한 끼' }, { to: '/app/substitute', label: '대체 재료' }] },
  { to: '/app/plan', label: '식단', icon: CalendarDays, match: ['/app/plan', '/app/empty', '/app/budget'], subs: [{ to: '/app/plan', label: '다회차 식단' }, { to: '/app/empty', label: '냉장고 비우기' }, { to: '/app/budget', label: '예산 식단' }] },
  { to: '/app/shopping', label: '장보기', icon: ShoppingBasket, match: ['/app/shopping', '/app/cart'], subs: [{ to: '/app/shopping', label: '장보기 목록' }, { to: '/app/cart', label: '장바구니' }] },
]

function activeGroup(path: string) {
  return GROUPS.slice(1).find((g) => (g.match ?? [g.to]).some((m) => path.startsWith(m)))
}

export function Layout() {
  const { data, aiOn, ai, storageMode, saveState, saveError, user } = useData()
  const loc = useLocation()
  const nav = useNavigate()
  const group = activeGroup(loc.pathname)
  const notes = notifications(data)
  const [openBell, setOpenBell] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setOpenBell(false); window.scrollTo(0, 0) }, [loc.pathname])
  useExpiryNotification()
  useEffect(() => {
    const h = (e: MouseEvent) => { if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpenBell(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const cartCount = data.cart.length
  const shopCount = data.shopping.filter((s) => !s.checked).length

  return (
    <div className="min-h-screen lg:flex">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden lg:flex flex-col w-[248px] shrink-0 h-screen sticky top-0 bg-basil text-[#E8EFE4] px-4 py-6">
        <Link to="/app" className="flex items-center gap-2.5 px-2 mb-8">
          <img src="/favicon.svg" alt="" className="w-9 h-9 rounded-xl ring-1 ring-white/20" />
          <span className="title text-[18px] text-paper">냉장고 한 끼</span>
        </Link>
        <nav className="flex-1 space-y-1" aria-label="주요 메뉴">
          {GROUPS.map((g) => {
            const active = g.end ? loc.pathname === '/app' : group?.to === g.to
            return (
              <div key={g.to}>
                <NavLink to={g.to} end={g.end} className={`flex items-center gap-3 h-11 px-3 rounded-xl font-semibold text-[15px] transition ${active ? 'bg-paper text-basil' : 'hover:bg-white/8 text-[#D7E3D2]'}`}>
                  <g.icon className="w-[19px] h-[19px]" />{g.label}
                  {g.to === '/app/shopping' && shopCount > 0 && <span className={`ml-auto text-[12px] num px-2 rounded-full ${active ? 'bg-pea' : 'bg-white/15'}`}>{shopCount}</span>}
                </NavLink>
                {active && g.subs.length > 0 && (
                  <div className="ml-[30px] mt-1 mb-2 border-l border-white/15 pl-3 space-y-0.5">
                    {g.subs.map((s) => (
                      <NavLink key={s.to} to={s.to} end className={({ isActive }) => `block py-1.5 text-[14px] ${isActive ? 'text-paper font-semibold' : 'text-[#B5C8B4] hover:text-paper'}`}>
                        {s.label}{s.to === '/app/cart' && cartCount > 0 ? ` (${cartCount})` : ''}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <div className="space-y-2 text-[12.5px] text-[#B5C8B4] px-2">
          <ModeLine aiOn={aiOn} aiAvailable={ai.ai} storageMode={storageMode} dark />
          <NavLink to="/app/mypage" className={({ isActive }) => `flex items-center gap-2.5 h-11 px-2 -mx-2 rounded-xl text-[14px] font-semibold ${isActive ? 'bg-paper text-basil' : 'text-[#E8EFE4] hover:bg-white/8'}`}>
            <CircleUserRound className="w-5 h-5" />
            <span className="truncate">{data.settings.nickname || user?.email || '마이페이지'}</span>
          </NavLink>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* 상단 바 */}
        <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-line/70">
          <div className="max-w-[1120px] mx-auto px-4 lg:px-10 h-[60px] flex items-center gap-3">
            <Link to="/app" className="lg:hidden flex items-center gap-2">
              <img src="/favicon.svg" alt="" className="w-8 h-8 rounded-lg" />
              <span className="title text-[16px]">냉장고 한 끼</span>
            </Link>
            <div className="hidden lg:block"><ModeLine aiOn={aiOn} aiAvailable={ai.ai} storageMode={storageMode} /></div>
            <div className="ml-auto flex items-center gap-1">
              <SaveIndicator state={saveState} error={saveError} mode={storageMode} />
              <div className="relative" ref={bellRef}>
                <button className="btn btn-ghost !px-2.5 relative" onClick={() => setOpenBell((v) => !v)} aria-label={`알림 ${notes.length}개`}>
                  <Bell className="w-5 h-5" />
                  {notes.length > 0 && <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-cherry text-white text-[10.5px] font-bold grid place-items-center num">{notes.length > 9 ? '9+' : notes.length}</span>}
                </button>
                {openBell && (
                  <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-24px))] max-h-[70vh] overflow-y-auto panel shadow-xl p-2 fade-in z-40">
                    <p className="px-3 pt-2 pb-1 title text-[15px]">알림</p>
                    {notes.length === 0 && <p className="px-3 py-6 text-center text-sub text-[14px]">새 알림이 없어요.</p>}
                    {notes.map((n) => (
                      <button key={n.id} onClick={() => nav(n.to)} className="w-full text-left flex gap-3 px-3 py-2.5 rounded-xl hover:bg-paper">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.level === 'danger' ? 'bg-cherry' : n.level === 'warn' ? 'bg-yolk' : 'bg-leaf'}`} />
                        <span className="min-w-0"><span className="block text-[14px] font-semibold">{n.title}</span><span className="block text-[13px] text-sub leading-snug">{n.body}</span></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link to="/app/mypage" className="lg:hidden btn btn-ghost !px-2.5" aria-label="마이페이지"><CircleUserRound className="w-5 h-5" /></Link>
            </div>
          </div>
          {/* 모바일 하위 메뉴 */}
          {group && group.subs.length > 0 && (
            <div className="lg:hidden scroll-x px-4 pb-2.5 flex gap-1.5">
              {group.subs.map((s) => (
                <NavLink key={s.to} to={s.to} end className={({ isActive }) => `shrink-0 h-8 px-3.5 rounded-full text-[13.5px] font-semibold grid place-items-center ${isActive ? 'bg-basil text-paper' : 'bg-[#EEE9DC] text-sub'}`}>
                  {s.label}{s.to === '/app/cart' && cartCount > 0 ? ` ${cartCount}` : ''}
                </NavLink>
              ))}
            </div>
          )}
        </header>

        <main className="max-w-[1120px] mx-auto px-4 lg:px-10 pt-6 lg:pt-10 pb-nav">
          <div className="lg:hidden mb-4"><ModeLine aiOn={aiOn} aiAvailable={ai.ai} storageMode={storageMode} /></div>
          <Outlet />
        </main>
      </div>

      {/* 모바일 하단 내비게이션 */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="하단 메뉴">
        <div className="grid grid-cols-5 h-[64px]">
          {GROUPS.map((g) => {
            const active = g.end ? loc.pathname === '/app' : group?.to === g.to
            return (
              <Link key={g.to} to={g.to} className={`relative flex flex-col items-center justify-center gap-1 text-[11.5px] font-semibold ${active ? 'text-basil' : 'text-mute'}`} aria-current={active ? 'page' : undefined}>
                <g.icon className={`w-[22px] h-[22px] ${active ? 'stroke-[2.4]' : ''}`} />
                {g.label === '메뉴 추천' ? '추천' : g.label}
                {g.to === '/app/shopping' && shopCount > 0 && <span className="absolute top-2 left-[56%] min-w-[16px] h-4 px-1 rounded-full bg-cherry text-white text-[10px] grid place-items-center num">{shopCount}</span>}
                {active && <span className="absolute top-0 w-8 h-[3px] rounded-b-full bg-basil" />}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function ModeLine({ aiOn, aiAvailable, storageMode, dark }: { aiOn: boolean; aiAvailable: boolean; storageMode: 'supabase' | 'local' | 'guest' | 'none'; dark?: boolean }) {
  const warn = dark ? 'bg-yolk/25 text-[#F6E3B0]' : 'bg-yolk-soft text-[#86600A]'
  return (
    <div className="flex flex-wrap gap-1.5">
      {aiOn ? (
        <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[12px] font-semibold ${dark ? 'bg-white/10 text-[#E8EFE4]' : 'bg-pea text-basil'}`}><Sparkles className="w-3.5 h-3.5" />AI 연결됨</span>
      ) : (
        <Link to="/app/mypage#ai" className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[12px] font-semibold ${warn}`} title={aiAvailable ? '마이페이지에서 AI 사용이 꺼져 있어요' : '서버에 ANTHROPIC_API_KEY가 없어요. 눌러서 설정 방법 보기'}>
          <PlugZap className="w-3.5 h-3.5" />{aiAvailable ? 'AI 꺼짐' : 'AI 연결 필요'}
        </Link>
      )}
      {storageMode === 'local' && (
        <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[12px] font-semibold ${warn}`} title="개발용 빌드(VITE_LOCAL_DEV)라 이 브라우저에만 저장돼요">
          <HardDrive className="w-3.5 h-3.5" />개발용 로컬 저장
        </span>
      )}
    </div>
  )
}

function SaveIndicator({ state, error, mode }: { state: string; error: string | null; mode: string }) {
  if (state === 'error') return <span className="inline-flex items-center gap-1 text-[12.5px] text-cherry font-semibold mr-1" title={error ?? ''}><CloudOff className="w-4 h-4" />저장 실패</span>
  if (state === 'saving') return <span className="hidden sm:inline-flex items-center gap-1 text-[12.5px] text-mute mr-1"><Cloud className="w-4 h-4" />저장 중</span>
  if (state === 'saved') return <span className="hidden sm:inline-flex items-center gap-1 text-[12.5px] text-mute mr-1"><Cloud className="w-4 h-4" />{mode === 'supabase' ? '계정에 저장됨' : mode === 'guest' ? '이 기기에 저장됨' : '저장됨'}</span>
  return null
}

export function LogoutButton() {
  const nav = useNavigate()
  return <button className="btn btn-line" onClick={async () => { await backend.signOut(); nav('/') }}><LogOut className="w-4 h-4" />로그아웃</button>
}

/** 브라우저 알림: 설정에서 켠 경우, 앱을 연 날 하루 한 번 (이 기기 기준) */
function useExpiryNotification() {
  const { data } = useData()
  useEffect(() => {
    if (!data.settings.notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const t = today()
    let last = ''
    try { last = localStorage.getItem('fom.notified') ?? '' } catch { /* 저장 불가 환경 */ }
    if (last === t) return
    const list = data.inventory
      .filter((it) => !it.spoiled)
      .map((it) => ({ it, e: expiryInfo(it.expiresAt, t) }))
      .filter(({ e }) => e.level === 'today' || e.level === 'soon')
      .sort((a, b) => (a.e.days ?? 0) - (b.e.days ?? 0))
    if (!list.length) return
    const todays = list.filter(({ e }) => e.level === 'today').map(({ it }) => it.name)
    const body = todays.length ? `오늘까지: ${todays.join(', ')}` : `3일 안에: ${list.map(({ it }) => it.name).slice(0, 5).join(', ')}`
    try {
      new Notification('냉장고 한 끼 · 먼저 먹어야 할 재료', { body, icon: '/favicon.svg', tag: 'fom-expiry' })
      localStorage.setItem('fom.notified', t)
    } catch { /* 일부 모바일 브라우저는 페이지에서 바로 알림을 띄울 수 없어요 */ }
  }, [data.settings.notify, data.inventory])
}
