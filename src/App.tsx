import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useStore } from './store/AppStore'
import { Layout } from './components/Layout'
import { loginEnabled } from './backend'
import { Spinner } from './components/ui'
import Landing from './pages/Landing'
import { Login, Signup, ResetPassword } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Fridge from './pages/Fridge'
import FridgeScan from './pages/FridgeScan'
import Receipt from './pages/Receipt'
import Recommend from './pages/Recommend'
import RecipeDetail from './pages/RecipeDetail'
import EmptyFridge from './pages/EmptyFridge'
import Budget from './pages/Budget'
import Substitute from './pages/Substitute'
import Quick from './pages/Quick'
import PlanPage from './pages/Plan'
import Shopping from './pages/Shopping'
import Cart from './pages/Cart'
import CartGo from './pages/CartGo'
import MyPage from './pages/MyPage'

function Protected({ children }: { children: ReactNode }) {
  const { user, authReady, data, dataError, reload } = useStore()
  const loc = useLocation()
  if (!authReady) return <Center><Spinner label="불러오는 중" /></Center>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  if (dataError) return (
    <Center>
      <div className="text-center max-w-sm">
        <p className="title text-[18px] mb-2">데이터를 불러오지 못했어요</p>
        <p className="text-sub text-[14px] mb-4">{dataError}</p>
        <p className="text-sub text-[13px] mb-5">Supabase를 연결했다면 README의 "DB 테이블 만들기" 단계를 했는지 확인해 주세요.</p>
        <button className="btn btn-primary" onClick={reload}>다시 시도</button>
      </div>
    </Center>
  )
  if (!data) return <Center><Spinner label="내 냉장고를 여는 중" /></Center>
  return <>{children}</>
}

function Center({ children }: { children: ReactNode }) {
  return <div className="min-h-screen grid place-items-center p-6">{children}</div>
}

function Toasts() {
  const { toasts, dismiss } = useStore()
  return (
    <div className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-[calc(84px+env(safe-area-inset-bottom))] lg:bottom-8 w-[min(440px,calc(100vw-24px))] space-y-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`sheet-in flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg text-[14px] ${t.kind === 'error' ? 'bg-cherry text-white' : t.kind === 'warn' ? 'bg-[#4A3A10] text-[#FBEFCF]' : 'bg-ink text-paper'}`}>
          <span className="flex-1">{t.text}</span>
          {t.action && <button className="font-bold underline underline-offset-2" onClick={() => { t.action!.run(); dismiss(t.id) }}>{t.action.label}</button>}
          <button onClick={() => dismiss(t.id)} aria-label="닫기" className="opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const { recovery } = useStore()
  const nav = useNavigate()
  useEffect(() => { if (recovery) nav('/reset-password') }, [recovery, nav])
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={loginEnabled ? <Login /> : <Navigate to="/app" replace />} />
        <Route path="/signup" element={loginEnabled ? <Signup /> : <Navigate to="/app" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/app" element={<Protected><Layout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="fridge" element={<Fridge />} />
          <Route path="fridge/scan" element={<FridgeScan />} />
          <Route path="fridge/receipt" element={<Receipt />} />
          <Route path="recommend" element={<Recommend />} />
          <Route path="recipe/:id" element={<RecipeDetail />} />
          <Route path="quick" element={<Quick />} />
          <Route path="substitute" element={<Substitute />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="empty" element={<EmptyFridge />} />
          <Route path="budget" element={<Budget />} />
          <Route path="shopping" element={<Shopping />} />
          <Route path="cart" element={<Cart />} />
          <Route path="cart/go" element={<CartGo />} />
          <Route path="mypage" element={<MyPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  )
}
