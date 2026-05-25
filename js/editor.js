async function addImage() {
  if (window.electronAPI?.openImageDialog) { const r=await window.electronAPI.openImageDialog(); if(r)addEl('image',{src:`data:${r.mime};base64,${r.data}`}); else addEl('image'); }
  else { const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>addEl('image',{src:ev.target.result});r.readAsDataURL(f);}; inp.click(); }
}

function newProject() {
  if (App.dirty&&!confirm('Kaydedilmemiş değişiklikler var. Yeni proje?')) return;
  App.slides=[{id:'s1',background:'#ffffff',transition:'fade',elements:[
    {id:id(),type:'text',content:'oSlide2',x:180,y:160,width:600,height:100,fontSize:64,fontFamily:'Arial',color:'#222',bold:true,italic:false,underline:false,strikethrough:false,textAlign:'center',bgColor:'',opacity:1,rotation:0},
    {id:id(),type:'text',content:'Sunumlarınızı oluşturun',x:200,y:280,width:560,height:40,fontSize:22,fontFamily:'Arial',color:'#666',bold:false,italic:false,underline:false,strikethrough:false,textAlign:'center',bgColor:'',opacity:1,rotation:0}
  ]}];
  App.cur=0; App.sel=null; App.path=null; App.dirty=false; App.undo=[]; App.redo=[];
  renderAll(); hidePanel();
}

function getData() { return { version:'1.0', theme:App.theme, slides:App.slides }; }
function loadData(d) { App.slides=d.slides; App.theme=d.theme||'default'; App.cur=0; App.sel=null; App.path=null; App.dirty=false; renderAll(); hidePanel(); }

async function saveProject() {
  if (!window.electronAPI) return saveFallback();
  if (!App.path) return await saveProjectAs();
  const result = await window.electronAPI.saveFile(getData());
  if (result) App.path = result;
  App.dirty = false;
  await updateProjectMeta();
}

async function saveProjectAs() {
  if (!window.electronAPI) return saveFallback();
  const r = await window.electronAPI.saveFileAs(getData());
  if (r) { App.path = r; App.dirty = false; await updateProjectMeta(); }
}

async function updateProjectMeta() {
  if (App.projectId && window.electronAPI?.updateProjectMeta) {
    await window.electronAPI.updateProjectMeta({ projectId: App.projectId, slideCount: App.slides.length, path: App.path });
  }
}

function saveFallback() { const b=new Blob([JSON.stringify(getData(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='sunum.slidelab'; a.click(); URL.revokeObjectURL(a); }

function startPresentation() { if(window.electronAPI)window.electronAPI.startPresentation(getData()); else { localStorage.setItem('presentationData',JSON.stringify(getData())); window.open('presentation.html','_blank'); } }
async function exportPDF() { if(window.electronAPI)await window.electronAPI.exportPDF(buildExportHTML()); }
async function exportPNG() { if(window.electronAPI)await window.electronAPI.exportPNG(getData()); }

function buildExportHTML() {
  let h=''; getData().slides.forEach((s,i)=>{ h+=`<div class="sp" style="background:${s.background||'#fff'}">`; s.elements.forEach(el=>{
    const st=`position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;opacity:${el.opacity!==undefined?el.opacity:1};transform:rotate(${el.rotation||0}deg)`;
    if(el.type==='text'){const deco=[];if(el.underline)deco.push('underline');if(el.strikethrough)deco.push('line-through');h+=`<div style="${st};font-size:${el.fontSize||16}px;font-family:${el.fontFamily||'Arial'};color:${el.color||'#333'};font-weight:${el.bold?'bold':'normal'};font-style:${el.italic?'italic':'normal'};text-decoration:${deco.join(' ')};background:${el.bgColor||'transparent'};text-align:${el.textAlign||'left'};overflow:hidden;word-wrap:break-word">${escHtml(el.content||'')}</div>`;}
    else if(el.type==='image')h+=`<div style="${st};overflow:hidden"><img src="${el.src}" style="width:100%;height:100%;object-fit:contain"></div>`;
    else if(el.type==='rect')h+=`<div style="${st};background:${el.fill||'#ffd700'};border:${el.borderWidth||2}px solid ${el.borderColor||'#ffd700'};border-radius:${el.borderRadius||0}px"></div>`;
    else if(el.type==='circle')h+=`<div style="${st};background:${el.fill||'#ffd700'};border:${el.borderWidth||2}px solid ${el.borderColor||'#ffd700'};border-radius:50%"></div>`;
    else if(el.type==='arrow')h+=`<div style="${st}"><svg width="${el.width}" height="${el.height}" viewBox="0 0 ${el.width} ${el.height}"><defs><marker id="ex_${el.id}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${el.fill||'#ffd700'}"/></marker></defs><line x1="0" y1="${el.height/2}" x2="${el.width}" y2="${el.height/2}" stroke="${el.fill||'#ffd700'}" stroke-width="${el.borderWidth||3}" marker-end="url(#ex_${el.id})"/></svg></div>`;
  }); h+='</div>'; });
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#111}.sp{width:960px;height:540px;position:relative;overflow:hidden;margin:20px auto;box-shadow:0 2px 10px rgba(0,0,0,0.3)}</style></head><body>'+h+'</body></html>';
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function loadProjectData(d) {
  if (d._projectId) App.projectId = d._projectId;
  if (d._projectName) App.projectName = d._projectName;
  loadData(d);
  const name = d._projectName || 'Proje';
  document.title = `oSlide2 - ${name}`;
}

function init() {
  newProject();
  document.getElementById('add-slide-btn')?.addEventListener('click', addSlide);
  document.getElementById('dup-slide-btn')?.addEventListener('click', dupSlide);
  document.getElementById('panel-close')?.addEventListener('click', hidePanel);
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      switch (btn.dataset.action) {
        case 'add-text': addEl('text'); break; case 'add-title': addEl('title'); break; case 'add-image': addImage(); break;
        case 'add-rect': addEl('rect'); break; case 'add-circle': addEl('circle'); break; case 'add-arrow': addEl('arrow'); break;
        case 'delete': delEl(); break; case 'bold': toggleBold(); break; case 'italic': toggleItalic(); break;
        case 'underline': toggleUnderline(); break; case 'strikethrough': toggleStrikethrough(); break;
        case 'align-left': { const e=selEl(); if(e)updEl(e.id,{textAlign:'left'}); updateToolbar(); break; }
        case 'align-center': { const e=selEl(); if(e)updEl(e.id,{textAlign:'center'}); updateToolbar(); break; }
        case 'align-right': { const e=selEl(); if(e)updEl(e.id,{textAlign:'right'}); updateToolbar(); break; }
        case 'bring-forward': fwd(); break; case 'send-backward': bwd(); break;
        case 'start-presentation': startPresentation(); break;
      }
    });
  });
  document.getElementById('font-family-select')?.addEventListener('change',function(){const e=selEl();if(e)updEl(e.id,{fontFamily:this.value});});
  document.getElementById('font-size-select')?.addEventListener('change',function(){const e=selEl();if(e)updEl(e.id,{fontSize:parseInt(this.value)||16});});
  document.getElementById('text-color-input')?.addEventListener('input',function(){const e=selEl();if(e)updEl(e.id,{color:this.value});});
  document.getElementById('text-bg-color')?.addEventListener('input',function(){const e=selEl();if(e&&e.type==='text')updEl(e.id,{bgColor:this.value});});
  document.getElementById('slide-bg-color')?.addEventListener('input',function(){const s=slide();if(!s)return;save();s.background=this.value;renderSlide();renderThumbs();});
  document.getElementById('theme-select')?.addEventListener('change',function(){
    App.theme=this.value; const bgs={default:'#fff',dark:'#1e1e1e',nature:'#f0f7e6',ocean:'#e6f3ff'};
    const s=slide(); if(s){save();s.background=bgs[App.theme]||'#fff';document.getElementById('slide-bg-color').value=s.background;renderSlide();renderThumbs();}
  });

  if (window.lucide) lucide.createIcons();

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); return; }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); return; }
    if (e.ctrlKey && e.key === 'c') { e.preventDefault(); copyEl(); return; }
    if (e.ctrlKey && e.key === 'v') { e.preventDefault(); pasteEl(); return; }
    if ((e.key === 'Delete'||e.key==='Backspace')&&!e.target.closest('.text-el[contenteditable]')&&!e.target.closest('input,select')) { e.preventDefault(); delEl(); }
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); toggleBold(); }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); toggleItalic(); }
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); toggleUnderline(); }
    if (e.key === 'F5') { e.preventDefault(); startPresentation(); }
  });

  document.getElementById('home-btn')?.addEventListener('click', () => {
    if (window.electronAPI) window.electronAPI.returnHome();
  });

  if (window.electronAPI) {
    window.electronAPI.onMenuAction(action => {
      switch (action) {
        case 'new': newProject(); break; case 'save': saveProject(); break; case 'save-as': saveProjectAs(); break;
        case 'undo': undo(); break; case 'redo': redo(); break; case 'delete': delEl(); break;
        case 'add-text': addEl('text'); break; case 'add-title': addEl('title'); break; case 'add-image': addImage(); break;
        case 'add-rect': addEl('rect'); break; case 'add-circle': addEl('circle'); break; case 'add-arrow': addEl('arrow'); break;
        case 'start-presentation': startPresentation(); break; case 'export-pdf': exportPDF(); break; case 'export-png': exportPNG(); break;
      }
    });
    window.electronAPI.onFileOpen(d => loadData(d));
    window.electronAPI.onLoadProject(d => loadProjectData(d));
  }
}

window.addImage = addImage; window.newProject = newProject; window.getData = getData;
window.loadData = loadData; window.saveProject = saveProject; window.saveProjectAs = saveProjectAs;
window.startPresentation = startPresentation; window.exportPDF = exportPDF; window.exportPNG = exportPNG;
window.loadProjectData = loadProjectData;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
