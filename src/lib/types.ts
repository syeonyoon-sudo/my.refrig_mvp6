// 서비스 전체에서 쓰는 데이터 형태 정의

export type StorageType = 'fridge' | 'freezer' | 'room'
export type Category =
  | 'veg' | 'fruit' | 'meat' | 'seafood' | 'egg_dairy' | 'tofu_bean'
  | 'grain' | 'processed' | 'sauce' | 'etc'

export type Allergen =
  | '우유' | '계란' | '밀' | '대두' | '땅콩' | '견과류' | '갑각류' | '조개류'
  | '생선' | '돼지고기' | '소고기' | '닭고기' | '메밀' | '토마토' | '오징어'

export type Tool = '프라이팬' | '냄비' | '전자레인지' | '에어프라이어' | '오븐' | '전기밥솥'
export type Skill = 1 | 2 | 3 // 초보 · 중급 · 고급
export type Slot = '아침' | '점심' | '저녁'

export interface CatalogItem {
  id: string
  name: string
  aliases: string[]
  emoji: string
  category: Category
  kind: 'ingredient' | 'seasoning'
  unit: string // 기준 단위 (예: 모, 개, g, ml)
  conv?: Record<string, number> // 다른 단위 1 = 기준 단위 몇 개
  pack: { size: number; label: string; price: number } // 참고용 예상가
  allergens: Allergen[]
  storage: StorageType
  tip: string
  opened?: string
  sign?: string // 신선도 확인 포인트
  shelf?: Partial<Record<StorageType, number>> // 일반적인 참고 기간(일)
  low?: number // 재고 부족 기준(기준 단위)
}

export interface InventoryItem {
  id: string
  name: string
  catalogId: string | null
  qty: number
  unit: string
  category: Category
  storage: StorageType
  purchasedAt: string | null
  expiresAt: string | null
  image: string | null
  memo: string
  source: 'manual' | 'photo' | 'receipt' | 'shopping' | 'sample'
  spoiled?: boolean
  favorite?: boolean
  qtySource?: 'user' | 'ai' | 'unknown' // 직접 입력 / AI 추정 / 정확한 양 모름(대략)
  aiNote?: string // AI가 본 포장·용량 정보
  initialQty?: number // 처음 넣은 양 (남은 양 % 표시용). 옛 데이터에는 없음
  expiryEstimated?: boolean // 포장지 날짜 대신 일반 보관 기간으로 넣은 기한
  createdAt: string
}

export interface RecipeIng {
  id: string // catalog id
  amount?: number // 기준 단위 (양념은 생략 가능)
  text?: string // 양념 표시용 (예: 1큰술)
  optional?: boolean
}

export interface Recipe {
  id: string
  name: string
  emoji: string
  desc: string
  time: number
  difficulty: Skill
  tools: Tool[]
  spicy: 0 | 1 | 2 | 3
  tastes: string[]
  tags: ('onePan' | 'fewDishes' | 'microwave' | 'noFire')[]
  ingredients: RecipeIng[]
  steps: string[]
  tip?: string
  ai?: boolean // AI가 만든 메뉴
  leftoverTips?: string[] // 남은 재료 활용법 (AI)
}

export interface Settings {
  nickname: string
  skill: Skill
  maxTime: 10 | 20 | 30 | 60
  allowPurchase: boolean
  maxPurchase: number
  tools: Tool[]
  allergens: Allergen[]
  banned: string[]
  dislikes: string[]
  likes: string[] // 좋아하는 음식·재료 (추천 순위에 반영)
  tastes: string[]
  spicy: 0 | 1 | 2 | 3
  dailyBudget: number
  weeklyBudget: number
  seasonings: string[]
  useAI: boolean
  slots: Slot[]
  notify: boolean // 앱을 열 때 하루 한 번 브라우저 알림으로 임박 재료 안내
}

export interface UseLine {
  catalogId: string | null
  name: string
  amount: number // 기준 단위
  unit: string
  optional?: boolean
}

export interface Deduction {
  inventoryId: string
  name: string
  qty: number // 해당 재고 단위 기준
  unit: string
  snapshot?: InventoryItem // 전부 써서 사라진 경우 되돌리기용
}

export interface PlanMeal {
  id: string
  date: string
  slot: Slot
  recipeId: string | null
  name: string
  emoji: string
  uses: UseLine[]
  seasonings: string[]
  status: 'planned' | 'done' | 'skipped'
  deducted?: Deduction[]
  logIds?: string[]
  shortNote?: string
  subs?: Record<string, string>
  estCost: number
  note?: string
}

export interface Plan {
  id: string
  kind: 'plan' | 'empty' | 'budget'
  title: string
  createdAt: string
  startDate: string
  days: number
  slots: Slot[]
  mode: 'noPurchase' | 'minPurchase' | 'allow'
  budget?: number
  meals: PlanMeal[]
  status: 'active' | 'done' | 'cancelled'
}

export interface ShoppingItem {
  id: string
  name: string
  catalogId: string | null
  category: Category
  unit: string // 필요량 단위(기준 단위)
  contributions: Record<string, { label: string; need: number; total?: number }>
  packs: number // 구매할 포장 개수
  packsEdited?: boolean
  manualQty?: number // 카탈로그에 없는 재료
  checked: boolean
  memo?: string
  addedAt: string
}

export type Mall = 'coupang' | 'kurly' | 'emart' | 'naver'

export interface CartItem {
  id: string
  shoppingId: string | null
  name: string
  catalogId: string | null
  packs: number
  mall: Mall
}

export interface Purchase {
  id: string
  date: string
  name: string
  catalogId: string | null
  qty: number
  unit: string
  price: number | null
  priceType: 'actual' | 'estimate'
  source: 'receipt' | 'shopping' | 'manual'
  receiptId?: string
}

export interface ReceiptRecord {
  id: string
  date: string
  store: string
  total: number | null
  itemCount: number
  mode: 'ai' | 'test' | 'manual'
}

export interface UsageLog {
  id: string
  date: string
  name: string
  catalogId: string | null
  qty: number
  unit: string
  kind: 'cook' | 'plan' | 'discard'
  urgent: boolean // 기한 3일 이내 재료를 써서 살린 경우
  meal?: string
}

export interface HistoryEntry {
  id: string
  date: string
  recipeId: string
  name: string
  emoji: string
  context: 'recommend' | 'quick' | 'cook'
}

export interface Rating {
  recipeId: string
  name: string
  stars: number
  comment: string
  date: string
}

export interface AppData {
  version: 1
  onboarded: boolean
  inventory: InventoryItem[]
  settings: Settings
  plans: Plan[]
  shopping: ShoppingItem[]
  cart: CartItem[]
  purchases: Purchase[]
  receipts: ReceiptRecord[]
  usage: UsageLog[]
  history: HistoryEntry[]
  ratings: Rating[]
  favorites: string[]
  aiRecipes: Recipe[]
}
