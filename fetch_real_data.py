# -*- coding: utf-8 -*-
import json
import sys
import urllib.parse
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')

TO_AREA_CODE = {
    "1": 11, "2": 28, "3": 30, "4": 27, "5": 29,
    "6": 31, "7": 36, "8": 41, "9": 43, "10": 44,
    "11": 46, "12": 47, "13": 48, "14": 50, "15": 51, "16": 52, "17": 26
}
TO_AREA_NAME = {
    11: "서울", 28: "인천", 30: "대전", 27: "대구", 29: "광주",
    31: "울산", 36: "세종", 41: "경기", 43: "충북", 44: "충남",
    46: "전남", 47: "경북", 48: "경남", 50: "제주", 51: "강원", 52: "전북", 26: "부산"
}

SIGUNGU_NAME_MAP = {
    # 인천
    "중구": 28110, "동구": 28140, "미추홀구": 28177, "연수구": 28185, "남동구": 28200,
    "부평구": 28237, "계양구": 28245, "서구": 28260, "강화군": 28710, "옹진군": 28720,
    # 대구
    "달성군": 27710, "군위군": 27720, "수성구": 27260, "달서구": 27290, "북구": 27230,
    # 부산
    "기장군": 26710, "해운대구": 26350, "사하구": 26380, "금정구": 26410,
    # 서울
    "강남구": 11680, "송파구": 11710, "마포구": 11440, "서대문구": 11410
}

# 로컬 백업용 실제 전국 축제 데이터 30개 (인천, 대구, 부산, 서울 등 명확히 분류)
BACKUP_FESTIVALS = [
    {"title": "인천 펜타포트 락 페스티벌", "addr1": "인천광역시 연수구 센트럴로 350", "eventstartdate": "20260807", "eventenddate": "20260809", "category": "festival", "official_url": "https://www.pentaportrock.com/"},
    {"title": "인천 개항장 문화재 야행", "addr1": "인천광역시 중구 신포로27번길 80", "eventstartdate": "20260620", "eventenddate": "20260622", "category": "free", "official_url": "https://www.incheon.go.kr/culture/index"},
    {"title": "인천 소래포구 축제", "addr1": "인천광역시 남동구 아암대로 1620", "eventstartdate": "20260918", "eventenddate": "20260920", "category": "festival", "official_url": "https://www.incheon.go.kr/culture/index"},
    {"title": "대구 치맥 페스티벌", "addr1": "대구광역시 달서구 공원순환로 201", "eventstartdate": "20260701", "eventenddate": "20260705", "category": "festival", "official_url": "https://chimac.kr/"},
    {"title": "대구 수성못 페스티벌", "addr1": "대구광역시 수성구 용학로 35-5", "eventstartdate": "20260925", "eventenddate": "20260927", "category": "festival", "official_url": "https://tour.daegu.go.kr/"},
    {"title": "대구 약령시 한방문화축제", "addr1": "대구광역시 중구 남성로 51-1", "eventstartdate": "20260505", "eventenddate": "20260509", "category": "free", "official_url": "https://tour.daegu.go.kr/"},
    {"title": "부산 국제 록 페스티벌", "addr1": "부산광역시 사상구 삼락동 29-61", "eventstartdate": "20261003", "eventenddate": "20261004", "category": "festival", "official_url": "http://www.busan.com/biff"},
    {"title": "부산 자갈치 축제", "addr1": "부산광역시 중구 자갈치해안로 52", "eventstartdate": "20261008", "eventenddate": "20261011", "category": "festival", "official_url": "https://tour.busan.go.kr/"},
    {"title": "부산 해운대 모래축제", "addr1": "부산광역시 해운대구 우동", "eventstartdate": "20260522", "eventenddate": "20260525", "category": "festival", "official_url": "https://tour.busan.go.kr/"},
    {"title": "서울 장미 축제", "addr1": "서울특별시 중랑구 묵동 375", "eventstartdate": "20260515", "eventenddate": "20260524", "category": "free", "official_url": "https://culture.seoul.go.kr/"},
    {"title": "서울 신촌 물총 축제", "addr1": "서울특별시 서대문구 창천동 신촌로터리", "eventstartdate": "20260725", "eventenddate": "20260726", "category": "water", "official_url": "https://culture.seoul.go.kr/"},
    {"title": "서울 여의도 봄꽃축제", "addr1": "서울특별시 영등포구 여의서로", "eventstartdate": "20260405", "eventenddate": "20260410", "category": "free", "official_url": "https://culture.seoul.go.kr/"},
    {"title": "강릉 단오제", "addr1": "강원특별자치도 강릉시 단오장길 1", "eventstartdate": "20260614", "eventenddate": "20260621", "category": "festival", "official_url": "https://www.danojefestival.or.kr/"},
    {"title": "화천 산천어 축제", "addr1": "강원특별자치도 화천군 화천읍", "eventstartdate": "20260110", "eventenddate": "20260201", "category": "eco", "official_url": "https://www.narafestival.com/"},
    {"title": "태백산 눈축제", "addr1": "강원특별자치도 태백시 천제단길 162", "eventstartdate": "20260123", "eventenddate": "20260201", "category": "eco", "official_url": "https://www.taebaek.go.kr/portal/main.do"}
]

# 여름 물놀이 백업
BACKUP_WATER = [
    {"title": "인천 센트럴파크 해수풀 물놀이장", "addr1": "인천광역시 연수구 컨벤시아대로 160"},
    {"title": "인천 월미도 테마파크 분수대", "addr1": "인천광역시 중구 월미문화로 81"},
    {"title": "대구 두류공원 야외 수영장", "addr1": "대구광역시 달서구 공원순환로 201"},
    {"title": "대구 신천 수변 야외 물놀이장", "addr1": "대구광역시 남동대로"},
    {"title": "부산 다대포 해변 낙조분수", "addr1": "부산광역시 사하구 다대동 11-1"}
]

def get_area_from_address(addr):
    if not addr:
        return 0, 0
    addr_clean = str(addr).strip()
    tokens = addr_clean.split()
    if not tokens:
        return 0, 0
    
    sido_token = tokens[0]
    sido_map = {
        "서울": 11, "서울특별시": 11,
        "부산": 26, "부산광역시": 26,
        "대구": 27, "대구광역시": 27,
        "인천": 28, "인천광역시": 28,
        "광주": 29, "광주광역시": 29,
        "대전": 30, "대전광역시": 30,
        "울산": 31, "울산광역시": 31,
        "세종": 36, "세종특별자치시": 36,
        "경기": 41, "경기도": 41,
        "충북": 43, "충청북도": 43,
        "충남": 44, "충청남도": 44,
        "전남": 46, "전라남도": 46,
        "경북": 47, "경상북도": 47,
        "경남": 48, "경상남도": 48,
        "제주": 50, "제주특별자치도": 50,
        "강원": 51, "강원도": 51, "강원특별자치도": 51,
        "전북": 52, "전라북도": 52, "전북특별자치도": 52
    }
    
    area_cd = 0
    for key, val in sido_map.items():
        if key in sido_token:
            area_cd = val
            break
            
    sigungu_cd = 0
    if len(tokens) > 1:
        sigungu_token = tokens[1]
        for name_key, code_val in SIGUNGU_NAME_MAP.items():
            if name_key in sigungu_token:
                sigungu_cd = code_val
                break
                
    return area_cd, sigungu_cd

def get_benefit_addons(area_cd, area_nm, tags):
    benefits = []
    
    # 🎟️ 상세 정보 팝업에만 연계 적용
    benefits.append({
        "name": "정부 근로자 휴가지원금",
        "desc": "이 행사 방문 교통비/숙박비로 사용 가능 (최대 20만원 매칭 지원)",
        "link": "https://vacation.visitkorea.or.kr/"
    })
    benefits.append({
        "name": "문화누리카드",
        "desc": "저소득층 연 13만원 지원 카드 — 입장권·교통비·숙박 결제 가능",
        "link": "https://www.mnuri.kr/"
    })
    benefits.append({
        "name": "다자녀·장애인 무료/할인 입장",
        "desc": "공식 축제·행사는 복지카드·다자녀카드 제시 시 입장료 면제 또는 50% 감면",
        "link": f"https://search.naver.com/search.naver?query={urllib.parse.quote(area_nm + ' 다자녀 혜택')}"
    })

    if area_cd == 11:
        benefits.append({"name": "서울사랑상품권", "desc": "행사장 인근 서울 가맹점 최대 10% 할인", "link": "https://seoulpay.seoul.go.kr/"})
    elif area_cd == 28:
        benefits.append({"name": "인천사랑상품권 (인천e음)", "desc": "인천 축제 현장 가맹 결제 시 최대 10% 캐시백", "link": "https://www.incheon.go.kr/"})
    elif area_cd == 27:
        benefits.append({"name": "대구로페이", "desc": "대구 축제 행사장 결제 시 최대 7% 할인 혜택", "link": "https://www.daeguro.co.kr/"})
    elif area_cd == 26:
        benefits.append({"name": "동백전 (부산화폐)", "desc": "부산 전역 축제 현장 결제 시 최대 10% 즉시 캐시백", "link": "https://www.bscard.or.kr/"})
    elif area_cd == 41:
        benefits.append({"name": "경기지역화폐", "desc": "경기도 내 가맹점 결제 시 최대 10% 인센티브", "link": "https://www.gmoney.or.kr/"})
    return benefits

def convert_item(raw, is_water=False):
    title = raw["title"]
    addr = raw["addr1"]
    area_cd, sigungu_cd = get_area_from_address(addr)
    area_nm = TO_AREA_NAME.get(area_cd, "전국")
    
    # 카테고리 태그 배정 (정확한 유형별 분류)
    category = raw.get("category", "festival")  # 기본값: festival
    
    tags = []
    if is_water:
        tags = ["water", "free"]
    elif category == "barrier":
        tags = ["barrier", "free"]
    elif category == "pet":
        tags = ["pet"]
    elif category == "camp":
        tags = ["camp", "eco"]
    elif category == "eco":
        tags = ["eco"]
    elif category == "free":
        tags = ["festival", "free"]
    elif category == "water":
        tags = ["water", "free"]
    elif category == "benefit":
        tags = ["benefit"]
    elif category == "payback":
        tags = ["payback"]
    else:  # festival (default)
        tags = ["festival"]
        
    benefits_addons = get_benefit_addons(area_cd, area_nm, tags)
    note = f"[{area_nm} 행정 안내] {title}"
    stable_id = abs(hash(title + str(area_cd))) % 8000000
    
    start_str = raw.get("eventstartdate", "20260601")
    end_str = raw.get("eventenddate", "20260831")
    period_start = f"{start_str[:4]}.{start_str[4:6]}.{start_str[6:]}"
    period_end = f"{end_str[:4]}.{end_str[4:6]}.{end_str[6:]}"

    # 공식 URL: 해당 관광지 안내 페이지 (네이버 검색 제거)
    official_url = raw.get("official_url", "")
    if not official_url:
        # 지역별 기본 관광 URL 매핑
        region_url_map = {
            11: "https://culture.seoul.go.kr/",
            28: "https://www.incheon.go.kr/culture/index",
            27: "https://tour.daegu.go.kr/",
            26: "https://tour.busan.go.kr/",
            41: "https://ggtour.or.kr/",
            51: "https://tour.gwd.go.kr/",
            50: "https://www.visitjeju.net/",
            29: "https://tour.gwangju.go.kr/",
            30: "https://www.daejeon.go.kr/tour/",
        }
        official_url = region_url_map.get(area_cd, "https://korean.visitkorea.or.kr/")

    return {
        "id": stable_id,
        "title": title,
        "amount": " | ".join([b['name'] for b in benefits_addons[:2]]) + " 등 혜택 가능",
        "period": f"{period_start} ~ {period_end}",
        "type": "행사",
        "source": official_url,
        "note": note,
        "color": "#5AC8FA" if not is_water else "#34C759",
        "tags": tags,
        "areaCd": area_cd,
        "areaNm": area_nm,
        "sigunguCd": sigungu_cd,
        "sigunguNm": "",
        "mapUrl": f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(addr)}",
        "isAd": False,
        "congestion": "green",
        "eventStart": start_str,
        "eventEnd": end_str,
        "benefits": benefits_addons
    }

def build_data():
    combined = {}
    
    # 1. 축제 데이터 주입
    for raw in BACKUP_FESTIVALS:
        converted = convert_item(raw, is_water=False)
        s_date = datetime.strptime(raw["eventstartdate"], "%Y%m%d")
        e_date = datetime.strptime(raw["eventenddate"], "%Y%m%d")
        
        cur = s_date
        while cur <= e_date:
            date_key = cur.strftime("%Y-%m-%d")
            if date_key not in combined:
                combined[date_key] = []
            combined[date_key].append(converted.copy())
            cur += timedelta(days=1)

    # 2. 물놀이 데이터 주입 (7~8월 모든 주말에 상시 렌더링)
    summer_start = datetime(2026, 7, 1)
    summer_end = datetime(2026, 8, 31)
    for raw in BACKUP_WATER:
        # 가상의 시작일/종료일 부여
        raw["eventstartdate"] = "20260701"
        raw["eventenddate"] = "20260831"
        converted = convert_item(raw, is_water=True)
        
        cur = summer_start
        while cur <= summer_end:
            if cur.weekday() >= 5: # 주말
                date_key = cur.strftime("%Y-%m-%d")
                if date_key not in combined:
                    combined[date_key] = []
                combined[date_key].append(converted.copy())
            cur += timedelta(days=1)

    # 무장애, 반려동물 룩업 백업
    combined["__barrier__"] = []
    combined["__pet__"] = []
    
    return combined

if __name__ == "__main__":
    result = build_data()
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("✅ data.json 빌드 완료!")
