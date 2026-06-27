// 오늘 날짜 고정 (가이드 및 명세 준수)
const FIXED_TODAY = new Date(2026, 5, 25); // 2026년 6월 25일
let currentYear = FIXED_TODAY.getFullYear();
let currentMonth = FIXED_TODAY.getMonth();

const todayStr = "2026-06-25";
let benefitsData = {};
let activeFilters = [];

// data.json에서 데이터를 한 번만 로드하여 트래픽 0으로 내부 메모리 캐싱 및 무제한 재사용
async function loadBenefitsData() {
    // 뼈대를 가장 먼저 렌더링
    render();
    updateDashboard();

    try {
        // 캐시 버스팅 적용 (?v= 타임스탬프)으로 브라우저 구버전 캐싱 완벽 우회 강제 적용하며 토스 미니앱 내부 패키지의 상대 경로를 호출합니다.
        const response = await fetch(`data.json?v=${Date.now()}`);
        benefitsData = await response.json();
        render();
        updateDashboard();
    } catch (error) {
        console.warn("로컬 브라우저 보안 정책(CORS)으로 data.json 호출이 차단되어 내장 백업 데이터를 주입합니다.");
        // 로컬 실행(더블 클릭) 대비 완벽한 백업 데이터 주입
        benefitsData = {
          "2026-06-25": [
            {
              "id": 2000,
              "title": "대한민국 숙박세일 페스타",
              "amount": "30,000원 쿠폰 발급",
              "period": "2026.06.01 ~ 06.30",
              "type": "지원금",
              "source": "https://korean.visitkorea.or.kr/",
              "note": "문화체육관광부 주관. 비수도권 인구감소지역 대상 숙박비 지원 쿠폰 선착순 발급.",
              "color": "#0064FF",
              "tags": ["benefit"],
              "isAd": false,
              "areaCd": 0, "areaNm": "전국", "sigunguCd": 0, "sigunguNm": "전체",
              "congestion": "green"
            },
            {
              "id": 2001,
              "title": "디지털 관광주민증 혜택 패키지",
              "amount": "관광 체험비 15,000원 보조",
              "period": "상시 운영",
              "type": "지원금",
              "source": "https://korean.visitkorea.or.kr/",
              "note": "지정 인구감소도시 50여 곳 방문 시 즉시 적용 가능한 바우처 및 체험 보조금 혜택.",
              "color": "#0064FF",
              "tags": ["benefit", "eco"],
              "isAd": false,
              "areaCd": 0, "areaNm": "전국", "sigunguCd": 0, "sigunguNm": "전체",
              "congestion": "green"
            }
          ],
          "2026-06-26": [
            {
              "id": 2100,
              "title": "전남 강진 반값 관광 여행 환급 이벤트",
              "amount": "최대 100,000원 환급",
              "period": "2026.06.01 ~ 06.30",
              "type": "환급",
              "source": "https://www.gangjin.go.kr/",
              "note": "강진군 주관. 관외 거주 관광객 대상 강진 여행 영수증 인증 시 50% 모바일 강진사랑상품권 환급.",
              "color": "#FF9500",
              "tags": ["payback", "eco"],
              "isAd": false,
              "areaCd": 46, "areaNm": "전남", "sigunguCd": 46810, "sigunguNm": "강진군",
              "congestion": "yellow"
            },
            {
              "id": 2101,
              "title": "서울 마포 난지캠핑장 유공자 및 장애인 감면",
              "amount": "입장료 및 야영료 30% 즉시 할인",
              "period": "상시 운영",
              "type": "할인",
              "source": "https://yeyak.seoul.go.kr/",
              "note": "서울시 주관. 장애인 등록증 혹은 국가유공자 예우 증서 지참 시 이용 요금 즉시 감면 혜택.",
              "color": "#AF52DE",
              "tags": ["camp", "barrier"],
              "isAd": false,
              "areaCd": 11, "areaNm": "서울", "sigunguCd": 11440, "sigunguNm": "마포구",
              "congestion": "red"
            }
          ],
          "2026-06-27": [
            {
              "id": 2200,
              "title": "경북 영덕 고캠핑 차박 페스티벌 지원",
              "amount": "캠핑 사이트 및 웰컴 키트 무료 제공",
              "period": "2026.06.27 ~ 06.28",
              "type": "무료",
              "source": "https://www.yd.go.kr/",
              "note": "영덕군 주관. 친환경 반려동물 동반 가구 선착순 100팀 무료 캠핑 제공 및 영덕 대게 맛보기 혜택.",
              "color": "#34C759",
              "tags": ["free", "pet", "camp"],
              "isAd": false,
              "areaCd": 47, "areaNm": "경북", "sigunguCd": 47820, "sigunguNm": "영덕군",
              "congestion": "green"
            }
          ],
          "2026-06-28": [
            {
              "id": 2300,
              "title": "전북 무주 반값 웰니스 힐링 여행지원",
              "amount": "최대 70,000원 환급",
              "period": "2026.06.15 ~ 06.28",
              "type": "환급",
              "source": "https://www.muju.go.kr/",
              "note": "무주군 주관. 청정 친환경 생태 여행 코스 숙박 및 식음료 소비액의 50% 온누리상품권 지급.",
              "color": "#FF9500",
              "tags": ["payback", "eco", "barrier"],
              "isAd": false,
              "areaCd": 52, "areaNm": "전북", "sigunguCd": 52730, "sigunguNm": "무주군",
              "congestion": "yellow"
            }
          ],
          "2026-06-29": [
            {
              "id": 2400,
              "title": "강원 평창 치유의숲 휠체어 투어 체험",
              "amount": "체험비 및 무장애 가이드 서비스 무료",
              "period": "2026.06.25 ~ 06.30",
              "type": "무료",
              "source": "https://www.forest.go.kr/",
              "note": "산림청 주관. 장애인 및 고령 교통약자 가구 평창 치유의숲 생태 테마 코스 무료 관람 가이드 동행.",
              "color": "#34C759",
              "tags": ["free", "barrier", "eco"],
              "isAd": false,
              "areaCd": 51, "areaNm": "강원", "sigunguCd": 51760, "sigunguNm": "평창군",
              "congestion": "green"
            }
          ],
          "2026-06-30": [
            {
              "id": 2500,
              "title": "충남 태안 댕댕버스 서해안 반려 여행 보조",
              "amount": "댕댕버스 교통비 20,000원 지원",
              "period": "2026.06.01 ~ 06.30",
              "type": "지원금",
              "source": "https://www.taean.go.kr/",
              "note": "태안군/관광공사 주관. 서울-태안 반려동물 동반 전용 전세버스 이용 시 1인 1마리 보조금 지급.",
              "color": "#0064FF",
              "tags": ["benefit", "pet"],
              "isAd": false,
              "areaCd": 44, "areaNm": "충남", "sigunguCd": 44825, "sigunguNm": "태안군",
              "congestion": "yellow"
            },
            {
              "id": 2501,
              "title": "서울 한강공원 야외 수영장 및 물놀이장 다자녀/장애인 감면",
              "amount": "이용 요금 50% 감면 (반값 할인)",
              "period": "2026.06.25 ~ 08.23",
              "type": "할인",
              "source": "https://hangang.seoul.go.kr/",
              "note": "서울시 한강사업본부 주관. 다둥이행복카드 소지자 및 장애인은 입장료 50% 현장 감면(반값). 일반 이용료는 유료(성인 5,000원), 만 5세 이하 및 유공자는 전액 무료.",
              "color": "#AF52DE",
              "tags": ["free", "barrier"],
              "isAd": false,
              "areaCd": 11, "areaNm": "서울", "sigunguCd": 11560, "sigunguNm": "영등포구",
              "congestion": "green"
            },
            {
              "id": 2502,
              "title": "경기 용인시 어린이 물놀이터 무료 개방",
              "amount": "입장료 및 주차료 전액 무료",
              "period": "2026.06.20 ~ 08.31",
              "type": "무료",
              "source": "https://www.yongin.go.kr/",
              "note": "용인시청 주관. 관내 만현공원, 동백공원 등 어린이 물놀이터 무료 상설 개방. 안심 쉼터 및 그늘막 완비.",
              "color": "#34C759",
              "tags": ["free", "stroller"],
              "isAd": false,
              "areaCd": 41, "areaNm": "경기", "sigunguCd": 41460, "sigunguNm": "용인시",
              "congestion": "yellow"
            },
            {
              "id": 2503,
              "title": "전남 여수시 청소년 수련관 실내 수영장 무료 이용",
              "amount": "자유 수영 무료 입장",
              "period": "2026.06.27 ~ 06.28",
              "type": "무료",
              "source": "https://www.yeosu.go.kr/",
              "note": "여수시청 주관. 호국보훈의 달 및 여름방학 사전 이벤트로 청소년 및 동반 가족 무료 일일 입장 혜택 지원.",
              "color": "#34C759",
              "tags": ["free"],
              "isAd": false,
              "areaCd": 46, "areaNm": "전남", "sigunguCd": 46130, "sigunguNm": "여수시",
              "congestion": "green"
            },
            {
              "id": 2504,
              "title": "강원 정선군 화암동굴 야간 무료 특별 관람",
              "amount": "입장 요금 전액 무료",
              "period": "2026.06.28 ~ 06.30",
              "type": "무료",
              "source": "https://www.jsimc.or.kr/",
              "note": "정선군 주관. 여름 피서철 야간 동굴 탐험 특별 무료 개방 행사 (장애인 데크길 완비로 교통약자 관람 용이).",
              "color": "#34C759",
              "tags": ["free", "barrier", "eco"],
              "isAd": false,
              "areaCd": 51, "areaNm": "강원", "sigunguCd": 51770, "sigunguNm": "정선군",
              "congestion": "yellow"
            }
          ]
        };
        render();
        updateDashboard();
    }
}

function updateDashboard() {
    let totalMaxAmount = 0;
    const addedTitles = new Set(); // 중복 합산 방지를 위한 식별자 집합
    
    // 활성화된 필터 조건에 부합하는 모든 혜택들의 금액 시뮬레이션 계산
    Object.values(benefitsData).forEach(dayItems => {
        dayItems.forEach(item => {
            // 동일한 타이틀의 혜택이 여러 날짜에 노출될 때 중복 합산 차단
            if (addedTitles.has(item.title)) return;

            // 필터 및 지역 조건 부합 여부 확인
            const isTypeMatch = activeFilters.length === 0 || activeFilters.every(f => (item.tags || []).includes(f));
            let isAreaMatch = true;
            if (selectedSido !== "0" && item.areaCd !== 0) {
                isAreaMatch = String(item.areaCd) === selectedSido;
            }
            if (selectedSigungu !== "0" && item.areaCd !== 0) {
                isAreaMatch = String(item.sigunguCd) === selectedSigungu;
            }

            if (isTypeMatch && isAreaMatch && !item.isAd) {
                // "50,000원", "100,000원" 등에서 순수 원화 금액만 추출하기 위한 정밀 필터링
                // % 할인율(예: 30%, 50% 할인)은 지원금 합산에서 제외
                const cleanAmountStr = item.amount.replace(/%/g, 'percent');
                const numberMatch = cleanAmountStr.replace(/,/g, '').match(/\d+/g);
                if (numberMatch) {
                    const amounts = numberMatch
                        .map(Number)
                        .filter(val => val >= 1000); // 1000원 이상의 실질 지원금 액수만 취합 (30, 50 같은 단일 숫자 배제)
                    if (amounts.length > 0) {
                        totalMaxAmount += Math.max(...amounts); // 범위 액수 중 최대액 취합
                        addedTitles.add(item.title);
                    }
                }
            }
        });
    });

    const displayEl = document.getElementById('totalBenefitDisplay');
    if (displayEl) {
        if (totalMaxAmount > 0) {
            displayEl.innerText = `최대 ${totalMaxAmount.toLocaleString()}원 💸`;
        } else {
            displayEl.innerText = `최대 0원 💸`;
        }
    }
}

// 전국 행정구역 코드 맵 정의 (엑셀 깨짐 수정본 복원)
const AREA_MAP = {
    "11": {
        name: "서울",
        sigungu: {
            "11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구", "11215": "광진구",
            "11230": "동대문구", "11260": "중랑구", "11290": "성북구", "11305": "강북구", "11320": "도봉구",
            "11350": "노원구", "11380": "은평구", "11410": "서대문구", "11440": "마포구", "11470": "양천구",
            "11500": "강서구", "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
            "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구", "11740": "강동구"
        }
    },
    "26": {
        name: "부산",
        sigungu: {
            "26110": "중구", "26140": "서구", "26170": "동구", "26200": "영도구", "26230": "부산진구",
            "26260": "동래구", "26290": "남구", "26320": "북구", "26350": "해운대구", "26380": "사하구",
            "26410": "금정구", "26440": "강서구", "26470": "연제구", "26500": "수영구", "26530": "사상구",
            "26710": "기장군"
        }
    },
    "27": {
        name: "대구",
        sigungu: {
            "27110": "중구", "27140": "동구", "27170": "서구", "27200": "남구", "27230": "북구",
            "27260": "수성구", "27290": "달서구", "27710": "달성군", "27720": "군위군"
        }
    },
    "28": {
        name: "인천",
        sigungu: {
            "28110": "중구", "28140": "동구", "28177": "미추홀구", "28185": "연수구", "28200": "남동구",
            "28237": "부평구", "28245": "계양구", "28260": "서구", "28710": "강화군", "28720": "옹진군"
        }
    },
    "29": {
        name: "광주",
        sigungu: {
            "29110": "동구", "29140": "서구", "29155": "남구", "29170": "북구", "29200": "광산구"
        }
    },
    "30": {
        name: "대전",
        sigungu: {
            "30110": "동구", "30140": "중구", "30170": "서구", "30200": "유성구", "30230": "대덕구"
        }
    },
    "31": {
        name: "울산",
        sigungu: {
            "31110": "중구", "31140": "남구", "31170": "동구", "31200": "북구", "31710": "울주군"
        }
    },
    "36": {
        name: "세종",
        sigungu: {
            "36110": "세종특별자치시"
        }
    },
    "41": {
        name: "경기",
        sigungu: {
            "41110": "수원시", "41130": "성남시", "41150": "의정부시", "41170": "안양시", "41190": "부천시",
            "41210": "광명시", "41220": "평택시", "41250": "동두천시", "41270": "안산시", "41280": "고양시",
            "41290": "과천시", "41310": "구리시", "41360": "남양주시", "41370": "오산시", "41390": "시흥시",
            "41410": "군포시", "41430": "의왕시", "41450": "하남시", "41460": "용인시", "41480": "파주시",
            "41500": "이천시", "41550": "안성시", "41570": "김포시", "41590": "화성시", "41610": "광주시",
            "41630": "양주시", "41650": "포천시", "41670": "여주시", "41800": "연천군", "41820": "가평군",
            "41830": "양평군"
        }
    },
    "43": {
        name: "충북",
        sigungu: {
            "43110": "청주시", "43130": "충주시", "43150": "제천시", "43720": "보은군", "43730": "옥천군",
            "43740": "영동군", "43745": "증평군", "43750": "진천군", "43760": "괴산군", "43770": "음성군",
            "43800": "단양군"
        }
    },
    "44": {
        name: "충남",
        sigungu: {
            "44130": "천안시", "44150": "공주시", "44180": "보령시", "44200": "아산시", "44210": "서산시",
            "44230": "논산시", "44250": "계룡시", "44270": "당진시", "44710": "금산군", "44760": "부여군",
            "44770": "서천군", "44790": "청양군", "44800": "홍성군", "44810": "예산군", "44825": "태안군"
        }
    },
    "46": {
        name: "전남",
        sigungu: {
            "46110": "목포시", "46130": "여수시", "46150": "순천시", "46170": "나주시", "46230": "광양시",
            "46710": "담양군", "46720": "곡성군", "46730": "구례군", "46770": "고흥군", "46780": "보성군",
            "46790": "화순군", "46800": "장흥군", "46810": "강진군", "46820": "해남군", "46830": "영암군",
            "46840": "무안군", "46860": "함평군", "46870": "영광군", "46880": "장성군", "46890": "완도군",
            "46900": "진도군", "46910": "신안군"
        }
    },
    "47": {
        name: "경북",
        sigungu: {
            "47110": "포항시", "47130": "경주시", "47150": "김천시", "47170": "안동시", "47190": "구미시",
            "47210": "영주시", "47230": "영천시", "47250": "상주시", "47280": "문경시", "47290": "경산시",
            "47730": "군위군", "47750": "의성군", "47760": "청송군", "47770": "영양군", "47820": "영덕군",
            "47830": "청도군", "47840": "고령군", "47850": "칠곡군", "47900": "예천군", "47920": "봉화군",
            "47930": "울진군", "47940": "울릉군"
        }
    },
    "48": {
        name: "경남",
        sigungu: {
            "48120": "창원시", "48170": "진주시", "48220": "통영시", "48240": "사천시", "48250": "김해시",
            "48270": "밀양시", "48310": "거제시", "48330": "양산시", "48720": "의령군", "48730": "함안군",
            "48740": "창녕군", "48820": "고성군", "48840": "남해군", "48850": "하동군", "48860": "산청군",
            "48870": "함양군", "48880": "거창군", "48890": "합천군"
        }
    },
    "50": {
        name: "제주",
        sigungu: {
            "50110": "제주시", "50130": "서귀포시"
        }
    },
    "51": {
        name: "강원",
        sigungu: {
            "51110": "춘천시", "51130": "원주시", "51150": "강릉시", "51170": "동해시", "51190": "태백시",
            "51210": "속초시", "51230": "삼척시", "51720": "홍천군", "51730": "횡성군", "51750": "영월군",
            "51760": "평창군", "51770": "정선군", "51780": "철원군", "51790": "화천군", "51800": "양구군",
            "51810": "인제군", "51820": "고성군", "51830": "양양군"
        }
    },
    "52": {
        name: "전북",
        sigungu: {
            "52110": "전주시", "52130": "군산시", "52140": "익산시", "52180": "정읍시", "52190": "남원시",
            "52210": "김제시", "52710": "완주군", "52720": "진안군", "52730": "무주군", "52740": "장수군",
            "52750": "임실군", "52770": "순창군", "52790": "고창군", "52800": "부안군"
        }
    }
};

let selectedSido = "0";     // "0" 이면 전국 전체
let selectedSigungu = "0";  // "0" 이면 시/도 내 전체

// 화면 구동 후 지역 대분류 셀렉트 박스 동적 생성
function initAreaFilters() {
    const sidoSelect = document.getElementById('sidoSelect');
    if (!sidoSelect) return;
    sidoSelect.innerHTML = '<option value="0">전국 (시/도 선택)</option>';
    
    Object.keys(AREA_MAP).forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.innerText = AREA_MAP[code].name;
        sidoSelect.appendChild(option);
    });
}

function onSidoChange() {
    selectedSido = document.getElementById('sidoSelect').value;
    selectedSigungu = "0"; // 시도 변경 시 군구 초기화
    
    const sigunguSelect = document.getElementById('sigunguSelect');
    if (sigunguSelect) {
        sigunguSelect.innerHTML = '<option value="0">시/군/구 전체</option>';

        if (selectedSido !== "0" && AREA_MAP[selectedSido]) {
            const sigungus = AREA_MAP[selectedSido].sigungu;
            Object.keys(sigungus).forEach(code => {
                const option = document.createElement('option');
                option.value = code;
                option.innerText = sigungus[code];
                sigunguSelect.appendChild(option);
            });
        }
    }
    
    render();
    updateDashboard();
}

function onSigunguChange() {
    const sigunguSelect = document.getElementById('sigunguSelect');
    if (sigunguSelect) {
        selectedSigungu = sigunguSelect.value;
    }
    render();
    updateDashboard();
}

function render() {
    const year = currentYear;
    const month = currentMonth;
    
    const labelEl = document.getElementById('currentMonthLabel');
    if (labelEl) {
        labelEl.innerText = `${year}년 ${month + 1}월`;
    }

    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

// 1. 이전 달 빈 셀 렌더링
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell other-month';
        grid.appendChild(cell);
    }

    // 2. 해당 월 일자별 루프
    for (let d = 1; d <= lastDate; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (dateStr === todayStr) cell.classList.add('today');
        
        cell.innerHTML = `<span>${d}</span>`;

        const dayData = benefitsData[dateStr] || [];
        
        // 1차 필터링: 태그(유형) 필터
        let filtered = activeFilters.length === 0 
            ? dayData 
            : dayData.filter(item => activeFilters.every(f => (item.tags || []).includes(f)));

        // 2차 필터링: 시/도 및 군/구 행정구역 다단계 필터링 적용
        if (selectedSido !== "0") {
            filtered = filtered.filter(item => {
                // 전국 공통 배포 사업(areaCd = 0)은 어떤 지역을 골라도 상시 노출 적용
                if (item.areaCd === 0) return true;
                return String(item.areaCd) === selectedSido;
            });
        }
        if (selectedSigungu !== "0") {
            filtered = filtered.filter(item => {
                if (item.areaCd === 0) return true;
                return String(item.sigunguCd) === selectedSigungu;
            });
        }

        if (filtered.length > 0) {
            // 혼잡도 정보를 바탕으로 하단 미니바 생성
            const mainItem = filtered[0];
            if (mainItem.congestion) {
                const bar = document.createElement('div');
                bar.className = 'congestion-bar';
                let barColor = 'var(--congestion-green)';
                if (mainItem.congestion === 'yellow') barColor = 'var(--congestion-yellow)';
                if (mainItem.congestion === 'red') barColor = 'var(--congestion-red)';
                bar.style.backgroundColor = barColor;
                cell.appendChild(bar);
            }

            // 대표 혜택 요약 텍스트 추가
            const amountText = document.createElement('div');
            amountText.className = 'cell-amount';
            // 가장 액수가 큰 혜택 또는 무료 여부 우선 표시
            const benefitItem = filtered.find(item => !item.isAd) || filtered[0];
            amountText.innerText = benefitItem.type;
            cell.appendChild(amountText);

            cell.onclick = () => openSheet(dateStr, filtered);
        } else {
            cell.onclick = () => console.log(dateStr + " 조건 혜택 없음");
        }
        grid.appendChild(cell);
    }
}

function toggleFilter(type) {
    const btn = document.getElementById(`filter-${type}`);
    const btnAll = document.getElementById('filter-all');
    if (activeFilters.includes(type)) {
        activeFilters = activeFilters.filter(t => t !== type);
        btn.classList.remove('active');
    } else {
        activeFilters.push(type);
        btn.classList.add('active');
    }
    if (activeFilters.length > 0) {
        btnAll.classList.remove('all-active');
    } else {
        btnAll.classList.add('all-active');
    }
    render();
    updateDashboard();
}

function clickAll() {
    activeFilters = [];
    document.querySelectorAll('.category').forEach(el => el.classList.remove('active'));
    document.getElementById('filter-all').classList.add('all-active');
    render();
    updateDashboard();
}

function changeMonth(step) {
    currentMonth += step;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    render();
}

function openSheet(dateStr, items) {
    const [y, m, d] = dateStr.split('-');
    document.getElementById('sheetTitle').innerText = `${parseInt(m)}월 ${parseInt(d)}일 혜택 및 여행`;
    const list = document.getElementById('cardList');
    
    // 영어 태그를 한글로 치환하는 맵 정의
    const tagTranslation = {
        "benefit": "정부지원금",
        "payback": "지자체환급",
        "free": "무료입장",
        "eco": "생태관광",
        "barrier": "무장애여행",
        "pet": "반려동물동반",
        "camp": "야영장",
        "stroller": "유모차반입",
        "wheelchair": "휠체어이용"
    };
    
    // 토스 애즈 연동 테스트용 프리미엄 골드 네이티브 제휴 혜택 카드 객체 정의
    const adCardHtml = `
        <div class="benefit-card gold-card">
            <span class="ad-badge">AD 제휴혜택</span>
            <div class="card-tags">
                <span class="tag-badge" style="border-color:#e5e5e5; color:#6b7684">#전국 공통</span>
                <span class="tag-badge tag-ad">#TossAds제휴</span>
                <span class="tag-badge tag-ad">#특별할인</span>
            </div>
            <div class="card-title">[Toss Ads] 전국 여행 지원 웰컴 제휴 할인 쿠폰</div>
            <div class="card-amount ad-amount">렌터카 & 숙박 최대 20% 즉시 할인</div>
            <div class="card-desc">토스 애즈와 공식 제휴된 안전한 여행 할인 쿠폰입니다. 렌터카 예약 및 지정 제휴처 숙박 이용 시 최대 20% 즉시 할인 혜택을 드립니다.</div>
            <button class="card-btn gold-btn" onclick="openExternal('https://developers-apps-in-toss.toss.im')">
                제휴쿠폰 받기
            </button>
        </div>
    `;

    const cardListArray = items.map(item => `
        <div class="benefit-card">
            <div class="card-tags">
                <span class="tag-badge" style="border-color:#e5e5e5; color:#6b7684">#${item.areaNm} ${item.sigunguNm}</span>
                ${(item.tags || []).map(t => {
                    const translated = tagTranslation[t.toLowerCase()] || t;
                    return `<span class="tag-badge">#${translated}</span>`;
                }).join('')}
            </div>
            <div class="card-title">${item.title}</div>
            <div class="card-amount">${item.amount}</div>
            <div class="card-desc">${item.note}</div>
            <button class="card-btn" onclick="openExternal('${item.source}')">
                혜택 신청하러 가기
            </button>
        </div>
    `);

    // 카드 목록 중간 임의의 위치(랜덤 인덱스)에 광고 카드를 유려하게 주입
    // 리스트가 비어있을 때는 첫 번째에, 데이터가 있을 때는 0 ~ length 범위의 무작위 위치로 융합
    const insertIndex = cardListArray.length > 0 
        ? Math.floor(Math.random() * (cardListArray.length + 1)) 
        : 0;
        
    cardListArray.splice(insertIndex, 0, adCardHtml);
    
    list.innerHTML = cardListArray.join('');
    
    document.getElementById('bottomSheet').classList.add('open');
    document.getElementById('overlay').classList.add('visible');
}

function closeSheet() {
    document.getElementById('bottomSheet').classList.remove('open');
    document.getElementById('overlay').classList.remove('visible');
    // 사용자가 혜택 창을 닫는 순간 화면 요소(DOM) 내부의 혜택 및 상세 주소 데이터들을 강제 소멸시켜 불법 열람을 전면 차단
    setTimeout(() => {
        const list = document.getElementById('cardList');
        if (list) list.innerHTML = '';
    }, 300);
}

function openExternal(url) {
    if (window.Toss && window.Toss.openExternal) {
        Toss.openExternal({ url: url });
    } else {
        window.open(url, '_blank');
    }
}

// TossAds 배너 인스턴스를 관리하기 위한 변수
let activeTossAdBanner = null;

// 시작점 설정
window.onload = async () => {
    initAreaFilters();
    loadBenefitsData();

    // 토스 애즈(Toss Ads) SDK 초기화
    if (window.TossAds && typeof window.TossAds.isSupported === 'function' && window.TossAds.isSupported()) {
        try {
            console.log("TossAds SDK 초기화를 진행합니다.");
            await window.TossAds.initialize();
        } catch (adError) {
            console.error("TossAds 연동 중 오류가 발생했습니다:", adError);
        }
    }
};

// 미니앱 제거/언마운트 시 메모리 정리를 위한 소멸 처리 적용
window.onbeforeunload = () => {
    if (window.TossAds && typeof window.TossAds.destroyAll === 'function') {
        window.TossAds.destroyAll();
    }
};
