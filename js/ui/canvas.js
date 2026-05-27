(function() {
  let dragging = false, resizing = false, editing = false;
  let target = null, handle = null;
  let sx, sy, sl, st, sw, sh, ox, oy;
  let snapEnabled = true;
  const SNAP_THRESHOLD = 6;

  function getSnapPoints(cw, ch, excludeId) {
    const pts = { x: [0, cw, cw / 2], y: [0, ch, ch / 2] }
    const els = slide()?.elements || []
    for (const o of els) {
      if (o.id === excludeId) continue
      pts.x.push(o.x, o.x + o.width, o.x + o.width / 2)
      pts.y.push(o.y, o.y + o.height, o.y + o.height / 2)
    }
    return pts
  }

  function computeSnap(nx, ny, w, h, cw, ch, excludeId) {
    const pts = getSnapPoints(cw, ch, excludeId)
    const myX = [nx, nx + w, nx + w / 2]
    const myY = [ny, ny + h, ny + h / 2]
    let dx = 0, dy = 0, gx = null, gy = null
    for (const mx of myX) {
      for (const px of pts.x) {
        const d = px - mx
        if (Math.abs(d) < SNAP_THRESHOLD && (!dx || Math.abs(d) < Math.abs(dx))) {
          dx = d; gx = px
        }
      }
    }
    for (const my of myY) {
      for (const py of pts.y) {
        const d = py - my
        if (Math.abs(d) < SNAP_THRESHOLD && (!dy || Math.abs(d) < Math.abs(dy))) {
          dy = d; gy = py
        }
      }
    }
    return { dx, dy, gx, gy }
  }

  let guideContainer = null

  function ensureGuides(canvas) {
    if (!guideContainer) {
      guideContainer = document.createElement('div')
      guideContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
      canvas.appendChild(guideContainer)
    }
    return guideContainer
  }

  function showGuides(canvas, gx, gy) {
    const c = ensureGuides(canvas)
    c.innerHTML = ''
    if (gx != null) {
      const l = document.createElement('div')
      l.style.cssText = `position:absolute;top:0;left:${gx}px;width:1px;height:100%;background:#ff4444;opacity:0.85`
      c.appendChild(l)
    }
    if (gy != null) {
      const l = document.createElement('div')
      l.style.cssText = `position:absolute;top:${gy}px;left:0;width:100%;height:1px;background:#ff4444;opacity:0.85`
      c.appendChild(l)
    }
  }

  function clearGuides() {
    if (guideContainer) guideContainer.innerHTML = ''
  }

  function onDown(e) {
    if (editing) return;
    const el = e.target.closest('.canvas-el');
    const canvas = document.getElementById('slide-container');
    if (!canvas) return;

    if (!el) {
      if (!e.target.closest('.rh')) {
        if (!e.shiftKey) {
          App.selectedIds = []
          App.sel = null
          hidePanel()
          updateToolbar()
        }
      }
      return
    }

    const rh = e.target.closest('.rh');
    if (rh) {
      startResize(el, rh, e);
      return;
    }

    const id = el.dataset.id;
    if (id) {
      if (e.shiftKey) {
        const idx = App.selectedIds.indexOf(id)
        if (idx >= 0) {
          App.selectedIds.splice(idx, 1)
        } else {
          App.selectedIds.push(id)
        }
        if (App.selectedIds.length === 0) {
          App.sel = null
          hidePanel()
        } else {
          App.sel = App.selectedIds[App.selectedIds.length - 1]
          const sel = selEl()
          if (sel) showPanel(sel)
        }
      } else {
        App.selectedIds = [id]
        App.sel = id
        const sel = selEl()
        if (sel) showPanel(sel)
      }
      updateToolbar()
    }

    if ((e.ctrlKey || e.metaKey) && el.classList.contains('text-el')) {
      e.preventDefault()
      startDrag(el, e)
      return
    }

    if (el.classList.contains('text-el') && el.contentEditable === 'true' && e.target === el) {
      return;
    }
    startDrag(el, e);
  }

  let dragOrigins = []

  function startDrag(el, e) {
    dragging = true;
    target = el;
    const cr = el.getBoundingClientRect();
    ox = e.clientX - cr.left;
    oy = e.clientY - cr.top;
    sl = el.offsetLeft;
    st = el.offsetTop;
    dragOrigins = App.selectedIds.length > 1
      ? App.selectedIds.map(id => {
          const d = document.querySelector(`.canvas-el[data-id="${id}"]`)
          return d ? { id, left: d.offsetLeft, top: d.offsetTop } : null
        }).filter(Boolean)
      : []
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
      const tw = target.offsetWidth, th = target.offsetHeight
      if (snapEnabled) {
        const snap = computeSnap(nx, ny, tw, th, canvas.offsetWidth, canvas.offsetHeight, target.dataset.id)
        nx += snap.dx; ny += snap.dy
        showGuides(canvas, snap.gx, snap.gy)
      } else {
        clearGuides()
      }
      nx = Math.max(0, Math.min(nx, canvas.offsetWidth - tw));
      ny = Math.max(0, Math.min(ny, canvas.offsetHeight - th));
      const dx = nx - sl
      const dy = ny - st
      target.style.left = nx + 'px';
      target.style.top = ny + 'px';
      if (dragOrigins.length) {
        for (const o of dragOrigins) {
          if (o.id === target.dataset.id) continue
          const d = document.querySelector(`.canvas-el[data-id="${o.id}"]`)
          if (d) {
            d.style.left = (o.left + dx) + 'px'
            d.style.top = (o.top + dy) + 'px'
          }
        }
      }
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
      const allIds = dragging && dragOrigins.length
        ? [target.dataset.id, ...dragOrigins.map(o => o.id)]
        : [target?.dataset?.id]
      const updates = []
      for (const id of allIds) {
        if (!id) continue
        const d = document.querySelector(`.canvas-el[data-id="${id}"]`)
        if (!d) continue
        const x = parseInt(d.style.left) || 0
        const y = parseInt(d.style.top) || 0
        const w = parseInt(d.style.width) || 0
        const h = parseInt(d.style.height) || 0
        const el = slide()?.elements.find(e => e.id === id)
        if (el && (el.x !== x || el.y !== y || el.width !== w || el.height !== h)) {
          updates.push({ id, x, y, width: w, height: h })
        }
      }
      if (updates.length) {
        save()
        const s = slide()
        for (const u of updates) {
          const el = s?.elements.find(e => e.id === u.id)
          if (el) Object.assign(el, { x: u.x, y: u.y, width: u.width, height: u.height })
        }
        renderSlide()
        renderThumbs()
      }
    }
    dragging = false;
    resizing = false;
    target = null;
    handle = null;
    dragOrigins = [];
    clearGuides();
  }

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
    const id = el.dataset.id
    if (!App.selectedIds?.includes(id)) {
      App.selectedIds = [id]
      App.sel = id
    }
    const sel = selEl();
    if (sel) showPanel(sel);
    updateToolbar();
    showEditorCtx(e, id);
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
          const el = { id: id(), type: 'image', src: ev.target.result, x: Math.max(0, x), y: Math.max(0, y), width: 300, height: 225 };
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

    const sc = document.getElementById('slide-container');
    if (sc) {
      sc.addEventListener('contextmenu', onCtxMenu);
      sc.addEventListener('drop', onDrop);
      sc.addEventListener('dragover', e => e.preventDefault());
    }
    const ctxMenu = document.getElementById('editor-ctx-menu');
    if (ctxMenu) {
      ctxMenu.addEventListener('click', onCtxClick);
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#editor-ctx-menu')) hideEditorCtx();
      });
    }
  }

  window.hideEditorCtx = hideEditorCtx;
  window.setSnapEnabled = (v) => { snapEnabled = v }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
