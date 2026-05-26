(function() {
  let slides = [], cur = 0, timer = null, sec = 0, transDir = 'next'
  let _noData = 'Veri yok'
  let _hint = 'Ok tuşları ile gezin • ESC çıkış'

  const themes = {
    default: { bg: '#fff', text: '#222', accent: '#ffd700' },
    dark: { bg: '#111', text: '#e0e0e0', accent: '#ffd700' },
    nature: { bg: '#f5faf0', text: '#1a3a0a', accent: '#ccbb00' },
    ocean: { bg: '#eef6ff', text: '#002244', accent: '#ddcc00' }
  };

  async function init() {
    const w = document.getElementById('pres-wrapper');
    if (!w) return;

    const locale = localStorage.getItem('oslide2_locale') || 'tr'
    await I18n.init(locale)
    _noData = I18n.t('presentation.noData')
    _hint = I18n.t('presentation.hint')

    if (window.electronAPI?.onPresentationData) { window.electronAPI.onPresentationData(d => load(d)); return; }
    const stored = localStorage.getItem('presentationData');
    if (stored) { try { load(JSON.parse(stored)); } catch { w.innerHTML = '<div style="color:#fff;text-align:center;padding:40px">' + _noData + '</div>'; } }
    else { w.innerHTML = '<div style="color:#fff;text-align:center;padding:40px">' + _noData + '</div>'; }
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
        if (el.type === 'text') {
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
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': e.preventDefault(); go('next'); break;
      case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); go('prev'); break;
      case 'Escape': exit(); break;
      case 'Home': e.preventDefault(); jump(0); break;
      case 'End': e.preventDefault(); jump(slides.length - 1); break;
    }
  });
  document.addEventListener('wheel', e => { e.deltaY > 0 ? go('next') : go('prev'); }, { passive: true });
  document.addEventListener('click', e => { if (!e.target.closest('#pres-ui')) go('next'); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
})();
