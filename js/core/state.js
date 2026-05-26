const CoreState = {
  slides: [], cur: 0, theme: 'default', sel: null, path: null,
  dirty: false, undo: [], redo: [], maxUndo: 50, _eid: 1, clipboard: null,
  projectId: null, projectName: null, projectTheme: null
};

let _eidCounter = 1;
function genId() { return 'e' + (_eidCounter++); }
function cloneObj(o) { return JSON.parse(JSON.stringify(o)); }

function saveSnapshot() {
  CoreState.undo.push(cloneObj({ slides: CoreState.slides, cur: CoreState.cur }));
  if (CoreState.undo.length > CoreState.maxUndo) CoreState.undo.shift();
  CoreState.redo = [];
  CoreState.dirty = true;
}

function undoSnapshot() {
  if (!CoreState.undo.length) return;
  CoreState.redo.push(cloneObj({ slides: CoreState.slides, cur: CoreState.cur }));
  const s = CoreState.undo.pop();
  CoreState.slides = s.slides;
  CoreState.cur = Math.min(s.cur, CoreState.slides.length - 1);
  CoreState.sel = null;
}

function redoSnapshot() {
  if (!CoreState.redo.length) return;
  CoreState.undo.push(cloneObj({ slides: CoreState.slides, cur: CoreState.cur }));
  const s = CoreState.redo.pop();
  CoreState.slides = s.slides;
  CoreState.cur = Math.min(s.cur, CoreState.slides.length - 1);
  CoreState.sel = null;
}

function currentSlide() { return CoreState.slides[CoreState.cur]; }
function selectedElement() {
  return CoreState.sel ? (currentSlide()?.elements.find(e => e.id === CoreState.sel) || null) : null;
}

const ANIM_DEFAULTS = { animType: 'none', animDuration: 0.5, animDelay: 0 }

const EL_DEFAULTS = {
  text:    { fontSize: 20, fontFamily: 'Arial', color: '#333', bold: false, italic: false, underline: false, strikethrough: false, textAlign: 'left', bgColor: '', opacity: 1, rotation: 0, ...ANIM_DEFAULTS },
  title:   { fontSize: 48, fontFamily: 'Arial', color: '#222', bold: true, italic: false, underline: false, strikethrough: false, textAlign: 'center', width: 600, height: 80, x: 180, y: 120, bgColor: '', opacity: 1, rotation: 0, ...ANIM_DEFAULTS },
  image:   { width: 300, height: 225, opacity: 1, rotation: 0, ...ANIM_DEFAULTS },
  rect:    { fill: '#ffd700', borderColor: '#ffd700', borderWidth: 2, borderRadius: 0, width: 150, height: 100, opacity: 1, rotation: 0, ...ANIM_DEFAULTS },
  circle:  { fill: '#ffd700', borderColor: '#ffd700', borderWidth: 2, width: 120, height: 120, opacity: 1, rotation: 0, ...ANIM_DEFAULTS },
  arrow:   { fill: '#ffd700', borderWidth: 3, width: 200, height: 20, opacity: 1, rotation: 0, ...ANIM_DEFAULTS }
};

// Legacy aliases for backward compat
const App = CoreState;
const id = genId;
const clone = cloneObj;
const save = saveSnapshot;
const undo = undoSnapshot;
const redo = redoSnapshot;
const slide = currentSlide;
const selEl = selectedElement;

window.App = App;
window.CoreState = CoreState;
window.id = id;
window.clone = clone;
window.save = save;
window.undo = undo;
window.redo = redo;
window.slide = slide;
window.selEl = selEl;
window.EL_DEFAULTS = EL_DEFAULTS;
