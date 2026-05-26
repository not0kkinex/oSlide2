const DevConsole = {
  visible: false,

  init() {
    document.addEventListener('keydown', e => {
      if (e.key === 'F12') {
        e.preventDefault()
        this.toggle()
      }
    })

    const closeBtn = document.getElementById('dc-close')
    if (closeBtn) closeBtn.onclick = () => this.hide()

    const input = document.getElementById('dc-input')
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          this.eval(input.value)
          input.value = ''
        }
        if (e.key === 'Escape') this.hide()
      })
    }

    this.updateState()
  },

  toggle() {
    const el = document.getElementById('dev-console')
    if (!el) return
    this.visible = !this.visible
    el.classList.toggle('hidden', !this.visible)
    if (this.visible) {
      this.updateState()
      setTimeout(() => document.getElementById('dc-input')?.focus(), 50)
    }
  },

  hide() {
    const el = document.getElementById('dev-console')
    if (!el) return
    this.visible = false
    el.classList.add('hidden')
  },

  eval(code) {
    const output = document.getElementById('dc-output')
    if (!output) return
    try {
      const result = eval(code)
      output.innerHTML += `<div class="ok">&gt; ${this.esc(code)}</div>`
      output.innerHTML += `<div>${this.esc(this.stringify(result))}</div>`
    } catch (err) {
      output.innerHTML += `<div class="err">&gt; ${this.esc(code)}</div>`
      output.innerHTML += `<div class="err">${this.esc(err.message)}</div>`
    }
    output.scrollTop = output.scrollHeight
    this.updateState()
  },

  updateState() {
    const el = document.getElementById('dc-state')
    if (!el) return
    const data = {
      App: this.safe(App || {}),
      ProjectManager: this.safe(window.ProjectManager?.config || {}),
      I18n: { locale: I18n.locale, loaded: I18n.loaded, keys: Object.keys(I18n.strings).length },
      ThemeManager: { theme: ThemeManager.theme }
    }
    el.textContent = JSON.stringify(data, null, 2)
  },

  safe(obj) {
    try {
      return JSON.parse(JSON.stringify(obj, (k, v) => {
        if (k === 'undo' || k === 'redo') return `[Array(${v?.length})]`
        if (k === 'slides' && v?.length > 2) return `[Array(${v.length})]`
        if (typeof v === 'function') return '[Function]'
        return v
      }))
    } catch {
      return { error: 'circular or unserializable' }
    }
  },

  stringify(v) {
    if (v === null) return 'null'
    if (v === undefined) return 'undefined'
    if (typeof v === 'object') return JSON.stringify(v, null, 2)
    return String(v)
  },

  esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}

window.DevConsole = DevConsole

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => DevConsole.init())
else DevConsole.init()
