import os
import sys
import webbrowser
import http.server
import socketserver
import threading
import time

PORT = 8099

# PyInstaller의 임시 압축 해제 경로(_MEIPASS) 우회하여 실제 exe 실행 파일이 위치한 원본 프로젝트 폴더를 타겟팅
if getattr(sys, 'frozen', False):
    DIRECTORY = os.path.dirname(sys.executable)
else:
    DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class SafeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
        
    def end_headers(self):
        # 개발 시 CORS 에러 완벽 예방용 헤더 추가
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

def start_server():
    os.chdir(DIRECTORY)
    handler = SafeHandler
    # 포트 재사용 옵션 적용
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print(f"[정부혜택털기 PC 테스트 서버] 포트 {PORT}에서 가동 중...")
            httpd.serve_forever()
    except Exception as e:
        print(f"서버 시작 실패 (이미 실행 중일 수 있습니다): {e}")

def main():
    print("="*60)
    print("      정부혜택털기 (GovBenefit Hunter) PC 테스트 런처      ")
    print("="*60)
    print("1. 로컬 개발 환경용 경량 웹 서버를 가동합니다.")
    print("2. 브라우저를 자동으로 열어 실제 모바일 샌드박스 크기로 시뮬레이션합니다.")
    print("3. 종료하려면 이 창을 닫아주세요.")
    print("-"*60)

    # 서버를 백그라운드 스레드로 실행
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # 서버가 뜰 때까지 잠깐 대기
    time.sleep(1)

    # 브라우저 구동 주소
    url = f"http://localhost:{PORT}"
    
    # 엣지, 크롬 등 PC 브라우저를 띄워 모바일 웹뷰로 최적 조작하도록 브라우저 오픈
    print(f"브라우저 오픈 시도 중: {url}")
    webbrowser.open(url)
    
    print("\n[안내] 테스트 창이 열렸습니다. 작업을 마친 후 이 창을 닫으시면 서버가 함께 안전하게 종료됩니다.")
    
    # 프로세스 유지를 위한 루프
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n테스트 서버를 종료합니다.")

if __name__ == '__main__':
    main()
