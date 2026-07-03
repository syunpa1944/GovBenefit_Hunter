import json
import os

# 1. 현재 스크립트가 실행되는 폴더 경로를 찾습니다.
current_dir = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(current_dir, 'data.json')

# 실제 무장애 여행지 리스트 (서울/경기 주요 장소)
mock_places = [
    {"title": "경복궁 (무장애 코스)", "addr": "서울특별시 종로구 사직로 161", "type": "고궁"},
    {"title": "서울 식물원", "addr": "서울특별시 강서구 마곡동로 161", "type": "공원"},
    {"title": "수원 화성 행궁", "addr": "경기도 수원시 팔달구 정조로 825", "type": "역사"},
    {"title": "한국민속촌", "addr": "경기도 용인시 기흥구 민속촌로 90", "type": "테마파크"},
    {"title": "광명동굴", "addr": "경기도 광명시 가학로 85번길 142", "type": "동굴"},
    {"title": "남산타워 전망대", "addr": "서울특별시 용산구 남산공원길 105", "type": "랜드마크"},
    {"title": "아침고요수목원", "addr": "경기도 가평군 상면 수목원로 432", "type": "정원"},
    {"title": "에버랜드 (핸디캡 서비스)", "addr": "경기도 용인시 처인구 포곡읍", "type": "테마파크"},
    {"title": "국립현대미술관", "addr": "서울특별시 종로구 삼청로 30", "type": "미술관"},
    {"title": "일산 호수공원", "addr": "경기도 고양시 일산동구 호수로 595", "type": "공원"}
]

data = {}
for i in range(1, 32):
    date_key = f"2025-08-{i:02d}"
    place = mock_places[i % len(mock_places)]
    data[date_key] = [{
        "id": 1000 + i,
        "title": place["title"],
        "amount": "장애인/유공자 무료",
        "period": "상시 운영",
        "type": "무장애",
        "source": "https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=3025435",
        "note": f"{place['addr']} | 휠체어 대여 및 전용 화장실 완비",
        "color": "#34C759",
        "tags": ["wheelchair", "stroller"]
    }]

# 2. 수정된 경로에 파일을 저장합니다.
with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✅ 성공! 파일이 생성되었습니다: {file_path}")
print("이제 브라우저에서 index.html을 새로고침해보세요.")
