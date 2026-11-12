import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import Globe from 'react-globe.gl'
import { colorOf, rgba, ko, isFolk, angle } from '../lib/geo.js'

// 지구본. features: 그 연도의 나라들. marks: { 이름: { quiz, mission } } 표시. picks: { 이름: 색 } 미션에서 고른 나라.
const GlobeView = forwardRef(function GlobeView({ features, yearId, selected, onPick, marks, picks, thief, special, warp, onPov, spin }, ref) {
  const box = useRef(null), globe = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [hover, setHover] = useState(null)
  const [pv, setPv] = useState({ lat: 30, lng: 60, altitude: 2.2 })
  const alt = pv.altitude

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(box.current); return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const g = globe.current; if (!g) return
    const c = g.controls(); c.autoRotate = !!spin; c.autoRotateSpeed = 0.5; c.minDistance = 130; c.maxDistance = 520; c.enablePan = false
    g.pointOfView({ lat: 30, lng: 60, altitude: 2.2 })
  }, [])
  useEffect(() => { const g = globe.current; if (g) g.controls().autoRotate = !!spin }, [spin])
  useImperativeHandle(ref, () => ({
    flyTo: (pov, ms = 900) => globe.current?.pointOfView(pov, ms),
    pov: () => globe.current?.pointOfView(),
  }))

  const shown = useMemo(() => (features || []).filter(f => !f.properties.special || special?.includes(f.properties.NAME)), [features, special])
  const labels = useMemo(() => {
    const min = alt > 1.7 ? 14 : alt > 1.1 ? 5 : alt > 0.7 ? 1.5 : 0.3
    // 지구 뒤편 이름표는 만들지 않는다
    const lim = (Math.acos(1 / (1 + alt)) * 180) / Math.PI - 3
    const list = shown.filter(f => ko(f.properties.NAME, yearId) && angle([pv.lng, pv.lat], f.properties.c) < lim && (f.properties.a >= min || marks?.[f.properties.NAME] || picks?.[f.properties.NAME] || f.properties.NAME === selected))
      .sort((a, b) => b.properties.a - a.properties.a).slice(0, 70)
      .map(f => ({ kind: 'label', key: f.properties.NAME, lng: f.properties.c[0], lat: f.properties.c[1], text: ko(f.properties.NAME, yearId), folk: isFolk(f.properties.NAME, yearId), big: f.properties.a > 120, mark: marks?.[f.properties.NAME], sel: f.properties.NAME === selected, pick: picks?.[f.properties.NAME] }))
    if (thief && angle([pv.lng, pv.lat], thief.c) < lim) list.push({ kind: 'thief', key: 'thief' + thief.seq, lng: thief.c[0], lat: thief.c[1] })
    return list
  }, [shown, yearId, pv, marks, picks, selected, thief])

  return (
    <div ref={box} className={'globe-box' + (warp ? ' warp' : '')}>
      <Globe
        ref={globe} width={size.w} height={size.h} backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={`${import.meta.env.BASE_URL}earth.jpg`} showAtmosphere atmosphereColor="#7fc8ff" atmosphereAltitude={0.18}
        polygonsData={shown} polygonsTransitionDuration={250}
        polygonCapColor={f => {
          const n = f.properties.NAME
          if (picks?.[n]) return picks[n]
          if (f.properties.special) return 'rgba(255,214,64,0.9)'
          const c = colorOf(f, yearId)
          return rgba(c, n === selected ? 1 : n === hover ? 0.95 : isFolk(n, yearId) && !f.properties.SUBJECTO ? 0.2 : 0.86)
        }}
        polygonSideColor={() => 'rgba(10,16,36,0.35)'}
        polygonStrokeColor={f => (f.properties.NAME === selected ? '#fff' : isFolk(f.properties.NAME, yearId) && !f.properties.SUBJECTO ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.7)')}
        polygonAltitude={f => {
          const p = f.properties
          if (p.NAME === selected || picks?.[p.NAME]) return 0.04
          if (p.special) return 0.032
          if (p.NAME === hover) return 0.026
          // 겹치는 땅끼리 깜빡이지 않도록: 집단은 낮게, 나라는 작을수록 조금 더 높게
          if (isFolk(p.NAME, yearId) && !p.SUBJECTO) return 0.004
          return (p.top ? 0.018 : 0.011) + 0.005 * (1 - Math.min(p.a, 300) / 300)
        }}
        polygonCapCurvatureResolution={4}
        onPolygonHover={f => setHover(f ? f.properties.NAME : null)}
        onPolygonClick={f => onPick?.(f)}
        htmlElementsData={labels} htmlLat="lat" htmlLng="lng" htmlAltitude={d => (d.kind === 'thief' ? 0.06 : 0.04)} htmlTransitionDuration={0}
        htmlElementVisibilityModifier={(el, vis) => { el.style.opacity = vis ? 1 : 0 }}
        htmlElement={d => {
          const el = document.createElement('div')
          if (d.kind === 'thief') { el.className = 'g-thief'; el.innerHTML = `<div><img src="${import.meta.env.BASE_URL}img/thief.png" alt="시간 도둑"></div>`; return el }
          el.className = 'g-label' + (d.folk ? ' folk' : '') + (d.big ? ' big' : '') + (d.sel ? ' sel' : '') + (d.pick ? ' pick' : '')
          el.textContent = d.text
          if (d.mark?.quiz) { const b = document.createElement('span'); b.className = 'g-quiz'; b.textContent = '?' + (d.mark.quiz > 1 ? d.mark.quiz : ''); el.appendChild(b) }
          if (d.mark?.mission) { const b = document.createElement('span'); b.className = 'g-mission'; b.textContent = '!'; el.appendChild(b) }
          return el
        }}
        onZoom={p => { if (Math.abs(p.altitude - pv.altitude) > 0.12 || Math.abs(p.lat - pv.lat) + Math.abs(p.lng - pv.lng) > 5) setPv({ lat: p.lat, lng: p.lng, altitude: p.altitude }); onPov?.(p) }}
      />
    </div>
  )
})
export default GlobeView
