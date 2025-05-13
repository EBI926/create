const { ipcRenderer } = require('electron');

const selectPdfsBtn = document.getElementById('select-pdfs');
const fileCountEl = document.getElementById('file-count');
const resultsSection = document.getElementById('results-section');
const processedCountEl = document.getElementById('processed-count');
const totalAmountEl = document.getElementById('total-amount');
const fileListEl = document.getElementById('file-list');

let selectedFiles = [];
let processedResults = [];

selectPdfsBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('select-pdfs');
  
  if (!result.canceled && result.filePaths.length > 0) {
    selectedFiles = result.filePaths;
    fileCountEl.textContent = `選択されたファイル: ${selectedFiles.length}`;
    
    resultsSection.classList.add('active');
    fileListEl.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>PDFファイルを処理中...</p>
      </div>
    `;
    
    processedResults = await ipcRenderer.invoke('process-pdfs', selectedFiles);
    
    updateResults(processedResults);
  }
});

function updateResults(results) {
  fileListEl.innerHTML = '';
  
  processedCountEl.textContent = results.length;
  
  const grandTotal = results.reduce((sum, file) => {
    return sum + (file.total || 0);
  }, 0);
  
  totalAmountEl.textContent = `¥${formatNumber(grandTotal)}`;
  
  results.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    if (file.error) {
      fileItem.innerHTML = `
        <div class="file-name">${file.filename}</div>
        <div class="file-error">エラー: ${file.error}</div>
      `;
    } else {
      fileItem.innerHTML = `
        <div class="file-name">${file.filename}</div>
        <div class="file-amount">合計: ¥${formatNumber(file.total)}</div>
        <div class="file-details">
          <small>検出された金額: ${file.amounts.map(a => `¥${formatNumber(a)}`).join(', ')}</small>
        </div>
      `;
    }
    
    fileListEl.appendChild(fileItem);
  });
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
