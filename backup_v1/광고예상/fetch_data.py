import requests
import json

def fetch_barrier_free_data(service_key):
    # 한국관광공사 API 엔드포인트
    url = "http://apis.data.go.kr/B551011/BarrierFreeService1/areaBasedList1"
    
    params = {
        'serviceKey': service_key,
        'numOfRows': '10',
        'pageNo': '1',
        'MobileOS': 'ETC',
        'MobileApp': 'TossMiniApp',
        '_type': 'json',
        'arrange': 'A',
        'areaCode': '1' # 서울 기준
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        items = data['response']['body']['items']['item']
        
        # 우리 앱의 data.json 포맷으로 변환
        formatted_data = {}
        for i, item in enumerate(items):
            # 임시로 오늘부터 10일간 하나씩 배치
            date_key = f"2025-08-{15 + i}" 
            
            formatted_data[date_key] = [
                {
                    "id": item['contentid'],
                    "title": f"[무장애] {item['title']}",
                    "amount": "입장료 확인 필요",
                    "period": "상시 운영",
                    "type": "무장애",
                    "source": f"https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid={item['contentid']}",
                    "note": "휠체어 대여 가능, 장애인 화장실 완비",
                    "color": "#34C759" # 초록색 도트
                }
            ]
        
        return formatted_data

    except Exception as e:
        print(f"Error: {e}")
        return None

# API 키를 받으면 아래 주석을 풀고 실행하세요.
# my_key = "YOUR_API_KEY_HERE"
# result = fetch_barrier_free_data(my_key)
# print(json.dumps(result, indent=2, ensure_ascii=False))
