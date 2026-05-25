function addSlide() { save(); App.slides.splice(App.cur + 1, 0, { id: 's' + Date.now(), background: '#ffffff', elements: [], transition: 'fade' }); selectSlide(App.cur + 1); }
function delSlide(i) { if (App.slides.length < 2) return; save(); App.slides.splice(i, 1); if (App.cur >= App.slides.length) App.cur = App.slides.length - 1; App.sel = null; renderAll(); }
function dupSlide() { save(); const c = slide(); if (!c) return; const d = clone(c); d.id = 's' + Date.now(); App.slides.splice(App.cur + 1, 0, d); selectSlide(App.cur + 1); }
function selectSlide(i) { if (i < 0 || i >= App.slides.length) return; App.cur = i; App.sel = null; renderAll(); hidePanel(); }
function moveSlide(from, to) { if (from === to) return; save(); const [s] = App.slides.splice(from, 1); App.slides.splice(to, 0, s); App.cur = to; renderAll(); }

function addEl(type, props) {
  save(); const s = slide(); if (!s) return;
  const el = { id: id(), type, x: 120, y: 80, width: 200, height: 60, ...EL_DEFAULTS[type] || {}, ...props };
  if (type === 'title' && !el.content) el.content = 'Başlık';
  if (type === 'text' && !el.content) el.content = 'Metin';
  if (type === 'image' && !el.src) el.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#eee" width="400" height="300"/><text fill="#999" font-size="20" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Resim</text></svg>');
  s.elements.push(el); App.sel = el.id;
  renderSlide(); renderThumbs(); showPanel(el); updateToolbar();
}

function delEl() {
  if (!App.sel) return; save(); const s = slide(); if (!s) return;
  s.elements = s.elements.filter(e => e.id !== App.sel); App.sel = null;
  renderSlide(); renderThumbs(); hidePanel(); updateToolbar();
}

function updEl(id, props) {
  const e = slide()?.elements.find(x => x.id === id); if (!e) return;
  Object.assign(e, props); renderSlide(); renderThumbs();
  if (App.sel === id) showPanel(e);
}

function copyEl() { const e = selEl(); if (!e) return; App.clipboard = clone(e); }

function pasteEl() {
  if (!App.clipboard) return;
  save(); const s = slide(); if (!s) return;
  const e = clone(App.clipboard); e.id = id(); e.x += 20; e.y += 20;
  s.elements.push(e); App.sel = e.id;
  renderSlide(); renderThumbs(); showPanel(e); updateToolbar();
}

function fwd() { const s = slide(); if (!s || !App.sel) return; const i = s.elements.findIndex(e => e.id === App.sel); if (i < s.elements.length - 1) { save(); [s.elements[i], s.elements[i+1]] = [s.elements[i+1], s.elements[i]]; renderSlide(); renderThumbs(); } }
function bwd() { const s = slide(); if (!s || !App.sel) return; const i = s.elements.findIndex(e => e.id === App.sel); if (i > 0) { save(); [s.elements[i], s.elements[i-1]] = [s.elements[i-1], s.elements[i]]; renderSlide(); renderThumbs(); } }

function toggleBold() { const e = selEl(); if (e && e.type === 'text') { updEl(e.id, { bold: !e.bold }); updateToolbar(); } }
function toggleItalic() { const e = selEl(); if (e && e.type === 'text') { updEl(e.id, { italic: !e.italic }); updateToolbar(); } }
function toggleUnderline() { const e = selEl(); if (e && e.type === 'text') { updEl(e.id, { underline: !e.underline }); updateToolbar(); } }
function toggleStrikethrough() { const e = selEl(); if (e && e.type === 'text') { updEl(e.id, { strikethrough: !e.strikethrough }); updateToolbar(); } }

window.addSlide = addSlide; window.delSlide = delSlide; window.dupSlide = dupSlide;
window.selectSlide = selectSlide; window.moveSlide = moveSlide;
window.addEl = addEl; window.delEl = delEl; window.updEl = updEl;
window.copyEl = copyEl; window.pasteEl = pasteEl;
window.fwd = fwd; window.bwd = bwd;
window.toggleBold = toggleBold; window.toggleItalic = toggleItalic;
window.toggleUnderline = toggleUnderline; window.toggleStrikethrough = toggleStrikethrough;
