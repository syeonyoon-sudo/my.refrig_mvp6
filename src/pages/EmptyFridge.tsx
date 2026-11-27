import { PlanPage } from '../components/PlanPage'
import { InfoNote } from '../components/ui'

export default function EmptyFridge() {
  return (
    <PlanPage
      kind="empty"
      title="냉장고 비우기"
      desc="지금 있는 재료를 최대한 많이 쓰는 쪽으로 메뉴를 골라요. 기한이 가까운 재료부터 배정하고, 계획이 끝나도 남을 재료를 미리 보여줘요."
      dayOptions={[1, 3, 7]}
      defaultDays={3}
      defaultMode="noPurchase"
      createLabel="비우기 계획 만들기"
      intro={<div className="mb-6"><InfoNote>기한이 지났거나 "상한 것 같아요"로 표시한 재료는 비우기 계획에도 넣지 않아요. 아까워도 안전이 먼저예요.</InfoNote></div>}
      modeOptions={[
        { value: 'noPurchase', label: '추가 구매 금지', desc: '정말 있는 것만으로' },
        { value: 'minPurchase', label: '최소한만 구매', desc: '한 끼에 1개까지 허용' },
        { value: 'allow', label: '필요하면 구매', desc: '비우기보다 식사 우선' },
      ]}
    />
  )
}
