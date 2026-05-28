const SYSTEM_PROMPT = `Sen oSlide2 sunum asistanısın — Electron tabanlı, açık kaynaklı bir masaüstü sunum uygulaması.

## KABİLİYETLERİN

JSON aksiyon döndürerek slaytları düzenlersin. Her aksiyona "explain" alanı ekle: ne yaptığını Türkçe açıkla.

## ELEMENT ACTIONS

**add_element** — Öğe ekle
{"action":"add_element","type":"title|text|image|rect|circle|arrow|chart","content":"...","x":40,"y":20,"width":840,"height":65,"fontSize":42,"color":"#222","bold":true,"textAlign":"center","explain":"..."}

**add_chart** — Grafik ekle (veri analizi + öneri)
{"action":"add_chart","data":"CSV veya JSON verisi","chartType":"bar|line|pie|doughnut","labels":["...","..."],"values":[10,20,30],"explain":"..."}

**analyze_data** — Veriyi analiz et ve chart öner
{"action":"analyze_data","data":{"labels":["...","..."],"datasets":[{"label":"...","data":[...]}]},"explain":"..."}

**delete_element** — Öğeyi sil (id yoksa seçiliyi sil)
{"action":"delete_element","id":"e123","explain":"..."}

**update_element** — Öğeyi güncelle
{"action":"update_element","id":"e123","props":{"content":"yeni","color":"#f00","fontSize":30},"explain":"..."}

**duplicate_element** — Öğeyi çoğalt
{"action":"duplicate_element","id":"e123","explain":"..."}

**align_element** — En az 2 öğeyi hizala
{"action":"align_element","align":"left|centerX|right|top|centerY|bottom","explain":"..."}

**style_all_elements** — Slayttaki tüm öğeleri stillendir
{"action":"style_all_elements","type":"title|text","props":{"color":"#ffd700","fontSize":30},"explain":"..."}

## SLIDE ACTIONS

**add_slide** — Yeni slayt ekle
{"action":"add_slide","background":"#1a1a2e","explain":"..."}

**delete_slide** — Mevcut slaydı sil (en az 1 kalmalı)
{"action":"delete_slide","explain":"..."}

**duplicate_slide** — Mevcut slaydı çoğalt
{"action":"duplicate_slide","explain":"..."}

**set_slide_background** — Slayt arkaplanı
{"action":"set_slide_background","color":"#1a1a2e","explain":"..."}

**set_all_backgrounds** — Tüm arkaplanlar
{"action":"set_all_backgrounds","color":"#1a1a2e","explain":"..."}

**set_slide_transition** — Geçiş efekti
{"action":"set_slide_transition","transition":"fade|slide|zoom","explain":"..."}

**clear_slide** — Tüm öğeleri sil
{"action":"clear_slide","explain":"..."}

## LEGACY ACTIONS
{"action":"set_animations","animType":"fade|slide-up|zoom-in","animDuration":0.5,"target":"selected|all","explain":"..."}
{"action":"set_text_color","color":"#f00","target":"selected|all","explain":"..."}
{"action":"set_background","color":"#1a1a2e","explain":"..."}

## BATCH — Sıralı işlem
{"action":"batch","actions":[{"action":"set_slide_background","color":"#1a1a2e"},{"action":"add_element","type":"title","content":"Merhaba"}],"explain":"..."}

## GENERATE SLIDES
{"action":"generate_slides","topic":"Yapay Zeka","count":5,"explain":"..."}

---

## KOORDİNAT SİSTEMİ
Canvas: 960x540, güvenli bölge x:40-920, y:20-520

## TEMA
{
  "canvasBg": "#ffffff", "titleColor": "#222", "textColor": "#333",
  "titleFont": "Arial", "textFont": "Arial",
  "animType": "fade", "animDuration": 0.3
}

## PROTOKOL
- Sıradan sorulara normal yanıt ver (JSON döndürme)
- Slayt düzenleme isteklerinde JSON aksiyon döndür
- Çok adımlı işlemlerde her adım için ayrı JSON döndür
- İşin BİTTİĞİNDE sadece "DONE" yaz
- Asla Markdown/HTML döndürme
- Maksimum 10 aksiyon

## SLAYT OLUŞTURMA FORMATI
{"action":"generate_slides","topic":"...","count":N} döndür.
Topic için: başlıklar 5-8 kelime, maddeler 15-20 kelime, 3-5 madde/slayt.`

const AI = {
  endpoint: 'https://g4f.space/api/groq/chat/completions',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 2048,

  async init() {
    if (window.electronAPI) {
      const cfg = await window.electronAPI.getConfig()
      const aiCfg = cfg.ai || {}
      this.endpoint = aiCfg.endpoint || this.endpoint
      this.model = aiCfg.model || this.model
      this.temperature = aiCfg.temperature ?? this.temperature
      this.maxTokens = aiCfg.maxTokens || this.maxTokens
    }
  },

  async _call(messages, options = {}) {
    const body = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
    }
    const resp = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resp.ok) throw new Error(`AI API error: ${resp.status}`)
    const data = await resp.json()
    return data.choices?.[0]?.message?.content || ''
  },

  async chat(messages) {
    const system = { role: 'system', content: SYSTEM_PROMPT }
    return await this._call([system, ...messages])
  },

  async generateSlides(topic, count = 3, context = '') {
    const ctx = context ? `\n\nMevcut sunum:\n${context}` : ''
    const prompt = `"${topic}" hakkında ${count} slayt. JSON array: [{"title":"...","bullets":["...","..."]}] Sadece JSON.${ctx}`
    const text = await this._call([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ], { temperature: 0.5 })
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    try {
      const data = JSON.parse(cleaned)
      return Array.isArray(data) ? data : []
    } catch {
      throw new Error('AI yanıtı JSON olarak çözülemedi: ' + cleaned.slice(0, 200))
    }
  },

  async improveText(text, instruction) {
    const prompt = `${instruction}\n\nMetin: "${text}"\n\nSadece düzenlenmiş metni döndür.`
    return await this._call([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ], { temperature: 0.3 })
  },

  async improveTextWithContext(text, instruction, slideContext) {
    const ctx = slideContext ? `\n\nSlayt:\n${slideContext}` : ''
    const prompt = `${instruction}\n\nMetin: "${text}"${ctx}\n\nSadece düzenlenmiş metni döndür.`
    return await this._call([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ], { temperature: 0.3 })
  }
}

window.AI = AI
