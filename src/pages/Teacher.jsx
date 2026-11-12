import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import GlobeView from '../components/GlobeView.jsx'
import YearDial from '../components/YearDial.jsx'
import CountryCard from '../components/CountryCard.jsx'
import { useMap } from './Explore.jsx'
import { mmss, PHASE } from './Student.jsx'
import { api, store } from '../lib/api.js'
import { koOr, ko } from '../lib/geo.js'
import { UNITS, yearInfo } from '../data/eras.js'
import POOL from '../data/pool.json'

const B = import.meta.env.BASE_URL
const PIN = '2026' // 교사 화면 PIN (학생이 실수로 들어오는 것만 막는 용도)

function Gate({ onOk }) {
  const [v, setV] = useState('')
  return (
    <div className="home"><form className="join panel" onSubmit={e => { e.preventDefault(); if (v === PIN) { store.set('tpin', 1); onOk() } else setV('') }}>
      <h1>선생님 화면</h1><label>교사 PIN<input type="password" inputMode="numeric" value={v} onChange={e => setV(e.target.value)} autoFocus /></label>
      <button className="btn gold big">들어가기</button><a href="#/">처음으로</a></form></div>
  )
}
function Create({ onMade }) {
  const [unit, setUnit] = useState('u1'), [title, setTitle] = useState(''), [err, setErr] = useState('')
  const old = store.get('tclasses') || []
  const make = async e => {
    e.preventDefault()
    const r = await api.create(unit, title); if (r.error) return setErr(r.error)
    const c = { code: r.code, tkey: r.tkey, title: title || '우리 반', unit, at: Date.now() }
    store.set('tclasses', [c, ...old].slice(0, 8)); onMade(c)
  }
  return (
    <div className="home"><form className="join panel wide" onSubmit={make}>
      <h1>수업 만들기</h1>
      <label>학급 이름<input placeholder="예: 2학년 3반" maxLength={20} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label>단원<select value={unit} onChange={e => setUnit(e.target.value)}>{UNITS.map(u => <option key={u.id} value={u.id}>{u.no}. {u.title}</option>)}</select></label>
      <p className="quiz-note">단원을 고르면 그 단원의 시대 지도({UNITS.find(u => u.id === unit).years.map(y => y.label).join(', ')})가 열려요.</p>
      {err && <p className="err">{err}</p>}
      <button className="btn gold big">수업 열기</button>
      {old.length > 0 && <div className="oldc"><span>이 기기에서 연 수업</span>{old.map(c => <button type="button" key={c.code} className="btn sm" onClick={() => onMade(c)}>{c.title} · {c.code}</button>)}</div>}
      <a href="#/">처음으로</a>
    </form></div>
  )
}

export default function Teacher() {
  const [ok, setOk] = useState(!!store.get('tpin'))
  const [cls, setCls] = useState(store.get('tcur'))
  const [st, setSt] = useState(null), [err, setErr] = useState('')
  const pull = useCallback(async () => {
    if (!cls) return
    const r = await api.state({ code: cls.code, tkey: cls.tkey })
    if (r.error) { setErr(r.error); if (/찾을 수 없|열쇠/.test(r.error)) { store.set('tcur', null); setCls(null) } return }
    setErr(''); setSt(r)
  }, [cls])
  useEffect(() => { if (!cls) return; setSt(null); pull(); const t = setInterval(pull, 2000); return () => clearInterval(t) }, [cls, pull])
  const act = useCallback(async a => { const r = await api.act({ code: cls.code, tkey: cls.tkey }, a); if (r.error) alert(r.error); pull(); return r }, [cls, pull])
  if (!ok) return <Gate onOk={() => setOk(true)} />
  if (!cls) return <Create onMade={c => { store.set('tcur', c); setCls(c) }} />
  if (!st) return <div className="home"><p>{err || '수업을 불러오는 중…'}</p></div>
  return <Dash st={st} act={act} close={() => { store.set('tcur', null); setCls(null) }} />
}

function Dash({ st, act, close }) {
  const [tab, setTab] = useState('students'), [mins, setMins] = useState(15), [qr, setQr] = useState(''), [bigQr, setBigQr] = useState(false), [notice, setNotice] = useState('')
  const unit = UNITS.find(u => u.id === st.unit)
  const url = `${location.origin}${location.pathname}#/class?code=${st.code}`
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: '#0a1024', light: '#ffffff' } }).then(setQr) }, [url])
  const ps = st.players.filter(p => !p.kicked)
  const flagged = st.quizzes.filter(q => !q.hidden && (q.reports > 0 || (q.tries >= 4 && q.right / q.tries < 0.2))).length
  return (
    <div className="dash">
      <header className="dash-top">
        <a className="logo" href="#/">타임머신 <b>역사지구본</b></a>
        <span className="dash-title">{st.title} · {unit.no}. {unit.short}</span>
        <button className="dash-code" onClick={() => setBigQr(true)} title="크게 보기">{qr && <img src={qr} alt="QR" />}<span><small>수업 코드</small><b>{st.code}</b></span></button>
        <span className={'hud-phase p-' + st.phase}>{st.paused ? '잠시 멈춤' : PHASE[st.phase]}{st.left != null && st.phase !== 'ended' && <b>{mmss(st.left)}</b>}</span>
        <button className="btn sm" onClick={() => confirm('다른 수업을 열까요? 이 수업은 목록에서 다시 들어올 수 있어요.') && close()}>수업 목록</button>
      </header>

      <section className="dash-ctrl panel">
        <div className="steps">
          <button className={'step' + (st.phase === 'lobby' ? ' on' : '')} onClick={() => act({ type: 'phase', to: 'lobby' })}><small>1</small>입장 대기</button>
          <button className={'step' + (st.phase === 'make' ? ' on' : '')} onClick={() => act({ type: 'phase', to: 'make', minutes: mins })}><small>2</small>퀴즈 만들기 시간</button>
          <button className={'step' + (st.phase === 'explore' ? ' on' : '')} onClick={() => act({ type: 'phase', to: 'explore', minutes: mins })}><small>3</small>역사 타임머신 탐험하기 시간</button>
          <button className={'step' + (st.phase === 'ended' ? ' on' : '')} onClick={() => confirm('수업을 끝내고 결과를 발표할까요?') && act({ type: 'phase', to: 'ended' })}><small>4</small>결과 발표</button>
        </div>
        <div className="ctrl-row">
          <label className="mins">시간 <input type="number" min={0} max={60} value={mins} onChange={e => setMins(Math.max(0, Math.min(60, +e.target.value || 0)))} />분 <small>(단계를 누르면 이 시간으로 시작, 0이면 제한 없음)</small></label>
          <button className={'btn sm' + (st.paused ? ' gold' : ' red')} disabled={st.phase === 'lobby' || st.phase === 'ended'} onClick={() => act({ type: 'pause', on: !st.paused })}>{st.paused ? '▶ 다시 시작' : '⏸ 전체 일시정지'}</button>
          <button className="btn sm" disabled={st.left == null} onClick={() => act({ type: 'addTime', sec: 60 })}>+1분</button>
          <button className="btn sm" disabled={st.left == null} onClick={() => act({ type: 'addTime', sec: -60 })}>−1분</button>
          <button className={'btn sm' + (st.lock ? ' gold' : '')} onClick={() => { if (st.lock) act({ type: 'lock', on: false }); else setTab('screen') }}>{st.lock ? '👀 화면 잠금 풀기' : '👀 모두 화면 보세요'}</button>
          <button className={'btn sm' + (st.showRank ? '' : ' gold')} onClick={() => act({ type: 'showRank', on: !st.showRank })}>{st.showRank ? '학생 순위 가리기' : '학생 순위 보여 주기'}</button>
        </div>
        <form className="ctrl-row" onSubmit={e => { e.preventDefault(); act({ type: 'notice', text: notice }); setNotice('') }}>
          <input className="grow" placeholder="전체 공지 (예: 3분 남았어요! 미션은 1938년에도 숨어 있어요)" maxLength={100} value={notice} onChange={e => setNotice(e.target.value)} />
          <button className="btn sm blue">공지 보내기</button>
          {st.notice && <button type="button" className="btn sm" onClick={() => act({ type: 'notice', text: '' })}>공지 내리기</button>}
          {st.events.length > 0 && <select className="evsel" value="" disabled={st.phase !== 'explore'} onChange={e => e.target.value !== '' && act({ type: 'event', idx: +e.target.value })}>
            <option value="">⚡ 긴급 사건 터뜨리기</option>{st.events.map((t, i) => <option key={i} value={i}>{t}</option>)}</select>}
        </form>
        {(st.thief || st.event) && <div className="ctrl-live">
          {st.thief && <span>🦹 시간 도둑: {yearInfo(st.thief.year).label} {koOr(st.thief.name, st.thief.year)} ({mmss(st.thief.left)}) · 검거 {st.thief.by.length}명</span>}
          {st.event && <span>⚡ {st.event.title} ({mmss(st.event.left)}) · 도착 {st.event.by.length}명</span>}
        </div>}
      </section>

      <nav className="dash-tabs">{[['students', `학생 ${ps.length}`], ['quiz', `퀴즈 ${st.quizzes.length}${flagged ? ` ⚠${flagged}` : ''}`], ['mission', `미션 ${st.missions.length}`], ['team', '팀·순위'], ['screen', '설명 화면']].map(([k, v]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{v}</button>)}
        <button className="print" onClick={() => window.print()}>결과 인쇄 / PDF</button></nav>

      <main className="dash-main">
        {tab === 'students' && <Students st={st} act={act} />}
        {tab === 'quiz' && <Quizzes st={st} act={act} />}
        {tab === 'mission' && <Missions st={st} act={act} unit={unit} />}
        {tab === 'team' && <Teams st={st} act={act} />}
        {tab === 'screen' && <Screen st={st} act={act} unit={unit} />}
      </main>
      {bigQr && <div className="veil" onClick={() => setBigQr(false)}><div className="panel qrbox"><img src={qr} alt="QR" /><h2>수업 코드 <b>{st.code}</b></h2><p>{url}</p></div></div>}
    </div>
  )
}

function Students({ st, act }) {
  const [open, setOpen] = useState(null)
  const teamName = id => st.teams.find(t => t.id === id)?.name?.replace(' 팀', '') || '-'
  return (
    <table className="tbl">
      <thead><tr><th>#</th><th>닉네임</th><th>팀</th><th>점수</th><th>퀴즈 출제</th><th>퀴즈 풀이</th><th>미션 (발견/해결)</th><th>도둑</th><th>연료</th><th>지금 있는 곳</th><th>상태</th><th></th></tr></thead>
      <tbody>{st.players.map((p, i) => {
        const stuck = st.phase !== 'lobby' && st.phase !== 'ended' && p.online && p.idle > 180
        return [
          <tr key={p.pid} className={(p.kicked ? 'out ' : '') + (stuck ? 'stuck' : '')}>
            <td>{i + 1}</td><td><img className="tm" src={`${B}img/tm${p.tm}.png`} alt="" />{p.nick}</td><td>{teamName(p.team)}</td><td><b>{p.total}</b></td>
            <td>{p.made}개 <small>{p.parts.make || 0}점</small></td><td>{p.right}/{p.solved} <small>{p.parts.quiz || 0}점</small></td><td>{p.found}/{p.mdone}</td><td>{p.thief}</td><td>{p.fuel}</td>
            <td className="at">{p.at ? `${yearInfo(p.at.year)?.label || ''} · ${koOr(p.at.name, p.at.year)}` : '-'}</td>
            <td>{p.kicked ? '내보냄' : !p.online ? <span className="off">끊김</span> : stuck ? <span className="warn">3분째 멈춤</span> : <span className="on">접속</span>}</td>
            <td><button className="btn sm" onClick={() => setOpen(open === p.pid ? null : p.pid)}>관리</button></td>
          </tr>,
          open === p.pid && <tr key={p.pid + 'x'} className="sub"><td colSpan={12}>
            <button className="btn sm blue" onClick={() => { const t = prompt(`${p.nick}에게 보낼 힌트`); if (t) act({ type: 'dm', pid: p.pid, text: t }) }}>힌트 보내기</button>
            <button className="btn sm" onClick={() => { const t = prompt('새 닉네임 (8자까지)', p.nick); if (t) act({ type: 'rename', pid: p.pid, nick: t }) }}>닉네임 바꾸기</button>
            <button className="btn sm" onClick={() => act({ type: 'bonus', pid: p.pid, n: 10 })}>+10점</button>
            <button className="btn sm" onClick={() => act({ type: 'bonus', pid: p.pid, n: -10 })}>−10점</button>
            {st.teams.length > 0 && <select value={p.team || ''} onChange={e => act({ type: 'moveTeam', pid: p.pid, team: e.target.value || null })}><option value="">팀 없음</option>{st.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
            <button className="btn sm red" onClick={() => act({ type: 'kick', pid: p.pid, on: !p.kicked })}>{p.kicked ? '다시 들이기' : '내보내기'}</button>
          </td></tr>,
        ]
      })}
        {!st.players.length && <tr><td colSpan={12} className="empty">아직 입장한 학생이 없어요. 위의 수업 코드나 QR을 보여 주세요.</td></tr>}
      </tbody>
    </table>
  )
}

function Quizzes({ st, act }) {
  const [edit, setEdit] = useState(null)
  return (
    <table className="tbl">
      <thead><tr><th>시대 · 나라</th><th>출제자</th><th>형식</th><th>문제와 정답</th><th>풀이</th><th>정답률</th><th>👍</th><th>신고</th><th></th></tr></thead>
      <tbody>{st.quizzes.slice().reverse().map(q => {
        const rate = q.tries ? Math.round((q.right / q.tries) * 100) : null
        const bad = q.reports > 0 || (q.tries >= 4 && rate < 20)
        return <tr key={q.id} className={(q.hidden ? 'out ' : '') + (bad ? 'stuck' : '')}>
          <td className="at">{yearInfo(q.year).label}<br />{koOr(q.name, q.year)}</td><td>{q.byNick}</td><td>{q.type === 'mc' ? '4지선다' : q.type === 'ox' ? 'O/X' : '지도'}</td>
          <td className="qtext">{edit === q.id ? <QuizEdit q={q} act={act} done={() => setEdit(null)} /> : <>
            <b>{q.q}</b>{q.edited && <i> (교사 수정)</i>}
            {q.type === 'mc' && <ol>{q.choices.map((c, i) => <li key={i} className={i === q.answer ? 'ans' : ''}>{c}</li>)}</ol>}
            {q.type === 'ox' && <span className="ans"> 정답: {q.answer ? 'O' : 'X'}</span>}
            {q.type === 'map' && <span className="ans"> 정답: {koOr(q.name, q.year)}</span>}
            {q.basis && <small>근거: {q.basis}</small>}</>}</td>
          <td>{q.tries}</td><td className={rate != null && rate < 20 ? 'warn' : ''}>{rate == null ? '-' : rate + '%'}</td><td>{q.likes}</td><td className={q.reports ? 'warn' : ''}>{q.reports || ''}</td>
          <td className="acts"><button className="btn sm" onClick={() => act({ type: 'quizHide', qid: q.id, hidden: !q.hidden })}>{q.hidden ? '다시 보이기' : '숨기기'}</button>
            <button className="btn sm" onClick={() => setEdit(edit === q.id ? null : q.id)}>고치기</button>
            <button className="btn sm red" onClick={() => confirm('이 퀴즈를 지울까요?') && act({ type: 'quizDel', qid: q.id })}>삭제</button></td>
        </tr>
      })}
        {!st.quizzes.length && <tr><td colSpan={9} className="empty">아직 학생들이 만든 퀴즈가 없어요. '퀴즈 만들기 시간'을 시작해 보세요.</td></tr>}
      </tbody>
    </table>
  )
}
function QuizEdit({ q, act, done }) {
  const [t, setT] = useState(q.q), [ch, setCh] = useState(q.choices || []), [ans, setAns] = useState(q.answer)
  return <div className="qedit">
    <textarea rows={2} value={t} onChange={e => setT(e.target.value)} />
    {q.type === 'mc' && ch.map((c, i) => <div className="choice" key={i}><button className={ans === i ? 'on' : ''} onClick={() => setAns(i)}>{ans === i ? '정답' : i + 1}</button><input value={c} onChange={e => setCh(ch.map((x, j) => (j === i ? e.target.value : x)))} /></div>)}
    {q.type === 'ox' && <div className="seg ox"><button className={ans ? 'on' : ''} onClick={() => setAns(true)}>O</button><button className={!ans ? 'on' : ''} onClick={() => setAns(false)}>X</button></div>}
    <div className="row"><button className="btn sm" onClick={done}>취소</button><button className="btn sm gold" onClick={async () => { await act({ type: 'quizEdit', qid: q.id, q: t, choices: ch, answer: ans }); done() }}>저장</button></div>
  </div>
}

function Missions({ st, act, unit }) {
  const [add, setAdd] = useState(false), [y, setY] = useState(unit.years[0].id), [host, setHost] = useState(''), [prompt_, setPrompt] = useState(''), [title, setTitle] = useState(''), [ans, setAns] = useState([]), [explain, setExplain] = useState('')
  const names = useMemo(() => Object.keys(POOL[y] || {}).filter(n => ko(n, y)).sort((a, b) => ko(a, y).localeCompare(ko(b, y), 'ko')), [y])
  const n = st.players.filter(p => !p.kicked).length
  return (<>
    <div className="mgrid">{st.missions.map(m => (
      <div key={m.id} className={'mcard panel' + (m.hidden ? ' out' : '')}>
        <div className="mhead"><b>{m.title}</b><span>{yearInfo(m.year).label} · {koOr(m.name, m.year)}에 숨김</span></div>
        <p>{m.prompt}</p>
        <small>정답: {m.type === 'groups' ? m.groups.map(g => `[${g.label}] ${g.names.map(x => koOr(x, m.year)).join(', ')}`).join(' / ') : m.type === 'any' ? `${m.from.map(x => koOr(x, m.year)).join(', ')} 중 ${m.n}개` : m.order.map(x => koOr(x, m.year)).join(' → ')}</small>
        <div className="mbar"><span>발견 {m.found.length}/{n}</span><span>해결 {m.done.length}/{n}</span>{!m.found.length && st.phase === 'explore' && <span className="warn">아직 아무도 못 찾음</span>}</div>
        {m.found.length > 0 && <small className="who">발견: {m.found.join(', ')}{m.done.length > 0 && <> · 해결: {m.done.join(', ')}</>}</small>}
        <div className="row">
          <button className={'btn sm' + (m.hinted ? ' gold' : '')} onClick={() => act({ type: 'missionHint', mid: m.id, on: !m.hinted })}>{m.hinted ? '힌트 공개 중 (연도)' : '힌트 공개 (연도만)'}</button>
          <button className="btn sm" onClick={() => act({ type: 'missionHide', mid: m.id, hidden: !m.hidden })}>{m.hidden ? '다시 내기' : '빼기'}</button>
          {m.custom && <button className="btn sm red" onClick={() => act({ type: 'missionDel', mid: m.id })}>삭제</button>}
        </div>
      </div>))}
      <button className="mcard add" onClick={() => setAdd(!add)}>＋ 미션 직접 만들기</button>
    </div>
    {add && <div className="panel madd">
      <h3>선생님!미션 만들기</h3>
      <div className="row"><label>제목<input value={title} maxLength={30} onChange={e => setTitle(e.target.value)} placeholder="예: 삼국 동맹" /></label>
        <label>시대<select value={y} onChange={e => { setY(e.target.value); setHost(''); setAns([]) }}>{unit.years.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        <label>숨길 나라<select value={host} onChange={e => setHost(e.target.value)}><option value="">고르기</option>{names.map(x => <option key={x} value={x}>{ko(x, y)}</option>)}</select></label></div>
      <label>문제<input value={prompt_} maxLength={150} onChange={e => setPrompt(e.target.value)} placeholder="예: ○○ 전쟁에서 싸운 두 나라를 클릭하시오." /></label>
      <label>정답 나라 (여러 개 가능)<select value="" onChange={e => e.target.value && !ans.includes(e.target.value) && setAns([...ans, e.target.value])}><option value="">추가하기</option>{names.map(x => <option key={x} value={x}>{ko(x, y)}</option>)}</select></label>
      <div className="chips">{ans.map(x => <button key={x} className="chip" onClick={() => setAns(ans.filter(a => a !== x))}>{ko(x, y)} ×</button>)}</div>
      <label>해설 (맞힌 뒤 보여 줌)<input value={explain} maxLength={200} onChange={e => setExplain(e.target.value)} /></label>
      <div className="row"><button className="btn sm" onClick={() => setAdd(false)}>닫기</button><button className="btn sm gold" onClick={async () => { const r = await act({ type: 'missionAdd', year: y, name: host, title, prompt: prompt_, names: ans, explain }); if (!r.error) { setAdd(false); setPrompt(''); setTitle(''); setAns([]); setExplain('') } }}>미션 숨기기</button></div>
    </div>}
  </>)
}

function Teams({ st, act }) {
  const [n, setN] = useState(st.teams.length || 4)
  const ps = st.players.filter(p => !p.kicked)
  return (<div className="teams">
    <div className="panel tctrl">
      <b>랜덤 팀 구성</b>
      <label>팀 수 <select value={n} onChange={e => setN(+e.target.value)}>{[2, 3, 4, 5, 6, 7, 8].map(x => <option key={x} value={x}>{x}팀 (팀당 약 {Math.max(1, Math.round(ps.length / x))}명)</option>)}</select></label>
      <button className="btn sm gold" onClick={() => (!st.teams.length || confirm('팀을 새로 섞을까요?')) && act({ type: 'teams', n })}>{st.teams.length ? '🎲 다시 섞기' : '🎲 랜덤으로 팀 짜기'}</button>
      {st.teams.length > 0 && <button className="btn sm" onClick={() => confirm('팀을 없앨까요?') && act({ type: 'teams', n: 0 })}>팀 없애기</button>}
      <small>늦게 들어온 학생은 인원이 적은 팀에 자동으로 들어가요. 한 명씩 옮기려면 '학생' 탭의 관리에서.</small>
    </div>
    <div className="tcols">
      <div className="panel"><h3>팀 순위 <small>평균 점수 기준</small></h3>
        {st.teams.length ? st.teams.map((t, i) => <div key={t.id} className="trow"><b className="no">{i + 1}</b><div><b>{t.name}</b><span>{ps.filter(p => p.team === t.id).map(p => p.nick).join(', ') || '아직 없음'}</span></div><i>{t.avg}<small>점 평균</small></i><i>{t.total}<small>점 합계</small></i></div>)
          : <p className="empty">아직 팀이 없어요. 위에서 랜덤으로 짜 보세요.</p>}</div>
      <div className="panel"><h3>개인 순위</h3>
        {ps.map((p, i) => <div key={p.pid} className="trow"><b className="no">{i + 1}</b><img className="tm" src={`${B}img/tm${p.tm}.png`} alt="" /><div><b>{p.nick}</b><span>풀이 {p.parts.quiz || 0} · 출제 {p.parts.make || 0} · 미션 {p.parts.mission || 0} · 도둑 {p.parts.thief || 0} · 사건 {p.parts.event || 0}{p.parts.bonus ? ` · 보너스 ${p.parts.bonus}` : ''}</span></div><i>{p.total}<small>점</small></i></div>)}
        {!ps.length && <p className="empty">아직 학생이 없어요.</p>}</div>
    </div>
  </div>)
}

// 설명 화면: 교사가 지구본을 움직이면 '모두 화면 보세요'로 학생 화면이 따라온다. 학생들이 모여 있는 곳도 보인다.
function Screen({ st, act, unit }) {
  const [yearId, setYearId] = useState(st.lock?.year || unit.years[0].id), [sel, setSel] = useState(null)
  const { features, warp } = useMap(yearId)
  const globe = useRef(null), last = useRef('')
  const f = features.find(x => x.properties.NAME === sel)
  const push = useCallback((year, name) => {
    const pov = globe.current?.pov(); if (!pov) return
    const key = [year, name, pov.lat.toFixed(0), pov.lng.toFixed(0), pov.altitude.toFixed(1)].join()
    if (key === last.current) return; last.current = key
    act({ type: 'lock', on: true, year, name, pov: { lat: +pov.lat.toFixed(1), lng: +pov.lng.toFixed(1), altitude: +pov.altitude.toFixed(2) } })
  }, [act])
  useEffect(() => { if (!st.lock) return; const t = setInterval(() => push(yearId, sel), 1500); return () => clearInterval(t) }, [!!st.lock, yearId, sel, push])
  const marks = useMemo(() => {
    const m = {}
    for (const p of st.players) if (p.online && !p.kicked && p.at?.year === yearId) (m[p.at.name] ||= { quiz: 0 }).quiz++
    return m
  }, [st.players, yearId])
  return (
    <div className="screen">
      <GlobeView ref={globe} features={features} yearId={yearId} selected={sel} warp={warp} marks={marks}
        onPick={x => { setSel(x.properties.NAME); globe.current.flyTo({ lat: x.properties.c[1], lng: x.properties.c[0], altitude: Math.min(2, Math.max(0.95, Math.sqrt(x.properties.a) / 9)) }) }} />
      <aside className="left"><YearDial yearId={yearId} onYear={id => { setYearId(id); setSel(null) }} only={st.unit} />
        <button className={'btn ' + (st.lock ? 'red' : 'gold')} onClick={() => (st.lock ? act({ type: 'lock', on: false }) : push(yearId, sel))}>{st.lock ? '👀 화면 잠금 풀기' : '👀 모두 화면 보세요 (학생 화면이 따라옴)'}</button>
        <div className="hint" style={{ alignSelf: 'stretch', borderRadius: 12 }}>파란 숫자는 지금 그 나라를 보고 있는 학생 수예요.</div></aside>
      <aside className="right">{f && <CountryCard f={f} yearId={yearId} onClose={() => setSel(null)} />}</aside>
    </div>
  )
}
