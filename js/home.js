(function() {
  let ctxTarget = null;

  let favFilterActive = false;

  async function init() {
    await ProjectManager.init();
    render();
    bindEvents();
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDialog(); closeRename(); hideCtx(); }
      // Ctrl+1..9 quick open recent projects
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        openRecentByIndex(idx);
      }
    });
  }

  async function render() {
    const projects = favFilterActive
      ? await ProjectManager.getFavorites()
      : await ProjectManager.getAll();
    const welcome = document.getElementById('welcome');
    const mainView = document.getElementById('main-view');
    const grid = document.getElementById('projects-grid');
    const recent = document.getElementById('recent-section');
    const recentList = document.getElementById('recent-list');
    const favBtn = document.getElementById('fav-filter-btn');
    if (favBtn) favBtn.classList.toggle('active', favFilterActive);

    if (projects.length === 0) {
      if (favFilterActive) {
        welcome.classList.add('hidden');
        mainView.classList.remove('hidden');
        grid.innerHTML = '<div class="empty-state"><div class="icon">⭐</div><p>Favori proje yok</p></div>';
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
    newCard.innerHTML = '<div class="plus">+</div><div class="label">Yeni Proje</div>';
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
      info.innerHTML = `<div class="card-name">${favIcon}${esc(p.name)}</div><div class="card-meta">${p.slideCount || 0} slide • ${timeAgo(p.lastModified)}</div>`;

      const delBtn = document.createElement('button');
      delBtn.className = 'card-del-btn';
      delBtn.innerHTML = '<i data-lucide="trash-2"></i>';
      delBtn.onclick = async (e) => { e.stopPropagation(); if (confirm('Bu projeyi silmek istediğinize emin misiniz?')) { await ProjectManager.delete(p.id); render(); } };

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
          <div class="recent-slides">${p.slideCount || 0} slide</div>
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

  function bindEvents() {
    // New project
    document.getElementById('new-project-btn')?.addEventListener('click', showNewDialog);
    document.getElementById('welcome-new-btn')?.addEventListener('click', showNewDialog);

    // Open file
    document.getElementById('open-file-btn')?.addEventListener('click', openFileDialog);
    document.getElementById('welcome-open-btn')?.addEventListener('click', openFileDialog);

    // Search
    document.getElementById('search-input')?.addEventListener('input', async (e) => {
      const q = e.target.value.trim();
      if (!q) { render(); return; }
      const results = await ProjectManager.search(q);
      renderSearchResults(results);
    });

    // New project dialog
    document.getElementById('dialog-close')?.addEventListener('click', closeDialog);
    document.getElementById('dialog-cancel')?.addEventListener('click', closeDialog);
    document.getElementById('dialog-confirm')?.addEventListener('click', confirmNew);
    document.getElementById('project-name-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmNew(); });

    // Rename dialog
    document.getElementById('rename-close')?.addEventListener('click', closeRename);
    document.getElementById('rename-cancel')?.addEventListener('click', closeRename);
    document.getElementById('rename-confirm')?.addEventListener('click', confirmRename);
    document.getElementById('rename-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmRename(); });

    // Context menu actions
    document.getElementById('fav-filter-btn')?.addEventListener('click', () => {
      favFilterActive = !favFilterActive;
      render();
    });

    document.getElementById('import-file-btn')?.addEventListener('click', importProject);

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
          if (confirm('Bu projeyi silmek istediğinize emin misiniz?')) {
            await ProjectManager.delete(ctxTarget);
            render();
          }
          break;
      }
    });
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      alert('Ayarlar paneli henüz eklenecek.');
    });

    // Settings
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      alert('Ayarlar paneli henüz eklenecek.');
    });

    // Refresh when returning from editor
    if (window.electronAPI?.onRefreshHome) {
      window.electronAPI.onRefreshHome(async () => {
        await ProjectManager.reload();
        render();
      });
    }
    // Also refresh when window gets focus (for manual returns)
    window.addEventListener('focus', async () => {
      await ProjectManager.reload();
      render();
    });

    // Init Lucide icons
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
      // Save the initial slide data to a file
      if (window.electronAPI.createProjectFile) {
        const filePath = await window.electronAPI.createProjectFile({
          projectId: result.project.id,
          name: result.project.name,
          slideData: result.slideData
        });
        if (filePath) {
          result.project.path = filePath;
          // Update ProjectManager cached config
          const pmP = ProjectManager.config.projects.find(pr => pr.id === result.project.id);
          if (pmP) pmP.path = filePath;
        }
      }
      window.electronAPI.openEditor({ ...result.slideData, _projectId: result.project.id, _projectName: result.project.name });
    }
  }

  async function openProject(id) {
    const result = await ProjectManager.open(id);
    if (result && window.electronAPI) {
      window.electronAPI.openEditor({ ...result.slideData, _projectId: result.project.id, _projectName: result.project.name });
    } else if (result) {
      // Fallback for browser testing
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

  // Hide context menu on click outside
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
      // Update project path
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
    // Copy slide data
    const pmP = ProjectManager.config.projects.find(pr => pr.id === created.project.id);
    if (pmP) {
      // Save imported data to project file
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

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
