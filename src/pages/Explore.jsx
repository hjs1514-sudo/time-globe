import { useEffect, useMemo, useRef, useState } from 'react'
import GlobeView from '../components/GlobeView.jsx'
import YearDial from '../components/YearDial.jsx'
import CountryCard from '../components/CountryCard.jsx'
import { loadMap, ko, isFolk } from '../lib/geo.js'
import { ALL_YEARS, CONTINENTS, regionOf } from '../data/eras.js'
import { sfx } from '../lib/sfx.js'
import { cardOf } from '../data/cards.js'

const GROUP = { asia: ['서아시아', '남아시아(인도)', '동남아시아', '동아시아', '중앙·북아시아'], europe: ['유럽'], africa: ['아프리카'], namerica: ['북아메리카'], samerica: ['남아메리카'], oceania: ['오세아니아'] }

export function useMap(yearId) {
  const [features, setFeatures] = useState([])
  const [warp, setWarp] = useState(false)
  useEffect(() => {
    let live = true; setWarp(true)
    loadMap(yearId).then(fs => { if (live) { setFeatures(fs); setTimeout(() => live && setWarp(false), 450) } })
    return () => { live = false }
  }, [yearId])
  return { features, warp }
}

export default function Explore() {
  const [yearId, setYearId] = useState('bc2000')
  const { features, warp } = useMap(yearId)
  const [sel, setSel] = useState(null), [cont, setCont] = useState(null)
  const globe = useRef(null)
  const f = useMemo(() => features.find(x => x.properties.NAME === sel), [features, sel])
  const list = useMemo(() => !cont ? [] : features.filter(x => ko(x.properties.NAME, yearId) && !x.properties.special && GROUP[cont].includes(regionOf(x.properties.c)))
    .sort((a, b) => (isFolk(a.properties.NAME, yearId) - isFolk(b.properties.NAME, yearId)) || b.properties.a - a.properties.a), [features, cont, yearId])
  const idx = ALL_YEARS.findIndex(y => y.id === yearId)
  const jump = id => { sfx('warp'); setYearId(id) }
  const pick = x => { sfx('click'); setSel(x.properties.NAME); globe.current.flyTo({ lat: x.properties.c[1], lng: x.properties.c[0], altitude: Math.min(2, Math.max(0.95, Math.sqrt(x.properties.a) / 9)) }) }
  return (
    <div className="stage">
      <header className="top">
        <a className="logo" href="#/">타임머신 <b>역사지구본</b></a>
        <nav className="conts">{CONTINENTS.map(c => (
          <button key={c.id} className={cont === c.id ? 'on' : ''} onClick={() => { setCont(cont === c.id ? null : c.id); globe.current.flyTo(c.pov) }}>{c.name}</button>
        ))}</nav>
        <span className="mode">탐험용</span>
      </header>
      <GlobeView ref={globe} features={features} yearId={yearId} selected={sel} onPick={pick} warp={warp} />
      <aside className="left"><YearDial yearId={yearId} onYear={jump} /></aside>
      <aside className="right">
        {f ? (
          <CountryCard f={f} yearId={yearId} onClose={() => setSel(null)}>
            <div className="card-nav">
              <button disabled={idx <= 0} onClick={() => jump(ALL_YEARS[idx - 1].id)}>◀ 앞 시대</button>
              <button disabled={idx >= ALL_YEARS.length - 1} onClick={() => jump(ALL_YEARS[idx + 1].id)}>뒤 시대 ▶</button>
            </div>
          </CountryCard>
        ) : cont ? (
          <div className="card">
            <button className="card-x" onClick={() => setCont(null)}>×</button>
            <div className="card-head" style={{ '--c': '#e9b44c' }}><small>{ALL_YEARS[idx].label}</small><h2>{CONTINENTS.find(c => c.id === cont).name}의 나라들</h2></div>
            <div className="card-body list">{list.map(x => (
              <button key={x.properties.NAME} className={isFolk(x.properties.NAME, yearId) ? 'folk' : ''} onClick={() => pick(x)}>
                {ko(x.properties.NAME, yearId)}{cardOf(x.properties.NAME, yearId) && <i>카드</i>}
              </button>))}
              {!list.length && <p className="card-none">이 시대 지도에는 표시된 나라가 없어요.</p>}
            </div>
          </div>
        ) : <div className="hint">지구본을 돌리고, 나라를 눌러 보세요.</div>}
      </aside>
    </div>
  )
}
