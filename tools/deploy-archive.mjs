// 역사교사 아카이브(edu-archive)에 넣기. 사용: node tools/deploy-archive.mjs <edu-archive 경로>
// 1) 앱을 public/play/time-globe/ 에 빌드  2) 서버 규칙을 server/globe-server.js 한 파일로 묶기  3) functions/api/globe 라우트 복사
import { build } from 'esbuild'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
const A = process.argv[2]
if (!A || !fs.existsSync(A + '/server/schema.js')) { console.error('edu-archive 경로를 주세요'); process.exit(1) }
execSync(`npx vite build --outDir ${A}/public/play/time-globe --emptyOutDir`, { stdio: 'inherit' })
await build({ entryPoints: ['server/handler.js'], bundle: true, format: 'esm', platform: 'neutral', minify: true, outfile: `${A}/server/globe-server.js`,
  banner: { js: '// 타임머신 역사지구본 수업 서버 규칙 (hjs1514-sudo/time-globe 의 server/handler.js 를 묶은 파일. 직접 고치지 말고 그쪽에서 고친 뒤 tools/deploy-archive.mjs 로 다시 만든다)' } })
fs.mkdirSync(`${A}/functions/api/globe`, { recursive: true })
fs.writeFileSync(`${A}/functions/api/globe/[[path]].js`, fs.readFileSync('functions/api/globe/[[path]].js', 'utf8').replace("'../../../server/handler.js'", "'../../../server/globe-server.js'"))
console.log('ok')
