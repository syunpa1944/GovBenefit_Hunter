import { TossAds, loadFullScreenAd, showFullScreenAd, graniteEvent } from "@apps-in-toss/web-framework";

// 전역 window 객체에 바인딩하여 외부 app.js 내 광고 및 브릿지 모듈이 정상 참조 가능하도록 연동
window.TossAds = TossAds;
window.loadFullScreenAd = loadFullScreenAd;
window.showFullScreenAd = showFullScreenAd;
window.graniteEvent = graniteEvent;

import "./app.js";
