import type { Recipe } from './types'

// 1인분 기준 레시피. amount는 catalog의 기준 단위입니다.
// 양념(text)은 재고 수량으로 차감하지 않고 "보유 여부"만 확인합니다.

export const RECIPES: Recipe[] = [
  {
    id: 'egg-fried-rice', name: '계란볶음밥', emoji: '🍳', desc: '밥과 계란만 있으면 10분 만에 끝나는 기본 한 끼',
    time: 10, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['담백', '고소'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'rice', amount: 1 }, { id: 'egg', amount: 2 }, { id: 'green_onion', amount: 0.5 },
      { id: 'carrot', amount: 0.2, optional: true },
      { id: 'oil', text: '1큰술' }, { id: 'soy', text: '1작은술' }, { id: 'salt', text: '약간' },
    ],
    steps: [
      '대파는 송송 썰고, 당근이 있으면 잘게 다져요.',
      '프라이팬에 식용유를 두르고 중불에서 대파를 1분 볶아 파기름을 내요.',
      '계란 2개를 팬 한쪽에 풀어 스크램블처럼 반쯤 익혀요(약 1분).',
      '밥과 당근을 넣고 센불에서 2~3분 볶으며 계란과 섞어요.',
      '팬 가장자리에 간장을 둘러 향을 내고 소금으로 간을 맞춰요.',
    ],
    tip: '찬밥을 쓰면 더 고슬고슬해요.',
  },
  {
    id: 'kimchi-fried-rice', name: '김치볶음밥', emoji: '🍛', desc: '시어진 김치를 맛있게 소진하는 대표 메뉴',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 1, tastes: ['짭짤', '매콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'rice', amount: 1 }, { id: 'kimchi', amount: 100 }, { id: 'egg', amount: 1 },
      { id: 'spam', amount: 50, optional: true }, { id: 'green_onion', amount: 0.3, optional: true },
      { id: 'oil', text: '1큰술' }, { id: 'sugar', text: '½작은술' }, { id: 'gochugaru', text: '½작은술' },
    ],
    steps: [
      '김치는 가위로 잘게 자르고, 햄이 있으면 작은 깍둑 모양으로 썰어요.',
      '중불에서 식용유에 대파와 햄을 1분 볶아요.',
      '김치와 설탕을 넣고 김치가 투명해질 때까지 3분 볶아요.',
      '밥을 넣고 고춧가루를 뿌려 2분 더 볶아요.',
      '다른 쪽에서 계란 프라이를 만들어 위에 올려요.',
    ],
    tip: '김치가 덜 시었다면 식초를 몇 방울 넣으면 감칠맛이 살아나요.',
  },
  {
    id: 'braised-tofu', name: '두부조림', emoji: '🍲', desc: '두부 반 모로 만드는 밥도둑 반찬',
    time: 20, difficulty: 1, tools: ['프라이팬'], spicy: 1, tastes: ['짭짤', '매콤'], tags: ['onePan'],
    ingredients: [
      { id: 'tofu', amount: 0.5 }, { id: 'green_onion', amount: 0.3 }, { id: 'onion', amount: 0.25, optional: true },
      { id: 'soy', text: '2큰술' }, { id: 'gochugaru', text: '1작은술' }, { id: 'sugar', text: '1작은술' },
      { id: 'garlic_minced', text: '½큰술' }, { id: 'oil', text: '1큰술' }, { id: 'sesame_oil', text: '약간' },
    ],
    steps: [
      '두부를 1cm 두께로 썰어 키친타월로 물기를 빼요.',
      '간장·고춧가루·설탕·다진마늘·물 4큰술을 섞어 양념장을 만들어요.',
      '식용유를 두른 팬에 두부를 중불로 앞뒤 3분씩 노릇하게 구워요.',
      '양파·대파를 올리고 양념장을 끼얹은 뒤 약불에서 5분 졸여요.',
      '불을 끄고 참기름을 둘러 마무리해요.',
    ],
  },
  {
    id: 'tofu-egg-scramble', name: '두부계란볶음', emoji: '🥚', desc: '두부 ¼모와 계란으로 만드는 부드러운 단백질 한 접시',
    time: 10, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['담백', '고소'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'tofu', amount: 0.25 }, { id: 'egg', amount: 2 }, { id: 'green_onion', amount: 0.2, optional: true },
      { id: 'oil', text: '½큰술' }, { id: 'salt', text: '약간' }, { id: 'pepper', text: '약간' },
    ],
    steps: [
      '두부는 손으로 으깨서 키친타월로 물기를 꼭 짜요.',
      '중불로 달군 팬에 식용유를 두르고 두부를 2분 볶아 수분을 날려요.',
      '계란을 풀어 넣고 젓가락으로 저으며 1~2분 익혀요.',
      '소금·후추로 간하고 대파를 뿌려 마무리해요.',
    ],
  },
  {
    id: 'doenjang-jjigae', name: '두부된장찌개', emoji: '🥘', desc: '자투리 채소를 모아 끓이는 구수한 찌개',
    time: 20, difficulty: 1, tools: ['냄비'], spicy: 0, tastes: ['구수', '짭짤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'tofu', amount: 0.25 }, { id: 'zucchini', amount: 0.3 }, { id: 'onion', amount: 0.25 },
      { id: 'potato', amount: 0.5, optional: true }, { id: 'green_onion', amount: 0.2, optional: true }, { id: 'chili', amount: 1, optional: true },
      { id: 'doenjang', text: '1½큰술' }, { id: 'garlic_minced', text: '½작은술' },
    ],
    steps: [
      '물 400ml에 된장을 풀고 센불로 끓여요.',
      '감자를 넣고 3분, 애호박·양파를 넣고 3분 더 끓여요.',
      '두부를 깍둑썰어 넣고 다진마늘을 넣어 중불에서 4분 끓여요.',
      '대파와 청양고추를 넣고 1분 뒤 불을 꺼요.',
    ],
  },
  {
    id: 'kimchi-jjigae', name: '돼지고기 김치찌개', emoji: '🍲', desc: '신김치와 돼지고기로 끓이는 든든한 찌개',
    time: 25, difficulty: 1, tools: ['냄비'], spicy: 2, tastes: ['매콤', '짭짤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'kimchi', amount: 150 }, { id: 'pork', amount: 100 }, { id: 'tofu', amount: 0.25, optional: true },
      { id: 'green_onion', amount: 0.3, optional: true }, { id: 'onion', amount: 0.25, optional: true },
      { id: 'gochugaru', text: '1작은술' }, { id: 'garlic_minced', text: '½작은술' }, { id: 'sugar', text: '약간' },
    ],
    steps: [
      '냄비에 돼지고기를 넣고 중불에서 3분 볶아 기름을 내요.',
      '김치와 설탕을 넣고 3분 더 볶아요.',
      '물 400ml, 고춧가루, 다진마늘을 넣고 센불에서 끓기 시작하면 중불로 10분 끓여요.',
      '두부·양파·대파를 넣고 3분 더 끓여요.',
    ],
  },
  {
    id: 'tuna-kimchi-jjigae', name: '참치김치찌개', emoji: '🍲', desc: '고기 없이 참치캔으로 빠르게 끓이는 찌개',
    time: 20, difficulty: 1, tools: ['냄비'], spicy: 2, tastes: ['매콤', '짭짤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'kimchi', amount: 150 }, { id: 'tuna', amount: 1 }, { id: 'tofu', amount: 0.25, optional: true },
      { id: 'green_onion', amount: 0.3, optional: true },
      { id: 'gochugaru', text: '1작은술' }, { id: 'garlic_minced', text: '½작은술' },
    ],
    steps: [
      '냄비에 김치와 참치캔 기름 1큰술을 넣고 중불에서 3분 볶아요.',
      '물 400ml와 고춧가루, 다진마늘을 넣고 끓여요.',
      '끓으면 참치와 두부를 넣고 중불로 7분 끓여요.',
      '대파를 넣고 1분 뒤 불을 꺼요.',
    ],
  },
  {
    id: 'microwave-egg', name: '전자레인지 계란찜', emoji: '🥚', desc: '불 없이 그릇 하나로 만드는 부드러운 계란찜',
    time: 7, difficulty: 1, tools: ['전자레인지'], spicy: 0, tastes: ['담백'], tags: ['microwave', 'fewDishes', 'noFire'],
    ingredients: [
      { id: 'egg', amount: 2 }, { id: 'green_onion', amount: 0.1, optional: true }, { id: 'salt', text: '2꼬집' },
    ],
    steps: [
      '전자레인지용 그릇에 계란 2개와 물 100ml, 소금을 넣고 잘 풀어요.',
      '대파가 있으면 조금 썰어 넣어요.',
      '랩을 씌우고 구멍을 2~3개 낸 뒤 1분 30초 돌려요.',
      '한 번 저어 준 뒤 1분 더 돌리고, 가운데가 덜 익었으면 20초씩 추가해요.',
    ],
    tip: '전자레인지마다 출력이 달라요. 처음에는 짧게 돌리며 확인하세요.',
  },
  {
    id: 'rolled-omelet', name: '계란말이', emoji: '🍳', desc: '도시락 반찬으로도 좋은 도톰한 계란말이',
    time: 15, difficulty: 2, tools: ['프라이팬'], spicy: 0, tastes: ['담백', '고소'], tags: ['onePan'],
    ingredients: [
      { id: 'egg', amount: 3 }, { id: 'green_onion', amount: 0.2 }, { id: 'carrot', amount: 0.15, optional: true },
      { id: 'salt', text: '2꼬집' }, { id: 'oil', text: '1큰술' },
    ],
    steps: [
      '계란 3개에 소금, 다진 대파·당근을 넣고 잘 풀어요.',
      '약불로 달군 팬에 기름을 얇게 두르고 계란물의 ⅓을 부어요.',
      '반쯤 익으면 한쪽 끝에서부터 돌돌 말아요.',
      '남은 계란물을 두 번에 나눠 부으며 같은 방법으로 말아요.',
      '한 김 식힌 뒤 썰어야 모양이 예뻐요.',
    ],
  },
  {
    id: 'egg-toast', name: '스크램블 치즈 토스트', emoji: '🍞', desc: '바쁜 아침 10분 토스트',
    time: 10, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['고소', '달콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'bread', amount: 2 }, { id: 'egg', amount: 2 }, { id: 'cheese', amount: 1, optional: true },
      { id: 'butter', amount: 10, optional: true },
      { id: 'salt', text: '약간' }, { id: 'ketchup', text: '취향껏', optional: true },
    ],
    steps: [
      '약불로 달군 팬에 버터(없으면 식용유)를 녹이고 식빵을 앞뒤 1분씩 구워 꺼내요.',
      '같은 팬에 계란을 풀어 소금을 넣고 부드럽게 스크램블해요(약 1분).',
      '식빵 위에 치즈와 스크램블을 올리고 나머지 식빵으로 덮어요.',
      '케첩을 곁들여요.',
    ],
  },
  {
    id: 'tuna-mayo-bowl', name: '참치마요덮밥', emoji: '🍙', desc: '불 쓰지 않고 5분 만에 완성하는 덮밥',
    time: 7, difficulty: 1, tools: [], spicy: 0, tastes: ['고소', '짭짤'], tags: ['noFire', 'fewDishes'],
    ingredients: [
      { id: 'rice', amount: 1 }, { id: 'tuna', amount: 1 }, { id: 'onion', amount: 0.2, optional: true },
      { id: 'laver', amount: 1, optional: true },
      { id: 'mayo', text: '1½큰술' }, { id: 'soy', text: '1작은술' }, { id: 'sugar', text: '약간' },
    ],
    steps: [
      '참치캔의 기름을 숟가락으로 꾹 눌러 빼요.',
      '양파가 있으면 잘게 다져 찬물에 3분 담가 매운맛을 빼요.',
      '참치·양파·마요네즈·설탕을 섞어요.',
      '따뜻한 밥 위에 간장을 살짝 두르고 참치마요와 부순 김을 올려요.',
    ],
  },
  {
    id: 'spam-mayo-bowl', name: '스팸마요덮밥', emoji: '🍱', desc: '햄·계란·마요네즈의 든든한 조합',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['짭짤', '고소', '달콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'rice', amount: 1 }, { id: 'spam', amount: 70 }, { id: 'egg', amount: 1 }, { id: 'laver', amount: 1, optional: true },
      { id: 'mayo', text: '1큰술' }, { id: 'soy', text: '1큰술' }, { id: 'sugar', text: '½큰술' }, { id: 'oil', text: '약간' },
    ],
    steps: [
      '햄을 작게 깍둑썰어 중불에서 3분 노릇하게 구워요.',
      '간장·설탕·물 1큰술을 넣고 1분 졸여요.',
      '햄을 덜어내고 같은 팬에 계란을 스크램블해요.',
      '밥 위에 계란, 햄, 김을 올리고 마요네즈를 뿌려요.',
    ],
  },
  {
    id: 'jeyuk', name: '제육볶음', emoji: '🥘', desc: '매콤달콤한 돼지고기 볶음, 대표 자취 요리',
    time: 25, difficulty: 2, tools: ['프라이팬'], spicy: 2, tastes: ['매콤', '달콤'], tags: ['onePan'],
    ingredients: [
      { id: 'pork', amount: 200 }, { id: 'onion', amount: 0.5 }, { id: 'green_onion', amount: 0.3 },
      { id: 'cabbage', amount: 100, optional: true }, { id: 'chili', amount: 1, optional: true },
      { id: 'gochujang', text: '1½큰술' }, { id: 'gochugaru', text: '1큰술' }, { id: 'soy', text: '1큰술' },
      { id: 'sugar', text: '1큰술' }, { id: 'garlic_minced', text: '½큰술' }, { id: 'sesame_oil', text: '약간' },
    ],
    steps: [
      '고추장·고춧가루·간장·설탕·다진마늘을 섞어 양념장을 만들어요.',
      '돼지고기를 양념장에 10분 재워요(바쁘면 생략 가능).',
      '중불로 달군 팬에 고기를 넣고 5분 볶아요.',
      '양파·양배추를 넣고 4분, 대파·청양고추를 넣고 1분 더 볶아요.',
      '참기름을 둘러 마무리해요.',
    ],
    tip: '고기는 속까지 완전히 익혀 주세요.',
  },
  {
    id: 'bulgogi', name: '소불고기', emoji: '🥩', desc: '달짝지근한 간장 양념의 소고기 볶음',
    time: 25, difficulty: 2, tools: ['프라이팬'], spicy: 0, tastes: ['달콤', '짭짤'], tags: ['onePan'],
    ingredients: [
      { id: 'beef', amount: 150 }, { id: 'onion', amount: 0.5 }, { id: 'green_onion', amount: 0.3 },
      { id: 'carrot', amount: 0.2, optional: true }, { id: 'king_oyster', amount: 1, optional: true },
      { id: 'soy', text: '2큰술' }, { id: 'sugar', text: '1큰술' }, { id: 'garlic_minced', text: '½큰술' },
      { id: 'sesame_oil', text: '½큰술' }, { id: 'pepper', text: '약간' },
    ],
    steps: [
      '간장·설탕·다진마늘·참기름·후추를 섞어 소고기를 10분 재워요.',
      '양파·당근·버섯은 채 썰어요.',
      '중불에서 고기를 3분 볶다가 채소를 넣고 4분 더 볶아요.',
      '대파를 넣고 30초 볶아 마무리해요.',
    ],
  },
  {
    id: 'chicken-veg-stirfry', name: '닭가슴살 채소볶음', emoji: '🍗', desc: '굴소스로 맛을 낸 담백한 단백질 볶음',
    time: 20, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['담백', '짭짤'], tags: ['onePan'],
    ingredients: [
      { id: 'chicken_breast', amount: 150 }, { id: 'bell_pepper', amount: 0.5 }, { id: 'onion', amount: 0.3 },
      { id: 'broccoli', amount: 0.3, optional: true },
      { id: 'oyster', text: '1큰술' }, { id: 'oil', text: '1큰술' }, { id: 'garlic_minced', text: '½작은술' }, { id: 'pepper', text: '약간' },
    ],
    steps: [
      '닭가슴살을 한입 크기로 썰고 후추를 뿌려요.',
      '중불에서 식용유와 다진마늘을 30초 볶아 향을 내요.',
      '닭가슴살을 넣고 5분 볶아 속까지 익혀요.',
      '양파·파프리카·브로콜리를 넣고 3분 볶은 뒤 굴소스로 간해요.',
    ],
    tip: '닭고기는 속까지 하얗게 익었는지 꼭 확인하세요.',
  },
  {
    id: 'teriyaki-chicken-bowl', name: '간장 닭다리살 덮밥', emoji: '🍗', desc: '겉은 바삭, 속은 촉촉한 데리야끼풍 덮밥',
    time: 25, difficulty: 2, tools: ['프라이팬'], spicy: 0, tastes: ['달콤', '짭짤'], tags: ['onePan'],
    ingredients: [
      { id: 'chicken_thigh', amount: 200 }, { id: 'rice', amount: 1 }, { id: 'green_onion', amount: 0.2, optional: true },
      { id: 'soy', text: '2큰술' }, { id: 'sugar', text: '1큰술' }, { id: 'garlic_minced', text: '½작은술' }, { id: 'oil', text: '약간' },
    ],
    steps: [
      '간장·설탕·다진마늘·물 2큰술로 소스를 만들어요.',
      '닭다리살은 껍질 쪽부터 중약불에서 6분 구워 기름을 빼요.',
      '뒤집어서 4분 더 굽고 키친타월로 기름을 닦아요.',
      '소스를 넣고 2분 졸인 뒤 썰어서 밥 위에 올리고 대파를 뿌려요.',
    ],
  },
  {
    id: 'braised-potato', name: '감자조림', emoji: '🥔', desc: '며칠 두고 먹기 좋은 달큰한 밑반찬',
    time: 25, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['달콤', '짭짤'], tags: ['onePan'],
    ingredients: [
      { id: 'potato', amount: 2 }, { id: 'onion', amount: 0.3, optional: true }, { id: 'carrot', amount: 0.3, optional: true },
      { id: 'soy', text: '3큰술' }, { id: 'sugar', text: '1큰술' }, { id: 'syrup', text: '1큰술' }, { id: 'oil', text: '1큰술' }, { id: 'sesame', text: '약간', optional: true },
    ],
    steps: [
      '감자를 깍둑썰어 찬물에 5분 담가 전분을 빼요.',
      '식용유를 두른 팬에 감자를 중불로 4분 볶아요.',
      '물 150ml, 간장, 설탕을 넣고 뚜껑을 덮어 10분 졸여요.',
      '양파·당근을 넣고 국물이 거의 없어질 때까지 졸인 뒤 올리고당과 깨를 넣어요.',
    ],
  },
  {
    id: 'potato-stirfry', name: '감자채볶음', emoji: '🥔', desc: '감자 1개로 만드는 고소한 반찬',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['담백', '고소'], tags: ['onePan'],
    ingredients: [
      { id: 'potato', amount: 1 }, { id: 'onion', amount: 0.3, optional: true }, { id: 'carrot', amount: 0.2, optional: true },
      { id: 'oil', text: '1½큰술' }, { id: 'salt', text: '약간' },
    ],
    steps: [
      '감자를 얇게 채 썰어 찬물에 헹궈 물기를 빼요.',
      '식용유를 두른 팬에 중불로 감자를 4분 볶아요.',
      '양파·당근을 넣고 2분 더 볶은 뒤 소금으로 간해요.',
    ],
  },
  {
    id: 'zucchini-jeon', name: '애호박전', emoji: '🥞', desc: '애호박 반 개로 만드는 부드러운 전',
    time: 20, difficulty: 2, tools: ['프라이팬'], spicy: 0, tastes: ['담백', '고소'], tags: ['onePan'],
    ingredients: [
      { id: 'zucchini', amount: 0.5 }, { id: 'egg', amount: 1 },
      { id: 'flour', text: '3큰술' }, { id: 'oil', text: '2큰술' }, { id: 'salt', text: '약간' },
    ],
    steps: [
      '애호박을 0.5cm 두께로 동그랗게 썰고 소금을 살짝 뿌려 5분 둬요.',
      '물기를 닦고 부침가루를 앞뒤로 얇게 묻혀요.',
      '풀어 둔 계란물을 입혀요.',
      '중약불에서 기름을 두르고 앞뒤 2분씩 노릇하게 부쳐요.',
    ],
  },
  {
    id: 'bean-sprout-soup', name: '콩나물국', emoji: '🥣', desc: '시원하고 가벼운 국',
    time: 15, difficulty: 1, tools: ['냄비'], spicy: 0, tastes: ['담백'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'bean_sprout', amount: 150 }, { id: 'green_onion', amount: 0.2, optional: true },
      { id: 'garlic_minced', text: '½작은술' }, { id: 'salt', text: '약간' }, { id: 'gochugaru', text: '약간', optional: true },
    ],
    steps: [
      '콩나물을 씻어 냄비에 넣고 물 500ml를 부어요.',
      '뚜껑을 덮고 센불에서 끓기 시작하면 5분 끓여요(중간에 뚜껑을 열지 않아요).',
      '다진마늘과 소금으로 간하고 대파를 넣어 1분 더 끓여요.',
    ],
  },
  {
    id: 'miyeokguk', name: '미역국', emoji: '🥣', desc: '건미역 한 줌으로 끓이는 따뜻한 국',
    time: 30, difficulty: 1, tools: ['냄비'], spicy: 0, tastes: ['담백', '구수'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'seaweed', amount: 8 }, { id: 'beef', amount: 50, optional: true },
      { id: 'sesame_oil', text: '1큰술' }, { id: 'soy', text: '1큰술' }, { id: 'garlic_minced', text: '½작은술' }, { id: 'salt', text: '약간' },
    ],
    steps: [
      '건미역을 찬물에 10분 불린 뒤 헹궈 먹기 좋게 잘라요.',
      '냄비에 참기름을 두르고 소고기(있으면)와 미역을 중불에서 3분 볶아요.',
      '물 500ml를 붓고 끓으면 중약불로 15분 끓여요.',
      '간장·다진마늘·소금으로 간해요.',
    ],
  },
  {
    id: 'egg-ramen', name: '계란파 라면', emoji: '🍜', desc: '남은 대파와 김치로 업그레이드한 라면',
    time: 10, difficulty: 1, tools: ['냄비'], spicy: 2, tastes: ['매콤', '짭짤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'ramen', amount: 1 }, { id: 'egg', amount: 1 }, { id: 'green_onion', amount: 0.3 },
      { id: 'kimchi', amount: 50, optional: true },
    ],
    steps: [
      '물 550ml를 센불로 끓여요.',
      '면과 스프, 김치를 넣고 3분 끓여요.',
      '계란을 넣고 30초 뒤 대파를 넣고 불을 꺼요.',
    ],
  },
  {
    id: 'tteokbokki', name: '떡볶이', emoji: '🍢', desc: '떡과 어묵으로 만드는 국민 간식',
    time: 20, difficulty: 1, tools: ['프라이팬'], spicy: 2, tastes: ['매콤', '달콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'rice_cake', amount: 200 }, { id: 'fish_cake', amount: 2 }, { id: 'green_onion', amount: 0.3 },
      { id: 'cabbage', amount: 80, optional: true }, { id: 'egg', amount: 1, optional: true },
      { id: 'gochujang', text: '1½큰술' }, { id: 'gochugaru', text: '½큰술' }, { id: 'sugar', text: '1큰술' }, { id: 'soy', text: '½큰술' },
    ],
    steps: [
      '떡은 물에 헹구고, 어묵은 한입 크기로 잘라요.',
      '팬에 물 300ml, 고추장·고춧가루·설탕·간장을 풀어 끓여요.',
      '떡과 양배추를 넣고 중불에서 5분, 어묵을 넣고 3분 졸여요.',
      '대파와 삶은 계란을 넣고 1분 더 졸여요.',
    ],
  },
  {
    id: 'tomato-pasta', name: '토마토 파스타', emoji: '🍝', desc: '시판 소스로 간단하게 만드는 파스타',
    time: 25, difficulty: 2, tools: ['냄비', '프라이팬'], spicy: 0, tastes: ['새콤', '담백'], tags: [],
    ingredients: [
      { id: 'pasta', amount: 100 }, { id: 'tomato_sauce', amount: 180 }, { id: 'onion', amount: 0.3 },
      { id: 'garlic', amount: 3 }, { id: 'bacon', amount: 40, optional: true }, { id: 'sausage', amount: 50, optional: true },
      { id: 'oil', text: '1큰술' }, { id: 'salt', text: '1작은술(면 삶는 물)' }, { id: 'pepper', text: '약간' },
    ],
    steps: [
      '끓는 물 1L에 소금을 넣고 파스타를 봉지 표시 시간보다 1분 짧게 삶아요.',
      '팬에 식용유를 두르고 편 썬 마늘·양파를 중불에서 2분 볶아요.',
      '베이컨·소시지를 넣고 2분 볶은 뒤 토마토소스를 넣어요.',
      '삶은 면과 면수 3큰술을 넣고 1~2분 섞어 후추로 마무리해요.',
    ],
  },
  {
    id: 'aglio-olio', name: '알리오 올리오', emoji: '🍝', desc: '마늘과 면만 있으면 되는 오일 파스타',
    time: 20, difficulty: 2, tools: ['냄비', '프라이팬'], spicy: 1, tastes: ['담백', '고소'], tags: [],
    ingredients: [
      { id: 'pasta', amount: 100 }, { id: 'garlic', amount: 6 }, { id: 'chili', amount: 1, optional: true },
      { id: 'oil', text: '4큰술(올리브유 추천)' }, { id: 'salt', text: '1작은술' }, { id: 'pepper', text: '약간' },
    ],
    steps: [
      '끓는 소금물에 파스타를 표시 시간보다 1분 짧게 삶고 면수 반 컵을 남겨요.',
      '팬에 기름과 편 썬 마늘을 넣고 약불에서 3분 노릇하게 익혀요.',
      '청양고추를 넣고 면과 면수 4큰술을 넣어 중불에서 1분 흔들며 섞어요.',
      '소금·후추로 간해요.',
    ],
  },
  {
    id: 'milk-cream-pasta', name: '우유 크림 파스타', emoji: '🍝', desc: '생크림 대신 우유로 만드는 크림 파스타',
    time: 25, difficulty: 2, tools: ['냄비', '프라이팬'], spicy: 0, tastes: ['고소', '담백'], tags: [],
    ingredients: [
      { id: 'pasta', amount: 100 }, { id: 'milk', amount: 200 }, { id: 'onion', amount: 0.3 },
      { id: 'bacon', amount: 40, optional: true }, { id: 'cheese', amount: 1, optional: true }, { id: 'king_oyster', amount: 1, optional: true },
      { id: 'oil', text: '½큰술' }, { id: 'salt', text: '약간' }, { id: 'pepper', text: '약간' },
    ],
    steps: [
      '파스타를 끓는 소금물에 표시 시간보다 2분 짧게 삶아요.',
      '팬에 기름을 두르고 양파·베이컨·버섯을 중불에서 3분 볶아요.',
      '우유를 붓고 약불에서 끓어오르기 직전까지 데워요.',
      '면과 치즈를 넣고 약불에서 2분 저어 농도를 맞춘 뒤 소금·후추로 간해요.',
    ],
    tip: '우유는 센불에서 끓이면 분리될 수 있으니 약불을 유지하세요.',
  },
  {
    id: 'yaki-udon', name: '야끼우동', emoji: '🍜', desc: '양배추를 듬뿍 넣은 볶음우동',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['짭짤', '달콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'udon', amount: 1 }, { id: 'cabbage', amount: 80 }, { id: 'onion', amount: 0.3, optional: true },
      { id: 'sausage', amount: 50, optional: true }, { id: 'fish_cake', amount: 1, optional: true },
      { id: 'soy', text: '1큰술' }, { id: 'oyster', text: '½큰술' }, { id: 'sugar', text: '½작은술' }, { id: 'oil', text: '1큰술' },
    ],
    steps: [
      '우동면을 끓는 물에 1분 데쳐 풀어 둬요.',
      '팬에 기름을 두르고 양파·양배추·소시지를 중불에서 3분 볶아요.',
      '면과 간장·굴소스·설탕을 넣고 2분 볶아요.',
    ],
  },
  {
    id: 'bibim-guksu', name: '비빔국수', emoji: '🍜', desc: '새콤달콤 매콤한 여름 국수',
    time: 15, difficulty: 1, tools: ['냄비'], spicy: 2, tastes: ['새콤', '매콤', '달콤'], tags: ['fewDishes'],
    ingredients: [
      { id: 'somen', amount: 100 }, { id: 'cucumber', amount: 0.3, optional: true }, { id: 'egg', amount: 1, optional: true }, { id: 'kimchi', amount: 50, optional: true },
      { id: 'gochujang', text: '1½큰술' }, { id: 'vinegar', text: '1큰술' }, { id: 'sugar', text: '1큰술' }, { id: 'sesame_oil', text: '½큰술' },
    ],
    steps: [
      '고추장·식초·설탕·참기름을 섞어 양념장을 만들어요.',
      '끓는 물에 소면을 3분 삶고 찬물에 비벼 헹궈요.',
      '물기를 뺀 면에 양념장과 송송 썬 김치를 넣고 비벼요.',
      '채 썬 오이와 삶은 계란을 올려요.',
    ],
  },
  {
    id: 'cabbage-egg-bowl', name: '양배추 계란덮밥', emoji: '🥬', desc: '양배추를 대량으로 소진하는 굴소스 덮밥',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['짭짤', '담백'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'cabbage', amount: 150 }, { id: 'egg', amount: 2 }, { id: 'rice', amount: 1 },
      { id: 'oyster', text: '1큰술' }, { id: 'soy', text: '½작은술' }, { id: 'oil', text: '1큰술' },
    ],
    steps: [
      '양배추를 채 썰어요.',
      '팬에 기름을 두르고 계란을 스크램블해 덜어 둬요.',
      '같은 팬에 양배추를 센불로 3분 볶다가 굴소스·간장을 넣어요.',
      '계란을 다시 넣어 섞고 밥 위에 올려요.',
    ],
  },
  {
    id: 'kimchi-jeon', name: '김치전', emoji: '🥞', desc: '신김치로 부치는 바삭한 전',
    time: 20, difficulty: 2, tools: ['프라이팬'], spicy: 1, tastes: ['짭짤', '매콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'kimchi', amount: 120 }, { id: 'onion', amount: 0.25, optional: true }, { id: 'chili', amount: 1, optional: true },
      { id: 'flour', text: '5큰술' }, { id: 'oil', text: '3큰술' },
    ],
    steps: [
      '김치를 잘게 썰고 양파는 채 썰어요.',
      '부침가루 5큰술과 찬물 4큰술, 김치 국물 1큰술을 섞어 반죽해요.',
      '팬에 기름을 넉넉히 두르고 중불에서 반죽을 얇게 펴요.',
      '가장자리가 바삭해지면 뒤집어 2분 더 부쳐요.',
    ],
  },
  {
    id: 'mushroom-stirfry', name: '새송이버섯볶음', emoji: '🍄', desc: '쫄깃한 버섯 반찬',
    time: 10, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['짭짤', '고소'], tags: ['onePan'],
    ingredients: [
      { id: 'king_oyster', amount: 2 }, { id: 'onion', amount: 0.3, optional: true }, { id: 'green_onion', amount: 0.2, optional: true },
      { id: 'oyster', text: '½큰술' }, { id: 'oil', text: '1큰술' },
    ],
    steps: [
      '새송이를 반 갈라 0.5cm 두께로 썰어요.',
      '중불에서 기름에 버섯과 양파를 3분 볶아요.',
      '굴소스로 간하고 대파를 넣어 마무리해요.',
    ],
  },
  {
    id: 'spinach-namul', name: '시금치나물', emoji: '🥬', desc: '데쳐서 무치는 기본 나물',
    time: 10, difficulty: 1, tools: ['냄비'], spicy: 0, tastes: ['고소', '담백'], tags: ['fewDishes'],
    ingredients: [
      { id: 'spinach', amount: 150 },
      { id: 'garlic_minced', text: '½작은술' }, { id: 'sesame_oil', text: '1큰술' }, { id: 'salt', text: '약간' }, { id: 'sesame', text: '약간', optional: true },
    ],
    steps: [
      '시금치 뿌리 쪽을 다듬고 깨끗이 씻어요.',
      '끓는 소금물에 30초만 데친 뒤 찬물에 헹궈 물기를 꼭 짜요.',
      '다진마늘·참기름·소금·깨를 넣고 조물조물 무쳐요.',
    ],
  },
  {
    id: 'cucumber-salad', name: '오이무침', emoji: '🥒', desc: '불 없이 5분, 새콤한 반찬',
    time: 10, difficulty: 1, tools: [], spicy: 1, tastes: ['새콤', '매콤'], tags: ['noFire', 'fewDishes'],
    ingredients: [
      { id: 'cucumber', amount: 1 }, { id: 'onion', amount: 0.2, optional: true },
      { id: 'gochugaru', text: '1작은술' }, { id: 'vinegar', text: '1큰술' }, { id: 'sugar', text: '½큰술' }, { id: 'garlic_minced', text: '약간' }, { id: 'salt', text: '약간' },
    ],
    steps: [
      '오이를 얇게 썰어 소금을 살짝 뿌리고 5분 절여요.',
      '물기를 가볍게 짜요.',
      '고춧가루·식초·설탕·다진마늘과 양파를 넣고 무쳐요.',
    ],
  },
  {
    id: 'pan-dumpling', name: '군만두', emoji: '🥟', desc: '냉동만두를 바삭하게',
    time: 12, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['고소', '짭짤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'dumpling', amount: 8 }, { id: 'oil', text: '2큰술' }, { id: 'soy', text: '찍어 먹을 만큼', optional: true },
    ],
    steps: [
      '팬에 기름을 두르고 중불에서 만두를 올려요.',
      '바닥이 노릇해지면(약 3분) 물 3큰술을 넣고 뚜껑을 덮어 4분 쪄요.',
      '뚜껑을 열고 수분을 날리며 1분 더 구워요.',
    ],
  },
  {
    id: 'sausage-veg', name: '소시지 채소볶음', emoji: '🌭', desc: '케첩 양념의 달콤한 반찬',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['달콤', '짭짤'], tags: ['onePan'],
    ingredients: [
      { id: 'sausage', amount: 100 }, { id: 'onion', amount: 0.3 }, { id: 'bell_pepper', amount: 0.5, optional: true },
      { id: 'ketchup', text: '2큰술' }, { id: 'sugar', text: '½작은술' }, { id: 'oil', text: '½큰술' },
    ],
    steps: [
      '소시지에 칼집을 내고 끓는 물에 30초 데쳐요.',
      '양파·파프리카를 한입 크기로 썰어요.',
      '중불에서 기름에 채소를 2분, 소시지를 넣고 2분 볶아요.',
      '케첩·설탕을 넣고 1분 더 볶아요.',
    ],
  },
  {
    id: 'airfryer-potato', name: '에어프라이어 감자구이', emoji: '🥔', desc: '기름 적게, 겉바속촉 감자',
    time: 25, difficulty: 1, tools: ['에어프라이어'], spicy: 0, tastes: ['고소', '짭짤'], tags: ['fewDishes'],
    ingredients: [
      { id: 'potato', amount: 2 }, { id: 'oil', text: '1큰술' }, { id: 'salt', text: '약간' }, { id: 'pepper', text: '약간' },
    ],
    steps: [
      '감자를 웨지 모양으로 썰어 찬물에 5분 담갔다가 물기를 닦아요.',
      '기름·소금·후추를 버무려요.',
      '180℃ 에어프라이어에 10분, 뒤집어서 8분 더 구워요.',
    ],
  },
  {
    id: 'microwave-sweet-potato', name: '전자레인지 군고구마', emoji: '🍠', desc: '간식이나 가벼운 아침으로',
    time: 8, difficulty: 1, tools: ['전자레인지'], spicy: 0, tastes: ['달콤'], tags: ['microwave', 'fewDishes', 'noFire'],
    ingredients: [{ id: 'sweet_potato', amount: 1 }],
    steps: [
      '고구마를 씻어 물기가 조금 남은 채로 키친타월로 감싸요.',
      '전자레인지용 그릇에 담아 랩을 씌우고 3분 돌려요.',
      '뒤집어서 2~3분 더 돌리고 젓가락이 쑥 들어가면 완성이에요.',
    ],
  },
  {
    id: 'chicken-salad', name: '닭가슴살 샐러드', emoji: '🥗', desc: '가볍게 먹는 한 그릇 샐러드',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['담백', '새콤'], tags: ['onePan'],
    ingredients: [
      { id: 'chicken_breast', amount: 100 }, { id: 'lettuce', amount: 80 }, { id: 'tomato', amount: 1, optional: true }, { id: 'cucumber', amount: 0.5, optional: true },
      { id: 'vinegar', text: '1큰술' }, { id: 'syrup', text: '½큰술' }, { id: 'oil', text: '1큰술' }, { id: 'salt', text: '약간' },
    ],
    steps: [
      '닭가슴살에 소금을 뿌려 중불에서 앞뒤 4분씩 속까지 익혀요.',
      '상추·토마토·오이를 먹기 좋게 썰어요.',
      '식초·올리고당·기름·소금을 섞어 드레싱을 만들어요.',
      '식힌 닭가슴살을 썰어 올리고 드레싱을 뿌려요.',
    ],
  },
  {
    id: 'sundubu', name: '순두부찌개', emoji: '🍲', desc: '순두부 한 봉으로 끓이는 얼큰한 찌개',
    time: 20, difficulty: 2, tools: ['냄비'], spicy: 2, tastes: ['매콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'soft_tofu', amount: 1 }, { id: 'egg', amount: 1 }, { id: 'onion', amount: 0.25 },
      { id: 'green_onion', amount: 0.2, optional: true }, { id: 'pork_mince', amount: 50, optional: true },
      { id: 'gochugaru', text: '1큰술' }, { id: 'garlic_minced', text: '½작은술' }, { id: 'soy', text: '½큰술' }, { id: 'oil', text: '1큰술' },
    ],
    steps: [
      '냄비에 기름·고춧가루·다진마늘·대파 흰 부분을 넣고 약불에서 1분 볶아 고추기름을 내요.',
      '다진 고기와 양파를 넣고 2분 볶아요.',
      '물 300ml와 간장을 넣고 끓으면 순두부를 큼직하게 떠 넣어 5분 끓여요.',
      '계란을 깨 넣고 1분 뒤 불을 꺼요.',
    ],
  },
  {
    id: 'shrimp-fried-rice', name: '새우볶음밥', emoji: '🦐', desc: '냉동새우로 만드는 탱글한 볶음밥',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['담백', '짭짤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'rice', amount: 1 }, { id: 'shrimp', amount: 80 }, { id: 'egg', amount: 1 }, { id: 'green_onion', amount: 0.3 },
      { id: 'carrot', amount: 0.2, optional: true },
      { id: 'oil', text: '1큰술' }, { id: 'oyster', text: '½큰술' }, { id: 'salt', text: '약간' },
    ],
    steps: [
      '냉동새우는 찬물에 5분 담가 해동해요.',
      '팬에 기름을 두르고 대파를 1분 볶다가 새우를 넣고 2분 볶아요.',
      '계란을 한쪽에 스크램블하고 밥과 당근을 넣어 2분 볶아요.',
      '굴소스와 소금으로 간해요.',
    ],
  },
  {
    id: 'grilled-mackerel', name: '고등어구이', emoji: '🐟', desc: '프라이팬으로 굽는 생선구이',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['짭짤', '고소'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'mackerel', amount: 150 }, { id: 'oil', text: '1큰술' }, { id: 'flour', text: '1큰술', optional: true },
    ],
    steps: [
      '해동한 고등어의 물기를 키친타월로 닦아요.',
      '부침가루를 얇게 묻히면 덜 튀고 더 바삭해요.',
      '중불에서 껍질 쪽부터 4분, 뒤집어 3분 구워요.',
    ],
  },
  {
    id: 'curry-rice', name: '카레라이스', emoji: '🍛', desc: '남은 감자·당근·양파를 한 번에 소진',
    time: 30, difficulty: 1, tools: ['냄비'], spicy: 1, tastes: ['짭짤', '달콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'rice', amount: 1 }, { id: 'potato', amount: 1 }, { id: 'carrot', amount: 0.5 }, { id: 'onion', amount: 0.5 },
      { id: 'pork', amount: 80, optional: true },
      { id: 'curry', text: '3큰술(약 25g)' }, { id: 'oil', text: '1큰술' },
    ],
    steps: [
      '감자·당근·양파·고기를 깍둑썰어요.',
      '냄비에 기름을 두르고 고기와 채소를 중불에서 4분 볶아요.',
      '물 300ml를 붓고 감자가 익을 때까지 12분 끓여요.',
      '불을 약하게 줄이고 카레가루를 풀어 3분 저으며 끓인 뒤 밥에 곁들여요.',
    ],
  },
  {
    id: 'corn-cheese', name: '전자레인지 콘치즈', emoji: '🌽', desc: '불 없이 만드는 달콤한 간식',
    time: 6, difficulty: 1, tools: ['전자레인지'], spicy: 0, tastes: ['달콤', '고소'], tags: ['microwave', 'fewDishes', 'noFire'],
    ingredients: [
      { id: 'corn', amount: 150 }, { id: 'mozzarella', amount: 50 },
      { id: 'mayo', text: '1큰술' }, { id: 'sugar', text: '½작은술' },
    ],
    steps: [
      '스위트콘의 물기를 빼고 마요네즈·설탕과 섞어요.',
      '전자레인지용 그릇에 담고 모짜렐라를 올려요.',
      '랩 없이 2분, 치즈가 다 녹지 않으면 30초씩 더 돌려요.',
    ],
  },
  {
    id: 'tortilla-pizza', name: '또띠아 피자', emoji: '🍕', desc: '또띠아 한 장으로 만드는 얇은 피자',
    time: 15, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['고소', '새콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'tortilla', amount: 1 }, { id: 'tomato_sauce', amount: 50 }, { id: 'mozzarella', amount: 60 },
      { id: 'sausage', amount: 40, optional: true }, { id: 'bell_pepper', amount: 0.25, optional: true }, { id: 'onion', amount: 0.15, optional: true },
    ],
    steps: [
      '또띠아에 토마토소스를 얇게 펴 발라요.',
      '소시지·파프리카·양파를 올리고 모짜렐라를 덮어요.',
      '약불의 팬에 올려 뚜껑을 덮고 5~6분, 치즈가 녹을 때까지 구워요.',
    ],
  },
  {
    id: 'fishcake-stirfry', name: '어묵볶음', emoji: '🍢', desc: '도시락 단골 반찬',
    time: 10, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['달콤', '짭짤'], tags: ['onePan'],
    ingredients: [
      { id: 'fish_cake', amount: 3 }, { id: 'onion', amount: 0.3, optional: true }, { id: 'green_onion', amount: 0.2, optional: true },
      { id: 'soy', text: '1큰술' }, { id: 'sugar', text: '½큰술' }, { id: 'oil', text: '½큰술' },
    ],
    steps: [
      '어묵을 길게 썰어 끓는 물에 살짝 데쳐 기름기를 빼요.',
      '팬에 기름을 두르고 양파·어묵을 중불에서 3분 볶아요.',
      '간장·설탕·물 2큰술을 넣고 1분 졸여요.',
    ],
  },
  {
    id: 'banana-toast', name: '바나나 버터 토스트', emoji: '🍌', desc: '익은 바나나를 맛있게 처리하는 아침 메뉴',
    time: 8, difficulty: 1, tools: ['프라이팬'], spicy: 0, tastes: ['달콤'], tags: ['onePan', 'fewDishes'],
    ingredients: [
      { id: 'bread', amount: 2 }, { id: 'banana', amount: 1 }, { id: 'butter', amount: 10, optional: true },
      { id: 'syrup', text: '취향껏', optional: true },
    ],
    steps: [
      '약불로 달군 팬에 버터를 녹이고 식빵을 앞뒤 1분씩 구워요.',
      '바나나를 얇게 썰어 같은 팬에 30초 구워요.',
      '식빵 위에 바나나를 올리고 올리고당을 뿌려요.',
    ],
  },
  {
    id: 'tofu-kimchi', name: '두부김치', emoji: '🥢', desc: '데친 두부와 볶은 김치의 조합',
    time: 15, difficulty: 1, tools: ['프라이팬', '냄비'], spicy: 1, tastes: ['짭짤', '매콤'], tags: [],
    ingredients: [
      { id: 'tofu', amount: 0.5 }, { id: 'kimchi', amount: 120 }, { id: 'pork', amount: 60, optional: true },
      { id: 'sugar', text: '½작은술' }, { id: 'sesame_oil', text: '½큰술' }, { id: 'oil', text: '½큰술' },
    ],
    steps: [
      '두부를 끓는 물에 3분 데쳐 도톰하게 썰어요.',
      '팬에 기름을 두르고 고기를 2분, 김치와 설탕을 넣고 4분 볶아요.',
      '참기름을 둘러 두부와 함께 담아요.',
    ],
  },
]

export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]))
