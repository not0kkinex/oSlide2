function renderSlide() {
  const c = document.getElementById('slide-container'); const s = slide();
  if (!s || !c) return;
  c.style.background = s.background || '#fff';
  document.getElementById('canvas').style.background = s.background || '#fff';
  if (document.activeElement?.closest?.('.canvas-el.text-el[contenteditable]')) return;
  c.innerHTML = '';
  const frag = document.createDocumentFragment();
  s.elements.forEach((el, i) => {
    const d = document.createElement('div');
    d.className = 'canvas-el' + (el.type === 'text' ? ' text-el' : '') + (el.id === App.sel ? ' selected' : '');
    d.dataset.id = el.id;
    let css = `left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${i}`;
    if (el.opacity !== undefined && el.opacity < 1) css += `;opacity:${el.opacity}`;
    if (el.rotation) css += `;transform:rotate(${el.rotation}deg)`;
    d.style.cssText = css;
    renderEl(d, el); addHandles(d); frag.appendChild(d);
  });
  c.appendChild(frag);
}

function renderEl(d, el) {
  switch (el.type) {
    case 'text':
      d.contentEditable = true; d.textContent = el.content || ''; applyTextStyle(d, el); break;
    case 'image':
      const img = document.createElement('img'); img.src = el.src;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none';
      d.appendChild(img); d.style.overflow = 'hidden'; break;
    case 'rect':
      d.style.background = el.fill || '#ffd700';
      d.style.border = `${el.borderWidth||2}px solid ${el.borderColor||'#ffd700'}`;
      d.style.borderRadius = (el.borderRadius||0) + 'px'; break;
    case 'circle':
      d.style.background = el.fill || '#ffd700';
      d.style.border = `${el.borderWidth||2}px solid ${el.borderColor||'#ffd700'}`;
      d.style.borderRadius = '50%'; break;
    case 'arrow':
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('width','100%'); svg.setAttribute('height','100%');
      svg.setAttribute('viewBox',`0 0 ${el.width} ${el.height}`);
      const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
      const m = document.createElementNS('http://www.w3.org/2000/svg','marker');
      m.setAttribute('id','ah_'+el.id); m.setAttribute('markerWidth','10'); m.setAttribute('markerHeight','7');
      m.setAttribute('refX','10'); m.setAttribute('refY','3.5'); m.setAttribute('orient','auto');
      const p = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      p.setAttribute('points','0 0, 10 3.5, 0 7'); p.setAttribute('fill',el.fill||'#ffd700');
      m.appendChild(p); defs.appendChild(m); svg.appendChild(defs);
      const l = document.createElementNS('http://www.w3.org/2000/svg','line');
      l.setAttribute('x1','0'); l.setAttribute('y1',el.height/2);
      l.setAttribute('x2',el.width); l.setAttribute('y2',el.height/2);
      l.setAttribute('stroke',el.fill||'#ffd700'); l.setAttribute('stroke-width',el.borderWidth||3);
      l.setAttribute('marker-end','url(#ah_'+el.id+')');
      svg.appendChild(l); svg.style.pointerEvents = 'none'; d.appendChild(svg); break;
  }
}

function applyTextStyle(d, el) {
  d.style.fontSize = (el.fontSize||16)+'px';
  d.style.fontFamily = el.fontFamily||'Arial';
  d.style.color = el.color||'#333';
  d.style.fontWeight = el.bold ? 'bold' : 'normal';
  d.style.fontStyle = el.italic ? 'italic' : 'normal';
  d.style.textAlign = el.textAlign || 'left';
  const deco = []; if (el.underline) deco.push('underline'); if (el.strikethrough) deco.push('line-through');
  d.style.textDecoration = deco.join(' ');
  d.style.background = el.bgColor || 'transparent';
  d.style.overflow = 'hidden'; d.style.wordWrap = 'break-word';
  d.style.outline = 'none'; d.style.border = 'none';
}

function addHandles(d) { for (const p of ['nw','n','ne','e','se','s','sw','w']) { const h = document.createElement('div'); h.className = 'rh '+p; d.appendChild(h); } }

function renderThumbs() {
  const list = document.getElementById('slide-list'); if (!list) return;
  list.innerHTML = '';
  App.slides.forEach((s, i) => {
    const t = document.createElement('div');
    t.className = 'slide-thumb'+(i===App.cur?' active':'');
    t.dataset.index = i; t.draggable = true;
    const n = document.createElement('span'); n.className = 'thumb-number'; n.textContent = i+1; t.appendChild(n);
    const del = document.createElement('button'); del.className = 'thumb-del'; del.textContent = '×';
    del.onclick = e => { e.stopPropagation(); delSlide(i); }; t.appendChild(del);
    const inner = document.createElement('div'); inner.className = 'thumb-inner'; inner.style.background = s.background||'#fff';
    s.elements.forEach(el => {
      const x = document.createElement('div');
      x.style.cssText = `position:absolute;left:${el.x*0.2}px;top:${el.y*0.2}px;width:${el.width*0.2}px;height:${el.height*0.2}px`;
      if (el.type === 'text') { x.textContent = el.content||''; x.style.fontSize = ((el.fontSize||16)*0.2)+'px'; x.style.color = el.color||'#333'; x.style.overflow='hidden'; x.style.fontFamily = el.fontFamily||'Arial'; }
      else if (el.type === 'image') x.style.background = `url(${el.src}) center/contain no-repeat`;
      else if (el.type === 'rect') { x.style.background = el.fill||'#ffd700'; x.style.borderRadius = ((el.borderRadius||0)*0.2)+'px'; }
      else if (el.type === 'circle') { x.style.background = el.fill||'#ffd700'; x.style.borderRadius = '50%'; }
      else if (el.type === 'arrow') x.style.borderTop = `${(el.borderWidth||3)*0.2}px solid ${el.fill||'#ffd700'}`;
      inner.appendChild(x);
    });
    t.appendChild(inner);
    t.onclick = () => selectSlide(i);
    t.ondragstart = e => { e.dataTransfer.setData('text/plain', i); t.classList.add('drag-over'); };
    t.ondragend = () => t.classList.remove('drag-over');
    t.ondragover = e => e.preventDefault();
    t.ondrop = e => { e.preventDefault(); const f = parseInt(e.dataTransfer.getData('text/plain')); if (f !== i) moveSlide(f, i); };
    list.appendChild(t);
  });
}

function renderAll() { renderSlide(); renderThumbs(); updateToolbar(); document.getElementById('slide-bg-color').value = slide()?.background||'#ffffff'; }

function showPanel(el) {
  const panel = document.getElementById('panel'); const body = document.getElementById('panel-body');
  if (!panel || !body) return; panel.classList.remove('panel-hidden');
  let html = '';
  const f = (label, key, type, opts) => {
    const v = el[key] !== undefined ? el[key] : '';
    if (type === 'n') html += `<div class="pg"><label class="pg-label">${label}</label><input type="number" data-k="${key}" value="${v}" ${opts?.min?`min="${opts.min}"`:''} ${opts?.step?`step="${opts.step}"`:''}></div>`;
    else if (type === 't') html += `<div class="pg"><label class="pg-label">${label}</label><input type="text" data-k="${key}" value="${esc(String(v))}"></div>`;
    else if (type === 'c') html += `<div class="pg"><label class="pg-label">${label} <input type="color" data-k="${key}" value="${v||'#000000'}"></label></div>`;
    else if (type === 's') html += `<div class="pg"><label class="pg-label">${label}</label><select data-k="${key}">${(opts?.options||[]).map(o => `<option value="${o.v}"${v===o.v?' selected':''}>${o.l}</option>`).join('')}</select></div>`;
  };
  function esc(s) { return String(s).replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
  html += '<div class="pg-row">'; f('X','x','n'); f('Y','y','n'); html += '</div><div class="pg-row">'; f('W','width','n',{min:10}); f('H','height','n',{min:10}); html += '</div>';
  html += '<div class="pg-row">'; f('Dönüş','rotation','n',{min:0,step:1}); f('Opaklık','opacity','n',{min:0,step:0.1}); html += '</div>';
  if (el.type === 'text') {
    f('İçerik','content','t'); f('Arkaplan','bgColor','c');
    f('Yazı Tipi','fontFamily','s',{options:'Arial,Helvetica,Georgia,Times New Roman,Courier New,Verdana'.split(',').map(x=>({v:x,l:x}))});
    html += '<div class="pg-row">'; f('Boyut','fontSize','n',{min:8}); f('Renk','color','c'); html += '</div>';
  }
  if (el.type === 'rect'||el.type === 'circle') { html += '<div class="pg-row">'; f('Dolgu','fill','c'); f('Kenar','borderColor','c'); html += '</div><div class="pg-row">'; f('Kalınlık','borderWidth','n',{min:0}); if(el.type==='rect') f('Köşe','borderRadius','n',{min:0}); html += '</div>'; }
  if (el.type === 'image') f('Kaynak','src','t');
  if (el.type === 'arrow') { html += '<div class="pg-row">'; f('Renk','fill','c'); f('Kalınlık','borderWidth','n',{min:1}); html += '</div>'; }
  body.innerHTML = html;
  body.querySelectorAll('input,select').forEach(inp => {
    inp.addEventListener('change',()=>{const k=inp.dataset.k;let v=inp.value;if(inp.type==='number')v=parseFloat(v);if(inp.type==='number'&&isNaN(v))return;const e=selEl();if(e)updEl(e.id,{[k]:v});updateToolbar();});
    inp.addEventListener('input',()=>{if(inp.type!=='color'&&inp.type!=='text')return;const k=inp.dataset.k;let v=inp.value;const e=selEl();if(e)updEl(e.id,{[k]:v});});
  });
}

function hidePanel() { document.getElementById('panel')?.classList.add('panel-hidden'); }

function updateToolbar() {
  const el = selEl();
  const bold = document.querySelector('[data-action="bold"]'); const italic = document.querySelector('[data-action="italic"]');
  const ul = document.querySelector('[data-action="underline"]'); const st = document.querySelector('[data-action="strikethrough"]');
  const font = document.getElementById('font-family-select'); const size = document.getElementById('font-size-select');
  const color = document.getElementById('text-color-input'); const bg = document.getElementById('text-bg-color');
  if (el && el.type === 'text') {
    bold?.classList.toggle('active',!!el.bold); italic?.classList.toggle('active',!!el.italic);
    ul?.classList.toggle('active',!!el.underline); st?.classList.toggle('active',!!el.strikethrough);
    if (font) font.value = el.fontFamily||'Arial'; if (size) size.value = String(el.fontSize||16);
    if (color) color.value = el.color||'#333'; if (bg) bg.value = el.bgColor||'#000000';
  } else { bold?.classList.remove('active'); italic?.classList.remove('active'); ul?.classList.remove('active'); st?.classList.remove('active'); }
}

window.renderSlide = renderSlide; window.renderThumbs = renderThumbs; window.renderAll = renderAll;
window.showPanel = showPanel; window.hidePanel = hidePanel; window.updateToolbar = updateToolbar;
