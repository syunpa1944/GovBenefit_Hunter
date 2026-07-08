/**
 * trigger_deploy_pure.js
 * 외부 npm 패키지 없이 Node.js 내장 fetch만으로 토스 파트너 콘솔 배포
 * API 플로우: upload-start → PUT 업로드 → upload-complete → 상태 폴링
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// === 설정 ===
const APP_NAME = 'govbenefit-hunter';
const API_KEY = '5xZHDDQGkiFkDUG8_VR4DpiIiSEmsGKK8vlKIqPUH4U';
const BASE_URL = 'https://apps-in-toss.toss.im/console';
const AIT_PATH = path.resolve(__dirname, `${APP_NAME}.ait`);
const MEMO = '정부혜택달력 자동 빌드 배포';

async function deploy() {
    console.log('=== 토스 파트너 콘솔 배포 시작 ===');

    // .ait 파일 존재 확인
    if (!fs.existsSync(AIT_PATH)) {
        throw new Error(`AIT 파일 없음: ${AIT_PATH}`);
    }
    const stat = fs.statSync(AIT_PATH);
    console.log(`AIT 파일: ${AIT_PATH} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);

    const deploymentId = crypto.randomUUID();
    console.log(`배포 ID: ${deploymentId}`);

    // 1단계: upload-start
    console.log('\n[1/4] 업로드 시작 요청...');
    const startResp = await fetch(
        `${BASE_URL}/api-public/v3/openapi/bundles/${APP_NAME}/upload-start`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ deploymentId, memo: MEMO })
        }
    );

    if (!startResp.ok) {
        const errText = await startResp.text();
        throw new Error(`upload-start 실패 (${startResp.status}): ${errText}`);
    }

    const startData = await startResp.json();
    console.log('  ✅ 업로드 URL 수신 완료');

    if (!startData.uploadUrl) {
        throw new Error('uploadUrl 누락: ' + JSON.stringify(startData));
    }

    // 2단계: 파일 업로드
    console.log('\n[2/4] AIT 파일 업로드 중...');
    const fileStream = fs.createReadStream(AIT_PATH);
    const uploadResp = await fetch(startData.uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/zip',
            'Content-Length': String(stat.size)
        },
        body: fileStream,
        duplex: 'half'
    });

    if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        throw new Error(`파일 업로드 실패 (${uploadResp.status}): ${errText}`);
    }
    console.log('  ✅ 파일 업로드 완료');

    // 3단계: upload-complete
    console.log('\n[3/4] 업로드 완료 알림...');
    const completeResp = await fetch(
        `${BASE_URL}/api-public/v3/openapi/bundles/${APP_NAME}/upload-complete`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ deploymentId })
        }
    );

    if (!completeResp.ok) {
        const errText = await completeResp.text();
        throw new Error(`upload-complete 실패 (${completeResp.status}): ${errText}`);
    }
    console.log('  ✅ 업로드 완료 확인됨');

    // 4단계: 번들 상태 확인 (최대 10회 폴링)
    console.log('\n[4/4] 번들 처리 상태 확인...');
    const MAX_RETRIES = 10;
    let delay = 3000;

    for (let i = 0; i < MAX_RETRIES; i++) {
        await new Promise(r => setTimeout(r, delay));
        
        const statusResp = await fetch(
            `${BASE_URL}/api-public/v3/openapi/bundles/${APP_NAME}/status?deploymentId=${deploymentId}`,
            {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            }
        );

        if (statusResp.ok) {
            const statusData = await statusResp.json();
            console.log(`  폴링 ${i + 1}/${MAX_RETRIES}: ${JSON.stringify(statusData)}`);

            if (statusData.status === 'COMPLETED' || statusData.status === 'SUCCESS' || statusData.status === 'READY') {
                console.log('\n🎉 배포 완료!');
                return;
            }
            if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
                throw new Error(`번들 처리 실패: ${JSON.stringify(statusData)}`);
            }
        } else {
            console.log(`  폴링 ${i + 1}/${MAX_RETRIES}: HTTP ${statusResp.status} — 재시도`);
        }

        delay = Math.min(delay * 1.5, 15000);
    }

    console.log('⚠️ 상태 폴링 타임아웃 — 업로드 자체는 완료. 콘솔에서 수동 확인 필요');
}

deploy().catch(err => {
    console.error('❌ 배포 실패:', err.message || err);
    process.exit(1);
});
