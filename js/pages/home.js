(function() {
  let ctxTarget = null;
  let favFilterActive = false;
  let settingsCache = {};
  let activeTab = 'projects';
  let themes = [];
  let editingThemeId = null;

  async function render() {
    const projects = favFilterActive
      ? await ProjectManager.getFavorites()
      : await ProjectManager.getAll();
    const welcome = document.getElementById('welcome');
    const mainView = document.getElementById('page-projects');
    const grid = document.getElementById('projects-grid');
    const recent = document.getElementById('recent-section');
    const recentList = document.getElementById('recent-list');
    const favBtn = document.getElementById('fav-filter-btn');
    if (favBtn) favBtn.classList.toggle('active', favFilterActive);

    if (projects.length === 0) {
      if (favFilterActive) {
        welcome.classList.add('hidden');
        mainView.classList.remove('hidden');
        grid.innerHTML = '<div class="empty-state"><div class="icon">⭐</div><p>' + I18n.t('home.noFavorites') + '</p></div>';
        return;
      }
      welcome.classList.remove('hidden');
      mainView.classList.add('hidden');
      return;
    }
    welcome.classList.add('hidden');
    mainView.classList.remove('hidden');

    grid.innerHTML = '';
    const newCard = document.createElement('div');
    newCard.className = 'new-project-card';
    newCard.innerHTML = '<div class="plus">+</div><div class="label">' + I18n.t('home.newProjectCard') + '</div>';
    newCard.onclick = showNewDialog;
    grid.appendChild(newCard);

    projects.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.style.animationDelay = (i * 0.05) + 's';
      card.dataset.id = p.id;

      const starBtn = document.createElement('button');
      starBtn.className = 'card-star-btn' + (p.favorite ? ' active' : '');
      starBtn.innerHTML = '<i data-lucide="star"></i>';
      starBtn.onclick = async (e) => { e.stopPropagation(); await ProjectManager.toggleFavorite(p.id); render(); };

      const thumb = document.createElement('div');
      thumb.className = 'card-thumb';
      if (p.thumbnail) {
        const img = document.createElement('img');
        img.src = p.thumbnail;
        thumb.appendChild(img);
      } else {
        thumb.textContent = '📄';
      }

      const info = document.createElement('div');
      info.className = 'card-info';
      const favIcon = p.favorite ? '⭐ ' : '';
      info.innerHTML = `<div class="card-name">${favIcon}${esc(p.name)}</div><div class="card-meta">${p.slideCount || 0} ${I18n.t('project.slide')} • ${timeAgo(p.lastModified)}</div>`;

      const delBtn = document.createElement('button');
      delBtn.className = 'card-del-btn';
      delBtn.innerHTML = '<i data-lucide="trash-2"></i>';
      delBtn.onclick = async (e) => { e.stopPropagation(); if (confirm(I18n.t('project.deleteConfirm'))) { await ProjectManager.delete(p.id); render(); } };

      card.appendChild(starBtn);
      card.appendChild(delBtn);
      card.appendChild(thumb);
      card.appendChild(info);

      card.onclick = () => openProject(p.id);
      card.oncontextmenu = (e) => { e.preventDefault(); showCtx(e, p.id); };

      grid.appendChild(card);
    });

    // Recent
    const recentProjects = await ProjectManager.getRecent();
    const recentIds = new Set(recentProjects.map(r => r.id));
    const recentCards = projects.filter(p => recentIds.has(p.id) && p.id !== projects[projects.length-1]?.id);
    if (recentCards.length > 0) {
      recent.classList.remove('hidden');
      recentList.innerHTML = '';
      recentCards.slice(0, 5).forEach(p => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.dataset.id = p.id;
        item.innerHTML = `
          <div class="recent-thumb">${p.thumbnail ? `<img src="${p.thumbnail}" />` : '📄'}</div>
          <div class="recent-info">
            <div class="recent-name">${esc(p.name)}</div>
            <div class="recent-meta">${timeAgo(p.lastModified)}</div>
          </div>
          <div class="recent-slides">${p.slideCount || 0} ${I18n.t('project.slide')}</div>
        `;
        item.onclick = () => openProject(p.id);
        item.oncontextmenu = (e) => { e.preventDefault(); showCtx(e, p.id); };
        recentList.appendChild(item);
      });
    } else {
      recent.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
  }

  function setThemePreview(th) {
    const title = document.getElementById('th-preview-title')
    const text = document.getElementById('th-preview-text')
    const preview = document.getElementById('th-preview')
    if (!title || !text || !preview) return
    preview.style.background = th.canvasBg || '#ffffff'
    title.style.color = th.titleColor || '#222'
    title.style.fontFamily = th.titleFont || 'Arial'
    text.style.color = th.textColor || '#333'
    text.style.fontFamily = th.textFont || 'Arial'
  }

  async function renderThemes() {
    themes = await ProjectManager.getThemes()
    const grid = document.getElementById('themes-grid')
    if (!grid) return
    grid.innerHTML = ''
    themes.forEach((th, i) => {
      const card = document.createElement('div')
      card.className = 'theme-card2'
      card.style.animationDelay = (i * 0.04) + 's'
      card.dataset.id = th.id

      const preview = document.createElement('div')
      preview.className = 'theme-card2-preview'
      preview.style.background = th.canvasBg || '#ffffff'
      preview.innerHTML = `<div class="th-preview-title" style="color:${th.titleColor||'#222'};font-family:${th.titleFont||'Arial'}">Aa</div><div class="th-preview-text" style="color:${th.textColor||'#333'};font-family:${th.textFont||'Arial'}">${esc(th.name)}</div>`

      const body = document.createElement('div')
      body.className = 'theme-card2-body'

      const name = document.createElement('div')
      name.className = 'theme-card2-name'
      name.textContent = th.name

      const actions = document.createElement('div')
      actions.className = 'theme-card2-actions'
      const editBtn = document.createElement('button')
      editBtn.innerHTML = '<i data-lucide="pencil"></i>'
      editBtn.title = 'Düzenle'
      editBtn.onclick = (e) => { e.stopPropagation(); openThemeEditor(th.id) }
      const dupBtn = document.createElement('button')
      dupBtn.innerHTML = '<i data-lucide="copy"></i>'
      dupBtn.title = 'Kopyala'
      dupBtn.onclick = async (e) => { e.stopPropagation(); await duplicateTheme(th.id); renderThemes(); if (window.lucide) lucide.createIcons() }
      const delBtn = document.createElement('button')
      delBtn.className = 'th-del'
      delBtn.innerHTML = '<i data-lucide="trash-2"></i>'
      delBtn.title = 'Sil'
      delBtn.onclick = (e) => { e.stopPropagation(); deleteTheme(th.id) }

      actions.appendChild(editBtn)
      actions.appendChild(dupBtn)
      actions.appendChild(delBtn)
      body.appendChild(name)
      body.appendChild(actions)
      card.appendChild(preview)
      card.appendChild(body)
      card.onclick = () => openThemeEditor(th.id)
      grid.appendChild(card)
    })
    if (window.lucide) lucide.createIcons()
  }

  function switchTab(tab) {
    activeTab = tab
    document.querySelectorAll('.page-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab))
    document.querySelectorAll('.page-content').forEach(c => c.classList.toggle('active', c.id === 'page-' + tab))
    if (tab === 'themes') {
      document.getElementById('welcome')?.classList.add('hidden')
      renderThemes()
    } else {
      render()
    }
  }

  async function openThemeEditor(id) {
    editingThemeId = id
    const th = id ? themes.find(t => t.id === id) : null
    const title = document.getElementById('theme-dlg-title')
    title.textContent = th ? I18n.t('theme.editTitle') : I18n.t('theme.newTitle')
    document.getElementById('th-name').value = th ? th.name : ''
    document.getElementById('th-canvasBg').value = th ? th.canvasBg : '#ffffff'
    document.getElementById('th-titleColor').value = th ? th.titleColor : '#222222'
    document.getElementById('th-textColor').value = th ? th.textColor : '#333333'
    document.getElementById('th-titleFont').value = th ? th.titleFont : 'Arial'
    document.getElementById('th-textFont').value = th ? th.textFont : 'Arial'
    document.getElementById('th-animType').value = th ? th.animType : 'fade'
    document.getElementById('th-animDuration').value = th ? th.animDuration : 0.5
    const delBtn = document.getElementById('theme-dlg-delete')
    delBtn.style.display = th ? '' : 'none'
    updateThemePreview()
    document.getElementById('theme-dlg-overlay').classList.remove('hidden')
  }

  function closeThemeEditor() {
    document.getElementById('theme-dlg-overlay').classList.add('hidden')
    editingThemeId = null
  }

  function getThemeFormValues() {
    return {
      name: document.getElementById('th-name').value.trim(),
      canvasBg: document.getElementById('th-canvasBg').value,
      titleColor: document.getElementById('th-titleColor').value,
      textColor: document.getElementById('th-textColor').value,
      titleFont: document.getElementById('th-titleFont').value,
      textFont: document.getElementById('th-textFont').value,
      animType: document.getElementById('th-animType').value,
      animDuration: parseFloat(document.getElementById('th-animDuration').value) || 0.5
    }
  }

  function updateThemePreview() {
    const vals = getThemeFormValues()
    setThemePreview(vals)
  }

  async function saveTheme() {
    const vals = getThemeFormValues()
    if (!vals.name) { alert('Tema adı gerekli'); return }
    let list = [...themes]
    if (editingThemeId) {
      const idx = list.findIndex(t => t.id === editingThemeId)
      if (idx !== -1) list[idx] = { ...list[idx], ...vals }
    } else {
      const id = 'th_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
      list.push({ id, ...vals })
    }
    await ProjectManager.saveThemes(list)
    themes = list
    closeThemeEditor()
    renderThemes()
    if (window.lucide) lucide.createIcons()
  }

  async function deleteTheme(id) {
    if (!confirm('Bu temayı silmek istediğinize emin misiniz?')) return
    let list = themes.filter(t => t.id !== id)
    await ProjectManager.saveThemes(list)
    themes = list
    renderThemes()
    if (window.lucide) lucide.createIcons()
  }

  async function duplicateTheme(id) {
    const th = themes.find(t => t.id === id)
    if (!th) return
    const newId = 'th_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const copy = { ...th, id: newId, name: th.name + ' (Kopya)' }
    themes.push(copy)
    await ProjectManager.saveThemes(themes)
  }

  function bindEvents() {
    document.getElementById('new-project-btn')?.addEventListener('click', showNewDialog);
    document.getElementById('welcome-new-btn')?.addEventListener('click', showNewDialog);

    document.getElementById('open-file-btn')?.addEventListener('click', openFileDialog);
    document.getElementById('welcome-open-btn')?.addEventListener('click', openFileDialog);

    document.getElementById('search-input')?.addEventListener('input', async (e) => {
      const q = e.target.value.trim();
      if (!q) { render(); return; }
      const results = await ProjectManager.search(q);
      renderSearchResults(results);
    });

    document.getElementById('dialog-close')?.addEventListener('click', closeDialog);
    document.getElementById('dialog-cancel')?.addEventListener('click', closeDialog);
    document.getElementById('dialog-confirm')?.addEventListener('click', confirmNew);
    document.getElementById('project-name-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmNew(); });

    document.getElementById('rename-close')?.addEventListener('click', closeRename);
    document.getElementById('rename-cancel')?.addEventListener('click', closeRename);
    document.getElementById('rename-confirm')?.addEventListener('click', confirmRename);
    document.getElementById('rename-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmRename(); });

    document.getElementById('fav-filter-btn')?.addEventListener('click', () => {
      favFilterActive = !favFilterActive;
      render();
    });

    document.getElementById('import-file-btn')?.addEventListener('click', importProject);

    document.querySelectorAll('.page-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab))
    })

    document.getElementById('new-theme-btn')?.addEventListener('click', () => openThemeEditor(null))
    document.getElementById('theme-dlg-close')?.addEventListener('click', closeThemeEditor)
    document.getElementById('theme-dlg-cancel')?.addEventListener('click', closeThemeEditor)
    document.getElementById('theme-dlg-save')?.addEventListener('click', saveTheme)
    document.getElementById('theme-dlg-delete')?.addEventListener('click', async () => {
      if (editingThemeId) await deleteTheme(editingThemeId)
    })
    document.querySelectorAll('#theme-dlg-body input, #theme-dlg-body select').forEach(el => {
      el.addEventListener('input', updateThemePreview)
      el.addEventListener('change', updateThemePreview)
    })

    document.getElementById('ctx-menu')?.addEventListener('click', async (e) => {
      const item = e.target.closest('.ctx-item');
      const action = item?.dataset.action;
      if (!action || !ctxTarget) return;
      hideCtx();
      switch (action) {
        case 'open': openProject(ctxTarget); break;
        case 'rename': showRename(ctxTarget); break;
        case 'duplicate': await ProjectManager.duplicate(ctxTarget); render(); break;
        case 'export': await exportProject(ctxTarget); break;
        case 'favorite': await ProjectManager.toggleFavorite(ctxTarget); render(); break;
        case 'delete':
          if (confirm(I18n.t('project.deleteConfirm'))) {
            await ProjectManager.delete(ctxTarget);
            render();
          }
          break;
      }
    });

    document.getElementById('settings-btn')?.addEventListener('click', openSettings);
    document.getElementById('settings-close')?.addEventListener('click', closeSettings);
    document.getElementById('settings-cancel')?.addEventListener('click', closeSettings);
    document.getElementById('settings-save')?.addEventListener('click', saveSettings);

    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab));
    });

    document.getElementById('about-github')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.electronAPI) window.electronAPI.openExternal('https://github.com/not0kkinex/oSlide2');
    });

    if (window.electronAPI?.onRefreshHome) {
      window.electronAPI.onRefreshHome(async () => {
        await ProjectManager.reload();
        render();
      });
    }
    window.addEventListener('focus', async () => {
      await ProjectManager.reload();
      render();
    });

    if (window.lucide) lucide.createIcons();
  }

  function showNewDialog() {
    document.getElementById('project-name-input').value = '';
    document.getElementById('template-select').value = 'blank';
    document.getElementById('dialog-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('project-name-input').focus(), 100);
  }

  function closeDialog() {
    document.getElementById('dialog-overlay').classList.add('hidden');
  }

  async function confirmNew() {
    const name = document.getElementById('project-name-input').value.trim();
    if (!name) { document.getElementById('project-name-input').focus(); return; }
    const template = document.getElementById('template-select').value;
    closeDialog();
    const result = await ProjectManager.create(name, template);
    if (result && window.electronAPI) {
      if (window.electronAPI.createProjectFile) {
        const filePath = await window.electronAPI.createProjectFile({
          projectId: result.project.id,
          name: result.project.name,
          slideData: result.slideData
        });
        if (filePath) {
          result.project.path = filePath;
          const pmP = ProjectManager.config.projects.find(pr => pr.id === result.project.id);
          if (pmP) pmP.path = filePath;
        }
      }
      if (window.electronAPI.generateThumbnail && result.slideData.slides?.length) {
        const thumb = await window.electronAPI.generateThumbnail(result.slideData.slides[0])
        if (thumb) { result.project.thumbnail = thumb; await ProjectManager.save() }
      }
      window.electronAPI.openEditor({ ...result.slideData, _projectId: result.project.id, _projectName: result.project.name });
    }
  }

  async function openProject(id) {
    const result = await ProjectManager.open(id);
    if (!result) return
    if (!result.project.thumbnail && result.slideData.slides?.length && window.electronAPI?.generateThumbnail) {
      const thumb = await window.electronAPI.generateThumbnail(result.slideData.slides[0])
      if (thumb) {
        result.project.thumbnail = thumb
        await ProjectManager.save()
      }
    }
    if (window.electronAPI) {
      window.electronAPI.openEditor({ ...result.slideData, _projectId: result.project.id, _projectName: result.project.name });
    } else {
      localStorage.setItem('presentationData', JSON.stringify(result.slideData));
      localStorage.setItem('oslide2_currentProject', JSON.stringify(result.project));
      window.location.href = 'editor.html';
    }
  }

  async function openFileDialog() {
    if (window.electronAPI) {
      const data = await window.electronAPI.openFileDialog();
      if (data) {
        window.electronAPI.openEditor({ ...data, _fromFile: true });
      }
    }
  }

  function showCtx(e, id) {
    ctxTarget = id;
    const menu = document.getElementById('ctx-menu');
    menu.classList.remove('hidden');
    menu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 180) + 'px';
  }

  function hideCtx() {
    document.getElementById('ctx-menu').classList.add('hidden');
    ctxTarget = null;
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ctx-menu')) hideCtx();
  });

  function showRename(id) {
    ProjectManager.getById(id).then(p => {
      if (!p) return;
      document.getElementById('rename-input').value = p.name;
      document.getElementById('rename-overlay').classList.remove('hidden');
      document.getElementById('rename-overlay').dataset.id = id;
      setTimeout(() => document.getElementById('rename-input').focus(), 100);
    });
  }

  function closeRename() {
    document.getElementById('rename-overlay').classList.add('hidden');
  }

  async function confirmRename() {
    const id = document.getElementById('rename-overlay').dataset.id;
    const name = document.getElementById('rename-input').value.trim();
    if (!name || !id) return;
    await ProjectManager.rename(id, name);
    closeRename();
    render();
  }

  async function openRecentByIndex(idx) {
    const recent = await ProjectManager.getRecent();
    const p = recent[idx];
    if (p) openProject(p.id);
  }

  async function exportProject(id) {
    const result = await ProjectManager.open(id);
    if (!result || !window.electronAPI?.exportProject) return;
    const filePath = await window.electronAPI.exportProject({
      projectId: result.project.id,
      name: result.project.name,
      slideData: result.slideData
    });
    if (filePath) {
      result.project.path = filePath;
      const pmP = ProjectManager.config.projects.find(pr => pr.id === id);
      if (pmP) pmP.path = filePath;
      render();
    }
  }

  async function importProject() {
    if (!window.electronAPI?.importProject) return;
    const result = await window.electronAPI.importProject();
    if (!result || !result.slideData) return;
    const fileName = result.filePath.split(/[/\\]/).pop().replace('.slidelab', '');
    const created = await ProjectManager.create(fileName);
    if (!created) return;
    const pmP = ProjectManager.config.projects.find(pr => pr.id === created.project.id);
    if (pmP) {
      if (window.electronAPI.createProjectFile) {
        const filePath = await window.electronAPI.createProjectFile({
          projectId: created.project.id,
          name: fileName,
          slideData: result.slideData
        });
        if (filePath) pmP.path = filePath;
      }
    }
    render();
  }

  function renderSearchResults(results) {
    const grid = document.getElementById('projects-grid');
    const recent = document.getElementById('recent-section');
    recent.classList.add('hidden');
    grid.innerHTML = '';
    if (results.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>Sonuç bulunamadı</p></div>';
      return;
    }
    results.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.style.animationDelay = (i * 0.04) + 's';
      card.dataset.id = p.id;

      const starBtn = document.createElement('button');
      starBtn.className = 'card-star-btn' + (p.favorite ? ' active' : '');
      starBtn.innerHTML = '<i data-lucide="star"></i>';
      starBtn.onclick = async (e) => { e.stopPropagation(); await ProjectManager.toggleFavorite(p.id); renderSearchResults(await ProjectManager.search(document.getElementById('search-input').value.trim())); };

      const thumb = document.createElement('div');
      thumb.className = 'card-thumb';
      if (p.thumbnail) {
        const img = document.createElement('img');
        img.src = p.thumbnail;
        thumb.appendChild(img);
      } else {
        thumb.textContent = '📄';
      }

      const info = document.createElement('div');
      info.className = 'card-info';
      const favIcon = p.favorite ? '⭐ ' : '';
      info.innerHTML = `<div class="card-name">${favIcon}${esc(p.name)}</div><div class="card-meta">${p.slideCount || 0} slide • ${timeAgo(p.lastModified)}</div>`;

      card.appendChild(starBtn);
      card.appendChild(thumb);
      card.appendChild(info);

      card.onclick = () => openProject(p.id);
      card.oncontextmenu = (ev) => { ev.preventDefault(); showCtx(ev, p.id); };
      grid.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
  }

  async function openSettings() {
    const settings = await ProjectManager.getSettings();
    settingsCache = { ...settings };
    setSettingField('set-language', settings.language);
    setSettingField('set-autosave', settings.autoSave);
    setSettingField('set-autosave-interval', settings.autoSaveInterval);
    setSettingField('set-default-template', settings.defaultTemplate);
    setSettingField('set-recent-count', settings.recentCount);
    setSettingField('set-snap', settings.snapToGrid);
    setSettingField('set-grid-size', settings.gridSize);
    setSettingField('set-font-family', settings.defaultFontFamily);
    setSettingField('set-font-size', settings.defaultFontSize);
    setSettingField('set-canvas-bg', settings.canvasBg);
    setSettingField('set-auto-panel', settings.autoOpenPanel);
    setSettingField('set-thumb-size', settings.thumbSize);

    document.getElementById('settings-overlay').classList.remove('hidden');

    // Set theme cards
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
      card.classList.toggle('active', card.dataset.theme === settings.theme);
    });

    if (window.lucide) lucide.createIcons();
  }

  function setSettingField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = value != null ? value : '';
  }

  function closeSettings() {
    document.getElementById('settings-overlay').classList.add('hidden');
  }

  function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.settings-tab[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
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
    await ProjectManager.updateSettings(s);
    settingsCache = s;
    ThemeManager.setTheme(s.theme);
    I18n.setLocale(s.language || 'tr');
    closeSettings();
  }

  async function loadTheme() {
    const settings = await ProjectManager.getSettings();
    ThemeManager.init(settings.theme || 'dark');
  }

  async function init() {
    await ProjectManager.init();
    await loadTheme();
    const langSettings = await ProjectManager.getSettings();
    I18n.init(langSettings.language || 'tr');

    // Init theme cards preview
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        ThemeManager.setTheme(card.dataset.theme);
      });
    });

    render();
    bindEvents();
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDialog(); closeRename(); hideCtx(); closeSettings(); }
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        openRecentByIndex(idx);
      }
    });
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} gün önce`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} hafta önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR');
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
