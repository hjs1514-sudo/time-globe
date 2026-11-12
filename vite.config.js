import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 개발·미리보기용 서버: 실제 배포(Cloudflare D1)와 같은 규칙을 메모리 저장소로 돌린다.
function devApi() {
  const mem = new Map()
  const store = {
    async get(code) { const r = mem.get(code); return r ? { state: JSON.parse(r.state), ver: r.ver } : null },
    async put(code, state, ver) { const r = mem.get(code); if (!r || r.ver !== ver) return false; mem.set(code, { state: JSON.stringify(state), ver: ver + 1 }); return true },
    async create(code, state) { if (mem.has(code)) return false; mem.set(code, { state: JSON.stringify(state), ver: 1 }); return true },
  }
  const mw = server => async (req, res, next) => {
    if (!req.url.startsWith('/api/globe/')) return next()
    const { handle } = await server.ssrLoadModule('/server/handler.js')
    const chunks = []; for await (const c of req) chunks.push(c)
    const url = new URL(req.url, 'http://localhost')
    const request = new Request(url, { method: req.method, headers: { 'content-type': 'application/json' }, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined })
    const out = await handle(request, store, url.pathname.replace('/api/globe/', ''))
    res.statusCode = out.status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(await out.text())
  }
  return { name: 'dev-api', configureServer(server) { server.middlewares.use(mw(server)) } }
}

export default defineConfig({
  base: './',
  plugins: [react(), devApi()],
  build: { chunkSizeWarningLimit: 2500 },
})
