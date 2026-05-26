let settingsCache = {};

async function addImage() {
  if (window.electronAPI?.openImageDialog) {
    const r = await window.electronAPI.openImageDialog();
    if (r) addEl('image', { src: `data:${r.mime};base64,${r.data}` });
    else addEl('image');
  } else {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = ev => addEl('image', { src: ev.target.result });
      r.readAsDataURL(f);
    };
    inp.click();
  }
}

function newProject() {
  if (App.dirty && !confirm('Kaydedilmemiş değişiklikler var. Yeni proje?')) return;
  App.slides = [{
    id: 's1', background: '#ffffff', transition: 'fade', elements: [
      { id: id(), type: 'text', content: 'oSlide2', x: 180, y: 160, width: 600, height: 100, fontSize: 64, fontFamily: 'Arial', color: '#222', bold: true, italic: false, underline: false, strikethrough: false, textAlign: 'center', bgColor: '', opacity: 1, rotation: 0 },
      { id: id(), type: 'text', content: 'Sunumlarınızı oluşturun', x: 200, y: 280, width: 560, height: 40, fontSize: 22, fontFamily: 'Arial', color: '#666', bold: false, italic: false, underline: false, strikethrough: false, textAlign: 'center', bgColor: '', opacity: 1, rotation: 0 }
    ]
  }];
  App.cur = 0;
  App.sel = null;
  App.path = null;
  App.dirty = false;
  App.undo = [];
  App.redo = [];
  App.projectTheme = null;
  renderAll();
  hidePanel();
}

function getData() {
  return { version: '1.0', theme: App.theme, slides: App.slides };
}

function loadData(d) {
  App.slides = d.slides;
  App.theme = d.theme || 'default';
  App.cur = 0;
  App.sel = null;
  App.path = null;
  App.dirty = false;
  renderAll();
  hidePanel();
}

async function saveProject() {
  if (!window.electronAPI) return saveFallback();
  if (!App.path) return await saveProjectAs();
  const result = await window.electronAPI.saveFile(getData());
  if (result) App.path = result;
  App.dirty = false;
  await updateProjectMeta();
}

async function saveProjectAs() {
  if (!window.electronAPI) return saveFallback();
  const r = await window.electronAPI.saveFileAs(getData());
  if (r) { App.path = r; App.dirty = false; await updateProjectMeta(); }
}

async function updateProjectMeta() {
  if (!App.projectId || !window.electronAPI?.updateProjectMeta) return
  let thumb = null
  if (window.electronAPI?.generateThumbnail && App.slides.length > 0) {
    thumb = await window.electronAPI.generateThumbnail(App.slides[0])
  }
  await window.electronAPI.updateProjectMeta({
    projectId: App.projectId, slideCount: App.slides.length,
    path: App.path, thumbnail: thumb
  })
}

function saveFallback() {
  const b = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'sunum.slidelab';
  a.click();
  URL.revokeObjectURL(a);
}

function startPresentation() {
  if (window.electronAPI) window.electronAPI.startPresentation(getData());
  else { localStorage.setItem('presentationData', JSON.stringify(getData())); window.open('presentation.html', '_blank'); }
}

async function exportPDF() {
  if (window.electronAPI) await window.electronAPI.exportPDF(buildExportHTML());
}

async function exportPNG() {
  if (window.electronAPI) await window.electronAPI.exportPNG(getData());
}

function buildExportHTML() {
  let h = '';
  getData().slides.forEach((s, i) => {
    h += `<div class="sp" style="background:${s.background || '#fff'}">`;
    s.elements.forEach(el => {
      const st = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;opacity:${el.opacity !== undefined ? el.opacity : 1};transform:rotate(${el.rotation || 0}deg)`;
      if (el.type === 'text') {
        const deco = [];
        if (el.underline) deco.push('underline');
        if (el.strikethrough) deco.push('line-through');
        h += `<div style="${st};font-size:${el.fontSize || 16}px;font-family:${el.fontFamily || 'Arial'};color:${el.color || '#333'};font-weight:${el.bold ? 'bold' : 'normal'};font-style:${el.italic ? 'italic' : 'normal'};text-decoration:${deco.join(' ')};background:${el.bgColor || 'transparent'};text-align:${el.textAlign || 'left'};overflow:hidden;word-wrap:break-word">${escHtml(el.content || '')}</div>`;
      } else if (el.type === 'image') {
        h += `<div style="${st};overflow:hidden"><img src="${el.src}" style="width:100%;height:100%;object-fit:contain"></div>`;
      } else if (el.type === 'rect') {
        h += `<div style="${st};background:${el.fill || '#ffd700'};border:${el.borderWidth || 2}px solid ${el.borderColor || '#ffd700'};border-radius:${el.borderRadius || 0}px"></div>`;
      } else if (el.type === 'circle') {
        h += `<div style="${st};background:${el.fill || '#ffd700'};border:${el.borderWidth || 2}px solid ${el.borderColor || '#ffd700'};border-radius:50%"></div>`;
      } else if (el.type === 'arrow') {
        h += `<div style="${st}"><svg width="${el.width}" height="${el.height}" viewBox="0 0 ${el.width} ${el.height}"><defs><marker id="ex_${el.id}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${el.fill || '#ffd700'}"/></marker></defs><line x1="0" y1="${el.height / 2}" x2="${el.width}" y2="${el.height / 2}" stroke="${el.fill || '#ffd700'}" stroke-width="${el.borderWidth || 3}" marker-end="url(#ex_${el.id})"/></svg></div>`;
      }
    });
    h += '</div>';
  });
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#111}.sp{width:960px;height:540px;position:relative;overflow:hidden;margin:20px auto;box-shadow:0 2px 10px rgba(0,0,0,0.3)}</style></head><body>' + h + '</body></html>';
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let editorThemes = []

async function showThemePicker() {
  if (window.electronAPI) {
    const cfg = await window.electronAPI.getConfig()
    editorThemes = cfg.projectThemes || []
  } else {
    await ProjectManager.init()
    editorThemes = await ProjectManager.getThemes()
  }
  const list = document.getElementById('editor-theme-list')
  if (!list) return
  list.innerHTML = editorThemes.map(th => `
    <div class="editor-theme-item" data-id="${th.id}">
      <div class="editor-theme-preview" style="background:${th.canvasBg};padding:12px;border-radius:6px">
        <div style="color:${th.titleColor};font-family:${th.titleFont};font-size:16px;font-weight:700">Aa</div>
        <div style="color:${th.textColor};font-family:${th.textFont};font-size:11px;margin-top:4px">${esc(th.name)}</div>
      </div>
      <div class="editor-theme-name">${esc(th.name)}</div>
    </div>
  `).join('')
  list.querySelectorAll('.editor-theme-item').forEach(item => {
    item.onclick = () => applyEditorTheme(item.dataset.id)
  })
  document.getElementById('editor-theme-overlay')?.classList.remove('hidden')
  if (window.lucide) lucide.createIcons()
}

function applyEditorTheme(themeId) {
  const th = editorThemes.find(t => t.id === themeId)
  if (!th) return
  App.projectTheme = th
  save()
  for (const s of App.slides) {
    s.background = th.canvasBg
    for (const el of s.elements) {
      const isTitle = el.type === 'title' || (el.fontSize >= 32 && el.bold)
      if (el.type === 'text' || el.type === 'title') {
        el.color = isTitle ? th.titleColor : th.textColor
        el.fontFamily = isTitle ? th.titleFont : th.textFont
      }
      el.animType = th.animType
      el.animDuration = th.animDuration
    }
  }
  closeThemePicker()
  renderAll()
}

function closeThemePicker() {
  document.getElementById('editor-theme-overlay')?.classList.add('hidden')
}

function loadProjectData(d) {
  if (d._projectId) App.projectId = d._projectId;
  if (d._projectName) App.projectName = d._projectName;
  if (d._projectTheme) App.projectTheme = d._projectTheme;
  loadData(d);
  const name = d._projectName || 'Proje';
  document.title = `oSlide2 - ${name}`;
}

function setSettingField(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'checkbox') el.checked = !!value;
  else el.value = value != null ? value : '';
}

async function openSettings() {
  if (!window.electronAPI) return;
  const config = await window.electronAPI.getConfig();
  const s = config.settings || {};
  settingsCache = { ...s };

  setSettingField('set-language', s.language);
  setSettingField('set-autosave', s.autoSave);
  setSettingField('set-autosave-interval', s.autoSaveInterval);
  setSettingField('set-default-template', s.defaultTemplate);
  setSettingField('set-recent-count', s.recentCount);
  setSettingField('set-snap', s.snapToGrid);
  setSettingField('set-grid-size', s.gridSize);
  setSettingField('set-font-family', s.defaultFontFamily);
  setSettingField('set-font-size', s.defaultFontSize);
  setSettingField('set-canvas-bg', s.canvasBg);
  setSettingField('set-auto-panel', s.autoOpenPanel);
  setSettingField('set-thumb-size', s.thumbSize);

  document.getElementById('settings-overlay').classList.remove('hidden');

  if (window.lucide) lucide.createIcons();

  // Set theme selector cards
  const themeCards = document.querySelectorAll('.theme-card');
  themeCards.forEach(card => {
    card.classList.toggle('active', card.dataset.theme === s.theme);
  });
}

function closeSettings() {
  document.getElementById('settings-overlay').classList.add('hidden');
}

function getSettingsValues() {
  const activeCard = document.querySelector('.theme-card.active');
  return {
    theme: activeCard?.dataset?.theme || 'dark',
    language: document.getElementById('set-language')?.value,
    autoSave: document.getElementById('set-autosave')?.checked,
    autoSaveInterval: parseInt(document.getElementById('set-autosave-interval')?.value) || 60,
    defaultTemplate: document.getElementById('set-default-template')?.value,
    recentCount: parseInt(document.getElementById('set-recent-count')?.value) || 10,
    snapToGrid: document.getElementById('set-snap')?.checked,
    gridSize: parseInt(document.getElementById('set-grid-size')?.value) || 20,
    defaultFontFamily: document.getElementById('set-font-family')?.value,
    defaultFontSize: parseInt(document.getElementById('set-font-size')?.value) || 16,
    canvasBg: document.getElementById('set-canvas-bg')?.value,
    autoOpenPanel: document.getElementById('set-auto-panel')?.checked,
    thumbSize: document.getElementById('set-thumb-size')?.value
  };
}

async function saveSettings() {
  const s = getSettingsValues();
  if (window.electronAPI) {
    const config = await window.electronAPI.getConfig();
    Object.assign(config.settings || {}, s);
    await window.electronAPI.saveConfig(config);
  }
  settingsCache = s;
  ThemeManager.setTheme(s.theme);
  I18n.setLocale(s.language || 'tr');
  if (window.setSnapEnabled) window.setSnapEnabled(s.snapToGrid !== false)
  closeSettings();
}

async function loadTheme() {
  if (window.electronAPI) {
    const config = await window.electronAPI.getConfig();
    ThemeManager.init(config.settings?.theme || 'dark');
  } else {
    ThemeManager.init('dark');
  }
}

function initShortcuts() {
  ShortcutManager.init({});

  ShortcutManager.register('undo', () => { undo(); renderAll(); hidePanel(); });
  ShortcutManager.register('redo', () => { redo(); renderAll(); hidePanel(); });
  ShortcutManager.register('copy', copyEl);
  ShortcutManager.register('paste', pasteEl);
  ShortcutManager.register('delete', delEl);
  ShortcutManager.register('bold', toggleBold);
  ShortcutManager.register('italic', toggleItalic);
  ShortcutManager.register('underline', toggleUnderline);
  ShortcutManager.register('presentation', startPresentation);
  ShortcutManager.register('close', closeSettings);
  ShortcutManager.register('save', saveProject);

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('.text-el[contenteditable]') && !e.ctrlKey && !e.metaKey) return;
    if (e.target.closest('input,select,textarea')) {
      if (e.key === 'Escape') { closeSettings(); return; }
      return;
    }
    // Backspace alternative for delete
    if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      delEl();
      return;
    }
    ShortcutManager.handleKeyDown(e);
  });
}

function init() {
  loadTheme();
  (async () => {
    if (window.electronAPI) {
      const cfg = await window.electronAPI.getConfig();
      I18n.init(cfg.settings?.language || 'tr');
      if (window.setSnapEnabled) window.setSnapEnabled(cfg.settings?.snapToGrid !== false)
    } else {
      I18n.init('tr');
    }
  })();

  newProject();

  document.getElementById('add-slide-btn')?.addEventListener('click', addSlide);
  document.getElementById('dup-slide-btn')?.addEventListener('click', dupSlide);
  document.getElementById('panel-close')?.addEventListener('click', hidePanel);

  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      switch (btn.dataset.action) {
        case 'add-text': addEl('text'); break;
        case 'add-title': addEl('title'); break;
        case 'add-image': addImage(); break;
        case 'add-rect': addEl('rect'); break;
        case 'add-circle': addEl('circle'); break;
        case 'add-arrow': addEl('arrow'); break;
        case 'delete': delEl(); break;
        case 'bold': toggleBold(); break;
        case 'italic': toggleItalic(); break;
        case 'underline': toggleUnderline(); break;
        case 'strikethrough': toggleStrikethrough(); break;
        case 'align-left': { const e = selEl(); if (e) updEl(e.id, { textAlign: 'left' }); updateToolbar(); break; }
        case 'align-center': { const e = selEl(); if (e) updEl(e.id, { textAlign: 'center' }); updateToolbar(); break; }
        case 'align-right': { const e = selEl(); if (e) updEl(e.id, { textAlign: 'right' }); updateToolbar(); break; }
        case 'bring-forward': fwd(); break;
        case 'send-backward': bwd(); break;
        case 'start-presentation': startPresentation(); break;
      }
    });
  });

  document.getElementById('font-family-select')?.addEventListener('change', function() {
    const e = selEl();
    if (e) updEl(e.id, { fontFamily: this.value });
  });
  document.getElementById('font-size-select')?.addEventListener('change', function() {
    const e = selEl();
    if (e) updEl(e.id, { fontSize: parseInt(this.value) || 16 });
  });
  document.getElementById('text-color-input')?.addEventListener('input', function() {
    const e = selEl();
    if (e) updEl(e.id, { color: this.value });
  });
  document.getElementById('text-bg-color')?.addEventListener('input', function() {
    const e = selEl();
    if (e && e.type === 'text') updEl(e.id, { bgColor: this.value });
  });
  document.getElementById('slide-bg-color')?.addEventListener('input', function() {
    const s = slide();
    if (!s) return;
    save();
    s.background = this.value;
    renderSlide();
    renderThumbs();
  });
  document.getElementById('theme-select')?.addEventListener('change', function() {
    App.theme = this.value;
    const bgs = { default: '#fff', dark: '#1e1e1e', nature: '#f0f7e6', ocean: '#e6f3ff' };
    const s = slide();
    if (s) { save(); s.background = bgs[App.theme] || '#fff'; document.getElementById('slide-bg-color').value = s.background; renderSlide(); renderThumbs(); }
  });

  if (window.lucide) lucide.createIcons();

  // Settings panel
  document.getElementById('editor-settings-btn')?.addEventListener('click', () => openSettings());
  document.getElementById('settings-close')?.addEventListener('click', closeSettings);
  document.getElementById('settings-cancel')?.addEventListener('click', closeSettings);
  document.getElementById('settings-save')?.addEventListener('click', saveSettings);

  // Theme card selector
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      // Preview
      ThemeManager.setTheme(card.dataset.theme);
    });
  });

  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector(`.settings-tab[data-tab="${tabId}"]`)?.classList.add('active');
      document.getElementById(`tab-${tabId}`)?.classList.add('active');
      if (tabId === 'shortcuts') renderShortcutsEditor();
    });
  });

  // Shortcut editor
  let listeningFor = null;

  function renderShortcutsEditor() {
    const container = document.getElementById('tab-shortcuts');
    if (!container) return;
    let html = '<div class="shortcuts-list">';
    const actions = [
      'undo', 'redo', 'save', 'copy', 'paste',
      'bold', 'italic', 'underline', 'delete', 'presentation', 'close'
    ];
    const labels = {
      undo: 'Geri Al', redo: 'İleri Al', save: 'Kaydet',
      copy: 'Kopyala', paste: 'Yapıştır',
      bold: 'Kalın', italic: 'İtalik', underline: 'Altı Çizili',
      delete: 'Sil', presentation: 'Sunumu Başlat', close: 'Kapat'
    };
    for (const action of actions) {
      const binding = ShortcutManager.bindings[action];
      if (!binding) continue;
      const display = ShortcutManager.getDisplayFormatted(action);
      html += `<div class="sc-item" data-action="${action}">
        <span class="sc-desc">${labels[action] || action}</span>
        <span class="sc-key sc-editable" data-action="${action}">${display}</span>
      </div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.sc-editable').forEach(el => {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        if (listeningFor) return;
        listeningFor = this.dataset.action;
        this.textContent = '...';
        this.classList.add('listening');

        const handler = (ke) => {
          ke.preventDefault();
          ke.stopPropagation();
          const parts = [];
          if (ke.ctrlKey || ke.metaKey) parts.push('Ctrl');
          if (ke.altKey) parts.push('Alt');
          if (ke.shiftKey) parts.push('Shift');
          let keyName = ke.key;
          if (keyName === 'Control' || keyName === 'Alt' || keyName === 'Shift' || keyName === 'Meta') return;
          parts.push(keyName);

          ShortcutManager.setBinding(listeningFor, {
            key: keyName,
            ctrl: !!(ke.ctrlKey || ke.metaKey),
            shift: !!ke.shiftKey,
            alt: !!ke.altKey
          });

          document.removeEventListener('keydown', handler);
          listeningFor = null;
          renderShortcutsEditor();
        };
        document.addEventListener('keydown', handler);
      });
    });
  }

  // Init shortcuts
  initShortcuts();

  document.getElementById('editor-theme-btn')?.addEventListener('click', showThemePicker)
  document.getElementById('editor-theme-close')?.addEventListener('click', closeThemePicker)
  document.getElementById('editor-theme-cancel')?.addEventListener('click', closeThemePicker)

  document.getElementById('home-btn')?.addEventListener('click', () => {
    if (window.electronAPI) window.electronAPI.returnHome();
  });

  if (window.electronAPI) {
    window.electronAPI.onMenuAction(action => {
      switch (action) {
        case 'new': newProject(); break;
        case 'save': saveProject(); break;
        case 'save-as': saveProjectAs(); break;
        case 'undo': undo(); renderAll(); hidePanel(); break;
        case 'redo': redo(); renderAll(); hidePanel(); break;
        case 'delete': delEl(); break;
        case 'add-text': addEl('text'); break;
        case 'add-title': addEl('title'); break;
        case 'add-image': addImage(); break;
        case 'add-rect': addEl('rect'); break;
        case 'add-circle': addEl('circle'); break;
        case 'add-arrow': addEl('arrow'); break;
        case 'start-presentation': startPresentation(); break;
        case 'export-pdf': exportPDF(); break;
        case 'export-png': exportPNG(); break;
      }
    });
    window.electronAPI.onFileOpen(d => loadData(d));
    window.electronAPI.onLoadProject(d => loadProjectData(d));
  }
}

window.addImage = addImage;
window.newProject = newProject;
window.getData = getData;
window.loadData = loadData;
window.saveProject = saveProject;
window.saveProjectAs = saveProjectAs;
window.startPresentation = startPresentation;
window.exportPDF = exportPDF;
window.exportPNG = exportPNG;
window.loadProjectData = loadProjectData;
window.showThemePicker = showThemePicker;
window.closeThemePicker = closeThemePicker;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
