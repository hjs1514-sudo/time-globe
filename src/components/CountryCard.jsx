import { cardOf } from '../data/cards.js'
import { ko, koOr, colorOf } from '../lib/geo.js'
import { yearInfo } from '../data/eras.js'

function mark(text, terms) {
  if (!terms?.length) return text
  const re = new RegExp('(' + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g')
  return text.split(re).map((s, i) => (terms.includes(s) ? <mark key={i}>{s}</mark> : s))
}
export default function CountryCard({ f, yearId, onClose, children }) {
  if (!f) return null
  const p = f.properties, card = cardOf(p.NAME, yearId), name = ko(p.NAME, yearId)
  return (
    <div className="card">
      <button className="card-x" onClick={onClose} aria-label="닫기">×</button>
      <div className="card-head" style={{ '--c': colorOf(f, yearId) }}>
        <small>{yearInfo(yearId)?.label}</small>
        <h2>{name || p.NAME}</h2>
        {name && <em>{p.NAME}</em>}
        {p.SUBJECTO && <div className="card-sub">지배: {koOr(p.SUBJECTO, yearId)}</div>}
        {card?.cap && <div className="card-cap">중심지 · {card.cap}</div>}
      </div>
      {card ? (
        <div className="card-body">
          <p className="card-one">{card.one}</p>
          {card.pts.map(([h, t], i) => (<div className="card-pt" key={i}><b>{h}</b><p>{mark(t, card.terms)}</p></div>))}
          {card.terms?.length > 0 && <div className="card-terms">{card.terms.map(t => <span key={t}>{t}</span>)}</div>}
        </div>
      ) : (
        <div className="card-body"><p className="card-none">{name ? '이 시대 이곳에 있던 나라(집단)예요. 자세한 카드는 준비 중이에요.' : '이름만 전해지는 작은 집단이에요.'}</p></div>
      )}
      {children}
    </div>
  )
}
