# -*- coding: utf-8 -*-
import os
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

def fetch_cultural_events():
    """
    한국문화정보원 '한눈에보는문화정보조회서비스' API를 호출하여
    실시간 공연/전시/축제/행사 정보를 파싱 후 리스트로 리턴합니다.
    """
    # 환경변수 또는 사용자 지정 디코딩 키 로드 (기본 키가 없는 경우 안전한 에러 방지)
    service_key = os.environ.get("DATA_GO_KR_KEY")
    if not service_key:
        # 만약 로컬 실행 시 환경변수가 부재한 경우 기본 키 우회 처리
        service_key = "YOUR_DECODED_DATA_GO_KR_KEY_HERE"
        
    if service_key == "YOUR_DECODED_DATA_GO_KR_KEY_HERE" or not service_key:
        print("[안내] 공공데이터 포털 API Key(DATA_GO_KR_KEY)가 등록되지 않았습니다. 기본 정보로 작동합니다.")
        return []

    url = "https://apis.data.go.kr/B553457/cultureinfo/period2"
    
    # 오늘 기준 향후 180일(6개월)간의 문화 정보 대량 수집
    today = datetime.now()
    from_date = today.strftime("%Y%m%d")
    to_date = (today + timedelta(days=180)).strftime("%Y%m%d")
    
    events = []
    seen_titles = set()
    
    # 1페이지부터 10페이지까지 순회하며 데이터 대량 수집 (최대 1000개 모수 확보)
    for page in range(1, 11):
        params = {
            'serviceKey': service_key,
            'from': from_date,
            'to': to_date,
            'cPage': str(page),
            'rows': '100'
        }
        
        try:
            print(f"API 호출 시작 (페이지 {page}): {from_date} ~ {to_date}")
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code != 200:
                print(f"API 요청 실패 (페이지 {page}, HTTP 상태 코드: {response.status_code})")
                break
                
            content = response.content
            root = ET.fromstring(content)
            
            header = root.find("header")
            if header is not None:
                result_code = header.findtext("resultCode")
                if result_code != "00":
                    print(f"API 응답 에러 (페이지 {page})")
                    break
                    
            body = root.find("body")
            if body is None:
                break
                
            items_node = body.find("items")
            if items_node is None:
                break
                
            page_items = items_node.findall("item")
            if not page_items:
                break
                
            # 정부 혜택 및 공공 복지 연계 가능한 키워드 목록 정의 (대폭 확장)
            BENEFIT_KEYWORDS = [
                "국립", "시립", "도립", "군립", "구립", "문화원", "예술회관", 
                "도서관", "박물관", "미술관", "문화센터", "복지", "공원", "지자체",
                "특별시", "광역시", "체육회", "공공", "무료", "할인", "감면", "지원", 
                "페이백", "문화누리", "다자녀", "바우처", "전통시장", "체험", "교육",
                "축제", "페스티벌", "마당", "야시장", "전통", "민속", "예술", "음악회",
                "콘서트", "전시회", "기획전", "특별전", "캠핑", "물놀이", "역사", "가이드",
                "투어", "마을", "숲", "생태", "아카데미", "강좌"
            ]

            for item in page_items:
                title = item.findtext("title")
                start_date = item.findtext("startDate")
                end_date = item.findtext("endDate")
                place = item.findtext("place")
                realm_name = item.findtext("realmName")
                area = item.findtext("area")
                url_link = item.findtext("url")
                thumbnail = item.findtext("thumbnail")
                
                if not title or not start_date or not end_date:
                    continue
                
                title_clean = title.strip()
                # 1단계: API 전체 수집 데이터셋 내 중복 제거
                if title_clean in seen_titles:
                    continue
                
                # 장소와 제목을 결합하여 정부/공공/혜택 관련 키워드가 들어있는지 검증
                text_to_check = (title_clean + " " + (place or "")).lower()
                is_benefit_related = any(kw in text_to_check for kw in BENEFIT_KEYWORDS)
                
                if not is_benefit_related:
                    # 정부혜택달력의 정체성에 어긋나는 민간 상업용 연극/콘서트는 제외
                    continue
                    
                seen_titles.add(title_clean)
                events.append({
                    "title": title_clean,
                    "start_date": start_date.strip(),
                    "end_date": end_date.strip(),
                    "place": (place or "전국").strip(),
                    "realmName": (realm_name or "행사/축제").strip(),
                    "area": (area or "").strip(),
                    "url": (url_link or "https://www.culture.go.kr/").strip(),
                    "thumbnail": (thumbnail or "").strip()
                })
                
        except Exception as e:
            print(f"페이지 {page} 수집 중 오류: {e}")
            break
            
    print(f"성공적으로 {len(events)}개의 문화 정보 수집 완료!")
    return events

if __name__ == "__main__":
    # 단독 테스트 코드
    import json
    events = fetch_cultural_events()
    print(json.dumps(events[:3], indent=2, ensure_ascii=False))
