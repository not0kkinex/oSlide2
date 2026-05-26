const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let homeWindow;
let editorWindow;
let presentationWindow;

const CONFIG_PATH = path.join(app.getPath('userData'), 'oslide2_config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
      if (!cfg.projectThemes) cfg.projectThemes = getDefaultThemes()
      return cfg
    }
  } catch {}
  return getDefaultConfig()
}

function getDefaultConfig() {
  return { projects: [], recentProjects: [], settings: {
    theme: 'dark', language: 'tr', autoSave: true, autoSaveInterval: 60,
    defaultTemplate: 'blank', recentCount: 10,
    snapToGrid: false, gridSize: 20,
    defaultFontFamily: 'Arial', defaultFontSize: 16,
    canvasBg: '#1a1a1a', autoOpenPanel: true, thumbSize: 'medium'
  }, projectThemes: getDefaultThemes() }
}

function getDefaultThemes() {
  return [
    { id:'th_default', name:'Varsayılan', canvasBg:'#ffffff', titleColor:'#222222', titleFont:'Arial', textColor:'#333333', textFont:'Arial', animType:'fade', animDuration:0.5 },
    { id:'th_dark', name:'Karanlık', canvasBg:'#1e1e1e', titleColor:'#ffffff', titleFont:'Arial', textColor:'#e0e0e0', textFont:'Arial', animType:'fade', animDuration:0.5 },
    { id:'th_nature', name:'Doğa', canvasBg:'#f0f7e6', titleColor:'#2d5016', titleFont:'Georgia', textColor:'#3a6b1e', textFont:'Georgia', animType:'slide-up', animDuration:0.6 },
    { id:'th_ocean', name:'Okyanus', canvasBg:'#e6f3ff', titleColor:'#003366', titleFont:'Helvetica', textColor:'#004080', textFont:'Helvetica', animType:'slide-left', animDuration:0.5 },
    { id:'th_sunset', name:'Gün Batımı', canvasBg:'#2d1b00', titleColor:'#ffcc80', titleFont:'Georgia', textColor:'#ffb347', textFont:'Georgia', animType:'zoom-in', animDuration:0.6 }
  ]
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch {}
}

function createHomeWindow() {
  homeWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    title: 'oSlide2'
  });

  homeWindow.loadFile('home.html');
  homeWindow.once('ready-to-show', () => homeWindow.show());
  homeWindow.on('closed', () => { homeWindow = null; });
}

function createEditorWindow(projectData) {
  if (editorWindow) {
    editorWindow.focus();
    editorWindow.webContents.send('load-project', projectData);
    return;
  }

  editorWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    title: 'oSlide2 - Editör'
  });

  editorWindow.loadFile('editor.html');
  editorWindow.webContents.once('did-finish-load', () => {
    editorWindow.webContents.send('load-project', projectData);
  });
  editorWindow.once('ready-to-show', () => editorWindow.show());

  editorWindow.on('closed', () => {
    editorWindow = null;
    Menu.setApplicationMenu(null);
    if (homeWindow) {
      homeWindow.show();
      homeWindow.webContents.send('refresh-home');
    }
  });

  createEditorMenu();
}

function createEditorMenu() {
  const template = [
    {
      label: 'Dosya',
      submenu: [
        { label: 'Ana Ekrana Dön', click: () => { if (editorWindow) { editorWindow.close(); } } },
        { type: 'separator' },
        { label: 'Kaydet', accelerator: 'CmdOrCtrl+S', click: () => editorWindow?.webContents.send('menu-action', 'save') },
        { label: 'Farklı Kaydet', accelerator: 'CmdOrCtrl+Shift+S', click: () => editorWindow?.webContents.send('menu-action', 'save-as') },
        { type: 'separator' },
        { label: 'PDF Olarak Dışa Aktar', click: () => editorWindow?.webContents.send('menu-action', 'export-pdf') },
        { label: 'PNG Olarak Dışa Aktar', click: () => editorWindow?.webContents.send('menu-action', 'export-png') },
        { type: 'separator' },
        { role: 'quit', label: 'Çıkış' }
      ]
    },
    {
      label: 'Düzen',
      submenu: [
        { label: 'Geri Al', accelerator: 'CmdOrCtrl+Z', click: () => editorWindow?.webContents.send('menu-action', 'undo') },
        { label: 'İleri Al', accelerator: 'CmdOrCtrl+Y', click: () => editorWindow?.webContents.send('menu-action', 'redo') },
        { type: 'separator' },
        { label: 'Seçili Öğeyi Sil', accelerator: 'Delete', click: () => editorWindow?.webContents.send('menu-action', 'delete') }
      ]
    },
    {
      label: 'Ekle',
      submenu: [
        { label: 'Metin', click: () => editorWindow?.webContents.send('menu-action', 'add-text') },
        { label: 'Başlık', click: () => editorWindow?.webContents.send('menu-action', 'add-title') },
        { label: 'Resim', click: () => editorWindow?.webContents.send('menu-action', 'add-image') },
        { label: 'Dikdörtgen', click: () => editorWindow?.webContents.send('menu-action', 'add-rect') },
        { label: 'Daire', click: () => editorWindow?.webContents.send('menu-action', 'add-circle') },
        { label: 'Ok', click: () => editorWindow?.webContents.send('menu-action', 'add-arrow') }
      ]
    },
    {
      label: 'Sunum',
      submenu: [
        { label: 'Sunumu Başlat', accelerator: 'F5', click: () => editorWindow?.webContents.send('menu-action', 'start-presentation') }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createPresentationWindow(data) {
  presentationWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  presentationWindow.loadFile('presentation.html');
  presentationWindow.webContents.once('did-finish-load', () => {
    presentationWindow.webContents.send('presentation-data', data);
  });
  presentationWindow.on('closed', () => { presentationWindow = null; });
}

// IPC Handlers
ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (event, config) => { saveConfig(config); return true; });

ipcMain.handle('open-editor', (event, projectData) => {
  createEditorWindow(projectData);
  if (homeWindow) homeWindow.hide();
  return true;
});

ipcMain.handle('duplicate-file', async (event, { sourcePath, newId, name }) => {
  try {
    const data = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
    const projectsDir = path.join(app.getPath('userData'), 'projects');
    fs.mkdirSync(projectsDir, { recursive: true });
    const filePath = path.join(projectsDir, `${newId}.slidelab`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    // Update config with new path
    const config = loadConfig();
    const p = config.projects.find(pr => pr.id === newId);
    if (p) { p.path = filePath; saveConfig(config); }
    return filePath;
  } catch { return null; }
});

ipcMain.handle('export-project', async (event, { projectId, name, slideData }) => {
  const result = await dialog.showSaveDialog(homeWindow || editorWindow, {
    defaultPath: `${name || 'proje'}.slidelab`,
    filters: [{ name: 'Slide Projesi', extensions: ['slidelab'] }]
  });
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, JSON.stringify(slideData, null, 2), 'utf-8');
      return result.filePath;
    } catch { return null; }
  }
  return null;
});

ipcMain.handle('import-project', async () => {
  const result = await dialog.showOpenDialog(homeWindow || editorWindow, {
    filters: [{ name: 'Slide Projesi', extensions: ['slidelab'] }],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
      return { filePath: result.filePaths[0], slideData: data };
    } catch { return null; }
  }
  return null;
});

ipcMain.handle('generate-thumbnail', async (event, slideData) => {
  try {
    const { BrowserWindow: OffscreenWindow } = require('electron');
    const thumbWin = new OffscreenWindow({
      width: 960, height: 540, show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    const html = buildSlideHTML(slideData, 'default');
    await thumbWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const image = await thumbWin.webContents.capturePage();
    const resized = image.resize({ width: 300, height: 169 });
    const base64 = resized.toDataURL();
    thumbWin.close();
    return base64;
  } catch { return null; }
});

ipcMain.handle('create-project-file', async (event, { projectId, name, slideData }) => {
  const projectsDir = path.join(app.getPath('userData'), 'projects');
  try { fs.mkdirSync(projectsDir, { recursive: true }); } catch {}
  const fileName = `${projectId}.slidelab`;
  const filePath = path.join(projectsDir, fileName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(slideData, null, 2), 'utf-8');
    // Update config with path
    const config = loadConfig();
    const p = config.projects.find(pr => pr.id === projectId);
    if (p) { p.path = filePath; saveConfig(config); }
    return filePath;
  } catch { return null; }
});

ipcMain.handle('return-home', () => {
  if (homeWindow) { homeWindow.show(); homeWindow.webContents.send('refresh-home'); }
  return true;
});

ipcMain.handle('save-file', async (event, data, filePath) => {
  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }
  const result = await dialog.showSaveDialog(editorWindow || homeWindow, {
    filters: [{ name: 'Slide Projesi', extensions: ['slidelab'] }]
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return result.filePath;
  }
  return null;
});

ipcMain.handle('save-file-as', async (event, data) => {
  const result = await dialog.showSaveDialog(editorWindow || homeWindow, {
    filters: [{ name: 'Slide Projesi', extensions: ['slidelab'] }]
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return result.filePath;
  }
  return null;
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(homeWindow || editorWindow, {
    filters: [{ name: 'Slide Projesi', extensions: ['slidelab'] }],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const data = fs.readFileSync(result.filePaths[0], 'utf-8');
    return JSON.parse(data);
  }
  return null;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch { return null; }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try { fs.unlinkSync(filePath); return true; } catch { return false; }
});

ipcMain.handle('save-project-themes', (event, themes) => {
  const config = loadConfig()
  config.projectThemes = themes
  saveConfig(config)
  return true
})

ipcMain.handle('update-project-meta', async (event, { projectId, slideCount, path: filePath, thumbnail }) => {
  const config = loadConfig();
  const p = config.projects.find(pr => pr.id === projectId);
  if (p) {
    p.slideCount = slideCount;
    p.lastModified = new Date().toISOString();
    if (filePath) p.path = filePath;
    if (thumbnail) p.thumbnail = thumbnail;
    saveConfig(config);
    return true;
  }
  return false;
});

ipcMain.handle('open-image-dialog', async () => {
  const result = await dialog.showOpenDialog(editorWindow, {
    filters: [{ name: 'Resimler', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return await readImageFile(result.filePaths[0]);
  }
  return null;
});

async function readImageFile(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { data: data.toString('base64'), mime, name: path.basename(filePath) };
  } catch { return null; }
}

ipcMain.handle('start-presentation', (event, data) => {
  createPresentationWindow(data);
  return true;
});

ipcMain.handle('export-pdf', async (event, htmlContent) => {
  const result = await dialog.showSaveDialog(editorWindow, {
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (!result.canceled && result.filePath) {
    const { BrowserWindow: OffscreenWindow } = require('electron');
    const printWin = new OffscreenWindow({
      width: 1280, height: 720, show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    const pdfData = await printWin.webContents.printToPDF({ printBackground: true });
    fs.writeFileSync(result.filePath, pdfData);
    printWin.close();
    return true;
  }
  return false;
});

ipcMain.handle('export-png', async (event, data) => {
  const result = await dialog.showOpenDialog(editorWindow, { properties: ['openDirectory'] });
  if (!result.canceled && result.filePaths.length > 0) {
    const dir = result.filePaths[0];
    const { BrowserWindow: OffscreenWindow } = require('electron');
    for (let i = 0; i < data.slides.length; i++) {
      const slide = data.slides[i];
      const html = buildSlideHTML(slide, data.theme);
      const printWin = new OffscreenWindow({
        width: 1280, height: 720, show: false,
        webPreferences: { contextIsolation: true, nodeIntegration: false }
      });
      await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      const image = await printWin.webContents.capturePage();
      const pngData = image.toPNG();
      fs.writeFileSync(path.join(dir, `slide-${String(i + 1).padStart(3, '0')}.png`), pngData);
      printWin.close();
    }
    return true;
  }
  return false;
});

function buildSlideHTML(slide, theme) {
  const themeColors = {
    default: { bg: '#ffffff', text: '#333333', accent: '#ffd700' },
    dark: { bg: '#1e1e1e', text: '#e0e0e0', accent: '#ffd700' },
    nature: { bg: '#f0f7e6', text: '#2d5016', accent: '#ccbb00' },
    ocean: { bg: '#e6f3ff', text: '#003366', accent: '#ddcc00' }
  };
  const colors = themeColors[theme] || themeColors.default;
  const elements = slide.elements.map(el => {
    const extra = [];
    if (el.opacity !== undefined && el.opacity < 1) extra.push(`opacity:${el.opacity}`);
    if (el.rotation) extra.push(`transform:rotate(${el.rotation}deg)`);
    const extras = extra.join(';');
    const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;${extras};${el.style || ''}`;
    switch (el.type) {
      case 'text': {
        const deco = []; if (el.underline) deco.push('underline'); if (el.strikethrough) deco.push('line-through');
        return `<div style="${style};font-size:${el.fontSize || 16}px;font-family:${el.fontFamily || 'Arial'};color:${el.color || colors.text};font-weight:${el.bold ? 'bold' : 'normal'};font-style:${el.italic ? 'italic' : 'normal'};text-decoration:${deco.join(' ')};background:${el.bgColor || 'transparent'};text-align:${el.textAlign || 'left'};overflow:hidden;word-wrap:break-word">${el.content}</div>`;
      }
      case 'image':
        return `<div style="${style};overflow:hidden"><img src="${el.src}" style="width:100%;height:100%;object-fit:contain" /></div>`;
      case 'rect':
        return `<div style="${style};background:${el.fill || '#ffd700'};border:${el.borderWidth || 2}px solid ${el.borderColor || '#ffd700'};border-radius:${el.borderRadius || 0}px"></div>`;
      case 'circle':
        return `<div style="${style};background:${el.fill || '#ffd700'};border:${el.borderWidth || 2}px solid ${el.borderColor || '#ffd700'};border-radius:50%"></div>`;
      case 'arrow':
        return `<div style="${style};display:flex;align-items:center;justify-content:center"><svg width="${el.width}" height="${el.height}" viewBox="0 0 ${el.width} ${el.height}"><defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${el.fill || '#ffd700'}" /></marker></defs><line x1="0" y1="${el.height / 2}" x2="${el.width}" y2="${el.height / 2}" stroke="${el.fill || '#ffd700'}" stroke-width="${el.borderWidth || 3}" marker-end="url(#arrowhead)" /></svg></div>`;
      default: return '';
    }
  }).join('\n');
  return `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{width:1280px;height:720px;overflow:hidden;background:${slide.background || colors.bg};font-family:Arial,sans-serif;color:${colors.text}}</style></head><body>${elements}</body></html>`;
}

ipcMain.handle('open-external', async (event, url) => {
  const { shell } = require('electron');
  await shell.openExternal(url);
  return true;
});

app.commandLine.appendSwitch('allow-file-access-from-files')

app.whenReady().then(() => {
  createHomeWindow();
  Menu.setApplicationMenu(null);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!homeWindow) createHomeWindow();
});
