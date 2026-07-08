/**
 * build_ait_pure.js
 * 외부 npm 패키지 의존성 제로 — 순수 Node.js 내장 모듈만으로 .ait 바이너리를 직접 조립
 * 역공학 결과: AITBUNDL(8) + ver(4 BE) + flags(4) + proto_len(4 BE) + protobuf + zip_trailer(8) + ZIP
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

// === 설정 ===
const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'app.json'), 'utf-8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const appName = appJson.appName || packageJson.name || 'govbenefit-hunter';
const runtimeVersion = '0.84.0';
const sdkVersion = '2.10.1';
const createdBy = 'antigravity-pure-builder/2.0.0';

// === 파일 목록 정의 ===
const webAssets = ['index.html', 'app.js', 'style.css', 'data.js', 'data.json',
    'app_logo_main_1782592690933.png', 'icon.png'];
const nativeBundles = ['bundle.android.0_72_6.js', 'bundle.android.0_84_0.js',
    'bundle.android.js', 'bundle.ios.0_72_6.js', 'bundle.ios.0_84_0.js', 'bundle.ios.js'];

// === Protobuf 인코딩 유틸리티 ===
function encodeVarint(val) {
    const bytes = [];
    val = Number(val);
    if (val < 0) val = 0;
    do {
        let b = val & 0x7f;
        val = Math.floor(val / 128);
        if (val > 0) b |= 0x80;
        bytes.push(b);
    } while (val > 0);
    return Buffer.from(bytes);
}

function encodeTag(fieldNum, wireType) {
    return encodeVarint((fieldNum << 3) | wireType);
}

function encodeString(fieldNum, str) {
    const data = Buffer.from(str, 'utf-8');
    return Buffer.concat([encodeTag(fieldNum, 2), encodeVarint(data.length), data]);
}

function encodeBytes(fieldNum, buf) {
    return Buffer.concat([encodeTag(fieldNum, 2), encodeVarint(buf.length), buf]);
}

function encodeVarintField(fieldNum, val) {
    return Buffer.concat([encodeTag(fieldNum, 0), encodeVarint(val)]);
}

function encodeMessage(fieldNum, innerBuf) {
    return Buffer.concat([encodeTag(fieldNum, 2), encodeVarint(innerBuf.length), innerBuf]);
}

// === package.json을 protobuf 구조로 인코딩 ===
function encodeJsonValue(val) {
    if (typeof val === 'string') {
        return encodeString(3, val);
    } else if (typeof val === 'number') {
        // double로 인코딩 (field 2, wire type 1 = fixed64/double)
        const buf = Buffer.alloc(8);
        buf.writeDoubleBE(val, 0);
        return Buffer.concat([encodeTag(2, 1), buf]);
    } else if (typeof val === 'boolean') {
        return encodeVarintField(4, val ? 1 : 0);
    } else if (typeof val === 'object' && val !== null) {
        return encodeJsonObject(val);
    }
    return Buffer.alloc(0);
}

function encodeJsonObject(obj) {
    if (Array.isArray(obj)) {
        // 배열: field 5 반복
        const parts = [];
        for (const item of obj) {
            const encoded = encodeJsonValue(item);
            parts.push(encodeMessage(5, encoded));
        }
        return Buffer.concat(parts);
    }
    // 객체: field 5 (map)
    const entries = [];
    for (const [key, value] of Object.entries(obj)) {
        const keyBuf = encodeString(1, key);
        const valBuf = encodeJsonValue(value);
        const entryBuf = Buffer.concat([keyBuf, encodeMessage(2, valBuf)]);
        entries.push(encodeMessage(1, entryBuf));
    }
    const mapBuf = Buffer.concat(entries);
    return encodeMessage(5, mapBuf);
}

// === 파일 엔트리 protobuf 인코딩 ===
function encodeFileEntry(fileName, fileSize, sha256Hex) {
    // field 1: 파일명 (string)
    // field 4: 크기 (varint)
    // field 5: 타입 (varint, 8)
    // field 6: SHA256 해시 (string, hex)
    const parts = [
        encodeString(1, fileName),
        encodeVarintField(4, fileSize),
        encodeVarintField(5, 8),
        encodeString(6, sha256Hex)
    ];
    return Buffer.concat(parts);
}

// === ZIP 아카이브 생성 (Node.js 내장 zlib만 사용) ===
function createZipArchive(files) {
    // files: [{name, data}]
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const file of files) {
        const nameBytes = Buffer.from(file.name, 'utf-8');
        const compressed = zlib.deflateRawSync(file.data, { level: 6 });
        const crc = crc32(file.data);
        const compressedSize = compressed.length;
        const uncompressedSize = file.data.length;

        // 로컬 파일 헤더
        const localHeader = Buffer.alloc(30 + nameBytes.length);
        localHeader.writeUInt32LE(0x04034b50, 0);  // PK\x03\x04
        localHeader.writeUInt16LE(20, 4);           // 버전
        localHeader.writeUInt16LE(0, 6);            // 플래그
        localHeader.writeUInt16LE(8, 8);            // 압축 (deflate)
        localHeader.writeUInt16LE(0, 10);           // 수정 시간
        localHeader.writeUInt16LE(0, 12);           // 수정 날짜
        localHeader.writeUInt32LE(crc, 14);         // CRC32
        localHeader.writeUInt32LE(compressedSize, 18);
        localHeader.writeUInt32LE(uncompressedSize, 22);
        localHeader.writeUInt16LE(nameBytes.length, 26);
        localHeader.writeUInt16LE(0, 28);           // 추가 필드 길이
        nameBytes.copy(localHeader, 30);

        const localEntry = Buffer.concat([localHeader, compressed]);
        localHeaders.push(localEntry);

        // 중앙 디렉토리 헤더
        const centralHeader = Buffer.alloc(46 + nameBytes.length);
        centralHeader.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
        centralHeader.writeUInt16LE(20, 4);          // 만든 버전
        centralHeader.writeUInt16LE(20, 6);          // 필요 버전
        centralHeader.writeUInt16LE(0, 8);           // 플래그
        centralHeader.writeUInt16LE(8, 10);          // 압축
        centralHeader.writeUInt16LE(0, 12);          // 시간
        centralHeader.writeUInt16LE(0, 14);          // 날짜
        centralHeader.writeUInt32LE(crc, 16);
        centralHeader.writeUInt32LE(compressedSize, 20);
        centralHeader.writeUInt32LE(uncompressedSize, 24);
        centralHeader.writeUInt16LE(nameBytes.length, 28);
        centralHeader.writeUInt16LE(0, 30);          // 추가 필드
        centralHeader.writeUInt16LE(0, 32);          // 파일 코멘트
        centralHeader.writeUInt16LE(0, 34);          // 디스크 번호
        centralHeader.writeUInt16LE(0, 36);          // 내부 속성
        centralHeader.writeUInt32LE(0, 38);          // 외부 속성
        centralHeader.writeUInt32LE(offset, 42);     // 로컬 헤더 오프셋
        nameBytes.copy(centralHeader, 46);

        centralHeaders.push(centralHeader);
        offset += localEntry.length;
    }

    // 중앙 디렉토리
    const centralDir = Buffer.concat(centralHeaders);
    const centralDirOffset = offset;
    const centralDirSize = centralDir.length;

    // EOCD (End of Central Directory)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);  // PK\x05\x06
    eocd.writeUInt16LE(0, 4);            // 디스크 번호
    eocd.writeUInt16LE(0, 6);            // 시작 디스크
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralDirSize, 12);
    eocd.writeUInt32LE(centralDirOffset, 16);
    eocd.writeUInt16LE(0, 20);           // 코멘트 길이

    return Buffer.concat([...localHeaders, centralDir, eocd]);
}

// === CRC32 구현 ===
function crc32(buf) {
    let crc = 0xFFFFFFFF;
    if (!crc32.table) {
        crc32.table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            crc32.table[i] = c;
        }
    }
    for (let i = 0; i < buf.length; i++) {
        crc = crc32.table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// === 메인 빌드 함수 ===
async function build() {
    console.log('=== 순수 Node.js AIT 빌더 v2.0 시작 ===');
    console.log('앱 이름:', appName);

    const deploymentId = crypto.randomUUID();
    console.log('배포 ID:', deploymentId);

    // 1. 파일 수집 및 해시 계산
    const fileEntries = [];
    const zipFiles = [];
    let totalSize = 0;

    for (const file of webAssets) {
        const fp = path.join(__dirname, file);
        if (!fs.existsSync(fp)) { console.warn(`  ⚠️ 스킵: ${file}`); continue; }
        const data = fs.readFileSync(fp);
        const hash = crypto.createHash('sha256').update(data).digest('hex');

        // 루트 + web/ 더블마운트
        fileEntries.push({ name: file, size: data.length, hash });
        fileEntries.push({ name: `web/${file}`, size: data.length, hash });
        zipFiles.push({ name: file, data });
        zipFiles.push({ name: `web/${file}`, data });
        totalSize += data.length * 2;
        console.log(`  ✅ ${file} (${(data.length / 1024).toFixed(1)} KB)`);
    }

    for (const bundle of nativeBundles) {
        const fp = path.join(__dirname, bundle);
        if (!fs.existsSync(fp)) continue;
        const data = fs.readFileSync(fp);
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        fileEntries.push({ name: bundle, size: data.length, hash });
        zipFiles.push({ name: bundle, data });
        totalSize += data.length;
        console.log(`  ✅ ${bundle} (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
    }

    console.log(`\n총 ${fileEntries.length}개 엔트리, ${(totalSize / 1024 / 1024).toFixed(1)} MB`);

    // 2. Protobuf 메시지 조립
    const protoParts = [];

    // field 1: 플랫폼 (WEB = 1)
    protoParts.push(encodeVarintField(1, 1));

    // field 2: deploymentId
    protoParts.push(encodeString(2, deploymentId));

    // field 3: appName
    protoParts.push(encodeString(3, appName));

    // field 4: metadata
    const metaParts = [];
    metaParts.push(encodeVarintField(2, 1)); // isGame = false? or platform
    metaParts.push(encodeString(3, runtimeVersion));
    // field 5: packageJson 인코딩
    const pkgParts = [];
    for (const [key, value] of Object.entries(packageJson)) {
        const keyBuf = encodeString(1, key);
        const valBuf = encodeJsonValue(value);
        const entryBuf = Buffer.concat([keyBuf, encodeMessage(2, valBuf)]);
        pkgParts.push(encodeMessage(1, entryBuf));
    }
    metaParts.push(encodeMessage(5, Buffer.concat(pkgParts)));
    metaParts.push(encodeString(6, '')); // bundleFiles empty
    metaParts.push(encodeString(7, sdkVersion));
    protoParts.push(encodeMessage(4, Buffer.concat(metaParts)));

    // field 6: 파일 엔트리들 (반복)
    for (const entry of fileEntries) {
        const entryBuf = encodeFileEntry(entry.name, entry.size, entry.hash);
        protoParts.push(encodeMessage(6, entryBuf));
    }

    // field 7: createdBy
    protoParts.push(encodeString(7, createdBy));

    // field 8: timestamp (Unix seconds)
    protoParts.push(encodeVarintField(8, Math.floor(Date.now() / 1000)));

    const protoMsg = Buffer.concat(protoParts);
    console.log(`프로토 메시지 크기: ${protoMsg.length} bytes`);

    // 3. ZIP 아카이브 생성
    console.log('ZIP 아카이브 생성 중...');
    const zipData = createZipArchive(zipFiles);
    console.log(`ZIP 크기: ${(zipData.length / 1024 / 1024).toFixed(1)} MB`);

    // 4. 최종 AIT 바이너리 조립
    // [AITBUNDL 8][version BE32][flags BE32][proto_len BE32][protobuf][zip_trailer 8][ZIP]
    const magic = Buffer.from('AITBUNDL', 'ascii');
    const version = Buffer.alloc(4);
    version.writeUInt32BE(1, 0);
    const flags = Buffer.alloc(4);
    flags.writeUInt32BE(0, 0);
    const protoLen = Buffer.alloc(4);
    protoLen.writeUInt32BE(protoMsg.length, 0);

    // ZIP 트레일러: 4바이트 패딩(0) + 4바이트 ZIP 크기 (BE)
    const zipTrailer = Buffer.alloc(8);
    zipTrailer.writeUInt32BE(0, 0);
    zipTrailer.writeUInt32BE(zipData.length, 4);

    const aitBuffer = Buffer.concat([magic, version, flags, protoLen, protoMsg, zipTrailer, zipData]);

    const outputPath = path.join(__dirname, `${appName}.ait`);
    fs.writeFileSync(outputPath, aitBuffer);
    console.log(`\n🎉 빌드 성공: ${outputPath}`);
    console.log(`   전체 크기: ${(aitBuffer.length / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   헤더: ${20 + protoMsg.length + 8} bytes`);
    console.log(`   ZIP: ${zipData.length} bytes`);

    // 5. 검증: ZIP 매직 바이트 확인
    const zipOffset = 20 + protoMsg.length + 8;
    const zipMagic = aitBuffer.slice(zipOffset, zipOffset + 4).toString('hex');
    if (zipMagic === '504b0304') {
        console.log('✅ ZIP 매직 바이트 검증 통과');
    } else {
        console.error('❌ ZIP 매직 바이트 검증 실패:', zipMagic);
        process.exit(1);
    }

    return outputPath;
}

build().catch(err => { console.error('❌ 빌드 실패:', err); process.exit(1); });
