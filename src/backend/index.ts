// 로그인·데이터 저장 계층
// - Supabase 환경 변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)로 실제 회원가입·로그인·DB 저장
// - 환경 변수가 없으면 로그인 화면에 설정 안내를 보여주고, 데이터를 브라우저에 몰래 저장하지 않음
// - 개발자용: VITE_LOCAL_DEV=true 로 빌드하면 화면 점검용 로컬 계정 사용 (배포에는 쓰지 마세요)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface BackendUser { id: string; email: string; nickname: string }

export interface Backend {
  mode: 'supabase' | 'local' | 'guest' | 'none'
  getUser(): Promise<BackendUser | null>
  onChange(cb: (u: BackendUser | null, event: string) => void): () => void
  signUp(email: string, password: string, nickname: string): Promise<{ needsConfirm: boolean }>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  requestReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  load(userId: string): Promise<unknown | null>
  updatedAt(userId: string): Promise<string | null>
  save(userId: string, data: unknown): Promise<void>
}

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY_ = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined

// 인증 메일 링크가 돌아올 주소
// - 개발 환경(npm run dev, vercel dev): 지금 열려 있는 주소(localhost 등)
// - 배포 환경: VITE_SITE_URL 환경 변수 → 없으면 아래 배포 주소
const DEPLOYED_SITE_URL = 'https://mvp-5-acrqk638o-sy-8ae6.vercel.app'
function siteUrl(): string {
  if (import.meta.env.DEV) return location.origin
  const fromEnv = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim()
  return (fromEnv || DEPLOYED_SITE_URL).replace(/\/+$/, '')
}

function krError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return '이메일 또는 비밀번호가 맞지 않아요.'
  if (m.includes('email not confirmed')) return '이메일 인증이 아직 완료되지 않았어요. 받은 메일의 링크를 눌러 주세요.'
  if (m.includes('already registered') || m.includes('already been registered')) return '이미 가입된 이메일이에요. 로그인해 주세요.'
  if (m.includes('password should be at least') || m.includes('weak')) return '비밀번호는 6자 이상으로 정해 주세요.'
  if (m.includes('rate limit') || m.includes('too many')) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
  if (m.includes('invalid email') || m.includes('unable to validate email')) return '이메일 형식을 확인해 주세요.'
  if (m.includes('failed to fetch') || m.includes('network')) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'
  return msg
}

// ─────────────── Supabase ───────────────

function supabaseBackend(sb: SupabaseClient): Backend {
  const toUser = (u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined): BackendUser | null =>
    u ? { id: u.id, email: u.email ?? '', nickname: String(u.user_metadata?.nickname ?? '') } : null
  return {
    mode: 'supabase',
    async getUser() {
      const { data } = await sb.auth.getSession()
      return toUser(data.session?.user)
    },
    onChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => cb(toUser(session?.user), event))
      return () => data.subscription.unsubscribe()
    },
    async signUp(email, password, nickname) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nickname }, emailRedirectTo: `${siteUrl()}/login` } })
      if (error) throw new Error(krError(error.message))
      // 이미 가입된 이메일은 identities가 빈 배열로 옴
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('이미 가입된 이메일이에요. 로그인해 주세요.')
      return { needsConfirm: !data.session }
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(krError(error.message))
    },
    async signOut() { await sb.auth.signOut() },
    async requestReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/reset-password` })
      if (error) throw new Error(krError(error.message))
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password })
      if (error) throw new Error(krError(error.message))
    },
    async load(userId) {
      const { data, error } = await sb.from('user_data').select('data').eq('user_id', userId).maybeSingle()
      if (error) throw new Error(`데이터를 불러오지 못했어요: ${error.message}`)
      return data?.data ?? null
    },
    async updatedAt(userId) {
      const { data } = await sb.from('user_data').select('updated_at').eq('user_id', userId).maybeSingle()
      return (data?.updated_at as string | undefined) ?? null
    },
    async save(userId, d) {
      const { error } = await sb.from('user_data').upsert({ user_id: userId, data: d, updated_at: new Date().toISOString() })
      if (error) throw new Error(`저장하지 못했어요: ${error.message}`)
    },
  }
}

// ─────────────── 테스트 모드 (브라우저 저장) ───────────────

const USERS = 'fom_local_users'
const SESSION = 'fom_local_session'
const dataKey = (id: string) => `fom_data_${id}`

function read<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {
    throw new Error('브라우저 저장 공간이 가득 찼어요. 식재료 사진을 줄이거나 오래된 기록을 지워 주세요.')
  }
}

async function hash(s: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0
  return `w${h}`
}

type LocalUsers = Record<string, { id: string; hash: string; nickname: string }>

function localBackend(): Backend {
  const listeners = new Set<(u: BackendUser | null, e: string) => void>()
  const current = (): BackendUser | null => {
    const id = read<string | null>(SESSION, null)
    if (!id) return null
    const users = read<LocalUsers>(USERS, {})
    const entry = Object.entries(users).find(([, v]) => v.id === id)
    return entry ? { id, email: entry[0], nickname: entry[1].nickname } : null
  }
  const emit = (e: string) => listeners.forEach((cb) => cb(current(), e))
  return {
    mode: 'local',
    async getUser() { return current() },
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    async signUp(email, password, nickname) {
      const e = email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('이메일 형식을 확인해 주세요.')
      if (password.length < 6) throw new Error('비밀번호는 6자 이상으로 정해 주세요.')
      const users = read<LocalUsers>(USERS, {})
      if (users[e]) throw new Error('이 브라우저에 이미 가입된 이메일이에요. 로그인해 주세요.')
      const id = `local-${Date.now().toString(36)}`
      users[e] = { id, hash: await hash(`${e}:${password}`), nickname }
      write(USERS, users)
      write(SESSION, id)
      emit('SIGNED_IN')
      return { needsConfirm: false }
    },
    async signIn(email, password) {
      const e = email.trim().toLowerCase()
      const users = read<LocalUsers>(USERS, {})
      const u = users[e]
      if (!u || u.hash !== (await hash(`${e}:${password}`))) throw new Error('이메일 또는 비밀번호가 맞지 않아요. (테스트 모드에서는 이 브라우저에서 가입한 계정만 로그인돼요)')
      write(SESSION, u.id)
      emit('SIGNED_IN')
    },
    async signOut() { localStorage.removeItem(SESSION); emit('SIGNED_OUT') },
    async requestReset() {
      throw new Error('테스트 모드에서는 비밀번호 재설정 메일을 보낼 수 없어요. Supabase를 연결하면 실제 메일이 발송돼요.')
    },
    async updatePassword(password) {
      const u = current()
      if (!u) throw new Error('로그인이 필요해요.')
      if (password.length < 6) throw new Error('비밀번호는 6자 이상으로 정해 주세요.')
      const users = read<LocalUsers>(USERS, {})
      users[u.email].hash = await hash(`${u.email}:${password}`)
      write(USERS, users)
    },
    async load(userId) { return read<unknown>(dataKey(userId), null) },
    async updatedAt() { return null },
    async save(userId, d) { write(dataKey(userId), d) },
  }
}

const NOT_SET = 'Supabase가 연결되지 않아 회원가입·로그인을 할 수 없어요. 환경 변수 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정하고 다시 배포해 주세요.'

function noneBackend(): Backend {
  const fail = async (): Promise<never> => { throw new Error(NOT_SET) }
  return {
    mode: 'none', getUser: async () => null, onChange: () => () => {},
    signUp: fail, signIn: fail, signOut: async () => {}, requestReset: fail, updatePassword: fail, load: fail, updatedAt: async () => null, save: fail,
  }
}

// ─────────────── 로그인 없이 사용 (기본) ───────────────
// 가입·로그인 없이 바로 시작. 데이터는 이 브라우저(localStorage)에 저장돼요.
// 같은 브라우저에서는 새로고침·재접속해도 유지되고, 다른 기기와는 공유되지 않아요.
const GUEST: BackendUser = { id: 'guest', email: '', nickname: '' }

function guestBackend(): Backend {
  const noAuth = async (): Promise<never> => { throw new Error('로그인 없이 사용하는 버전이에요.') }
  return {
    mode: 'guest',
    async getUser() { return GUEST },
    onChange() { return () => {} },
    signUp: noAuth, signIn: noAuth, signOut: async () => {}, requestReset: noAuth, updatePassword: noAuth,
    async load(userId) { return read<unknown>(dataKey(userId), null) },
    async updatedAt() { return null },
    async save(userId, d) { write(dataKey(userId), d) },
  }
}

export const supabaseConfigured = !!(URL_ && KEY_)
// 회원가입·로그인을 다시 쓰려면 Vercel 환경 변수에 VITE_ENABLE_LOGIN=true 를 추가하고 재배포하세요.
// (Supabase 연결 코드와 DB 구조는 그대로 남겨 두었어요)
export const loginEnabled = supabaseConfigured && import.meta.env.VITE_ENABLE_LOGIN === 'true'
export const localDev = !loginEnabled && import.meta.env.VITE_LOCAL_DEV === 'true'
export const backend: Backend = loginEnabled
  ? supabaseBackend(createClient(URL_!, KEY_!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }))
  : localDev ? localBackend() : guestBackend()
void noneBackend
