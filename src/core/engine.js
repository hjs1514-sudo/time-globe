// 수업용 게임 규칙. 서버(Cloudflare Functions)와 개발용 서버가 같이 쓴다. 순수 함수만 둔다.
import { UNITS } from '../data/eras.js'
import { MISSIONS } from '../data/missions.js'
import { EVENTS } from '../data/events.js'

export const CFG = {
  fuelMax: 12, fuelStart: 8, fuelRegenSec: 15,
  quizPoint: 10, missionFind: 10, missionSolve: 40, thiefPoint: 20, thiefFirst: 10, eventPoint: 15,
  thiefSec: 40, eventSec: 60, stormSec: 20, maxQuiz: 3, maxPlayers: 60,
}
const BAD = ['시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '존나', '좆', '새끼', '지랄', '섹스', '꺼져', '죽어']
const rid = (n = 8) => Array.from({ length: n }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('')
const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const hasBad = s => BAD.some(b => String(s).includes(b))
const norm = s => String(s ?? '').replace(/\s+/g, '').toLowerCase()

export function createClass({ unit, title }, now) {
  const u = UNITS.find(x => x.id === unit) || UNITS[0]
  return {
    v: 1, code: String(1000 + Math.floor(Math.random() * 9000)), tkey: rid(20), unit: u.id, title: clean(title, 20) || '우리 반',
    created: now, phase: 'lobby', paused: false, pausedLeft: 0, endsAt: 0, lock: null, notice: null, showRank: true,
    teams: [], players: {}, quizzes: [], qseq: 0,
    missions: (MISSIONS[u.id] || []).map((m, i) => ({ ...m, id: 'm' + (i + 1), hidden: false, hinted: false })),
    thief: null, tseq: 0, event: null, eseq: 0, log: [],
  }
}

function unitYears(s) { return UNITS.find(x => x.id === s.unit).years.map(y => y.id) }
function refuel(p, now) {
  if (p.fuel >= CFG.fuelMax) { p.fuelAt = now; return }
  const n = Math.floor((now - (p.fuelAt || now)) / (CFG.fuelRegenSec * 1000))
  if (n > 0) { p.fuel = Math.min(CFG.fuelMax, p.fuel + n); p.fuelAt = (p.fuelAt || now) + n * CFG.fuelRegenSec * 1000 }
}
function quizMakerScore(q) {
  if (q.hidden) return 0
  const base = q.tries < 3 ? 5 : (q.right / q.tries >= 0.4 && q.right / q.tries <= 0.8 ? 30 : 10)
  return base + q.likes.length * 2
}
export function totals(s) {
  const make = {}
  for (const q of s.quizzes) make[q.by] = (make[q.by] || 0) + quizMakerScore(q)
  const list = Object.values(s.players).filter(p => !p.kicked).map(p => ({
    pid: p.pid, nick: p.nick, team: p.team, tm: p.tm, total: p.score + (make[p.pid] || 0),
    parts: { ...p.parts, make: make[p.pid] || 0 },
  })).sort((a, b) => b.total - a.total)
  const teams = s.teams.map(t => {
    const ms = list.filter(p => p.team === t.id)
    return { ...t, n: ms.length, total: ms.reduce((a, p) => a + p.total, 0), avg: ms.length ? Math.round(ms.reduce((a, p) => a + p.total, 0) / ms.length) : 0 }
  }).sort((a, b) => b.avg - a.avg)
  return { list, teams }
}

// 시간이 흐르며 생기는 일: 단계 끝, 시간 도둑 이동, 긴급 사건 끝. 바뀌었으면 true
export function tick(s, now, pool) {
  let ch = false
  if (s.phase === 'explore' && !s.paused) {
    if (s.endsAt && now >= s.endsAt) { s.phase = 'ended'; s.thief = null; s.event = null; return true }
    if (!s.thief || now >= s.thief.until) {
      const ys = unitYears(s); const y = ys[Math.floor(Math.random() * ys.length)]
      const cands = (pool && pool[y]) || []
      if (cands.length) {
        const c = cands[Math.floor(Math.random() * cands.length)]
        s.tseq++; s.thief = { seq: s.tseq, year: y, name: c.name, c: c.c, cont: c.cont, until: now + CFG.thiefSec * 1000, by: [] }; ch = true
      }
    }
    if (s.event && now >= s.event.until) { s.event = null; ch = true }
  }
  return ch
}

function addScore(p, part, n) { p.score += n; p.parts[part] = (p.parts[part] || 0) + n }
function right(p, now) {
  p.combo++; p.wrong = 0; p.best = Math.max(p.best || 0, p.combo)
  return p.combo >= 5 ? 3 : p.combo >= 3 ? 2 : 1
}
function wrong(p, now) {
  p.combo = 0; p.wrong++
  if (p.wrong >= 3) { p.wrong = 0; p.stormUntil = now + CFG.stormSec * 1000; p.storms = (p.storms || 0) + 1; return true }
  return false
}
function sameSet(a, b) { const A = [...new Set(a)].sort(), B = [...new Set(b)].sort(); return A.length === B.length && A.every((x, i) => x === B[i]) }
function checkMission(m, ans) {
  if (m.type === 'groups') return m.groups.every((g, i) => sameSet(g.names, (ans?.groups || [])[i] || []))
  if (m.type === 'any') { const a = [...new Set(ans?.names || [])]; return a.length === m.n && a.every(x => m.from.includes(x)) }
  if (m.type === 'order') { const a = ans?.names || []; return a.length === m.order.length && a.every((x, i) => x === m.order[i]) }
  return false
}

export function join(s, { nick, tm }, now) {
  nick = clean(nick, 8)
  if (nick.length < 1) return { error: '닉네임을 입력해 주세요.' }
  if (hasBad(nick)) return { error: '다른 닉네임을 써 주세요.' }
  const all = Object.values(s.players)
  if (all.some(p => !p.kicked && p.nick === nick)) return { error: '이미 있는 닉네임이에요. 다른 이름을 써 주세요.' }
  if (all.length >= CFG.maxPlayers) return { error: '정원이 찼어요.' }
  const pid = 'p' + rid(6)
  let team = null
  if (s.teams.length) {
    const cnt = Object.fromEntries(s.teams.map(t => [t.id, 0])); all.forEach(p => { if (!p.kicked && p.team in cnt) cnt[p.team]++ })
    team = s.teams.slice().sort((a, b) => cnt[a.id] - cnt[b.id])[0].id
  }
  s.players[pid] = {
    pid, tok: rid(16), nick, tm: Number(tm) || 0, team, score: 0, parts: {}, fuel: CFG.fuelStart, fuelAt: now, combo: 0, best: 0, wrong: 0, stormUntil: 0,
    solved: {}, mdone: {}, visited: {}, thief: 0, evt: 0, at: null, seen: now, joined: now, dm: null, kicked: false,
  }
  return { pid, tok: s.players[pid].tok }
}

export function actStudent(s, p, a, now) {
  if (p.kicked) return { error: '선생님이 내보냈어요.' }
  refuel(p, now); p.seen = now
  if (a.type !== 'ping') p.acted = now
  const live = s.phase === 'explore' && !s.paused
  switch (a.type) {
    case 'ping': if (a.at) p.at = { year: clean(a.at.year, 10), name: clean(a.at.name, 80) }; return {}
    case 'tm': p.tm = Number(a.tm) || 0; return {}
    case 'jump': {
      if (!live) return {}
      if (p.fuel <= 0) return { error: '연료가 없어요! 잠시 기다리거나 퀴즈를 맞혀 채우세요.' }
      p.fuel--; p.jumps = (p.jumps || 0) + 1; return { fuel: p.fuel }
    }
    case 'click': {
      const year = clean(a.year, 10), name = clean(a.name, 80)
      p.at = { year, name }; p.visited[year + '|' + name] = 1
      const out = { found: [] }
      if (!live) return out
      for (const m of s.missions) if (!m.hidden && m.year === year && m.name === name && !p.mdone[m.id]) {
        p.mdone[m.id] = 'found'; addScore(p, 'mission', CFG.missionFind); out.found.push(m.id)
      }
      if (s.thief && s.thief.year === year && s.thief.name === name && !s.thief.by.includes(p.pid)) {
        const first = s.thief.by.length === 0
        s.thief.by.push(p.pid); p.thief++; p.fuel = Math.min(CFG.fuelMax, p.fuel + 3)
        addScore(p, 'thief', CFG.thiefPoint + (first ? CFG.thiefFirst : 0)); out.thief = { first, point: CFG.thiefPoint + (first ? CFG.thiefFirst : 0) }
      }
      if (s.event && s.event.year === year && s.event.name === name && !s.event.by.includes(p.pid)) {
        s.event.by.push(p.pid); p.evt++; addScore(p, 'event', CFG.eventPoint); out.event = { point: CFG.eventPoint, title: s.event.title }
      }
      return out
    }
    case 'make': {
      if (s.phase !== 'make' && s.phase !== 'explore') return { error: '지금은 퀴즈를 만들 수 없어요.' }
      if (s.paused) return { error: '잠시 멈춤 상태예요.' }
      if (s.quizzes.filter(q => q.by === p.pid).length >= CFG.maxQuiz) return { error: `퀴즈는 한 사람당 ${CFG.maxQuiz}개까지 만들 수 있어요.` }
      const q = { id: 'q' + (++s.qseq), by: p.pid, year: clean(a.year, 10), name: clean(a.name, 80), type: a.qtype, q: clean(a.q, 120), basis: clean(a.basis, 200), hidden: false, tries: 0, right: 0, likes: [], reports: [], at: now }
      if (q.q.length < 5) return { error: '문제를 5글자 이상 써 주세요.' }
      if (q.type === 'mc') {
        q.choices = (a.choices || []).slice(0, 4).map(c => clean(c, 40))
        if (q.choices.length !== 4 || q.choices.some(c => !c)) return { error: '보기 4개를 모두 채워 주세요.' }
        if (new Set(q.choices.map(norm)).size !== 4) return { error: '같은 보기가 있어요.' }
        q.answer = Number(a.answer); if (!(q.answer >= 0 && q.answer < 4)) return { error: '정답을 골라 주세요.' }
      } else if (q.type === 'ox') { q.answer = !!a.answer }
      else if (q.type === 'map') { q.answer = q.name }
      else return { error: '퀴즈 형식을 골라 주세요.' }
      if (hasBad(q.q) || (q.choices || []).some(hasBad)) return { error: '고운 말로 다시 써 주세요.' }
      s.quizzes.push(q); return { qid: q.id }
    }
    case 'solve': {
      if (!live) return { error: '탐험하기 시간에만 풀 수 있어요.' }
      if (p.stormUntil > now) return { error: '시간 폭풍에 휩쓸렸어요! 잠시만 기다리세요.' }
      const q = s.quizzes.find(x => x.id === a.qid)
      if (!q || q.hidden) return { error: '사라진 퀴즈예요.' }
      if (q.by === p.pid) return { error: '내가 만든 퀴즈는 풀 수 없어요.' }
      if (q.id in p.solved) return { error: '이미 푼 퀴즈예요.' }
      const ok = q.type === 'mc' ? Number(a.answer) === q.answer : q.type === 'ox' ? !!a.answer === q.answer : a.answer === q.answer
      p.solved[q.id] = ok; q.tries++
      if (ok) {
        q.right++; const mul = right(p, now); addScore(p, 'quiz', CFG.quizPoint * mul); p.fuel = Math.min(CFG.fuelMax, p.fuel + 2)
        return { ok: true, point: CFG.quizPoint * mul, mul, combo: p.combo, basis: q.basis, answer: q.answer }
      }
      return { ok: false, storm: wrong(p, now), basis: q.basis, answer: q.answer }
    }
    case 'like': { const q = s.quizzes.find(x => x.id === a.qid); if (q && q.id in p.solved && !q.likes.includes(p.pid)) q.likes.push(p.pid); return {} }
    case 'report': { const q = s.quizzes.find(x => x.id === a.qid); if (q && !q.reports.includes(p.pid)) q.reports.push(p.pid); return {} }
    case 'mission': {
      if (!live) return { error: '탐험하기 시간에만 풀 수 있어요.' }
      if (p.stormUntil > now) return { error: '시간 폭풍에 휩쓸렸어요! 잠시만 기다리세요.' }
      const m = s.missions.find(x => x.id === a.mid)
      if (!m || m.hidden || !p.mdone[m.id]) return { error: '아직 찾지 못한 미션이에요.' }
      if (p.mdone[m.id] === 'done') return { error: '이미 해결한 미션이에요.' }
      if (checkMission(m, a.answer)) {
        p.mdone[m.id] = 'done'; const mul = right(p, now); addScore(p, 'mission', CFG.missionSolve); p.fuel = Math.min(CFG.fuelMax, p.fuel + 4)
        return { ok: true, point: CFG.missionSolve, explain: m.explain }
      }
      p.mtry = (p.mtry || 0) + 1
      return { ok: false, storm: wrong(p, now) }
    }
  }
  return { error: '알 수 없는 동작' }
}

export function actTeacher(s, a, now) {
  const P = id => s.players[id]
  switch (a.type) {
    case 'phase': {
      if (!['lobby', 'make', 'explore', 'ended'].includes(a.to)) return { error: '단계 오류' }
      s.phase = a.to; s.paused = false; s.thief = null; s.event = null
      s.endsAt = (a.to === 'make' || a.to === 'explore') && a.minutes > 0 ? now + a.minutes * 60000 : 0
      if (a.to === 'make' && s.endsAt) s.makeEnds = s.endsAt
      return {}
    }
    case 'pause': {
      if (a.on && !s.paused) { s.paused = true; s.pausedLeft = s.endsAt ? Math.max(0, s.endsAt - now) : 0 }
      else if (!a.on && s.paused) { s.paused = false; if (s.pausedLeft) s.endsAt = now + s.pausedLeft; if (s.thief) s.thief.until = now + CFG.thiefSec * 1000 }
      return {}
    }
    case 'addTime': if (s.paused) s.pausedLeft = Math.max(0, s.pausedLeft + a.sec * 1000); else if (s.endsAt) s.endsAt = Math.max(now, s.endsAt + a.sec * 1000); return {}
    case 'lock': s.lock = a.on ? { year: clean(a.year, 10), pov: a.pov || null, name: a.name ? clean(a.name, 80) : null } : null; return {}
    case 'notice': s.notice = a.text ? { id: now, text: clean(a.text, 100) } : null; return {}
    case 'dm': if (P(a.pid)) P(a.pid).dm = { id: now, text: clean(a.text, 100) }; return {}
    case 'quizHide': { const q = s.quizzes.find(x => x.id === a.qid); if (q) q.hidden = !!a.hidden; return {} }
    case 'quizEdit': {
      const q = s.quizzes.find(x => x.id === a.qid); if (!q) return {}
      if (a.q != null) q.q = clean(a.q, 120)
      if (a.choices && q.type === 'mc') q.choices = a.choices.slice(0, 4).map(c => clean(c, 40))
      if (a.answer != null && q.type !== 'map') q.answer = q.type === 'mc' ? Number(a.answer) : !!a.answer
      q.edited = true; q.reports = []; return {}
    }
    case 'quizDel': s.quizzes = s.quizzes.filter(x => x.id !== a.qid); return {}
    case 'rename': { const n = clean(a.nick, 8); if (P(a.pid) && n) P(a.pid).nick = n; return {} }
    case 'kick': if (P(a.pid)) P(a.pid).kicked = !!a.on; return {}
    case 'teams': {
      const n = Math.max(0, Math.min(10, Number(a.n) || 0))
      const NAMES = ['피라미드', '파르테논', '만리장성', '콜로세움', '타지마할', '앙코르와트', '마추픽추', '스핑크스', '알람브라', '첨성대']
      s.teams = Array.from({ length: n }, (_, i) => ({ id: 't' + (i + 1), name: NAMES[i] + ' 팀' }))
      const ps = Object.values(s.players).filter(p => !p.kicked)
      for (let i = ps.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[ps[i], ps[j]] = [ps[j], ps[i]] }
      Object.values(s.players).forEach(p => { p.team = null })
      if (n) ps.forEach((p, i) => { p.team = 't' + ((i % n) + 1) })
      return {}
    }
    case 'moveTeam': if (P(a.pid) && (a.team === null || s.teams.some(t => t.id === a.team))) P(a.pid).team = a.team; return {}
    case 'showRank': s.showRank = !!a.on; return {}
    case 'missionHide': { const m = s.missions.find(x => x.id === a.mid); if (m) m.hidden = !!a.hidden; return {} }
    case 'missionHint': { const m = s.missions.find(x => x.id === a.mid); if (m) m.hinted = !!a.on; return {} }
    case 'missionAdd': {
      const names = (a.names || []).map(x => clean(x, 80)).filter(Boolean)
      if (!a.year || !a.name || clean(a.prompt, 150).length < 5 || !names.length) return { error: '연도, 숨길 나라, 문제, 정답 나라를 모두 채워 주세요.' }
      s.missions.push({ id: 'm' + rid(4), year: clean(a.year, 10), name: clean(a.name, 80), title: clean(a.title, 30) || '선생님!미션', prompt: clean(a.prompt, 150), type: 'groups', groups: [{ label: '정답', names }], explain: clean(a.explain, 200), hidden: false, hinted: false, custom: true })
      return {}
    }
    case 'missionDel': s.missions = s.missions.filter(x => x.id !== a.mid); return {}
    case 'event': {
      const e = (EVENTS[s.unit] || [])[a.idx]; if (!e || s.phase !== 'explore') return { error: '탐험하기 시간에만 쓸 수 있어요.' }
      s.eseq++; s.event = { seq: s.eseq, title: e.title, year: e.year, name: e.name, clue: e.clue, until: now + CFG.eventSec * 1000, by: [] }; return {}
    }
    case 'bonus': if (P(a.pid)) addScore(P(a.pid), 'bonus', Math.max(-100, Math.min(100, Number(a.n) || 0))); return {}
  }
  return { error: '알 수 없는 동작' }
}

const strip = q => ({ id: q.id, year: q.year, name: q.type === 'map' ? null : q.name, type: q.type, q: q.q, choices: q.choices, tries: q.tries, right: q.right, likes: q.likes.length })

export function viewStudent(s, p, now) {
  refuel(p, now)
  const nick = id => s.players[id]?.nick || '?'
  const T = totals(s)
  const showRank = s.showRank || s.phase === 'ended'
  return {
    role: 'student', code: s.code, title: s.title, unit: s.unit, phase: s.phase, paused: s.paused, now,
    left: s.paused ? s.pausedLeft : s.endsAt ? Math.max(0, s.endsAt - now) : null,
    lock: s.lock, notice: s.notice, showRank, n: Object.values(s.players).filter(x => !x.kicked).length,
    me: {
      pid: p.pid, nick: p.nick, tm: p.tm, team: p.team, kicked: p.kicked, fuel: p.fuel, combo: p.combo, wrong: p.wrong, best: p.best, stormUntil: p.stormUntil, storm: Math.max(0, p.stormUntil - now),
      dm: p.dm, thief: p.thief, evt: p.evt, visited: Object.keys(p.visited).length, jumps: p.jumps || 0,
      total: T.list.find(x => x.pid === p.pid)?.total || 0, parts: T.list.find(x => x.pid === p.pid)?.parts || {},
      rank: showRank ? T.list.findIndex(x => x.pid === p.pid) + 1 : null,
      made: s.quizzes.filter(q => q.by === p.pid).length,
    },
    teams: showRank ? T.teams : s.teams.map(t => ({ id: t.id, name: t.name })),
    rank: showRank ? T.list.slice(0, 10).map(x => ({ nick: x.nick, total: x.total, tm: x.tm, team: x.team, me: x.pid === p.pid })) : null,
    quizzes: s.quizzes.filter(q => !q.hidden).map(q => {
      const mine = q.by === p.pid, done = q.id in p.solved
      return { ...strip(q), by: nick(q.by), mine, done, ok: done ? p.solved[q.id] : undefined, liked: q.likes.includes(p.pid), ...(mine || done ? { answer: q.answer, basis: q.basis, name: q.name } : {}) }
    }),
    missions: s.missions.filter(m => !m.hidden && p.mdone[m.id]).map(m => ({
      id: m.id, year: m.year, name: m.name, title: m.title, prompt: m.prompt, type: m.type, done: p.mdone[m.id] === 'done',
      groups: m.groups?.map(g => ({ label: g.label, n: g.names.length })), n: m.n || m.order?.length, explain: p.mdone[m.id] === 'done' ? m.explain : undefined,
    })),
    missionTotal: s.missions.filter(m => !m.hidden).length,
    radar: s.phase === 'explore' ? s.missions.filter(m => !m.hidden && !p.mdone[m.id]).map(m => ({ year: m.year, c: m.c, hinted: m.hinted })) : [],
    thief: s.thief && s.phase === 'explore' ? { seq: s.thief.seq, year: s.thief.year, name: s.thief.name, c: s.thief.c, cont: s.thief.cont, left: Math.max(0, s.thief.until - now), caught: s.thief.by.includes(p.pid), n: s.thief.by.length } : null,
    event: s.event ? { seq: s.event.seq, title: s.event.title, clue: s.event.clue, left: Math.max(0, s.event.until - now), hit: s.event.by.includes(p.pid) } : null,
  }
}

export function viewTeacher(s, now) {
  const T = totals(s)
  return {
    role: 'teacher', code: s.code, title: s.title, unit: s.unit, phase: s.phase, paused: s.paused, now,
    left: s.paused ? s.pausedLeft : s.endsAt ? Math.max(0, s.endsAt - now) : null,
    lock: s.lock, notice: s.notice, showRank: s.showRank, teams: T.teams,
    players: Object.values(s.players).map(p => {
      const t = T.list.find(x => x.pid === p.pid)
      const solved = Object.values(p.solved)
      return {
        pid: p.pid, nick: p.nick, tm: p.tm, team: p.team, kicked: p.kicked, online: now - p.seen < 15000, idle: Math.round((now - (p.acted || p.seen)) / 1000),
        total: t?.total || 0, parts: t?.parts || {}, made: s.quizzes.filter(q => q.by === p.pid).length, solved: solved.length, right: solved.filter(Boolean).length,
        found: Object.keys(p.mdone).length, mdone: Object.values(p.mdone).filter(v => v === 'done').length, thief: p.thief, evt: p.evt, at: p.at, fuel: p.fuel, combo: p.combo, storms: p.storms || 0, visited: Object.keys(p.visited).length,
      }
    }).sort((a, b) => b.total - a.total),
    quizzes: s.quizzes.map(q => ({ ...q, byNick: s.players[q.by]?.nick || '?', likes: q.likes.length, reports: q.reports.length })),
    missions: s.missions.map(m => ({ ...m, found: Object.values(s.players).filter(p => p.mdone[m.id]).map(p => p.nick), done: Object.values(s.players).filter(p => p.mdone[m.id] === 'done').map(p => p.nick) })),
    thief: s.thief && { ...s.thief, left: Math.max(0, s.thief.until - now), by: s.thief.by.map(id => s.players[id]?.nick) },
    event: s.event && { ...s.event, left: Math.max(0, s.event.until - now), by: s.event.by.map(id => s.players[id]?.nick) },
    events: (EVENTS[s.unit] || []).map(e => e.title),
  }
}
