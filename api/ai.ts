// POST /api/ai — 모든 AI 기능을 처리하는 서버 함수 (Vercel Serverless Function)
// API 키는 서버 환경 변수(ANTHROPIC_API_KEY)에서만 읽고, 브라우저로 보내지 않습니다.
//
// 요청: { task, payload }
//   task = 'fridge'    냉장고 사진 → 식재료 목록(미확인 포함, 위치·포장 정보·용량 추정)
//          'identify'  사진 일부(사용자가 고른 영역) → 이 식재료가 무엇인지 후보
//          'ask'       사진 + 인식 목록 + 대화 → 추가 질문에 답하고 수량·용량 추정 수정안
//          'receipt'   영수증 사진 → 상품명·수량·가격·구매일·식재료 여부
//          'recommend' 재고·조건 → 메뉴 추천 + 남은 재료 활용법
//          'subqa'     "두부 없는데 뭘로 바꿔요?" 같은 대체·생략 질문
// 응답: { ok: true, result } 또는 { ok: false, error, code? }

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-5-5'

type Content =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

const SYSTEM_BASE =
  '너는 한국 자취 대학생을 돕는 식재료 관리 서비스 "냉장고 한 끼"의 AI야. ' +
  '반드시 요청한 JSON 객체 하나만 출력하고, 설명 문장이나 코드 블록 표시는 쓰지 마. ' +
  '사진이나 글자로 확인할 수 없는 정보(유통기한, 정확한 용량 등)는 지어내지 말고, 추정이면 추정이라고 표시해.'

const img = (p: any): Content => ({ type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.image } })

function prompts(task: string, p: any): { content: Content[]; maxTokens: number } {
  switch (task) {
    case 'fridge':
      return {
        maxTokens: 4000,
        content: [img(p), {
          type: 'text',
          text:
`냉장고(또는 식재료) 사진이야. 보이는 식재료를 하나씩 찾아 줘.
${p.hint ? `사용자 메모: ${p.hint}\n` : ''}
규칙:
- 사진 왼쪽 위에서 오른쪽 아래 순서(읽는 순서)로 나열해. 사용자가 "두 번째 식재료"라고 부를 수 있어.
- name: 한국에서 흔히 쓰는 재료 이름(예: 두부, 계란, 대파, 우유, 김치). 브랜드명은 빼고 packaging에 적어.
- 무엇인지 확실히 알 수 없으면 name을 null로, unknown을 true로 하고, candidates에 가능성 있는 후보를 최대 3개 넣어. 이름을 억지로 확정하지 마.
- category: 채소/과일/육류/수산/계란·유제품/두부·콩/밥·면·빵/가공식품/양념·소스/기타 중 하나
- qty/unit: 개수 기준(예: 계란 6 개, 대파 2 대, 두부 1 모, 우유 1 개). 셀 수 없으면 qty 1.
- amount/amountUnit: 보이는 용량·중량 추정(예: 1000 ml, 300 g). 알 수 없으면 null.
- amountText: 사람이 읽을 추정 설명(예: "1L 팩, 절반 정도 남은 것으로 보임"). 확실하지 않으면 그렇게 말해.
- packaging: 포장·용기·라벨에서 보이는 특징(예: "흰색 종이팩, 빨간 로고", "투명 반찬통").
- box: 사진 안 위치를 [x, y, w, h] (0~1 비율)로. 대략이어도 됨.
- confidence: high / medium / low
- 유통기한은 사진에 날짜가 또렷이 보이지 않으면 절대 쓰지 마(필드 없음).
- 식재료가 아닌 물건은 제외.
출력: {"items":[{"name":"우유","unknown":false,"candidates":[],"category":"계란·유제품","qty":1,"unit":"개","amount":1000,"amountUnit":"ml","amountText":"","packaging":"","box":[0.1,0.2,0.15,0.3],"confidence":"high","note":""}]}`,
        }],
      }
    case 'identify':
      return {
        maxTokens: 1500,
        content: [img(p), {
          type: 'text',
          text:
`사용자가 냉장고 사진에서 잘라낸 일부분이야. 이 안의 식재료가 무엇인지 알려 줘.
${p.hint ? `사용자 설명: ${p.hint}\n` : ''}
- 확실하면 name에 넣고, 애매하면 name은 null로 두고 candidates에 후보를 최대 4개(가능성 높은 순).
- qty/unit/amountText는 보이는 범위에서 추정. 모르면 null.
- reason: 그렇게 판단한 근거(색, 모양, 포장 글자 등)를 한 문장으로.
출력: {"name":null,"candidates":["",""],"category":"","qty":1,"unit":"개","amount":null,"amountUnit":null,"amountText":"","packaging":"","confidence":"low","reason":""}`,
        }],
      }
    case 'ask':
      return {
        maxTokens: 2000,
        content: [img(p), {
          type: 'text',
          text:
`이 냉장고 사진에서 인식한 목록이야(번호는 사용자가 부르는 번호):
${JSON.stringify(p.items)}

지금까지 대화:
${(p.history ?? []).map((h: any) => `${h.role === 'user' ? '사용자' : 'AI'}: ${h.text}`).join('\n') || '(없음)'}

사용자 질문: ${p.question}

규칙:
- 사진에 보이는 크기, 포장, 남은 양, 형태를 근거로 답해. 근거를 짧게 말해.
- 정확히 알 수 없으면 "사진만으로는 정확히 알 수 없어요"라고 하고, 가능하면 범위로 추정해(예: 약 400~600ml).
- 사용자가 수량·용량 추정을 원하거나 목록이 틀렸다면 updates에 수정안을 넣어. 확실하지 않으면 updates는 빈 배열.
- updates의 index는 위 목록의 번호. 목록에 없는 새 재료를 찾았다면 index를 null로.
- answer는 한국어 2~4문장.
출력: {"answer":"","updates":[{"index":1,"name":"우유","qty":1,"unit":"개","amount":500,"amountUnit":"ml","amountText":"약 400~600ml로 추정"}]}`,
        }],
      }
    case 'receipt':
      return {
        maxTokens: 4000,
        content: [img(p), {
          type: 'text',
          text:
`마트·편의점 영수증 사진이야. 글자를 읽어서 구매 품목을 표로 만들어 줘.
${p.partial ? '이 이미지는 영수증의 일부분이야. 보이는 줄만 읽어.\n' : ''}
- raw: 영수증에 적힌 상품명 그대로(읽은 글자). 일부만 읽혔으면 읽힌 만큼.
- name: 식재료면 일반 재료 이름(예: "풀무원 부침두부 300g" → "두부"). 무엇인지 알 수 없으면 null, unknown true.
- qty/unit: 수량(영수증 수량 칸). 포장 크기가 상품명에 있으면 amount/amountUnit에(예: 300 g).
- price: 그 줄의 결제 금액(원, 할인 반영 전 줄 금액). 못 읽으면 null.
- isFood: 먹는 식재료·음식이면 true, 봉투·생활용품이면 false.
- confidence: high / medium / low
- store: 가게 이름, date: 영수증의 거래 날짜 YYYY-MM-DD(못 읽으면 null), total: 합계(못 읽으면 null).
- 읽을 수 없는 줄을 지어내지 마. 유통기한은 영수증에 없으니 쓰지 마.
출력: {"store":"","date":null,"total":null,"items":[{"raw":"","name":"두부","unknown":false,"qty":1,"unit":"개","amount":300,"amountUnit":"g","price":2200,"isFood":true,"confidence":"high"}]}`,
        }],
      }
    case 'recommend':
      return {
        maxTokens: 6000,
        content: [{
          type: 'text',
          text:
`아래 냉장고 재고와 사용자 조건으로 지금 만들 수 있는 1인분 메뉴 ${p.count ?? 3}개를 추천해 줘.

[보유 재료] (daysLeft = 유통기한까지 남은 일수, 작을수록 먼저 써야 함. 이 목록에 없는 재료는 없는 거야)
${JSON.stringify(p.inventory)}
[보유 양념] ${JSON.stringify(p.seasonings)}
[사용자 조건] ${JSON.stringify(p.settings)}
[제외할 메뉴 이름] ${JSON.stringify(p.exclude ?? [])}
[사용 가능한 재료 이름 목록(기준 단위)] ${JSON.stringify(p.vocabulary)}

규칙:
- 재료 이름(name)은 반드시 [사용 가능한 재료 이름 목록]의 이름 그대로 써.
- 보유하지 않은 재료를 보유했다고 가정하지 마. 부족한 재료는 그대로 적으면 시스템이 '구매 필요'로 표시해.
- 알레르기·섭취 금지·싫어하는 재료는 절대 쓰지 마. 양념에 숨어 있는 경우(마요네즈=계란, 간장=대두·밀 등)도 피하기.
- 조리 시간은 settings.maxTime 이하, 난이도는 settings.skill 이하, 조리도구는 settings.tools 안에서만.
- 유통기한이 임박한 재료를 우선 쓰고, 보유 재료만으로 가능한 메뉴를 우선해.
- settings.allowPurchase가 false면 보유하지 않은 재료(양념 포함)는 쓰지 마.
- amount는 unit 기준 숫자. unit은 재료 목록의 기준 단위를 써.
- 조리 순서는 불 세기·시간을 구체적으로.
- leftoverTips: 이 요리 후 남는 재료(특히 기한 임박 재료)를 다음 끼니에 어떻게 쓸지 1~2개.

출력:
{"menus":[{"name":"","emoji":"","desc":"한 줄 소개","reason":"추천 이유","time":15,"difficulty":1,"tools":["프라이팬"],"spicy":0,"tastes":["담백"],
"ingredients":[{"name":"두부","amount":0.5,"unit":"모","optional":false}],
"seasonings":[{"name":"간장","text":"1큰술"}],"steps":["..."],"tip":"","leftoverTips":["..."]}]}`,
        }],
      }
    case 'subqa':
      return {
        maxTokens: 2000,
        content: [{
          type: 'text',
          text:
`요리: ${p.recipe}
레시피 재료(1인분): ${JSON.stringify(p.ingredients)}
${p.ingredient ? `관련 재료: ${p.ingredient}\n` : ''}사용자 질문: ${p.question}
보유 재료: ${JSON.stringify(p.owned)}
알레르기·섭취 금지: ${JSON.stringify(p.blocked)}
사용 가능한 재료 이름 목록(기준 단위): ${JSON.stringify(p.vocabulary)}

규칙:
- 맛·식감·조리 방식이 실제로 비슷한 대체재만. 억지 대체는 넣지 말고 "추천하지 않아요"라고 말해.
- 알레르기·섭취 금지 재료는 대체재로 절대 넣지 마. 보유 재료를 우선.
- 재료를 빼도 되는지 물으면 canOmit에 true/false로 답하고 맛이 어떻게 달라지는지 설명해.
- options의 name은 목록의 이름 그대로, amount/unit은 이 레시피 1인분 기준 사용량(기준 단위).
- answer는 한국어 2~4문장.
출력: {"answer":"","target":"두부","canOmit":null,"options":[{"name":"","amount":1,"unit":"개","reason":"","taste":"맛 변화","method":"조리법 변화"}]}`,
        }],
      }
    default:
      throw new Error('알 수 없는 작업이에요.')
  }
}

function extractJson(text: string): any {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('AI 응답에서 결과를 찾지 못했어요. 다시 시도해 주세요.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

const IMAGE_TASKS = ['fridge', 'identify', 'ask', 'receipt']

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST로 요청해 주세요.' })
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return res.status(503).json({
      ok: false, code: 'NO_KEY',
      error: 'AI가 연결되지 않았어요. Vercel → Settings → Environment Variables에 ANTHROPIC_API_KEY를 추가하고 다시 배포(Redeploy)해 주세요.',
    })
  }

  let body: any = req.body
  try { if (typeof body === 'string') body = JSON.parse(body) } catch { return res.status(400).json({ ok: false, error: '요청 형식이 올바르지 않아요.' }) }
  const task = body?.task
  const payload = body?.payload ?? {}
  if (IMAGE_TASKS.includes(task) && (!payload.image || !payload.mediaType)) {
    return res.status(400).json({ ok: false, error: '분석할 사진이 없어요.' })
  }
  if ((task === 'ask' || task === 'subqa') && !String(payload.question ?? '').trim()) {
    return res.status(400).json({ ok: false, error: '질문을 입력해 주세요.' })
  }

  let p: ReturnType<typeof prompts>
  try { p = prompts(task, payload) } catch (e: any) { return res.status(400).json({ ok: false, error: e.message }) }

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: p.maxTokens,
        system: SYSTEM_BASE,
        messages: [{ role: 'user', content: p.content }],
      }),
    })
    const j: any = await r.json().catch(() => null)
    if (!r.ok) {
      const msg = j?.error?.message ?? `HTTP ${r.status}`
      const hint = r.status === 401 ? ' (API 키가 올바른지 확인해 주세요)' : r.status === 429 ? ' (요청이 많아요. 잠시 후 다시 시도해 주세요)' : r.status === 400 && /credit|balance/i.test(msg) ? ' (Anthropic 계정의 크레딧을 확인해 주세요)' : ''
      return res.status(502).json({ ok: false, error: `AI 요청 실패: ${msg}${hint}` })
    }
    const text = (j?.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
    const result = extractJson(text)
    return res.status(200).json({ ok: true, result })
  } catch (e: any) {
    return res.status(502).json({ ok: false, error: `AI 응답 처리 중 오류: ${e?.message ?? e}` })
  }
}
