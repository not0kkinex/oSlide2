;(function() {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()

/* ── Home micro-interactions ─────────────────────────────── */

function addRippleHome(e) {
  const btn = e.currentTarget
  const existing = btn.querySelector('.ripple-wave')
  if (existing) existing.remove()
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2
  const wave = document.createElement('span')
  wave.className = 'ripple-wave'
  wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;position:absolute;`
  btn.style.overflow = 'hidden'
  btn.style.position = 'relative'
  btn.appendChild(wave)
  wave.addEventListener('animationend', () => wave.remove())
}

function initHomeRipple() {
  document.querySelectorAll('button, .nav-item, .project-card').forEach(el => {
    if (el.dataset.ripple) return
    el.dataset.ripple = '1'
    el.addEventListener('click', addRippleHome)
  })
}

function staggerCards() {
  document.querySelectorAll('.project-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 0.045}s`
    card.style.animationName = 'none'
    requestAnimationFrame(() => requestAnimationFrame(() => {
      card.style.animationName = ''
    }))
  })
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initHomeRipple()
    staggerCards()
  }, 200)

  const observer = new MutationObserver(() => {
    initHomeRipple()
    staggerCards()
  })
  const grid = document.getElementById('projects-grid')
  if (grid) observer.observe(grid, { childList: true })
})

