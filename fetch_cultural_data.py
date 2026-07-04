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
    
    # 오늘 기준 향후 60일간의 문화 정보 수집
    today = datetime.now()
    from_date = today.strftime("%Y%m%d")
    to_date = (today + timedelta(days=60)).strftime("%Y%m%d")
    
    params = {
        'serviceKey': service_key,
        'from': from_date,
        'to': to_date,
        'cPage': '1',
        'rows': '100'  # 최대 수집 개수
    }
    
    try:
        print(f"API 호출 시작: {from_date} ~ {to_date}")
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"API 요청 실패 (HTTP 상태 코드: {response.status_code})")
            return []
            
        content = response.content
        
        # XML 노드 파싱 시작
        root = ET.fromstring(content)
        
        # 호출 결과 상태 코드 점검
        header = root.find("header")
        if header is not None:
            result_code = header.findtext("resultCode")
            result_msg = header.findtext("resultMsg")
            if result_code != "00":
                print(f"API 응답 에러: {result_msg} (코드: {result_code})")
                return []
                
        body = root.find("body")
        if body is None:
            return []
            
        items_node = body.find("items")
        if items_node is None:
            return []
            
        events = []
        for item in items_node.findall("item"):
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
                
            events.append({
                "title": title.strip(),
                "start_date": start_date.strip(),
                "end_date": end_date.strip(),
                "place": (place or "전국").strip(),
                "realmName": (realm_name or "행사/축제").strip(),
                "area": (area or "").strip(),
                "url": (url_link or "https://www.culture.go.kr/").strip(),
                "thumbnail": (thumbnail or "").strip()
            })
            
        print(f"성공적으로 {len(events)}개의 문화 정보 수집 완료!")
        return events
        
    except Exception as e:
        print(f"fetch_cultural_events 오류 발생: {e}")
        return []

if __name__ == "__main__":
    # 단독 테스트 코드
    import json
    events = fetch_cultural_events()
    print(json.dumps(events[:3], indent=2, ensure_ascii=False))
