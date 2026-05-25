(function() {
  let dragging = false, resizing = false, editing = false;
  let target = null, handle = null;
  let sx, sy, sl, st, sw, sh, ox, oy;

  function onDown(e) {
    if (editing) return;
    const el = e.target.closest('.canvas-el');
    const canvas = document.getElementById('slide-container');
    if (!canvas) return;

    // Clicked outside elements
    if (!el) {
      if (!e.target.closest('.rh')) {
        // Deselect
        document.querySelectorAll('.canvas-el.selected').forEach(d => d.classList.remove('selected'));
        App.sel = null;
        hidePanel();
        updateToolbar();
      }
      return;
    }

    // Resize handle?
    const rh = e.target.closest('.rh');
    if (rh) {
      startResize(el, rh, e);
      return;
    }

    // Select element
    const id = el.dataset.id;
    if (id) {
      // Update selection visual without full re-render
      document.querySelectorAll('.canvas-el.selected').forEach(d => d.classList.remove('selected'));
      el.classList.add('selected');
      App.sel = id;
      const sel = selEl();
      if (sel) showPanel(sel);
      updateToolbar();
    }

    // Start drag (but not on text element that's being edited)
    if (el.classList.contains('text-el') && el.contentEditable === 'true' && e.target === el) {
      return; // Let text editing work
    }
    startDrag(el, e);
  }

  function startDrag(el, e) {
    dragging = true;
    target = el;
    const cr = el.getBoundingClientRect();
    ox = e.clientX - cr.left;
    oy = e.clientY - cr.top;
    sl = el.offsetLeft;
    st = el.offsetTop;
    e.preventDefault();
  }

  function startResize(el, rh, e) {
    resizing = true;
    target = el;
    handle = rh;
    sx = e.clientX;
    sy = e.clientY;
    sl = el.offsetLeft;
    st = el.offsetTop;
    sw = el.offsetWidth;
    sh = el.offsetHeight;
    e.preventDefault();
    e.stopPropagation();
  }

  function onMove(e) {
    if (!dragging && !resizing) return;
    if (!target) return;

    const canvas = document.getElementById('slide-container');
    if (!canvas) return;
    const cr = canvas.getBoundingClientRect();

    if (dragging) {
      let nx = e.clientX - cr.left - ox;
      let ny = e.clientY - cr.top - oy;
      nx = Math.max(0, Math.min(nx, canvas.offsetWidth - target.offsetWidth));
      ny = Math.max(0, Math.min(ny, canvas.offsetHeight - target.offsetHeight));
      target.style.left = nx + 'px';
      target.style.top = ny + 'px';
    }

    if (resizing) {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      let nw = sw, nh = sh, nl = sl, nt = st;
      const cls = handle.className.split(' ')[1];
      if (cls.includes('e')) nw = Math.max(10, sw + dx);
      if (cls.includes('w')) { nw = Math.max(10, sw - dx); nl = sl + (sw - nw); }
      if (cls.includes('s')) nh = Math.max(10, sh + dy);
      if (cls.includes('n')) { nh = Math.max(10, sh - dy); nt = st + (sh - nh); }
      target.style.left = nl + 'px';
      target.style.top = nt + 'px';
      target.style.width = nw + 'px';
      target.style.height = nh + 'px';

      const id = target.dataset.id;
      if (id) {
        const el = selEl();
        if (el && el.type === 'arrow') {
          const svg = target.querySelector('svg');
          if (svg) svg.setAttribute('viewBox', `0 0 ${nw} ${nh}`);
        }
      }
    }
  }

  function onUp(e) {
    if (dragging || resizing) {
      const id = target?.dataset?.id;
      if (id && target) {
        const x = parseInt(target.style.left) || 0;
        const y = parseInt(target.style.top) || 0;
        const w = parseInt(target.style.width) || 0;
        const h = parseInt(target.style.height) || 0;
        const el = selEl();
        if (el && (el.x !== x || el.y !== y || el.width !== w || el.height !== h)) {
          save();
          updEl(id, { x, y, width: w, height: h });
        }
      }
    }
    dragging = false;
    resizing = false;
    target = null;
    handle = null;
  }

  // Text editing
  function onTextBlur(e) {
    const d = e.target.closest('.canvas-el.text-el');
    if (!d) return;
    const id = d.dataset.id;
    if (!id) return;
    const content = d.textContent;
    const el = selEl();
    if (el && el.content !== content) {
      save();
      updEl(id, { content });
    }
    editing = false;
  }

  function onTextFocus(e) {
    if (e.target.closest('.canvas-el.text-el')) editing = true;
  }

  // Editor context menu
  let ctxElId = null;
  function showEditorCtx(e, elId) {
    ctxElId = elId;
    const menu = document.getElementById('editor-ctx-menu');
    if (!menu) return;
    menu.classList.remove('hidden');
    menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
  }
  function hideEditorCtx() {
    const menu = document.getElementById('editor-ctx-menu');
    if (menu) menu.classList.add('hidden');
    ctxElId = null;
  }

  function onCtxMenu(e) {
    const el = e.target.closest('.canvas-el');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    hideEditorCtx();
    // Select the element first
    document.querySelectorAll('.canvas-el.selected').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    App.sel = el.dataset.id;
    const sel = selEl();
    if (sel) showPanel(sel);
    updateToolbar();
    showEditorCtx(e, el.dataset.id);
  }

  function onCtxClick(e) {
    const item = e.target.closest('.ctx-item');
    const action = item?.dataset.action;
    if (!action) return;
    hideEditorCtx();
    switch (action) {
      case 'copy': copyEl(); break;
      case 'paste': pasteEl(); break;
      case 'bring-forward': fwd(); break;
      case 'send-backward': bwd(); break;
      case 'delete': delEl(); break;
    }
  }

  // File drop
  function onDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files.length) return;
    for (const f of files) {
      if (f.type.startsWith('image/')) {
        const r = new FileReader();
        r.onload = ev => {
          const s = slide();
          if (!s) return;
          const rect = document.getElementById('slide-container')?.getBoundingClientRect();
          const x = e.clientX - (rect?.left || 0);
          const y = e.clientY - (rect?.top || 0);
          save();
          const el = { id: id(), type: 'image', src: ev.target.result, x: Math.max(0,x), y: Math.max(0,y), width: 300, height: 225 };
          s.elements.push(el);
          App.sel = el.id;
          renderSlide();
          renderThumbs();
          showPanel(el);
        };
        r.readAsDataURL(f);
      }
    }
  }

  function init() {
    const area = document.getElementById('canvas-area');
    if (!area) return;
    area.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('blur', onTextBlur, true);
    document.addEventListener('focus', onTextFocus, true);

    // Right-click context menu
    const sc = document.getElementById('slide-container');
    if (sc) {
      sc.addEventListener('contextmenu', onCtxMenu);
      sc.addEventListener('drop', onDrop);
      sc.addEventListener('dragover', e => e.preventDefault());
    }
    const ctxMenu = document.getElementById('editor-ctx-menu');
    if (ctxMenu) {
      ctxMenu.addEventListener('click', onCtxClick);
      // Hide on click outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#editor-ctx-menu')) hideEditorCtx();
      });
    }
  }

  window.hideEditorCtx = hideEditorCtx;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
