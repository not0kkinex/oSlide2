const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config management
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // Project operations
  openEditor: (projectData) => ipcRenderer.invoke('open-editor', projectData),
  returnHome: () => ipcRenderer.invoke('return-home'),

  // File operations
  saveFile: (data, path) => ipcRenderer.invoke('save-file', data, path),
  saveFileAs: (data) => ipcRenderer.invoke('save-file-as', data),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  readImage: (filePath) => ipcRenderer.invoke('read-image', filePath),
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  updateProjectMeta: (data) => ipcRenderer.invoke('update-project-meta', data),
  createProjectFile: (data) => ipcRenderer.invoke('create-project-file', data),

  // Presentation
  startPresentation: (data) => ipcRenderer.invoke('start-presentation', data),

  // Duplicate
  duplicateFile: (data) => ipcRenderer.invoke('duplicate-file', data),

  // Export / Import
  exportProject: (data) => ipcRenderer.invoke('export-project', data),
  importProject: () => ipcRenderer.invoke('import-project'),

  // Project themes
  saveProjectThemes: (themes) => ipcRenderer.invoke('save-project-themes', themes),

  // Thumbnail
  generateThumbnail: (slideData) => ipcRenderer.invoke('generate-thumbnail', slideData),

  // Export
  exportPDF: (htmlContent) => ipcRenderer.invoke('export-pdf', htmlContent),
  exportPNG: (data) => ipcRenderer.invoke('export-png', data),

  // Menu action listeners
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action));
  },
  onFileOpen: (callback) => {
    ipcRenderer.on('file-open', (event, data) => callback(data));
  },
  onLoadProject: (callback) => {
    ipcRenderer.on('load-project', (event, data) => callback(data));
  },
  onRefreshHome: (callback) => {
    ipcRenderer.on('refresh-home', () => callback());
  },

  // Presentation data
  onPresentationData: (callback) => {
    ipcRenderer.on('presentation-data', (event, data) => callback(data));
  },

  // Window control
  closeWindow: () => window.close(),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
