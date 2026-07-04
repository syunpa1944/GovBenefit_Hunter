# -*- coding: utf-8 -*-
import os
import requests
import xml.etree.ElementTree as ET

service_key = "17a972ad871a98f9f9b5912ee7cf594a423b1aa0ce2a1bafa6b1c7aee137cef9"

def test_area_iteration():
    areas = [
        "서울", "인천", "대전", "대구", "광주", "울산", "세종", 
        "경기", "충북", "충남", "전남", "경북", "경남", "제주", "강원", "전북", "부산"
    ]
    
    url = "https://apis.data.go.kr/B553457/cultureinfo/area2"
    seen = set()
    
    for a in areas:
        params = {
            'serviceKey': service_key,
            'cPage': '1',
            'rows': '10',
            'sido': a,          # 지역 파라미터 시도 1
            'area': a,          # 지역 파라미터 시도 2
            'areaCode': a       # 지역 파라미터 시도 3
        }
        try:
            response = requests.get(url, params=params, timeout=10)
            root = ET.fromstring(response.content)
            body = root.find("body")
            if body is None:
                continue
            items_node = body.find("items")
            if items_node is None:
                continue
            items = items_node.findall("item")
            for item in items:
                title = item.findtext("title")
                if title:
                    seen.add(title.strip())
            print(f"[지역: {a}] 수집 완료. 누적 고유 개수: {len(seen)}개")
        except Exception as e:
            print(f"에러: {e}")

if __name__ == "__main__":
    test_area_iteration()
