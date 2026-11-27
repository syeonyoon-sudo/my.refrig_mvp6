import { Link } from 'react-router-dom'
import { PlugZap } from 'lucide-react'
import { useData } from '../store/AppStore'

/** AI가 연결되지 않았을 때: 가짜 결과 대신 연결 방법을 안내 */
export function AISetup({ feature }: { feature: string }) {
  const { ai, data } = useData()
  if (ai.ai && !data.settings.useAI) {
    return (
      <div className="flex gap-3 rounded-2xl border border-[#EBD9A6] bg-yolk-soft px-4 py-3 text-[14px] text-[#6E5410]">
        <PlugZap className="w-5 h-5 shrink-0 mt-0.5" />
        <div><b>AI 사용이 꺼져 있어요.</b> {feature}을(를) 쓰려면 <Link to="/app/mypage#ai" className="underline font-semibold">마이페이지 → AI 연결 상태</Link>에서 켜 주세요.</div>
      </div>
    )
  }
  return (
    <div className="flex gap-3 rounded-2xl border border-[#EBD9A6] bg-yolk-soft px-4 py-3.5 text-[14px] text-[#6E5410] leading-relaxed">
      <PlugZap className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <b>AI가 연결되지 않아 {feature}을(를) 할 수 없어요.</b>
        {!ai.reachable ? (
          <p className="mt-1">AI 서버(/api)에 연결되지 않아요. Vercel에 배포된 주소에서 열었는지 확인해 주세요. (내 컴퓨터의 "npm run dev"에는 서버 함수가 없어요)</p>
        ) : (
          <ol className="mt-1.5 list-decimal pl-5 space-y-0.5">
            <li>console.anthropic.com에서 API 키(sk-ant-…) 만들기</li>
            <li>Vercel → Settings → Environment Variables에 <code className="px-1 rounded bg-white/70">ANTHROPIC_API_KEY</code> 추가</li>
            <li>Deployments → 최신 배포 ⋯ → Redeploy</li>
          </ol>
        )}
        <p className="mt-1.5">연결 전에는 아래 "직접 입력"으로 등록할 수 있어요.</p>
      </div>
    </div>
  )
}
