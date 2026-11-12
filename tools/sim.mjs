// 가상 학생으로 수업 한 판을 돌려 보는 시험 스크립트. 사용: node tools/sim.mjs [서버 주소] [단원]
const BASE = (process.argv[2] || 'http://localhost:5199') + '/api/globe/'
const UNIT = process.argv[3] || 'u1'
const call = async (path, body) => (await fetch(BASE + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined)).json()
const NICKS = ['역사왕민준', '서연', '하준이', '지우', '도윤', '수아', '타임러너', '예준', '하은', '시우', '지호', '채원', '파라오', '유나', '건우', '소율', '클레오', '현우', '다은', '알렉산더', '준서', '윤서', '스파르타', '아린']
const QUIZ = [
  ['bc2000', 'Egypt', 'mc', '이집트에서 왕을 부르던 말은?', ['파라오', '칸', '차르', '술탄'], 0],
  ['bc2000', 'Egypt', 'ox', '이집트 사람들은 나일강의 범람 시기를 알기 위해 태양력을 만들었다.', null, true],
  ['bc2000', 'Ur', 'mc', '메소포타미아에서 점토판에 새긴 문자는?', ['갑골문', '쐐기 문자', '상형 문자', '알파벳'], 1],
  ['bc2000', 'Indus valley civilization', 'map', '벽돌로 지은 계획도시 모헨조다로가 있던 문명을 찾아라!'],
  ['bc2000', 'Xia', 'ox', '상 왕조는 점친 내용을 쐐기 문자로 기록하였다.', null, false],
  ['bc500', 'Achaemenid Empire', 'mc', '다리우스 1세가 수도와 지방을 잇기 위해 만든 도로는?', ['비단길', '왕의 길', '초원길', '아피아 가도'], 1],
  ['bc500', 'Greek city-states', 'mc', '아테네에서 시민이 직접 참여한 회의는?', ['원로원', '평민회', '민회', '화백 회의'], 2],
  ['bc500', 'Zhou states', 'map', '제자백가가 등장해 여러 사상을 펼친 곳을 찾아라!'],
  ['bc323', 'Empire of Alexander', 'ox', '알렉산드로스는 정복지에 알렉산드리아라는 도시를 세웠다.', null, true],
  ['bc200', 'Mauryan Empire', 'mc', '불교의 가르침을 새긴 돌기둥을 세운 왕은?', ['카니슈카왕', '아소카왕', '함무라비왕', '다리우스 1세'], 1],
  ['bc200', 'Han Empire', 'mc', '한 무제가 흉노를 치려고 서역에 보낸 사람은?', ['장건', '채륜', '사마천', '상앙'], 0],
  ['bc200', 'Xiongnu', 'ox', '흉노는 농사를 지으며 한곳에 정착해 살았다.', null, false],
  ['100', 'Roman Empire', 'mc', '아우구스투스부터 약 200년간 이어진 번영의 시기는?', ['로마의 평화', '헬레니즘', '춘추 전국', '르네상스'], 0],
  ['100', 'Kushan Empire', 'map', '간다라 미술과 대승 불교가 발달한 왕조를 찾아라!'],
  ['100', 'Han', 'ox', '채륜은 종이 만드는 방법을 개량하였다.', null, true],
]
const { code, tkey } = await call('create', { unit: UNIT, title: '2학년 3반' })
const T = a => call('act', { code, tkey, action: a })
const ps = []
for (const [i, nick] of NICKS.entries()) { const r = await call('join', { code, nick, tm: i % 6 }); ps.push({ nick, ...r }) }
const S = (p, a) => call('act', { code, pid: p.pid, tok: p.tok, action: a })
await T({ type: 'teams', n: 4 })
if (UNIT === 'u1') {
  await T({ type: 'phase', to: 'make', minutes: 10 })
  for (const [i, q] of QUIZ.entries()) await S(ps[i % ps.length], { type: 'make', year: q[0], name: q[1], qtype: q[2], q: q[3], choices: q[4], answer: q[5], basis: '' })
  await T({ type: 'phase', to: 'explore', minutes: 15 })
  const st = await call(`state?code=${code}&tkey=${tkey}`)
  for (const [i, p] of ps.entries()) {
    const skill = 0.35 + 0.6 * ((i * 7) % 10) / 10
    for (const q of st.quizzes) {
      if (q.by === p.pid || Math.random() > 0.55) continue
      await S(p, { type: 'click', year: q.year, name: q.name })
      const ok = Math.random() < skill
      await S(p, { type: 'solve', qid: q.id, answer: q.type === 'mc' ? (ok ? q.answer : (q.answer + 1) % 4) : q.type === 'ox' ? (ok ? q.answer : !q.answer) : (ok ? q.name : 'Egypt') })
      if (ok && Math.random() < 0.3) await S(p, { type: 'like', qid: q.id })
    }
    for (const m of st.missions) {
      if (Math.random() > 0.3 + skill * 0.3) continue
      await S(p, { type: 'click', year: m.year, name: m.name })
      if (Math.random() < skill) await S(p, { type: 'mission', mid: m.id, answer: m.type === 'groups' ? { groups: m.groups.map(g => g.names) } : { names: m.order || m.from.slice(0, m.n) } })
    }
  }
  await S(ps[3], { type: 'report', qid: st.quizzes[4].id })
  const t2 = await call(`state?code=${code}&tkey=${tkey}`)
  if (t2.thief) for (const p of ps.slice(0, 5)) await S(p, { type: 'click', year: t2.thief.year, name: t2.thief.name })
}
const me = await call('join', { code, nick: '탐험가정수', tm: 0 })
console.log(JSON.stringify({ code, tkey, me }))
// KEEP=초 를 주면 그동안 가상 학생들이 접속한 것처럼 신호를 보낸다(화면 시험용).
if (process.env.KEEP) {
  const end = Date.now() + process.env.KEEP * 1000
  while (Date.now() < end) {
    await Promise.all(ps.map(p => call(`state?code=${code}&pid=${p.pid}&tok=${p.tok}`)))
    await new Promise(r => setTimeout(r, 4000))
  }
}
