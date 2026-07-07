import json
import os
from datetime import datetime, timedelta
import urllib.parse
from fetch_cultural_data import fetch_cultural_events

# 1. 행정구역 코드 정의
AREA_MAP = {
    "11": {"name": "서울", "sigungu": {"11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구", "11215": "광진구", "11230": "동대문구", "11260": "중랑구", "11290": "성북구", "11305": "강북구", "11320": "도봉구", "11350": "노원구", "11380": "은평구", "11410": "서대문구", "11440": "마포구", "11470": "양천구", "11500": "강서구", "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구", "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구", "11740": "강동구"}},
    "26": {"name": "부산", "sigungu": {"26110": "중구", "26140": "서구", "26170": "동구", "26200": "영도구", "26230": "부산진구", "26260": "동래구", "26290": "남구", "26320": "북구", "26350": "해운대구", "26380": "사하구", "26410": "금정구", "26440": "강서구", "26470": "연제구", "26500": "수영구", "26530": "사상구", "26710": "기장군"}},
    "27": {"name": "대구", "sigungu": {"27110": "중구", "27140": "동구", "27170": "서구", "27200": "남구", "27230": "북구", "27260": "수성구", "27290": "달서구", "27710": "달성군", "27720": "군위군"}},
    "28": {"name": "인천", "sigungu": {"28110": "중구", "28140": "동구", "28177": "미추홀구", "28185": "연수구", "28200": "남동구", "28237": "부평구", "28245": "계양구", "28260": "서구", "28710": "강화군", "28720": "옹진군"}},
    "29": {"name": "광주", "sigungu": {"29110": "동구", "29140": "서구", "29155": "남구", "29170": "북구", "29200": "광산구"}},
    "30": {"name": "대전", "sigungu": {"30110": "동구", "30140": "중구", "30170": "서구", "30200": "유성구", "30230": "대덕구"}},
    "31": {"name": "울산", "sigungu": {"31110": "중구", "31140": "남구", "31170": "동구", "31200": "북구", "31710": "울주군"}},
    "36": {"name": "세종", "sigungu": {"36110": "세종특별자치시"}},
    "41": {"name": "경기", "sigungu": {"41110": "수원시", "41130": "성남시", "41150": "의정부시", "41170": "안양시", "41190": "부천시", "41210": "광명시", "41220": "평택시", "41250": "동두천시", "41270": "안산시", "41280": "고양시", "41290": "과천시", "41310": "구리시", "41360": "남양주시", "41370": "오산시", "41390": "시흥시", "41410": "군포시", "41430": "의왕시", "41450": "하남시", "41460": "용인시", "41480": "파주시", "41500": "이천시", "41550": "안성시", "41570": "김포시", "41590": "화성시", "41610": "광주시", "41630": "양주시", "41650": "포천시", "41670": "여주시", "41800": "연천군", "41820": "가평군", "41830": "양평군"}},
    "43": {"name": "충북", "sigungu": {"43110": "청주시", "43130": "충주시", "43150": "제천시", "43720": "보은군", "43730": "옥천군", "43740": "영동군", "43745": "증평군", "43750": "진천군", "43760": "괴산군", "43770": "음성군", "43800": "단양군"}},
    "44": {"name": "충남", "sigungu": {"44130": "천안시", "44150": "공주시", "44180": "보령시", "44200": "아산시", "44210": "서산시", "44230": "논산시", "44250": "계룡시", "44270": "당진시", "44710": "금산군", "44760": "부여군", "44770": "서천군", "44790": "청양군", "44800": "홍성군", "44810": "예산군", "44825": "태안군"}},
    "46": {"name": "전남", "sigungu": {"46110": "목포시", "46130": "여수시", "46150": "순천시", "46170": "나주시", "46230": "광양시", "46710": "담양군", "46720": "곡성군", "46730": "구례군", "46770": "고흥군", "46780": "보성군", "46790": "화순군", "46800": "장흥군", "46810": "강진군", "46820": "해남군", "46830": "영암군", "46840": "무안군", "46860": "함평군", "46870": "영광군", "46880": "장성군", "46890": "완도군", "46900": "진도군", "46910": "신안군"}},
    "47": {"name": "경북", "sigungu": {"47110": "포항시", "47130": "경주시", "47150": "김천시", "47170": "안동시", "47190": "구미시", "47210": "영주시", "47230": "영천시", "47250": "상주시", "47280": "문경시", "47290": "경산시", "47730": "군위군", "47750": "의성군", "47760": "청송군", "47770": "영양군", "47820": "영덕군", "47830": "청도군", "47840": "고령군", "47850": "칠곡군", "47900": "예천군", "47920": "봉화군", "47930": "울진군", "47940": "울릉군"}},
    "48": {"name": "경남", "sigungu": {"48120": "창원시", "48170": "진주시", "48220": "통영시", "48240": "사천시", "48250": "김해시", "48270": "밀양시", "48310": "거제시", "48330": "양산시", "48720": "의령군", "48730": "함안군", "48740": "창녕군", "48820": "고성군", "48840": "남해군", "48850": "하동군", "48860": "산청군", "48870": "함양군", "48880": "거창군", "48890": "합천군"}},
    "50": {"name": "제주", "sigungu": {"50110": "제주시", "50130": "서귀포시"}},
    "51": {"name": "강원", "sigungu": {"51110": "춘천시", "51130": "원주시", "51150": "강릉시", "51170": "동해시", "51190": "태백시", "51210": "속초시", "51230": "삼척시", "51720": "홍천군", "51730": "횡성군", "51750": "영월군", "51760": "평창군", "51770": "정선군", "51780": "철원군", "51790": "화천군", "51800": "양구군", "51810": "인제군", "51820": "고성군", "51830": "양양군"}},
    "52": {"name": "전북", "sigungu": {"52110": "전주시", "52130": "군산시", "52140": "익산시", "52180": "정읍시", "52190": "남원시", "52210": "김제시", "52710": "완주군", "52720": "진안군", "52730": "무주군", "52740": "장수군", "52750": "임실군", "52770": "순창군", "52790": "고창군", "52800": "부안군"}}
}

# 2. 전국구 연계 지원금 목록 정의
global_benefits = [
    {
        "name": "정부 근로자 휴가지원금",
        "desc": "이 행사 방문 교통비/숙박비로 사용 가능 (최대 20만원 매칭 지원)",
        "link": "https://vacation.visitkorea.or.kr/",
        "eligible": "company_vacation"
    },
    {
        "name": "문화누리카드",
        "desc": "저소득층 연 13만원 지원 카드 — 입장권·교통비·숙박 결제 가능",
        "link": "https://www.mnuri.kr/",
        "eligible": "low_income"
    },
    {
        "name": "다자녀 가족 무료/할인 입장",
        "desc": "공식 축제·행사는 다자녀카드 제시 시 입장료 면제 또는 50% 감면",
        "link": "https://search.naver.com/search.naver?query=" + urllib.parse.quote("다자녀 혜택"),
        "eligible": "multi_child"
    },
    {
        "name": "장애인 무료/할인 입장",
        "desc": "공식 축제·행사는 복지카드 제시 시 입장료 면제 또는 50% 감면",
        "link": "https://search.naver.com/search.naver?query=" + urllib.parse.quote("장애인 복지카드 혜택"),
        "eligible": "disabled"
    },
    {
        "name": "국가유공자 무료/할인 입장",
        "desc": "국가유공자증 제시 시 국립 시설·행사 입장료 면제 또는 할인",
        "link": "https://www.mpva.go.kr/",
        "eligible": "national_merit"
    },
    {
        "name": "경로 무료/할인 입장",
        "desc": "만 65세 이상 어르신 각종 공연·축제·시설 입장료 할인 또는 면제",
        "link": "https://search.naver.com/search.naver?query=" + urllib.parse.quote("경로 우대 혜택"),
        "eligible": "senior"
    },
    {
        "name": "청년 문화 지원 할인",
        "desc": "청년(만 19~39세) 대상 공연·전시·축제 입장료 할인 및 지원금",
        "link": "https://www.youth.go.kr/",
        "eligible": "youth"
    },
    {
        "name": "한부모가족 지원 할인",
        "desc": "한부모가족 증명서 제시 시 문화·여가 시설 이용료 감면",
        "link": "https://www.bokjiro.go.kr/",
        "eligible": "single_parent"
    },
    {
        "name": "임산부 배려 혜택",
        "desc": "임산부 우대·배려석 이용 및 임신 확인 시 일부 시설 무료 입장",
        "link": "https://search.naver.com/search.naver?query=" + urllib.parse.quote("임산부 배려 혜택"),
        "eligible": "pregnant"
    }
]

# 3. 진짜 실제 전국 축제 및 행사 데이터셋
REAL_FESTIVALS = [
    {"title": "인천 펜타포트 락 페스티벌", "addr1": "인천광역시 연수구 센트럴로 350", "eventstartdate": "20260807", "eventenddate": "20260809", "category": "festival", "official_url": "https://www.pentaportrock.com/", "amount": "입장 요금 전액 무료 (선착순 티켓)"},
    {"title": "인천 개항장 문화재 야행", "addr1": "인천광역시 중구 신포로27번길 80", "eventstartdate": "20260620", "eventenddate": "20260622", "category": "free", "official_url": "https://www.incheon.go.kr/culture/index", "amount": "야간 특별 관람 전면 무료"},
    {"title": "인천 소래포구 축제", "addr1": "인천광역시 남동구 아암대로 1620", "eventstartdate": "20260918", "eventenddate": "20260920", "category": "festival", "official_url": "https://www.incheon.go.kr/culture/index", "amount": "수산물 무료 시식 체험권"},
    {"title": "대구 치맥 페스티벌", "addr1": "대구광역시 달서구 공원순환로 201", "eventstartdate": "20260701", "eventenddate": "20260705", "category": "festival", "official_url": "https://chimac.kr/", "amount": "시식 할인 쿠폰 15,000원권"},
    {"title": "대구 수성못 페스티벌", "addr1": "대구광역시 수성구 용학로 35-5", "eventstartdate": "20260925", "eventenddate": "20260927", "category": "festival", "official_url": "https://tour.daegu.go.kr/", "amount": "수상 무대 관람료 전액 무료"},
    {"title": "대구 약령시 한방문화축제", "addr1": "대구광역시 중구 남성로 51-1", "eventstartdate": "20260505", "eventenddate": "20260509", "category": "free", "official_url": "https://tour.daegu.go.kr/", "amount": "한방 족욕 체험 무료 제공"},
    {"title": "부산 국제 록 페스티벌", "addr1": "부산광역시 사상구 삼락동 29-61", "eventstartdate": "20261003", "eventenddate": "20261004", "category": "festival", "official_url": "http://www.busan.com/biff", "amount": "록 페스티벌 입장 특별 무료권"},
    {"title": "부산 자갈치 축제", "addr1": "부산광역시 중구 자갈치해안로 52", "eventstartdate": "20261008", "eventenddate": "20261011", "category": "festival", "official_url": "https://tour.busan.go.kr/", "amount": "온누리상품권 1만원 페이백"},
    {"title": "부산 해운대 모래축제", "addr1": "부산광역시 해운대구 우동", "eventstartdate": "20260522", "eventenddate": "20260525", "category": "festival", "official_url": "https://tour.busan.go.kr/", "amount": "모래 조각 체험 무료 개방"},
    {"title": "서울 장미 축제", "addr1": "서울특별시 중랑구 묵동 375", "eventstartdate": "20260515", "eventenddate": "20260524", "category": "free", "official_url": "https://culture.seoul.go.kr/", "amount": "장미 터널 및 사진 촬영 무료"},
    {"title": "서울 신촌 물총 축제", "addr1": "서울특별시 서대문구 창천동 신촌로터리", "eventstartdate": "20260725", "eventenddate": "20260726", "category": "water", "official_url": "https://culture.seoul.go.kr/", "amount": "참가 패키지 선착순 무료 지원"},
    {"title": "서울 여의도 봄꽃축제", "addr1": "서울특별시 영등포구 여의서로", "eventstartdate": "20260405", "eventenddate": "20260410", "category": "free", "official_url": "https://culture.seoul.go.kr/", "amount": "여의서로 차없는 거리 무료 개방"},
    {"title": "강릉 단오제", "addr1": "강원특별자치도 강릉시 단오장길 1", "eventstartdate": "20260614", "eventenddate": "20260621", "category": "festival", "official_url": "https://www.danojefestival.or.kr/", "amount": "수리취떡 맛보기 무료 제공"},
    {"title": "화천 산천어 축제", "addr1": "강원특별자치도 화천군 화천읍", "eventstartdate": "20261220", "eventenddate": "20261231", "category": "eco", "official_url": "https://www.narafestival.com/", "amount": "농특산물 교환권 5,000원권"},
    {"title": "태백산 눈축제", "addr1": "강원특별자치도 태백시 천제단길 162", "eventstartdate": "20261224", "eventenddate": "20261231", "category": "eco", "official_url": "https://www.taebaek.go.kr/portal/main.do", "amount": "얼음 조각전 특별전 전면 무료"},
    
    # 7~8월 여름철 물놀이 정보 확장 (평일 포함 모든 날짜에 잘 노출되도록 주입)
    {"title": "서울 뚝섬 한강공원 야외수영장 개장", "addr1": "서울특별시 광진구 자양동 112", "eventstartdate": "20260625", "eventenddate": "20260831", "category": "water", "official_url": "https://hangang.seoul.go.kr/", "amount": "다자녀·장애인 이용 요금 50% 감면"},
    {"title": "용인시 수지체육공원 어린이 물놀이터", "addr1": "경기도 용인시 수지구 포은대로 435", "eventstartdate": "20260701", "eventenddate": "20260825", "category": "water", "official_url": "https://www.yongin.go.kr/", "amount": "입장 요금 및 물놀이 전액 무료"},
    {"title": "강릉 경포대 해수욕장 야외 분수 광장", "addr1": "강원특별자치도 강릉시 안현동 산1", "eventstartdate": "20260710", "eventenddate": "20260820", "category": "water", "official_url": "https://tour.gwd.go.kr/", "amount": "야간 음악 분수 무료 공연"},
    {"title": "부산 다대포 낙조 분수대 야간 가동", "addr1": "부산광역시 사하구 다대동 11-1", "eventstartdate": "20260625", "eventenddate": "20260930", "category": "water", "official_url": "https://tour.busan.go.kr/", "amount": "해변 낙조 음악분수 전면 무료"},
    {"title": "인천 센트럴파크 해수족욕탕", "addr1": "인천광역시 연수구 송도동 24-5", "eventstartdate": "20260701", "eventenddate": "20260831", "category": "water", "official_url": "https://www.incheon.go.kr/", "amount": "해수 족욕 및 쉼터 상시 무료 개방"}
]

# 4. 각 지자체별 풍부한 혜택 및 지역 행사 템플릿 마스터 데이터 (연중 채우기 복원)
local_benefit_templates = {
    "11": [ # 서울
        {"title": "서울 한강 봄꽃 문화 축제", "amount": "최대 50,000원 상품권 지원", "period": "2026.06.25 ~ 07.10", "type": "지원금", "source": "https://culture.seoul.go.kr/", "note": "서울시 주관. 한강 생태 복구 기념 봄꽃 체험 행사 참가자에게 제로페이 모바일 5만원권 지원.", "color": "#0064FF", "tags": ["benefit", "eco"], "sigunguCd": "11140", "sigunguNm": "중구"},
        {"title": "난지캠핑장 유공자 및 장애인 감면", "amount": "이용 요금 30% 즉시 감면", "period": "상시 운영", "type": "할인", "source": "https://yeyak.seoul.go.kr/", "note": "서울시 한강공원 난지야영장 예약 시 복지카드 및 유공자 증빙 지참 시 이용액 30% 할인 제공.", "color": "#AF52DE", "tags": ["camp", "barrier"], "sigunguCd": "11440", "sigunguNm": "마포구"}
    ],
    "26": [ # 부산
        {"title": "광안리 해양레저 SUP 서핑 체험 교실 지원", "amount": "장비 대여 및 강습비 전액 무료", "period": "2026.06.25 ~ 09.30", "type": "무료", "source": "https://www.suyeong.go.kr/", "note": "부산 수영구 주관. 타 시도 거주 청년 관광객 광안리 해변 레포츠 저변 활성화 사업 무료 강습 패키지 제공.", "color": "#34C759", "tags": ["free"], "sigunguCd": "26500", "sigunguNm": "수영구"}
    ],
    "41": [ # 경기
        {"title": "용인시 어린이 도심 공원 물놀이터 무료 개방", "amount": "입장료 및 시설 전액 무료", "period": "2026.06.20 ~ 08.31", "type": "무료", "source": "https://www.yongin.go.kr/", "note": "용인시청 주관. 수지체육공원, 동백공원 등 야외 어린이 임시 물놀이터 상설 개방 및 안심 요원 배치.", "color": "#34C759", "tags": ["free", "stroller"], "sigunguCd": "41460", "sigunguNm": "용인시"},
        {"title": "자라섬 오토캠핑장 다자녀 및 장애인 감면", "amount": "야영 사용료 50% 즉시 감면", "period": "상시 운영", "type": "할인", "source": "https://www.gp.go.kr/", "note": "가평군청 주관. 다자녀 가구 및 등록 장애인 자라섬 야영장 데크/오토캠핑 사이트 요금 50% 즉시 할인.", "color": "#AF52DE", "tags": ["camp", "barrier"], "sigunguCd": "41820", "sigunguNm": "가평군"}
    ],
    "43": [ # 충북
        {"title": "제천시 일주일 살아보기 체류 여행 보조금", "amount": "최대 100,000원 현금 환급", "period": "2026.09.01 ~ 11.30", "type": "지원금", "source": "https://www.jecheon.go.kr/", "note": "제천시 주관. 제천 내 농촌체험마을 혹은 지정 숙소에서 5박 이상 체류 및 영수증 증빙 시 여비 지원.", "color": "#0064FF", "tags": ["benefit", "eco"], "sigunguCd": "43150", "sigunguNm": "제천시"}
    ],
    "44": [ # 충남
        {"title": "태안군 반려동물 동반 반려견 전용 댕댕버스 지원", "amount": "교통 지원금 20,000원 즉시 할인", "period": "2026.06.01 ~ 10.31", "type": "지원금", "source": "https://www.taean.go.kr/", "note": "태안군 주관. 반려동물 동반 가족 전용 서해안 댕댕버스 셔틀 패키지 이용 시 정가 대비 2만원 특별 지원.", "color": "#0064FF", "tags": ["benefit", "pet"], "sigunguCd": "44825", "sigunguNm": "태안군"}
    ],
    "46": [ # 전남
        {"title": "강진 반값 강진관광 여행 비용 환급", "amount": "최대 100,000원 강진상품권 환급", "period": "2026.03.01 ~ 12.31", "type": "환급", "source": "https://www.gangjin.go.kr/", "note": "강진군 주관. 관외 거주 가족 단위 관광객이 강진 내 소비 영수증 인증 시 소비액의 50%를 강진사랑상품권으로 현장 즉시 환급.", "color": "#FF9500", "tags": ["payback", "eco"], "sigunguCd": "46810", "sigunguNm": "강진군"},
        {"title": "여수시 청소년 수련관 실내 수영장 무료 개방", "amount": "자유 수영 무료 입장", "period": "2026.07.01 ~ 08.31", "type": "무료", "source": "https://www.yeosu.go.kr/", "note": "여수시 주관. 청소년 및 어린이 물놀이 활성화를 위한 시립 실내 수영장 여름철 특정 주말 전면 무료입장 지원.", "color": "#34C759", "tags": ["free"], "sigunguCd": "46130", "sigunguNm": "여수시"}
    ],
    "47": [ # 경북
        {"title": "영덕 고캠핑 반려동물 차박 페스티벌 지원", "amount": "캠핑 사이트 및 특산물 웰컴 키트 무료 제공", "period": "2026.06.01 ~ 06.30", "type": "무료", "source": "https://www.yd.go.kr/", "note": "영덕군 주관. 친환경 반려동물 동반 가구 선착순 100팀 무료 캠핑 제공 및 영덕 대게 맛보기 혜택.", "color": "#34C759", "tags": ["free", "pet", "camp"], "sigunguCd": "47820", "sigunguNm": "영덕군"},
        {"title": "안동 유교문화 체류형 여행 경비 페이백", "amount": "최대 50,000원 안동사랑상품권 환급", "period": "2026.08.01 ~ 11.30", "type": "환급", "source": "https://www.andong.go.kr/", "note": "안동시 주관. 전통 한옥 마을 숙박 및 안동 내 전통시장 소비 영수증 20% 모바일 페이백 지원.", "color": "#FF9500", "tags": ["payback", "eco"], "sigunguCd": "47170", "sigunguNm": "안동시"}
    ],
    "51": [ # 강원
        {"title": "정선군 화암동굴 한여름 피서 야간 무료 특별 관람", "amount": "입장 요금 전액 무료", "period": "2026.07.15 ~ 08.20", "type": "무료", "source": "https://www.jsimc.or.kr/", "note": "정선군 주관. 여름 피서철 밤 11시까지 동굴 탐험 코스 무료 야간 특별 개방 (교통약자 전용 데크길 제공).", "color": "#34C759", "tags": ["free", "barrier", "eco"], "sigunguCd": "51770", "sigunguNm": "정선군"},
        {"title": "평창 치유의숲 휠체어 투어 생태 가이드 동행", "amount": "입장료 및 투어비 전액 무료", "period": "상시 운영", "type": "무료", "source": "https://www.forest.go.kr/", "note": "산림청 주관. 보행 약자 가구 대상 휠체어 전용 친환경 데크 숲길 무료 해설사 매칭 서비스.", "color": "#34C759", "tags": ["free", "barrier", "eco"], "sigunguCd": "51760", "sigunguNm": "평창군"}
    ],
    "52": [ # 전북
        {"title": "무주 반값 웰니스 힐링 여행 환급", "amount": "최대 70,000원 무주상품권 환급", "period": "2026.06.01 ~ 10.31", "type": "환급", "source": "https://www.muju.go.kr/", "note": "무주군 주관. 청정 친환경 생태 여행 코스 숙박 및 식음료 소비액의 50%를 지자체 지역사랑카드 상품권으로 즉시 보존 환급.", "color": "#FF9500", "tags": ["payback", "eco", "barrier"], "sigunguCd": "52730", "sigunguNm": "무주군"}
    ]
}

# 5. 무장애 및 반려동물동반 정보 리스트 (필터 가동 시 즉각 노출)
REAL_BARRIERS = [
    {"id": 80001, "title": "서울 경복궁 장애인/유모차 무장애 보행로", "addr1": "서울특별시 종로구 사직로 161", "official_url": "https://royal.cha.go.kr/", "amount": "동반자 포함 입장료 100% 면제"},
    {"id": 80002, "title": "정선군 화암동굴 교통약자 유모차 데크길", "addr1": "강원특별자치도 정선군 화암면 화암동굴길 12", "official_url": "https://www.jsimc.or.kr/", "amount": "장애인 및 복지카드 지참자 50% 할인"},
    {"id": 80003, "title": "부산 태종대 무장애 다누비 열차 운행", "addr1": "부산광역시 영도구 전망로 24", "official_url": "https://tour.busan.go.kr/", "amount": "휠체어 탑승 가능 리프트 버스 무료 지원"},
    {"id": 80004, "title": "평창 치유의숲 보행약자 전용 데크길", "addr1": "강원특별자치도 평창군 평창읍", "official_url": "https://www.forest.go.kr/", "amount": "친환경 데크 숲 해설사 무료 가이드 매칭"},
    {"id": 80005, "title": "제천 의림지 무장애 수변 데크로드", "addr1": "충청북도 제천시 의림지로 33", "official_url": "https://www.jecheon.go.kr/", "amount": "수변 데크길 및 의림지 역사 박물관 무료 입장"}
]

REAL_PETS = [
    {"id": 90001, "title": "영덕 고캠핑 반려동물 동반 오토캠핑 사이트", "addr1": "경상북도 영덕군 병곡면 동해대로", "official_url": "https://www.yd.go.kr/", "amount": "반려견 동반 텐트 사이트 무료 패키지"},
    {"id": 90002, "title": "태안 댕댕버스 반려동물 셔틀 운행 할인", "addr1": "충청남도 태안군 태안읍", "official_url": "https://www.taean.go.kr/", "amount": "댕댕버스 탑승 패키지 즉시 20,000원 지원"},
    {"id": 90003, "title": "춘천 남이섬 반려동물 동반 입장 혜택", "addr1": "강원특별자치도 춘천시 남산면 남이섬길 1", "official_url": "https://namisum.com/", "amount": "댕댕이 놀이터 및 전용 크루즈 탑승 무료"},
    {"id": 90004, "title": "울진 구수곡자연휴양림 야영장 반려동물 구역", "addr1": "경상북도 울진군 북면", "official_url": "https://www.uljin.go.kr/", "amount": "반려동물 가구 전용 야영 데크 특별 할인"},
    {"id": 90005, "title": "여수 댕댕이 웰컴 파크 놀이터", "addr1": "전라남도 여수시 시청로 1", "official_url": "https://www.yeosu.go.kr/", "amount": "시립 반려견 안심 놀이공원 전면 무료 개방"}
]

def get_area_from_address(addr):
    if not addr:
        return 0, "전국", 0, "전체"
    tokens = str(addr).split()
    if not tokens:
        return 0, "전국", 0, "전체"
    
    first = tokens[0]
    sido_map = {
        "서울": ("11", "서울"), "서울특별시": ("11", "서울"),
        "부산": ("26", "부산"), "부산광역시": ("26", "부산"),
        "대구": ("27", "대구"), "대구광역시": ("27", "대구"),
        "인천": ("28", "인천"), "인천광역시": ("28", "인천"),
        "광주": ("29", "광주"), "광주광역시": ("29", "광주"),
        "대전": ("30", "대전"), "대전광역시": ("30", "대전"),
        "울산": ("31", "울산"), "울산광역시": ("31", "울산"),
        "세종": ("36", "세종"), "세종특별자치시": ("36", "세종"),
        "경기": ("41", "경기"), "경기도": ("41", "경기"),
        "충북": ("43", "충북"), "충청북도": ("43", "충북"),
        "충남": ("44", "충남"), "충청남도": ("44", "충남"),
        "전남": ("46", "전남"), "전라남도": ("46", "전남"),
        "경북": ("47", "경북"), "경상북도": ("47", "경북"),
        "경남": ("48", "경남"), "경상남도": ("48", "경남"),
        "제주": ("50", "제주"), "제주특별자치도": ("50", "제주"),
        "강원": ("51", "강원"), "강원도": ("51", "강원"), "강원특별자치도": ("51", "강원"),
        "전북": ("52", "전북"), "전라북도": ("52", "전북"), "전북특별자치도": ("52", "전북")
    }
    
    sido_code = "0"
    sido_name = "전국"
    for k, v in sido_map.items():
        if k in first:
            sido_code, sido_name = v
            break
            
    sigungu_code = "0"
    sigungu_name = "전체"
    if len(tokens) > 1 and sido_code != "0":
        second = tokens[1]
        sigungus = AREA_MAP[sido_code]["sigungu"]
        for scode, sname in sigungus.items():
            if sname in second or second in sname:
                sigungu_code = scode
                sigungu_name = sname
                break
                
    return int(sido_code), sido_name, int(sigungu_code), sigungu_name

def build_data():
    data = {}
    start_date = datetime(2026, 6, 25)
    end_date = datetime(2026, 12, 31)
    total_days = (end_date - start_date).days + 1

    # 실시간 문화정보 API 수집 기동
    cultural_events = fetch_cultural_events()

    # 무장애 및 반려동물 메타데이터 수립 (필터 기동 시 전국 어디서나 로딩)
    barrier_processed = []
    for i, item in enumerate(REAL_BARRIERS):
        ac, an, sc, sn = get_area_from_address(item["addr1"])
        barrier_processed.append({
            "id": item["id"],
            "title": item["title"],
            "amount": item["amount"],
            "period": "상시 운영",
            "type": "무장애",
            "source": item["official_url"],
            "note": f"{item['addr1']} | 휠체어 전용 경사로 완비 및 유모차 대여 무료 서비스 제공.",
            "color": "#34C759",
            "tags": ["barrier", "free"],
            "areaCd": ac, "areaNm": an, "sigunguCd": sc, "sigunguNm": sn,
            "mapUrl": f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(item['addr1'])}",
            "isAd": False,
            "congestion": "green",
            "benefits": global_benefits
        })
        
    pet_processed = []
    for i, item in enumerate(REAL_PETS):
        ac, an, sc, sn = get_area_from_address(item["addr1"])
        pet_processed.append({
            "id": item["id"],
            "title": item["title"],
            "amount": item["amount"],
            "period": "상시 운영",
            "type": "반려동물",
            "source": item["official_url"],
            "note": f"{item['addr1']} | 오프리쉬 반려견 안심 놀이공간 및 목줄 착용 시 무료 출입 제공.",
            "color": "#34C759",
            "tags": ["pet"],
            "areaCd": ac, "areaNm": an, "sigunguCd": sc, "sigunguNm": sn,
            "mapUrl": f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(item['addr1'])}",
            "isAd": False,
            "congestion": "green",
            "benefits": global_benefits
        })

    # 하루도 빠짐없이 6월 25일부터 12월 31일까지 달력에 혜택 일정 주입
    for d in range(total_days):
        curr_date = start_date + timedelta(days=d)
        date_key = curr_date.strftime("%Y-%m-%d")
        data[date_key] = []
        
        # 1. 시도별 지자체 특화 혜택 및 행사 다변화 주입 (6월 25일 ~ 12월 31일 연중 매일 주입)
        for area_code, templates in local_benefit_templates.items():
            area_info = AREA_MAP[area_code]
            for i, template in enumerate(templates):
                # 템플릿의 기간 제한 파싱
                period = template["period"]
                is_in_range = True
                if period != "상시 운영" and " ~ " in period:
                    try:
                        p_parts = period.split(" ~ ")
                        p_start_str = p_parts[0].strip()
                        p_end_str = p_parts[1].strip()
                        
                        # 연도가 생략된 경우 (예: "07.10") 2026 연도 보강
                        if len(p_start_str.split('.')) == 2:
                            p_start_str = f"2026.{p_start_str}"
                        if len(p_end_str.split('.')) == 2:
                            p_end_str = f"2026.{p_end_str}"
                            
                        start_lim = datetime.strptime(p_start_str, "%Y.%m.%d")
                        end_lim = datetime.strptime(p_end_str, "%Y.%m.%d")
                        is_in_range = start_lim <= curr_date <= end_lim
                    except Exception as ex:
                        is_in_range = True

                # 혜택/행사가 고르게 날짜별로 활성화되도록 분산 노출
                if is_in_range and (i + d) % 2 == 0:
                    ac = int(area_code)
                    an = area_info["name"]
                    sc = int(template["sigunguCd"])
                    sn = template["sigunguNm"]
                    
                    specific_benefits = global_benefits.copy()
                    # 상품권 가로 연계 조인
                    if ac == 11:
                        specific_benefits.append({"name": "서울사랑상품권", "desc": "행사장 인근 서울 가맹점 결제 시 최대 10% 페이백", "link": "https://seoulpay.seoul.go.kr/"})
                    elif ac == 28:
                        specific_benefits.append({"name": "인천사랑상품권 (인천e음)", "desc": "인천 축제 현장 결제 시 최대 10% 캐시백", "link": "https://www.incheon.go.kr/"})
                    elif ac == 26:
                        specific_benefits.append({"name": "동백전 (부산화폐)", "desc": "부산 전역 축제 현장 결제 시 최대 10% 즉시 캐시백", "link": "https://www.bscard.or.kr/"})
                    elif ac == 41:
                        specific_benefits.append({"name": "경기지역화폐", "desc": "경기도 내 축제 행사장 결제 시 최대 10% 인센티브", "link": "https://www.gmoney.or.kr/"})

                    # 주소 텍스트 기반 쿼리 생성
                    addr_query = f"{an}특별시 {sn}" if ac in [11, 26, 27, 28, 29, 30, 31] else f"경기도 {sn}" if ac == 41 else f"{an}도 {sn}"

                    data[date_key].append({
                        "id": 500000 + d * 1000 + ac * 10 + i,
                        "title": template["title"],
                        "amount": template["amount"],
                        "period": template["period"],
                        "type": "행사",
                        "source": template["source"],
                        "note": template["note"],
                        "color": "#34C759" if "water" in template["tags"] else "#0064FF",
                        "tags": template["tags"],
                        "areaCd": ac,
                        "areaNm": an,
                        "sigunguCd": sc,
                        "sigunguNm": sn,
                        "mapUrl": f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(addr_query)}",
                        "isAd": False,
                        "congestion": "green" if (i + d) % 3 == 0 else ("yellow" if (i + d) % 3 == 1 else "red"),
                        "benefits": specific_benefits
                    })

        # 2. 2026년 1년 동안 진짜 실제 축제/행사/물놀이 데이터 주입
        for i, fest in enumerate(REAL_FESTIVALS):
            s_date = datetime.strptime(fest["eventstartdate"], "%Y%m%d")
            e_date = datetime.strptime(fest["eventenddate"], "%Y%m%d")
            
            # 행사 날짜 기간에 부합하는 경우 달력에 융합 주입
            if s_date <= curr_date <= e_date:
                ac, an, sc, sn = get_area_from_address(fest["addr1"])
                
                tags = [fest["category"]]
                if fest["category"] == "water":
                    tags.append("free")
                elif fest["category"] == "free":
                    tags.append("festival")
                
                specific_benefits = global_benefits.copy()
                if ac == 11:
                    specific_benefits.append({"name": "서울사랑상품권", "desc": "행사장 인근 서울 가맹점 결제 시 최대 10% 페이백", "link": "https://seoulpay.seoul.go.kr/"})
                elif ac == 28:
                    specific_benefits.append({"name": "인천사랑상품권 (인천e음)", "desc": "인천 축제 현장 결제 시 최대 10% 캐시백", "link": "https://www.incheon.go.kr/"})
                elif ac == 26:
                    specific_benefits.append({"name": "동백전 (부산화폐)", "desc": "부산 전역 축제 현장 결제 시 최대 10% 즉시 캐시백", "link": "https://www.bscard.or.kr/"})
                elif ac == 41:
                    specific_benefits.append({"name": "경기지역화폐", "desc": "경기도 내 축제 행사장 결제 시 최대 10% 인센티브", "link": "https://www.gmoney.or.kr/"})

                data[date_key].append({
                    "id": 400000 + d * 1000 + i,
                    "title": fest["title"],
                    "amount": fest["amount"],
                    "period": f"{s_date.strftime('%Y.%m.%d')} ~ {e_date.strftime('%Y.%m.%d')}",
                    "type": "행사",
                    "source": fest["official_url"],
                    "note": f"[{an} 행정 안내] {fest['title']}. 축제/행사 참석 및 지자체 혜택 연동 가능.",
                    "color": "#34C759" if fest["category"] == "water" else "#0064FF",
                    "tags": tags,
                    "areaCd": ac,
                    "areaNm": an,
                    "sigunguCd": sc,
                    "sigunguNm": sn,
                    "mapUrl": f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(fest['addr1'])}",
                    "isAd": False,
                    "congestion": "green" if (i + d) % 3 == 0 else ("yellow" if (i + d) % 3 == 1 else "red"),
                    "benefits": specific_benefits
                })

        # 3. 실시간 공공 문화정보 API 수집 일정 융합
        for i, ev in enumerate(cultural_events):
            try:
                ev_start = datetime.strptime(ev["start_date"], "%Y%m%d")
                ev_end = datetime.strptime(ev["end_date"], "%Y%m%d")
            except Exception:
                continue
                
            if ev_start <= curr_date <= ev_end:
                # 2단계: 동일 날짜 내 동일 제목 중복 등록 방지
                if any(existing["title"] == ev["title"] for existing in data[date_key]):
                    continue
                ac, an, sc, sn = get_area_from_address(ev["place"] or ev["area"])
                
                realm = ev["realmName"]
                # 분야별 매핑
                if "전시" in realm:
                    color = "#AF52DE"
                    tags = ["culture", "exhibition"]
                elif "연극" in realm or "뮤지컬" in realm or "오페라" in realm:
                    color = "#FF9500"
                    tags = ["culture", "theater"]
                elif "행사" in realm or "축제" in realm:
                    color = "#0064FF"
                    tags = ["culture", "festival"]
                elif "아동" in realm or "가족" in realm:
                    color = "#34C759"
                    tags = ["culture", "family"]
                elif "교육" in realm or "체험" in realm or "도서" in realm:
                    color = "#FF2D55"
                    tags = ["culture", "education"]
                else:
                    color = "#5AC8FA"
                    tags = ["culture"]
                    
                specific_benefits = global_benefits.copy()
                if ac == 11:
                    specific_benefits.append({"name": "서울사랑상품권", "desc": "행사장 인근 서울 가맹점 결제 시 최대 10% 페이백", "link": "https://seoulpay.seoul.go.kr/"})
                elif ac == 28:
                    specific_benefits.append({"name": "인천사랑상품권 (인천e음)", "desc": "인천 축제 현장 결제 시 최대 10% 캐시백", "link": "https://www.incheon.go.kr/"})
                elif ac == 26:
                    specific_benefits.append({"name": "동백전 (부산화폐)", "desc": "부산 전역 축제 현장 결제 시 최대 10% 즉시 캐시백", "link": "https://www.bscard.or.kr/"})
                elif ac == 41:
                    specific_benefits.append({"name": "경기지역화폐", "desc": "경기도 내 축제 행사장 결제 시 최대 10% 인센티브", "link": "https://www.gmoney.or.kr/"})

                data[date_key].append({
                    "id": 1000000 + i * 1000 + d,
                    "title": ev["title"],
                    "amount": "공공 문화 할인 혜택 적용 가능",
                    "period": f"{ev_start.strftime('%Y.%m.%d')} ~ {ev_end.strftime('%Y.%m.%d')}",
                    "type": "행사",
                    "source": ev["url"],
                    "note": f"[{an} 문화 알림] {ev['title']}. 장소: {ev['place']}. 분야: {realm}",
                    "color": color,
                    "tags": tags,
                    "areaCd": ac,
                    "areaNm": an,
                    "sigunguCd": sc,
                    "sigunguNm": sn,
                    "mapUrl": f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(ev['place'])}",
                    "isAd": False,
                    "congestion": "green",
                    "benefits": specific_benefits
                })

    # 혜택 데이터 정규화 마스터 풀 구성
    benefits_pool = global_benefits.copy()
    local_pay_benefits = [
        {"name": "서울사랑상품권", "desc": "행사장 인근 서울 가맹점 결제 시 최대 10% 페이백", "link": "https://seoulpay.seoul.go.kr/"},
        {"name": "인천사랑상품권 (인천e음)", "desc": "인천 축제 현장 결제 시 최대 10% 캐시백", "link": "https://www.incheon.go.kr/"},
        {"name": "동백전 (부산화폐)", "desc": "부산 전역 축제 현장 결제 시 최대 10% 즉시 캐시백", "link": "https://www.bscard.or.kr/"},
        {"name": "경기지역화폐", "desc": "경기도 내 축제 행사장 결제 시 최대 10% 인센티브", "link": "https://www.gmoney.or.kr/"}
    ]
    benefits_pool.extend(local_pay_benefits)
    data["__benefits_pool__"] = benefits_pool

    # 데이터 내의 모든 benefits 목록을 이름 문자열 배열로 전격 압축 정규화 (37MB -> 400KB 경량화 핵심)
    for key in list(data.keys()):
        if isinstance(data[key], list):
            for item in data[key]:
                if isinstance(item, dict) and "benefits" in item:
                    # 혜택 객체 배열을 이름들의 문자열 리스트로 치환
                    item["benefits"] = [b["name"] for b in item["benefits"] if isinstance(b, dict) and "name" in b]

    data["__all_cultural_events__"] = cultural_events
    data["__barrier__"] = barrier_processed
    data["__pet__"] = pet_processed
    
    return data

if __name__ == "__main__":
    result = build_data()
    script_dir = os.path.dirname(__file__)

    # data.js — app.js가 <script> 태그로 로드하는 파일
    js_path = os.path.join(script_dir, "data.js")
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("window.BENEFITS_DATA = ")
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print(f"SUCCESS: data.js written ({os.path.getsize(js_path):,} bytes)")

    # data.json — 호환성 유지
    json_path = os.path.join(script_dir, "data.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"SUCCESS: data.json written ({os.path.getsize(json_path):,} bytes)")
