// 같은 이름이라도 시대에 따라 다르게 불러야 하는 곳. { 연도: { 원래 이름: 한글 이름 } }
export const NAME_FIX = {
  bc2000: { Koreans: '고조선(청동기 문화)' },
  bc200: { Rome: '로마 공화정', Carthage: '카르타고' },
  1000: { Korea: '고려' }, 1500: { Korea: '조선' }, 1600: { Korea: '조선' }, 1783: { Korea: '조선' }, 1815: { Korea: '조선' }, 1880: { Korea: '조선' }, 1900: { Korea: '대한 제국' },
  1914: { 'Manchu Empire': '중화민국', Denmark: '덴마크(그린란드 포함)', Persia: '페르시아(카자르 왕조)' },
  1920: {
    USSR: '소비에트 러시아', 'Chinese Warlords': '중화민국(군벌 시대)', 'Ottoman Sultanate': '오스만 제국', Germany: '독일(바이마르 공화국)', Iran: '페르시아', Manchuria: '만주(군벌)',
    Zambia: '북로디지아(영국령)', Zimbabwe: '남로디지아(영국령)', Kenya: '케냐(영국령)', 'Tanzania, United Republic of': '탕가니카(영국 위임 통치)', Ghana: '골드코스트(영국령)', Malaysia: '말라야(영국령)',
    Sudan: '수단(영국·이집트 공동 통치)', Nigeria: '나이지리아(영국령)', Angola: '앙골라(포르투갈령)', Mozambique: '모잠비크(포르투갈령)', Algeria: '알제리(프랑스령)', Botswana: '베추아날란드(영국령)', Uganda: '우간다(영국령)',
    Malawi: '니아살란드(영국령)', Eritrea: '에리트레아(이탈리아령)', Togo: '토고(프랑스 위임 통치)', Tunisia: '튀니지(프랑스 보호령)', Morocco: '모로코(프랑스 보호령)', Philippines: '필리핀(미국령)', Denmark: '덴마크(그린란드 포함)',
  },
  1938: {
    'Chinese warlords': '중화민국', Germany: '독일(나치 독일)', Italy: '이탈리아(파시스트)', 'Tanzania, United Republic of': '탕가니카(영국 위임 통치)', Sudan: '수단(영국·이집트 공동 통치)', Botswana: '베추아날란드(영국령)',
    Malaysia: '말라야(영국령)', Malawi: '니아살란드(영국령)', Tunisia: '튀니지(프랑스 보호령)', Libya: '리비아(이탈리아령)', Togo: '토고(프랑스 위임 통치)', Cambodia: '캄보디아(프랑스령)', 'Cochin China': '코친차이나(프랑스령)', Laos: '라오스(프랑스령)', Denmark: '덴마크(그린란드 포함)',
  },
  1945: {
    India: '인도(영국령)', Pakistan: '인도(영국령)', Bangladesh: '인도(영국령)', Zaire: '콩고(벨기에령)', Indonesia: '인도네시아(독립 선언)', Burma: '버마(영국령)', Namibia: '남서아프리카', Malaysia: '말라야(영국령)',
    'Tanzania, United Republic of': '탕가니카(영국령)', Botswana: '베추아날란드(영국령)', 'Central African Republic': '우방기샤리(프랑스령)', Cameroon: '카메룬(프랑스령)', Congo: '콩고(프랑스령)', Gabon: '가봉(프랑스령)',
    'Burkina Faso': '오트볼타(프랑스령)', Benin: '다호메이(프랑스령)', Togo: '토고(프랑스령)', 'Western Sahara': '에스파냐령 사하라', 'Sri Lanka': '실론(영국령)', 'United Arab Emirates': '트루셜 오만(영국 보호령)', Oman: '무스카트 오만',
    Somalia: '소말리아(영국 점령)', Denmark: '덴마크(그린란드 포함)', Manchuria: '만주(소련군 점령)',
  },
}
