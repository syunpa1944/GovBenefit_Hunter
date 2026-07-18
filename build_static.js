/**
 * 정적 빌드 스크립트 v2 - SDK 번들링 포함
 * 
 * 1단계: esbuild로 src/main.js → dist/web/sdk-bridge.js (TossAds SDK 포함)
 * 2단계: index.html 복사 (스크립트 참조 변환)
 * 3단계: app.js, data.js, data.json 복사
 * 
 * Vite 빌드가 스크립트 태그를 누락시키는 문제를 회피하면서도
 * TossAds SDK가 정상 로드되도록 esbuild로 SDK만 별도 번들링
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const DIST_WEB = path.join(ROOT, 'dist', 'web');

// dist/web 디렉토리 생성 (없으면)
fs.mkdirSync(DIST_WEB, { recursive: true });

// ============================================================
// 1단계: esbuild로 SDK 브릿지 번들 생성
// src/main.js → dist/web/sdk-bridge.js
// @apps-in-toss/web-framework의 TossAds, loadFullScreenAd 등을
// window 전역에 바인딩하는 코드를 단일 파일로 번들링
// ============================================================
console.log('[1단계] esbuild로 SDK 브릿지 번들링 중...');
try {
    execSync(
        'npx esbuild src/main.js --bundle --format=iife --platform=browser --target=es2020 --outfile=dist/web/sdk-bridge.js',
        { cwd: ROOT, stdio: 'pipe' }
    );
    const sdkSize = fs.statSync(path.join(DIST_WEB, 'sdk-bridge.js')).size;
    console.log(`[빌드] src/main.js → dist/web/sdk-bridge.js (${(sdkSize / 1024).toFixed(1)}KB) - TossAds SDK 포함`);
} catch (err) {
    console.error('[오류] SDK 번들링 실패:', err.stderr?.toString() || err.message);
    process.exit(1);
}

// ============================================================
// 2단계: index.html 복사 (스크립트 참조 변환)
// ============================================================
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

// Vite용 모듈 참조를 번들된 SDK + app.js 직접 참조로 교체
// <script type="module" src="/src/main.js"> 
// → <script src="sdk-bridge.js"> + <script src="app.js">
html = html.replace(
    /<script type="module" src="\/src\/main\.js"><\/script>/,
    '<script src="sdk-bridge.js"></script>\n    <script src="app.js"></script>'
);

fs.writeFileSync(path.join(DIST_WEB, 'index.html'), html, 'utf-8');
console.log('[빌드] index.html → dist/web/index.html (SDK + app.js 이중 참조 변환 완료)');

// ============================================================
// 3단계: app.js 복사 (바닐라 JS - 번들링 불필요)
// ============================================================
const appSrc = path.join(ROOT, 'src', 'app.js');
if (fs.existsSync(appSrc)) {
    fs.copyFileSync(appSrc, path.join(DIST_WEB, 'app.js'));
    const size = fs.statSync(appSrc).size;
    console.log(`[빌드] src/app.js → dist/web/app.js (${(size / 1024).toFixed(1)}KB)`);
} else {
    console.error('[오류] src/app.js 파일이 존재하지 않습니다!');
    process.exit(1);
}

// ============================================================
// 4단계: 데이터 파일 복사
// ============================================================
const dataJs = path.join(ROOT, 'data.js');
if (fs.existsSync(dataJs)) {
    fs.copyFileSync(dataJs, path.join(DIST_WEB, 'data.js'));
    const size = fs.statSync(dataJs).size;
    console.log(`[빌드] data.js → dist/web/data.js (${(size / 1024 / 1024).toFixed(1)}MB)`);
}

const dataJson = path.join(ROOT, 'data.json');
if (fs.existsSync(dataJson)) {
    fs.copyFileSync(dataJson, path.join(DIST_WEB, 'data.json'));
    const size = fs.statSync(dataJson).size;
    console.log(`[빌드] data.json → dist/web/data.json (${(size / 1024 / 1024).toFixed(1)}MB)`);
}

// style.css 복사 (존재하면)
const styleCss = path.join(ROOT, 'style.css');
if (fs.existsSync(styleCss)) {
    fs.copyFileSync(styleCss, path.join(DIST_WEB, 'style.css'));
    console.log('[빌드] style.css → dist/web/style.css');
}

// public 폴더 내용 복사 (존재하면)
const publicDir = path.join(ROOT, 'public');
if (fs.existsSync(publicDir) && fs.statSync(publicDir).isDirectory()) {
    const files = fs.readdirSync(publicDir);
    files.forEach(f => {
        const src = path.join(publicDir, f);
        if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, path.join(DIST_WEB, f));
            console.log(`[빌드] public/${f} → dist/web/${f}`);
        }
    });
}

// ============================================================
// 5단계: 빌드 결과 검증
// ============================================================
console.log('\n[검증] dist/web/ 빌드 결과:');
const distFiles = fs.readdirSync(DIST_WEB);
distFiles.forEach(f => {
    const stat = fs.statSync(path.join(DIST_WEB, f));
    if (stat.isFile()) {
        const sizeStr = stat.size > 1024 * 1024
            ? `${(stat.size / 1024 / 1024).toFixed(1)}MB`
            : `${(stat.size / 1024).toFixed(1)}KB`;
        console.log(`  ✓ ${f} (${sizeStr})`);
    } else {
        console.log(`  📁 ${f}/`);
    }
});

// 검증 1: index.html에 sdk-bridge.js 참조가 존재하는지
const builtHtml = fs.readFileSync(path.join(DIST_WEB, 'index.html'), 'utf-8');
if (builtHtml.includes('<script src="sdk-bridge.js">') && builtHtml.includes('<script src="app.js">')) {
    console.log('\n✅ [검증 통과] index.html에 sdk-bridge.js + app.js 스크립트 참조 정상 존재');
} else {
    console.error('\n❌ [검증 실패] index.html에 스크립트 참조가 없습니다!');
    process.exit(1);
}

// 검증 2: sdk-bridge.js에 TossAds가 포함되어 있는지
const sdkBundle = fs.readFileSync(path.join(DIST_WEB, 'sdk-bridge.js'), 'utf-8');
if (sdkBundle.includes('TossAds') && sdkBundle.includes('attachBanner')) {
    console.log('✅ [검증 통과] sdk-bridge.js에 TossAds + attachBanner API 포함 확인');
} else {
    console.error('❌ [검증 실패] sdk-bridge.js에 TossAds API가 없습니다!');
    process.exit(1);
}

console.log('\n🎉 정적 빌드 완료! (SDK 브릿지 번들 포함)');
