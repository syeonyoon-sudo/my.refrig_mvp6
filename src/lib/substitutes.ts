import { CATALOG_MAP } from './catalog'
import { blockedReasons, isDisliked } from './match'
import type { Recipe, Settings } from './types'

// 근거 있는 대체 관계만 등록합니다. (모든 재료를 서로 바꿀 수 있다고 보지 않음)
// ratio: 원재료 1(기준 단위) 대신 대체 재료를 몇(대체 재료 기준 단위) 쓰는지
export interface SubRule {
  from: string
  to: string
  ratio: number
  reason: string
  taste: string
  method: string
  onlyIn?: string[] // 특정 레시피에서만 유효
}

export const SUB_RULES: SubRule[] = [
  { from: 'onion', to: 'green_onion', ratio: 1.5, reason: '같은 파속 채소라 단맛·향을 비슷하게 낼 수 있어요.', taste: '단맛은 줄고 파 향이 강해져요.', method: '양파보다 빨리 익으니 마지막 1~2분에 넣으세요.' },
  { from: 'onion', to: 'cabbage', ratio: 120, reason: '볶으면 단맛이 나는 채소라 볶음·덮밥에서 역할이 비슷해요.', taste: '아삭하고 단맛이 은은해요.', method: '양파와 같은 시점에 넣고 1분 더 볶으세요.' },
  { from: 'green_onion', to: 'onion', ratio: 0.3, reason: '향채소 역할을 대신할 수 있어요.', taste: '파 향 대신 단맛이 생겨요.', method: '처음부터 함께 볶아 충분히 익히세요.' },
  { from: 'milk', to: 'soft_tofu', ratio: 1 / 350, reason: '순두부를 곱게 풀면 크림처럼 고소하고 부드러운 질감을 낼 수 있어요.', taste: '유제품 맛 대신 콩의 고소함이 나요.', method: '순두부를 으깨 물 조금과 섞어 넣고 약불에서 데우세요.', onlyIn: ['milk-cream-pasta'] },
  { from: 'milk', to: 'cheese', ratio: 1 / 100, reason: '치즈를 녹여 크림 소스의 농도와 고소함을 보충해요.', taste: '더 짜고 진해져요. 소금을 줄이세요.', method: '물 150ml에 치즈를 녹여 소스로 쓰세요.', onlyIn: ['milk-cream-pasta'] },
  { from: 'pork', to: 'tuna', ratio: 1 / 100, reason: '찌개·볶음에서 기름과 감칠맛을 내는 단백질 재료로 대신할 수 있어요.', taste: '고기 대신 담백한 생선 감칠맛이 나요.', method: '오래 볶지 말고 국물이 끓을 때 넣으세요.', onlyIn: ['kimchi-jjigae', 'tofu-kimchi'] },
  { from: 'pork', to: 'spam', ratio: 0.6, reason: '돼지고기 가공품이라 찌개·볶음에서 풍미가 비슷해요.', taste: '짠맛이 강해져요. 간을 줄이세요.', method: '익히는 시간을 절반으로 줄이세요.', onlyIn: ['kimchi-jjigae', 'tofu-kimchi', 'curry-rice'] },
  { from: 'pork', to: 'chicken_thigh', ratio: 1, reason: '볶음 요리에서 식감과 조리 시간이 비슷한 고기예요.', taste: '더 담백해져요.', method: '닭고기는 속까지 완전히 익혀 주세요.', onlyIn: ['jeyuk', 'curry-rice'] },
  { from: 'beef', to: 'pork', ratio: 1, reason: '불고기 양념은 돼지고기와도 잘 어울려요.', taste: '조금 더 기름지고 고소해져요.', method: '돼지고기는 완전히 익을 때까지 2~3분 더 볶으세요.', onlyIn: ['bulgogi'] },
  { from: 'chicken_breast', to: 'chicken_thigh', ratio: 1, reason: '같은 닭고기라 양념·조리법을 그대로 쓸 수 있어요.', taste: '더 촉촉하고 기름져요.', method: '1~2분 더 익히세요.' },
  { from: 'chicken_breast', to: 'tofu', ratio: 1 / 300, reason: '단백질을 채우면서 양념을 잘 흡수해요.', taste: '고기 맛 대신 고소하고 부드러워요.', method: '두부 물기를 빼고 먼저 노릇하게 구운 뒤 넣으세요.' },
  { from: 'tofu', to: 'egg', ratio: 4, reason: '단백질 재료로 볶음·찌개에서 역할을 대신할 수 있어요.', taste: '고소함은 줄고 부드러운 맛이 나요.', method: '찌개는 마지막에 풀어 넣고, 볶음은 스크램블해서 넣으세요.', onlyIn: ['doenjang-jjigae', 'kimchi-jjigae', 'tuna-kimchi-jjigae', 'tofu-egg-scramble'] },
  { from: 'zucchini', to: 'potato', ratio: 1, reason: '찌개에서 건더기와 단맛을 내는 역할이 비슷해요.', taste: '국물이 더 걸쭉하고 달아져요.', method: '감자는 더 오래 익으니 먼저 넣으세요.', onlyIn: ['doenjang-jjigae'] },
  { from: 'zucchini', to: 'king_oyster', ratio: 1, reason: '찌개·전에서 식감 있는 채소 역할을 해요.', taste: '쫄깃하고 감칠맛이 생겨요.', method: '같은 시점에 넣으세요.' },
  { from: 'bacon', to: 'sausage', ratio: 1.2, reason: '돼지고기 가공품으로 짭짤한 풍미를 대신해요.', taste: '훈연 향이 약해져요.', method: '얇게 썰어 같은 시점에 넣으세요.' },
  { from: 'bacon', to: 'spam', ratio: 1, reason: '짭짤한 돼지고기 가공품이라 대신할 수 있어요.', taste: '조금 더 짜요.', method: '작게 썰어 먼저 구워 쓰세요.' },
  { from: 'rice', to: 'udon', ratio: 1, reason: '덮밥·볶음밥 대신 면 요리로 바꿀 수 있어요.', taste: '쫄깃한 면 식감으로 바뀌어요.', method: '면을 데친 뒤 같은 양념으로 볶으세요.', onlyIn: ['egg-fried-rice', 'kimchi-fried-rice', 'shrimp-fried-rice', 'cabbage-egg-bowl'] },
  { from: 'cabbage', to: 'bean_sprout', ratio: 1, reason: '볶음 요리에서 아삭한 채소 역할을 해요.', taste: '더 아삭하고 시원해요.', method: '센불에서 1~2분만 볶으세요.' },
  { from: 'spinach', to: 'bean_sprout', ratio: 1, reason: '데쳐서 무치는 나물로 같은 양념을 쓸 수 있어요.', taste: '아삭하고 시원해져요.', method: '콩나물은 3~4분 데치세요.', onlyIn: ['spinach-namul'] },
  { from: 'cheese', to: 'mozzarella', ratio: 20, reason: '녹는 치즈로 같은 역할을 해요.', taste: '덜 짜고 더 쭉 늘어나요.', method: '같은 시점에 올리세요.' },
  { from: 'mozzarella', to: 'cheese', ratio: 1 / 20, reason: '녹는 치즈로 대신할 수 있어요.', taste: '더 짜고 진해요.', method: '찢어서 고르게 올리세요.' },
  { from: 'fish_cake', to: 'sausage', ratio: 30, reason: '떡볶이·볶음에서 짭짤한 가공 재료 역할을 해요.', taste: '어묵의 감칠맛 대신 고기 맛이 나요.', method: '칼집을 내서 같은 시점에 넣으세요.' },
  { from: 'tuna', to: 'spam', ratio: 70, reason: '통조림 단백질 재료로 덮밥·찌개에 쓸 수 있어요.', taste: '고기 맛이 나고 더 짜요.', method: '구워서 기름을 빼고 쓰세요.' },
  { from: 'shrimp', to: 'spam', ratio: 0.8, reason: '볶음밥에서 감칠맛 나는 단백질 재료로 대신해요.', taste: '바다 향 대신 짭짤한 고기 맛이 나요.', method: '깍둑썰어 먼저 볶으세요.', onlyIn: ['shrimp-fried-rice'] },
  { from: 'bread', to: 'tortilla', ratio: 0.5, reason: '토스트 대신 랩·퀘사디아 형태로 만들 수 있어요.', taste: '더 얇고 쫄깃해요.', method: '속재료를 올려 반으로 접어 구우세요.' },
  { from: 'egg', to: 'tofu', ratio: 0.125, reason: '스크램블·볶음에서 부드러운 단백질 재료로 대신할 수 있어요.', taste: '계란 향 대신 고소한 콩 맛이 나요.', method: '으깨서 물기를 뺀 뒤 볶으세요.', onlyIn: ['egg-fried-rice', 'tofu-egg-scramble', 'cabbage-egg-bowl', 'egg-toast'] },
  { from: 'sweet_potato', to: 'potato', ratio: 1.3, reason: '같은 방식으로 익힐 수 있는 뿌리채소예요.', taste: '단맛이 줄고 포슬포슬해요.', method: '시간을 1~2분 늘리세요.' },
  { from: 'chili', to: 'bell_pepper', ratio: 0.2, reason: '매운맛 없이 고추 향과 색을 내요.', taste: '맵지 않고 달아져요.', method: '같은 시점에 넣으세요.' },
]

export interface SubOption extends SubRule {
  toName: string
  toEmoji: string
  toUnit: string
  blocked: string[]
  disliked: boolean
}

/** 레시피의 특정 재료를 대체할 수 있는 후보 (알레르기 재료는 제외 표시) */
export function substitutesFor(fromId: string, recipeId: string | null, settings: Settings): SubOption[] {
  return SUB_RULES.filter((r) => r.from === fromId && (!r.onlyIn || (recipeId != null && r.onlyIn.includes(recipeId))))
    .map((r) => {
      const c = CATALOG_MAP[r.to]
      return { ...r, toName: c.name, toEmoji: c.emoji, toUnit: c.unit, blocked: blockedReasons(c.name, c.id, settings), disliked: isDisliked(c.name, c.id, settings.dislikes) }
    })
}

/** 대체 재료 적용 (amount를 비율대로 환산) */
export function applySubs(recipe: Recipe, subs: Record<string, string>): Recipe {
  if (!Object.keys(subs).length) return recipe
  const ingredients = recipe.ingredients.map((ri) => {
    const to = subs[ri.id]
    if (!to) return ri
    const rule = SUB_RULES.find((r) => r.from === ri.id && r.to === to)
    if (!rule) return ri
    const amount = ri.amount != null ? Math.round(ri.amount * rule.ratio * 1000) / 1000 : undefined
    return { ...ri, id: to, amount }
  })
  // 같은 재료가 두 번 나오면 합침
  const merged: typeof ingredients = []
  for (const ri of ingredients) {
    const e = merged.find((m) => m.id === ri.id)
    if (e && e.amount != null && ri.amount != null) e.amount += ri.amount
    else merged.push({ ...ri })
  }
  const subName = Object.values(subs).map((id) => CATALOG_MAP[id]?.name).filter(Boolean).join('·')
  return { ...recipe, id: recipe.id, name: recipe.name, desc: `${recipe.desc} (대체: ${subName})`, ingredients: merged }
}

/** 대체 규칙이 있는 재료 목록 */
export const SUBSTITUTABLE = Array.from(new Set(SUB_RULES.map((r) => r.from)))

/** AI 대체(양 직접 지정)와 재료 빼기를 적용 */
export function applyCustom(recipe: Recipe, custom: Record<string, { to: string; amount: number | null }>, omit: string[]): Recipe {
  if (!Object.keys(custom).length && !omit.length) return recipe
  const ingredients = recipe.ingredients
    .filter((ri) => !omit.includes(ri.id))
    .map((ri) => {
      const c = custom[ri.id]
      if (!c || !CATALOG_MAP[c.to]) return ri
      const to = CATALOG_MAP[c.to]
      return to.kind === 'seasoning' ? { id: to.id, text: ri.text ?? '적당량', optional: ri.optional } : { id: to.id, amount: c.amount ?? ri.amount ?? to.pack.size, optional: ri.optional }
    })
  const merged: typeof ingredients = []
  for (const ri of ingredients) {
    const e = merged.find((m) => m.id === ri.id)
    if (e && e.amount != null && ri.amount != null) e.amount += ri.amount
    else if (!e) merged.push({ ...ri })
  }
  return { ...recipe, ingredients: merged }
}
