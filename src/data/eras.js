// 단원과 시대 지도 목록. (비상교육 중학교 역사 목차 흐름에 맞춤. 단원 이름·순서는 여기서 고친다.)
export const UNITS = [
  { id: 'u1', no: 'Ⅰ', title: '문명의 발생과 고대 세계의 형성', short: '고대 세계', color: '#e9b44c', years: [
    { id: 'bc2000', y: -2000, label: '기원전 2000년 무렵', topic: '4대 문명이 꽃피다' },
    { id: 'bc500', y: -500, label: '기원전 500년 무렵', topic: '페르시아와 그리스, 춘추 전국 시대' },
    { id: 'bc323', y: -323, label: '기원전 323년', topic: '알렉산드로스 제국' },
    { id: 'bc200', y: -200, label: '기원전 200년 무렵', topic: '한과 흉노, 마우리아 왕조, 로마의 성장' },
    { id: '100', y: 100, label: '100년 무렵', topic: '로마 제국과 한, 비단길' },
  ] },
  { id: 'u2', no: 'Ⅱ', title: '세계 종교의 확산과 지역 문화의 형성', short: '종교와 지역 문화', color: '#58b09c', years: [
    { id: '600', y: 600, label: '600년 무렵', topic: '수·당의 등장, 사산 왕조와 비잔티움 제국' },
    { id: '800', y: 800, label: '800년 무렵', topic: '이슬람 세계의 확대, 프랑크 왕국, 당' },
    { id: '1000', y: 1000, label: '1000년 무렵', topic: '송, 셀주크 튀르크 이전의 이슬람 세계, 신성 로마 제국' },
  ] },
  { id: 'u3', no: 'Ⅲ', title: '지역 세계의 교류와 변화', short: '교류와 변화', color: '#6aa9e9', years: [
    { id: '1200', y: 1200, label: '1200년 무렵', topic: '몽골 제국 직전, 십자군 전쟁의 시대' },
    { id: '1279', y: 1279, label: '1279년', topic: '몽골 제국이 유라시아를 잇다' },
    { id: '1500', y: 1500, label: '1500년 무렵', topic: '명, 오스만 제국, 신항로 개척' },
    { id: '1600', y: 1600, label: '1600년 무렵', topic: '무굴 제국, 사파비 왕조, 에스파냐의 아메리카 지배' },
  ] },
  { id: 'u4', no: 'Ⅳ', title: '제국주의 침략과 국민 국가 건설 운동', short: '제국주의와 국민 국가', color: '#c98bdb', years: [
    { id: '1783', y: 1783, label: '1783년', topic: '미국 독립, 프랑스 혁명 전야' },
    { id: '1815', y: 1815, label: '1815년', topic: '나폴레옹 이후의 빈 체제' },
    { id: '1880', y: 1880, label: '1880년 무렵', topic: '독일·이탈리아 통일, 아프리카 분할 직전' },
    { id: '1900', y: 1900, label: '1900년 무렵', topic: '제국주의 열강의 세계 분할' },
  ] },
  { id: 'u5', no: 'Ⅴ', title: '세계 대전과 사회 변동', short: '세계 대전', color: '#e2725b', years: [
    { id: '1914', y: 1914, label: '1914년', topic: '제1차 세계 대전이 일어나다' },
    { id: '1920', y: 1920, label: '1920년 무렵', topic: '베르사유 체제와 새로 생긴 나라들' },
    { id: '1938', y: 1938, label: '1938년', topic: '전체주의의 팽창, 뮌헨 회담' },
    { id: '1945', y: 1945, label: '1945년', topic: '제2차 세계 대전이 끝나다' },
  ] },
  { id: 'u6', no: 'Ⅵ', title: '현대 세계의 전개와 과제', short: '현대 세계', color: '#8fb339', years: [
    { id: '1960', y: 1960, label: '1960년 무렵', topic: '냉전, 아시아·아프리카의 독립' },
    { id: '1994', y: 1994, label: '1994년 무렵', topic: '소련 해체 이후의 세계' },
  ] },
]
export const ALL_YEARS = UNITS.flatMap(u => u.years.map(y => ({ ...y, unit: u.id })))
export const yearInfo = id => ALL_YEARS.find(y => y.id === id)
export const unitOf = id => UNITS.find(u => u.years.some(y => y.id === id))
// 입력한 연도에 가장 가까운 지도 찾기
export function nearestYear(n, within) {
  const list = within || ALL_YEARS
  return list.reduce((b, y) => (Math.abs(y.y - n) < Math.abs(b.y - n) ? y : b), list[0])
}
export const CONTINENTS = [
  { id: 'asia', name: '아시아', pov: { lat: 32, lng: 95, altitude: 1.9 } },
  { id: 'europe', name: '유럽', pov: { lat: 50, lng: 15, altitude: 1.2 } },
  { id: 'africa', name: '아프리카', pov: { lat: 3, lng: 20, altitude: 1.9 } },
  { id: 'namerica', name: '북아메리카', pov: { lat: 42, lng: -100, altitude: 1.9 } },
  { id: 'samerica', name: '남아메리카', pov: { lat: -18, lng: -60, altitude: 1.9 } },
  { id: 'oceania', name: '오세아니아', pov: { lat: -22, lng: 140, altitude: 1.8 } },
]
// 좌표로 지역 이름 구하기(대략)
export function regionOf([lng, lat]) {
  if (lng < -30) return lat > 12 ? '북아메리카' : '남아메리카'
  if (lat < -11 && lng > 110) return '오세아니아'
  if (lng > 150 && lat < 5) return '오세아니아'
  if (lng >= -30 && lng < 45 && lat > 36 && !(lng > 26 && lat < 42)) return '유럽'
  if (lng >= 45 && lng < 60 && lat > 50) return '유럽'
  if (lng > 34 && lng < 62 && lat > 12 && lat <= 42) return '서아시아'
  if (lng > 26 && lng <= 34 && lat > 30 && lat <= 42) return '서아시아'
  if (lng >= -20 && lng < 52 && lat <= 37) return '아프리카'
  if (lng >= 62 && lng < 92 && lat < 35) return '남아시아(인도)'
  if (lng >= 92 && lat < 23 && lat > -11) return '동남아시아'
  if (lng >= 100 && lat >= 23 && lat < 50) return '동아시아'
  return '중앙·북아시아'
}
