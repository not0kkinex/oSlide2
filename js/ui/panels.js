/**
 * Shows and populates the properties panel for an element
 * @param {Object} el - Element data
 * @returns {void}
 */
function showPanel(el) {
  const panel = document.getElementById('panel');
  const body = document.getElementById('panel-body');
  if (!panel || !body) return;
  panel.classList.remove('panel-hidden');
  let html = '';

  if (App.selectedIds?.length > 1) {
    html += `<div class="pg-section-label" style="text-align:center;color:var(--text-muted)">${App.selectedIds.length} eleman seçili</div>`
  }

  function f(label, key, type, opts) {
    const v = el[key] !== undefined ? el[key] : '';
    if (type === 'n') {
      html += `<div class="pg"><label class="pg-label">${label}</label><input type="number" data-k="${key}" value="${v}" ${opts?.min ? `min="${opts.min}"` : ''} ${opts?.step ? `step="${opts.step}"` : ''}></div>`;
    } else if (type === 't') {
      html += `<div class="pg"><label class="pg-label">${label}</label><input type="text" data-k="${key}" value="${esc(String(v))}"></div>`;
    } else if (type === 'c') {
      html += `<div class="pg"><label class="pg-label">${label} <input type="color" data-k="${key}" value="${v || '#000000'}"></label></div>`;
    } else if (type === 's') {
      html += `<div class="pg"><label class="pg-label">${label}</label><select data-k="${key}">${(opts?.options || []).map(o => `<option value="${o.v}"${v === o.v ? ' selected' : ''}>${o.l}</option>`).join('')}</select></div>`;
    }
  }

  function esc(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  html += '<div class="pg-row">';
  f(I18n.t('panel.x'), 'x', 'n');
  f(I18n.t('panel.y'), 'y', 'n');
  html += '</div><div class="pg-row">';
  f(I18n.t('panel.width'), 'width', 'n', { min: 10 });
  f(I18n.t('panel.height'), 'height', 'n', { min: 10 });
  html += '</div>';
  html += '<div class="pg-row">';
  f(I18n.t('panel.rotation'), 'rotation', 'n', { min: 0, step: 1 });
  f(I18n.t('panel.opacity'), 'opacity', 'n', { min: 0, step: 0.1 });
  html += '</div>';

  if (el.type === 'text' || el.type === 'title') {
    f(I18n.t('panel.content'), 'content', 't');
    f(I18n.t('panel.background'), 'bgColor', 'c');
    f(I18n.t('panel.fontFamily'), 'fontFamily', 's', {
      options: 'Arial,Helvetica,Georgia,Times New Roman,Courier New,Verdana'.split(',').map(x => ({ v: x, l: x }))
    });
    html += '<div class="pg-row">';
    f(I18n.t('panel.fontSize'), 'fontSize', 'n', { min: 8 });
    f(I18n.t('panel.color'), 'color', 'c');
    html += '</div>';
  }

  if (el.type === 'rect' || el.type === 'circle') {
    html += '<div class="pg-row">';
    f(I18n.t('panel.fill'), 'fill', 'c');
    f(I18n.t('panel.border'), 'borderColor', 'c');
    html += '</div><div class="pg-row">';
    f(I18n.t('panel.borderWidth'), 'borderWidth', 'n', { min: 0 });
    if (el.type === 'rect') f(I18n.t('panel.corner'), 'borderRadius', 'n', { min: 0 });
    html += '</div>';
  }

  if (el.type === 'image') f(I18n.t('panel.source'), 'src', 't');
  if (el.type === 'arrow') {
    html += '<div class="pg-row">';
    f(I18n.t('panel.color'), 'fill', 'c');
    f(I18n.t('panel.borderWidth'), 'borderWidth', 'n', { min: 1 });
    html += '</div>';
  }

  if (el.type === 'chart') {
    f(I18n.t('panel.chartType'), 'chartType', 's', {
      options: ['bar','line','pie','doughnut','polarArea','radar'].map(x => ({ v: x, l: x.charAt(0).toUpperCase() + x.slice(1) }))
    });
    html += '<div class="pg"><button class="btn-secondary" id="chart-edit-btn" style="width:100%"><i data-lucide="bar-chart-3"></i> ' + I18n.t('panel.chartEdit') + '</button></div>';
  }

  html += '<div class="pg-sep"></div><div class="pg-section-label">' + I18n.t('panel.animation') + '</div>';
  f(I18n.t('panel.animType'), 'animType', 's', {
    options: ['none','fade','slide-up','slide-down','slide-left','slide-right','zoom-in','zoom-out','bounce','pulse'].map(x => ({ v: x, l: I18n.t('anim.' + x.replace(/-([a-z])/g, (_, c) => c.toUpperCase())) }))
  });
  html += '<div class="pg-row">';
  f(I18n.t('panel.animDuration'), 'animDuration', 'n', { min: 0.1, step: 0.1 });
  f(I18n.t('panel.animDelay'), 'animDelay', 'n', { min: 0, step: 0.1 });
  html += '</div>';
  html += '<button id="apply-anim-all" class="btn-secondary" style="width:100%;margin-top:8px">' + I18n.t('anim.applyAll') + '</button>';

  body.innerHTML = html;
  const applyBtn = document.getElementById('apply-anim-all');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const e = selEl();
      if (!e || !e.animType || e.animType === 'none') return;
      save();
      const s = slide();
      if (!s) return;
      s.elements.forEach(el => {
        if (el.id !== e.id) {
          el.animType = e.animType;
          el.animDuration = e.animDuration;
          el.animDelay = e.animDelay;
        }
      });
      renderSlide();
      renderThumbs();
    });
  }
  if (window.lucide) lucide.createIcons();

  const chartEditBtn = document.getElementById('chart-edit-btn');
  if (chartEditBtn) {
    chartEditBtn.addEventListener('click', () => {
      const e = selEl();
      if (e && e.type === 'chart') openChartDialog(e);
    });
  }

  body.querySelectorAll('input,select').forEach(inp => {
    inp.addEventListener('change', () => {
      const k = inp.dataset.k;
      let v = inp.value;
      if (inp.type === 'number') v = parseFloat(v);
      if (inp.type === 'number' && isNaN(v)) return;
      const e = selEl();
      if (e) updEl(e.id, { [k]: v });
      updateToolbar();
    });
    inp.addEventListener('input', () => {
      if (inp.type !== 'color') return;
      const k = inp.dataset.k;
      const v = inp.value;
      const e = selEl();
      if (e) updEl(e.id, { [k]: v });
    });
  });
}

/** Hides the properties panel @returns {void} */
function hidePanel() {
  const panel = document.getElementById('panel');
  if (panel) panel.classList.add('panel-hidden');
}

window.showPanel = showPanel;
window.hidePanel = hidePanel;
