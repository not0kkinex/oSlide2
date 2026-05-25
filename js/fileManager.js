(function() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/png,image/jpeg,image/gif,image/webp';
  inp.style.display = 'none';
  document.body.appendChild(inp);

  document.addEventListener('dragover', e => {
    if (e.target.closest('#canvas-area') || e.target.closest('#slide-list')) e.preventDefault();
  });
  document.addEventListener('drop', e => {
    if (e.target.closest('#canvas-area') || e.target.closest('#slide-list')) e.preventDefault();
  });

  window.importImageFromFile = function() { inp.click(); };

  inp.addEventListener('change', function() {
    if (this.files?.[0]) {
      const r = new FileReader();
      r.onload = e => {
        const s = slide();
        if (!s) return;
        save();
        const el = { id: id(), type: 'image', src: e.target.result, x: 100, y: 80, width: 300, height: 225 };
        s.elements.push(el);
        App.sel = el.id;
        renderSlide();
        renderThumbs();
        showPanel(el);
      };
      r.readAsDataURL(this.files[0]);
    }
    this.value = '';
  });
})();
