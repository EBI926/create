/**
 * PDF請求書から金額を抽出するユーティリティ
 * 
 * 様々な形式の金額表記に対応し、「合計」「Total」などのラベルに近い金額を優先的に抽出します。
 * 半角/全角、コンマ/ドット、改行を考慮したパース処理を行います。
 */

const fs = require('fs');
const pdfjsLib = require('pdfjs-dist');

pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js');

/**
 * PDF文書から金額を抽出する
 * @param {string} filePath - PDFファイルのパス
 * @returns {Promise<{amounts: number[], total: number}>} - 抽出された金額と合計
 */
async function extractAmountsFromPDF(filePath) {
  try {
    const data = new Uint8Array(await fs.promises.readFile(filePath));
    
    const pdfDocument = await pdfjsLib.getDocument({ data }).promise;
    
    const textByPage = await extractTextFromAllPages(pdfDocument);
    
    const extractedAmounts = extractAmounts(textByPage);
    
    const total = calculateTotal(extractedAmounts);
    
    return { 
      amounts: extractedAmounts.map(a => a.amount), 
      total,
      priorityAmount: findPriorityAmount(extractedAmounts)
    };
  } catch (error) {
    console.error('Error extracting amounts from PDF:', error);
    throw error;
  }
}

/**
 * PDFの全ページからテキストを抽出
 * @param {PDFDocument} pdfDocument - PDFドキュメント
 * @returns {Promise<string[]>} - ページごとのテキスト配列
 */
async function extractTextFromAllPages(pdfDocument) {
  const numPages = pdfDocument.numPages;
  const textByPage = [];
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    
    let lastY = null;
    let text = '';
    
    for (const item of textContent.items) {
      if (lastY !== null && lastY !== item.transform[5]) {
        text += '\n';
      } else if (text.length > 0 && !text.endsWith(' ')) {
        text += ' ';
      }
      
      text += item.str;
      lastY = item.transform[5];
    }
    
    textByPage.push(text);
  }
  
  return textByPage;
}

/**
 * テキストから金額を抽出
 * @param {string[]} textByPage - ページごとのテキスト配列
 * @returns {Array<{amount: number, context: string, priority: number}>} - 抽出された金額情報
 */
function extractAmounts(textByPage) {
  const extractedAmounts = [];
  
  const priorityLabels = [
    '合計', 'total', '総計', '請求金額', '金額', '小計', 'subtotal', 
    '総額', '総合計', 'sum', '総金額', '税込合計', '税込', '税込金額'
  ];
  
  const moneyRegexPatterns = [
    /(?:¥|￥|JPY)?\s*([-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)(?:\s*(?:円|$))?/gi,
    
    /([-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*円/gi,
    
    /([-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi
  ];
  
  textByPage.forEach((pageText, pageIndex) => {
    const lines = pageText.split('\n');
    
    lines.forEach((line, lineIndex) => {
      const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : '';
      const nextLine = lineIndex < lines.length - 1 ? lines[lineIndex + 1] : '';
      const context = [prevLine, line, nextLine].join(' ');
      
      for (const regex of moneyRegexPatterns) {
        let match;
        while ((match = regex.exec(line)) !== null) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseFloat(amountStr);
          
          if (!isNaN(amount)) {
            let priority = 0;
            
            for (const label of priorityLabels) {
              if (context.toLowerCase().includes(label.toLowerCase())) {
                const labelDistance = Math.min(
                  line.toLowerCase().indexOf(label.toLowerCase()) === -1 ? 1000 : 0,
                  prevLine.toLowerCase().indexOf(label.toLowerCase()) === -1 ? 100 : 10,
                  nextLine.toLowerCase().indexOf(label.toLowerCase()) === -1 ? 100 : 10
                );
                
                priority = Math.max(priority, 1000 - labelDistance);
              }
            }
            
            priority += Math.min(Math.abs(amount) / 1000, 100);
            
            if (pageIndex === textByPage.length - 1) {
              priority += 50;
            }
            
            extractedAmounts.push({
              amount,
              context: line.trim(),
              priority
            });
          }
        }
      }
    });
  });
  
  return extractedAmounts;
}

/**
 * 抽出された金額から合計を計算
 * @param {Array<{amount: number, context: string, priority: number}>} extractedAmounts - 抽出された金額情報
 * @returns {number} - 合計金額
 */
function calculateTotal(extractedAmounts) {
  const priorityAmount = findPriorityAmount(extractedAmounts);
  if (priorityAmount !== null) {
    return priorityAmount;
  }
  
  return extractedAmounts
    .filter(item => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);
}

/**
 * 優先度の最も高い金額を見つける
 * @param {Array<{amount: number, context: string, priority: number}>} extractedAmounts - 抽出された金額情報
 * @returns {number|null} - 優先度の最も高い金額、または見つからない場合はnull
 */
function findPriorityAmount(extractedAmounts) {
  if (extractedAmounts.length === 0) {
    return null;
  }
  
  const sortedAmounts = [...extractedAmounts].sort((a, b) => b.priority - a.priority);
  
  return sortedAmounts[0].amount;
}

module.exports = {
  extractAmountsFromPDF
};
