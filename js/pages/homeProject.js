(function() {
  let ctxTarget = null
  let activeSection = 'home'

  async function render() {
    const projects = await ProjectManager.getAll()
    const welcome = document.getElementById('welcome')
    const projectsSection = document.getElementById('projects-section')
    const themesSection = document.getElementById('themes-section')
    const grid = document.getElementById('projects-grid')
    const list = document.getElementById('project-list')

    document.querySelectorAll('#themes-section, #projects-section, #welcome, #section-templates').forEach(el => el.classList.add('hidden'))

    if (activeSection === 'themes') {
      themesSection.classList.remove('hidden')
      renderThemes()
      return
    }

    if (activeSection === 'templates') {
      document.getElementById('section-templates')?.classList.remove('hidden')
      renderTemplateGallery()
      return
    }

    projectsSection.classList.remove('hidden')

    if (projects.length === 0) {
      welcome.classList.remove('hidden')
      projectsSection.classList.add('hidden')
      return
    }

    let filtered = projects
    if (activeSection === 'favorites') filtered = projects.filter(p => p.favorite)
    else if (activeSection === 'recent') {
      const recent = await ProjectManager.getRecent()
      const recentIds = new Set(recent.map(r => r.id))
      filtered = projects.filter(p => recentIds.has(p.id))
    }

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">' + (activeSection === 'favorites' ? '⭐' : '') + '</div><p>' + I18n.t('home.noFavorites') + '</p></div>'
      list.innerHTML = ''
      if (window.lucide) lucide.createIcons()
      return
    }

    grid.innerHTML = ''
    const newCard = document.createElement('div')
    newCard.className = 'new-project-card'
    newCard.innerHTML = '<div class="plus">+</div><div class="label">' + I18n.t('home.newProjectCard') + '</div>'
    newCard.onclick = showNewDialog
    grid.appendChild(newCard)

    filtered.forEach((p, i) => {
      const card = document.createElement('div')
      card.className = 'project-card'
      card.style.animationDelay = (i * 0.04) + 's'
      card.dataset.id = p.id

      const starBtn = document.createElement('button')
      starBtn.className = 'card-star-btn' + (p.favorite ? ' active' : '')
      starBtn.innerHTML = '<i data-lucide="star"></i>'
      starBtn.onclick = async (e) => { e.stopPropagation(); await ProjectManager.toggleFavorite(p.id); render() }

      const delBtn = document.createElement('button')
      delBtn.className = 'card-del-btn'
      delBtn.innerHTML = '<i data-lucide="trash-2"></i>'
      delBtn.onclick = async (e) => { e.stopPropagation(); if (confirm(I18n.t('project.deleteConfirm'))) { await ProjectManager.delete(p.id); render() } }

      const thumbArea = document.createElement('div')
      thumbArea.className = 'card-thumb-area'
      if (p.thumbnail) {
        const img = document.createElement('img')
        img.src = p.thumbnail
        thumbArea.appendChild(img)
      } else {
        thumbArea.textContent = '📄'
      }

      const body = document.createElement('div')
      body.className = 'card-body'
      const favIcon = p.favorite ? '⭐ ' : ''
      body.innerHTML = `<div class="card-name">${favIcon}${esc(p.name)}</div><div class="card-meta">${p.slideCount || 0} ${I18n.t('project.slide')} • ${timeAgo(p.lastModified)}</div>`

      card.appendChild(starBtn)
      card.appendChild(delBtn)
      card.appendChild(thumbArea)
      card.appendChild(body)

      card.onclick = () => openProject(p.id)
      card.oncontextmenu = (e) => { e.preventDefault(); showCtx(e, p.id) }

      grid.appendChild(card)
    })

    // List view below grid
    list.innerHTML = ''
    if (filtered.length > 4) {
      const label = document.createElement('div')
      label.className = 'section-label'
      label.textContent = I18n.t('home.allProjects') || 'Tüm Projeler'
      list.appendChild(label)

      filtered.forEach((p) => {
        const item = document.createElement('div')
        item.className = 'list-item'
        item.dataset.id = p.id

        const listThumb = document.createElement('div')
        listThumb.className = 'list-thumb'
        if (p.thumbnail) {
          const img = document.createElement('img')
          img.src = p.thumbnail
          listThumb.appendChild(img)
        } else {
          listThumb.textContent = '📄'
        }

        const info = document.createElement('div')
        info.className = 'list-info'
        info.innerHTML = `<div class="list-name">${esc(p.name)}</div><div class="list-meta">${timeAgo(p.lastModified)}</div>`

        const slides = document.createElement('div')
        slides.className = 'list-slides'
        slides.textContent = `${p.slideCount || 0} ${I18n.t('project.slide')}`

        item.appendChild(listThumb)
        item.appendChild(info)
        if (p.favorite) {
          const fav = document.createElement('i')
          fav.setAttribute('data-lucide', 'star')
          fav.className = 'list-fav'
          item.appendChild(fav)
        }
        item.appendChild(slides)

        item.ondblclick = () => openProject(p.id)
        item.oncontextmenu = (e) => { e.preventDefault(); showCtx(e, p.id) }

        list.appendChild(item)
      })
    }

    if (window.lucide) lucide.createIcons()
  }

  function switchSection(section) {
    activeSection = section
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section)
    })
    render()
  }

  function bindEvents() {
    document.getElementById('new-project-btn')?.addEventListener('click', showNewDialog)
    document.getElementById('welcome-new-btn')?.addEventListener('click', showNewDialog)

    document.getElementById('welcome-open-btn')?.addEventListener('click', openFileDialog)

    document.getElementById('search-input')?.addEventListener('input', async (e) => {
      const q = e.target.value.trim()
      if (!q) { render(); return }
      const results = await ProjectManager.search(q)
      renderSearchResults(results)
    })

    // Sidebar nav
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', () => switchSection(item.dataset.section))
    })

    document.getElementById('sidebar-new-theme')?.addEventListener('click', () => {
      switchSection('themes')
      setTimeout(() => openThemeEditor(null), 50)
    })

    document.getElementById('open-file-btn')?.addEventListener('click', openFileDialog)
    document.getElementById('sidebar-settings')?.addEventListener('click', openSettings)

    // Template filter buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        renderTemplateGallery(btn.dataset.cat)
      })
    })

    document.getElementById('dialog-close')?.addEventListener('click', closeDialog)
    document.getElementById('dialog-cancel')?.addEventListener('click', closeDialog)
    document.getElementById('dialog-confirm')?.addEventListener('click', confirmNew)
    document.getElementById('project-name-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmNew() })

    document.getElementById('rename-close')?.addEventListener('click', closeRename)
    document.getElementById('rename-cancel')?.addEventListener('click', closeRename)
    document.getElementById('rename-confirm')?.addEventListener('click', confirmRename)
    document.getElementById('rename-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmRename() })

    document.getElementById('ctx-menu')?.addEventListener('click', async (e) => {
      const item = e.target.closest('.ctx-item')
      const action = item?.dataset.action
      if (!action || !ctxTarget) return
      hideCtx()
      switch (action) {
        case 'open': openProject(ctxTarget); break
        case 'rename': showRename(ctxTarget); break
        case 'duplicate': await ProjectManager.duplicate(ctxTarget); render(); break
        case 'export': await exportProject(ctxTarget); break
        case 'favorite': await ProjectManager.toggleFavorite(ctxTarget); render(); break
        case 'delete':
          if (confirm(I18n.t('project.deleteConfirm'))) { await ProjectManager.delete(ctxTarget); render() }
          break
      }
    })

    document.getElementById('new-theme-btn')?.addEventListener('click', () => openThemeEditor(null))
    document.getElementById('theme-dlg-close')?.addEventListener('click', closeThemeEditor)
    document.getElementById('theme-dlg-cancel')?.addEventListener('click', closeThemeEditor)
    document.getElementById('theme-dlg-save')?.addEventListener('click', saveTheme)
    document.getElementById('theme-dlg-delete')?.addEventListener('click', async () => {
      if (window.editingThemeId) await deleteTheme(window.editingThemeId)
    })
    document.querySelectorAll('#theme-dlg-body input, #theme-dlg-body select').forEach(el => {
      el.addEventListener('input', updateThemePreview)
      el.addEventListener('change', updateThemePreview)
    })

    document.getElementById('settings-btn')?.addEventListener('click', openSettings)
    document.getElementById('settings-close')?.addEventListener('click', closeSettings)
    document.getElementById('settings-cancel')?.addEventListener('click', closeSettings)
    document.getElementById('settings-save')?.addEventListener('click', saveSettings)

    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab))
    })

    document.getElementById('about-github')?.addEventListener('click', (e) => {
      e.preventDefault()
      if (window.electronAPI) window.electronAPI.openExternal('https://github.com/not0kkinex/oSlide2')
    })

    if (window.electronAPI?.onRefreshHome) {
      window.electronAPI.onRefreshHome(async () => {
        await ProjectManager.reload()
        render()
      })
    }
    window.addEventListener('focus', async () => {
      await ProjectManager.reload()
      render()
    })

    if (window.lucide) lucide.createIcons()
  }

  function showNewDialog() {
    document.getElementById('project-name-input').value = ''
    document.getElementById('template-select').value = 'blank'
    const themeSel = document.getElementById('project-theme-select')
    if (themeSel) {
      ProjectManager.getThemes().then(thList => {
        themeSel.innerHTML = thList.map(th => `<option value="${th.id}">${esc(th.name)}</option>`).join('')
      })
    }
    document.getElementById('dialog-overlay').classList.remove('hidden')
    setTimeout(() => document.getElementById('project-name-input').focus(), 100)
  }

  function closeDialog() {
    document.getElementById('dialog-overlay').classList.add('hidden')
  }

  function applyThemeToData(slideData, theme) {
    if (!theme) return slideData
    for (const slide of slideData.slides || []) {
      slide.background = theme.canvasBg
      for (const el of slide.elements || []) {
        const isTitle = el.type === 'title' || (el.fontSize >= 32 && el.bold)
        if (el.type === 'text' || el.type === 'title') {
          el.color = isTitle ? theme.titleColor : theme.textColor
          el.fontFamily = isTitle ? theme.titleFont : theme.textFont
        }
        el.animType = theme.animType
        el.animDuration = theme.animDuration
      }
    }
    return slideData
  }

  async function confirmNew() {
    const name = document.getElementById('project-name-input').value.trim()
    if (!name) { document.getElementById('project-name-input').focus(); return }
    const template = document.getElementById('template-select').value
    const themeId = document.getElementById('project-theme-select')?.value
    closeDialog()
    const result = await ProjectManager.create(name, template)
    let appliedTheme = null
    if (result && themeId) {
      const themes = await ProjectManager.getThemes()
      appliedTheme = themes.find(t => t.id === themeId)
      if (appliedTheme) applyThemeToData(result.slideData, appliedTheme)
    }
    if (result && window.electronAPI) {
      if (window.electronAPI.createProjectFile) {
        const filePath = await window.electronAPI.createProjectFile({
          projectId: result.project.id,
          name: result.project.name,
          slideData: result.slideData
        })
        if (filePath) {
          result.project.path = filePath
          const pmP = ProjectManager.config.projects.find(pr => pr.id === result.project.id)
          if (pmP) pmP.path = filePath
        }
      }
      if (window.electronAPI.generateThumbnail && result.slideData.slides?.length) {
        const thumb = await window.electronAPI.generateThumbnail(result.slideData.slides[0])
        if (thumb) { result.project.thumbnail = thumb; await ProjectManager.save() }
      }
      window.electronAPI.openEditor({ ...result.slideData, _projectId: result.project.id, _projectName: result.project.name, _projectPath: result.project.path, _projectTheme: appliedTheme })
    }
  }

  async function openProject(id) {
    const result = await ProjectManager.open(id)
    if (!result) return
    if (!result.project.thumbnail && result.slideData.slides?.length && window.electronAPI?.generateThumbnail) {
      const thumb = await window.electronAPI.generateThumbnail(result.slideData.slides[0])
      if (thumb) {
        result.project.thumbnail = thumb
        await ProjectManager.save()
      }
    }
    if (window.electronAPI) {
      window.electronAPI.openEditor({ ...result.slideData, _projectId: result.project.id, _projectName: result.project.name, _projectPath: result.project.path })
    } else {
      localStorage.setItem('presentationData', JSON.stringify(result.slideData))
      localStorage.setItem('oslide2_currentProject', JSON.stringify(result.project))
      window.location.href = 'editor.html'
    }
  }

  async function openFileDialog() {
    if (window.electronAPI) {
      const r = await window.electronAPI.openFileDialog()
      if (r && r.data) {
        window.electronAPI.openEditor({
          ...r.data,
          _projectName: r.fileName,
          _projectPath: r.filePath,
          _fromFile: true
        })
      }
    }
  }

  function showCtx(e, id) {
    ctxTarget = id
    const menu = document.getElementById('ctx-menu')
    menu.classList.remove('hidden')
    menu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px'
    menu.style.top = Math.min(e.clientY, window.innerHeight - 180) + 'px'
  }

  function hideCtx() {
    document.getElementById('ctx-menu').classList.add('hidden')
    ctxTarget = null
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ctx-menu')) hideCtx()
  })

  function showRename(id) {
    ProjectManager.getById(id).then(p => {
      if (!p) return
      document.getElementById('rename-input').value = p.name
      document.getElementById('rename-overlay').classList.remove('hidden')
      document.getElementById('rename-overlay').dataset.id = id
      setTimeout(() => document.getElementById('rename-input').focus(), 100)
    })
  }

  function closeRename() {
    document.getElementById('rename-overlay').classList.add('hidden')
  }

  async function confirmRename() {
    const id = document.getElementById('rename-overlay').dataset.id
    const name = document.getElementById('rename-input').value.trim()
    if (!name || !id) return
    await ProjectManager.rename(id, name)
    closeRename()
    render()
  }

  async function openRecentByIndex(idx) {
    const recent = await ProjectManager.getRecent()
    const p = recent[idx]
    if (p) openProject(p.id)
  }

  async function exportProject(id) {
    const result = await ProjectManager.open(id)
    if (!result || !window.electronAPI?.exportProject) return
    const filePath = await window.electronAPI.exportProject({
      projectId: result.project.id,
      name: result.project.name,
      slideData: result.slideData
    })
    if (filePath) {
      result.project.path = filePath
      const pmP = ProjectManager.config.projects.find(pr => pr.id === id)
      if (pmP) pmP.path = filePath
      render()
    }
  }

  function renderSearchResults(results) {
    const grid = document.getElementById('projects-grid')
    const list = document.getElementById('project-list')
    list.innerHTML = ''
    grid.innerHTML = ''
    if (results.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>' + I18n.t('home.noResults') + '</p></div>'
      return
    }
    results.forEach((p, i) => {
      const card = document.createElement('div')
      card.className = 'project-card'
      card.style.animationDelay = (i * 0.04) + 's'
      card.dataset.id = p.id

      const starBtn = document.createElement('button')
      starBtn.className = 'card-star-btn' + (p.favorite ? ' active' : '')
      starBtn.innerHTML = '<i data-lucide="star"></i>'
      starBtn.onclick = async (e) => { e.stopPropagation(); await ProjectManager.toggleFavorite(p.id); renderSearchResults(await ProjectManager.search(document.getElementById('search-input').value.trim())) }

      const thumbArea = document.createElement('div')
      thumbArea.className = 'card-thumb-area'
      if (p.thumbnail) {
        const img = document.createElement('img')
        img.src = p.thumbnail
        thumbArea.appendChild(img)
      } else {
        thumbArea.textContent = '📄'
      }

      const body = document.createElement('div')
      body.className = 'card-body'
      const favIcon = p.favorite ? '⭐ ' : ''
      body.innerHTML = `<div class="card-name">${favIcon}${esc(p.name)}</div><div class="card-meta">${p.slideCount || 0} ${I18n.t('project.slide')} • ${timeAgo(p.lastModified)}</div>`

      card.appendChild(starBtn)
      card.appendChild(thumbArea)
      card.appendChild(body)

      card.onclick = () => openProject(p.id)
      card.oncontextmenu = (ev) => { ev.preventDefault(); showCtx(ev, p.id) }
      grid.appendChild(card)
    })
    if (window.lucide) lucide.createIcons()
  }

  async function loadTheme() {
    const settings = await ProjectManager.getSettings()
    ThemeManager.init(settings.theme || 'dark')
  }

  function timeAgo(dateStr) {
    if (!dateStr) return ''
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = now - then
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return I18n.t('time.justNow')
    if (mins < 60) return I18n.t('time.minutes', String(mins))
    const hours = Math.floor(mins / 60)
    if (hours < 24) return I18n.t('time.hours', String(hours))
    const days = Math.floor(hours / 24)
    if (days < 7) return I18n.t('time.days', String(days))
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return I18n.t('time.weeks', String(weeks))
    return new Date(dateStr).toLocaleDateString(I18n.locale)
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') }

  /**
   * Loads user templates from config and merges with built-in
   * @returns {Promise<Array>} All templates
   */
  async function getAllTemplates() {
    const builtIn = window.SLIDE_TEMPLATES || []
    let userTemplates = []
    try {
      if (window.electronAPI) {
        const config = await window.electronAPI.getConfig()
        userTemplates = config.userTemplates || []
      }
    } catch (e) { /* ignore */ }
    return [...builtIn, ...userTemplates]
  }

  /**
   * Renders the template gallery grid with optional category filter
   * @param {string} [filterCat='all'] - Category to filter by
   * @returns {Promise<void>}
   */
  async function renderTemplateGallery(filterCat) {
    filterCat = filterCat || 'all'
    const grid = document.getElementById('template-gallery')
    if (!grid) return
    const all = await getAllTemplates()
    const filtered = filterCat === 'all'
      ? all
      : all.filter(t => t.category === filterCat)
    grid.innerHTML = filtered.map(t => {
      const isUser = t.id && t.id.startsWith('user_')
      const slideCount = t.elements ? (Array.isArray(t.elements) && !t.elements[0]?.type ? t.elements.length : 1) : 1
      return `
      <div class="tpl-gallery-card" data-id="${t.id}">
        <div class="tpl-preview" style="background:${t.color || '#2a2a2a'}">
          <i data-lucide="${t.icon || 'file-text'}"></i>
          <div class="tpl-preview-label">${esc(t.label)}</div>
          ${isUser ? '<span class="tpl-user-badge">' + I18n.t('template.userBadge') + '</span>' : ''}
        </div>
        <div class="tpl-info">
          <div class="tpl-name">${esc(isUser ? t.label : I18n.t('template.' + t.id + '.label') || t.label)}</div>
          <div class="tpl-desc">${esc(isUser ? (t.description || '') : I18n.t('template.' + t.id + '.desc') || t.description || '')}</div>
          <div class="tpl-meta">${I18n.t('template.slideCount', String(slideCount))}</div>
        </div>
        <button class="tpl-use-btn" onclick="window.useTemplate('${t.id}')">${I18n.t('template.use')}</button>
      </div>`
    }).join('')
    if (window.lucide) lucide.createIcons()
  }
  window.renderTemplateGallery = renderTemplateGallery

  /**
   * Creates a new project from a template and opens it in the editor
   * @param {string} templateId - Template ID
   * @returns {Promise<void>}
   */
  async function useTemplate(templateId) {
    const all = await getAllTemplates()
    const tpl = all.find(t => t.id === templateId)
    if (!tpl) return
    const projectName = tpl.label + ' — ' + new Date().toLocaleDateString(I18n.locale)

    // Multi-slide user template or single-slide built-in
    const isMultiSlide = tpl.elements && Array.isArray(tpl.elements) && tpl.elements[0]?.background !== undefined
    let slides
    if (isMultiSlide) {
      slides = tpl.elements.map(s => ({
        ...s,
        id: 's' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        elements: (s.elements || []).map(el => ({
          ...el,
          id: 'el_' + Math.random().toString(36).slice(2, 8)
        }))
      }))
    } else {
      slides = [{
        id: 's' + Date.now(),
        background: '#ffffff',
        elements: (tpl.elements || []).map(el => ({
          ...el,
          id: 'el_' + Math.random().toString(36).slice(2, 8)
        })),
        transition: 'fade',
        notes: ''
      }]
    }

    try {
      if (window.electronAPI && window.electronAPI.createProjectFile) {
        const result = await ProjectManager.create(projectName, 'blank')
        if (result) {
          const filePath = await window.electronAPI.createProjectFile({
            projectId: result.project.id,
            name: result.project.name,
            slideData: { version: '1.0', theme: 'default', slides }
          })
          if (filePath) result.project.path = filePath
          window.electronAPI.openEditor({
            _projectId: result.project.id,
            _projectName: result.project.name,
            _projectPath: result.project.path,
            _projectTheme: null,
            version: '1.0', theme: 'default', slides
          })
        }
      } else {
        Toast.error('electronAPI.createProjectFile not available', 'Template')
      }
    } catch (err) {
      console.error('Template project creation failed:', err)
      Toast.error(err.message, 'Template')
    }
  }
  window.useTemplate = useTemplate

  async function init() {
    await ProjectManager.init()
    await loadTheme()
    const langSettings = await ProjectManager.getSettings()
    await I18n.init(langSettings.language || 'tr')

    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'))
        card.classList.add('active')
        ThemeManager.setTheme(card.dataset.theme)
      })
    })

    render()
    bindEvents()
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDialog(); closeRename(); hideCtx(); closeSettings(); if (closeThemeEditor) closeThemeEditor() }
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') { const idx = parseInt(e.key) - 1; openRecentByIndex(idx) }
    })
  }

  window.init = init
  window.esc = esc
})()
