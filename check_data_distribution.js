const fs = require('fs');
const path = require('path');

const src = 'C:\\럭포마_개발자료\\앱인토스\\공공데이터api연결\\data.json';
const dest = 'C:\\럭포마_개발자료\\앱인토스\\광고예상\\data.json';

// 복원 실행
fs.copyFileSync(src, dest);
console.log('Restored original data.json to work dir.');

// 데이터 통계 출력
const data = JSON.parse(fs.readFileSync(dest, 'utf-8'));
const keys = Object.keys(data);
console.log('Total days in dataset:', keys.filter(k => !k.startsWith('__')).length);
console.log('Has __barrier__:', !!data['__barrier__'], 'Count:', data['__barrier__'] ? data['__barrier__'].length : 0);
console.log('Has __pet__:', !!data['__pet__'], 'Count:', data['__pet__'] ? data['__pet__'].length : 0);

// 샘플 날짜 몇 개 로깅
const sampleDates = keys.filter(k => !k.startsWith('__')).slice(0, 10);
console.log('Sample dates distribution:');
sampleDates.forEach(d => {
  console.log(`  - ${d}: ${data[d].length} items`);
});
