import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GlobeView from '../components/GlobeView.jsx'
import YearDial from '../components/YearDial.jsx'
import CountryCard from '../components/CountryCard.jsx'
import { useMap } from './Explore.jsx'
import { api, store } from '../lib/api.js'
import { ko, koOr, angle } from '../lib/geo.js'
import { UNITS, yearInfo } from '../data/eras.js'
import { cardOf } from '../data/cards.js'
import { sfx } from '../lib/sfx.js'

const B = import.meta.env.BASE_URL
const GCOLORS = ['#ff6b6b', '#4f9dde', '#5fd08a', '#f3c14b']
export const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
export const PHASE = { lobby: '대기 중', make: '퀴즈 만들기 시간', explore: '역사 타임머신 탐험하기 시간', ended: '수업 끝' }
export function titlesOf(me, missionsDone) {
  const t = []
  if (me.visited >= 10) t.push(['제국 사냥꾼', '나라 10곳 방문'])
  if ((me.parts?.make || 0) >= 30) t.push(['명출제자', '친구들이 딱 알맞게 어려워한 퀴즈'])
  if (me.thief >= 2) t.push(['시간 도둑 검거왕', '시간 도둑 2번 검거'])
  if (me.jumps >= 8) t.push(['시간 여행자', '시대를 8번 넘나듦'])
  if (me.best >= 5) t.push(['콤보 마스터', '5문제 연속 정답'])
  if (missionsDone >= 2) t.push(['미션 헌터', '선생님!미션 2개 해결'])
  if (me.evt >= 1) t.push(['속보 기자', '긴급 사건 현장 도착'])
  return t
}

function Join({ onJoin }) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '')
  const [code, setCode] = useState(q.get('code') || ''), [nick, setNick] = useState(''), [tm, setTm] = useState(0), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const go = async e => {
    e.preventDefault(); setBusy(true); setErr('')
    const r = await api.join(code, nick, tm); setBusy(false)
    if (r.error) return setErr(r.error)
    onJoin({ code, pid: r.pid, tok: r.tok })
  }
  return (
    <div className="home" style={{ backgroundImage: `linear-gradient(180deg, rgba(6,10,28,.6), rgba(6,10,28,.94)), url(${B}img/hero.jpg)` }}>
      <form className="join panel" onSubmit={go}>
        <h1>수업 입장</h1>
        <label>수업 코드<input inputMode="numeric" placeholder="숫자 4자리" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
        <label>닉네임<input placeholder="8자까지" maxLength={8} value={nick} onChange={e => setNick(e.target.value)} /></label>
        <div className="join-tm"><span>내 타임머신 고르기</span><div>{[0, 1, 2, 3, 4, 5].map(i => (
          <button type="button" key={i} className={tm === i ? 'on' : ''} onClick={() => setTm(i)}><img src={`${B}img/tm${i}.png`} alt={`타임머신 ${i + 1}`} /></button>))}</div></div>
        {err && <p className="err">{err}</p>}
        <button className="btn gold big" disabled={busy || code.length !== 4 || !nick.trim()}>탑승!</button>
        <a href="#/">처음으로</a>
      </form>
    </div>
  )
}

function QuizForm({ f, yearId, onDone, act }) {
  const card = cardOf(f.properties.NAME, yearId)
  const [type, setType] = useState('mc'), [q, setQ] = useState(''), [ch, setCh] = useState(['', '', '', '']), [ans, setAns] = useState(0), [ox, setOx] = useState(true)
  const [basis, setBasis] = useState(card ? 0 : -1), [err, setErr] = useState('')
  const submit = async () => {
    const r = await act({ type: 'make', year: yearId, name: f.properties.NAME, qtype: type, q, choices: ch, answer: type === 'mc' ? ans : ox, basis: card && basis >= 0 ? card.pts[basis][1] : '' })
    if (r.error) return setErr(r.error)
    sfx('right'); onDone()
  }
  return (
    <div className="qform">
      <h3>{ko(f.properties.NAME, yearId)} 퀴즈 만들기</h3>
      <div className="seg">{[['mc', '4지선다'], ['ox', 'O/X'], ['map', '지도에서 찾기']].map(([k, v]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{v}</button>)}</div>
      {card && <label>근거 문장 (카드에서 고르기)
        <select value={basis} onChange={e => setBasis(+e.target.value)}>{card.pts.map(([h, t], i) => <option key={i} value={i}>[{h}] {t.slice(0, 34)}…</option>)}</select></label>}
      {card && basis >= 0 && <p className="basis">{card.pts[basis][1]}</p>}
      <label>{type === 'map' ? '문제 (이 나라를 찾게 하는 설명. 나라 이름은 쓰지 않기!)' : '문제'}
        <textarea rows={2} maxLength={120} value={q} onChange={e => setQ(e.target.value)} placeholder={type === 'map' ? '예: 파라오가 다스리고 피라미드를 세운 나라를 찾아라!' : type === 'ox' ? '예: 이집트는 태음력을 사용하였다.' : '예: 이집트의 왕을 부르는 말은?'} /></label>
      {type === 'mc' && ch.map((c, i) => (
        <div className="choice" key={i}><button className={ans === i ? 'on' : ''} onClick={() => setAns(i)}>{ans === i ? '정답' : i + 1}</button>
          <input maxLength={40} value={c} placeholder={`보기 ${i + 1}`} onChange={e => setCh(ch.map((x, j) => (j === i ? e.target.value : x)))} /></div>))}
      {type === 'ox' && <div className="seg ox"><button className={ox ? 'on' : ''} onClick={() => setOx(true)}>정답은 O</button><button className={!ox ? 'on' : ''} onClick={() => setOx(false)}>정답은 X</button></div>}
      {type === 'map' && <p className="basis">친구들은 문제만 보고 지구본에서 {yearInfo(yearId).label}의 이 나라를 찾아 눌러야 해요.</p>}
      {err && <p className="err">{err}</p>}
      <div className="row"><button className="btn" onClick={onDone}>취소</button><button className="btn gold" onClick={submit}>퀴즈 걸어 두기</button></div>
    </div>
  )
}

function QuizSolve({ q, act, onFx }) {
  const [res, setRes] = useState(null)
  const answer = async a => {
    const r = await act({ type: 'solve', qid: q.id, answer: a })
    if (r.error) return onFx({ toast: r.error })
    setRes(r); sfx(r.ok ? 'right' : 'wrong'); onFx(r.ok ? { toast: `정답! +${r.point}점${r.mul > 1 ? ` (콤보 ×${r.mul})` : ''}`, good: true } : r.storm ? { storm: true } : { toast: '아쉬워요, 오답!' })
  }
  const done = q.done || res
  const ok = res ? res.ok : q.ok, ans = res ? res.answer : q.answer, basis = res ? res.basis : q.basis
  return (
    <div className={'quiz' + (done ? (ok ? ' ok' : ' no') : '')}>
      <div className="quiz-by">{q.by}의 퀴즈 · {q.type === 'mc' ? '4지선다' : q.type === 'ox' ? 'O/X' : '지도'}{q.tries > 0 && ` · 정답률 ${Math.round((q.right / q.tries) * 100)}%`}</div>
      <p className="quiz-q">{q.q}</p>
      {q.type === 'mc' && <div className="quiz-ch">{q.choices.map((c, i) => <button key={i} disabled={done || q.mine} className={done && ans === i ? 'ans' : ''} onClick={() => answer(i)}>{i + 1}. {c}</button>)}</div>}
      {q.type === 'ox' && <div className="quiz-ox">{[true, false].map(v => <button key={String(v)} disabled={done || q.mine} className={done && ans === v ? 'ans' : ''} onClick={() => answer(v)}>{v ? 'O' : 'X'}</button>)}</div>}
      {q.mine && <p className="quiz-note">내가 만든 퀴즈예요. {q.tries}명이 풀었고 {q.right}명이 맞혔어요.</p>}
      {done && <p className="quiz-note">{ok ? '맞혔어요!' : '틀렸어요.'} {basis && <>근거: {basis}</>}</p>}
      {done && !q.mine && <div className="row"><button className="btn sm" disabled={q.liked} onClick={() => act({ type: 'like', qid: q.id })}>👍 좋은 문제 {q.likes > 0 && q.likes}</button><button className="btn sm" onClick={() => { act({ type: 'report', qid: q.id }); onFx({ toast: '선생님께 알렸어요.' }) }}>이상한 문제 신고</button></div>}
    </div>
  )
}

export default function Student() {
  const [sess, setSess] = useState(store.get('sess'))
  const [st, setSt] = useState(null), [err, setErr] = useState('')
  const auth = useMemo(() => sess && { code: sess.code, pid: sess.pid, tok: sess.tok }, [sess])
  const pull = useCallback(async () => {
    if (!sess) return
    const r = await api.state(sess)
    if (r.rejoin || (r.error && /찾을 수 없/.test(r.error))) { store.set('sess', null); setSess(null); setSt(null); return }
    if (r.error) return setErr(r.error)
    setErr(''); setSt(r)
  }, [sess])
  useEffect(() => { if (!sess) return; pull(); const t = setInterval(pull, 2000); return () => clearInterval(t) }, [sess, pull])
  const act = useCallback(async a => { const r = await api.act(auth, a); pull(); return r }, [auth, pull])

  if (!sess) return <Join onJoin={s => { store.set('sess', s); setSess(s) }} />
  if (!st) return <div className="home"><p>{err || '타임머신 시동 거는 중…'}</p></div>
  if (st.me.kicked) return <div className="home"><div className="join panel"><h1>수업에서 나왔어요</h1><p>선생님께 여쭤보세요.</p><button className="btn" onClick={() => { store.set('sess', null); setSess(null) }}>다시 입장</button></div></div>
  return <Game st={st} act={act} leave={() => { store.set('sess', null); setSess(null) }} />
}

function Game({ st, act, leave }) {
  const unit = UNITS.find(u => u.id === st.unit)
  const [yearId, setYearId] = useState(unit.years[0].id)
  const { features, warp } = useMap(st.lock?.year || yearId)
  const Y = st.lock?.year || yearId
  const [sel, setSel] = useState(null), [tab, setTab] = useState('quiz'), [mode, setMode] = useState(null), [making, setMaking] = useState(false)
  const [fx, setFx] = useState(null), [toast, setToast] = useState(null), [pov, setPov] = useState({ lat: 30, lng: 60 })
  const globe = useRef(null)
  const live = st.phase === 'explore' && !st.paused
  const storm = st.me.storm > 0
  const f = useMemo(() => features.find(x => x.properties.NAME === (st.lock?.name || sel)), [features, sel, st.lock])

  const onFx = useCallback(o => {
    if (o.toast) { setToast({ text: o.toast, good: o.good, id: Date.now() }) }
    if (o.storm) { sfx('storm'); setFx({ kind: 'storm', id: Date.now() }); const ys = unit.years.filter(y => y.id !== yearId); setYearId(ys[Math.floor(Math.random() * ys.length)].id); setSel(null); setMode(null) }
    if (o.found) { sfx('found'); setFx({ kind: 'found', id: Date.now() }) }
    if (o.thief) { sfx('thief'); setFx({ kind: 'thief', id: Date.now(), text: o.thief.first ? `가장 먼저 검거! +${o.thief.point}점` : `검거 성공! +${o.thief.point}점` }) }
    if (o.event) { sfx('found'); setFx({ kind: 'event', id: Date.now(), text: `현장 도착! +${o.event.point}점` }) }
  }, [unit, yearId])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t) }, [toast])
  useEffect(() => { if (!fx) return; const t = setTimeout(() => setFx(null), fx.kind === 'storm' ? 2500 : 2200); return () => clearTimeout(t) }, [fx])
  // 선생님 화면 따라가기
  useEffect(() => { if (st.lock?.pov && globe.current) globe.current.flyTo(st.lock.pov, 700) }, [st.lock?.pov?.lat, st.lock?.pov?.lng, st.lock?.pov?.altitude, st.lock?.year])
  // 알림 소리
  const seen = useRef({})
  useEffect(() => {
    if (st.thief && seen.current.thief !== st.thief.seq) { seen.current.thief = st.thief.seq; sfx('alarm') }
    if (st.event && seen.current.event !== st.event.seq) { seen.current.event = st.event.seq; sfx('alarm') }
    if (st.me.dm && seen.current.dm !== st.me.dm.id) { seen.current.dm = st.me.dm.id; setToast({ text: '선생님: ' + st.me.dm.text, id: Date.now(), long: true }) }
    if (seen.current.phase !== st.phase) { seen.current.phase = st.phase; setMode(null); setMaking(false); if (st.phase === 'explore') sfx('warp') }
  }, [st])

  const jump = async id => {
    if (st.lock || id === yearId) return
    if (live) { const r = await act({ type: 'jump' }); if (r.error) return onFx({ toast: r.error }) }
    sfx('warp'); setYearId(id); if (!mode) setSel(null)
  }
  const pick = async x => {
    if (st.lock || storm) return
    const name = x.properties.NAME
    if (mode?.kind === 'mission') {
      sfx('click')
      const m = mode
      if (m.type === 'order') return setMode({ ...m, names: m.names.includes(name) ? m.names.filter(n => n !== name) : [...m.names, name] })
      if (m.type === 'any') return setMode({ ...m, names: m.names.includes(name) ? m.names.filter(n => n !== name) : [...m.names, name] })
      const groups = m.groups.map((g, i) => (i === m.active ? (g.includes(name) ? g.filter(n => n !== name) : [...g, name]) : g.filter(n => n !== name)))
      return setMode({ ...m, groups })
    }
    if (mode?.kind === 'mapquiz') {
      const r = await act({ type: 'solve', qid: mode.qid, answer: name }); setMode(null)
      if (r.error) return onFx({ toast: r.error })
      sfx(r.ok ? 'right' : 'wrong')
      return onFx(r.ok ? { toast: `정답! +${r.point}점${r.mul > 1 ? ` (콤보 ×${r.mul})` : ''}`, good: true } : r.storm ? { storm: true } : { toast: `아쉬워요! 정답은 ${koOr(r.answer, Y)}` })
    }
    sfx('click'); setSel(name); setMaking(false)
    globe.current.flyTo({ lat: x.properties.c[1], lng: x.properties.c[0], altitude: Math.min(2, Math.max(0.95, Math.sqrt(x.properties.a) / 9)) })
    const r = await act({ type: 'click', year: Y, name })
    if (r.found?.length) onFx({ found: true })
    if (r.thief) onFx({ thief: r.thief })
    if (r.event) onFx({ event: r.event })
  }
  const submitMission = async () => {
    const m = mode
    const r = await act({ type: 'mission', mid: m.mid, answer: m.type === 'groups' ? { groups: m.groups } : { names: m.names } })
    if (r.error) return onFx({ toast: r.error })
    if (r.ok) { sfx('found'); setMode(null); setFx({ kind: 'event', id: Date.now(), text: `미션 해결! +${r.point}점` }) }
    else { sfx('wrong'); onFx(r.storm ? { storm: true } : { toast: '아직 아니에요. 다시 골라 보세요!' }) }
  }

  // 지구본 위 표시
  const marks = useMemo(() => {
    const m = {}
    for (const q of st.quizzes) if (q.year === Y && q.name && !q.done) (m[q.name] ||= {}).quiz = (m[q.name]?.quiz || 0) + 1
    for (const x of st.missions) if (x.year === Y && !x.done) (m[x.name] ||= {}).mission = true
    return m
  }, [st.quizzes, st.missions, Y])
  const picks = useMemo(() => {
    if (mode?.kind !== 'mission') return null
    const p = {}
    if (mode.type === 'groups') mode.groups.forEach((g, i) => g.forEach(n => { p[n] = GCOLORS[i] }))
    else mode.names.forEach(n => { p[n] = GCOLORS[1] })
    return p
  }, [mode])
  const special = useMemo(() => (mode?.kind === 'mission' ? ['Sudetenland'] : null), [mode])
  // 미션 탐지기
  const radar = useMemo(() => {
    if (!live || !st.radar.length) return null
    const here = st.radar.filter(r => r.year === Y)
    if (!here.length) return { level: 1, text: st.radar.some(r => r.hinted) ? `선생님 힌트: ${[...new Set(st.radar.filter(r => r.hinted).map(r => yearInfo(r.year).label))].join(', ')}에 미션이 있어요` : '이 시대에는 신호가 약해요. 다른 시대로!' }
    const d = Math.min(...here.map(r => angle([pov.lng, pov.lat], r.c)))
    const level = d < 12 ? 5 : d < 28 ? 4 : d < 55 ? 3 : 2
    return { level, text: level >= 5 ? '바로 근처예요! 나라를 눌러 보세요' : level >= 4 ? '가까워요!' : '이 시대 어딘가에 미션이 숨어 있어요' }
  }, [st.radar, Y, pov, live])
  useEffect(() => { if (!radar || radar.level < 2) return; const t = setInterval(() => sfx('beep'), [0, 0, 2600, 1500, 800, 380][radar.level]); return () => clearInterval(t) }, [radar?.level])

  const hereQ = f ? st.quizzes.filter(q => q.year === Y && q.name === f.properties.NAME) : []
  const hereM = f ? st.missions.filter(m => m.year === Y && m.name === f.properties.NAME) : []
  const mapQ = st.quizzes.filter(q => q.type === 'map' && !q.mine && !q.done)
  const mDone = st.missions.filter(m => m.done).length
  const titles = titlesOf(st.me, mDone)
  const startMission = m => { setSel(null); setMode({ kind: 'mission', mid: m.id, type: m.type, title: m.title, prompt: m.prompt, labels: m.groups?.map(g => g.label), need: m.groups?.map(g => g.n), n: m.n, groups: (m.groups || []).map(() => []), names: [], active: 0 }) }
  const team = st.teams.find(t => t.id === st.me.team)

  return (
    <div className={'stage game' + (storm || fx?.kind === 'storm' ? ' storming' : '')}>
      <header className="top hud">
        <span className="hud-me"><img src={`${B}img/tm${st.me.tm}.png`} alt="" /><b>{st.me.nick}</b>{team && <i>{team.name}</i>}</span>
        <span className={'hud-phase p-' + st.phase}>{st.paused ? '잠시 멈춤' : PHASE[st.phase]}{st.left != null && st.phase !== 'ended' && <b>{mmss(st.left)}</b>}</span>
        <span className="hud-score">{st.me.total}<small>점</small>{st.me.rank ? <i>{st.me.rank}위</i> : null}</span>
        {st.phase === 'explore' && <span className="hud-fuel" title="타임머신 연료">⛽<span className="pips">{Array.from({ length: 12 }, (_, i) => <i key={i} className={i < st.me.fuel ? 'on' : ''} />)}</span></span>}
        {st.me.combo >= 2 && <span className="hud-combo">🔥 {st.me.combo} 콤보</span>}
      </header>

      <GlobeView ref={globe} features={features} yearId={Y} selected={st.lock?.name || sel} onPick={pick} warp={warp} marks={marks} picks={picks} special={special}
        thief={st.thief && st.thief.year === Y && !st.thief.caught ? st.thief : null} onPov={p => { if (Math.abs(p.lat - pov.lat) + Math.abs(p.lng - pov.lng) > 4) setPov({ lat: p.lat, lng: p.lng }) }} />

      <aside className="left">
        <YearDial yearId={Y} onYear={jump} only={st.unit} disabled={!!st.lock || storm} />
        {radar && <div className={'radar panel lv' + radar.level}><b>미션 탐지기</b><span className="bars">{[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= radar.level ? 'on' : ''} />)}</span><small>{radar.text}</small></div>}
      </aside>

      <aside className="right">
        {mode?.kind === 'mission' ? (
          <div className="card mission">
            <div className="card-head" style={{ '--c': '#f3c14b' }}><small>선생님!미션</small><h2>{mode.title}</h2></div>
            <div className="card-body">
              <p className="card-one">{mode.prompt}</p>
              {mode.type === 'groups' && mode.labels.map((l, i) => (
                <button key={i} className={'mgroup' + (mode.active === i ? ' on' : '')} style={{ '--c': GCOLORS[i] }} onClick={() => setMode({ ...mode, active: i })}>
                  <b>{l} ({mode.groups[i].length}/{mode.need[i]})</b><span>{mode.groups[i].map(n => koOr(n, Y)).join(', ') || '지구본에서 나라를 눌러 고르세요'}</span></button>))}
              {mode.type !== 'groups' && <div className="mgroup on" style={{ '--c': GCOLORS[1] }}><b>{mode.type === 'order' ? '누른 순서' : '고른 나라'} ({mode.names.length}/{mode.n})</b><span>{mode.names.map((n, i) => (mode.type === 'order' ? `${i + 1}. ` : '') + koOr(n, Y)).join(mode.type === 'order' ? ' → ' : ', ') || '지구본에서 나라를 눌러 고르세요'}</span></div>}
              <p className="quiz-note">다른 시대로 가야 할 수도 있어요. 다시 누르면 선택이 취소돼요.</p>
            </div>
            <div className="card-nav"><button onClick={() => setMode(null)}>나중에</button><button className="btn gold" onClick={submitMission}>정답 제출</button></div>
          </div>
        ) : mode?.kind === 'mapquiz' ? (
          <div className="card mission"><div className="card-head" style={{ '--c': '#3b7fc4' }}><small>지도 퀴즈 · {mode.by}</small><h2>이 나라를 찾아라!</h2></div>
            <div className="card-body"><p className="card-one">{mode.q}</p><p className="quiz-note">{yearInfo(mode.year).label} 지도에서 정답 나라를 누르세요. 한 번만 누를 수 있어요!</p></div>
            <div className="card-nav"><button onClick={() => setMode(null)}>그만두기</button></div></div>
        ) : f ? (
          <CountryCard f={f} yearId={Y} onClose={() => setSel(null)}>
            {!st.lock && <div className="card-extra">
              {making ? <QuizForm f={f} yearId={Y} act={act} onDone={() => setMaking(false)} /> : <>
                {hereM.map(m => <button key={m.id} className={'btn gold wide' + (m.done ? ' done' : '')} disabled={m.done || !live} onClick={() => startMission(m)}>{m.done ? `✓ 미션 해결: ${m.title}` : `선생님!미션 풀기: ${m.title}`}</button>)}
                {hereQ.map(q => (q.type === 'map' && !q.mine && !q.done ? null : <QuizSolve key={q.id} q={q} act={act} onFx={onFx} />))}
                {(st.phase === 'make' || st.phase === 'explore') && !st.paused && st.me.made < 3 && ko(f.properties.NAME, Y) &&
                  <button className="btn blue wide" onClick={() => setMaking(true)}>✏️ 이 나라로 퀴즈 만들기 ({st.me.made}/3)</button>}
              </>}
            </div>}
          </CountryCard>
        ) : (
          <div className="card side">
            <div className="tabs">{[['quiz', `퀴즈 ${st.quizzes.length}`], ['mission', `미션 ${mDone}/${st.missionTotal}`], ['rank', '순위'], ['me', '내 기록']].map(([k, v]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{v}</button>)}</div>
            <div className="card-body">
              {tab === 'quiz' && <>
                {st.phase === 'lobby' && <p className="card-none">선생님이 시작하실 때까지 지구본을 돌려 보며 기다려요. 지금 {st.n}명이 탑승했어요.</p>}
                {st.phase === 'make' && <p className="card-one">나라를 눌러 카드를 읽고, 그 나라에 퀴즈를 걸어 두세요. (한 사람 3개까지)</p>}
                {st.phase === 'explore' && <p className="card-one">지구본의 <span className="g-quiz inl">?</span> 표시가 있는 나라를 눌러 친구들의 퀴즈를 풀어요.</p>}
                {mapQ.length > 0 && <h4>지도 퀴즈 게시판</h4>}
                {mapQ.map(q => <button key={q.id} className="mapq" disabled={!live} onClick={() => { setYearId(q.year); setMode({ kind: 'mapquiz', qid: q.id, q: q.q, by: q.by, year: q.year }) }}><b>{yearInfo(q.year).label}</b>{q.q}<i>{q.by}</i></button>)}
                {st.quizzes.filter(q => q.mine).length > 0 && <h4>내가 만든 퀴즈</h4>}
                {st.quizzes.filter(q => q.mine).map(q => <div key={q.id} className="myq"><b>{yearInfo(q.year).label} · {koOr(q.name, q.year)}</b>{q.q}<i>{q.tries}명 풀이 · {q.right}명 정답 · 👍 {q.likes}</i></div>)}
              </>}
              {tab === 'mission' && <>
                <p className="card-one">숨겨진 선생님!미션은 모두 {st.missionTotal}개. 탐지기 신호를 따라 나라를 눌러 찾아보세요.</p>
                {st.missions.map(m => <button key={m.id} className={'mapq' + (m.done ? ' done' : '')} disabled={m.done || !live} onClick={() => { setYearId(m.year); startMission(m) }}><b>{m.done ? '✓ 해결' : '도전!'} · {m.title}</b>{m.prompt}{m.done && m.explain && <i>{m.explain}</i>}</button>)}
                {!st.missions.length && <p className="card-none">아직 찾은 미션이 없어요.</p>}
              </>}
              {tab === 'rank' && (st.rank ? <>
                {st.teams.some(t => t.avg != null) && st.teams.length > 0 && <><h4>팀 순위 (평균 점수)</h4>{st.teams.map((t, i) => <div key={t.id} className={'rk' + (t.id === st.me.team ? ' me' : '')}><b>{i + 1}</b><span>{t.name}</span><i>{t.avg}점</i></div>)}</>}
                <h4>개인 순위</h4>{st.rank.map((r, i) => <div key={i} className={'rk' + (r.me ? ' me' : '')}><b>{i + 1}</b><img src={`${B}img/tm${r.tm}.png`} alt="" /><span>{r.nick}</span><i>{r.total}점</i></div>)}
              </> : <p className="card-none">선생님이 순위를 가려 두셨어요. 끝나면 공개됩니다!</p>)}
              {tab === 'me' && <>
                <div className="stats">{[['퀴즈 풀이', st.me.parts.quiz], ['퀴즈 출제', st.me.parts.make], ['미션', st.me.parts.mission], ['시간 도둑', st.me.parts.thief], ['긴급 사건', st.me.parts.event]].map(([k, v]) => <div key={k}><small>{k}</small><b>{v || 0}</b></div>)}</div>
                <h4>칭호</h4>
                {titles.length ? titles.map(([t, d]) => <div key={t} className="title"><b>🏅 {t}</b><span>{d}</span></div>) : <p className="card-none">아직 칭호가 없어요. 나라 10곳 방문, 시간 도둑 검거, 5연속 정답에 도전!</p>}
                <button className="btn sm" style={{ marginTop: 14 }} onClick={() => confirm('수업에서 나갈까요?') && leave()}>수업 나가기</button>
              </>}
            </div>
          </div>
        )}
      </aside>

      {st.phase === 'explore' && st.thief && !st.thief.caught && <div className="banner thief"><img src={`${B}img/thief.png`} alt="" /><div><b>시간 도둑 출현!</b><span>{yearInfo(st.thief.year).label} · {st.thief.cont} 어딘가</span></div><i>{mmss(st.thief.left)}</i></div>}
      {st.event && !st.event.hit && <div className="banner event"><div><b>{st.event.title}</b><span>{st.event.clue} → 그곳을 찾아 누르세요!</span></div><i>{mmss(st.event.left)}</i></div>}
      {st.notice && <div className="notice">📢 {st.notice.text}</div>}
      {st.lock && <div className="lockbar">👀 선생님 화면을 함께 보는 중</div>}
      {st.paused && <div className="veil"><div><h2>잠시 멈춤</h2><p>선생님 말씀에 귀 기울여 주세요.</p></div></div>}
      {st.phase === 'ended' && !f && <div className="veil end"><div className="panel endbox">
        <h2>탐험 종료!</h2><p className="big">{st.me.total}점{st.me.rank ? ` · ${st.me.rank}위` : ''}</p>
        {titles.map(([t]) => <span key={t} className="chip">🏅 {t}</span>)}
        {st.rank && <div className="endrank">{st.rank.slice(0, 5).map((r, i) => <div key={i} className={'rk' + (r.me ? ' me' : '')}><b>{i + 1}</b><img src={`${B}img/tm${r.tm}.png`} alt="" /><span>{r.nick}</span><i>{r.total}점</i></div>)}</div>}
      </div></div>}
      {toast && <div key={toast.id} className={'toast' + (toast.good ? ' good' : '')}>{toast.text}</div>}
      {fx?.kind === 'found' && <div className="fx found"><div><small>선생님!미션을</small><b>발견했다!</b></div></div>}
      {fx?.kind === 'thief' && <div className="fx thief"><img src={`${B}img/thief.png`} alt="" /><b>{fx.text}</b></div>}
      {fx?.kind === 'event' && <div className="fx found"><div><b>{fx.text}</b></div></div>}
      {(storm || fx?.kind === 'storm') && <div className="fx storm"><div><b>시간 폭풍!</b><small>3번 연속으로 틀려 엉뚱한 시대로 튕겨 나갔다… {st.me.storm > 0 && mmss(st.me.storm)}</small></div></div>}
    </div>
  )
}
