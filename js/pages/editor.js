
let autoSaveTimer = null;

function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  autoSaveTimer = null
  ;(async () => {
    if (window.electronAPI) {
      const cfg = await window.electronAPI.getConfig()
      if (cfg.settings?.autoSave !== false) {
        const interval = (cfg.settings?.autoSaveInterval || 60) * 1000
        autoSaveTimer = setInterval(() => { if (App.dirty && App.path) saveProject() }, interval)
      }
    }
  })()
}

function stopAutoSave() {
  if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null }
}

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

function addChart() {
  addEl('chart')
  setTimeout(() => { const e = selEl(); if (e) openChartDialog(e) }, 100)
}

function openChartDialog(el) {
  const overlay = document.getElementById('chart-dialog-overlay')
  if (!overlay) return
  const cd = el.chartData || { labels: ['A','B','C'], datasets: [{ label: I18n.t('element.chart'), data: [10,20,30], backgroundColor: ['#f59e0b','#ec4899','#14b8a6'] }] }
  const ds = cd.datasets?.[0] || { label: I18n.t('element.chart'), data: [10,20,30], backgroundColor: ['#f59e0b','#ec4899','#14b8a6'] }
  
  document.getElementById('chart-type-select').value = el.chartType || 'bar'
  document.getElementById('chart-dataset-label').value = ds.label || ''
  
  const rowsContainer = document.getElementById('chart-data-rows')
  rowsContainer.innerHTML = ''
  
  const palette = ['#f59e0b', '#ec4899', '#14b8a6', '#06b6d4', '#8b5cf6', '#eab308', '#f43f5e', '#10b981']
  
  function addRow(label, value, color) {
    const row = document.createElement('div')
    row.className = 'chart-row'
    
    const lInput = document.createElement('input')
    lInput.type = 'text'
    lInput.className = 'chart-row-label'
    lInput.value = label || ''
    lInput.placeholder = 'Etiket'
    
    const vInput = document.createElement('input')
    vInput.type = 'number'
    vInput.className = 'chart-row-value'
    vInput.value = value !== undefined ? value : ''
    vInput.placeholder = 'Değer'
    
    const cInput = document.createElement('input')
    cInput.type = 'color'
    cInput.className = 'chart-row-color'
    cInput.value = color || palette[rowsContainer.children.length % palette.length]
    
    const delBtn = document.createElement('button')
    delBtn.className = 'chart-row-delete'
    delBtn.innerHTML = '<i data-lucide="trash-2"></i>'
    delBtn.onclick = () => { row.remove(); if(rowsContainer.children.length === 0) addRow('','','') }
    
    row.appendChild(lInput)
    row.appendChild(vInput)
    row.appendChild(cInput)
    row.appendChild(delBtn)
    
    rowsContainer.appendChild(row)
    if (window.lucide) lucide.createIcons({root: row})
  }

  const count = Math.max(cd.labels?.length || 0, ds.data?.length || 0)
  if (count === 0) {
    addRow('A', 10, palette[0])
  } else {
    for (let i = 0; i < count; i++) {
      addRow(cd.labels?.[i] || String(i+1), ds.data?.[i] || 0, ds.backgroundColor?.[i] || palette[i % palette.length])
    }
  }

  const addBtn = document.getElementById('add-chart-row-btn')
  const handleAdd = () => addRow('', '', '')
  addBtn.addEventListener('click', handleAdd)

  overlay.classList.remove('hidden')

  const apply = document.getElementById('chart-dialog-apply')
  const close = document.getElementById('chart-dialog-close')
  const cancel = document.getElementById('chart-dialog-cancel')

  function applyChart() {
    const labels = []
    const data = []
    const colors = []
    
    Array.from(rowsContainer.children).forEach(row => {
      const inputs = row.querySelectorAll('input')
      labels.push(inputs[0].value.trim() || 'Adsız')
      const val = parseFloat(inputs[1].value)
      data.push(isNaN(val) ? 0 : val)
      colors.push(inputs[2].value)
    })

    const label = document.getElementById('chart-dataset-label').value.trim() || I18n.t('element.chart')
    const chartType = document.getElementById('chart-type-select').value
    
    const chartData = {
      labels: labels,
      datasets: [{ 
        label, 
        data, 
        backgroundColor: chartType === 'line' ? colors[0] : colors, 
        borderColor: chartType === 'line' ? colors[0] : colors, 
        borderWidth: 1, 
        tension: 0.3, 
        fill: chartType === 'line' 
      }]
    }
    save()
    const e = selEl()
    if (e) {
      e.chartType = chartType
      e.chartData = chartData
      renderSlide()
      showPanel(e)
    }
    cleanup()
  }

  function cleanup() {
    overlay.classList.add('hidden')
    apply.removeEventListener('click', applyChart)
    close.removeEventListener('click', cleanup)
    cancel.removeEventListener('click', cleanup)
    addBtn.removeEventListener('click', handleAdd)
    overlay.removeEventListener('click', onClickOutside)
  }

  function onClickOutside(e) {
    if (e.target === overlay) cleanup()
  }

  apply.addEventListener('click', applyChart)
  close.addEventListener('click', cleanup)
  cancel.addEventListener('click', cleanup)
  overlay.addEventListener('click', onClickOutside)
}

function newProject() {
  if (App.dirty && !confirm(I18n.t('editor.unsavedChanges'))) return;
  App.slides = [{
    id: 's1', background: '#ffffff', transition: 'fade', elements: [
      { id: id(), type: 'text', content: 'oSlide2', x: 180, y: 160, width: 600, height: 100, fontSize: 64, fontFamily: 'Arial', color: '#222', bold: true, italic: false, underline: false, strikethrough: false, textAlign: 'center', bgColor: '', opacity: 1, rotation: 0 },
      { id: id(), type: 'text', content: I18n.t('editor.defaultSubtitle'), x: 200, y: 280, width: 560, height: 40, fontSize: 22, fontFamily: 'Arial', color: '#666', bold: false, italic: false, underline: false, strikethrough: false, textAlign: 'center', bgColor: '', opacity: 1, rotation: 0 }
    ]
  }];
  App.cur = 0;
  App.sel = null;
  App.path = null;
  App.dirty = false;
  App.undo = [];
  App.redo = [];
  App.projectTheme = null;
  startAutoSave();
  renderAll();
  hidePanel();
  updateStatusBar()
}

function getData() {
  return { version: '1.0', theme: App.theme, slides: App.slides };
}

function loadData(d) {
  App.slides = d.slides;
  App.theme = (d.theme && typeof d.theme === 'object') ? (d.theme.name || 'default') : (d.theme || 'default');
  App.cur = 0;
  App.sel = null;
  App.path = null;
  App.dirty = false;
  renderAll();
  hidePanel();
  updateStatusBar()
}

async function saveProject() {
  if (!window.electronAPI) return saveFallback();
  if (!App.path) return await saveProjectAs();
  const result = await window.electronAPI.saveFile(getData(), App.path);
  if (result) App.path = result;
  App.dirty = false;
  updateStatusBar()
  await updateProjectMeta();
}

async function saveProjectAs() {
  if (!window.electronAPI) return saveFallback();
  const r = await window.electronAPI.saveFileAs(getData());
  if (r) { App.path = r; App.dirty = false; updateStatusBar(); await updateProjectMeta(); }
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
  a.download = I18n.t('editor.defaultFilename') + '.slidelab';
  a.click();
  URL.revokeObjectURL(a);
}

function startPresentation() {
  if (window.electronAPI) window.electronAPI.startPresentation(getData());
  else { localStorage.setItem('presentationData', JSON.stringify(getData())); window.open('presentation.html', '_blank'); }
}



function loadProjectData(d) {
  if (d._projectId) App.projectId = d._projectId;
  if (d._projectName) App.projectName = d._projectName;
  if (d._projectTheme) App.projectTheme = d._projectTheme;
  loadData(d);
  if (d._projectPath) App.path = d._projectPath;
  const name = d._projectName || I18n.t('editor.untitled');
  document.title = `oSlide2 - ${name}`;
  const fn = document.getElementById('tb-filename')
  if (fn) fn.textContent = name
  updateStatusBar()
  startAutoSave();
}

function applyTemplate(templateId) {
  const tpl = window.SLIDE_TEMPLATES?.find(t => t.id === templateId);
  if (!tpl) return;
  save();
  const bg = App.projectTheme?.canvasBg || '#ffffff';
  const s = {
    id: 's' + Date.now(),
    background: bg,
    elements: tpl.elements.map(el => {
      const base = { ...EL_DEFAULTS[el.type] || {}, ...el, id: id() }
      if (App.projectTheme) {
        if (el.type === 'title') { base.color = App.projectTheme.titleColor || base.color }
        if (el.type === 'text') { base.color = App.projectTheme.textColor || base.color }
        base.animType = App.projectTheme.animType || base.animType
        base.animDuration = App.projectTheme.animDuration || base.animDuration
      }
      return base
    }),
    transition: 'fade',
    notes: ''
  };
  App.slides.splice(App.cur + 1, 0, s);
  selectSlide(App.cur + 1);
  closeTemplateModal();
}

function templatePreviewHtml(tpl) {
  const W = 160, H = 90
  let els = ''
  for (const el of tpl.elements) {
    const x = Math.round(el.x * W / 960), y = Math.round(el.y * H / 540)
    const w = Math.round(el.width * W / 960), h = Math.round(el.height * H / 540)
    if (el.type === 'title' || el.type === 'text') {
      const fs = Math.max(6, Math.round((el.fontSize || 16) * W / 960))
      els += `<text x="${x}" y="${y + h / 2 + fs / 3}" font-size="${fs}" fill="${el.color || '#888'}" font-weight="${el.bold ? 'bold' : 'normal'}" text-anchor="${el.textAlign === 'center' ? 'middle' : 'start'}">${el.content || ''}</text>`
    } else {
      els += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${el.fill || '#ffd700'}" rx="${Math.round((el.borderRadius || 0) * W / 960)}"/>`
    }
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#f5f5f5;border-radius:4px">${els}</svg>`
}

function openTemplateModal() {
  const grid = document.getElementById('template-grid');
  if (!grid) return;
  grid.innerHTML = window.SLIDE_TEMPLATES.map(t => `
    <div class="tpl-card" onclick="applyTemplate('${t.id}')">
      ${templatePreviewHtml(t)}
      <span>${I18n.t('template.' + t.id + '.label') || t.label}</span>
    </div>
  `).join('');
  document.getElementById('template-overlay')?.classList.remove('hidden');
}

function closeTemplateModal() {
  document.getElementById('template-overlay')?.classList.add('hidden');
}

function openSaveTemplateDialog() {
  document.getElementById('st-name')?.focus()
  document.getElementById('save-template-overlay')?.classList.remove('hidden')
}

function closeSaveTemplateDialog() {
  document.getElementById('save-template-overlay')?.classList.add('hidden')
}

async function confirmSaveTemplate() {
  const name = document.getElementById('st-name')?.value.trim()
  const desc = document.getElementById('st-desc')?.value.trim()
  const category = document.getElementById('st-category')?.value || 'temel'
  const tagsStr = document.getElementById('st-tags')?.value.trim()
  if (!name) { Toast.error(I18n.t('template.nameRequired'), 'Template'); return }

  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : []
  const newTemplate = {
    id: 'user_' + Date.now(),
    label: name,
    description: desc || '',
    icon: 'file-text',
    category,
    tags,
    color: '#2a2a2a',
    elements: JSON.parse(JSON.stringify(App.slides.map(s => ({
      ...s,
      elements: s.elements.map(el => {
        const { id, ...rest } = el
        return { ...rest, id: 'el_' + Math.random().toString(36).slice(2, 8) }
      })
    }))))
  }

  try {
    const config = await window.electronAPI.getConfig()
    config.userTemplates = config.userTemplates || []
    config.userTemplates.push(newTemplate)
    await window.electronAPI.saveConfig(config)
    Toast.show(I18n.t('template.saved', name), Toast.SUCCESS, 2000)
    closeSaveTemplateDialog()
    document.getElementById('st-name').value = ''
    document.getElementById('st-desc').value = ''
    document.getElementById('st-tags').value = ''
  } catch (err) {
    Toast.error(err.message, 'Save Template')
  }
}

function updateStatusBar() {
  const saveEl = document.getElementById('sb-save-status')
  if (saveEl) saveEl.textContent = App.dirty ? I18n.t('editor.notSaved') : I18n.t('editor.saved')
  const dot = document.querySelector('#status-bar .sb-dot')
  if (dot) dot.style.background = App.dirty ? '#ff4757' : '#1D9E75'
  const slideEl = document.getElementById('sb-slide-info')
  if (slideEl) slideEl.textContent = I18n.t('editor.slideN', String(App.cur + 1))
  const elEl = document.getElementById('sb-element-info')
  if (elEl) elEl.textContent = App.sel ? I18n.t('editor.elementSelected') : I18n.t('editor.noElementSelected')
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

    // New slide (always works)
    if (e.ctrlKey && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      addSlide();
      return;
    }

    // Slide navigation — only when not typing and no element selected
    const tag = document.activeElement?.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA'
      || document.activeElement?.isContentEditable;
    if (!isTyping && !App.sel) {
      if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && !e.shiftKey)) {
        if (App.cur > 0) { e.preventDefault(); selectSlide(App.cur - 1); return; }
      }
      if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && !e.shiftKey)) {
        if (App.cur < App.slides.length - 1) { e.preventDefault(); selectSlide(App.cur + 1); return; }
      }
      if (e.key === 'Home' && e.ctrlKey) {
        e.preventDefault(); selectSlide(0); return;
      }
      if (e.key === 'End' && e.ctrlKey) {
        e.preventDefault(); selectSlide(App.slides.length - 1); return;
      }
    }
    ShortcutManager.handleKeyDown(e);
  });
}

function init() {
  loadTheme();
  (async () => {
    if (window.electronAPI) {
      const cfg = await window.electronAPI.getConfig();
      await I18n.init(cfg.settings?.language || 'tr');
      if (window.setSnapEnabled) window.setSnapEnabled(cfg.settings?.snapToGrid !== false)
    } else {
      await I18n.init('tr');
    }
  })();

  newProject();

  document.getElementById('add-slide-btn')?.addEventListener('click', addSlide);
  document.getElementById('template-btn')?.addEventListener('click', openTemplateModal);
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
        case 'add-chart': addChart(); break;
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
        case 'align-element-left': alignEls('left'); break;
        case 'align-element-center-h': alignEls('centerX'); break;
        case 'align-element-right': alignEls('right'); break;
        case 'align-element-top': alignEls('top'); break;
        case 'align-element-middle': alignEls('centerY'); break;
        case 'align-element-bottom': alignEls('bottom'); break;
        case 'distribute-horizontal': distributeEls('horizontal'); break;
        case 'distribute-vertical': distributeEls('vertical'); break;
        case 'match-width': matchEls('width'); break;
        case 'match-height': matchEls('height'); break;
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
    if (e && (e.type === 'text' || e.type === 'title')) updEl(e.id, { bgColor: this.value });
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

  // Zoom (handled in canvas.js)

  // Notes
  const notesInput = document.getElementById('notes-input');
  const notesToggle = document.getElementById('notes-toggle');
  const notesStatus = document.getElementById('notes-status');

  function updateNotesStatus() {
    if (!notesStatus) return;
    notesStatus.classList.toggle('show', App.dirty);
    notesStatus.textContent = App.dirty ? I18n.t('editor.changed') : '';
  }

  function syncNotes() {
    if (!notesInput) return;
    notesInput.value = App.slides[App.cur]?.notes || '';
    updateNotesStatus();
  }
  window.syncNotes = syncNotes;

  notesInput?.addEventListener('input', () => {
    if (App.slides[App.cur]) {
      App.slides[App.cur].notes = notesInput.value;
      App.dirty = true;
      updateNotesStatus();
    }
  });
  notesToggle?.addEventListener('click', () => {
    document.getElementById('notes-bar')?.classList.toggle('collapsed');
  });

  // Template modal
  document.getElementById('template-close')?.addEventListener('click', closeTemplateModal);
  document.getElementById('template-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'template-overlay') closeTemplateModal();
  });

  // Save as Template
  document.getElementById('save-as-template-btn')?.addEventListener('click', openSaveTemplateDialog);
  document.getElementById('save-template-close')?.addEventListener('click', closeSaveTemplateDialog);
  document.getElementById('save-template-cancel')?.addEventListener('click', closeSaveTemplateDialog);
  document.getElementById('save-template-confirm')?.addEventListener('click', confirmSaveTemplate);
  document.getElementById('save-template-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'save-template-overlay') closeSaveTemplateDialog();
  });
  document.getElementById('st-name')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmSaveTemplate();
  });

  if (window.lucide) lucide.createIcons();

  // AI init
  initAI()
  ;(async () => { if (window.AI) await AI.init() })()

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
      undo: I18n.t('shortcuts.undo'), redo: I18n.t('shortcuts.redo'), save: I18n.t('shortcuts.save'),
      copy: I18n.t('shortcuts.copy'), paste: I18n.t('shortcuts.paste'),
      bold: I18n.t('shortcuts.bold'), italic: I18n.t('shortcuts.italic'), underline: I18n.t('shortcuts.underline'),
      delete: I18n.t('shortcuts.delete'), presentation: I18n.t('shortcuts.presentation'), close: I18n.t('shortcuts.close')
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
    if (window.electronAPI.onFileSaved) {
      window.electronAPI.onFileSaved(function(_ref) {
        Toast.show(I18n.t('editor.savedTo', _ref.path), Toast.SUCCESS, 2000)
      })
    }
    if (window.electronAPI.onFileError) {
      window.electronAPI.onFileError(function(_ref2) {
        Toast.error(_ref2.message, 'File Operation')
      })
    }
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
        case 'add-chart': addChart(); break;
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
window.addChart = addChart;
window.openChartDialog = openChartDialog;
window.newProject = newProject;
window.getData = getData;
window.loadData = loadData;
window.saveProject = saveProject;
window.saveProjectAs = saveProjectAs;
window.startPresentation = startPresentation;
window.exportPDF = exportPDF;
window.exportPNG = exportPNG;
window.loadProjectData = loadProjectData;
window.updateStatusBar = updateStatusBar;
window.openTemplateModal = openTemplateModal;
window.applyTemplate = applyTemplate;


if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

/* ── Micro-interactions ───────────────────────────────────── */

function addRipple(e) {
  const btn = e.currentTarget
  const existing = btn.querySelector('.ripple-wave')
  if (existing) existing.remove()
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2
  const wave = document.createElement('span')
  wave.className = 'ripple-wave'
  wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`
  btn.appendChild(wave)
  wave.addEventListener('animationend', () => wave.remove())
}

function initRipple() {
  document.querySelectorAll('.tb-btn, .btn-primary, .btn-secondary, #add-slide-btn, .ctx-item').forEach(btn => {
    if (btn.dataset.ripple) return
    btn.dataset.ripple = '1'
    btn.addEventListener('click', addRipple)
  })
}

function staggerSlides() {
  document.querySelectorAll('.slide-thumb').forEach((el, i) => {
    el.style.animationDelay = `${i * 0.04}s`
    el.style.animationName = 'none'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.animationName = ''
      })
    })
  })
}

const _origRenderAll = window.renderAll
window.renderAll = function(...args) {
  if (_origRenderAll) _origRenderAll(...args)
  requestAnimationFrame(() => {
    initRipple()
    staggerSlides()
  })
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initRipple, 400)
})

