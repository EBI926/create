const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const PDFExtract = require('pdf.js-extract').PDFExtract;
const pdfExtract = new PDFExtract();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-pdfs', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });
  
  if (result.canceled) {
    return { canceled: true };
  }
  
  return { filePaths: result.filePaths };
});

ipcMain.handle('process-pdfs', async (event, filePaths) => {
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      const data = await extractAmountsFromPDF(filePath);
      results.push({
        filename: path.basename(filePath),
        path: filePath,
        amounts: data.amounts,
        total: data.total
      });
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      results.push({
        filename: path.basename(filePath),
        path: filePath,
        error: error.message
      });
    }
  }
  
  return results;
});

async function extractAmountsFromPDF(filePath) {
  return new Promise((resolve, reject) => {
    pdfExtract.extract(filePath, {}, (err, data) => {
      if (err) return reject(err);
      
      try {
        const amounts = [];
        let total = 0;
        
        data.pages.forEach(page => {
          const pageContent = page.content;
          
          const amountRegex = /([¥￥]|JPY)\s?([0-9,]+)/g;
          let match;
          
          while ((match = amountRegex.exec(pageContent.map(item => item.str).join(' '))) !== null) {
            const amountStr = match[2].replace(/,/g, '');
            const amount = parseInt(amountStr, 10);
            
            if (!isNaN(amount)) {
              amounts.push(amount);
              total += amount;
            }
          }
        });
        
        resolve({ amounts, total });
      } catch (error) {
        reject(error);
      }
    });
  });
}
