import { Link } from 'react-router-dom'
import { Camera, CalendarDays, ChefHat, ShoppingBasket, Receipt, Wallet, Replace, Sparkles } from 'lucide-react'
import { useStore } from '../store/AppStore'
import { FreshRing } from '../components/ui'
import { addDays, today } from '../lib/util'

export default function Landing() {
  const { user } = useStore()
  const t = today()
  return (
    <div className="min-h-screen">
      <header className="max-w-[1160px] mx-auto px-5 lg:px-10 h-[72px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="w-9 h-9 rounded-xl" />
          <span className="title text-[18px]">냉장고 한 끼</span>
        </Link>
        <div className="flex gap-2">
          {user ? <Link to="/app" className="btn btn-primary">내 냉장고 열기</Link> : (
            <>
              <Link to="/login" className="btn btn-ghost">로그인</Link>
              <Link to="/signup" className="btn btn-primary">무료로 시작하기</Link>
            </>
          )}
        </div>
      </header>

      <section className="max-w-[1160px] mx-auto px-5 lg:px-10 pt-8 lg:pt-16 pb-16 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div>
          <p className="text-leaf font-semibold text-[15px] mb-4">자취생·1인 가구를 위한 냉장고 관리</p>
          <h1 className="display text-[40px] sm:text-[52px] lg:text-[60px] text-basil">
            두부 반 모가 남았다면,<br />내일 아침 메뉴까지<br />정해 드릴게요
          </h1>
          <p className="mt-6 text-[17px] text-sub leading-relaxed max-w-[46ch]">
            사진이나 영수증으로 재료를 넣으면 유통기한이 가까운 것부터 쓰는 메뉴를 고르고,
            남은 양을 며칠에 나눠 쓰는 식단과 부족한 재료의 장보기 목록까지 이어서 만들어요.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={user ? '/app' : '/signup'} className="btn btn-primary btn-lg">{user ? '대시보드로 가기' : '이메일로 가입하기'}</Link>
            {!user && <Link to="/login" className="btn btn-line btn-lg">이미 계정이 있어요</Link>}
          </div>
        </div>

        {/* 제품의 핵심 장면: 냉장고 선반 + 두부 1모 소진 계획 */}
        <div className="relative">
          <div className="panel p-5 sm:p-6 shadow-[0_30px_60px_-30px_rgba(31,74,53,.35)]">
            <div className="flex items-center justify-between mb-4">
              <p className="title text-[16px]">오늘의 냉장고</p>
              <span className="text-[13px] text-sub">유통기한이 가까운 순</span>
            </div>
            <div className="grid grid-cols-4 gap-3 pb-5 border-b border-dashed border-line-2">
              {[
                { e: '🫘', n: '두부', d: 1, tint: '#F1EDE3' },
                { e: '🥒', n: '애호박', d: 2, tint: '#E3EEDD' },
                { e: '🌿', n: '대파', d: 4, tint: '#E3EEDD' },
                { e: '🥚', n: '계란', d: 12, tint: '#FBF0D2' },
              ].map((x) => (
                <div key={x.n} className="flex flex-col items-center gap-1.5">
                  <FreshRing emoji={x.e} expiresAt={addDays(t, x.d)} size={62} tint={x.tint} />
                  <span className="text-[13px] font-semibold">{x.n}</span>
                  <span className="text-[11.5px] text-sub num">D-{x.d}</span>
                </div>
              ))}
            </div>
            <p className="title text-[15px] mt-5 mb-3">두부 1모, 이렇게 나눠 써요</p>
            <ol className="space-y-2">
              {[
                { when: '오늘 저녁', menu: '두부조림', amt: '½모', w: 50 },
                { when: '내일 아침', menu: '두부계란볶음', amt: '¼모', w: 25 },
                { when: '내일 저녁', menu: '두부된장찌개', amt: '¼모', w: 25 },
              ].map((r) => (
                <li key={r.when} className="flex items-center gap-3 rounded-2xl bg-paper px-3.5 py-2.5">
                  <span className="text-[12.5px] text-sub w-[58px] shrink-0">{r.when}</span>
                  <span className="font-semibold text-[14.5px] flex-1">{r.menu}</span>
                  <span className="relative h-2 w-16 rounded-full bg-[#ECE6D8] overflow-hidden"><span className="absolute inset-y-0 left-0 bg-leaf rounded-full" style={{ width: `${r.w * 2}%` }} /></span>
                  <span className="num text-[13.5px] font-bold text-basil w-9 text-right">{r.amt}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[13px] text-sub">계획을 마치면 재고에서 자동으로 빠지고, 부족한 재료는 장보기 목록으로 넘어가요.</p>
          </div>
        </div>
      </section>

      <section className="bg-basil text-paper">
        <div className="max-w-[1160px] mx-auto px-5 lg:px-10 py-16">
          <h2 className="display text-[30px] lg:text-[38px] max-w-[22ch]">장보기부터 마지막 한 조각까지, 한 흐름으로</h2>
          <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {[
              { i: Camera, t: '찍어서 넣기', d: '냉장고 사진이나 영수증을 올리면 재료를 찾아요. 확인한 것만 등록돼요.' },
              { i: ChefHat, t: '오늘 뭐 먹지', d: '알레르기·조리 시간·도구를 지키면서 기한 임박 재료부터 쓰는 메뉴를 골라요.' },
              { i: CalendarDays, t: '며칠에 나눠 쓰기', d: '같은 재료를 여러 끼니에 배분하고, 남는 양과 부족한 양을 계산해요.' },
              { i: ShoppingBasket, t: '모자란 것만 사기', d: '이미 있는 건 빼고 장보기 목록을 만들고, 쇼핑몰 검색으로 바로 이어져요.' },
            ].map((s, idx) => (
              <li key={s.t}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="num text-[13px] text-[#A9C3A8]">{idx + 1}</span>
                  <s.i className="w-6 h-6 text-[#CFE2C6]" />
                </div>
                <p className="title text-[19px]">{s.t}</p>
                <p className="mt-2 text-[14.5px] text-[#C9D9C6] leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-[1160px] mx-auto px-5 lg:px-10 py-16">
        <h2 className="display text-[28px] lg:text-[34px] mb-8">자취생이 실제로 막히는 순간들</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { i: Sparkles, t: '냉장고 비우기', d: '오늘·3일·7일 동안 사지 않고 버틸 수 있는 식단을 짜요. 끝나고 남을 재료도 미리 보여줘요.' },
            { i: Wallet, t: '예산 안에서 먹기', d: '주간 예산을 넘지 않게 메뉴와 장보기를 맞춰요. 예상 가격은 예상이라고 분명히 표시해요.' },
            { i: Replace, t: '재료가 없을 때', d: '우유가 없으면 무엇으로, 양파가 싫으면 무엇으로. 맛과 조리법이 어떻게 달라지는지도 알려줘요.' },
            { i: Receipt, t: '구매 기록', d: '영수증과 장보기 기록이 쌓이면 재료별 평균 구매 가격과 이번 주 식비를 볼 수 있어요.' },
            { i: ChefHat, t: '10분 한 끼', d: '전자레인지만, 프라이팬 하나로, 설거지 적게. 버튼 하나로 조건을 골라요.' },
            { i: CalendarDays, t: '알림', d: '기한 임박·경과, 재고 부족, 오늘 쓸 재료를 한곳에 모아 보여줘요.' },
          ].map((f) => (
            <div key={f.t} className="tile p-5">
              <f.i className="w-6 h-6 text-leaf mb-3" />
              <p className="title text-[17px]">{f.t}</p>
              <p className="mt-1.5 text-[14.5px] text-sub leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-[1160px] mx-auto px-5 lg:px-10 py-8 text-[13px] text-sub flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>냉장고 한 끼 · 팀 프로젝트</span>
          <span>결제는 하지 않아요. 구매는 연결된 외부 쇼핑몰에서 직접 진행해요.</span>
        </div>
      </footer>
    </div>
  )
}
