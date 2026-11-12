import { useState } from 'react'
import { UNITS, nearestYear, unitOf, yearInfo } from '../data/eras.js'

// 타임머신 다이얼: 단원 → 연도 고르기, 또는 연도 직접 입력. only: 수업에서 열린 단원 하나만
export default function YearDial({ yearId, onYear, only, disabled, compact }) {
  const units = only ? UNITS.filter(u => u.id === only) : UNITS
  const cur = unitOf(yearId) || units[0]
  const [open, setOpen] = useState(cur.id)
  const [txt, setTxt] = useState(''), [bc, setBc] = useState(false), [msg, setMsg] = useState('')
  const u = units.find(x => x.id === open) || cur
  const go = () => {
    const n = parseInt(txt, 10); if (!n) return
    const want = bc ? -n : n
    const y = nearestYear(want, only ? u.years : undefined)
    setMsg(`${bc ? '기원전 ' : ''}${n}년 → ${y.label} 지도`); setOpen(unitOf(y.id).id); onYear(y.id); setTxt('')
    setTimeout(() => setMsg(''), 3500)
  }
  const info = yearInfo(yearId)
  return (
    <div className={'dial' + (disabled ? ' off' : '') + (compact ? ' compact' : '')}>
      <div className="dial-now">
        <small>지금 시대</small>
        <b>{info?.label}</b>
        <span>{info?.topic}</span>
      </div>
      <form className="dial-input" onSubmit={e => { e.preventDefault(); go() }}>
        <button type="button" className={'bc' + (bc ? ' on' : '')} onClick={() => setBc(!bc)}>{bc ? '기원전' : '기원후'}</button>
        <input inputMode="numeric" placeholder="연도 입력" value={txt} onChange={e => setTxt(e.target.value.replace(/\D/g, '').slice(0, 4))} disabled={disabled} />
        <button className="go" disabled={disabled || !txt}>출발</button>
      </form>
      {msg && <div className="dial-msg">{msg}</div>}
      {!only && <div className="dial-units">{units.map(x => (
        <button key={x.id} className={x.id === u.id ? 'on' : ''} style={{ '--c': x.color }} onClick={() => setOpen(x.id)} title={x.title}>{x.no}</button>
      ))}</div>}
      <div className="dial-unit" style={{ '--c': u.color }}>{u.no}. {u.title}</div>
      <div className="dial-years">{u.years.map(y => (
        <button key={y.id} className={y.id === yearId ? 'on' : ''} style={{ '--c': u.color }} disabled={disabled} onClick={() => onYear(y.id)}>
          <b>{y.label}</b><span>{y.topic}</span>
        </button>
      ))}</div>
    </div>
  )
}
