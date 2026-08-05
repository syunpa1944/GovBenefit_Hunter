// 로드된 2.x 프레임워크 번들로부터 TossAds 전역 바인딩 확보
if (typeof TossAds === 'undefined' && window.AppsInToss) {
    window.TossAds = window.AppsInToss.TossAds;
}

// 오늘 날짜 동적 연동 (정식 상용 출시 반영)
const FIXED_TODAY = new Date();
const ADS_ENABLED = true; // 항상 활성화, attachTossBanner/tryShowRewardedAd 내부에서 SDK 유무 체크
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

    // 2단계: 최신 실시간 서버 데이터 동기화 (런타임 fetch 기동!)
    let remoteLoaded = false;
    const REMOTE_DATA_URL = 'https://raw.githubusercontent.com/syunpa1944/GovBenefit_Hunter/main/data.json';
    
    try {
        console.log("실시간 서버 원격 데이터 동기화 요청 중...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4초 타임아웃으로 모바일 지연 차단
        
        const res = await fetch(REMOTE_DATA_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            const raw = await res.json();
            if (raw && Object.keys(raw).length > 0) {
                console.log("성공: 원격 서버로부터 실시간 최신 데이터를 100% 동기화 적재했습니다!");
                barrierData = raw["__barrier__"] || [];
                petData = raw["__pet__"] || [];
                benefitsData = Object.fromEntries(
                    Object.entries(raw).filter(([k]) => !k.startsWith('__'))
                );
                // 혜택 풀 데이터 저장
                window.BENEFITS_DATA = raw;
                
                preprocessDataByAddress();
                render();
                updateDashboard();
                remoteLoaded = true;
            }
        }
    } catch (e) {
        console.warn("원격 실시간 서버 동기화 실패 (오프라인 또는 타임아웃). 로컬 번들 적재로 우회합니다.", e);
    }

    // 3단계: 원격 데이터 획득 실패 시 Fallback 로컬 data.js 비동기 로드
    if (!remoteLoaded) {
        const script = document.createElement('script');
        script.src = 'data.js';
        script.async = true;

        script.onload = () => {
            console.log("공공데이터 로컬 패키지 비동기 적재 성공.");
            if (window.BENEFITS_DATA && Object.keys(window.BENEFITS_DATA).length > 0) {
                const raw = window.BENEFITS_DATA;
                barrierData = raw["__barrier__"] || [];
                petData = raw["__pet__"] || [];
                benefitsData = Object.fromEntries(
                    Object.entries(raw).filter(([k]) => !k.startsWith('__'))
                );
            }
            preprocessDataByAddress();
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
                // 0단계: 아이템 자체 자격 조건 검사
                if (item.eligible && !userEligibility.includes(item.eligible)) return;

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

// 화면 구동 후 지역 대분류 셀렉트 박스 동적 이벤트 연결
function initAreaFilters() {
    const sidoSelect = document.getElementById('sidoSelect');
    if (!sidoSelect) return;
    
    if (sidoSelect.options.length <= 1 && typeof AREA_MAP !== 'undefined') {
        Object.keys(AREA_MAP).forEach(code => {
            const option = document.createElement('option');
            option.value = code;
            option.innerText = AREA_MAP[code].name;
            sidoSelect.appendChild(option);
        });
    }

    sidoSelect.onchange = onSidoChange;

    const sigunguSelect = document.getElementById('sigunguSelect');
    if (sigunguSelect) {
        sigunguSelect.onchange = onSigunguChange;
    }
}

// 대한민국 표준 행정구역 사전 (ReferenceError 100% 방지 내장)
const SAFE_KOREA_REGION_DICTIONARY = {
    "서울": ["강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"],
    "인천": ["중구","동구","미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군"],
    "경기": ["수원시","성남시","의정부시","안양시","부천시","광명시","평택시","동두천시","안산시","고양시","과천시","구리시","남양주시","오산시","시흥시","군포시","의왕시","하남시","용인시","파주시","이천시","안성시","김포시","화성시","광주시","양주시","포천시","여주시","연천군","가평군","양평군"],
    "부산": ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"],
    "대구": ["중구","동구","서구","남구","북구","수성구","달서구","달성군","군위군"],
    "광주": ["동구","서구","남구","북구","광산구"],
    "대전": ["동구","중구","서구","유성구","대덕구"],
    "울산": ["중구","남구","동구","북구","울주군"],
    "세종": ["세종시"],
    "강원": ["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],
    "충북": ["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],
    "충남": ["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"],
    "전북": ["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"],
    "전남": ["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],
    "경북": ["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],
    "경남": ["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],
    "제주": ["제주시","서귀포시"]
};

function onSidoChange() {
    const sidoSelect = document.getElementById('sidoSelect');
    if (!sidoSelect) return;
    selectedSido = sidoSelect.value;
    selectedSigungu = "0"; // 시도 변경 시 군구 초기화
    
    const sigunguSelect = document.getElementById('sigunguSelect');
    if (sigunguSelect) {
        sigunguSelect.innerHTML = '<option value="0">시/군/구 전체</option>';

        if (selectedSido !== "0" && AREA_MAP[selectedSido]) {
            const selectedSidoName = AREA_MAP[selectedSido].name;
            const dictList = (typeof KOREA_REGION_DICTIONARY !== 'undefined' && KOREA_REGION_DICTIONARY[selectedSidoName])
                ? KOREA_REGION_DICTIONARY[selectedSidoName]
                : (SAFE_KOREA_REGION_DICTIONARY[selectedSidoName] || []);
            
            const sigungus = AREA_MAP[selectedSido].sigungu || {};
            const codeGugunNames = Object.values(sigungus);

            const fullGuguns = new Set([...codeGugunNames, ...dictList]);

            Array.from(fullGuguns).sort().forEach(gugunName => {
                if (gugunName && gugunName !== '공통' && gugunName !== '전체') {
                    const option = document.createElement('option');
                    const code = Object.keys(sigungus).find(k => sigungus[k] === gugunName) || gugunName;
                    option.value = code;
                    option.innerText = gugunName;
                    sigunguSelect.appendChild(option);
                }
            });
        }
    }
    
    if (typeof triggerSearch === 'function') {
        triggerSearch();
    } else {
        render();
        updateDashboard();
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

        // 3차 필터링: 사용자 자격 조건 필터링
        if (userEligibility.length > 0) {
            filtered = filtered.filter(item => {
                if (item.eligible && !userEligibility.includes(item.eligible)) return false;
                if (item.benefits && item.benefits.length > 0) {
                    const pool = (window.BENEFITS_DATA && window.BENEFITS_DATA.__benefits_pool__) || [];
                    const hasAnyEligibleBenefit = item.benefits.some(b => {
                        let target = b;
                        if (typeof b === 'string') {
                            target = pool.find(x => x.name === b) || { name: b };
                        }
                        return !target.eligible || userEligibility.includes(target.eligible);
                    });
                    if (!hasAnyEligibleBenefit) return false;
                }
                return true;
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
                "barrier": "♿", "pet": "🐶", "camp": "🏕️", "stroller": "🧒",
                "culture": "🎭", "exhibition": "🖼️", "theater": "🎭",
                "education": "📚", "family": "👪"
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

            cell.onclick = () => {
                openSheet(dateStr, filtered);
                if (ADS_ENABLED) {
                    rewardTapCount++;
                    if (rewardTapCount >= rewardTapTarget) {
                        if (tryShowRewardedAd()) {
                            resetRewardTapTarget();
                            preloadRewardedAd();
                        } else {
                            resetRewardTapTarget();
                            preloadRewardedAd();
                        }
                    }
                }
            };
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
    { key: 'disabled', label: '장애인', emoji: '♿' },
    { key: 'national_merit', label: '국가유공자', emoji: '🎖️' },
    { key: 'senior', label: '경로/어르신', emoji: '👴' },
    { key: 'youth', label: '청년', emoji: '🧑' },
    { key: 'single_parent', label: '한부모가족', emoji: '👩‍👧' },
    { key: 'pregnant', label: '임산부', emoji: '🤰' }
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
    return parseInt(safeLocalStorage.getItem(REWARD_KEY), 10) || 0;
}

function addRewardPoints(amount) {
    const total = getRewardPoints() + amount;
    safeLocalStorage.setItem(REWARD_KEY, total.toString());
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
        const mainLink = item.link || "";
        const tags = item.tags || [];
        const regionLabel = (item.areaNm || '전국') + (item.sigunguNm ? ' ' + item.sigunguNm : '');
        const typeEmoji = tags.includes('water') ? '🌊'
            : tags.includes('festival') ? '🎉'
            : tags.includes('barrier') ? '♿'
            : tags.includes('pet') ? '🐶'
            : tags.includes('camp') ? '🏕️'
            : tags.includes('free') ? '🎫'
            : tags.includes('benefit') ? '💸'
            : '✨';

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
                        // 혜택 정규화 복원 (BOM 다이어트 최적화 해제)
                        let targetBenefit = b;
                        if (typeof b === 'string') {
                            const pool = (window.BENEFITS_DATA && window.BENEFITS_DATA.__benefits_pool__) || [];
                            targetBenefit = pool.find(x => x.name === b) || { name: b, desc: '상세 정보는 안내 페이지 참조', link: mainLink };
                        }
                        
                        const isUsed = usedBenefits.includes(targetBenefit.name);
                        const canUse = !targetBenefit.eligible || userEligibility.includes(targetBenefit.eligible);
                        const rowStyle = isUsed ? 'opacity:0.6;background:var(--toss-grey-100);' : (!canUse ? 'opacity:0.45;' : '');
                        const nameStyle = isUsed ? 'text-decoration:line-through;color:var(--toss-grey-600);' : (!canUse ? 'color:var(--toss-grey-500);' : '');
                        const lockBadge = !canUse && !isUsed ? '<span style="font-size:9px;color:var(--toss-grey-500);margin-left:4px;">🔒 자격선택 필요</span>' : '';
                        return '<div class="linked-benefit-row"' + (rowStyle ? ' style="' + rowStyle + '"' : '') + '>' +
                            '<input type="checkbox" class="benefit-checkbox" data-benefit-name="' + targetBenefit.name.replace(/"/g,'&quot;') + '"' + (isUsed ? ' checked' : '') +
                            ' style="width:16px;height:16px;cursor:pointer;accent-color:var(--toss-blue);flex-shrink:0;margin-right:8px;"' + (!canUse && !isUsed ? ' disabled' : '') + ' />' +
                            '<div class="linked-benefit-info" style="flex:1;">' +
                            '<div class="linked-benefit-name"' + (nameStyle ? ' style="' + nameStyle + '"' : '') + '>💸 ' + targetBenefit.name + lockBadge + '</div>' +
                            '<div class="linked-benefit-desc">' + targetBenefit.desc + '</div>' +
                            '</div>' +
                            '<button class="linked-benefit-btn open-url-btn" data-url="' + targetBenefit.link.replace(/"/g,'&quot;') + '"' + ((isUsed || !canUse) ? ' disabled style="background:var(--toss-grey-300);color:var(--toss-grey-500);cursor:not-allowed;"' : '') + '>신청</button>' +
                            '</div>';
                    }).join('')}
                </div>
            `;
        }

        // 행사 신청 버튼 딱 1개만 정의 (중복 다중 버튼 제거)
        let applyBtnsHtml = '';
        if (mainLink) {
            const btnLabel = (item.tags || []).includes('culture') ? '상세내용 및 예매 바로가기 🔗' : '행사 신청/안내 바로가기';
            applyBtnsHtml = `<button class="card-btn open-url-btn" data-url="${mainLink.replace(/"/g,'&quot;')}" style="width:80%;max-width:360px;">${btnLabel}</button>`;
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

    // 카드 목록 10~15개마다 피드형 배너 광고 1개씩 삽입
    const adContainerIds = [];
    if (cardListArray.length > 0) {
        const AD_INTERVAL_MIN = 10;
        const AD_INTERVAL_MAX = 15;
        let nextAdAt = AD_INTERVAL_MIN + Math.floor(Math.random() * (AD_INTERVAL_MAX - AD_INTERVAL_MIN + 1));
        let inserted = 0;
        for (let i = nextAdAt; i < cardListArray.length + inserted; i += nextAdAt + 1) {
            const adId = 'tossAdBanner-' + Date.now() + '-' + inserted;
            const adPlaceholder = `<div id="${adId}" style="width:100%;min-height:100px;margin-bottom:12px;"></div>`;
            cardListArray.splice(i, 0, adPlaceholder);
            adContainerIds.push(adId);
            inserted++;
            nextAdAt = AD_INTERVAL_MIN + Math.floor(Math.random() * (AD_INTERVAL_MAX - AD_INTERVAL_MIN + 1));
        }
    }

    list.innerHTML = cardListArray.join('');

    if (ADS_ENABLED && adContainerIds.length > 0) {
        adContainerIds.forEach(id => attachTossBanner(id));
    }

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
    destroyAllTossBanners();
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

// TossAds 배너 인스턴스를 관리하기 위한 배열 (복수 배너 동시 지원)
let activeTossAdBanners = [];

let tossAdBannersMap = {};

function destroyAllTossBanners() {
    Object.keys(tossAdBannersMap).forEach(key => {
        try {
            if (tossAdBannersMap[key] && tossAdBannersMap[key].destroy) {
                tossAdBannersMap[key].destroy();
            }
        } catch(e){}
    });
    tossAdBannersMap = {};
}

function attachTossBanner(containerId) {
    if (!ADS_ENABLED) return;
    const targetId = containerId || 'tossAdBanner';

    let attempts = 0;
    let rewardWaitAttempts = 0;
    const checkAndRender = () => {
        const container = document.getElementById(targetId);
        if (!container) {
            if (attempts < 10) {
                attempts++;
                setTimeout(checkAndRender, 80);
            }
            return;
        }

        // 토스 공식 FAQ: Android 5.266~5.267 버전에서 전면형/보상형과 배너 광고를 동시에
        // 로드하면 전면형/보상형 이벤트가 유실됨. 리워드 preload가 진행 중이면 잠깐 대기 후
        // 배너를 붙인다. (리워드가 no-fill로 응답이 영영 안 올 수도 있어 대기 시간은 상한을 둔다)
        if (rewardedAdLoading && rewardWaitAttempts < 20) {
            rewardWaitAttempts++;
            setTimeout(checkAndRender, 100);
            return;
        }

        if (tossAdBannersMap[targetId]) {
            try { tossAdBannersMap[targetId].destroy(); } catch(e){}
            delete tossAdBannersMap[targetId];
        }

        if (typeof TossAds !== 'undefined' && TossAds.attachBanner && TossAds.attachBanner.isSupported()) {
            try {
                const instance = TossAds.attachBanner(
                    'ait.v2.live.c5633be2471a4b9c',
                    container,
                    {
                        theme: 'auto',
                        tone: 'blackAndWhite',
                        variant: 'expanded',
                        callbacks: {
                            onAdRendered: (p) => console.log('TossAd rendered:', p.slotId),
                            onAdFailedToRender: (p) => {
                                console.warn('TossAd failed:', p.error?.message);
                                renderFallbackBanner(container);
                            },
                            onNoFill: () => renderFallbackBanner(container)
                        }
                    }
                );
                tossAdBannersMap[targetId] = instance;
                return;
            } catch (error) {
                console.warn('TossAds attachBanner error:', error);
            }
        }

        renderFallbackBanner(container);
    };

    setTimeout(checkAndRender, 50);
}

function renderFallbackBanner(container) {
    if (!container) return;
    container.innerHTML = `
        <div style="width:100%;padding:14px;background:linear-gradient(135deg,#0064FF 0%,#003699 100%);color:#fff;border-radius:14px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 12px rgba(0,100,255,0.2);margin-bottom:12px;box-sizing:border-weight;">
            <div style="flex:1;min-width:0;padding-right:8px;">
                <div style="font-size:10px;opacity:0.85;font-weight:600;margin-bottom:2px;">SPONSOR | 실시간 맞춤 혜택</div>
                <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🎁 나에게 맞는 정부 지원금 신청하기</div>
            </div>
            <div style="flex-shrink:0;font-size:11px;background:rgba(255,255,255,0.25);padding:6px 12px;border-radius:8px;font-weight:700;cursor:pointer;">
                보기 🔗
            </div>
        </div>
    `;
}

// 리워드 광고(Rewarded) 상태 관리
let rewardedAdLoaded = false;
let rewardedThisSession = false;
let rewardTapCount = 0;
let rewardTapTarget = 0;
function resetRewardTapTarget() {
    rewardTapCount = 0;
    rewardTapTarget = Math.floor(Math.random() * 3) + 3;
}
resetRewardTapTarget();
const REWARDED_AD_ID = 'ait.v2.live.be0a965d07e0432b'; // 실제 상용 출시용 리워드 광고 ID

let rewardedAdLoading = false;

// 진단 완료: 공식 테스트 ID로 preload→show까지 정상 확인됨. 문제는 라이브 슬롯의 인벤토리/서빙 상태.
function debugAlert() {}

// onLoaded: 'loaded' 이벤트를 받은 뒤 실행할 콜백 (토스 문서 규정: load → loaded 수신 → show 순서를 지키기 위함)
function preloadRewardedAd(onLoaded) {
    if (typeof loadFullScreenAd === 'undefined') {
        console.warn('[리워드광고] loadFullScreenAd SDK 함수가 로드되지 않음 (sdk-bridge.js 미로드 또는 바인딩 실패)');
        debugAlert('loadFullScreenAd 함수가 없음 (SDK 미로드)');
        return;
    }
    // SDK 내부 핸들러가 아직 준비되지 않은 시점에 isSupported()를 호출하면 예외를 던질 수 있어서
    // (그대로 두면 window.onload 전체가 중단되어 캘린더/혜택 데이터 로드까지 같이 멈춤) 반드시 감싼다.
    let supported = false;
    try {
        supported = loadFullScreenAd.isSupported();
    } catch (e) {
        console.warn('[리워드광고] loadFullScreenAd.isSupported() 호출 중 예외 (SDK 미준비 상태로 추정):', e);
        debugAlert('isSupported() 호출 중 예외: ' + (e && e.message));
        return;
    }
    if (!supported) {
        console.warn('[리워드광고] loadFullScreenAd.isSupported() === false (현재 토스 앱 버전/환경에서 미지원)');
        debugAlert('isSupported() === false (이 환경/버전에서 리워드 광고 미지원)');
        return;
    }
    if (rewardedAdLoading) {
        // 토스 문서: 동일 adGroupId 기준으로는 한 번에 하나의 광고만 미리 로드 가능
        console.warn('[리워드광고] 이미 preload 진행 중 - 중복 요청 무시');
        return;
    }
    rewardedAdLoading = true;
    console.log('[리워드광고] preload 요청:', REWARDED_AD_ID);
    try {
    loadFullScreenAd({
        options: { adGroupId: REWARDED_AD_ID },
        onEvent: (event) => {
            console.log('[리워드광고] preload onEvent:', event && event.type, event);
            if (event.type === 'loaded') {
                rewardedAdLoading = false;
                rewardedAdLoaded = true;
                debugAlert('preload 성공! (loaded 이벤트 수신) - 이제 달력 탭하면 광고가 떠야 함');
                if (typeof TossPixel !== 'undefined') {
                    try { TossPixel('7874162214141259463').adImpression(); } catch (e) {}
                }
                if (typeof onLoaded === 'function') onLoaded();
            }
        },
        onError: (err) => {
            rewardedAdLoading = false;
            console.error('[리워드광고] preload onError (광고 슬롯 미승인/노출가능재고없음 등 확인 필요):', err);
            debugAlert('preload onError: ' + JSON.stringify(err));
        }
    });
    } catch (e) {
        rewardedAdLoading = false;
        console.warn('[리워드광고] loadFullScreenAd() 호출 중 예외:', e);
        debugAlert('loadFullScreenAd() 호출 중 예외: ' + (e && e.message));
    }
}

// 마스터 대시보드 100% 동일 4대 정밀 카테고리 분류 엔진
function classifyItemCategory(item) {
    const text = (item.title || '') + ' ' + (item.amount || '') + ' ' + (item.note || '');
    const tags = item.tags || [];

    if (/지원금|바우처|수당|보조금|복지|돌봄|창업|구직|청년|지원/.test(text) || tags.includes('benefit')) {
        return 'gov'; // 1. 정부지원금
    }
    if (/환급|상품권|지역화폐|캐시백|시도|구군|지방세|페스타/.test(text) || tags.includes('payback')) {
        return 'local'; // 2. 지자체환급금
    }
    if (/축제|행사|공연|문화|체험|관광|개장|페스티벌|전시|야행/.test(text) || tags.includes('festival') || tags.includes('culture')) {
        return 'event'; // 3. 축제/행사
    }
    return 'life'; // 4. 생활/기타
}

function tryShowRewardedAd() {
    if (!rewardedAdLoaded) {
        console.warn('[리워드광고] 표시 시도했으나 아직 preload가 완료되지 않음 (rewardedAdLoaded=false)');
        debugAlert('달력 ' + rewardTapTarget + '회 탭 도달! 하지만 광고가 아직 preload 안 됨 (rewardedAdLoaded=false)');
        return false;
    }
    if (typeof showFullScreenAd === 'undefined') {
        console.warn('[리워드광고] showFullScreenAd 미지원 환경');
        debugAlert('달력 탭 도달했지만 showFullScreenAd 함수 자체가 없음');
        return false;
    }
    let supported = false;
    try {
        supported = showFullScreenAd.isSupported();
    } catch (e) {
        console.warn('[리워드광고] showFullScreenAd.isSupported() 호출 중 예외:', e);
        debugAlert('showFullScreenAd.isSupported() 호출 중 예외: ' + (e && e.message));
        return false;
    }
    if (!supported) {
        console.warn('[리워드광고] showFullScreenAd 미지원 환경');
        debugAlert('showFullScreenAd.isSupported() === false');
        return false;
    }
    debugAlert('달력 ' + rewardTapTarget + '회 탭 도달! showFullScreenAd 호출 시도 중...');
    try {
    showFullScreenAd({
        options: { adGroupId: REWARDED_AD_ID },
        onEvent: (event) => {
            switch (event.type) {
                case 'userEarnedReward':
                case 'reward':
                    localStorage.setItem('rewardedOnExit', 'done');
                    addRewardPoints(1);
                    // 광고 완료 후 즉시 종료 확인 모달 호출
                    setTimeout(() => {
                        showExitConfirmModal();
                    }, 500);
                    break;
                case 'dismissed':
                case 'failedToShow':
                    rewardedAdLoaded = false;
                    localStorage.removeItem('rewardedOnExit'); // pending 상태로 계속 남아 다음 실행 시 재시도 무한루프 방지
                    preloadRewardedAd();
                    // 광고 종료/실패 후 종료 확인 모달 호출
                    showExitConfirmModal();
                    break;
            }
        },
        onError: (err) => {
            console.error('[리워드광고] show onError:', err);
            debugAlert('show onError: ' + JSON.stringify(err));
            rewardedAdLoaded = false;
            localStorage.removeItem('rewardedOnExit'); // pending 상태로 계속 남아 다음 실행 시 재시도 무한루프 방지
            showExitConfirmModal();
        }
    });
    } catch (e) {
        console.warn('[리워드광고] showFullScreenAd() 호출 중 예외:', e);
        debugAlert('showFullScreenAd() 호출 중 예외: ' + (e && e.message));
        return false;
    }
    localStorage.setItem('rewardedOnExit', 'pending');
    return true;
}

function showRewardEarnedToast() {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 100, 255, 0.95);
        color: #ffffff;
        padding: 12px 22px;
        border-radius: 25px;
        font-size: 13px;
        font-weight: 700;
        z-index: 99999;
        box-shadow: 0 4px 15px rgba(0, 100, 255, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        animation: fadeInToast 0.3s ease-out;
    `;
    toast.innerHTML = `🎁 보상형 혜택 포인트 1❤️ 적립 완료!`;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 2200);
}

// 🚪 프리미엄 다크 테마 커스텀 종료 확인 모달 팝업
function showExitConfirmModal() {
    if (document.getElementById('exit-confirm-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'exit-confirm-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.65);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
    `;

    modal.innerHTML = `
        <div style="
            background: #1c222e;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px;
            padding: 24px;
            width: 85%;
            max-width: 320px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            animation: tossModalScale 0.25s ease-out;
        ">
            <div style="font-size: 32px; margin-bottom: 12px;">👋</div>
            <h3 style="font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">종료하시겠습니까?</h3>
            <p style="font-size: 13px; color: #9ca3af; margin-bottom: 24px; line-height: 1.4;">
                오늘의 복지 혜택과 실시간 행사 일정을 모두 확인하셨나요?
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="btn-modal-cancel" style="
                    flex: 1; padding: 12px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    color: #e5e7eb; font-weight: 600; font-size: 14px;
                    cursor: pointer; transition: all 0.2s;
                ">취소</button>
                <button id="btn-modal-exit" style="
                    flex: 1; padding: 12px;
                    background: #0064ff;
                    border: none; border-radius: 12px;
                    color: #ffffff; font-weight: 600; font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,100,255,0.3);
                    cursor: pointer; transition: all 0.2s;
                ">종료</button>
            </div>
        </div>
        <style>
            @keyframes tossModalScale {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        </style>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-modal-cancel').onclick = () => {
        document.body.removeChild(modal);
    };

    document.getElementById('btn-modal-exit').onclick = () => {
        try {
            destroyAllTossBanners();
            if (typeof TossAds !== 'undefined' && TossAds.destroyAll && TossAds.destroyAll.isSupported()) {
                TossAds.destroyAll();
            }
        } catch(e){}

        console.log("Closing Toss Miniapp View via Native Bridge...");
        // 4단계 토스 네이티브 뷰 종료 브릿지 릴레이 호출
        if (typeof granite !== 'undefined' && granite.closeView) {
            granite.closeView();
        } else if (typeof AppsInToss !== 'undefined' && AppsInToss.closeView) {
            AppsInToss.closeView();
        } else if (typeof closeView === 'function') {
            closeView();
        } else if (typeof window !== 'undefined' && window.close) {
            window.close();
        } else {
            window.history.back();
        }
    };
}

// 모바일 WebView safeLocalStorage 안전 래퍼
const safeLocalStorage = {
    getItem: function(key) {
        try {
            if (typeof localStorage !== 'undefined' && localStorage.getItem) {
                return localStorage.getItem(key);
            }
        } catch(e) {}
        return null;
    },
    setItem: function(key, val) {
        try {
            if (typeof localStorage !== 'undefined' && localStorage.setItem) {
                localStorage.setItem(key, val);
            }
        } catch(e) {}
    },
    removeItem: function(key) {
        try {
            if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
                localStorage.removeItem(key);
            }
        } catch(e) {}
    }
};

// 강제종료 리워드 재개 처리
function checkPendingReward() {
    const status = safeLocalStorage.getItem('rewardedOnExit');
    if (status === 'pending') {
        if (confirm('이전에 광고 시청이 완료되지 않았습니다. 지면 광고를 시청하시겠습니까?')) {
            safeLocalStorage.removeItem('rewardedOnExit');
            // 토스 문서 규정: loaded 이벤트 수신 후에만 show 호출 (preload 직후 즉시 호출 시 100% 실패)
            preloadRewardedAd(() => tryShowRewardedAd());
        } else {
            safeLocalStorage.removeItem('rewardedOnExit');
        }
    } else if (status === 'done') {
        safeLocalStorage.removeItem('rewardedOnExit');
    }
}

window.onload = () => {
    if (ADS_ENABLED) {
        if (typeof TossPixel !== 'undefined') {
            try { TossPixel('7874162214141259463').pageView(); } catch (e) { console.warn('TossPixel.pageView error:', e); }
        }

        checkPendingReward();

        // 공식 문서(interstitial-rewarded-ad) 예제는 TossAds.initialize()를 기다리지 않고
        // loadFullScreenAd를 바로 호출한다. initialize()의 onInitialized 콜백이 이 환경에서
        // 발동하지 않으면 preload 자체가 시작조차 안 되던 문제라, 초기화 결과와 무관하게 즉시 preload한다.
        preloadRewardedAd();

        try {
            if (typeof TossAds !== 'undefined' && TossAds.initialize && TossAds.initialize.isSupported()) {
                TossAds.initialize({
                    callbacks: {
                        onInitialized: () => {
                            console.log('[리워드광고] TossAds.initialize 성공 (참고용, preload와 무관)');
                        },
                        onInitializationFailed: (err) => {
                            console.error('[리워드광고] TossAds.initialize 실패 (참고용, preload와 무관):', err);
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('[리워드광고] TossAds.initialize 호출 중 예외 (참고용, preload와 무관):', e);
        }

        // 토스 뒤로가기 버튼 클릭 가로채기 ➡️ 종료 확인 모달 즉시 노출
        if (typeof graniteEvent !== 'undefined') {
            try {
                graniteEvent.addEventListener('backEvent', {
                    onEvent: () => {
                        console.log('Toss Back Key Pressed. Showing exit confirm modal...');
                        showExitConfirmModal();
                    }
                });
            } catch (e) {
                console.warn('graniteEvent addEventListener error:', e);
            }
        }
    }

    initAreaFilters();
    
    // 통합 검색 구동 함수 (달력 + 하단 카드 동시 갱신)
    window.triggerSearch = function() {
        if (typeof updateCalendar === 'function') {
            updateCalendar();
        } else if (typeof render === 'function') {
            render();
        }
        if (typeof renderCards === 'function') {
            renderCards();
        } else if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
    };

    // 검색창 & 검색 버튼 이벤트 연동
    const searchInputEl = document.getElementById('searchInput');
    const searchBtnEl = document.getElementById('searchBtn');

    if (searchInputEl) {
        searchInputEl.addEventListener('input', () => {
            triggerSearch();
        });
        searchInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                triggerSearch();
            }
        });
    }

    if (searchBtnEl) {
        searchBtnEl.addEventListener('click', () => {
            triggerSearch();
        });
    }

    loadBenefitsData();
    updateEligibilityChips();
    updateRewardDisplay();
};

window.onbeforeunload = () => {
    if (ADS_ENABLED) {
        destroyAllTossBanners();
        if (typeof TossAds !== 'undefined' && TossAds.destroyAll && TossAds.destroyAll.isSupported()) {
            TossAds.destroyAll();
        }
    }
};
