/* ==========================================================================
   📊 DATA MASTER DASHBOARD 비즈니스 로직 (JavaScript)
   ========================================================================== */

let rawData = [];
let filteredData = [];

// 페이징 설정
let currentPage = 1;
const itemsPerPage = 15;

// Chart.js 인스턴스 보관
let chartRegionsInstance = null;
let chartTagsInstance = null;

// 시도별 군구 매핑용
const areaMap = {};

// DOM 요소 캐시
const DOM = {
  valTotal: document.getElementById('val-total'),
  valCurrentMonth: document.getElementById('val-current-month'),
  valRegions: document.getElementById('val-regions'),
  filteredCount: document.getElementById('filtered-count'),
  tableBody: document.getElementById('table-body'),
  filterSearch: document.getElementById('filter-search'),
  filterSido: document.getElementById('filter-sido'),
  filterGugun: document.getElementById('filter-gugun'),
  filterType: document.getElementById('filter-type'),
  paginationControls: document.getElementById('pagination-controls'),
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnRawView: document.getElementById('btn-raw-view')
};

// ==========================================================================
// 1. 데이터 로더 & 초기화
// ==========================================================================

window.addEventListener('DOMContentLoaded', async () => {
  setupFileUploader();
  setupEventListeners();

  // 1순위: 로컬 서버 상의 data.json 비동기 로드 시도
  try {
    const response = await fetch('../data.json');
    if (response.ok) {
      const data = await response.json();
      loadData(data);
    } else {
      showEmptyMessage('로컬 data.json 파일을 찾을 수 없습니다. 파일을 드래그하여 올려주세요.');
    }
  } catch (e) {
    showEmptyMessage('로컬 data.json 로드 실패. 파일을 수동으로 업로드하여 분석할 수 있습니다.');
  }
});

// 파일 드래그앤드롭 업로더 세팅
function setupFileUploader() {
  DOM.dropZone.addEventListener('click', () => DOM.fileInput.click());
  DOM.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  DOM.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.add('dragover');
  });

  DOM.dropZone.addEventListener('dragleave', () => {
    DOM.dropZone.classList.remove('dragover');
  });

  DOM.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
}

function handleFile(file) {
  if (!file.name.endsWith('.json')) {
    alert('JSON 확장자 파일만 업로드할 수 있습니다.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      loadData(data);
    } catch (err) {
      alert('유효하지 않은 JSON 파일 포맷입니다.');
    }
  };
  reader.readAsText(file);
}

// ==========================================================================
// 2. 핵심 데이터 파싱 및 바인딩
// ==========================================================================

function loadData(data) {
  // data.js 의 변수 래핑 형식(benefitsList 등)인지 검사
  if (Array.isArray(data)) {
    rawData = data;
  } else if (data && Array.isArray(data.benefitsList)) {
    rawData = data.benefitsList;
  } else if (data && typeof data === 'object') {
    // 혹시 다른 키 이름에 배열이 들어있는 경우 탐색
    const possibleArrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
    rawData = possibleArrayKey ? data[possibleArrayKey] : [];
  } else {
    rawData = [];
  }

  if (rawData.length === 0) {
    showEmptyMessage('수집된 데이터 리스트가 비어있습니다.');
    return;
  }

  // 데이터 전처리: 날짜 포맷 변환 및 고유 지역 필터 구성
  preprocessData();

  // 지표 업데이트
  updateMetrics();

  // 지역 드롭다운 메뉴 갱신
  populateDropdownFilters();

  // 차트 렌더링
  renderCharts();

  // 필터링 적용 및 테이블 렌더링
  applyFilters();
}

function preprocessData() {
  // 지역 맵 빌딩 및 시도/구군 파싱
  rawData.forEach(item => {
    // sido, gugun이 누락되었을 때의 기본값 처리
    const sido = item.sido || '전국';
    const gugun = item.gugun || '공통';

    if (!areaMap[sido]) {
      areaMap[sido] = new Set();
    }
    if (gugun && gugun !== '공통') {
      areaMap[sido].add(gugun);
    }

    // 분류 타입 자동 추론 (축제 vs 혜택)
    if (!item.type) {
      item.type = (item.title?.includes('축제') || item.title?.includes('페스티벌') || item.title?.includes('물놀이장')) ? '축제' : '혜택';
    }
  });
}

function updateMetrics() {
  DOM.valTotal.innerText = `${rawData.length.toLocaleString()}건`;

  // 현재 월 기준 예정 일정 계산
  const today = new Date();
  const currentMonthStr = `${today.getMonth() + 1}`.padStart(2, '0');
  const currentMonthEvents = rawData.filter(item => {
    if (!item.start) return false;
    return item.start.includes(`-${currentMonthStr}-`) || item.start.startsWith(currentMonthStr);
  });
  DOM.valCurrentMonth.innerText = `${currentMonthEvents.length.toLocaleString()}건`;

  // 고유 시도 개수
  const uniqueSidoCount = Object.keys(areaMap).filter(s => s !== '전국').length;
  DOM.valRegions.innerText = `${uniqueSidoCount}개 광역지구`;
}

function populateDropdownFilters() {
  // 시도 드롭다운 구성
  DOM.filterSido.innerHTML = '<option value="">시/도 전체</option>';
  Object.keys(areaMap).sort().forEach(sido => {
    if (sido !== '전국') {
      DOM.filterSido.innerHTML += `<option value="${sido}">${sido}</option>`;
    }
  });

  DOM.filterGugun.innerHTML = '<option value="">시/군/구 전체</option>';
  DOM.filterGugun.disabled = true;
}

// 시도 변경 시 구군 동적 업데이트
DOM.filterSido.addEventListener('change', (e) => {
  const selectedSido = e.target.value;
  DOM.filterGugun.innerHTML = '<option value="">시/군/구 전체</option>';

  if (selectedSido && areaMap[selectedSido] && areaMap[selectedSido].size > 0) {
    DOM.filterGugun.disabled = false;
    Array.from(areaMap[selectedSido]).sort().forEach(gugun => {
      DOM.filterGugun.innerHTML += `<option value="${gugun}">${gugun}</option>`;
    });
  } else {
    DOM.filterGugun.disabled = true;
  }
  applyFilters();
});

// ==========================================================================
// 3. 실시간 다차원 필터링 & 그리드 테이블
// ==========================================================================

function setupEventListeners() {
  DOM.filterSearch.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  DOM.filterGugun.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  DOM.filterType.addEventListener('change', () => { currentPage = 1; applyFilters(); });

  // 내보내기 버튼 바인딩
  DOM.btnExportCsv.addEventListener('click', exportToCSV);
  DOM.btnExportJson.addEventListener('click', exportToJSON);

  // 원천 데이터 뷰어 토글
  DOM.btnRawView.addEventListener('click', () => {
    if (rawData.length === 0) return;
    const jsonStr = JSON.stringify(rawData, null, 2);
    const win = window.open();
    win.document.write(`<pre style="background:#0d1117;color:#c9d1d9;padding:20px;font-family:monospace;">${jsonStr}</pre>`);
  });
}

function applyFilters() {
  const searchQuery = DOM.filterSearch.value.trim().toLowerCase();
  const selectedSido = DOM.filterSido.value;
  const selectedGugun = DOM.filterGugun.value;
  const selectedType = DOM.filterType.value;

  filteredData = rawData.filter(item => {
    // 1. 검색어 필터
    if (searchQuery) {
      const matchTitle = item.title?.toLowerCase().includes(searchQuery);
      const matchDesc = item.desc?.toLowerCase().includes(searchQuery);
      const matchTags = item.tags?.some(t => t.toLowerCase().includes(searchQuery));
      const matchSido = item.sido?.toLowerCase().includes(searchQuery);
      const matchGugun = item.gugun?.toLowerCase().includes(searchQuery);
      if (!matchTitle && !matchDesc && !matchTags && !matchSido && !matchGugun) {
        return false;
      }
    }

    // 2. 지역 필터
    if (selectedSido && item.sido !== selectedSido) return false;
    if (selectedGugun && item.gugun !== selectedGugun) return false;

    // 3. 타입 필터
    if (selectedType && item.type !== selectedType) return false;

    return true;
  });

  DOM.filteredCount.innerText = `${filteredData.length.toLocaleString()}건 필터됨`;
  renderTable();
}

function renderTable() {
  DOM.tableBody.innerHTML = '';

  if (filteredData.length === 0) {
    DOM.tableBody.innerHTML = `<tr><td colspan="6" class="table-empty">조건에 만족하는 데이터가 존재하지 않습니다.</td></tr>`;
    DOM.paginationControls.innerHTML = '';
    return;
  }

  // 페이징 계산
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const pageData = filteredData.slice(startIndex, endIndex);

  pageData.forEach(item => {
    const region = `${item.sido || ''} ${item.gugun || ''}`.trim() || '전국';
    const title = item.title || '제목 없음';
    const start = item.start || '-';
    const end = item.end || '-';
    const typeClass = item.type === '축제' ? 'festival' : 'benefit';
    const typeLabel = item.type === '축제' ? '🎡 축제' : '🎁 혜택';

    // 태그 리스트
    const tagsHtml = (item.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
    const descSummary = item.desc ? `<span class="desc-summary">${item.desc.substring(0, 75)}${item.desc.length > 75 ? '...' : ''}</span>` : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${region}</strong></td>
      <td><span style="font-weight:600;color:#ffffff;">${title}</span></td>
      <td><span style="color:#a5c7ff;font-family:monospace;">${start}</span></td>
      <td><span style="color:#ff8a8a;font-family:monospace;">${end}</span></td>
      <td><span class="type-badge ${typeClass}">${typeLabel}</span></td>
      <td>
        <div style="max-height: 80px; overflow: hidden; text-overflow: ellipsis;">
          ${tagsHtml}
          ${descSummary}
        </div>
      </td>
    `;
    DOM.tableBody.appendChild(tr);
  });

  renderPaginationControls();
}

function renderPaginationControls() {
  DOM.paginationControls.innerHTML = '';
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  if (totalPages <= 1) return;

  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  // 이전 버튼
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; renderTable(); };
  DOM.paginationControls.appendChild(prevBtn);

  // 페이지 번호 버튼
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    btn.innerText = i;
    btn.onclick = () => { currentPage = i; renderTable(); };
    DOM.paginationControls.appendChild(btn);
  }

  // 다음 버튼
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => { currentPage++; renderTable(); };
  DOM.paginationControls.appendChild(nextBtn);
}

function showEmptyMessage(msg) {
  DOM.tableBody.innerHTML = `<tr><td colspan="6" class="table-empty">${msg}</td></tr>`;
}

// ==========================================================================
// 4. Chart.js 통계 시각화
// ==========================================================================

function renderCharts() {
  // 1) 지역분포 카운팅
  const regionCounts = {};
  rawData.forEach(item => {
    const sido = item.sido || '전국';
    regionCounts[sido] = (regionCounts[sido] || 0) + 1;
  });

  // 정렬 후 상위 6개 선정, 나머지는 '기타' 합산
  const sortedRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]);
  const chartLabels = [];
  const chartData = [];
  let otherSum = 0;

  sortedRegions.forEach(([region, count], idx) => {
    if (idx < 6) {
      chartLabels.push(region);
      chartData.push(count);
    } else {
      otherSum += count;
    }
  });
  if (otherSum > 0) {
    chartLabels.push('기타');
    chartData.push(otherSum);
  }

  // 지역 분포 차트 빌딩
  if (chartRegionsInstance) chartRegionsInstance.destroy();
  const ctxRegions = document.getElementById('chart-regions').getContext('2d');
  chartRegionsInstance = new Chart(ctxRegions, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: [
          '#0064ff', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#4b5563'
        ],
        borderWidth: 1,
        borderColor: '#1f2937'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#9ca3af', font: { size: 11 } }
        }
      }
    }
  });

  // 2) 카테고리/태그 빈도 분석
  const tagCounts = {};
  rawData.forEach(item => {
    (item.tags || []).forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const tagLabels = sortedTags.map(([tag]) => `#${tag}`);
  const tagValues = sortedTags.map(([, count]) => count);

  // 태그 빈도 컬럼 차트 빌딩
  if (chartTagsInstance) chartTagsInstance.destroy();
  const ctxTags = document.getElementById('chart-tags').getContext('2d');
  chartTagsInstance = new Chart(ctxTags, {
    type: 'bar',
    data: {
      labels: tagLabels,
      datasets: [{
        label: '태그 수집 빈도',
        data: tagValues,
        backgroundColor: 'rgba(0, 100, 255, 0.45)',
        borderColor: '#0064ff',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { size: 10 } } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// ==========================================================================
// 5. 자료 파일 내보내기 모듈 (한글 깨짐 방지 CSV Exporter)
// ==========================================================================

function exportToCSV() {
  if (filteredData.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  // CSV 헤더 컬럼
  const headers = ['시도', '시군구', '일정명', '시작일', '종료일', '타입', '상세 설명', '태그목록'];
  
  const csvRows = [headers.join(',')];

  filteredData.forEach(item => {
    const row = [
      escapeCSV(item.sido || ''),
      escapeCSV(item.gugun || ''),
      escapeCSV(item.title || ''),
      escapeCSV(item.start || ''),
      escapeCSV(item.end || ''),
      escapeCSV(item.type || ''),
      escapeCSV(item.desc || ''),
      escapeCSV((item.tags || []).join(';'))
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\r\n');
  
  // ⭐️ 엑셀 한글 깨짐 방지 핵심: UTF-8 BOM 바이트 헤더 주입 (EF BB BF)
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `정부혜택달력_수집현황_자료_${getTodayString()}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportToJSON() {
  if (filteredData.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }
  const jsonStr = JSON.stringify(filteredData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `정부혜택달력_필터자료_${getTodayString()}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// CSV 특수 문자 escape 유틸 함수
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // 줄바꿈, 쉼표, 쌍따옴표가 포함된 경우
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    str = str.replace(/"/g, '""'); // 쌍따옴표 이중화
    return `"${str}"`;
  }
  return str;
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
