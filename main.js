const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const remote = require('@electron/remote/main');
const { extractAmountsFromPDF } = require('./src/utils/parsePdf');

remote.initialize();

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

  remote.enable(mainWindow.webContents);
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  
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
