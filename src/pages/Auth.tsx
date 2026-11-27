import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { backend, supabaseConfigured, localDev } from '../backend'
import { useStore } from '../store/AppStore'
import { Label, TestModeNote, InfoNote } from '../components/ui'
import { Loader2 } from 'lucide-react'

function Shell({ title, desc, children, footer }: { title: string; desc: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-basil text-paper p-12">
        <Link to="/" className="flex items-center gap-2.5"><img src="/favicon.svg" alt="" className="w-9 h-9 rounded-xl ring-1 ring-white/20" /><span className="title text-[18px]">냉장고 한 끼</span></Link>
        <div>
          <p className="display text-[40px] leading-[1.15]">사 둔 재료를<br />끝까지 먹는<br />가장 쉬운 방법</p>
          <p className="mt-5 text-[#C9D9C6] text-[15.5px] max-w-[36ch] leading-relaxed">재료를 넣어 두면 오늘 먹을 메뉴, 며칠짜리 식단, 모자란 재료 목록까지 이어서 만들어 드려요.</p>
        </div>
        <p className="text-[13px] text-[#A9C3A8]">자취생·1인 가구를 위한 식재료 관리</p>
      </div>
      <div className="flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="w-full max-w-[400px] mx-auto">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-10"><img src="/favicon.svg" alt="" className="w-8 h-8 rounded-lg" /><span className="title">냉장고 한 끼</span></Link>
          <h1 className="display text-[30px]">{title}</h1>
          <p className="mt-2 text-sub text-[15px]">{desc}</p>
          {localDev && <div className="mt-5"><TestModeNote title="개발용 로컬 모드">VITE_LOCAL_DEV로 빌드된 점검용 화면이에요. 배포할 때는 Supabase를 연결하세요.</TestModeNote></div>}
          <div className="mt-6">{!supabaseConfigured && !localDev ? <SetupGuide /> : children}</div>
          <div className="mt-6 text-[14px] text-sub">{footer}</div>
        </div>
      </div>
    </div>
  )
}

function ErrorText({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <p role="alert" className="text-[14px] text-cherry bg-cherry-soft rounded-xl px-3.5 py-2.5">{msg}</p>
}

export function Login() {
  const { user, authReady } = useStore()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (authReady && user) return <Navigate to={loc.state?.from ?? '/app'} replace />
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null); setBusy(true)
    try { await backend.signIn(email, pw); nav(loc.state?.from ?? '/app', { replace: true }) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Shell title="다시 오셨네요" desc="이메일과 비밀번호로 로그인하세요." footer={<>처음이신가요? <Link to="/signup" className="font-semibold text-basil underline underline-offset-4">회원가입</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="email">이메일</Label><input id="email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div>
          <div className="flex justify-between"><Label htmlFor="pw">비밀번호</Label><Link to="/reset-password" className="text-[13px] text-sub hover:text-basil">비밀번호를 잊었어요</Link></div>
          <input id="pw" className="field" type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <ErrorText msg={err} />
        <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy && <Loader2 className="w-4 h-4 spin" />}로그인</button>
      </form>
    </Shell>
  )
}

export function Signup() {
  const { user, authReady } = useStore()
  const nav = useNavigate()
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  if (authReady && user) return <Navigate to="/app" replace />
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (pw.length < 6) return setErr('비밀번호는 6자 이상으로 정해 주세요.')
    if (pw !== pw2) return setErr('비밀번호 확인이 일치하지 않아요.')
    setBusy(true)
    try {
      const r = await backend.signUp(email.trim(), pw, nickname.trim())
      if (r.needsConfirm) setSent(true)
      else nav('/app', { replace: true })
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  if (sent) {
    return (
      <Shell title="메일을 확인해 주세요" desc={<><b className="text-ink">{email}</b>로 인증 메일을 보냈어요.</>} footer={<Link to="/login" className="font-semibold text-basil underline underline-offset-4">로그인 화면으로</Link>}>
        <InfoNote>메일의 인증 링크를 누른 뒤 로그인하면 바로 시작할 수 있어요. 메일이 안 보이면 스팸함도 확인해 주세요.</InfoNote>
      </Shell>
    )
  }
  return (
    <Shell title="회원가입" desc="내 냉장고와 식단이 계정에 저장돼요." footer={<>이미 계정이 있나요? <Link to="/login" className="font-semibold text-basil underline underline-offset-4">로그인</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="nick" hint="화면에 표시돼요">닉네임</Label><input id="nick" className="field" required maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 자취 3년 차" /></div>
        <div><Label htmlFor="email">이메일</Label><input id="email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label htmlFor="pw" hint="6자 이상">비밀번호</Label><input id="pw" className="field" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div><Label htmlFor="pw2">비밀번호 확인</Label><input id="pw2" className="field" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        <ErrorText msg={err} />
        <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy && <Loader2 className="w-4 h-4 spin" />}가입하기</button>
      </form>
    </Shell>
  )
}

export function ResetPassword() {
  const { user, recovery, clearRecovery } = useStore()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const settingNew = recovery || !!user

  const request = async (e: FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true)
    try { await backend.requestReset(email.trim()); setMsg('비밀번호 재설정 메일을 보냈어요. 메일의 링크를 누르면 이 화면에서 새 비밀번호를 정할 수 있어요.') } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const update = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    if (pw.length < 6) return setErr('비밀번호는 6자 이상으로 정해 주세요.')
    if (pw !== pw2) return setErr('비밀번호 확인이 일치하지 않아요.')
    setBusy(true)
    try { await backend.updatePassword(pw); clearRecovery(); setMsg('비밀번호를 바꿨어요.'); setTimeout(() => nav('/app'), 900) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (settingNew) {
    return (
      <Shell title="새 비밀번호 정하기" desc="앞으로 사용할 비밀번호를 입력하세요." footer={<Link to="/app" className="font-semibold text-basil underline underline-offset-4">대시보드로</Link>}>
        <form onSubmit={update} className="space-y-4">
          <div><Label htmlFor="pw" hint="6자 이상">새 비밀번호</Label><input id="pw" className="field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div><Label htmlFor="pw2">새 비밀번호 확인</Label><input id="pw2" className="field" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          <ErrorText msg={err} />
          {msg && <InfoNote>{msg}</InfoNote>}
          <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy && <Loader2 className="w-4 h-4 spin" />}비밀번호 바꾸기</button>
        </form>
      </Shell>
    )
  }
  return (
    <Shell title="비밀번호 재설정" desc="가입한 이메일로 재설정 링크를 보내 드려요." footer={<Link to="/login" className="font-semibold text-basil underline underline-offset-4">로그인으로 돌아가기</Link>}>
      {!supabaseConfigured ? (
        <InfoNote tone="sky">테스트 모드에서는 메일을 보낼 수 없어요. 로그인한 뒤 마이페이지에서 비밀번호를 바꿀 수 있고, Supabase를 연결하면 이메일 재설정이 작동해요.</InfoNote>
      ) : (
        <form onSubmit={request} className="space-y-4">
          <div><Label htmlFor="email">이메일</Label><input id="email" className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <ErrorText msg={err} />
          {msg && <InfoNote>{msg}</InfoNote>}
          <button className="btn btn-primary btn-lg w-full" disabled={busy || !!msg}>{busy && <Loader2 className="w-4 h-4 spin" />}재설정 메일 보내기</button>
        </form>
      )}
    </Shell>
  )
}

/** Supabase 환경 변수가 없을 때: 가짜 계정을 만들지 않고 설정 방법을 안내 */
function SetupGuide() {
  return (
    <div className="panel p-5 space-y-3 text-[14.5px] leading-relaxed">
      <p className="title text-[17px]">회원 기능을 쓰려면 Supabase 연결이 필요해요</p>
      <p className="text-sub">계정과 냉장고 데이터를 서버(DB)에 저장해야 다른 기기에서도 그대로 보여요. 지금 배포에는 Supabase 설정이 없어서 가입·로그인을 할 수 없어요.</p>
      <ol className="list-decimal pl-5 space-y-1.5">
        <li>supabase.com에서 프로젝트를 만들고 SQL Editor에서 <code className="px-1 rounded bg-paper">supabase/schema.sql</code>을 실행</li>
        <li>Project Settings → API에서 <b>Project URL</b>과 <b>anon public</b> 키 복사</li>
        <li>Vercel → Settings → Environment Variables에 <code className="px-1 rounded bg-paper">VITE_SUPABASE_URL</code>, <code className="px-1 rounded bg-paper">VITE_SUPABASE_ANON_KEY</code> 추가</li>
        <li>Deployments → 최신 배포 ⋯ → <b>Redeploy</b></li>
      </ol>
      <p className="text-[13px] text-mute">자세한 화면별 안내는 프로젝트의 README.md 4장에 있어요.</p>
    </div>
  )
}
