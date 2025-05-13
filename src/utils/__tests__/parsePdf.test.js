/**
 * PDF請求書からの金額抽出機能のユニットテスト
 */

const path = require('path');
const fs = require('fs');
const { extractAmountsFromPDF, extractAmounts, findPriorityAmount } = require('../parsePdf');

const TEST_PDF_DIR = path.join(__dirname, '../../../test/fixtures');

beforeAll(() => {
  if (!fs.existsSync(TEST_PDF_DIR)) {
    fs.mkdirSync(TEST_PDF_DIR, { recursive: true });
  }
  
  const pdfFiles = fs.readdirSync(TEST_PDF_DIR).filter(file => file.endsWith('.pdf'));
  if (pdfFiles.length === 0) {
    console.warn(`警告: ${TEST_PDF_DIR} にテスト用PDFファイルが見つかりません。`);
    console.warn('テストを実行するには、このディレクトリにPDFファイルを配置してください。');
  }
});

describe('extractAmountsFromPDF', () => {
  test('様々な金額表記パターンを正しく抽出できること', () => {
    const mockTextContent = [
      '請求書\n株式会社テスト\n請求金額: ¥123,456\n小計: ¥100,000\n消費税: ¥10,000',
      '明細\n商品A ¥50,000\n商品B ¥50,000\n値引き -¥5,000\n合計 ¥95,000'
    ];
    
    const extractedAmounts = extractAmounts(mockTextContent);
    
    expect(extractedAmounts).toBeDefined();
    expect(extractedAmounts.length).toBeGreaterThan(0);
    
    const amounts = extractedAmounts.map(a => a.amount);
    expect(amounts).toContain(123456); // 請求金額
    expect(amounts).toContain(100000); // 小計
    expect(amounts).toContain(10000);  // 消費税
    expect(amounts).toContain(50000);  // 商品A
    expect(amounts).toContain(50000);  // 商品B
    expect(amounts).toContain(-5000);  // 値引き
    expect(amounts).toContain(95000);  // 合計
    
    const priorityAmount = findPriorityAmount(extractedAmounts);
    expect(priorityAmount).toBe(123456); // 「請求金額」が優先されるべき
  });
  
  test.each([
    ['invoice1.pdf', { expectedTotal: 123456 }],
    ['invoice2.pdf', { expectedTotal: 98765 }],
    ['invoice3.pdf', { expectedTotal: 54321 }],
    ['invoice4.pdf', { expectedTotal: 12345 }],
    ['invoice5.pdf', { expectedTotal: 67890 }]
  ])('%s から正しく金額を抽出できること', async (filename, expected) => {
    const filePath = path.join(TEST_PDF_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      const result = await extractAmountsFromPDF(filePath);
      
      expect(result).toBeDefined();
      expect(result.amounts).toBeDefined();
      expect(result.amounts.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      
      if (expected.expectedTotal) {
        expect(result.total).toBe(expected.expectedTotal);
      }
    } else {
      console.warn(`スキップ: テストファイル ${filename} が見つかりません`);
    }
  });
  
  test('様々な金額表記パターンを正しく認識できること', () => {
    const patterns = [
      { text: '¥123,456', expected: 123456 },
      { text: '￥123,456', expected: 123456 },
      { text: 'JPY 123,456', expected: 123456 },
      { text: '123,456円', expected: 123456 },
      { text: '¥ 123,456', expected: 123456 },
      { text: '¥123,456.78', expected: 123456.78 },
      { text: '-¥5,000', expected: -5000 },
      { text: '値引き -5,000円', expected: -5000 }
    ];
    
    patterns.forEach(({ text, expected }) => {
      const result = extractAmounts([text]);
      
      expect(result.length).toBeGreaterThan(0);
      
      const hasExpectedAmount = result.some(item => Math.abs(item.amount - expected) < 0.01);
      expect(hasExpectedAmount).toBe(true);
    });
  });
  
  test('合計や請求金額などのラベルに近い金額が優先されること', () => {
    const text = [
      '商品A 10,000円\n商品B 20,000円\n小計 30,000円\n消費税 3,000円\n合計金額 33,000円',
      '請求書\n請求金額: 33,000円\n振込先: テスト銀行'
    ];
    
    const extractedAmounts = extractAmounts(text);
    const priorityAmount = findPriorityAmount(extractedAmounts);
    
    expect(priorityAmount).toBe(33000);
  });
});
