let aiOpen = false
let aiMsgs = []
let aiBusy = false

function renderMD(text) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let h = esc
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => /^https?:\/\//i.test(u) ? `<a href="${u}" target="_blank">${t}</a>` : `${t} (${u})`)
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
  return `<p>${h}</p>`
}

function initAI() {
  const overlay = document.getElementById('ai-overlay')
  const drawer = document.getElementById('ai-drawer')
  const input = document.getElementById('ai-input')
  const sendBtn = document.getElementById('ai-send')
  const toggle = document.getElementById('ai-toggle-btn')
  const closeBtn = document.getElementById('ai-close-btn')
  const fullBtn = document.getElementById('ai-fullscreen-btn')
  const msgsEl = document.getElementById('ai-messages')
  const typing = document.getElementById('ai-typing')

  function buildSlideContext() {
    return App.slides.map((s, i) => {
      const lines = s.elements.map(el => {
        if (el.type === 'title' || el.type === 'text') return `${el.type}: ${el.content || ''}`
        return ''
      }).filter(Boolean)
      return `【Slayt ${i+1}】${s.background ? ` bg:${s.background}` : ''}\n${lines.join('\n')}`
    }).join('\n\n')
  }

  function buildSelectionContext() {
    const el = selEl()
    if (!el) return ''
    return `${el.type}: "${el.content || ''}" (x:${el.x}, y:${el.y}, ${el.width}x${el.height})`
  }

  function buildSystemMsg(lastResult) {
    const ctx = buildSlideContext()
    const selCtx = buildSelectionContext()
    let msg = `Mevcut sunum: ${App.slides.length} slayt, sıradaki: ${App.cur + 1}`
    if (ctx) msg += `\n${ctx}`
    if (selCtx) msg += `\n\nSeçili:\n${selCtx}`
    if (lastResult) msg += `\n\nSon işlem:\n${lastResult}`
    return msg
  }

  function describeAction(action) {
    const typeLabel = I18n.t('element.' + (action.type || 'text')) || action.type
    const map = {
      add_element: I18n.t('ai.action.addElement', action.content || '', typeLabel),
      delete_element: I18n.t('ai.action.deleteElement'),
      update_element: I18n.t('ai.action.updateElement', action.props?.content ? ': ' + action.props.content : ''),
      duplicate_element: I18n.t('ai.action.duplicateElement'),
      align_element: I18n.t('ai.action.alignElement', action.align || 'center'),
      style_all_elements: I18n.t('ai.action.styleAllElements'),
      add_slide: I18n.t('ai.action.addSlide'),
      delete_slide: I18n.t('ai.action.deleteSlide'),
      duplicate_slide: I18n.t('ai.action.duplicateSlide'),
      set_slide_background: I18n.t('ai.action.setSlideBg', action.color || '#fff'),
      set_all_backgrounds: I18n.t('ai.action.setAllBgs', action.color || '#fff'),
      set_slide_transition: I18n.t('ai.action.setTransition', action.transition || 'fade'),
      clear_slide: I18n.t('ai.action.clearSlide'),
      batch: I18n.t('ai.action.batch', String(action.actions?.length || 0)),
      generate_slides: I18n.t('ai.action.generateSlides', String(action.count || 3)),
      set_animations: I18n.t('ai.action.setAnimations', action.animType || 'fade'),
      set_text_color: I18n.t('ai.action.setTextColor', action.color || '#333'),
      set_background: I18n.t('ai.action.setBackground', action.color || '#fff'),
      add_chart: 'Grafik ekleniyor' + (action.chartType ? ': ' + action.chartType : ''),
      analyze_data: 'Veri analiz ediliyor' + (action.data ? ' (' + ((action.data.labels?.length || 0) + ' etiket)') : '')
    }
    return map[action.action] || I18n.t('ai.action.processing')
  }

  function agentStep(text) {
    hideWelcome()
    const div = document.createElement('div')
    div.className = 'ai-step running'
    div.dataset.text = text
    div.innerHTML = `<i data-lucide="loader" class="ai-step-icon ai-step-spin"></i> ${text}`
    msgsEl.appendChild(div)
    msgsEl.scrollTop = msgsEl.scrollHeight
    if (window.lucide) lucide.createIcons()
    return div
  }

  function finishStep(el, icon) {
    const text = el.dataset.text || ''
    const cls = icon === 'alert-triangle' ? 'error' : 'done'
    el.className = `ai-step ${cls}`
    el.innerHTML = `<i data-lucide="${icon}" class="ai-step-icon"></i> ${text}`
    if (window.lucide) lucide.createIcons()
    msgsEl.scrollTop = msgsEl.scrollHeight
  }

  function addMsg(role, content) {
    aiMsgs.push({ role, content })
    const div = document.createElement('div')
    div.className = `ai-msg ${role}`
    div.textContent = content
    msgsEl.appendChild(div)
    msgsEl.scrollTop = msgsEl.scrollHeight
    const welcome = msgsEl.querySelector('.ai-welcome')
    if (welcome) welcome.style.display = 'none'
  }

  function hideWelcome() {
    const w = msgsEl.querySelector('.ai-welcome')
    if (w) w.style.display = 'none'
  }

  function agentMsg(icon, text) {
    hideWelcome()
    const div = document.createElement('div')
    div.className = 'ai-msg ai-status'
    div.innerHTML = `<i data-lucide="${icon}" class="ai-stat-icon"></i> ${text}`
    msgsEl.appendChild(div)
    msgsEl.scrollTop = msgsEl.scrollHeight
    if (window.lucide) lucide.createIcons()
    return div
  }

  function replaceMsg(el, icon, text) {
    el.innerHTML = `<i data-lucide="${icon}" class="ai-stat-icon"></i> ${text}`
    if (window.lucide) lucide.createIcons()
    msgsEl.scrollTop = msgsEl.scrollHeight
  }

  async function typewrite(el, text, speed = 15) {
    el.className = 'ai-msg assistant'
    el.textContent = ''
    msgsEl.appendChild(el)
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i]
      msgsEl.scrollTop = msgsEl.scrollHeight
      if (i % 3 === 0) await new Promise(r => setTimeout(r, speed))
    }
    el.innerHTML = renderMD(text)
    el.classList.add('rendered')
    msgsEl.scrollTop = msgsEl.scrollHeight
  }

  function isSlideRequest(text) {
    const tr = /slayt\s*(oluştur|yap|hazırla|üret|ekle)/i
    const en = /slide\s*(create|make|generate|add)/i
    const sunum = /sunum\s*(hazırla|yap|oluştur)/i
    return tr.test(text) || en.test(text) || sunum.test(text)
  }

  function extractCount(text) {
    const m = text.match(/(\d+)\s*(slayt|slide|tane|adet)/i)
    if (m) return Math.min(Math.max(parseInt(m[1]), 1), 20)
    const m2 = text.match(/(\d+)/)
    if (m2) return Math.min(Math.max(parseInt(m2[1]), 1), 20)
    return 3
  }

  function extractTopic(text) {
    return text
      .replace(/\d+\s*(slayt|slide|tane|adet)\s*/gi, '')
      .replace(/slayt\s*(oluştur|yap|hazırla|üret|ekle)\s*/gi, '')
      .replace(/slide\s*(create|make|generate|add)\s*/gi, '')
      .replace(/sunum\s*(hazırla|yap|oluştur)\s*/gi, '')
      .replace(/(bana|lütfen|yapabilir\s*misin)\s*/gi, '')
      .trim()
  }

  function addUIMsg(text) {
    hideWelcome()
    const div = document.createElement('div')
    div.className = 'ai-msg ai-ui'
    div.textContent = text
    msgsEl.appendChild(div)
    msgsEl.scrollTop = msgsEl.scrollHeight
    return div
  }

  async function execAction(action) {
    const s = slide()
    if (!s && !['add_slide', 'delete_slide', 'generate_slides', 'set_all_backgrounds', 'set_background', 'add_chart', 'analyze_data'].includes(action.action)) return ''

    save()
    const th = App.projectTheme
    let desc = ''

    switch (action.action) {
      case 'add_element': {
        const type = action.type || 'text'
        const defs = EL_DEFAULTS[type] || {}
        const isTitle = type === 'title'
        const el = {
          id: id(), type,
          content: action.content || '',
          x: action.x ?? 120, y: action.y ?? 80,
          width: action.width ?? (defs.width || 200),
          height: action.height ?? (defs.height || 60),
          fontSize: action.fontSize ?? (isTitle ? 42 : 20),
          fontFamily: action.fontFamily || th?.[isTitle ? 'titleFont' : 'textFont'] || defs.fontFamily || 'Arial',
          color: action.color ?? (isTitle ? (th?.titleColor || '#222') : (th?.textColor || '#333')),
          bold: action.bold ?? isTitle,
          textAlign: action.textAlign ?? (isTitle ? 'center' : 'left'),
          animType: th?.animType || 'fade',
          animDuration: th?.animDuration || 0.5,
          opacity: action.opacity ?? 1,
          rotation: action.rotation ?? 0,
        }
        if (type === 'rect') {
          el.fill = action.fill || defs.fill || '#ffd700'
          el.borderColor = action.borderColor || defs.borderColor || '#ffd700'
          el.borderWidth = action.borderWidth ?? defs.borderWidth ?? 2
          el.borderRadius = action.borderRadius ?? defs.borderRadius ?? 0
        }
        if (type === 'circle') {
          el.fill = action.fill || defs.fill || '#ffd700'
          el.borderColor = action.borderColor || defs.borderColor || '#ffd700'
          el.borderWidth = action.borderWidth ?? defs.borderWidth ?? 2
        }
        if (type === 'arrow') {
          el.fill = action.fill || defs.fill || '#ffd700'
          el.borderWidth = action.borderWidth ?? defs.borderWidth ?? 3
        }
        if (type === 'chart') {
          el.chartType = action.chartType || 'bar'
          el.chartData = action.chartData || { labels: ['A','B','C'], datasets: [{ label: 'Veri', data: [10,20,30], backgroundColor: ['#ffd700','#ff6b6b','#4ecdc4'] }] }
        }
        s.elements.push(el)
        App.sel = el.id
        desc = describeAction(action)
        break
      }
      case 'delete_element': {
        const delId = action.id || App.sel
        const idx = s.elements.findIndex(e => e.id === delId)
        if (idx > -1) {
          s.elements.splice(idx, 1)
          App.sel = null
          desc = describeAction(action)
        } else {
          desc = I18n.t('ai.error.elementNotFound')
        }
        break
      }
      case 'update_element': {
        const updId = action.id || App.sel
        const e = s.elements.find(x => x.id === updId)
        if (e) {
          Object.assign(e, action.props || {})
          desc = describeAction(action)
        } else {
          desc = I18n.t('ai.error.elementNotFound')
        }
        break
      }
      case 'duplicate_element': {
        const dupId = action.id || App.sel
        const src = s.elements.find(x => x.id === dupId)
        if (src) {
          const c = clone(src)
          c.id = id()
          c.x += 20
          c.y += 20
          s.elements.push(c)
          App.sel = c.id
          desc = describeAction(action)
        }
        break
      }
      case 'align_element': {
        alignEls(action.align || 'centerX')
        App.sel = null
        desc = describeAction(action)
        break
      }
      case 'style_all_elements': {
        const filterType = action.type
        const props = action.props || {}
        let count = 0
        s.elements.forEach(el => {
          if (!filterType || el.type === filterType) {
            Object.assign(el, props)
            count++
          }
        })
        desc = I18n.t('ai.result.styledCount', String(count))
        break
      }
      case 'add_slide': {
        const bg = action.background || th?.canvasBg || '#ffffff'
        App.slides.splice(App.cur + 1, 0, {
          id: 's' + Date.now(), background: bg, elements: [],
          transition: action.transition || 'fade', notes: ''
        })
        App.cur = App.cur + 1
        App.sel = null
        desc = describeAction(action)
        break
      }
      case 'delete_slide': {
        if (App.slides.length < 2) { desc = I18n.t('ai.error.minOneSlide'); break }
        delSlide(App.cur)
        desc = describeAction(action)
        break
      }
      case 'duplicate_slide': {
        dupSlide()
        desc = describeAction(action)
        break
      }
      case 'set_slide_background': {
        s.background = action.color || '#fff'
        desc = describeAction(action)
        break
      }
      case 'set_all_backgrounds': {
        const bg = action.color || '#fff'
        App.slides.forEach(sl => { sl.background = bg })
        desc = describeAction(action)
        break
      }
      case 'set_slide_transition': {
        s.transition = action.transition || 'fade'
        desc = describeAction(action)
        break
      }
      case 'clear_slide': {
        s.elements = []
        App.sel = null
        desc = describeAction(action)
        break
      }
      case 'batch': {
        const acts = action.actions || []
        for (const a of acts) {
          save()
          await execAction(a)
        }
        desc = I18n.t('ai.result.batchDone', String(acts.length))
        break
      }
      case 'generate_slides': {
        const topic = action.topic || ''
        const cnt = action.count || 3
        await genSlides(topic, cnt, true)
        desc = I18n.t('ai.result.slidesCreated', String(cnt))
        break
      }
      case 'set_animations': {
        const anim = action.animType || 'fade'
        const dur = action.animDuration ?? 0.5
        let count = 0
        if (action.target === 'selected' && App.sel) {
          const el = s.elements.find(e => e.id === App.sel)
          if (el) { el.animType = anim; el.animDuration = dur; count = 1 }
        } else {
          App.slides.forEach(sl => {
            sl.elements.forEach(e => { e.animType = anim; e.animDuration = dur; count++ })
          })
        }
        desc = I18n.t('ai.result.animationApplied', String(count), anim, String(dur))
        break
      }
      case 'set_text_color': {
        const color = action.color || '#333'
        let count = 0
        if (action.target === 'selected' && App.sel) {
          const el = s.elements.find(e => e.id === App.sel)
          if (el && (el.type === 'text' || el.type === 'title')) { el.color = color; count = 1 }
        } else {
          App.slides.forEach(sl => {
            sl.elements.forEach(el => { if (el.type === 'text' || el.type === 'title') { el.color = color; count++ } })
          })
        }
        desc = I18n.t('ai.result.textColorChanged', String(count), color)
        break
      }
      case 'set_background': {
        const bg2 = action.color || '#fff'
        App.slides.forEach(sl => { sl.background = bg2 })
        desc = I18n.t('ai.result.allBgsChanged', bg2)
        break
      }
      case 'add_chart': {
        const chartType = action.chartType || 'bar'
        const labels = action.labels || ['A','B','C']
        const values = action.values || [10, 20, 30]
        const rawData = action.data
        let chartData

        if (rawData && typeof rawData === 'string') {
          const parsed = chartParseCSV(rawData)
          if (parsed) chartData = parsed
        }
        if (!chartData && action.data?.labels) {
          chartData = action.data
        }
        if (!chartData && action.data?.datasets) {
          chartData = action.data
        }
        if (!chartData) {
          chartData = {
            labels,
            datasets: [{ label: I18n.t('element.chart'), data: values, backgroundColor: ['#ffd700','#ff6b6b','#4ecdc4','#45b7d1','#96ceb4'], borderWidth: 1 }]
          }
        }

        const el = {
          id: id(), type: 'chart', x: 60, y: 40, width: 500, height: 350,
          chartType, chartData, opacity: 1, rotation: 0,
          animType: 'none', animDuration: 0.5, animDelay: 0
        }
        s.elements.push(el)
        App.sel = el.id
        desc = `Grafik eklendi: ${chartType} (${(chartData.labels?.length || 0)} kategori)`
        break
      }
      case 'analyze_data': {
        const data = action.data
        if (data?.datasets?.[0]?.data) {
          const suggestion = chartSuggest(data.datasets[0].data.map(String))
          desc = `Analiz: ${suggestion.insights.join(', ')}${suggestion.warnings.length ? ' | Uyarı: ' + suggestion.warnings.join(', ') : ''}`
        } else {
          desc = 'Veri analiz edilemedi'
        }
        break
      }
      default:
        desc = I18n.t('ai.error.unknownAction', action.action)
    }

    if (action.action !== 'batch') {
      renderSlide()
      renderThumbs()
      updateToolbar()
      hidePanel()
    }
    return desc || I18n.t('ai.result.completed')
  }

  async function send() {
    const text = input.value.trim()
    if (!text || aiBusy) return

    if (isSlideRequest(text)) {
      const count = extractCount(text)
      const topic = extractTopic(text) || I18n.t('ai.defaultTopic')
      input.value = ''
      input.style.height = 'auto'
      return await genSlides(topic, count)
    }

    input.value = ''
    input.style.height = 'auto'
    addMsg('user', text)
    aiBusy = true
    hideWelcome()

    let lastResult = ''
    const maxTurns = 5

    for (let turn = 0; turn < maxTurns; turn++) {
      const statusEl = agentMsg('loader', I18n.t('ai.status.thinking'))
      typing.classList.remove('hidden')
      try {
        const sysMsg = buildSystemMsg(lastResult)
        const msgs = aiMsgs.slice(-6).map(m => ({ role: m.role, content: m.content }))
        if (turn === 0) {
          msgs.unshift({ role: 'system', content: sysMsg })
        } else {
          msgs.push({ role: 'user', content: 'Başka yapman gereken bir şey var mı? Varsa JSON aksiyon döndür, yoksa sadece DONE yaz.' })
        }

        typing.classList.add('hidden')
        statusEl.remove()
        const thinking = agentMsg('brain', I18n.t('ai.status.waiting'))
        const r = await AI.chat(msgs)
        thinking.remove()

        let action = null
        try {
          const jsonMatch = r.match(/\{(?:[^{}]|"(?:\\.|[^"\\])*")*}/)
          const jsonStr = jsonMatch ? jsonMatch[0] : r.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
          action = JSON.parse(jsonStr)
        } catch {}

        if (action?.action && action.action !== 'system') {
          const stepEl = agentStep(describeAction(action))
          const result = await execAction(action)
          finishStep(stepEl, result.toLowerCase().includes('bulunamadı') || result.toLowerCase().includes('kalmalı') ? 'alert-triangle' : 'check-circle')
          const explain = action.explain || result
          aiMsgs.push({ role: 'assistant', content: '✅ ' + explain })
          lastResult = result
        } else if (turn === 0) {
          const el = document.createElement('div')
          await typewrite(el, r)
          aiMsgs.push({ role: 'assistant', content: r })
          break
        } else {
          break
        }
      } catch (e) {
        Toast.error(e, 'AI Chat')
        break
      }
    }

    typing.classList.add('hidden')
    aiBusy = false
  }

  function showWelcome() {
    const w = msgsEl.querySelector('.ai-welcome')
    if (w) w.style.display = ''
  }

  async function smartAction(action) {
    const el = selEl()
    if (!el || !el.content) return
    const meta = {
      improve: { icon: 'sparkles', label: I18n.t('ai.status.improving'), prompt: I18n.t('ai.improvePrompt') },
      summarize: { icon: 'align-left', label: I18n.t('ai.status.summarizing'), prompt: I18n.t('ai.summarizePrompt') },
      'translate-en': { icon: 'languages', label: I18n.t('ai.status.translating'), prompt: I18n.t('ai.translateEnPrompt') },
    }
    const m = meta[action] || { icon: 'refresh-cw', label: I18n.t('ai.status.processing'), prompt: action }
    aiBusy = true
    hideWelcome()

    addMsg('user', `"${el.content.slice(0, 60)}..."`)
    const status = agentMsg(m.icon, m.label)
    typing.classList.remove('hidden')
    try {
      const ctx = buildSlideContext()
      replaceMsg(status, 'brain', I18n.t('ai.status.analyzing'))
      const r = await AI.improveTextWithContext(el.content, m.prompt, ctx)
      status.remove()
      if (r) {
        save()
        updEl(el.id, { content: r })
        renderAll()
        const elDiv = document.createElement('div')
        await typewrite(elDiv, r)
      }
    } catch (e) {
      replaceMsg(status, 'alert-triangle', I18n.t('ai.error') + ': ' + e.message)
      status.className = 'ai-msg err'
      Toast.error(e, 'AI Smart Action')
    }
    aiBusy = false
    typing.classList.add('hidden')
  }

  sendBtn?.addEventListener('click', send)
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  })
  input?.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = Math.min(input.scrollHeight, 80) + 'px'
  })

  function closeAI() {
    aiOpen = false
    overlay.classList.add('hidden')
    toggle.classList.remove('active')
    drawer.classList.remove('ai-fullscreen')
    if (fullBtn) fullBtn.innerHTML = '<i data-lucide="maximize"></i>'
    if (window.lucide) lucide.createIcons()
  }

  fullBtn?.addEventListener('click', () => {
    const fs = drawer.classList.toggle('ai-fullscreen')
    fullBtn.innerHTML = fs ? '<i data-lucide="minimize"></i>' : '<i data-lucide="maximize"></i>'
    if (window.lucide) lucide.createIcons()
    msgsEl.scrollTop = msgsEl.scrollHeight
  })

  toggle?.addEventListener('click', () => {
    aiOpen = !aiOpen
    overlay.classList.toggle('hidden', !aiOpen)
    toggle.classList.toggle('active', aiOpen)
    if (aiOpen) setTimeout(() => input?.focus(), 100)
  })
  closeBtn?.addEventListener('click', closeAI)
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeAI() })

  document.querySelector('[data-ai-slide]')?.addEventListener('click', genSlides)
  document.querySelectorAll('[data-ai-action]').forEach(btn => {
    btn.addEventListener('click', () => smartAction(btn.dataset.aiAction))
  })
}

window.renderMD = renderMD
window.initAI = initAI
