import requests
import json
import urllib.parse
import sys
from datetime import datetime, timedelta

# 콘솔 출력 인코딩 문제 방지 (Windows cp949 대응)
sys.stdout.reconfigure(encoding='utf-8')

# ==========================================
# 1. 설정: 공공데이터포털에서 복사한 인증키
# ==========================================
# 공공데이터포털에서 발급받은 '인코딩된 키'와 '디코딩된 키' 중,
# 파이썬 requests 라이브러리 사용 시에는 인코딩되지 않은(Decoding) 원본 키를 넣고 
# request 시 내부적으로 직접 인코딩하는 방식이 가장 안전합니다.
RAW_KEY = "6c9507ae09541dc9200cd08f20cedd51251f3c0a1602bcf4af73494d4d1c46ac" 

def get_barrier_free_data():
    # TourAPI 4.0 국문 관광정보 서비스 - 무장애 여행 정보 조회 엔드포인트
    endpoint = "http://apis.data.go.kr/B551011/BarrierFreeService1/areaBasedList1"
    
    # 서비스키는 이미 URL 인코딩이 완료된 형태여야 500 에러를 피할 수 있으므로 강제 인코딩 적용
    encoded_key = urllib.parse.quote(urllib.parse.unquote(RAW_KEY))

    # 필수 및 권장 파라미터 정의
    params = {
        'numOfRows': '20',
        'pageNo': '1',
        'MobileOS': 'ETC',
        'MobileApp': 'TossMiniApp',
        '_type': 'json',
        'arrange': 'A',
        'areaCode': '1'  # 서울
    }
    
    # 쿼리 스트링 조합 (serviceKey는 이중 인코딩을 방지하기 위해 템플릿 리터럴로 직접 앞단에 결합)
    param_str = urllib.parse.urlencode(params)
    full_url = f"{endpoint}?serviceKey={encoded_key}&{param_str}"

    try:
        print("--- API Request Info ---")
        print(f"URL: {endpoint}")
        print("Sending request to TourAPI...")
        
        # 헤더 명시로 500 오류 최소화
        headers = {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(full_url, headers=headers, timeout=15)
        print(f"Response Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error: Server responded with status code {response.status_code}")
            return None

        # XML 응답(에러 메시지)이 온 경우 파싱 오류 방지
        content_type = response.headers.get("Content-Type", "").lower()
        if "json" not in content_type:
            print("Warning: Response is not JSON. Checking content...")
            print(f"Response text preview: {response.text[:300]}")
            return None

        data = response.json()
        items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
        
        if not items:
            print("Warning: Received empty item list.")
            return None

        formatted_data = {}
        start_date = datetime(2026, 6, 25) # 오늘 날짜(2026-06-25) 기준으로 데이터 매핑 변경
        
        for i, item in enumerate(items):
            # 6월 25일부터 순차적으로 날짜별 분배
            date_key = (start_date + timedelta(days=i % 6)).strftime("%Y-%m-%d")
            
            if date_key not in formatted_data:
                formatted_data[date_key] = []
                
            formatted_data[date_key].append({
                "id": int(item.get('contentid', i)),
                "title": item.get('title'),
                "amount": "입장료 무료 또는 복지할인",
                "period": "상시 운영",
                "type": "무장애",
                "source": f"https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid={item.get('contentid')}",
                "note": f"{item.get('addr1', '상세주소 정보 없음')} | 휠체어/유모차 입장 가능",
                "color": "#34C759",
                "tags": ["barrier", "eco"],
                "isAd": False,
                "congestion": "green" if i % 3 == 0 else ("yellow" if i % 3 == 1 else "red")
            })
            
        return formatted_data

    except Exception as e:
        print(f"Error during API execution: {e}")
        return None

if __name__ == "__main__":
    result = get_barrier_free_data()
    if result:
        # 결과를 현재 폴더의 data.json 파일로 덮어쓰기 저장
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print("Success: data.json has been updated with real API data!")
    else:
        print("Failed: Could not generate data.json.")

