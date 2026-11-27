import type { Allergen, CatalogItem, Category, StorageType } from './types'

// 식재료 기준 정보
// - unit: 계산 기준 단위, conv: 다른 단위 → 기준 단위 환산
// - pack.price: 실제 시세가 아닌 "참고용 예상가"입니다. 화면에도 그렇게 표시합니다.
// - shelf: 일반적인 참고 기간(일). 실제 기한은 포장지 날짜와 재료 상태로 판단해야 합니다.

type Opt = Partial<Omit<CatalogItem, 'id' | 'name' | 'emoji' | 'category' | 'unit' | 'pack'>>

function ing(
  id: string, name: string, emoji: string, category: Category, unit: string,
  pack: [number, string, number], storage: StorageType, tip: string, opt: Opt = {},
): CatalogItem {
  return {
    id, name, emoji, category, unit, storage, tip,
    kind: 'ingredient', aliases: [], allergens: [],
    pack: { size: pack[0], label: pack[1], price: pack[2] },
    ...opt,
  }
}

function sea(id: string, name: string, emoji: string, price: number, allergens: Allergen[] = [], aliases: string[] = []): CatalogItem {
  return {
    id, name, emoji, category: 'sauce', kind: 'seasoning', unit: '병',
    pack: { size: 1, label: '1개', price }, allergens, aliases,
    storage: 'room', tip: '뚜껑을 꼭 닫아 직사광선을 피해 보관하세요. 개봉 후 냉장 보관 표시가 있으면 냉장고에 넣으세요.',
  }
}

export const CATALOG: CatalogItem[] = [
  // 채소
  ing('onion', '양파', '🧅', 'veg', '개', [3, '3개', 2900], 'room', '통풍이 잘되는 서늘한 곳에 망째 보관하세요. 감자와 같이 두면 빨리 상해요.',
    { conv: { g: 1 / 200 }, opened: '자른 양파는 랩으로 싸서 냉장 보관하고 2~3일 안에 쓰세요.', sign: '물러지거나 싹이 길게 나면 확인이 필요해요.', shelf: { room: 30, fridge: 30 }, low: 1 }),
  ing('green_onion', '대파', '🌿', 'veg', '대', [5, '1단(약 5대)', 3000], 'fridge', '흙을 털고 키친타월로 감싸 냉장 보관하세요. 송송 썰어 냉동하면 오래 써요.',
    { aliases: ['파', '쪽파', '실파'], conv: { g: 1 / 100 }, sign: '잎이 누렇게 변하거나 진액이 나오면 상한 신호예요.', shelf: { fridge: 7, freezer: 30 }, low: 0.5 }),
  ing('garlic', '마늘', '🧄', 'veg', '쪽', [30, '깐마늘 1봉(약 30쪽)', 3500], 'fridge', '깐마늘은 밀폐 용기에 냉장 보관하세요. 다져서 냉동하면 편해요.',
    { aliases: ['깐마늘', '통마늘'], conv: { g: 1 / 5 }, sign: '초록 싹이 크거나 물러지면 확인하세요.', shelf: { fridge: 14, freezer: 60 }, low: 3 }),
  ing('potato', '감자', '🥔', 'veg', '개', [4, '4개', 4000], 'room', '빛이 들지 않는 서늘한 곳에 보관하세요. 사과 1개를 함께 두면 싹이 덜 나요.',
    { conv: { g: 1 / 150 }, sign: '초록색으로 변하거나 싹이 나면 그 부분을 충분히 도려내야 해요.', shelf: { room: 21 }, low: 1 }),
  ing('sweet_potato', '고구마', '🍠', 'veg', '개', [3, '3개', 4500], 'room', '냉장고에 넣으면 쉽게 상해요. 신문지에 싸서 실온에 두세요.',
    { conv: { g: 1 / 200 }, shelf: { room: 14 } }),
  ing('carrot', '당근', '🥕', 'veg', '개', [2, '2개', 2000], 'fridge', '물기를 닦고 키친타월로 싸서 냉장 보관하세요.',
    { conv: { g: 1 / 150 }, opened: '자른 단면은 랩으로 감싸세요.', shelf: { fridge: 14 } }),
  ing('cabbage', '양배추', '🥬', 'veg', 'g', [1000, '½통(약 1kg)', 3000], 'fridge', '심지를 파내고 젖은 키친타월을 채워 랩으로 감싸면 오래가요.',
    { sign: '잎 끝이 검게 변하거나 물러지면 그 부분은 떼어내세요.', shelf: { fridge: 14 }, low: 100 }),
  ing('zucchini', '애호박', '🥒', 'veg', '개', [1, '1개', 1800], 'fridge', '하나씩 랩이나 키친타월로 싸서 냉장 보관하세요.',
    { aliases: ['호박'], conv: { g: 1 / 300 }, opened: '자른 애호박은 단면을 랩으로 감싸 2~3일 안에 쓰세요.', shelf: { fridge: 7 } }),
  ing('king_oyster', '새송이버섯', '🍄', 'veg', '개', [3, '3개', 2500], 'fridge', '씻지 말고 키친타월에 싸서 냉장 보관하세요. 물이 닿으면 금방 물러져요.',
    { aliases: ['버섯', '새송이'], conv: { g: 1 / 100 }, shelf: { fridge: 7 } }),
  ing('enoki', '팽이버섯', '🍄', 'veg', '봉', [1, '1봉', 1000], 'fridge', '포장째 냉장 보관하고 쓴 뒤에는 밑동을 잘라 밀봉하세요. 반드시 익혀 드세요.',
    { conv: { g: 1 / 150 }, shelf: { fridge: 7 } }),
  ing('spinach', '시금치', '🥬', 'veg', 'g', [200, '1봉(200g)', 2500], 'fridge', '젖은 키친타월로 싸서 세워 보관하면 덜 시들어요.',
    { shelf: { fridge: 4 }, sign: '잎이 물러지고 끈적하면 상한 거예요.' }),
  ing('bean_sprout', '콩나물', '🌱', 'veg', 'g', [300, '1봉(300g)', 1500], 'fridge', '물에 담가 냉장 보관하고 물을 매일 갈아주세요.',
    { allergens: ['대두'], shelf: { fridge: 3 }, sign: '갈색으로 변하거나 냄새가 나면 버리세요.' }),
  ing('lettuce', '상추', '🥬', 'veg', 'g', [150, '1봉(150g)', 2000], 'fridge', '씻지 않은 채 키친타월에 싸서 밀폐 용기에 보관하세요.', { shelf: { fridge: 5 } }),
  ing('cucumber', '오이', '🥒', 'veg', '개', [2, '2개', 2000], 'fridge', '하나씩 키친타월로 싸서 세워 보관하세요.', { conv: { g: 1 / 200 }, shelf: { fridge: 7 } }),
  ing('tomato', '토마토', '🍅', 'veg', '개', [4, '4개', 4500], 'room', '덜 익었으면 실온, 다 익었으면 냉장 보관하세요. 꼭지를 아래로 두세요.',
    { allergens: ['토마토'], conv: { g: 1 / 150 }, shelf: { room: 4, fridge: 7 } }),
  ing('chili', '청양고추', '🌶️', 'veg', '개', [10, '1봉(약 10개)', 1500], 'fridge', '꼭지를 떼고 키친타월에 싸서 냉장, 오래 두려면 썰어서 냉동하세요.',
    { aliases: ['고추', '풋고추', '홍고추'], conv: { g: 1 / 10 }, shelf: { fridge: 10, freezer: 60 } }),
  ing('bell_pepper', '파프리카', '🫑', 'veg', '개', [2, '2개', 3000], 'fridge', '물기 없이 냉장 보관하세요. 자른 것은 씨를 빼고 밀폐하세요.', { aliases: ['피망'], conv: { g: 1 / 150 }, shelf: { fridge: 10 } }),
  ing('broccoli', '브로콜리', '🥦', 'veg', '송이', [1, '1송이', 2500], 'fridge', '봉지에 넣어 냉장 보관하고, 데쳐서 냉동하면 오래 써요.', { conv: { g: 1 / 300 }, shelf: { fridge: 5, freezer: 30 } }),
  ing('kimchi', '김치', '🥬', 'processed', 'g', [500, '500g', 5000], 'fridge', '국물에 잠기게 눌러 밀폐 보관하세요. 시어지면 찌개·볶음밥에 좋아요.',
    { aliases: ['배추김치', '묵은지', '신김치'], shelf: { fridge: 30 }, low: 100 }),
  ing('radish', '무', '🥗', 'veg', 'g', [1000, '½개(약 1kg)', 2000], 'fridge', '자른 무는 랩으로 단면을 감싸 냉장 보관하세요.', { shelf: { fridge: 10 } }),

  // 과일
  ing('banana', '바나나', '🍌', 'fruit', '개', [5, '1송이(5개)', 3500], 'room', '걸어두거나 꼭지를 랩으로 감싸면 덜 무르어요.', { shelf: { room: 5 } }),
  ing('apple', '사과', '🍎', 'fruit', '개', [3, '3개', 6000], 'fridge', '하나씩 비닐에 넣어 냉장 보관하세요.', { shelf: { fridge: 21 } }),

  // 육류
  ing('pork_belly', '삼겹살', '🥓', 'meat', 'g', [300, '300g', 8000], 'fridge', '바로 쓰지 않으면 1회분씩 나눠 냉동하세요.',
    { allergens: ['돼지고기'], aliases: ['오겹살'], shelf: { fridge: 3, freezer: 30 }, sign: '끈적이거나 냄새가 나면 드시지 마세요.' }),
  ing('pork', '돼지고기(찌개·볶음용)', '🍖', 'meat', 'g', [300, '300g', 5500], 'fridge', '1회분(100~200g)씩 나눠 냉동하면 편해요.',
    { allergens: ['돼지고기'], aliases: ['돼지고기', '앞다리살', '제육용', '찌개용 돼지고기', '목살'], shelf: { fridge: 3, freezer: 30 } }),
  ing('pork_mince', '다진 돼지고기', '🍖', 'meat', 'g', [300, '300g', 5000], 'fridge', '다진 고기는 빨리 상해요. 사 온 날 나눠서 냉동하세요.',
    { allergens: ['돼지고기'], aliases: ['돼지 다짐육', '다짐육'], shelf: { fridge: 1, freezer: 30 } }),
  ing('beef', '소고기(불고기용)', '🥩', 'meat', 'g', [300, '300g', 9500], 'fridge', '1회분씩 나눠 냉동하세요. 해동은 냉장실에서 천천히 하세요.',
    { allergens: ['소고기'], aliases: ['소고기', '불고기', '우삼겹', '차돌박이'], shelf: { fridge: 3, freezer: 30 } }),
  ing('chicken_breast', '닭가슴살', '🍗', 'meat', 'g', [400, '400g', 6000], 'fridge', '생닭은 아래 칸에 두어 다른 음식에 즙이 닿지 않게 하세요.',
    { allergens: ['닭고기'], shelf: { fridge: 2, freezer: 30 } }),
  ing('chicken_thigh', '닭다리살', '🍗', 'meat', 'g', [500, '500g', 7500], 'fridge', '생닭은 아래 칸에, 바로 안 쓰면 냉동하세요.',
    { allergens: ['닭고기'], aliases: ['닭고기', '정육 닭다리'], shelf: { fridge: 2, freezer: 30 } }),

  // 수산
  ing('tuna', '참치캔', '🐟', 'seafood', '캔', [3, '3캔', 6000], 'room', '개봉 전에는 실온 보관, 개봉 후 남은 것은 다른 용기에 옮겨 냉장하세요.',
    { allergens: ['생선'], aliases: ['참치', '참치 통조림'], conv: { g: 1 / 100 }, opened: '개봉 후에는 그릇에 옮겨 냉장하고 1~2일 안에 드세요.', shelf: { room: 365 } }),
  ing('shrimp', '냉동새우', '🦐', 'seafood', 'g', [300, '300g', 7500], 'freezer', '냉동 보관하고 쓸 만큼만 찬물에 해동하세요. 해동 후 재냉동은 피하세요.',
    { allergens: ['갑각류'], aliases: ['새우', '칵테일새우', '깐새우'], shelf: { freezer: 90 } }),
  ing('fish_cake', '어묵', '🍢', 'seafood', '장', [6, '1봉(6장)', 2500], 'fridge', '개봉 후에는 밀봉해 냉장, 오래 두려면 냉동하세요.',
    { allergens: ['생선', '밀'], aliases: ['오뎅', '사각어묵'], conv: { g: 1 / 50 }, shelf: { fridge: 7, freezer: 30 } }),
  ing('mackerel', '고등어(손질)', '🐟', 'seafood', 'g', [300, '1팩(약 300g)', 5500], 'freezer', '손질 고등어는 냉동 보관하고 냉장실에서 해동하세요.',
    { allergens: ['생선'], aliases: ['고등어', '자반고등어'], shelf: { fridge: 2, freezer: 60 } }),
  ing('crab_stick', '맛살', '🦀', 'seafood', '개', [6, '1봉(6개)', 2500], 'fridge', '개봉 후 밀봉해 냉장 보관하세요.',
    { allergens: ['생선', '밀', '계란'], aliases: ['게맛살'], shelf: { fridge: 7 } }),

  // 계란·유제품
  ing('egg', '계란', '🥚', 'egg_dairy', '개', [10, '10구', 4000], 'fridge', '뾰족한 쪽을 아래로 해서 냉장실 안쪽에 두세요. 문 칸은 온도 변화가 커요.',
    { allergens: ['계란'], aliases: ['달걀', '계란'], sign: '물에 넣었을 때 둥둥 뜨면 오래된 계란이에요.', shelf: { fridge: 21 }, low: 2 }),
  ing('milk', '우유', '🥛', 'egg_dairy', 'ml', [1000, '1L', 2900], 'fridge', '문 칸보다 안쪽이 온도가 일정해요. 개봉 후에는 빨리 드세요.',
    { allergens: ['우유'], conv: { L: 1000 }, opened: '개봉 후에는 2~3일 안에 드시는 게 좋아요.', sign: '시큼한 냄새가 나거나 덩어리가 지면 드시지 마세요.', shelf: { fridge: 7 }, low: 200 }),
  ing('cheese', '슬라이스 치즈', '🧀', 'egg_dairy', '장', [10, '10장', 4500], 'fridge', '개봉 후 공기가 닿지 않게 밀봉하세요.', { allergens: ['우유'], aliases: ['치즈', '체다치즈'], shelf: { fridge: 30 } }),
  ing('mozzarella', '모짜렐라 치즈', '🧀', 'egg_dairy', 'g', [200, '200g', 5000], 'fridge', '개봉 후 밀봉해 냉장, 오래 두려면 소분해 냉동하세요.', { allergens: ['우유'], aliases: ['피자치즈'], shelf: { fridge: 14, freezer: 60 } }),
  ing('butter', '버터', '🧈', 'egg_dairy', 'g', [200, '200g', 6500], 'fridge', '냄새를 잘 흡수하니 밀폐해서 보관하세요.', { allergens: ['우유'], shelf: { fridge: 60 } }),

  // 두부·콩
  ing('tofu', '두부', '🫘', 'tofu_bean', '모', [1, '1모(300g)', 1800], 'fridge', '먹고 남은 두부는 물에 잠기게 담아 냉장하고, 물을 매일 갈아주세요.',
    { allergens: ['대두'], conv: { g: 1 / 300 }, opened: '개봉 후에는 물에 담가 2일 안에 쓰는 게 좋아요.', sign: '물이 미끈거리거나 시큼한 냄새가 나면 버리세요.', shelf: { fridge: 7 } }),
  ing('soft_tofu', '순두부', '🫘', 'tofu_bean', '봉', [1, '1봉', 1500], 'fridge', '포장째 냉장 보관하세요.', { allergens: ['대두'], conv: { g: 1 / 350 }, shelf: { fridge: 7 } }),

  // 곡류·면
  ing('rice', '밥', '🍚', 'grain', '공기', [3, '즉석밥 3개', 3800], 'room', '지은 밥은 한 공기씩 랩에 싸서 냉동하면 데워 먹기 좋아요.',
    { aliases: ['즉석밥', '햇반', '공깃밥', '쌀밥', '흰밥'], conv: { g: 1 / 210, 개: 1 }, shelf: { room: 180, fridge: 2, freezer: 30 }, low: 1 }),
  ing('ramen', '라면', '🍜', 'grain', '봉', [5, '5봉', 4500], 'room', '습기 없는 곳에 보관하세요.', { allergens: ['밀', '대두'], aliases: ['라면사리', '신라면'], conv: { 개: 1 }, shelf: { room: 150 } }),
  ing('pasta', '파스타면', '🍝', 'grain', 'g', [500, '500g', 2500], 'room', '밀봉해 습기 없는 곳에 보관하세요.', { allergens: ['밀'], aliases: ['스파게티', '스파게티면', '파스타'], shelf: { room: 365 } }),
  ing('somen', '소면', '🍜', 'grain', 'g', [500, '500g', 2500], 'room', '밀봉해 습기 없는 곳에 보관하세요.', { allergens: ['밀'], aliases: ['국수', '국수면'], shelf: { room: 365 } }),
  ing('udon', '우동면', '🍜', 'grain', '봉', [3, '3봉', 3500], 'fridge', '냉장 보관하고 표시된 기한 안에 드세요.', { allergens: ['밀'], aliases: ['우동', '우동사리'], conv: { 개: 1 }, shelf: { fridge: 30 } }),
  ing('bread', '식빵', '🍞', 'grain', '장', [12, '1봉(약 12장)', 3500], 'room', '2~3일 안에 못 먹으면 냉동하세요. 냉장 보관하면 오히려 빨리 굳어요.',
    { allergens: ['밀', '우유'], aliases: ['빵'], shelf: { room: 4, freezer: 30 } }),
  ing('tortilla', '또띠아', '🫓', 'grain', '장', [6, '6장', 3500], 'fridge', '개봉 후 밀봉해 냉장하세요.', { allergens: ['밀'], shelf: { fridge: 14 } }),
  ing('rice_cake', '떡볶이떡', '🍡', 'grain', 'g', [500, '500g', 3000], 'fridge', '굳으면 끓는 물에 살짝 데쳐 쓰세요. 오래 두려면 냉동하세요.', { aliases: ['떡', '쌀떡', '밀떡', '가래떡'], shelf: { fridge: 7, freezer: 60 } }),
  ing('dumpling', '냉동만두', '🥟', 'processed', '개', [30, '1봉(약 30개)', 7000], 'freezer', '냉동 보관하고 해동 후에는 다시 얼리지 마세요.',
    { allergens: ['밀', '돼지고기', '대두'], aliases: ['만두', '군만두', '물만두'], conv: { g: 1 / 30 }, shelf: { freezer: 180 } }),

  // 가공식품
  ing('spam', '통조림 햄', '🥫', 'processed', 'g', [200, '1캔(200g)', 4500], 'room', '개봉 후 남은 햄은 밀폐 용기에 옮겨 냉장하세요.',
    { allergens: ['돼지고기'], aliases: ['스팸', '런천미트', '리챔'], opened: '개봉 후 냉장 보관하고 3일 안에 드세요.', shelf: { room: 365 } }),
  ing('sausage', '비엔나소시지', '🌭', 'processed', 'g', [300, '300g', 4500], 'fridge', '개봉 후 밀봉해 냉장하세요.', { allergens: ['돼지고기'], aliases: ['소시지', '비엔나'], shelf: { fridge: 14 } }),
  ing('bacon', '베이컨', '🥓', 'processed', 'g', [150, '150g', 4500], 'fridge', '한 장씩 랩에 싸서 냉동하면 필요한 만큼 쓰기 좋아요.', { allergens: ['돼지고기'], shelf: { fridge: 7, freezer: 30 } }),
  ing('laver', '김', '🟩', 'processed', '장', [10, '10장', 3000], 'room', '습기를 먹으면 눅눅해져요. 지퍼백에 넣어 보관하세요.', { aliases: ['김밥김', '조미김', '구운김'], shelf: { room: 90 } }),
  ing('corn', '스위트콘', '🌽', 'processed', 'g', [200, '1캔(약 200g)', 2000], 'room', '개봉 후 다른 용기에 옮겨 냉장하세요.', { aliases: ['옥수수콘', '옥수수 통조림', '콘'], shelf: { room: 365 } }),
  ing('tomato_sauce', '토마토 파스타소스', '🥫', 'processed', 'g', [400, '1병(400g)', 4500], 'room', '개봉 후 냉장 보관하세요.', { allergens: ['토마토'], aliases: ['토마토소스', '파스타소스'], opened: '개봉 후 냉장하고 1주일 안팎으로 쓰세요.', shelf: { room: 365, fridge: 7 } }),
  ing('seaweed', '건미역', '🌊', 'processed', 'g', [50, '50g', 2500], 'room', '습기 없는 곳에 밀봉해 보관하세요.', { aliases: ['미역'], shelf: { room: 365 } }),

  // 양념
  sea('soy', '간장', '🫙', 3500, ['대두', '밀'], ['진간장', '양조간장', '국간장']),
  sea('salt', '소금', '🧂', 1500),
  sea('sugar', '설탕', '🍬', 2000),
  sea('pepper', '후추', '🧂', 2500),
  sea('oil', '식용유', '🫗', 4000, [], ['올리브유', '카놀라유', '포도씨유']),
  sea('sesame_oil', '참기름', '🫗', 5000),
  sea('sesame', '통깨', '🌰', 3000, [], ['깨']),
  sea('gochujang', '고추장', '🌶️', 4500, ['대두', '밀']),
  sea('gochugaru', '고춧가루', '🌶️', 6000),
  sea('doenjang', '된장', '🫙', 4500, ['대두']),
  sea('garlic_minced', '다진마늘', '🧄', 3500, [], ['다진 마늘']),
  sea('ketchup', '케첩', '🍅', 2500, ['토마토']),
  sea('mayo', '마요네즈', '🫙', 3000, ['계란', '대두']),
  sea('oyster', '굴소스', '🫙', 4000, ['조개류', '대두', '밀']),
  sea('vinegar', '식초', '🫙', 2000),
  sea('syrup', '올리고당', '🍯', 3000, [], ['물엿', '꿀']),
  sea('flour', '부침가루', '🌾', 2500, ['밀'], ['밀가루', '튀김가루']),
  sea('curry', '카레가루', '🍛', 3000, ['밀', '우유'], ['카레']),
]

export const CATALOG_MAP: Record<string, CatalogItem> = Object.fromEntries(CATALOG.map((c) => [c.id, c]))
export const INGREDIENTS = CATALOG.filter((c) => c.kind === 'ingredient')
export const SEASONINGS = CATALOG.filter((c) => c.kind === 'seasoning')

export const CATEGORY_LABEL: Record<Category, string> = {
  veg: '채소', fruit: '과일', meat: '육류', seafood: '수산', egg_dairy: '계란·유제품',
  tofu_bean: '두부·콩', grain: '밥·면·빵', processed: '가공식품', sauce: '양념·소스', etc: '기타',
}
export const CATEGORY_EMOJI: Record<Category, string> = {
  veg: '🥬', fruit: '🍎', meat: '🥩', seafood: '🐟', egg_dairy: '🥚', tofu_bean: '🫘',
  grain: '🍚', processed: '🥫', sauce: '🫙', etc: '🧺',
}
export const CATEGORY_TINT: Record<Category, string> = {
  veg: '#E3EEDD', fruit: '#FBE3D7', meat: '#F6DCD5', seafood: '#DCE8EF', egg_dairy: '#FBF0D2',
  tofu_bean: '#F1EDE3', grain: '#F3E7D3', processed: '#EDE3EE', sauce: '#EFE6DA', etc: '#ECEAE4',
}
export const STORAGE_LABEL: Record<StorageType, string> = { fridge: '냉장', freezer: '냉동', room: '실온' }

export const ALL_ALLERGENS: import('./types').Allergen[] = [
  '우유', '계란', '밀', '대두', '땅콩', '견과류', '갑각류', '조개류', '생선', '오징어', '돼지고기', '소고기', '닭고기', '메밀', '토마토',
]

// 카테고리별 일반 보관 안내 (카탈로그에 없는 재료용)
export const CATEGORY_TIP: Record<Category, string> = {
  veg: '물기를 닦고 키친타월로 감싸 냉장 보관하면 더 오래 신선해요.',
  fruit: '익는 속도가 다르니 종류에 맞게 실온·냉장을 나눠 보관하세요.',
  meat: '바로 쓰지 않을 고기는 1회분씩 나눠 냉동하세요. 냉장실 아래 칸에 두세요.',
  seafood: '냉동 보관이 기본이에요. 해동한 수산물은 다시 얼리지 마세요.',
  egg_dairy: '냉장실 안쪽(문 칸 말고)에 두면 온도 변화가 적어요.',
  tofu_bean: '개봉 후에는 물에 담가 냉장하고 빨리 쓰세요.',
  grain: '습기가 없는 곳에 밀봉해 보관하세요.',
  processed: '개봉 전 표시된 보관 방법을 따르고, 개봉 후에는 냉장하세요.',
  sauce: '개봉 후 냉장 표시가 있는지 확인하세요.',
  etc: '포장지에 적힌 보관 방법을 따라 주세요.',
}
