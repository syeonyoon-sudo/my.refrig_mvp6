import { useEffect, useMemo, useState } from 'react'
import { Check, Minus, Plus, Search, X } from 'lucide-react'
import { Modal, Segmented } from './ui'
import { CATALOG_MAP, CATEGORY_LABEL, INGREDIENTS } from '../lib/catalog'
import { defaultPick, frequentIds, parseQuickText, picksToItems, type QuickPick } from '../lib/quickadd'
import { addItem } from '../lib/actions'
import { norm } from '../lib/match'
import { itemCatalogId } from '../lib/inventory'
import { fmtQty } from '../lib/units'
import type { Category } from '../lib/types'
import { useData } from '../store/AppStore'

const CATS: Category[] = ['veg', 'meat', 'seafood', 'egg_dairy', 'tofu_bean', 'grain', 'processed', 'fruit']

/** 자주 쓰는 재료를 체크해서 한 번에 넣기 */
export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, update, toast } = useData()
  const [picks, setPicks] = useState<QuickPick[]>([])
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'often' | Category>('often')
  const [fill, setFill] = useState<'est' | 'later'>('est')

  useEffect(() => { if (open) { setPicks([]); setText(''); setQ(''); setCat('often') } }, [open])

  const owned = useMemo(() => new Set(data.inventory.map((i) => itemCatalogId(i)).filter(Boolean) as string[]), [data.inventory])
  const often = useMemo(() => frequentIds(data), [data])
  const list = useMemo(() => {
    if (q.trim()) return INGREDIENTS.filter((c) => [c.name, ...c.aliases].some((n) => norm(n).includes(norm(q)))).map((c) => c.id)
    if (cat === 'often') return often
    return INGREDIENTS.filter((c) => c.category === cat).map((c) => c.id)
  }, [q, cat, often])

  const isOn = (id: string) => picks.some((p) => p.id === id)
  const toggle = (id: string) => setPicks((ps) => (ps.some((p) => p.id === id) ? ps.filter((p) => p.id !== id) : [...ps, defaultPick(id)]))
  const step = (p: QuickPick) => (p.unit === 'g' || p.unit === 'ml' ? (p.qty >= 300 ? 100 : 50) : ['모', '대'].includes(p.unit) ? 0.5 : 1)
  const setQty = (i: number, qty: number) => setPicks((ps) => ps.map((p, k) => (k === i ? { ...p, qty: Math.max(step(p), +qty.toFixed(2)) } : p)))

  const addText = () => {
    const parsed = parseQuickText(text)
    if (!parsed.length) return
    setPicks((ps) => [...ps.filter((p) => !parsed.some((n) => (n.id ? n.id === p.id : n.name === p.name))), ...parsed])
    setText('')
  }

  const save = () => {
    let d = data
    let merged = 0
    for (const item of picksToItems(picks, fill === 'est')) {
      const r = addItem(d, item)
      d = r.data
      if (r.merged) merged++
    }
    const before = data
    update(() => d)
    toast(`${picks.length}개 재료를 넣었어요${merged ? ` (${merged}개는 기존 재고에 합침)` : ''}.`, 'ok', { label: '되돌리기', run: () => update(() => before) })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="빠르게 추가" wide
      footer={<>
        <button className="btn btn-line" onClick={onClose}>취소</button>
        <button className="btn btn-primary" disabled={!picks.length} onClick={save}>{picks.length ? `${picks.length}개 넣기` : '재료를 골라 주세요'}</button>
      </>}>
      <div className="space-y-4">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addText() }}>
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="한 줄로 여러 개: 두부, 대파 2, 돼지고기 300g" aria-label="여러 재료 한 번에 입력" />
          <button className="btn btn-soft shrink-0" disabled={!text.trim()}>담기</button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input className="field !h-10 !pl-9 !text-[14px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder="재료 찾기" aria-label="재료 찾기" />
          </div>
        </div>
        {!q && (
          <div className="scroll-x flex gap-1.5 -mx-1 px-1">
            <button className="chip !h-8 !text-[13px] shrink-0" aria-pressed={cat === 'often'} onClick={() => setCat('often')}>자주 쓰는</button>
            {CATS.map((c) => <button key={c} className="chip !h-8 !text-[13px] shrink-0" aria-pressed={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</button>)}
          </div>
        )}

        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2" aria-label="재료 선택">
          {list.map((id) => {
            const c = CATALOG_MAP[id]
            const on = isOn(id)
            return (
              <li key={id}>
                <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(id)}
                  className={`relative w-full h-[84px] rounded-2xl border flex flex-col items-center justify-center gap-1 transition ${on ? 'border-basil bg-pea' : 'border-line bg-white hover:border-leaf'}`}>
                  <span className="text-[26px] leading-none" aria-hidden>{c.emoji}</span>
                  <span className="text-[13px] font-semibold leading-tight text-center px-1 line-clamp-1">{c.name.replace(/\(.*\)/, '')}</span>
                  {owned.has(id) && !on && <span className="absolute top-1.5 left-1.5 text-[10.5px] font-semibold text-leaf">보유</span>}
                  <span className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full grid place-items-center ${on ? 'bg-basil text-paper' : 'border border-line-2 bg-white'}`}>{on && <Check className="w-3.5 h-3.5" />}</span>
                </button>
              </li>
            )
          })}
          {list.length === 0 && <li className="col-span-full text-[13.5px] text-sub py-4 text-center">목록에 없는 재료는 위 칸에 이름을 적어 담아 주세요.</li>}
        </ul>

        {picks.length > 0 && (
          <div className="rounded-2xl bg-paper p-3">
            <p className="text-[13px] font-semibold mb-2 px-1">고른 재료 {picks.length}개 · 수량은 일반 포장 기준</p>
            <ul className="space-y-1.5">
              {picks.map((p, i) => (
                <li key={`${p.id ?? p.name}`} className="flex items-center gap-2 bg-card rounded-xl px-3 py-1.5">
                  <span className="text-[18px]" aria-hidden>{p.id ? CATALOG_MAP[p.id].emoji : '🧺'}</span>
                  <span className="flex-1 min-w-0 text-[14px] font-semibold truncate">{p.name}{!p.id && <span className="ml-1 text-[11.5px] text-mute font-normal">레시피 DB에 없음</span>}</span>
                  <button className="w-8 h-8 rounded-full grid place-items-center hover:bg-paper" aria-label={`${p.name} 줄이기`} onClick={() => setQty(i, p.qty - step(p))}><Minus className="w-4 h-4" /></button>
                  <span className="min-w-[56px] text-center text-[13.5px] font-bold num">{fmtQty(p.qty, p.unit)}</span>
                  <button className="w-8 h-8 rounded-full grid place-items-center hover:bg-paper" aria-label={`${p.name} 늘리기`} onClick={() => setQty(i, p.qty + step(p))}><Plus className="w-4 h-4" /></button>
                  <button className="w-8 h-8 rounded-full grid place-items-center text-mute hover:text-cherry" aria-label={`${p.name} 빼기`} onClick={() => setPicks((ps) => ps.filter((_, k) => k !== i))}><X className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
            <div className="mt-3 px-1">
              <p className="text-[13px] font-semibold mb-1.5">유통·소비기한</p>
              <Segmented size="sm" value={fill} onChange={setFill} options={[{ value: 'est', label: '보관 기간으로 추정' }, { value: 'later', label: '나중에 입력' }]} />
              <p className="mt-1.5 text-[12px] text-mute">{fill === 'est' ? '재료별 일반 보관 기간으로 채우고 "기한 추정"으로 표시해요. 포장지 날짜가 다르면 냉장고에서 고쳐 주세요.' : '기한이 없으면 임박 알림과 우선 소진 추천에서 빠져요.'}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
