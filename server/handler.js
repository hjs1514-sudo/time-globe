// HTTP 요청 → 게임 규칙. 저장소(store)는 밖에서 넣어 준다: get(code) → {state, ver} | null, put(code, state, ver) → 성공 여부
import { createClass, join, actStudent, actTeacher, viewStudent, viewTeacher, tick } from '../src/core/engine.js'
import { regionOf } from '../src/data/eras.js'
import POOL from '../src/data/pool.json'
import NAMES from '../src/data/names.json'

// 시간 도둑이 숨을 수 있는 곳: 한글 이름이 있고 너무 작지 않은 나라
const THIEF_POOL = Object.fromEntries(Object.entries(POOL).map(([y, m]) => [y,
  Object.entries(m).filter(([n, v]) => NAMES[n] && v[2] >= 8 && !/수렵|채집|유목민|농경민|어로민|사냥꾼|원주민|문화/.test(NAMES[n])).map(([n, v]) => ({ name: n, c: [v[0], v[1]], cont: regionOf(v) }))]))

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

async function mutate(store, code, fn) {
  for (let i = 0; i < 6; i++) {
    const row = await store.get(code)
    if (!row) return { error: '수업을 찾을 수 없어요. 코드를 확인해 주세요.', status: 404 }
    const out = fn(row.state)
    if (out?.error || out?.skip) return out
    if (await store.put(code, row.state, row.ver)) return out
  }
  return { error: '잠시 뒤 다시 해 주세요.', status: 503 }
}

export async function handle(request, store, path) {
  const now = Date.now()
  let body = {}
  if (request.method === 'POST') { try { body = await request.json() } catch { return json({ error: '잘못된 요청' }, 400) } }
  const url = new URL(request.url)
  try {
    if (path === 'create' && request.method === 'POST') {
      for (let i = 0; i < 20; i++) {
        const s = createClass(body, now)
        for (const m of s.missions) m.c = (POOL[m.year]?.[m.name] || [0, 0]).slice(0, 2)
        if (await store.create(s.code, s)) return json({ code: s.code, tkey: s.tkey })
      }
      return json({ error: '수업을 만들지 못했어요.' }, 500)
    }
    const code = String(body.code || url.searchParams.get('code') || '')
    if (!/^\d{4}$/.test(code)) return json({ error: '수업 코드는 숫자 4자리예요.' }, 400)

    if (path === 'join' && request.method === 'POST') {
      const out = await mutate(store, code, s => join(s, body, now))
      return json(out, out.error ? (out.status || 400) : 200)
    }
    if (path === 'state') {
      const tkey = url.searchParams.get('tkey'), pid = url.searchParams.get('pid'), tok = url.searchParams.get('tok')
      const row = await store.get(code)
      if (!row) return json({ error: '수업을 찾을 수 없어요.' }, 404)
      const s = row.state
      let dirty = tick(s, now, THIEF_POOL)
      if (tkey) {
        if (tkey !== s.tkey) return json({ error: '교사 열쇠가 맞지 않아요.' }, 403)
        if (dirty) await store.put(code, s, row.ver)
        return json(viewTeacher(s, now))
      }
      const p = s.players[pid]
      if (!p || p.tok !== tok) return json({ error: '다시 입장해 주세요.', rejoin: true }, 403)
      if (now - p.seen > 8000) { p.seen = now; dirty = true }
      if (dirty) await store.put(code, s, row.ver)
      return json(viewStudent(s, p, now))
    }
    if (path === 'act' && request.method === 'POST') {
      const out = await mutate(store, code, s => {
        tick(s, now, THIEF_POOL)
        if (body.tkey) {
          if (body.tkey !== s.tkey) return { error: '교사 열쇠가 맞지 않아요.', status: 403 }
          if (body.action?.type === 'missionAdd') body.action.c = (POOL[body.action.year]?.[body.action.name] || [0, 0]).slice(0, 2)
          const r = actTeacher(s, body.action || {}, now)
          if (body.action?.type === 'missionAdd' && !r.error) s.missions[s.missions.length - 1].c = body.action.c
          return r
        }
        const p = s.players[body.pid]
        if (!p || p.tok !== body.tok) return { error: '다시 입장해 주세요.', status: 403 }
        return actStudent(s, p, body.action || {}, now)
      })
      return json(out, out.error ? (out.status || 400) : 200)
    }
    return json({ error: '없는 주소' }, 404)
  } catch (e) {
    return json({ error: '서버 오류: ' + e.message }, 500)
  }
}
