const App = {
  slides: [], cur: 0, theme: 'default', sel: null, path: null,
  dirty: false, undo: [], redo: [], maxUndo: 50, _eid: 1, clipboard: null,
  projectId: null, projectName: null
};

function id() { return 'e' + (App._eid++); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

function save() {
  App.undo.push(clone({ slides: App.slides, cur: App.cur }));
  if (App.undo.length > App.maxUndo) App.undo.shift(); App.redo = []; App.dirty = true;
}
function undo() {
  if (!App.undo.length) return;
  App.redo.push(clone({ slides: App.slides, cur: App.cur }));
  const s = App.undo.pop(); App.slides = s.slides; App.cur = Math.min(s.cur, App.slides.length - 1);
  App.sel = null; renderAll(); hidePanel();
}
function redo() {
  if (!App.redo.length) return;
  App.undo.push(clone({ slides: App.slides, cur: App.cur }));
  const s = App.redo.pop(); App.slides = s.slides; App.cur = Math.min(s.cur, App.slides.length - 1);
  App.sel = null; renderAll(); hidePanel();
}

function slide() { return App.slides[App.cur]; }
function selEl() { return App.sel ? (slide()?.elements.find(e => e.id === App.sel) || null) : null; }

const EL_DEFAULTS = {
  text: { fontSize: 20, fontFamily: 'Arial', color: '#333', bold: false, italic: false, underline: false, strikethrough: false, textAlign: 'left', bgColor: '', opacity: 1, rotation: 0 },
  title: { fontSize: 48, fontFamily: 'Arial', color: '#222', bold: true, italic: false, underline: false, strikethrough: false, textAlign: 'center', width: 600, height: 80, x: 180, y: 120, bgColor: '', opacity: 1, rotation: 0 },
  image: { width: 300, height: 225, opacity: 1, rotation: 0 },
  rect: { fill: '#ffd700', borderColor: '#ffd700', borderWidth: 2, borderRadius: 0, width: 150, height: 100, opacity: 1, rotation: 0 },
  circle: { fill: '#ffd700', borderColor: '#ffd700', borderWidth: 2, width: 120, height: 120, opacity: 1, rotation: 0 },
  arrow: { fill: '#ffd700', borderWidth: 3, width: 200, height: 20, opacity: 1, rotation: 0 }
};

window.App = App; window.id = id; window.clone = clone;
window.save = save; window.undo = undo; window.redo = redo;
window.slide = slide; window.selEl = selEl;
window.EL_DEFAULTS = EL_DEFAULTS;
