import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { backend, type BackendUser } from '../backend'
import { defaultData, normalizeData, syncShopping } from '../lib/actions'
import { fetchStatus, type AIStatus } from '../lib/ai'
import type { AppData } from '../lib/types'

export interface Toast { id: number; text: string; kind: 'ok' | 'warn' | 'error'; action?: { label: string; run: () => void } }

interface Store {
  user: BackendUser | null
  authReady: boolean
  recovery: boolean
  clearRecovery: () => void
  data: AppData | null
  dataError: string | null
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  saveError: string | null
  ai: AIStatus
  aiOn: boolean
  storageMode: 'supabase' | 'local' | 'guest' | 'none'
  update: (fn: (d: AppData) => AppData) => void
  toast: (text: string, kind?: Toast['kind'], action?: Toast['action']) => void
  toasts: Toast[]
  dismiss: (id: number) => void
  reload: () => void
}

const Ctx = createContext<Store | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [data, setData] = useState<AppData | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<Store['saveState']>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [ai, setAi] = useState<AIStatus>({ ai: false, model: null, checked: false, reachable: false })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const lastSaved = useRef<string>('')
  const loadedFor = useRef<string | null>(null)
  const remoteAt = useRef<string | null>(null) // 마지막으로 확인한 서버 저장 시각

  // 로그인 상태
  useEffect(() => {
    let alive = true
    backend.getUser().then((u) => { if (alive) { setUser(u); setAuthReady(true) } }).catch(() => setAuthReady(true))
    const off = backend.onChange((u, event) => {
      setUser(u)
      setAuthReady(true)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => { alive = false; off() }
  }, [])

  useEffect(() => { fetchStatus().then(setAi) }, [])

  // 사용자 데이터 불러오기
  useEffect(() => {
    if (!user) { setData(null); loadedFor.current = null; return }
    if (loadedFor.current === user.id && reloadKey === 0) return
    let alive = true
    setDataError(null)
    backend.load(user.id).then(async (raw) => {
      if (!alive) return
      let d = raw ? normalizeData(raw, user.nickname) : defaultData(user.nickname)
      if (!d.settings.nickname && user.nickname) d = { ...d, settings: { ...d.settings, nickname: user.nickname } }
      d = syncShopping(d)
      loadedFor.current = user.id
      if (!raw) {
        try { await backend.save(user.id, d) } catch { /* 첫 저장 실패는 다음 변경 때 재시도 */ }
      }
      lastSaved.current = JSON.stringify(d)
      remoteAt.current = await backend.updatedAt(user.id).catch(() => null)
      setData(d)
    }).catch((e: Error) => { if (alive) setDataError(e.message) })
    return () => { alive = false }
  }, [user, reloadKey])

  // 자동 저장 (0.6초 모아서)
  useEffect(() => {
    if (!user || !data) return
    const json = JSON.stringify(data)
    if (json === lastSaved.current) return
    setSaveState('saving')
    const t = setTimeout(() => {
      backend.save(user.id, data)
        .then(async () => { lastSaved.current = json; setSaveState('saved'); setSaveError(null); remoteAt.current = await backend.updatedAt(user.id).catch(() => remoteAt.current) })
        .catch((e: Error) => { setSaveState('error'); setSaveError(e.message) })
    }, 600)
    return () => clearTimeout(t)
  }, [data, user])

  // 새로고침·탭 닫기 직전에 아직 저장 안 된 변경을 바로 저장
  const latest = useRef<{ user: BackendUser | null; data: AppData | null }>({ user: null, data: null })
  latest.current = { user, data }
  useEffect(() => {
    const flush = () => {
      const { user: u, data: d } = latest.current
      if (!u || !d) return
      const json = JSON.stringify(d)
      if (json === lastSaved.current) return
      lastSaved.current = json
      backend.save(u.id, d).catch(() => { /* 다음 변경 때 다시 저장 */ })
    }
    // 다른 기기에서 바뀐 내용이 있으면 이 화면으로 돌아왔을 때 다시 불러오기
    const refresh = async () => {
      const { user: u, data: d } = latest.current
      if (!u || !d || JSON.stringify(d) !== lastSaved.current) return
      const at = await backend.updatedAt(u.id).catch(() => null)
      if (at && remoteAt.current && at > remoteAt.current) { remoteAt.current = at; setReloadKey((k) => k + 1) }
    }
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); else refresh() }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('focus', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', flush); document.removeEventListener('visibilitychange', onHide) }
  }, [])

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((d) => (d ? fn(d) : d))
  }, [])

  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok', action?: Toast['action']) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, kind, action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 7000 : 3500)
  }, [])
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const value = useMemo<Store>(() => ({
    user, authReady, recovery, clearRecovery: () => setRecovery(false), data, dataError, saveState, saveError, ai,
    aiOn: ai.ai && !!data?.settings.useAI, storageMode: backend.mode,
    update, toast, toasts, dismiss, reload: () => setReloadKey((k) => k + 1),
  }), [user, authReady, recovery, data, dataError, saveState, saveError, ai, update, toast, toasts, dismiss])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('AppProvider 밖에서 사용할 수 없어요')
  return s
}

/** 로그인 후 화면에서 사용 (data가 항상 있음) */
export function useData() {
  const s = useStore()
  return { ...s, data: s.data as AppData }
}
