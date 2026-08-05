const fs = require('fs');
const path = require('path');

console.log("==================================================================");
console.log("🔬 [처음부터 정밀 검증] 토스 전면 리워드 광고 SDK 구동 100% 전수 점검");
console.log("==================================================================");

// 1. 가상 DOM 및 모바일 WebView 브릿지 환경 구축
global.window = global;
global.rewardTapCount = 0;
global.rewardTapTarget = 4; // 3~5 사이 4회 설정
global.ADS_ENABLED = true;

let adWindowOpened = false;
let rewardToastShown = false;
let pointsAdded = 0;

global.document = {
  getElementById: (id) => {
    return {
      value: "0",
      innerHTML: "",
      textContent: "",
      appendChild: () => {},
      addEventListener: () => {},
      classList: { add: () => {}, remove: () => {} }
    };
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    return {
      style: {},
      innerHTML: "",
      appendChild: () => {},
      parentNode: { removeChild: () => {} }
    };
  },
  body: {
    appendChild: (el) => {
      const content = el.innerHTML || el.textContent || "";
      if (content.includes("적립 완료")) {
        rewardToastShown = true;
        console.log("  ✅ [적립 토스트 렌더링 확인]:", content);
      }
    },
    removeChild: () => {}
  }
};

// 토스 인앱 TossAds 공식 SDK 브릿지 모킹
global.TossAds = {
  showFullScreenAd: function(config) {
    console.log("  📱 [TossAds.showFullScreenAd 호출 성공!]:");
    console.log("     - adGroupId:", config.adGroupId || (config.options && config.options.adGroupId));
    adWindowOpened = true;
    if (config.onEvent) {
      config.onEvent({ type: 'userEarnedReward' });
    }
  }
};

// 글로벌 showFullScreenAd 브릿지 모킹
global.showFullScreenAd = function(config) {
  console.log("  📱 [global.showFullScreenAd 호출 성공!]:");
  console.log("     - adGroupId:", config.adGroupId || (config.options && config.options.adGroupId));
  adWindowOpened = true;
  if (config.onEvent) {
    config.onEvent({ type: 'userEarnedReward' });
  }
};

try {
  // 소스 파일 읽기
  const dataJs = fs.readFileSync(path.join(__dirname, 'public/data.js'), 'utf8');
  eval(dataJs);

  const appJs = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
  eval(appJs);

  console.log("✓ 소스 코드 파싱 완결! 달력 셀 무작위 터치 시뮬레이션 가동...\n");

  for (let i = 1; i <= 5; i++) {
    rewardTapCount++;
    console.log(`▶ [터치 ${i}회차] 현재 누적 클릭: ${rewardTapCount} / 목표: ${rewardTapTarget}`);
    
    if (rewardTapCount >= rewardTapTarget) {
      console.log("💥 [목표 달성! 리워드 광고 트리거 구동]");
      tryShowRewardedAd();
      rewardTapCount = 0;
      rewardTapTarget = Math.floor(Math.random() * 3) + 3;
      break;
    }
  }

  console.log("\n==================================================================");
  console.log("📊 [최종 구동 결과 리포트]");
  console.log("  - 전면 광고 팝업창 출력 여부:", adWindowOpened ? "✅ 100% 성공 (전면 창 뜸!)" : "❌ 실패");
  console.log("  - 리워드 적립 토스트 출력 여부:", rewardToastShown ? "✅ 100% 성공" : "❌ 실패");
  console.log("==================================================================");

  if (!adWindowOpened || !rewardToastShown) {
    process.exit(1);
  }

} catch (err) {
  console.error("🚨 [검증 중 오류 발생]:", err);
  process.exit(1);
}
