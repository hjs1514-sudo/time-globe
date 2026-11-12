import NAMES from '../data/names.json'
import { NAME_FIX } from '../data/nameFix.js'

const cache = new Map()
export async function loadMap(yearId) {
  if (!cache.has(yearId)) {
    cache.set(yearId, fetch(`${import.meta.env.BASE_URL}maps/${yearId}.json`).then(r => r.json()).then(d => d.features))
  }
  return cache.get(yearId)
}
// 한글 이름. 연도별로 다르게 불러야 하는 곳은 nameFix.js 에서 고친다.
export function ko(name, yearId) {
  return NAME_FIX[yearId]?.[name] || NAMES[name] || null
}
export const koOr = (name, yearId) => ko(name, yearId) || name
// 나라가 아닌 집단(수렵·채집민, 문화권 등)
const FOLK = /수렵|채집|유목민|농경민|어로민|사냥꾼|원주민|문화|부족|미상|[족인]$|[족인]\(/
export function isFolk(name, yearId) { const k = ko(name, yearId); return !k || FOLK.test(k) }

const PALETTE = ['#e6794a', '#e9b44c', '#8fb339', '#3fa796', '#4f9dde', '#6c7fe0', '#a56cc1', '#d95d8c', '#c7522a', '#b08d2f', '#5c9e4a', '#2f8f83', '#3b7fc4', '#5a63c9', '#8a52ab', '#c2477a', '#f08a5d', '#f2c14e', '#a3c755', '#5cc2b0', '#74b4ee', '#8d9bf0', '#c08bdb', '#ec7fa8']
const FIXED = {
  'Roman Empire': '#b5302a', Rome: '#b5302a', Han: '#d6a419', 'Han Empire': '#d6a419', 'Achaemenid Empire': '#7a56b8', 'Empire of Alexander': '#3b7fc4', Egypt: '#e0a43a',
  'United Kingdom of Great Britain and Ireland': '#d4577b', 'United Kingdom': '#d4577b', France: '#4f79d8', 'German Empire': '#6b6f7a', Germany: '#6b6f7a', 'Russian Empire': '#4f9a57', Russia: '#4f9a57', USSR: '#c43d3d',
  'Empire of Japan': '#c94f4f', 'Ottoman Empire': '#3fa796', 'United States': '#3e6fb0', 'United States of America': '#3e6fb0', USA: '#3e6fb0',
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
export function colorOf(f, yearId) {
  const p = f.properties
  const key = p.SUBJECTO || p.NAME
  if (FIXED[key]) return FIXED[key]
  if (isFolk(p.NAME, yearId) && !p.SUBJECTO) return '#7d8f86'
  return PALETTE[hash(key) % PALETTE.length]
}
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}
// 두 지점 사이 각도(도)
export function angle(a, b) {
  const r = Math.PI / 180, la1 = a[1] * r, la2 = b[1] * r, dl = (b[0] - a[0]) * r
  return Math.acos(Math.min(1, Math.sin(la1) * Math.sin(la2) + Math.cos(la1) * Math.cos(la2) * Math.cos(dl))) / r
}
