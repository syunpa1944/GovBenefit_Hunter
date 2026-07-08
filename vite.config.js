import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // 빌드 시작 시 dist 폴더 삭제(rmdir)를 방지하여 윈도우 파일 잠금 EPERM 에러 차단
    emptyOutDir: false
  }
});
