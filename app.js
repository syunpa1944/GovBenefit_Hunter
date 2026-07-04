// 로드된 2.x 프레임워크 번들로부터 TossAds 전역 바인딩 확보
if (typeof TossAds === 'undefined' && window.AppsInToss) {
    window.TossAds = window.AppsInToss.TossAds;
}

// 오늘 날짜 동적 연동 (정식 상용 출시 반영)
const FIXED_TODAY = new Date();
const ADS_ENABLED = true; // 광고 모듈 ON/OFF (true로 변경 시 활성화)
const REWARD_KEY = 'rewardPoints';
let currentYear = FIXED_TODAY.getFullYear();
let currentMonth = FIXED_TODAY.getMonth();

const todayStr = `${FIXED_TODAY.getFullYear()}-${String(FIXED_TODAY.getMonth() + 1).padStart(2, '0')}-${String(FIXED_TODAY.getDate()).padStart(2, '0')}`;
let benefitsData = {};
let barrierData = [];  // 무장애 시설 (필터 시 전국 상시 노출)
let petData = [];      // 반려동물 동반 시설 (필터 시 전국 상시 노출)
let activeFilters = [];

let usedBenefits = [];
let userEligibility = [];
if (typeof localStorage !== 'undefined') {
    usedBenefits = JSON.parse(localStorage.getItem('usedBenefits') || '[]');
    userEligibility = JSON.parse(localStorage.getItem('userEligibility') || '[]');
}
let currentOpenedSheetDate = null;
let currentOpenedSheetItems = null;

function toggleBenefitUsed(name) {
    const idx = usedBenefits.indexOf(name);
    if (idx > -1) {
        usedBenefits.splice(idx, 1);
    } else {
        usedBenefits.push(name);
    }
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('usedBenefits', JSON.stringify(usedBenefits));
    }
    updateDashboard();
    // 시트를 닫지 않고 체크박스+스타일만 실시간 업데이트
    document.querySelectorAll('.linked-benefit-row').forEach(row => {
        const cb = row.querySelector('input[type="checkbox"]');
        const nameEl = row.querySelector('.linked-benefit-name');
        if (!cb || !nameEl) return;
        const benefitName = nameEl.textContent.replace('💸', '').trim();
        const isUsed = usedBenefits.includes(benefitName);
        cb.checked = isUsed;
        row.style.opacity = isUsed ? '0.6' : '';
        row.style.background = isUsed ? 'var(--toss-grey-100)' : '';
        nameEl.style.textDecoration = isUsed ? 'line-through' : '';
        nameEl.style.color = isUsed ? '#6B7684' : '';
        const btn = row.querySelector('.linked-benefit-btn');
        if (btn) {
            btn.disabled = isUsed;
            btn.style.background = isUsed ? '#E5E8EB' : '#0064FF';
            btn.style.color = isUsed ? '#8B95A1' : 'white';
            btn.style.cursor = isUsed ? 'not-allowed' : 'pointer';
        }
    });
}


// 지도 주소 텍스트 기반 시도/시군구 동적 매핑 전처리기
function preprocessDataByAddress() {
    const sidoNameKeys = {};
    Object.keys(AREA_MAP).forEach(code => {
        const name = AREA_MAP[code].name;
        sidoNameKeys[name] = code;
    });

    const processItem = (item) => {
        if (item.areaCd && item.areaCd !== 0) return;
        if (!item.mapUrl) return;
        try {
            const urlObj = new URL(item.mapUrl);
            const query = urlObj.searchParams.get('query');
            if (!query) return;

            const decodedAddr = decodeURIComponent(query).trim();
            const parts = decodedAddr.split(/\s+/);
            if (parts.length === 0) return;

            const firstPart = parts[0]; 
            const secondPart = parts.length > 1 ? parts[1] : ""; 

            let foundSidoCode = null;
            let foundSidoName = "";

            for (const name of Object.keys(sidoNameKeys)) {
                if (firstPart.includes(name) || name.includes(firstPart)) {
                    foundSidoCode = sidoNameKeys[name];
                    foundSidoName = name;
                    break;
                }
            }

            if (foundSidoCode) {
                item.areaCd = parseInt(foundSidoCode);
                item.areaNm = foundSidoName;

                if (secondPart) {
                    const sigungus = AREA_MAP[foundSidoCode].sigungu;
                    let foundSigunguCode = null;
                    let foundSigunguName = "";

                    for (const sCode of Object.keys(sigungus)) {
                        const sName = sigungus[sCode];
                        if (secondPart.includes(sName) || sName.includes(secondPart)) {
                            foundSigunguCode = sCode;
                            foundSigunguName = sName;
                            break;
                        }
                    }

                    if (foundSigunguCode) {
                        item.sigunguCd = parseInt(foundSigunguCode);
                        item.sigunguNm = foundSigunguName;
                    }
                }
            }
        } catch (e) {
            console.warn("주소 파싱 오류:", e, item.title);
        }
    };

    Object.values(benefitsData).forEach(dayItems => {
        dayItems.forEach(processItem);
    });

    barrierData.forEach(processItem);
    petData.forEach(processItem);
}

// data.json에서 데이터를 한 번만 로드하여 트래픽 0으로 내부 메모리 캐싱 및 무제한 재사용
async function loadBenefitsData() {
    // 1단계: 빈 뼈대와 달력 그리드를 즉시 렌더링하여 모바일 웹뷰 ANR 타임아웃을 차단합니다.
    render();
    updateDashboard();

    // 2단계: 대용량 공공데이터(data.js)를 백그라운드 비동기로 로드합니다.
    const script = document.createElement('script');
    script.src = 'data.js';
    script.async = true;

    script.onload = () => {
        console.log("공공데이터 실데이터 패키지 비동기 적재 성공.");
        if (window.BENEFITS_DATA && Object.keys(window.BENEFITS_DATA).length > 0) {
            const raw = window.BENEFITS_DATA;
            // 무장애 및 반려동물 메타데이터 분리 탑재
            barrierData = raw["__barrier__"] || [];
            petData = raw["__pet__"] || [];
            // 순수 날짜 데이터만 할당
            benefitsData = Object.fromEntries(
                Object.entries(raw).filter(([k]) => !k.startsWith('__'))
            );
        }
        preprocessDataByAddress(); // 주소 기반 행정구역 분류 정합성 보정 기동!
        render();
        updateDashboard();
    };

    script.onerror = (err) => {
        console.warn("data.js 비동기 로딩 실패. 백업 데이터를 대체 탑재합니다.", err);
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
    };

    // 3단계: 준비된 스크립트 엘리먼트를 실제 DOM에 삽입하여 비동기 다운로드 및 적재를 기동합니다.
    document.head.appendChild(script);
}

function updateDashboard() {
    let totalMaxAmount = 0;
    let usedAmount = 0;
    const addedBenefits = new Set(); // 상세 혜택(b.name) 기준 중복 차단 집합
    const addedTitles = new Set();   // 단독 행사 타이틀 기준 중복 차단 집합
    
    // 활성화된 필터 조건에 부합하는 모든 혜택들의 금액 시뮬레이션 계산
    Object.values(benefitsData).forEach(dayItems => {
        dayItems.forEach(item => {
            // 다중 필터 선택 시 OR(또는) 조건 및 교차 결합 지원
            const isTypeMatch = activeFilters.length === 0 || activeFilters.some(f => (item.tags || []).includes(f));
            let isAreaMatch = true;
            if (selectedSido !== "0") {
                // 주소 파싱으로 areaCd가 올바르게 재매핑되어 100% 보장됨
                isAreaMatch = String(item.areaCd) === selectedSido;
            }
            if (selectedSigungu !== "0") {
                isAreaMatch = String(item.sigunguCd) === selectedSigungu;
            }

            if (isTypeMatch && isAreaMatch && !item.isAd) {
                // 1단계: benefits 배열이 있으면 각 상세 혜택별로 유니크하게 파싱하여 합산
                if (item.benefits && item.benefits.length > 0) {
                    item.benefits.forEach(b => {
                        if (b.eligible && !userEligibility.includes(b.eligible)) return;
                        const targetText = (b.name + " " + b.desc).replace(/,/g, '');
                        let parsedVal = 0;

                        // "20만원", "13만원" 등의 만원 패턴 매칭
                        const manwonMatch = targetText.match(/(\d+)\s*만/);
                        if (manwonMatch) {
                            parsedVal = parseInt(manwonMatch[1]) * 10000;
                        } else {
                            // "30000원", "30,000원" 등의 일반 원화 패턴 매칭
                            const wonMatch = targetText.match(/(\d+)\s*원/);
                            if (wonMatch) {
                                const val = parseInt(wonMatch[1]);
                                if (val >= 1000) parsedVal = val;
                            }
                        }

                        if (parsedVal > 0) {
                            if (usedBenefits.includes(b.name)) {
                                if (!addedBenefits.has(b.name)) {
                                    usedAmount += parsedVal;
                                    addedBenefits.add(b.name);
                                }
                            } else {
                                if (!addedBenefits.has(b.name)) {
                                    totalMaxAmount += parsedVal;
                                    addedBenefits.add(b.name);
                                }
                            }
                        }
                    });
                } else if (item.amount) {
                    // 2단계: benefits가 없는 단독 혜택인 경우, 행사 타이틀 기준으로 중복을 체크해 합산
                    const cleanAmountStr = item.amount.replace(/%/g, 'percent').replace(/,/g, '');
                    let parsedVal = 0;

                    const manwonMatch = cleanAmountStr.match(/(\d+)\s*만/);
                    if (manwonMatch) {
                        parsedVal = parseInt(manwonMatch[1]) * 10000;
                    } else {
                        const wonMatch = cleanAmountStr.match(/(\d+)\s*원/);
                        if (wonMatch) {
                            const val = parseInt(wonMatch[1]);
                            if (val >= 1000) parsedVal = val;
                        } else {
                            // 단순 숫자 추출 백업
                            const numbers = cleanAmountStr.match(/\d+/g);
                            if (numbers) {
                                const val = Math.max(...numbers.map(Number));
                                if (val >= 1000) parsedVal = val;
                            }
                        }
                    }

                    if (parsedVal > 0) {
                        if (usedBenefits.includes(item.title)) {
                            if (!addedTitles.has(item.title)) {
                                usedAmount += parsedVal;
                                addedTitles.add(item.title);
                            }
                        } else {
                            if (!addedTitles.has(item.title)) {
                                totalMaxAmount += parsedVal;
                                addedTitles.add(item.title);
                            }
                        }
                    }
                }
            }
        });
    });

    const displayEl = document.getElementById('totalBenefitDisplay');
    if (displayEl) {
        if (totalMaxAmount > 0 || usedAmount > 0) {
            let label = `최대 ${totalMaxAmount.toLocaleString()}원 남음`;
            if (usedAmount > 0) {
                label += ` (사용 완료 ${usedAmount.toLocaleString()}원)`;
            }
            displayEl.innerText = `${label} 💸`;
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
    if (currentOpenedSheetDate) {
        openSheet(currentOpenedSheetDate, currentOpenedSheetItems);
    }
}

function onSigunguChange() {
    const sigunguSelect = document.getElementById('sigunguSelect');
    if (sigunguSelect) {
        selectedSigungu = sigunguSelect.value;
    }
    render();
    updateDashboard();
    if (currentOpenedSheetDate) {
        openSheet(currentOpenedSheetDate, currentOpenedSheetItems);
    }
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
            : dayData.filter(item => activeFilters.some(f => (item.tags || []).includes(f)));

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
            // 혼잡도 정보를 바탕으로 하단 미니바 및 셀 배경색상 융합
            const mainItem = filtered[0];
            if (mainItem.congestion) {
                const bar = document.createElement('div');
                bar.className = 'congestion-bar';
                let barColor = 'var(--congestion-green)';
                let cellBg = 'rgba(52, 199, 89, 0.07)'; // 여유: 파스텔 연초록
                
                if (mainItem.congestion === 'yellow') {
                    barColor = 'var(--congestion-yellow)';
                    cellBg = 'rgba(255, 149, 0, 0.07)'; // 보통: 파스텔 연노랑
                } else if (mainItem.congestion === 'red') {
                    barColor = 'var(--congestion-red)';
                    cellBg = 'rgba(255, 59, 48, 0.07)'; // 혼잡: 파스텔 연분홍
                }
                
                bar.style.backgroundColor = barColor;
                cell.appendChild(bar);
                
                // 오늘 날짜가 아닐 때만 혼잡도 파스텔 배경 색상을 주입하여 가독성을 높입니다.
                if (dateStr !== todayStr) {
                    cell.style.backgroundColor = cellBg;
                    cell.style.borderColor = barColor;
                }
            }

            // 달력 셀: 아이콘(이모지)만 표시해 직관적 색상 컬러 부여
            const iconWrap = document.createElement('div');
            iconWrap.style.cssText = 'margin-top:3px; display:flex; flex-wrap:wrap; gap:1px; justify-content:center; padding:0 1px;';

            // 해당 날짜 아이템들의 태그를 모아 유니크 이모지 세트 생성
            const emojiMap = {
                "festival": "🎉", "water": "🌊", "free": "🎫",
                "benefit": "💸", "payback": "💵", "eco": "🌿",
                "barrier": "♿", "pet": "🐶", "camp": "🏕️", "stroller": "🧒"
            };
            const uniqueEmojis = new Set();
            filtered.forEach(item => {
                (item.tags || []).forEach(t => {
                    if (emojiMap[t]) uniqueEmojis.add(emojiMap[t]);
                });
            });

            const emojiArr = Array.from(uniqueEmojis).slice(0, 4);
            emojiArr.forEach(em => {
                const span = document.createElement('span');
                span.style.cssText = 'font-size:9px; line-height:1;';
                span.textContent = em;
                iconWrap.appendChild(span);
            });

            // 아이템 수 표시 (작은 숫자 뱃지)
            if (filtered.length > 0) {
                const badge = document.createElement('div');
                badge.style.cssText = 'font-size:7px; color:#0064FF; font-weight:700; width:100%; text-align:center; margin-top:1px;';
                badge.textContent = `${filtered.length}건`;
                iconWrap.appendChild(badge);
            }
            cell.appendChild(iconWrap);

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
    if (currentOpenedSheetDate) {
        openSheet(currentOpenedSheetDate, currentOpenedSheetItems);
    }
}

function clickAll() {
    activeFilters = [];
    document.querySelectorAll('.category').forEach(el => el.classList.remove('active'));
    document.getElementById('filter-all').classList.add('all-active');
    render();
    updateDashboard();
    if (currentOpenedSheetDate) {
        openSheet(currentOpenedSheetDate, currentOpenedSheetItems);
    }
}

const ELIGIBILITY_OPTIONS = [
    { key: 'company_vacation', label: '기업휴가지원 등록', emoji: '🏢' },
    { key: 'low_income', label: '저소득층', emoji: '🪪' },
    { key: 'multi_child', label: '다자녀', emoji: '👨‍👩‍👧‍👦' },
    { key: 'disabled', label: '장애인', emoji: '♿' }
];

function toggleEligibility(type) {
    const idx = userEligibility.indexOf(type);
    if (idx > -1) {
        userEligibility.splice(idx, 1);
    } else {
        userEligibility.push(type);
    }
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('userEligibility', JSON.stringify(userEligibility));
    }
    render();
    updateDashboard();
    updateEligibilityChips();
    if (currentOpenedSheetDate) {
        openSheet(currentOpenedSheetDate, currentOpenedSheetItems);
    }
}

function updateEligibilityChips() {
    ELIGIBILITY_OPTIONS.forEach(function(opt) {
        const el = document.getElementById('eligibility-' + opt.key);
        if (el) {
            if (userEligibility.includes(opt.key)) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    });
}

function getRewardPoints() {
    return parseInt(localStorage.getItem(REWARD_KEY), 10) || 0;
}

function addRewardPoints(amount) {
    const total = getRewardPoints() + amount;
    localStorage.setItem(REWARD_KEY, total.toString());
    updateRewardDisplay();
}

function updateRewardDisplay() {
    const el = document.getElementById('rewardDisplay');
    if (el) el.textContent = '❤️ ' + getRewardPoints();
}

function changeMonth(step) {
    currentMonth += step;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    render();
}

function openSheet(dateStr, items) {
    currentOpenedSheetDate = dateStr;
    currentOpenedSheetItems = items;
    const [y, m, d] = dateStr.split('-');
    const list = document.getElementById('cardList');

    const dayData = benefitsData[dateStr] || [];
    
    // 1차 카테고리 필터링
    let displayItems = activeFilters.length === 0 
        ? dayData 
        : dayData.filter(item => activeFilters.some(f => (item.tags || []).includes(f)));

    // 2차 지역 필터링
    if (selectedSido !== "0") {
        displayItems = displayItems.filter(item => {
            if (item.areaCd === 0) return true;
            return String(item.areaCd) === selectedSido;
        });
    }
    if (selectedSigungu !== "0") {
        displayItems = displayItems.filter(item => {
            if (item.areaCd === 0) return true;
            return String(item.sigunguCd) === selectedSigungu;
        });
    }

    // 중복 제거 (제목 기준)
    const seenTitles = new Set();
    displayItems = displayItems.filter(item => {
        if (seenTitles.has(item.title)) return false;
        seenTitles.add(item.title);
        return true;
    });

    document.getElementById('sheetTitle').innerText = `${parseInt(m)}월 ${parseInt(d)}일 행사 및 일정 (${displayItems.length}건)`;

    // 영어 태그를 한글로 치환하는 맵 정의
    const tagTranslation = {
        "benefit": "정부지원금", "payback": "지자체환급", "free": "무료입장",
        "festival": "축제/공연/행사", "eco": "생태관광", "barrier": "무장애여행",
        "pet": "반려동물동반", "camp": "야영장", "stroller": "유모차반입",
        "wheelchair": "휠체어이용", "water": "물놀이/수영장"
    };
    
    const cardListArray = displayItems.map((item, idx) => {
        const isLocal = item.areaCd !== 0;
        const isWater = /물놀이|수영장|분수|풀장/.test(item.title);
        const borderClass = isLocal ? (isWater ? 'water-card' : 'local-gov-card') : 'tour-card';

        // 대표 태그 이모지 (한 개)
        const tags = item.tags || [];
        const typeEmoji = tags.includes('water') ? '🌊'
            : tags.includes('festival') ? '🎉'
            : tags.includes('barrier') ? '♿'
            : tags.includes('pet') ? '🐶'
            : tags.includes('camp') ? '🏕️'
            : tags.includes('free') ? '🎫'
            : tags.includes('benefit') ? '💸'
            : '🎁';

        // 지역 라벨
        const regionLabel = (item.areaNm || '전국') + (item.sigunguNm ? ' ' + item.sigunguNm : '');

        // === 상세 영역 HTML (숨김 상태로 시작) ===
        const mainLink = item.source || item.benefitLink || '';
        let mapEmbedHtml = '';
        if (item.mapUrl) {
            try {
                const query = new URL(item.mapUrl).searchParams.get('query');
                if (query) {
                    const embedUrl = 'https://maps.google.com/maps?q=' + encodeURIComponent(decodeURIComponent(query)) + '&output=embed&hl=ko';
                    mapEmbedHtml = '<div style="margin:10px 0 4px;border-radius:10px;overflow:hidden;"><iframe width="100%" height="180" frameborder="0" style="border:0;display:block;" src="' + embedUrl + '" allowfullscreen loading="lazy"></iframe></div>';
                }
            } catch (e) {}
        }

        let benefitsRowsHtml = '';
        if (item.benefits && item.benefits.length > 0 && isLocal) {
            benefitsRowsHtml = `
                <div class="benefits-section">
                    <div class="benefits-section-title">🎟️ 이 행사에서 쓸 수 있는 혜택</div>
                    ${item.benefits.map(function(b) {
                        const isUsed = usedBenefits.includes(b.name);
                        const canUse = !b.eligible || userEligibility.includes(b.eligible);
                        const rowStyle = isUsed ? 'opacity:0.6;background:var(--toss-grey-100);' : (!canUse ? 'opacity:0.45;' : '');
                        const nameStyle = isUsed ? 'text-decoration:line-through;color:var(--toss-grey-600);' : (!canUse ? 'color:var(--toss-grey-500);' : '');
                        const lockBadge = !canUse && !isUsed ? '<span style="font-size:9px;color:var(--toss-grey-500);margin-left:4px;">🔒 자격선택 필요</span>' : '';
                        return '<div class="linked-benefit-row"' + (rowStyle ? ' style="' + rowStyle + '"' : '') + '>' +
                            '<input type="checkbox" class="benefit-checkbox" data-benefit-name="' + b.name.replace(/"/g,'&quot;') + '"' + (isUsed ? ' checked' : '') +
                            ' style="width:16px;height:16px;cursor:pointer;accent-color:var(--toss-blue);flex-shrink:0;margin-right:8px;"' + (!canUse && !isUsed ? ' disabled' : '') + ' />' +
                            '<div class="linked-benefit-info" style="flex:1;">' +
                            '<div class="linked-benefit-name"' + (nameStyle ? ' style="' + nameStyle + '"' : '') + '>💸 ' + b.name + lockBadge + '</div>' +
                            '<div class="linked-benefit-desc">' + b.desc + '</div>' +
                            '</div>' +
                            '<button class="linked-benefit-btn open-url-btn" data-url="' + b.link.replace(/"/g,'&quot;') + '"' + ((isUsed || !canUse) ? ' disabled style="background:var(--toss-grey-300);color:var(--toss-grey-500);cursor:not-allowed;"' : '') + '>신청</button>' +
                            '</div>';
                    }).join('')}
                </div>
            `;
        }

        // 행사 신청 버튼 딱 1개만 정의 (중복 다중 버튼 제거)
        let applyBtnsHtml = '';
        if (mainLink) {
            applyBtnsHtml = `<button class="card-btn open-url-btn" data-url="${mainLink.replace(/"/g,'&quot;')}" style="width:80%;max-width:360px;">행사 신청</button>`;
        }

        const detailHtml = `
            <div id="detail-${idx}" class="card-detail" style="display:none;margin-top:10px;">
                ${item.period && item.period !== '상시 운영' ? `<div class="card-period">📅 ${item.period}</div>` : ''}
                ${mapEmbedHtml}
                ${benefitsRowsHtml}
                ${applyBtnsHtml ? `<div style="display:flex;justify-content:center;width:100%;margin-top:10px;">${applyBtnsHtml}</div>` : ''}
            </div>
        `;

        // === 간략 카드 (기본 표시) ===
        return `
            <div class="benefit-card ${borderClass}">
                <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;">
                    <div style="font-size:22px;flex-shrink:0;line-height:1.2;">${typeEmoji}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:10px;color:var(--toss-grey-600);margin-bottom:3px;">#${regionLabel}
                            ${tags.map(t => `<span style="margin-left:4px;">#${tagTranslation[t]||t}</span>`).join('')}
                        </div>
                        <div class="card-title" style="padding-right:0;word-break:break-word;">${item.title}</div>
                        <div class="card-amount" style="font-size:12px;margin-bottom:0;">${item.amount || ''}</div>
                    </div>
                    <button class="detail-toggle-btn" data-idx="${idx}"
                        style="flex-shrink:0;height:30px;padding:0 10px;background:var(--toss-grey-100);border:1px solid var(--toss-grey-600);border-radius:8px;font-size:11px;font-weight:700;color:var(--toss-grey-800);cursor:pointer;white-space:nowrap;">
                        상세보기
                    </button>
                </div>
                ${detailHtml}
            </div>
        `;
    });

    // 카드 목록 랜덤 위치에 Toss Ads 피드형 배너 삽입
    const adContainerId = 'tossAdBanner-' + Date.now();
    const adPlaceholder = `<div id="${adContainerId}" style="width:100%;min-height:100px;margin-bottom:12px;"></div>`;
    const insertIdx = cardListArray.length > 0 ? Math.floor(Math.random() * (cardListArray.length + 1)) : 0;
    cardListArray.splice(insertIdx, 0, adPlaceholder);

    list.innerHTML = cardListArray.join('');

    if (ADS_ENABLED) attachTossBanner(adContainerId);

    document.getElementById('bottomSheet').classList.add('open');
    document.getElementById('overlay').classList.add('visible');
}

function toggleDetail(idx) {
    const detail = document.getElementById(`detail-${idx}`);
    const btn = document.querySelector(`.detail-toggle-btn[data-idx="${idx}"]`);
    if (!detail || !btn) return;
    const isOpen = detail.style.display !== 'none';
    detail.style.display = isOpen ? 'none' : 'block';
    btn.textContent = isOpen ? '상세보기' : '닫기';
}

// 이벤트 위임: 월 변경 버튼 처리
document.getElementById('calendarContainer').addEventListener('click', function(e) {
    const btn = e.target.closest('[data-month]');
    if (!btn) return;
    changeMonth(parseInt(btn.dataset.month));
});

// 이벤트 위임: filterContainer 내 필터 버튼 처리
document.getElementById('filterContainer').addEventListener('click', function(e) {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    const filterType = btn.dataset.filter;
    if (filterType === 'all') {
        clickAll();
    } else {
        toggleFilter(filterType);
    }
});

// 이벤트 위임: eligibilityContainer 내 자격 칩 처리
document.getElementById('eligibilityContainer').addEventListener('click', function(e) {
    const btn = e.target.closest('[data-eligibility]');
    if (!btn) return;
    toggleEligibility(btn.dataset.eligibility);
});

// 이벤트 위임: cardList 내 모든 버튼 처리 (WebView에서 인라인 onclick 미지원 대응)
document.getElementById('cardList').addEventListener('click', function(e) {
    const target = e.target;
    if (target.closest('.benefit-checkbox')) {
        e.stopPropagation();
        return;
    }
    const toggleBtn = target.closest('.detail-toggle-btn');
    if (toggleBtn) { toggleDetail(parseInt(toggleBtn.dataset.idx)); return; }
    const urlBtn = target.closest('.open-url-btn');
    if (urlBtn && !urlBtn.disabled) { openExternal(urlBtn.dataset.url); return; }
});
document.getElementById('cardList').addEventListener('change', function(e) {
    const cb = e.target.closest('.benefit-checkbox');
    if (cb) { toggleBenefitUsed(cb.dataset.benefitName); }
});

document.getElementById('sheetCloseBtn').addEventListener('click', closeSheet);
document.getElementById('overlay').addEventListener('click', closeSheet);
document.getElementById('sidoSelect').addEventListener('change', onSidoChange);
document.getElementById('sigunguSelect').addEventListener('change', onSigunguChange);

function closeSheet() {
    if (activeTossAdBanner) {
        activeTossAdBanner.destroy();
        activeTossAdBanner = null;
    }
    document.getElementById('bottomSheet').classList.remove('open');
    document.getElementById('overlay').classList.remove('visible');
    currentOpenedSheetDate = null;
    currentOpenedSheetItems = null;
}

function openExternal(url) {
    if (url.includes('google.com/maps')) {
        openMapUrl(url);
        return;
    }
    openExternalDirect(url);
}

function openExternalDirect(url) {
    if (window.Toss && window.Toss.openExternal) {
        Toss.openExternal({ url: url });
    } else {
        window.open(url, '_blank');
    }
}

function openMapUrl(googleUrl) {
    let query;
    try { query = new URL(googleUrl).searchParams.get('query'); } catch (e) {}
    if (!query) { openExternalDirect(googleUrl); return; }
    const place = encodeURIComponent(decodeURIComponent(query));

    let opened = false;
    const onVis = () => { if (document.hidden) { opened = true; document.removeEventListener('visibilitychange', onVis); } };
    document.addEventListener('visibilitychange', onVis);

    // 1. Kakao Map
    openExternalDirect(`kakaomap://search?q=${place}`);
    setTimeout(() => {
        if (opened) { document.removeEventListener('visibilitychange', onVis); return; }
        // 2. Naver Map
        openExternalDirect(`nmap://search?query=${place}`);
        setTimeout(() => {
            document.removeEventListener('visibilitychange', onVis);
            if (opened) return;
            // 3. Google Maps web fallback
            openExternalDirect(googleUrl);
        }, 1000);
    }, 1000);
}

// TossAds 배너 인스턴스를 관리하기 위한 변수
let activeTossAdBanner = null;

function attachTossBanner(containerId) {
    if (activeTossAdBanner) {
        activeTossAdBanner.destroy();
        activeTossAdBanner = null;
    }
    const container = document.getElementById(containerId || 'tossAdBanner');
    if (!container) return;
    
    // 실시간 모바일 광고 SDK 연결 상태 진단 디버그 텍스트 생성
    let debugInfo = `TossAds 객체: ${typeof TossAds}`;
    if (typeof TossAds !== 'undefined') {
        debugInfo += `, attachBanner: ${typeof TossAds.attachBanner}`;
        if (TossAds.attachBanner) {
            try { debugInfo += `, 지원여부(isSupported): ${TossAds.attachBanner.isSupported()}`; } catch(e) { debugInfo += `, 에러: ${e.message}`; }
        }
    }
    const dbgEl = document.createElement('div');
    dbgEl.style.cssText = 'font-size:9px;color:#8B95A1;text-align:center;padding:4px 0 2px;width:100%;';
    dbgEl.innerText = `[광고 상태 디버그] ${debugInfo}`;
    container.appendChild(dbgEl);

    // 전역 객체 수색 및 시각적 표출 (non-enumerable 다이렉트 투시)
    let directCheck = `window.Toss: ${typeof window.Toss}`;
    if (typeof window.Toss !== 'undefined') {
        const tKeys = Object.keys(window.Toss) || [];
        directCheck += ` (keys: [${tKeys.join(', ')}])`;
        directCheck += `, openExternal: ${typeof window.Toss.openExternal}`;
        directCheck += `, attachBanner: ${typeof window.Toss.attachBanner}`;
        directCheck += `, loadRewardedAd: ${typeof window.Toss.loadRewardedAd}`;
        directCheck += `, showRewardedAd: ${typeof window.Toss.showRewardedAd}`;
    }
    directCheck += ` | window.TossAds: ${typeof window.TossAds}`;
    if (typeof window.TossAds !== 'undefined') {
        directCheck += `, attachBanner: ${typeof window.TossAds.attachBanner}`;
    }
    const dbgEl2 = document.createElement('div');
    dbgEl2.style.cssText = 'font-size:9px;color:#0064FF;text-align:center;padding:2px 0 6px;width:100%;word-break:break-all;';
    dbgEl2.innerText = `🔍 [브릿지 분석] ${directCheck}`;
    container.appendChild(dbgEl2);

    if (typeof TossAds === 'undefined' || !TossAds.attachBanner || !TossAds.attachBanner.isSupported()) {
        dbgEl.innerText += " ➡️ 토스 광고 SDK 미지원 상태";
        return;
    }
    try {
        activeTossAdBanner = TossAds.attachBanner(
            'ait.v2.live.c5633be2471a4b9c',
            container,
            {
                theme: 'auto',
                tone: 'blackAndWhite',
                variant: 'expanded',
                callbacks: {
                    onAdRendered: (p) => {
                        console.log('TossAd rendered:', p.slotId);
                        dbgEl.innerText = `🟢 광고 로딩 성공`;
                    },
                    onAdFailedToRender: (p) => {
                        console.warn('TossAd failed:', p.error?.message);
                        dbgEl.innerText = `🔴 광고 렌더링 실패: ${p.error?.message || '이유 미기재'}`;
                    },
                    onNoFill: (p) => {
                        console.warn('TossAd no fill');
                        dbgEl.innerText = `🟡 광고 없음(No Fill): 물량 부족 또는 계약 미승인`;
                    }
                }
            }
        );
    } catch (e) {
        console.warn('TossAds attachBanner error:', e);
    }
}

// 리워드 광고(Rewarded) 상태 관리
let rewardedAdLoaded = false;
const REWARDED_AD_ID = 'ait.v2.live.be0a965d07e0432b'; // 실제 상용 출시용 리워드 광고 ID

function preloadRewardedAd() {
    if (typeof loadFullScreenAd === 'undefined' || !loadFullScreenAd.isSupported()) {
        return;
    }
    loadFullScreenAd({
        options: { adGroupId: REWARDED_AD_ID },
        onEvent: (event) => {
            if (event.type === 'loaded') {
                rewardedAdLoaded = true;
                if (typeof TossPixel !== 'undefined') {
                    try { TossPixel('7874162214141259463').adImpression(); } catch (e) {}
                }
            }
        },
        onError: () => {}
    });
}

function tryShowRewardedAd() {
    if (!rewardedAdLoaded || typeof showFullScreenAd === 'undefined' || !showFullScreenAd.isSupported()) {
        return false;
    }
    showFullScreenAd({
        options: { adGroupId: REWARDED_AD_ID },
        onEvent: (event) => {
            switch (event.type) {
                case 'userEarnedReward':
                case 'reward':
                    localStorage.setItem('rewardedOnExit', 'done');
                    addRewardPoints(1);
                    // 리워드 획득 성공 후 즉시 웹뷰 종료 처리
                    setTimeout(() => {
                        window.close();
                    }, 500);
                    break;
                case 'dismissed':
                case 'failedToShow':
                    rewardedAdLoaded = false;
                    preloadRewardedAd();
                    // 광고 화면이 닫혔으므로 웹뷰 종료 처리
                    window.close();
                    break;
            }
        },
        onError: () => {
            rewardedAdLoaded = false;
            window.close();
        }
    });
    localStorage.setItem('rewardedOnExit', 'pending');
    return true;
}

// 강제종료 리워드 재개 처리
function checkPendingReward() {
    const status = localStorage.getItem('rewardedOnExit');
    if (status === 'pending') {
        if (confirm('이전에 광고 시청이 완료되지 않았습니다. 지면 광고를 시청하시겠습니까?')) {
            localStorage.removeItem('rewardedOnExit');
            preloadRewardedAd();
            tryShowRewardedAd();
        } else {
            localStorage.removeItem('rewardedOnExit');
        }
    } else if (status === 'done') {
        localStorage.removeItem('rewardedOnExit');
    }
}

window.onload = () => {
    if (ADS_ENABLED) {
        if (typeof TossPixel !== 'undefined') {
            try { TossPixel('7874162214141259463').pageView(); } catch (e) { console.warn('TossPixel.pageView error:', e); }
        }

        checkPendingReward();

        if (typeof TossAds !== 'undefined' && TossAds.initialize && TossAds.initialize.isSupported()) {
            TossAds.initialize({
                callbacks: {
                    onInitialized: () => {
                        preloadRewardedAd();
                    },
                    onInitializationFailed: () => {}
                }
            });
        } else {
            preloadRewardedAd();
        }

        // 토스 뒤로가기 버튼 클릭 가로채기 ➡️ 리워드 광고 유도 후 앱 종료
        if (typeof graniteEvent !== 'undefined') {
            try {
                graniteEvent.addEventListener('backEvent', {
                    onEvent: () => {
                        console.log('Toss Back Key Pressed. Triggering exit reward ad...');
                        const adStarted = tryShowRewardedAd();
                        // 광고가 아직 로드되지 않았거나 송출할 수 없는 경우 즉시 앱 닫기
                        if (!adStarted) {
                            window.close();
                        }
                    }
                });
            } catch (e) {
                console.warn('graniteEvent addEventListener error:', e);
            }
        }
    }

    initAreaFilters();
    loadBenefitsData();
    updateEligibilityChips();
    updateRewardDisplay();
};

window.onbeforeunload = () => {
    if (ADS_ENABLED) {
        tryShowRewardedAd();

        if (activeTossAdBanner) {
            activeTossAdBanner.destroy();
            activeTossAdBanner = null;
        }
        if (typeof TossAds !== 'undefined' && TossAds.destroyAll && TossAds.destroyAll.isSupported()) {
            TossAds.destroyAll();
        }
    }
};
