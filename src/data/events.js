// 교사가 터뜨리는 '긴급 사건'. 1분 안에 그 연도의 그 나라를 찾아 누르면 보너스.
export const EVENTS = {
  u1: [
    { title: '속보! 나일강이 넘쳐 흘러 파라오가 피라미드 공사를 명했다!', clue: '기원전 2000년 무렵, 나일강의 나라', year: 'bc2000', name: 'Egypt' },
    { title: '속보! 마라톤 평원에 페르시아 대군이 상륙했다!', clue: '기원전 500년 무렵, 페르시아에 맞선 도시 국가들', year: 'bc500', name: 'Greek city-states' },
    { title: '속보! 젊은 정복왕이 바빌론에서 쓰러졌다!', clue: '기원전 323년, 그가 세운 대제국', year: 'bc323', name: 'Empire of Alexander' },
    { title: '속보! 아소카왕이 전쟁을 뉘우치고 불교에 귀의했다!', clue: '기원전 200년 무렵, 인도를 통일한 왕조', year: 'bc200', name: 'Mauryan Empire' },
    { title: '속보! 장건이 서역에서 돌아왔다. 비단길이 열린다!', clue: '100년 무렵, 비단길 동쪽 끝의 나라', year: '100', name: 'Han' },
  ],
  u5: [
    { title: '속보! 사라예보에서 총성! 황태자 부부가 쓰러졌다!', clue: '1914년, 황태자를 잃은 제국', year: '1914', name: 'Austro-Hungarian Empire' },
    { title: '속보! 거울의 방에서 조약이 맺어졌다. 패전국에 막대한 배상금!', clue: '1920년 무렵, 배상금을 떠안은 나라', year: '1920', name: 'Germany' },
    { title: '속보! 뮌헨에서 네 나라 정상이 만났다!', clue: '1938년, 땅을 내주게 된 나라', year: '1938', name: 'Czechoslovakia' },
    { title: '속보! 히로시마와 나가사키에 원자 폭탄 투하!', clue: '1945년, 항복한 나라', year: '1945', name: 'Japan (USA)' },
  ],
}
