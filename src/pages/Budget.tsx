import { Link } from 'react-router-dom'
import { PlanPage } from '../components/PlanPage'
import { useData } from '../store/AppStore'
import { weekSpend } from '../lib/metrics'
import { Meter, TestModeNote } from '../components/ui'
import { won } from '../lib/util'

export default function Budget() {
  const { data } = useData()
  const spend = weekSpend(data)
  return (
    <PlanPage
      kind="budget"
      title="예산 기반 식단"
      desc="정해 둔 예산 안에서 메뉴를 고르고, 있는 재료를 먼저 써서 장보기 비용을 줄여요. 예산을 넘는 메뉴는 더 싼 메뉴로 바꿔 넣어요."
      dayOptions={[1, 3, 5, 7]}
      defaultDays={7}
      defaultMode="allow"
      budget
      createLabel="예산 식단 만들기"
      intro={
        <div className="grid md:grid-cols-[1fr_1.3fr] gap-4 mb-6">
          <div className="panel p-5">
            <div className="flex justify-between items-baseline"><p className="title text-[16px]">이번 주 식비</p><Link to="/app/mypage#budget" className="text-[13px] font-semibold text-leaf">예산 바꾸기</Link></div>
            <p className="mt-2 title text-[24px] num">{won(spend.spent)} <span className="text-[14px] text-sub font-semibold">/ {won(spend.budget)}</span></p>
            <div className="mt-2"><Meter value={spend.budget ? spend.spent / spend.budget : 0} tone={spend.remain < 0 ? 'cherry' : 'basil'} /></div>
            <p className="mt-2 text-[13px] text-sub">{spend.remain >= 0 ? `${won(spend.remain)} 남았어요` : `${won(-spend.remain)} 넘었어요`} · 하루 예산 {won(data.settings.dailyBudget)}</p>
          </div>
          <TestModeNote title="가격은 예상가예요">실제 쇼핑몰 가격을 불러오지 않아요. 메뉴 비용은 재료별 참고용 예상가(포장 단위)로 계산하고, 영수증이나 장보기에서 실제 금액을 입력하면 식비 기록에는 실제 금액이 쓰여요.</TestModeNote>
        </div>
      }
      modeOptions={[
        { value: 'noPurchase', label: '0원 식단', desc: '추가 구매 없이' },
        { value: 'minPurchase', label: '한 끼 1개까지', desc: '구매 최소화' },
        { value: 'allow', label: '예산 안에서 자유롭게', desc: '예산을 넘지 않게' },
      ]}
    />
  )
}
