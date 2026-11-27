import { PlanPage } from '../components/PlanPage'

export default function Plan() {
  return (
    <PlanPage
      kind="plan"
      title="다회차 식단 계획"
      desc="한 번 산 재료를 여러 끼니에 나눠 쓰도록 날짜·끼니별 메뉴와 사용량을 계산해요. 먹은 끼니를 표시하면 그만큼 재고가 줄고, 취소하면 정확히 되돌아가요."
      dayOptions={[1, 2, 3, 5, 7]}
      defaultDays={3}
      defaultMode="minPurchase"
      createLabel="식단 만들기"
      modeOptions={[
        { value: 'noPurchase', label: '있는 재료로만', desc: '장보기 없이 계획' },
        { value: 'minPurchase', label: '한 끼에 1개까지', desc: '조금만 사서 보충' },
        { value: 'allow', label: '필요하면 사기', desc: `설정한 구매 개수까지` },
      ]}
    />
  )
}
