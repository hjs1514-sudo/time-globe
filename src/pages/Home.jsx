export default function Home() {
  const B = import.meta.env.BASE_URL
  return (
    <div className="home" style={{ backgroundImage: `linear-gradient(180deg, rgba(6,10,28,.3), rgba(6,10,28,.62)), url(${B}img/hero.jpg)` }}>
      <div className="home-in">
        <div className="home-badge">중학교 역사 · 세계사</div>
        <h1 className="home-title">타임머신<br /><span>역사지구본</span></h1>
        <p className="home-sub">연도를 맞추면 그 시대의 세계가 지구본 위에 펼쳐집니다.</p>
        <div className="home-cards">
          <a className="home-card explore" href="#/explore">
            <img src={`${B}img/tm0.png`} alt="" />
            <b>탐험하기</b>
            <span>혼자서 자유롭게 시대를 넘나들며<br />나라들을 살펴봐요.</span>
          </a>
          <a className="home-card klass" href="#/class">
            <img src={`${B}img/tm1.png`} alt="" />
            <b>수업 입장</b>
            <span>선생님이 알려 준 수업 코드로 들어가<br />퀴즈를 만들고 미션을 찾아요.</span>
          </a>
        </div>
        <a className="home-teacher" href="#/teacher">선생님 화면</a>
      </div>
    </div>
  )
}
