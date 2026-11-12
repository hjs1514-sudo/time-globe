// Cloudflare Pages Functions: /api/globe/*  (D1 바인딩 이름 DB)
import { handle } from '../../../server/handler.js'

let ready = false
async function store(env) {
  const db = env.DB
  if (!ready) {
    await db.prepare('CREATE TABLE IF NOT EXISTS globe_classes (code TEXT PRIMARY KEY, state TEXT NOT NULL, ver INTEGER NOT NULL, updated INTEGER NOT NULL)').run()
    // 사흘 지난 수업은 지운다
    await db.prepare('DELETE FROM globe_classes WHERE updated < ?').bind(Date.now() - 3 * 86400000).run()
    ready = true
  }
  return {
    async get(code) {
      const r = await db.prepare('SELECT state, ver FROM globe_classes WHERE code = ?').bind(code).first()
      return r ? { state: JSON.parse(r.state), ver: r.ver } : null
    },
    async put(code, state, ver) {
      const r = await db.prepare('UPDATE globe_classes SET state = ?, ver = ver + 1, updated = ? WHERE code = ? AND ver = ?').bind(JSON.stringify(state), Date.now(), code, ver).run()
      return r.meta.changes > 0
    },
    async create(code, state) {
      const r = await db.prepare('INSERT OR IGNORE INTO globe_classes (code, state, ver, updated) VALUES (?, ?, 1, ?)').bind(code, JSON.stringify(state), Date.now()).run()
      return r.meta.changes > 0
    },
  }
}

export async function onRequest({ request, env, params }) {
  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '')
  return handle(request, await store(env), path)
}
