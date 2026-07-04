# -*- coding: utf-8 -*-
import os
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

def fetch_cultural_events():
    """
    한국문화정보원 '한눈에보는문화정보조회서비스' API를 지자체별로 순회 호출하여
    전국의 실시간 공연/전시/축제/행사 원천 정보를 대량 수집 및 리턴합니다.
    """
    # 환경변수 또는 사용자 지정 디코딩 키 로드
    service_key = os.environ.get("DATA_GO_KR_KEY")
    if not service_key or service_key == "YOUR_DECODED_DATA_GO_KR_KEY_HERE":
        service_key = "17a972ad871a98f9f9b5912ee7cf594a423b1aa0ce2a1bafa6b1c7aee137cef9"
        
    if not service_key:
        print("API Key not found. Using default mock data.")
        return []

    # API 엔드포인트 정의
    url_area = "https://apis.data.go.kr/B553457/cultureinfo/area2"
    url_period = "https://apis.data.go.kr/B553457/cultureinfo/period2"
    
    today = datetime.now()
    from_date = today.strftime("%Y%m%d")
    to_date = (today + timedelta(days=180)).strftime("%Y%m%d")
    
    events = []
    seen_titles = set()
    
    # 1. 전국 17개 광역 지자체를 순회 조회하여 지역별로 10개씩 대량 수집 (총 170개 모수 확보)
    areas = [
        "서울", "인천", "대전", "대구", "광주", "울산", "세종", 
        "경기", "충북", "충남", "전남", "경북", "경남", "제주", "강원", "전북", "부산"
    ]
    
    print("Starting regional cultural events API fetch...")
    for area in areas:
        params = {
            'serviceKey': service_key,
            'cPage': '1',
            'rows': '10',
            'pageNo': '1',
            'numOfRows': '10',
            'sido': area,
            'area': area,
            'areaCode': area
        }
        try:
            response = requests.get(url_area, params=params, timeout=10)
            if response.status_code != 200:
                continue
                
            root = ET.fromstring(response.content)
            body = root.find("body")
            if body is None:
                continue
            items_node = body.find("items")
            if items_node is None:
                continue
                
            for item in items_node.findall("item"):
                title = item.findtext("title")
                start_date = item.findtext("startDate")
                end_date = item.findtext("endDate")
                place = item.findtext("place")
                realm_name = item.findtext("realmName")
                url_link = item.findtext("url")
                thumbnail = item.findtext("thumbnail")
                
                if not title or not start_date or not end_date:
                    continue
                    
                title_clean = title.strip()
                if title_clean in seen_titles:
                    continue
                    
                seen_titles.add(title_clean)
                events.append({
                    "title": title_clean,
                    "start_date": start_date.strip(),
                    "end_date": end_date.strip(),
                    "place": (place or "전국").strip(),
                    "realmName": (realm_name or "행사/축제").strip(),
                    "area": area,
                    "url": (url_link or "https://www.culture.go.kr/").strip(),
                    "thumbnail": (thumbnail or "").strip()
                })
        except Exception as e:
            print(f"Error fetching {area}: {e}")
            
    # 2. 추가적으로 디폴트 기간별 최신 데이터도 한번 긁어서 병합
    try:
        params_period = {
            'serviceKey': service_key,
            'from': from_date,
            'to': to_date,
            'cPage': '1',
            'rows': '10',
            'pageNo': '1',
            'numOfRows': '10'
        }
        response = requests.get(url_period, params=params_period, timeout=10)
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            body = root.find("body")
            if body is not None:
                items_node = body.find("items")
                if items_node is not None:
                    for item in items_node.findall("item"):
                        title = item.findtext("title")
                        start_date = item.findtext("startDate")
                        end_date = item.findtext("endDate")
                        place = item.findtext("place")
                        realm_name = item.findtext("realmName")
                        area_name = item.findtext("area")
                        url_link = item.findtext("url")
                        thumbnail = item.findtext("thumbnail")
                        
                        if not title or not start_date or not end_date:
                            continue
                            
                        title_clean = title.strip()
                        if title_clean in seen_titles:
                            continue
                            
                        seen_titles.add(title_clean)
                        events.append({
                            "title": title_clean,
                            "start_date": start_date.strip(),
                            "end_date": end_date.strip(),
                            "place": (place or "전국").strip(),
                            "realmName": (realm_name or "행사/축제").strip(),
                            "area": (area_name or "전국").strip(),
                            "url": (url_link or "https://www.culture.go.kr/").strip(),
                            "thumbnail": (thumbnail or "").strip()
                        })
    except Exception as e:
        print(f"Error fetching period additions: {e}")

    print(f"Successfully collected {len(events)} unique cultural events.")
    return events

if __name__ == "__main__":
    # 단독 테스트 코드
    import json
    events = fetch_cultural_events()
    print(json.dumps(events[:3], indent=2, ensure_ascii=False))
