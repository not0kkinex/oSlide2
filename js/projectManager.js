const ProjectManager = {
  config: { projects: [], recentProjects: [], settings: { theme: 'dark', autoSave: true } },
  _loaded: false,

  async init() {
    if (this._loaded) return;
    if (window.electronAPI) {
      const cfg = await window.electronAPI.getConfig();
      if (cfg) this.config = cfg;
    } else {
      const stored = localStorage.getItem('oslide2_config');
      if (stored) try { this.config = JSON.parse(stored); } catch {}
    }
    this._loaded = true;
  },

  async save() {
    if (window.electronAPI) {
      await window.electronAPI.saveConfig(this.config);
    } else {
      localStorage.setItem('oslide2_config', JSON.stringify(this.config));
    }
  },

  async getAll() {
    await this.init();
    return this.config.projects;
  },

  async getRecent() {
    await this.init();
    const ids = this.config.recentProjects || [];
    const map = {};
    this.config.projects.forEach(p => map[p.id] = p);
    return ids.map(id => map[id]).filter(Boolean);
  },

  async getById(id) {
    await this.init();
    return this.config.projects.find(p => p.id === id) || null;
  },

  async create(name, template = 'blank') {
    await this.init();
    const id = 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    let slideData = getTemplateSlides(template);
    const project = {
      id, name, path: null, lastModified: now, created: now,
      slideCount: slideData.slides.length, thumbnail: null
    };
    this.config.projects.push(project);
    this.addRecent(id);
    await this.save();
    return { project, slideData };
  },

  async open(id) {
    const p = await this.getById(id);
    if (!p) return null;
    this.addRecent(id);
    await this.save();
    if (window.electronAPI && p.path) {
      const data = await window.electronAPI.readFile(p.path);
      if (data) return { project: p, slideData: data };
    }
    // Fallback: return project metadata and empty slides
    return { project: p, slideData: { version: '1.0', theme: 'default', slides: [] } };
  },

  async delete(id) {
    await this.init();
    const idx = this.config.projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    const p = this.config.projects[idx];
    if (p.path && window.electronAPI) {
      await window.electronAPI.deleteFile(p.path);
    }
    this.config.projects.splice(idx, 1);
    this.config.recentProjects = this.config.recentProjects.filter(rid => rid !== id);
    await this.save();
    return true;
  },

  async rename(id, newName) {
    await this.init();
    const p = this.config.projects.find(p => p.id === id);
    if (!p) return false;
    p.name = newName;
    await this.save();
    return true;
  },

  async duplicate(id) {
    await this.init();
    const p = this.config.projects.find(p => p.id === id);
    if (!p) return null;
    const newId = 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    const dup = { ...p, id: newId, name: p.name + ' (Kopya)', created: now, lastModified: now, path: null };
    this.config.projects.push(dup);
    this.addRecent(newId);
    await this.save();
    return dup;
  },

  async updateThumbnail(id, thumbData) {
    const p = this.config.projects.find(p => p.id === id);
    if (!p) return;
    p.thumbnail = thumbData;
    await this.save();
  },

  async updateSlideCount(id, count) {
    const p = this.config.projects.find(p => p.id === id);
    if (!p) return;
    p.slideCount = count;
    p.lastModified = new Date().toISOString();
    await this.save();
  },

  async setProjectPath(id, filePath) {
    const p = this.config.projects.find(p => p.id === id);
    if (!p) return;
    p.path = filePath;
    await this.save();
  },

  addRecent(id) {
    this.config.recentProjects = this.config.recentProjects.filter(rid => rid !== id);
    this.config.recentProjects.unshift(id);
    if (this.config.recentProjects.length > 10) this.config.recentProjects.pop();
  },

  async search(query) {
    await this.init();
    const q = query.toLowerCase();
    return this.config.projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }
};

function getTemplateSlides(template) {
  switch (template) {
    case 'business':
      return { version: '1.0', theme: 'default', slides: [
        { id:'s1', background:'#ffffff', transition:'fade', elements:[
          { id:'e1', type:'text', content:'İş Sunumu', x:180, y:160, width:600, height:100, fontSize:56, fontFamily:'Arial', color:'#222', bold:true, italic:false, underline:false, strikethrough:false, textAlign:'center', bgColor:'', opacity:1, rotation:0 },
          { id:'e2', type:'text', content:'Şirket Adı • 2024', x:200, y:290, width:560, height:40, fontSize:20, fontFamily:'Arial', color:'#666', bold:false, italic:false, underline:false, strikethrough:false, textAlign:'center', bgColor:'', opacity:1, rotation:0 }
        ]},
        { id:'s2', background:'#ffffff', transition:'fade', elements:[
          { id:'e3', type:'text', content:'Gündem', x:80, y:60, width:400, height:60, fontSize:36, fontFamily:'Arial', color:'#222', bold:true, italic:false, underline:false, strikethrough:false, textAlign:'left', bgColor:'', opacity:1, rotation:0 },
          { id:'e4', type:'text', content:'• Pazar Analizi\n• Stratejik Hedefler\n• Finansal Özet\n• Yol Haritası', x:80, y:150, width:500, height:200, fontSize:20, fontFamily:'Arial', color:'#444', bold:false, italic:false, underline:false, strikethrough:false, textAlign:'left', bgColor:'', opacity:1, rotation:0 }
        ]},
        { id:'s3', background:'#ffffff', transition:'fade', elements:[
          { id:'e5', type:'text', content:'Teşekkürler', x:180, y:200, width:600, height:80, fontSize:48, fontFamily:'Arial', color:'#222', bold:true, italic:false, underline:false, strikethrough:false, textAlign:'center', bgColor:'', opacity:1, rotation:0 }
        ]}
      ]};
    case 'education':
      return { version:'1.0', theme:'default', slides:[
        { id:'s1', background:'#ffffff', transition:'fade', elements:[
          { id:'e1', type:'text', content:'Eğitim Sunumu', x:180, y:160, width:600, height:100, fontSize:52, fontFamily:'Arial', color:'#222', bold:true, italic:false, underline:false, strikethrough:false, textAlign:'center', bgColor:'', opacity:1, rotation:0 }
        ]},
        { id:'s2', background:'#ffffff', transition:'fade', elements:[
          { id:'e2', type:'text', content:'Konu Başlığı', x:80, y:60, width:500, height:50, fontSize:32, fontFamily:'Arial', color:'#222', bold:true, italic:false, underline:false, strikethrough:false, textAlign:'left', bgColor:'', opacity:1, rotation:0 },
          { id:'e3', type:'text', content:'Buraya açıklama metnini yazın...', x:80, y:140, width:700, height:200, fontSize:20, fontFamily:'Arial', color:'#444', bold:false, italic:false, underline:false, strikethrough:false, textAlign:'left', bgColor:'', opacity:1, rotation:0 }
        ]},
        { id:'s3', background:'#ffffff', transition:'fade', elements:[
          { id:'e4', type:'text', content:'Özet', x:80, y:60, width:300, height:50, fontSize:32, fontFamily:'Arial', color:'#222', bold:true, italic:false, underline:false, strikethrough:false, textAlign:'left', bgColor:'', opacity:1, rotation:0 },
          { id:'e5', type:'text', content:'Ana başlıkları özetleyin...', x:80, y:140, width:700, height:200, fontSize:20, fontFamily:'Arial', color:'#444', bold:false, italic:false, underline:false, strikethrough:false, textAlign:'left', bgColor:'', opacity:1, rotation:0 }
        ]}
      ]};
    case 'minimal':
      return { version:'1.0', theme:'default', slides:[
        { id:'s1', background:'#ffffff', transition:'fade', elements:[
          { id:'e1', type:'text', content:'Başlık', x:80, y:200, width:800, height:100, fontSize:60, fontFamily:'Arial', color:'#111', bold:true, italic:false, underline:false, strikethrough:false, textAlign:'center', bgColor:'', opacity:1, rotation:0 }
        ]},
        { id:'s2', background:'#ffffff', transition:'fade', elements:[
          { id:'e2', type:'text', content:'İçerik', x:100, y:100, width:760, height:300, fontSize:28, fontFamily:'Arial', color:'#333', bold:false, italic:false, underline:false, strikethrough:false, textAlign:'left', bgColor:'', opacity:1, rotation:0 }
        ]}
      ]};
    default:
      return { version:'1.0', theme:'default', slides:[
        { id:'s1', background:'#ffffff', transition:'fade', elements:[
          { id:'e1', type:'text', content:'oSlide2', x:180, y:160, width:600, height:100, fontSize:64, fontFamily:'Arial', color:'#222', bold:true, italic:false, underline:false, strikethrough:false, textAlign:'center', bgColor:'', opacity:1, rotation:0 },
          { id:'e2', type:'text', content:'Sunumunuzu oluşturun', x:200, y:280, width:560, height:40, fontSize:22, fontFamily:'Arial', color:'#666', bold:false, italic:false, underline:false, strikethrough:false, textAlign:'center', bgColor:'', opacity:1, rotation:0 }
        ]}
      ]};
  }
}

window.ProjectManager = ProjectManager;
