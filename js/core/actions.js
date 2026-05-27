/** Adds a new slide after the current slide @returns {void} */
function addSlide() {
  save();
  const bg = App.projectTheme?.canvasBg || '#ffffff'
  App.slides.splice(App.cur + 1, 0, { id: 's' + Date.now(), background: bg, elements: [], transition: 'fade', notes: '' });
  selectSlide(App.cur + 1);
}

/** @param {number} i - Slide index to delete (min 1 slide must remain) @returns {void} */
function delSlide(i) {
  if (App.slides.length < 2) return;
  save();
  App.slides.splice(i, 1);
  if (App.cur >= App.slides.length) App.cur = App.slides.length - 1;
  App.sel = null;
  renderAll();
}

/** Duplicates the current slide @returns {void} */
function dupSlide() {
  save();
  const c = slide();
  if (!c) return;
  const d = clone(c);
  d.id = 's' + Date.now();
  App.slides.splice(App.cur + 1, 0, d);
  selectSlide(App.cur + 1);
}

/** @param {number} i - Slide index to select @returns {void} */
function selectSlide(i) {
  if (i < 0 || i >= App.slides.length) return;
  App.cur = i;
  App.sel = null;
  App.selectedIds = [];
  renderAll();
  hidePanel();
}

/** @param {number} from - Source index @param {number} to - Target index @returns {void} */
function moveSlide(from, to) {
  if (from === to) return;
  save();
  const [s] = App.slides.splice(from, 1);
  App.slides.splice(to, 0, s);
  App.cur = to;
  renderAll();
}

/**
 * Adds an element to the current slide
 * @param {string} type - Element type
 * @param {Object} [props] - Optional properties (content, src, x, y, etc.)
 * @returns {void}
 */
function addEl(type, props) {
  save();
  const s = slide();
  if (!s) return;
  const el = { id: id(), type, x: 120, y: 80, width: 200, height: 60, ...EL_DEFAULTS[type] || {}, ...props };
  if (App.projectTheme) {
    const th = App.projectTheme
    if (type === 'text' || type === 'title') {
      const isTitle = type === 'title'
      el.color = isTitle ? th.titleColor : th.textColor
      el.fontFamily = isTitle ? th.titleFont : th.textFont
    }
    el.animType = th.animType
    el.animDuration = th.animDuration
  }
  if (type === 'title' && !el.content) el.content = I18n.t('element.title');
  if (type === 'text' && !el.content) el.content = I18n.t('element.text');
  if (type === 'image' && !el.src) {
    el.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#eee" width="400" height="300"/><text fill="#999" font-size="20" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">' + I18n.t('toolbar.image') + '</text></svg>'
    );
  }
  s.elements.push(el);
  App.sel = el.id;
  renderSlide();
  renderThumbs();
  showPanel(el);
  updateToolbar();
}

/** Deletes selected element(s) — uses selectedIds or sel @returns {void} */
function delEl() {
  const ids = App.selectedIds?.length ? App.selectedIds : (App.sel ? [App.sel] : [])
  if (!ids.length) return;
  save();
  const s = slide();
  if (!s) return;
  s.elements = s.elements.filter(e => !ids.includes(e.id));
  App.selectedIds = []
  App.sel = null;
  renderSlide();
  renderThumbs();
  hidePanel();
  updateToolbar();
}

/**
 * Updates element properties
 * @param {string} id - Element ID
 * @param {Object} props - Properties to merge
 * @returns {void}
 */
function updEl(id, props) {
  const e = slide()?.elements.find(x => x.id === id);
  if (!e) return;
  Object.assign(e, props);
  renderSlide();
  renderThumbs();
  if (App.sel === id) showPanel(e);
}

/** Copies selected element(s) to clipboard @returns {void} */
function copyEl() {
  const ids = App.selectedIds?.length ? App.selectedIds : (App.sel ? [App.sel] : [])
  if (!ids.length) return;
  const s = slide()
  if (!s) return
  App.clipboard = ids.map(eid => {
    const el = s.elements.find(e => e.id === eid)
    return el ? clone(el) : null
  }).filter(Boolean)
}

/** Pastes clipboard elements with offset @returns {void} */
function pasteEl() {
  if (!App.clipboard) return;
  const items = Array.isArray(App.clipboard) ? App.clipboard : [App.clipboard]
  if (!items.length) return;
  save();
  const s = slide();
  if (!s) return;
  const pasted = items.map(e => {
    const c = clone(e);
    c.id = id();
    c.x += 20;
    c.y += 20;
    return c;
  });
  s.elements.push(...pasted);
  App.selectedIds = pasted.map(e => e.id)
  App.sel = pasted[pasted.length - 1]?.id || null;
  renderSlide();
  renderThumbs();
  if (pasted.length === 1) showPanel(pasted[0]);
  updateToolbar();
}

/** Moves selected element forward in z-order @returns {void} */
function fwd() {
  const s = slide();
  if (!s || !App.sel) return;
  const i = s.elements.findIndex(e => e.id === App.sel);
  if (i < s.elements.length - 1) {
    save();
    [s.elements[i], s.elements[i + 1]] = [s.elements[i + 1], s.elements[i]];
    renderSlide();
    renderThumbs();
  }
}

/** Moves selected element backward in z-order @returns {void} */
function bwd() {
  const s = slide();
  if (!s || !App.sel) return;
  const i = s.elements.findIndex(e => e.id === App.sel);
  if (i > 0) {
    save();
    [s.elements[i], s.elements[i - 1]] = [s.elements[i - 1], s.elements[i]];
    renderSlide();
    renderThumbs();
  }
}

/** Toggles bold on selected text element @returns {void} */
function toggleBold() {
  const e = selEl();
  if (e && e.type === 'text') { updEl(e.id, { bold: !e.bold }); updateToolbar(); }
}

/** Toggles italic on selected text element @returns {void} */
function toggleItalic() {
  const e = selEl();
  if (e && e.type === 'text') { updEl(e.id, { italic: !e.italic }); updateToolbar(); }
}

/** Toggles underline on selected text element @returns {void} */
function toggleUnderline() {
  const e = selEl();
  if (e && e.type === 'text') { updEl(e.id, { underline: !e.underline }); updateToolbar(); }
}

/** Toggles strikethrough on selected text element @returns {void} */
function toggleStrikethrough() {
  const e = selEl();
  if (e && e.type === 'text') { updEl(e.id, { strikethrough: !e.strikethrough }); updateToolbar(); }
}

/** @returns {Array<Object>} Currently selected element objects */
function getSelected() {
  const ids = App.selectedIds?.length ? App.selectedIds : (App.sel ? [App.sel] : [])
  const s = slide()
  if (!s) return []
  return ids.map(id => s.elements.find(e => e.id === id)).filter(Boolean)
}

/**
 * Aligns selected elements to an edge or center
 * @param {string} edge - 'left'|'centerX'|'right'|'top'|'centerY'|'bottom'
 * @returns {void}
 */
function alignEls(edge) {
  const els = getSelected()
  if (els.length < 2) return
  save()
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const e of els) {
    if (e.x < minX) minX = e.x
    if (e.x + e.width > maxX) maxX = e.x + e.width
    if (e.y < minY) minY = e.y
    if (e.y + e.height > maxY) maxY = e.y + e.height
  }
  const midX = minX + (maxX - minX) / 2
  const midY = minY + (maxY - minY) / 2
  for (const e of els) {
    const props = {}
    if (edge === 'left') props.x = minX
    else if (edge === 'centerX') props.x = midX - e.width / 2
    else if (edge === 'right') props.x = maxX - e.width
    else if (edge === 'top') props.y = minY
    else if (edge === 'centerY') props.y = midY - e.height / 2
    else if (edge === 'bottom') props.y = maxY - e.height
    Object.assign(e, props)
  }
  renderSlide()
  renderThumbs()
}

/**
 * Distributes selected elements evenly
 * @param {string} axis - 'horizontal' or 'vertical'
 * @returns {void}
 */
function distributeEls(axis) {
  const els = getSelected()
  if (els.length < 3) return
  save()
  const sorted = [...els].sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y)
  if (axis === 'horizontal') {
    const totalW = sorted.reduce((s, e) => s + e.width, 0)
    const first = sorted[0], last = sorted[sorted.length - 1]
    const space = (last.x + last.width - first.x - totalW) / (sorted.length - 1)
    let cx = first.x
    for (const e of sorted) { e.x = cx; cx += e.width + space }
  } else {
    const totalH = sorted.reduce((s, e) => s + e.height, 0)
    const first = sorted[0], last = sorted[sorted.length - 1]
    const space = (last.y + last.height - first.y - totalH) / (sorted.length - 1)
    let cy = first.y
    for (const e of sorted) { e.y = cy; cy += e.height + space }
  }
  renderSlide()
  renderThumbs()
}

/**
 * Matches width/height of selected elements to the largest
 * @param {string} prop - 'width'|'height'|'both'
 * @returns {void}
 */
function matchEls(prop) {
  const els = getSelected()
  if (els.length < 2) return
  save()
  const maxW = Math.max(...els.map(e => e.width))
  const maxH = Math.max(...els.map(e => e.height))
  for (const e of els) {
    if (prop === 'width' || prop === 'both') e.width = maxW
    if (prop === 'height' || prop === 'both') e.height = maxH
  }
  renderSlide()
  renderThumbs()
}

window.addSlide = addSlide;
window.delSlide = delSlide;
window.dupSlide = dupSlide;
window.selectSlide = selectSlide;
window.moveSlide = moveSlide;
window.addEl = addEl;
window.delEl = delEl;
window.updEl = updEl;
window.copyEl = copyEl;
window.pasteEl = pasteEl;
window.fwd = fwd;
window.bwd = bwd;
window.toggleBold = toggleBold;
window.toggleItalic = toggleItalic;
window.toggleUnderline = toggleUnderline;
window.toggleStrikethrough = toggleStrikethrough;
window.alignEls = alignEls;
window.distributeEls = distributeEls;
window.matchEls = matchEls;
