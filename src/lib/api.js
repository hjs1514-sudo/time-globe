const BASE = (import.meta.env.VITE_API_BASE || '/api/globe') + '/'
async function call(path, body) {
  const r = await fetch(BASE + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  let d = {}
  try { d = await r.json() } catch { d = { error: '서버와 연결할 수 없어요.' } }
  if (!r.ok && !d.error) d.error = '서버 오류'
  return d
}
export const api = {
  create: (unit, title) => call('create', { unit, title }),
  join: (code, nick, tm) => call('join', { code, nick, tm }),
  state: q => call('state?' + new URLSearchParams(q)),
  act: (auth, action) => call('act', { ...auth, action }),
}
const K = 'timeglobe.'
export const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(K + k)) } catch { return null } },
  set(k, v) { try { v == null ? localStorage.removeItem(K + k) : localStorage.setItem(K + k, JSON.stringify(v)) } catch { /* 저장 불가 */ } },
}
