// 역사 국경 지도(historical-basemaps, GPL-3.0)를 가볍게 다듬어 public/maps/ 에 넣는다.
// 사용: node tools/build-maps.mjs   (raw/ 에 world_*.geojson 이 있어야 함. tools/fetch-maps.sh 참고)
import mapshaper from 'mapshaper'
import fs from 'node:fs'

export const YEARS = ['bc2000','bc500','bc323','bc200','100','600','800','1000','1200','1279','1500','1600','1783','1815','1880','1900','1914','1920','1938','1945','1960','1994']

// 교과서와 맞추기 위한 손질: 다른 연도의 땅 모양을 빌려 와 덧그린다.
// { to: 넣을 연도, from: 빌려 올 연도, name: 원래 이름, as: 새 이름, subject: 지배국(선택) }
const BORROW = [
  { to: 'bc500', from: 'bc2000', name: 'Koreans', as: 'Gojoseon' },
  { to: 'bc323', from: 'bc2000', name: 'Koreans', as: 'Gojoseon' },
  { to: 'bc200', from: 'bc2000', name: 'Koreans', as: 'Gojoseon' },
  { to: '1279', from: '1200', name: 'Goryeo', as: 'Goryeo' },
  { to: '1914', from: '1900', name: 'Korea', as: 'Korea (Japan)', subject: 'Empire of Japan' },
  { to: '1920', from: '1900', name: 'Korea', as: 'Korea (Japan)', subject: 'Empire of Japan' },
  { to: '1938', from: '1900', name: 'Korea', as: 'Korea (Japan)', subject: 'Empire of Japan' },
]
// 손으로 그린 특별 지역(미션용). 대략적인 모양.
const SPECIAL = {
  '1938': [{
    NAME: 'Sudetenland', SUBJECTO: 'Germany', special: 1,
    // 보헤미아·모라비아를 둘러싼 국경 지대(초승달 모양)
    ring: [[12.1,50.3],[12.9,50.45],[13.6,50.75],[14.4,50.95],[15.3,50.85],[16.2,50.65],[16.9,50.25],[17.6,50.25],[18.1,49.95],[17.5,49.75],[16.8,49.85],[16.3,50.2],[15.4,50.45],[14.4,50.5],[13.5,50.3],[12.9,49.9],[13.2,49.3],[13.9,48.85],[14.7,48.8],[15.6,48.95],[16.4,48.8],[16.5,48.6],[15.5,48.6],[14.6,48.5],[13.7,48.6],[12.9,49.1],[12.4,49.7],[12.1,50.3]],
  }],
}

function ringArea(r) { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2 }
function ringCentroid(r) {
  const a = ringArea(r); if (!a) return r[0]
  let x = 0, y = 0
  for (let i = 0; i < r.length - 1; i++) { const f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; x += (r[i][0] + r[i + 1][0]) * f; y += (r[i][1] + r[i + 1][1]) * f }
  return [x / (6 * a), y / (6 * a)]
}
function measure(g) {
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates]
  let best = null, bestA = 0, total = 0
  for (const p of polys) {
    const c = ringCentroid(p[0])
    const a = Math.abs(ringArea(p[0])) * Math.cos((c[1] * Math.PI) / 180)
    total += a
    if (a >= bestA) { bestA = a; best = c }
  }
  return { c: best.map(v => +v.toFixed(2)), a: +total.toFixed(2) }
}

const built = {}
const pool = {}
for (const y of YEARS) {
  const out = `public/maps/${y}.json`
  await mapshaper.runCommands(
    `raw/world_${y}.geojson -filter "NAME != null && NAME.trim() != ''" -simplify 12% keep-shapes -dissolve NAME copy-fields=SUBJECTO -clean -o ${out} format=geojson gj2008 precision=0.01`)
  built[y] = JSON.parse(fs.readFileSync(out))
}
for (const b of BORROW) {
  const src = built[b.from].features.find(f => f.properties.NAME === b.name)
  if (!src) { console.warn('빌려 올 땅 없음', b); continue }
  built[b.to].features = built[b.to].features.filter(f => f.properties.NAME !== b.as)
  built[b.to].features.push({ type: 'Feature', properties: { NAME: b.as, SUBJECTO: b.subject || b.as, top: 1 }, geometry: src.geometry })
}
for (const [y, list] of Object.entries(SPECIAL)) for (const s of list) {
  const { ring, ...props } = s
  built[y].features.push({ type: 'Feature', properties: { ...props, top: 1 }, geometry: { type: 'Polygon', coordinates: [ring] } })
}
for (const y of YEARS) {
  const d = built[y]
  d.features = d.features.filter(f => f.geometry)
  for (const f of d.features) {
    Object.assign(f.properties, measure(f.geometry))
    if (!f.properties.SUBJECTO || f.properties.SUBJECTO === f.properties.NAME) delete f.properties.SUBJECTO
  }
  const out = `public/maps/${y}.json`
  fs.writeFileSync(out, JSON.stringify(d))
  pool[y] = Object.fromEntries(d.features.filter(f => !f.properties.special).map(f => [f.properties.NAME, [...f.properties.c, Math.round(f.properties.a)]]))
  console.log(y, d.features.length, (fs.statSync(out).size / 1024 | 0) + 'KB')
}
fs.writeFileSync('src/data/pool.json', JSON.stringify(pool))
