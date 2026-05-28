(function() {
  let slides = [], cur = 0, timer = null, sec = 0, transDir = 'next'

  let _noData, _hint
  function initStrings() {
    _noData = I18n.t('presentation.noData')
    _hint = I18n.t('presentation.hint')
  }

  const themes = {
    default: { bg: '#fff', text: '#222', accent: '#ffd700' },
    dark: { bg: '#111', text: '#e0e0e0', accent: '#ffd700' },
    nature: { bg: '#f5faf0', text: '#1a3a0a', accent: '#ccbb00' },
    ocean: { bg: '#eef6ff', text: '#002244', accent: '#ddcc00' }
  };

  /* ========== ANNOTATION ========== */
  let annotCanvas, annotCtx, annotActive = false, annotMode = 'pen', annotIdx = 0
  let annotDrawing = false, laserRaf = null, laserX = 0, laserY = 0
  const annotColors = ['#ffffff', '#ff4444', '#4488ff', '#44dd44', '#ffdd00']

  function initAnnotation() {
    annotCanvas = document.getElementById('pres-annot')
    if (!annotCanvas) return
    annotCtx = annotCanvas.getContext('2d')
    annotCanvas.style.pointerEvents = 'none'
    sizeCanvas()
    window.addEventListener('resize', sizeCanvas)
    annotCanvas.addEventListener('pointerdown', onAnnotDown)
    annotCanvas.addEventListener('pointermove', onAnnotMove)
    annotCanvas.addEventListener('pointerup', onAnnotUp)
    annotCanvas.addEventListener('pointerleave', onAnnotUp)
  }

  function sizeCanvas() {
    annotCanvas.width = window.innerWidth
    annotCanvas.height = window.innerHeight
  }

  function setAnnotMode(mode) {
    annotMode = mode
    const names = { pen: I18n.t('annot.pen'), highlighter: I18n.t('annot.highlighter'), eraser: I18n.t('annot.eraser'), laser: I18n.t('annot.laser') }
    const color = mode === 'highlighter' ? '' : ` ${annotColors[annotIdx]}`
    showAnnotHint(`${names[mode] || I18n.t('annot.pen')}${color}`)
  }

  function showAnnotHint(text) {
    const el = document.getElementById('annot-indicator')
    if (!el) return
    el.textContent = text
    el.classList.add('show')
    clearTimeout(el._hide)
    el._hide = setTimeout(() => el.classList.remove('show'), 2000)
  }

  function toggleAnnot() {
    annotActive = !annotActive
    annotCanvas.classList.toggle('active', annotActive)
    if (annotActive) {
      annotCanvas.style.pointerEvents = 'auto'
      showAnnotHint(I18n.t('annot.active', annotMode))
      document.body.style.cursor = 'crosshair'
    } else {
      annotCanvas.style.pointerEvents = 'none'
      document.body.style.cursor = ''
      if (laserRaf) { cancelAnimationFrame(laserRaf); laserRaf = null }
    }
  }

  function clearAnnot() {
    if (!annotCtx) return
    annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height)
    showAnnotHint(I18n.t('annot.cleared'))
  }

  function onAnnotDown(e) {
    if (!annotActive) return
    if (annotMode === 'laser') return
    annotDrawing = true
    const r = annotCanvas.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    annotCtx.beginPath()
    annotCtx.moveTo(x, y)
    if (annotMode === 'eraser') {
      annotCtx.clearRect(x - 15, y - 15, 30, 30)
    }
  }

  function onAnnotMove(e) {
    if (!annotActive) return
    const r = annotCanvas.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    if (annotMode === 'laser') {
      laserX = x; laserY = y
      if (!laserRaf) laserRaf = requestAnimationFrame(drawLaser)
      return
    }
    if (!annotDrawing) return
    if (annotMode === 'pen') {
      annotCtx.strokeStyle = annotColors[annotIdx]
      annotCtx.lineWidth = 3
      annotCtx.lineCap = 'round'
      annotCtx.lineJoin = 'round'
      annotCtx.lineTo(x, y)
      annotCtx.stroke()
    } else if (annotMode === 'highlighter') {
      annotCtx.strokeStyle = 'rgba(255,255,0,0.25)'
      annotCtx.lineWidth = 24
      annotCtx.lineCap = 'round'
      annotCtx.lineJoin = 'round'
      annotCtx.lineTo(x, y)
      annotCtx.stroke()
    } else if (annotMode === 'eraser') {
      annotCtx.clearRect(x - 15, y - 15, 30, 30)
      annotCtx.beginPath()
      annotCtx.moveTo(x, y)
    }
  }

  function onAnnotUp() {
    annotDrawing = false
  }

  function drawLaser() {
    laserRaf = null
    if (!annotActive || annotMode !== 'laser') return
    annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height)
    annotCtx.beginPath()
    annotCtx.arc(laserX, laserY, 6, 0, Math.PI * 2)
    annotCtx.fillStyle = '#ff3333'
    annotCtx.fill()
    annotCtx.beginPath()
    annotCtx.arc(laserX, laserY, 2, 0, Math.PI * 2)
    annotCtx.fillStyle = '#ffffff'
    annotCtx.fill()
    laserRaf = requestAnimationFrame(drawLaser)
  }

  function init() {
    initStrings()
    initAnnotation()
    const w = document.getElementById('pres-wrapper');
    if (!w) return;
    if (window.electronAPI?.onPresentationData) { window.electronAPI.onPresentationData(d => load(d)); return; }
    const stored = localStorage.getItem('presentationData');
    if (stored) { try { load(JSON.parse(stored)); } catch { w.innerHTML = '<div style="color:#fff;text-align:center;padding:40px">' + I18n.t('presentation.noData') + '</div>'; } }
    else { w.innerHTML = '<div style="color:#fff;text-align:center;padding:40px">' + I18n.t('presentation.noData') + '</div>'; }
  }

  function load(data) {
    if (!data?.slides?.length) return;
    slides = data.slides;
    const c = themes[data.theme] || themes.default;
    const w = document.getElementById('pres-wrapper');
    w.innerHTML = '';
    slides.forEach((s, i) => {
      const sv = document.createElement('div');
      sv.className = 'sv' + (i === 0 ? ' active' : '');
      sv.dataset.idx = i;
      const sc = document.createElement('div');
      sc.className = 'sc';
      sc.style.background = s.background || c.bg;
      s.elements.forEach((el, ei) => {
        const d = document.createElement('div');
        d.className = 'pe';
        let css = `left:${sx(el.x)};top:${sy(el.y)};width:${sx(el.width)};height:${sy(el.height)}`;
        if (el.opacity !== undefined && el.opacity < 1) css += `;opacity:${el.opacity}`;
        if (el.rotation) css += `;transform:rotate(${el.rotation}deg)`;
        if (el.animType && el.animType !== 'none') {
          const emphasis = ['bounce', 'pulse'].includes(el.animType)
          d.dataset.anim = (emphasis ? 'emphasis-' : 'entrance-') + el.animType
          css += `;--anim-name:anim-${el.animType}`
          if (el.animDuration != null) css += `;--anim-dur:${el.animDuration}s`
          const baseDelay = el.animDelay || 0
          css += `;--anim-delay:${(baseDelay + ei * 0.08).toFixed(2)}s`
        }
        d.style.cssText = css;
        if (el.type === 'text' || el.type === 'title') {
          d.textContent = el.content || '';
          d.style.fontSize = sf(el.fontSize || 16);
          d.style.fontFamily = el.fontFamily || 'Arial';
          d.style.color = el.color || c.text;
          d.style.fontWeight = el.bold ? 'bold' : 'normal';
          d.style.fontStyle = el.italic ? 'italic' : 'normal';
          d.style.textAlign = el.textAlign || 'left';
          const deco = [];
          if (el.underline) deco.push('underline');
          if (el.strikethrough) deco.push('line-through');
          d.style.textDecoration = deco.join(' ');
          d.style.background = el.bgColor || 'transparent';
        } else if (el.type === 'image') {
          const img = document.createElement('img');
          img.src = el.src;
          d.appendChild(img);
        } else if (el.type === 'rect') {
          d.style.background = el.fill || '#ffd700';
          d.style.border = `${el.borderWidth || 2}px solid ${el.borderColor || '#ffd700'}`;
          d.style.borderRadius = (el.borderRadius || 0) + 'px';
        } else if (el.type === 'circle') {
          d.style.background = el.fill || '#ffd700';
          d.style.border = `${el.borderWidth || 2}px solid ${el.borderColor || '#ffd700'}`;
          d.style.borderRadius = '50%';
        } else if (el.type === 'arrow') {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.setAttribute('viewBox', `0 0 ${el.width} ${el.height}`);
          const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
          m.setAttribute('id', 'pm_' + i + '_' + el.id);
          m.setAttribute('markerWidth', '10');
          m.setAttribute('markerHeight', '7');
          m.setAttribute('refX', '10');
          m.setAttribute('refY', '3.5');
          m.setAttribute('orient', 'auto');
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          p.setAttribute('points', '0 0, 10 3.5, 0 7');
          p.setAttribute('fill', el.fill || '#ffd700');
          m.appendChild(p);
          defs.appendChild(m);
          svg.appendChild(defs);
          const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          l.setAttribute('x1', '0');
          l.setAttribute('y1', el.height / 2);
          l.setAttribute('x2', el.width);
          l.setAttribute('y2', el.height / 2);
          l.setAttribute('stroke', el.fill || '#ffd700');
          l.setAttribute('stroke-width', el.borderWidth || 3);
          l.setAttribute('marker-end', 'url(#pm_' + i + '_' + el.id + ')');
          svg.appendChild(l);
          d.appendChild(svg);
        }
        sc.appendChild(d);
      });
      sv.appendChild(sc);
      w.appendChild(sv);
    });
    cur = 0;
    updateUI();
    startTimer();
    showHint();
  }

  function sx(v) { return `calc(${v} / 960 * 100vw)`; }
  function sy(v) { return `calc(${v} / 540 * 100vh)`; }
  function sf(v) { return `calc(${v} / 960 * 100vw)`; }

  function go(dir) {
    if (annotActive && annotMode !== 'laser') clearAnnot()
    const views = document.querySelectorAll('.sv');
    if (!views.length) return;
    const prev = cur;
    transDir = dir;
    cur = dir === 'next' ? Math.min(cur + 1, slides.length - 1) : Math.max(cur - 1, 0);
    if (prev === cur) return;

    const transition = slides[cur]?.transition || 'fade';

    views[prev].classList.remove('active', 'sl-left', 'sl-right', 'zoom-in', 'zoom-out', 'fade-out');
    views[cur].classList.remove('active', 'sl-left', 'sl-right', 'zoom-in', 'zoom-out', 'fade-out');

    if (transition === 'slide') {
      if (dir === 'next') {
        views[prev].classList.add('sl-left');
        views[cur].classList.add('sl-right');
      } else {
        views[prev].classList.add('sl-right');
        views[cur].classList.add('sl-left');
      }
      requestAnimationFrame(() => {
        views[prev].classList.remove('active');
        views[cur].classList.add('active');
      });
    } else if (transition === 'zoom') {
      views[cur].classList.add(dir === 'next' ? 'zoom-in' : 'zoom-out');
      views[prev].classList.add('fade-out');
      requestAnimationFrame(() => {
        views[prev].classList.remove('active');
        views[cur].classList.add('active');
      });
    } else {
      views[prev].classList.remove('active');
      views[cur].classList.add('active');
    }
    updateUI();
  }

  function jump(i) {
    const views = document.querySelectorAll('.sv');
    if (i < 0 || i >= views.length) return;
    views.forEach(v => v.classList.remove('active', 'sl-left', 'sl-right', 'zoom-in', 'zoom-out', 'fade-out'));
    cur = i;
    views[cur].classList.add('active');
    updateUI();
  }

  function updateUI() {
    const ctr = document.getElementById('pres-counter');
    const fill = document.getElementById('pres-fill');
    if (ctr) ctr.textContent = `${cur + 1} / ${slides.length}`;
    if (fill) fill.style.width = `${((cur + 1) / slides.length) * 100}%`;
  }

  function startTimer() { sec = 0; updateTimer(); timer = setInterval(() => { sec++; updateTimer(); }, 1000); }
  function updateTimer() { const t = document.getElementById('pres-timer'); if (!t) return; t.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; }

  function showHint() {
    const h = document.createElement('div');
    h.className = 'nav-hint';
    h.textContent = _hint
    document.body.appendChild(h);
    requestAnimationFrame(() => h.style.opacity = '1');
    setTimeout(() => { h.style.opacity = '0'; setTimeout(() => h.remove(), 600); }, 3500);
  }

  function exit() { clearInterval(timer); window.close(); }

  document.addEventListener('keydown', e => {
    if (annotActive) {
      switch (e.key) {
        case 'd': case 'D': toggleAnnot(); e.preventDefault(); return
        case 'p': case 'P': setAnnotMode('pen'); e.preventDefault(); return
        case 'h': case 'H': setAnnotMode('highlighter'); e.preventDefault(); return
        case 'l': case 'L': if (annotMode !== 'laser') { annotCtx?.clearRect(0,0,annotCanvas.width,annotCanvas.height); setAnnotMode('laser') }; e.preventDefault(); return
        case 'e': case 'E': setAnnotMode('eraser'); e.preventDefault(); return
        case 'c': case 'C': annotIdx = (annotIdx + 1) % annotColors.length; setAnnotMode(annotMode); e.preventDefault(); return
        case '/': clearAnnot(); e.preventDefault(); return
        case 'Escape': toggleAnnot(); e.preventDefault(); return
      }
    } else {
      if (e.key === 'd' || e.key === 'D') { toggleAnnot(); e.preventDefault(); return }
    }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': e.preventDefault(); go('next'); break;
      case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); go('prev'); break;
      case 'Escape': exit(); break;
      case 'Home': e.preventDefault(); jump(0); break;
      case 'End': e.preventDefault(); jump(slides.length - 1); break;
    }
  });
  document.addEventListener('wheel', e => { e.deltaY > 0 ? go('next') : go('prev'); }, { passive: true });
  document.addEventListener('click', e => { if (annotActive) return; if (!e.target.closest('#pres-ui')) go('next'); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
