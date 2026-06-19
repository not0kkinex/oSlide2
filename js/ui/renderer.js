let dragSrcIdx = null;

/**
 * Generates a content cache key for an element
 * @param {Object} el - Element data
 * @returns {string} Cache key string
 */
function contentKey(el) {
  switch (el.type) {
    case 'title': case 'text':
      return `t:${el.content}|${el.fontSize}|${el.fontFamily}|${el.color}|${el.bold}|${el.italic}|${el.underline}|${el.strikethrough}|${el.textAlign}|${el.bgColor}`
    case 'image':
      return `i:${(el.src || '').slice(0, 60)}`
    case 'rect':
      return `r:${el.fill}|${el.borderColor}|${el.borderWidth}|${el.borderRadius}`
    case 'circle':
      return `c:${el.fill}|${el.borderColor}|${el.borderWidth}`
    case 'arrow':
      return `a:${el.fill}|${el.borderWidth}|${el.width}|${el.height}`
    case 'chart':
      return `ch:${el.chartType}|${JSON.stringify(el.chartData || {})}`
    default:
      return ''
  }
}

/** Renders current slide into the DOM (diff-based, skips unchanged elements) @returns {void} */
function renderSlide() {
  const c = document.getElementById('slide-container');
  const s = slide();
  if (!s || !c) return;

  const bg = s.background || '#fff';
  if (c.dataset.bg !== bg) {
    c.style.background = bg;
    c.dataset.bg = bg;
    document.getElementById('canvas').style.background = bg;
  }

  if (document.activeElement?.closest?.('.canvas-el.text-el[contenteditable]')) return;

  const elIds = new Set(s.elements.map(el => el.id));

  Array.from(c.querySelectorAll('.canvas-el')).forEach(child => {
    if (!elIds.has(child.dataset.id)) child.remove();
  });

  s.elements.forEach((el, i) => {
    let d = c.querySelector(`[data-id="${el.id}"]`);
    const isNew = !d;

    if (isNew) {
      d = document.createElement('div');
      d.dataset.id = el.id;
      c.appendChild(d);
    }

    const isSel = el.id === App.sel || App.selectedIds?.includes(el.id);
    const cls = 'canvas-el' + (el.type === 'text' || el.type === 'title' ? ' text-el' : '') + (isSel ? ' selected' : '');
    if (d.className !== cls) d.className = cls;

    const css = `left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${i}` + (el.opacity !== undefined && el.opacity < 1 ? `;opacity:${el.opacity}` : '') + (el.rotation ? `;transform:rotate(${el.rotation}deg)` : '');

    if (d.dataset.css !== css) {
      d.style.cssText = css;
      d.dataset.css = css;
    }

    const ck = contentKey(el);
    if (isNew || d.dataset.ck !== ck) {
      if (el.type === 'chart' && window.chartDestroy) chartDestroy(el.id);
      d.innerHTML = '';
      renderEl(d, el);
      d.dataset.ck = ck;
    }

    if (isNew) addHandles(d);
  });

  if (window.updateStatusBar) window.updateStatusBar();
}

/**
 * Renders a single element into a DOM container
 * @param {HTMLElement} d - Target DOM element
 * @param {Object} el - Element data
 * @returns {void}
 */
function renderEl(d, el) {
  switch (el.type) {
    case 'title':
    case 'text':
      d.textContent = el.content || '';
      applyTextStyle(d, el);
      break;
    case 'image':
      const img = document.createElement('img');
      img.src = el.src;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none';
      d.appendChild(img);
      d.style.overflow = 'hidden';
      break;
    case 'rect':
      d.style.background = el.fill || '#ffd700';
      d.style.border = `${el.borderWidth || 2}px solid ${el.borderColor || '#ffd700'}`;
      d.style.borderRadius = (el.borderRadius || 0) + 'px';
      break;
    case 'circle':
      d.style.background = el.fill || '#ffd700';
      d.style.border = `${el.borderWidth || 2}px solid ${el.borderColor || '#ffd700'}`;
      d.style.borderRadius = '50%';
      break;
    case 'arrow':
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('viewBox', `0 0 ${el.width} ${el.height}`);
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      m.setAttribute('id', 'ah_' + el.id);
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
      l.setAttribute('marker-end', 'url(#ah_' + el.id + ')');
      svg.appendChild(l);
      svg.style.pointerEvents = 'none';
      d.appendChild(svg);
      break;
    case 'chart':
      const cv = document.createElement('canvas');
      cv.style.cssText = 'width:100%;height:100%;pointer-events:none';
      d.appendChild(cv);
      d.style.overflow = 'hidden';
      requestAnimationFrame(() => chartRender(cv, el));
      break;
  }
}

/**
 * Applies typography CSS to a text/title element
 * @param {HTMLElement} d - DOM element
 * @param {Object} el - Element data
 * @returns {void}
 */
function applyTextStyle(d, el) {
  d.style.fontSize = (el.fontSize || 16) + 'px';
  d.style.fontFamily = el.fontFamily || 'Arial';
  d.style.color = el.color || '#333';
  d.style.fontWeight = el.bold ? 'bold' : 'normal';
  d.style.fontStyle = el.italic ? 'italic' : 'normal';
  d.style.textAlign = el.textAlign || 'left';
  const deco = [];
  if (el.underline) deco.push('underline');
  if (el.strikethrough) deco.push('line-through');
  d.style.textDecoration = deco.join(' ');
  d.style.background = el.bgColor || 'transparent';
  d.style.overflow = 'hidden';
  d.style.wordWrap = 'break-word';
  d.style.outline = 'none';
  d.style.border = 'none';
}

/**
 * Adds 8 resize handles (nw, n, ne, e, se, s, sw, w) to an element
 * @param {HTMLElement} d - DOM element
 * @returns {void}
 */
function addHandles(d) {
  for (const p of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
    const h = document.createElement('div');
    h.className = 'rh ' + p;
    d.appendChild(h);
  }
}

/** Renders all slide thumbnails (diff-based, reuses existing DOM nodes) @returns {void} */
function renderThumbs() {
  const list = document.getElementById('slide-list');
  if (!list) return;

  const existing = Array.from(list.children);
  const existingIdx = new Map();
  existing.forEach(t => {
    const idx = parseInt(t.dataset.index);
    if (!isNaN(idx)) existingIdx.set(idx, t);
  });

  App.slides.forEach((s, i) => {
    let t = existingIdx.get(i);

    if (!t) {
      t = document.createElement('div');
      t.className = 'slide-thumb';
      t.dataset.index = i;
      t.draggable = true;
      const n = document.createElement('span');
      n.className = 'thumb-number';
      t.appendChild(n);
      const del = document.createElement('button');
      del.className = 'thumb-del';
      del.textContent = '×';
      t.appendChild(del);
      const inner = document.createElement('div');
      inner.className = 'thumb-inner';
      t.appendChild(inner);
      t.addEventListener('dragstart', e => {
        dragSrcIdx = i;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => t.classList.add('dragging'), 0);
      });
      t.addEventListener('dragend', () => {
        t.classList.remove('dragging');
        document.querySelectorAll('.slide-thumb')
          .forEach(el => el.classList.remove('drag-over'));
        dragSrcIdx = null;
      });
      t.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.slide-thumb')
          .forEach(el => el.classList.remove('drag-over'));
        t.classList.add('drag-over');
      });
      t.addEventListener('dragleave', e => {
        if (t.contains(e.relatedTarget)) return;
        t.classList.remove('drag-over');
      });
      t.addEventListener('drop', e => {
        e.preventDefault();
        t.classList.remove('drag-over');
        if (dragSrcIdx === null || dragSrcIdx === i) return;
        moveSlide(dragSrcIdx, i);
        dragSrcIdx = null;
      });
      t.onclick = () => selectSlide(i);
      if (i < list.children.length) list.insertBefore(t, list.children[i]);
      else list.appendChild(t);
    }

    t.classList.toggle('active', i === App.cur);
    t.querySelector('.thumb-number').textContent = i + 1;
    t.querySelector('.thumb-del').onclick = e => { e.stopPropagation(); delSlide(i); };

    const inner = t.querySelector('.thumb-inner');
    const bg = s.background || '#fff';
    if (inner.dataset.bg !== bg) {
      inner.style.background = bg;
      inner.dataset.bg = bg;
    }

    let thumbHtml = '';
    s.elements.forEach(el => {
      const st = `position:absolute;left:${el.x * 0.2}px;top:${el.y * 0.2}px;width:${el.width * 0.2}px;height:${el.height * 0.2}px`;
      if (el.type === 'text' || el.type === 'title') {
        thumbHtml += `<div style="${st};font-size:${(el.fontSize||16)*0.2}px;color:${el.color||'#333'};overflow:hidden;font-family:${el.fontFamily||'Arial'}">${escThumb(el.content||'')}</div>`;
      } else if (el.type === 'image') {
        thumbHtml += `<div style="${st};background:url(${el.src}) center/contain no-repeat"></div>`;
      } else if (el.type === 'rect') {
        thumbHtml += `<div style="${st};background:${el.fill||'#ffd700'};border-radius:${(el.borderRadius||0)*0.2}px"></div>`;
      } else if (el.type === 'circle') {
        thumbHtml += `<div style="${st};background:${el.fill||'#ffd700'};border-radius:50%"></div>`;
      } else if (el.type === 'arrow') {
        thumbHtml += `<div style="${st};border-top:${(el.borderWidth||3)*0.2}px solid ${el.fill||'#ffd700'}"></div>`;
      } else if (el.type === 'chart') {
        const ct = el.chartType || 'bar';
        thumbHtml += `<div style="${st};font-size:8px;color:#888;display:flex;align-items:center;justify-content:center">${ct === 'pie' ? '\u25D0' : '\u25AE'}</div>`;
      }
    });

    if (inner.dataset.thumb !== thumbHtml) {
      inner.innerHTML = thumbHtml;
      inner.dataset.thumb = thumbHtml;
    }
  });

  existing.forEach(t => {
    const idx = parseInt(t.dataset.index);
    if (isNaN(idx) || idx >= App.slides.length) t.remove();
  });
}

/** Escapes HTML entities for thumbnail text @param {string} s @returns {string} */
function escThumb(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Full re-render: slide + thumbnails + toolbar + status + notes @returns {void} */
function renderAll() {
  renderSlide();
  renderThumbs();
  updateToolbar();
  const bgInput = document.getElementById('slide-bg-color');
  if (bgInput) bgInput.value = slide()?.background || '#ffffff';
  if (window.updateStatusBar) window.updateStatusBar();
  if (typeof syncNotes === 'function') syncNotes();
}

/** Updates toolbar button states based on selection @returns {void} */
function updateToolbar() {
  const el = selEl();
  const bold = document.querySelector('[data-action="bold"]');
  const italic = document.querySelector('[data-action="italic"]');
  const ul = document.querySelector('[data-action="underline"]');
  const st = document.querySelector('[data-action="strikethrough"]');
  const font = document.getElementById('font-family-select');
  const size = document.getElementById('font-size-select');
  const color = document.getElementById('text-color-input');
  const bg = document.getElementById('text-bg-color');
  if (el && el.type === 'text') {
    bold?.classList.toggle('active', !!el.bold);
    italic?.classList.toggle('active', !!el.italic);
    ul?.classList.toggle('active', !!el.underline);
    st?.classList.toggle('active', !!el.strikethrough);
    if (font) font.value = el.fontFamily || 'Arial';
    if (size) size.value = String(el.fontSize || 16);
    if (color) color.value = el.color || '#333';
    if (bg) bg.value = el.bgColor || '#000000';
  } else {
    bold?.classList.remove('active');
    italic?.classList.remove('active');
    ul?.classList.remove('active');
    st?.classList.remove('active');
  }
}

window.renderSlide = renderSlide;
window.renderThumbs = renderThumbs;
window.renderAll = renderAll;
window.updateToolbar = updateToolbar;
