import { CATALOG, CATALOG_MAP } from './catalog'
import type { Allergen, CatalogItem, Settings } from './types'

export function norm(s: string): string {
  return s.replace(/\s+/g, '').replace(/[()[\]{}·.,/_\-+*]/g, '').toLowerCase()
}

// 이름·별칭 → 카탈로그, 긴 이름부터 비교 (예: "다진 돼지고기"가 "돼지고기"보다 우선)
const KEYS: { key: string; id: string }[] = CATALOG.flatMap((c) =>
  [c.name, ...c.aliases].map((k) => ({ key: norm(k), id: c.id })),
).sort((a, b) => b.key.length - a.key.length)

/** 자유 입력 이름(영수증 상품명 포함)을 카탈로그 재료로 연결. 못 찾으면 null */
export function resolveCatalog(name: string): string | null {
  const n = norm(name)
  if (!n) return null
  const exact = KEYS.find((k) => k.key === n)
  if (exact) return exact.id
  for (const k of KEYS) {
    if (k.key.length < 2) continue // 한 글자 별칭은 정확히 같을 때만
    if (n.includes(k.key)) return k.id
  }
  return null
}

export function catalogOf(id: string | null | undefined): CatalogItem | null {
  return id ? CATALOG_MAP[id] ?? null : null
}

// 카탈로그에 없는 이름(AI 결과·직접 입력)의 알레르기 판단용 키워드
export const ALLERGEN_KEYWORDS: Record<Allergen, string[]> = {
  우유: ['우유', '치즈', '버터', '크림', '요거트', '요구르트', '연유', '분유'],
  계란: ['계란', '달걀', '마요', '메추리알'],
  밀: ['밀가루', '부침가루', '튀김가루', '빵', '파스타', '스파게티', '국수', '소면', '라면', '우동', '만두', '또띠아', '빵가루', '간장', '고추장', '카레'],
  대두: ['두부', '간장', '된장', '고추장', '콩', '두유', '쌈장'],
  땅콩: ['땅콩'],
  견과류: ['호두', '아몬드', '잣', '캐슈', '피스타치오', '견과'],
  갑각류: ['새우', '게', '꽃게', '랍스터', '크랩', '맛살'],
  조개류: ['조개', '굴', '홍합', '바지락', '전복', '가리비', '굴소스'],
  생선: ['생선', '참치', '고등어', '연어', '멸치', '어묵', '액젓', '꽁치', '삼치', '맛살', '가다랑어'],
  오징어: ['오징어'],
  돼지고기: ['돼지', '삼겹', '목살', '베이컨', '햄', '소시지', '스팸', '앞다리', '차슈'],
  소고기: ['소고기', '쇠고기', '우삼겹', '차돌', '불고기', '한우', '등심'],
  닭고기: ['닭', '치킨'],
  메밀: ['메밀'],
  토마토: ['토마토', '케첩'],
}

/** 이름으로 알레르기·섭취 금지 여부 판단 → 걸리는 사유 목록 */
export function blockedReasons(name: string, catalogId: string | null, settings: Pick<Settings, 'allergens' | 'banned'>): string[] {
  const reasons: string[] = []
  const c = catalogOf(catalogId ?? resolveCatalog(name))
  const n = norm(name)
  for (const a of settings.allergens) {
    if (c?.allergens.includes(a)) { reasons.push(`알레르기(${a})`); continue }
    if (ALLERGEN_KEYWORDS[a].some((k) => n.includes(norm(k)))) reasons.push(`알레르기(${a})`)
  }
  for (const b of settings.banned) {
    const nb = norm(b)
    if (!nb) continue
    const names = c ? [c.name, ...c.aliases].map(norm) : []
    if (n.includes(nb) || names.some((x) => x.includes(nb) || (x.length >= 2 && nb.includes(x)))) {
      reasons.push(`섭취 금지(${b})`)
    }
  }
  return Array.from(new Set(reasons))
}

/** 싫어하는 재료인지 */
export function isDisliked(name: string, catalogId: string | null, dislikes: string[]): boolean {
  const c = catalogOf(catalogId)
  const names = [name, ...(c ? [c.name, ...c.aliases] : [])].map(norm)
  return dislikes.some((d) => {
    const nd = norm(d)
    return nd.length > 0 && names.some((x) => x.includes(nd) || (x.length >= 2 && nd.includes(x)))
  })
}
