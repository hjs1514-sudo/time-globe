# 타임머신 역사지구본

중학교 역사(세계사) 수업용 웹앱입니다. 3D 지구본에서 연도를 맞추면 그 시대의 나라들이 지구본 위에 펼쳐집니다.

- **탐험용** (`#/explore`): 시대를 넘나들며 나라를 누르면 중학교 2학년 수준의 요약 카드가 나옵니다. 교사가 화면에 띄워 설명하거나 학생이 혼자 탐험할 때 씁니다.
- **수업용** (`#/class`, 교사는 `#/teacher`): 교사가 수업을 만들면 학생이 수업 코드와 닉네임으로 들어옵니다.
  1. 퀴즈 만들기 시간: 학생이 나라를 눌러 퀴즈를 냅니다.
  2. 역사 타임머신 탐험하기 시간: 정해진 시간 동안 친구들의 퀴즈와 숨은 '선생님!미션'(국제 관계 미션)을 풉니다.
  3. 교사 대시보드: 학생별 퀴즈·미션 현황, 팀 랜덤 구성, 팀·개인 순위, 일시정지, 공지, 퀴즈 숨기기, 긴급 사건.
- 재미 요소: 시간 도둑, 타임머신 연료, 미션 탐지기, 콤보, 칭호, 긴급 사건, 팀전, 타임머신 고르기.

## 실행

```sh
npm install
npm run dev      # 개발 서버 (수업용 API는 메모리 저장으로 함께 뜹니다)
npm run build    # dist/ 생성
node tools/sim.mjs   # 가상 학생 24명으로 수업 한 판 돌려 보기 (개발 서버가 켜져 있어야 함)
```

교사 화면 PIN은 `2026`입니다. 실제 배포에서는 `functions/api/globe/`가 Cloudflare Pages Functions + D1(바인딩 `DB`)로 동작합니다.

## 구조

- `src/data/eras.js` 단원과 연도, `cards.js` 나라 요약 카드, `missions.js` 선생님!미션, `events.js` 긴급 사건, `names.json`·`nameFix.js` 한글 나라 이름
- `src/core/engine.js` 수업 게임 규칙(서버와 개발 서버가 같이 씀), `server/handler.js` API
- `public/maps/{연도}.json` 시대별 국경 지도(22장)
- `tools/fetch-maps.sh`, `tools/build-maps.mjs` 지도 내려받기와 가공, `tools/cutout.py` 그림 오려 넣기

## 자료와 라이선스

- 시대별 국경 자료: [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0)를 단순화하고 일부 지역(고조선, 고려, 일제 강점기 한국, 주데텐란트 등)을 보완했습니다. 옛 국경은 추정이 많아 실제와 다를 수 있습니다.
- 이 저장소의 코드는 GPL-3.0-or-later 입니다.
- 그림(타임머신, 시간 도둑, 첫 화면 배경)은 Canva로 만들었습니다.
