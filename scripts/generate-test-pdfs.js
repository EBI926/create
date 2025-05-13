/**
 * テスト用PDF生成スクリプト
 * 
 * このスクリプトは、テスト用のPDFファイルを生成します。
 * PDFKitを使用してPDFを生成し、test/fixturesディレクトリに保存します。
 * 
 * 使用方法:
 * 1. npm install pdfkit --save-dev
 * 2. node scripts/generate-test-pdfs.js
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUTPUT_DIR = path.join(__dirname, '../test/fixtures');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function generateTestPDF(filename, content) {
  const doc = new PDFDocument();
  const outputPath = path.join(OUTPUT_DIR, filename);
  
  doc.pipe(fs.createWriteStream(outputPath));
  
  content.forEach((item, index) => {
    if (index > 0) {
      doc.addPage();
    }
    
    doc.fontSize(16).text(item.title, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(item.company);
    doc.moveDown();
    
    doc.text(item.date);
    doc.moveDown(2);
    
    item.items.forEach(lineItem => {
      doc.text(lineItem);
      doc.moveDown(0.5);
    });
    
    doc.moveDown();
    
    doc.fontSize(14).text(item.total, { align: 'right' });
    
    if (item.notes) {
      doc.moveDown();
      doc.fontSize(10).text(item.notes);
    }
  });
  
  doc.end();
  
  console.log(`Generated: ${outputPath}`);
}

const testPDFs = [
  {
    filename: 'invoice1.pdf',
    content: [
      {
        title: '請求書',
        company: '株式会社テスト',
        date: '2025年5月13日',
        items: [
          '商品A ¥50,000',
          '商品B ¥40,000',
          '送料 ¥1,000',
          '値引き -¥5,000',
          '消費税 (10%) ¥8,600'
        ],
        total: '合計: ¥94,600',
        notes: '※お支払いは請求書発行日より30日以内にお願いします。'
      }
    ]
  },
  {
    filename: 'invoice2.pdf',
    content: [
      {
        title: 'INVOICE',
        company: 'Test Corporation',
        date: 'May 13, 2025',
        items: [
          'Product A JPY 30,000',
          'Product B JPY 25,000',
          'Shipping JPY 2,000',
          'Tax (10%) JPY 5,700'
        ],
        total: 'Total: JPY 62,700',
        notes: 'Payment due within 30 days.'
      }
    ]
  },
  {
    filename: 'invoice3.pdf',
    content: [
      {
        title: '請求書',
        company: '株式会社サンプル',
        date: '2025年5月13日',
        items: [
          'サービスA 50,000円',
          'サービスB 30,000円',
          '消費税 8,000円'
        ],
        total: '請求金額: 88,000円',
        notes: '銀行振込でのお支払いをお願いいたします。'
      }
    ]
  },
  {
    filename: 'invoice4.pdf',
    content: [
      {
        title: '見積書',
        company: 'テスト株式会社',
        date: '2025年5月13日',
        items: [
          '商品A ￥20,000',
          '商品B ￥15,000',
          '商品C ￥10,000',
          '消費税 ￥4,500'
        ],
        total: '見積金額: ￥49,500',
        notes: 'この見積もりの有効期限は発行日から14日間です。'
      },
      {
        title: '明細',
        company: 'テスト株式会社',
        date: '2025年5月13日',
        items: [
          '商品A: 2個 x ￥10,000 = ￥20,000',
          '商品B: 1個 x ￥15,000 = ￥15,000',
          '商品C: 1個 x ￥10,000 = ￥10,000'
        ],
        total: '小計: ￥45,000',
        notes: '消費税: ￥4,500'
      }
    ]
  },
  {
    filename: 'invoice5.pdf',
    content: [
      {
        title: '請求書',
        company: 'サンプル株式会社',
        date: '2025年5月13日',
        items: [
          '月額サービス利用料 ¥30,000',
          'オプションA ¥5,000',
          'オプションB ¥8,000',
          '早期割引 -¥3,000',
          '消費税 (10%) ¥4,000'
        ],
        total: '合計金額: ¥44,000',
        notes: '※お支払いは請求書発行日より30日以内にお願いします。'
      }
    ]
  }
];

testPDFs.forEach(pdf => {
  generateTestPDF(pdf.filename, pdf.content);
});

console.log('All test PDFs generated successfully.');
