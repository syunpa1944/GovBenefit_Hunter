const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("🔍 미니앱 public/app.js 런타임 심층 정적/동적 에러 분석 중...");
console.log("==================================================");

// 가상 브라우저 환경 모킹
global.window = global;
global.document = {
  getElementById: (id) => {
    return {
      value: "0",
      innerHTML: "",
      appendChild: () => {},
      addEventListener: () => {},
      options: [{ text: "선택" }],
      selectedIndex: 0,
      classList: { add: () => {}, remove: () => {} }
    };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    return {
      value: "",
      innerText: "",
      appendChild: () => {},
      style: {},
      classList: { add: () => {}, remove: () => {} }
    };
  },
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

try {
  // 1. data.js 평가
  const dataJs = fs.readFileSync(path.join(__dirname, 'public/data.js'), 'utf8');
  eval(dataJs);
  console.log("✓ data.js 로드 성공!");

  // 2. app.js 평가
  const appJs = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  eval(appJs);
  console.log("✓ public/app.js 구문 분석 및 로드 성공!");

  // 3. 주요 함수 런타임 직접 호출 테스트
  if (typeof initAreaFilters === 'function') {
    initAreaFilters();
    console.log("✓ initAreaFilters() 실행 성공!");
  }
  if (typeof onSidoChange === 'function') {
    onSidoChange();
    console.log("✓ onSidoChange() 실행 성공!");
  }
  if (typeof triggerSearch === 'function') {
    triggerSearch();
    console.log("✓ triggerSearch() 실행 성공!");
  }
  if (typeof window.onload === 'function') {
    window.onload();
    console.log("✓ window.onload() 실행 성공!");
  }

  console.log("==================================================");
  console.log("🎉 심층 검증 완료: 런타임 치명적 에러 없음!");
  console.log("==================================================");

} catch (err) {
  console.error("🚨 [CRITICAL ERROR DETECTED]:", err.message);
  console.error("📚 Stack:", err.stack);
}
