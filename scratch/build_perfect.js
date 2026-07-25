const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== 완벽한 정품 AIT 빌더 v3.5 가동 ===');

const projectRoot = path.resolve(__dirname, '..');
const backupDir = path.join(projectRoot, 'scratch');

// 1. 대용량 파일 격리 (Vite 컴파일 시작 시 OOM 차단)
const filesToHide = ['data.js', 'data.json'];
const backupPaths = {};

filesToHide.forEach(f => {
    const src = path.join(projectRoot, f);
    if (fs.existsSync(src)) {
        const dest = path.join(backupDir, f + '.bak');
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        fs.renameSync(src, dest);
        backupPaths[f] = dest;
        console.log(`  [격리] ${f} 임시 보관 완료`);
    }
});

// 2. 캐시 및 dist 초기 청소
const distDir = path.join(projectRoot, 'dist');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}

let buildSuccess = false;
try {
    console.log('\n[정품 빌드 시작] npx ait build 가동 (인터셉터 이식 주입)...');
    execSync('npx ait build', { cwd: projectRoot, stdio: 'inherit' });
    console.log('  ✅ 공식 정품 AIT 빌드 및 패키징 완료!');
    buildSuccess = true;
} catch (err) {
    console.error('  ❌ 빌드 및 패키징 실패:', err.message);
} finally {
    // 6. 루트의 대용량 원본 파일 복구
    console.log('\n[원상 복구] 루트 대용량 파일 복구...');
    filesToHide.forEach(f => {
        const src = backupPaths[f];
        if (src && fs.existsSync(src)) {
            const dest = path.join(projectRoot, f);
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            fs.renameSync(src, dest);
            console.log(`  [복구] ${f} 원래대로 복원`);
        }
    });
}

if (!buildSuccess) {
    process.exit(1);
}

// 7. 업로드 배포 시작
console.log('\n[배포] 토스 파트너 콘솔 전송 가동...');
const APP_NAME = 'govbenefit-hunter';
const DEPLOYMENT_ID = require('crypto').randomUUID(); 
const API_KEY = '5xZHDDQGkiFkDUG8_VR4DpiIiSEmsGKK8vlKIqPUH4U';
const BASE_URL = 'https://apps-in-toss.toss.im/console';
const AIT_PATH = path.join(projectRoot, `${APP_NAME}.ait`);

async function deploy() {
    const stat = fs.statSync(AIT_PATH);
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
    console.log(`  배포 버전명: ${packageJson.version}`);

    const startResp = await fetch(
        `${BASE_URL}/api-public/v3/openapi/bundles/${APP_NAME}/upload-start`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ deploymentId: DEPLOYMENT_ID, memo: `정부혜택달력 상용 정품 배포 - 버전 ${packageJson.version}` })
        }
    );

    if (!startResp.ok) {
        throw new Error(`upload-start 실패: ${await startResp.text()}`);
    }

    const startData = await startResp.json();
    const uploadUrl = startData.uploadUrl || (startData.success && startData.success.uploadUrl);
    if (!uploadUrl) {
        throw new Error(`uploadUrl 누락: ${JSON.stringify(startData)}`);
    }

    const fileStream = fs.createReadStream(AIT_PATH);
    const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/zip',
            'Content-Length': String(stat.size)
        },
        body: fileStream,
        duplex: 'half'
    });

    if (!uploadResp.ok) {
        throw new Error(`S3 업로드 실패: ${await uploadResp.text()}`);
    }

    const completeResp = await fetch(
        `${BASE_URL}/api-public/v3/openapi/bundles/${APP_NAME}/upload-complete`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ deploymentId: DEPLOYMENT_ID })
        }
    );

    if (!completeResp.ok) {
        throw new Error(`upload-complete 알림 실패: ${await completeResp.text()}`);
    }
    console.log(`\n🎉 100% 정품 규격 AIT 배포 성공! 버전 "${packageJson.version}" 콘솔 활성화 완료.`);
}

deploy().catch(err => {
    console.error('❌ 배포 실패:', err.message || err);
    process.exit(1);
});
