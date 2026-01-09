/* ================= CAESAR CIPHER ENCRYPTION ================= */
function caesarEncrypt(text, shift = 3) {
  return text.replace(/[a-zA-Z]/g, function(char) {
    const start = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - start + shift) % 26 + 26) % 26 + start);
  });
}

function caesarDecrypt(text, shift = 3) {
  return caesarEncrypt(text, -shift);
}

function decryptApiKey(encryptedKey, shift = 3) {
  return caesarDecrypt(encryptedKey, shift);
}

/* ================= ACCESS CONTROL ================= */
(function(){
  const STORAGE_KEY   = "site_access_v2";
  const USED_KEY      = "site_used_codes_v2";
  const SHOW_DELAY_MS = 3000;
  const REAUTH_EVERY_DAYS = 0;

  const CODES = {
  "boost-ctr-07": {
    "ttlMs": 604800000,
    "oneTime": true
  },
  "boost-ctr-30": {
    "ttlMs": 2592000000,
    "oneTime": true
  },
  "boost-ctr": {
    "ttlMs": 0,
    "oneTime": false
  },
  "temp": {
    "ttlMs": 15000,
    "oneTime": true
  },
  "trial": {
    "ttlMs": 600000,
    "oneTime": true
  },
  "daniel-boost-ctr": {
    "ttlMs": 0,
    "oneTime": false
  },
  "denys-lifetime": {
    "ttlMs": 0,
    "oneTime": false
  },
  "vova-test": {
    "ttlMs": 0,
    "oneTime": true
  }
};

  const SUP = ["en","ru","uk","es"];
  const STR = {
    en:{title:'Access Required', desc:'Enter access code to continue', ph:'Enter access code', btn:'Enter',
        ok:'✓ Access granted!', err:'✗ Invalid access code', used:'✗ This code was already used', expired:'✗ Code expired'},
    ru:{title:'Требуется доступ', desc:'Введите код доступа для продолжения', ph:'Введите код доступа', btn:'Войти',
        ok:'✓ Доступ разрешён!', err:'✗ Неверный код доступа', used:'✗ Этот код уже использован', expired:'✗ Срок кода истёк'},
    uk:{title:'Потрібен доступ', desc:'Введіть код доступу для продовження', ph:'Введіть код доступу', btn:'Увійти',
        ok:'✓ Доступ надано!', err:'✗ Невірний код', used:'✗ Цей код уже використано', expired:'✗ Термін дії коду вичерпано'},
    es:{title:'Acceso requerido', desc:'Ingresa el código para continuar', ph:'Código de acceso', btn:'Entrar',
        ok:'✓ ¡Acceso concedido!', err:'✗ Código inválido', used:'✗ Este código ya fue usado', expired:'✗ Código expirado'}
  };

  function pickLang(){
    const html=(document.documentElement.getAttribute('lang')||'').toLowerCase();
    let saved='';try{saved=(localStorage.getItem('ui_lang')||'').toLowerCase();}catch{}
    const wcur=(typeof window.currentLang==='string'&&window.currentLang.toLowerCase())||'';
    const nav=(navigator.language||'en').toLowerCase().split('-')[0];
    return [html,saved,wcur,nav].find(l=>SUP.includes(l))||'en';
  }
  function T(){
    const lang=pickLang();
    try{const tt=window?.translations?.gate?.[lang]||window?.translations?.[lang];if(tt&&tt.title)return tt;}catch{}
    return STR[lang]||STR.en;
  }

  function now(){return Date.now();}
  function loadState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}catch{return null}}
  function saveState(s){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s));}catch{}}
  function clearState(){try{localStorage.removeItem(STORAGE_KEY);}catch{}}
  function loadUsed(){try{return JSON.parse(localStorage.getItem(USED_KEY)||"{}")}catch{return {}}}
  function markUsed(code){const u=loadUsed();u[code]=now();try{localStorage.setItem(USED_KEY,JSON.stringify(u));}catch{}}
  function isUsed(code){return !!loadUsed()[code];}

  function hasAccess(){
    const s=loadState();if(!s||!s.granted)return false;
    const reauthMs=REAUTH_EVERY_DAYS>0?REAUTH_EVERY_DAYS*24*60*60*1000:0;
    const maxAlive=reauthMs?(s.grantedAt+reauthMs):Infinity;
    const until=s.expiresAt>0?Math.min(s.expiresAt,maxAlive):maxAlive;
    if(now()<until)return true; clearState();return false;
  }
  function grant(code,meta){
    const grantedAt=now();
    const reauthMs=REAUTH_EVERY_DAYS>0?REAUTH_EVERY_DAYS*24*60*60*1000:0;
    const ttlMs=meta.ttlMs||0;
    const expCode=ttlMs?(grantedAt+ttlMs):0;
    const expPolicy=reauthMs?(grantedAt+reauthMs):0;
    const expiresAt=expCode&&expPolicy?Math.min(expCode,expPolicy):(expCode||expPolicy||0);
    saveState({granted:true,code,grantedAt,expiresAt,version:2});
    if(meta.oneTime)markUsed(code);
  }

  function showGate(){
    if(hasAccess())return;
    const host=document.createElement('div');
    host.style.position='fixed';host.style.inset='0';host.style.zIndex='2147483000';
    document.body.appendChild(host);
    const root=host.attachShadow({mode:'open'});
    root.innerHTML=`<style>
      :host{all:initial;}
      .wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,.08);backdrop-filter:blur(12px) saturate(140%);
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
      .card{width:min(460px,calc(100% - 40px));border-radius:20px;padding:24px 20px;text-align:center;
            color:#e8edf6;background:rgba(16,21,34,.92);border:1px solid rgba(255,255,255,.1);
            box-shadow:0 20px 60px rgba(0,0,0,.5);backdrop-filter:blur(16px) saturate(180%);
            animation:pop .4s cubic-bezier(.34,1.56,.64,1)}
      .logo{width:72px;height:72px;margin:0 auto 16px;border-radius:22px;background:linear-gradient(135deg,#86a0ff,#6ee7ff);
            display:grid;place-items:center;font-size:32px;animation:pulse 2s ease-in-out infinite}
      h2{margin:0 0 8px;font-weight:900;font-size:22px}
      p{margin:0 0 14px;color:#9aa7bd;font-size:13px}
      input{width:100%;box-sizing:border-box;background:rgba(15,21,38,.85);border:2px solid rgba(31,42,68,.85);
            border-radius:14px;padding:14px;color:#e8edf6;font-weight:600;font-size:16px;margin-bottom:12px}
      button{width:100%;padding:14px;border:0;border-radius:14px;cursor:pointer;background:linear-gradient(135deg,#86a0ff,#6ee7ff);
             color:#0a0d14;font-weight:800;font-size:16px;box-shadow:0 12px 30px rgba(134,160,255,.35);transition:transform .18s}
      button:active{transform:scale(.98)}
      .msg{min-height:18px;margin-top:10px;font-size:13px;font-weight:700;opacity:0;transition:opacity .25s}
      @keyframes pop{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
    </style>
    <div class="wrap"><div class="card">
      <div class="logo">🔐</div>
      <h2 id="t"></h2><p id="d"></p>
      <input id="inp" type="text" autocomplete="off" inputmode="text" maxlength="64"/>
      <button id="btn"></button>
      <div id="msg" class="msg"></div>
    </div></div>`;
    const els={t:root.getElementById('t'),d:root.getElementById('d'),inp:root.getElementById('inp'),btn:root.getElementById('btn'),msg:root.getElementById('msg')};
    function applyI18n(){const l=T();els.t.textContent=l.title;els.d.textContent=l.desc;els.inp.placeholder=l.ph;els.btn.textContent=l.btn;}
    function toast(txt,ok){els.msg.textContent=txt;els.msg.style.color=ok?"#67f3a2":"#ff6b6b";els.msg.style.opacity="1";setTimeout(()=>els.msg.style.opacity="0",2000);}
    function close(){host.remove();}
    applyI18n();setTimeout(()=>els.inp.focus(),50);
    const mo=new MutationObserver(m=>{if(m.some(x=>x.attributeName==='lang'))applyI18n();});
    mo.observe(document.documentElement,{attributes:true});
    els.btn.addEventListener('click',()=>{
      const raw=(els.inp.value||'').trim().toLowerCase();
      const meta=CODES[raw];const l=T();
      if(!meta){toast(l.err,false);els.inp.focus();els.inp.select();return;}
      if(meta.oneTime&&isUsed(raw)){toast(l.used,false);els.inp.focus();els.inp.select();return;}
      const expiresAt=meta.ttlMs?now()+meta.ttlMs:0;
      if(expiresAt&&expiresAt<now()){toast(l.expired,false);return;}
      grant(raw,meta);toast(l.ok,true);setTimeout(close,160);
    });
    els.inp.addEventListener('keydown',e=>{if(e.key==="Enter")els.btn.click();});
  }

  function schedule(){if(hasAccess())return;setTimeout(showGate,SHOW_DELAY_MS);}
  if(document.readyState==="complete")schedule(); else window.addEventListener("load",schedule,{once:true});
})();

/* ================= TELEGRAM DESKTOP DETECTION ================= */
(function detectTelegramDesktop() {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    document.body.classList.add('telegram-miniapp');
    // Telegram Desktop has platform 'tdesktop'
    if (tg.platform === 'tdesktop' || tg.platform === 'macos' || tg.platform === 'windows') {
      document.body.classList.add('telegram-desktop');
    }
  }
})();

/* ================= HAPTIC ENGINE ================= */
class HapticEngine {
  constructor() {
    this.canVibrate = 'vibrate' in navigator;
    this.enabled = true;
    // Telegram WebApp API — даёт мягкую нативную вибрацию
    this.tg = window.Telegram?.WebApp?.HapticFeedback;
  }
  
  // Лёгкое касание — для hover, touchstart
  light() {
    if (this.tg) {
      try { this.tg.impactOccurred('light'); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate(8); } catch(e) {}
    }
  }
  
  // Среднее — для нажатий, переключений
  medium() {
    if (this.tg) {
      try { this.tg.impactOccurred('medium'); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate(15); } catch(e) {}
    }
  }
  
  // Тяжёлое — для важных действий
  heavy() {
    if (this.tg) {
      try { this.tg.impactOccurred('heavy'); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate(25); } catch(e) {}
    }
  }
  
  // Мягкое — очень деликатное касание
  soft() {
    if (this.tg) {
      try { this.tg.impactOccurred('soft'); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate(5); } catch(e) {}
    }
  }
  
  // Жёсткое — чёткий отклик
  rigid() {
    if (this.tg) {
      try { this.tg.impactOccurred('rigid'); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate(12); } catch(e) {}
    }
  }
  
  // Успех — приятная завершающая вибрация
  success() {
    if (this.tg) {
      try { this.tg.notificationOccurred('success'); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate([10, 30, 10]); } catch(e) {}
    }
  }
  
  // Ошибка — мягкая, не раздражающая
  error() {
    if (this.tg) {
      try { this.tg.notificationOccurred('error'); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate([15, 50, 15]); } catch(e) {}
    }
  }
  
  // Предупреждение
  warning() {
    if (this.tg) {
      try { this.tg.notificationOccurred('warning'); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate([10, 40, 10]); } catch(e) {}
    }
  }
  
  // Уведомление — для тостов
  notification() {
    if (this.tg) {
      try { this.tg.notificationOccurred('success'); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate([8, 30, 8]); } catch(e) {}
    }
  }
  
  // Выбор элемента — для слайдеров, переключателей
  selectionChanged() {
    if (this.tg) {
      try { this.tg.selectionChanged(); return; } catch(e) {}
    }
    if (this.canVibrate && this.enabled) {
      try { navigator.vibrate(6); } catch(e) {}
    }
  }
}

const haptic = new HapticEngine();

/* ================= PARTICLES BACKGROUND ================= */
class ParticlesBackground {
  constructor() {
    this.canvas = document.getElementById('particles-bg');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 50;
    this.init();
    this.animate();
    window.addEventListener('resize', () => this.init());
  }
  
  init() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.particles = [];
    
    for(let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw particles
    this.particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      
      if(p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if(p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(134, 160, 255, ${p.opacity})`;
      this.ctx.fill();
      
      // Draw connections
      this.particles.slice(i + 1).forEach(p2 => {
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if(distance < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(110, 231, 255, ${0.2 * (1 - distance / 100)})`;
          this.ctx.stroke();
        }
      });
    });
    
    requestAnimationFrame(() => this.animate());
  }
}

/* ================= ENHANCED INTERACTIONS ================= */
function addRippleEffect(element, e) {
  const rect = element.getBoundingClientRect();
  const ripple = document.createElement('div');
  ripple.className = 'btn-ripple';
  
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  
  if(e.touches) {
    ripple.style.left = (e.touches[0].clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.touches[0].clientY - rect.top - size / 2) + 'px';
  } else {
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  }
  
  element.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function trackMouseOnField(field) {
  field.addEventListener('mousemove', (e) => {
    const rect = field.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    field.style.setProperty('--mouse-x', x + '%');
    field.style.setProperty('--mouse-y', y + '%');
  });
}

/* ================= TRANSLATIONS ================= */
const translations = {
  en: {
    videoTopic: 'Video topic <span class="req" aria-hidden="true">*</span>',
    topicPlaceholder: "What's the video about?",
    format: 'Format (optional)',
    formatPlaceholder: 'Documentary, Review, Investigation...',
    targetAudience: 'Target audience (optional)',
    audiencePlaceholder: 'Niche, age range, region...',
    clickbaitLevel: 'Clickbait Level',
    clickbaitLevel1Title: 'Subtle',
    clickbaitLevel1Desc: 'Compelling but honest',
    clickbaitLevel2Title: 'Balanced',
    clickbaitLevel2Desc: 'Engaging but not extreme',
    clickbaitLevel3Title: 'Maximum',
    clickbaitLevel3Desc: 'Maximum viral impact',
    clickbaitLevel4Title: 'OTHERWORLDLY',
    clickbaitLevel4Desc: 'Aggressive viral framing',
    componentsCount: 'Components & Count',
    titles: 'Titles',
    thumbnailTexts: 'Thumbnail texts',
    countLabel: 'Count (6–16)',
    send: 'Send',
    clearHistory: '🗑 Clear history',
    copyAllTitles: '⧉ Copy all titles',
    copyAllThumbs: '⧉ Copy all thumbnails',
    historyPlaceholder: 'Results will appear here after generation',
    stateOn: 'ON',
    stateOff: 'OFF',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    topicRequired: 'Topic is required',
    atLeastOneComponent: 'At least one component must be selected',
    pleaseWait: 'Please wait — processing',
    working: 'Working',
    analyzingTopic: 'Analyzing your topic',
    understandingAudience: 'Understanding the audience',
    findingPatterns: 'Finding viral patterns',
    craftingTitles: 'Crafting click-worthy titles',
    optimizingEngagement: 'Optimizing for engagement',
    addingTriggers: 'Adding psychological triggers',
    testingCTR: 'Testing CTR predictions',
    finalizingOptions: 'Finalizing best options',
    formatting: 'Formatting',
    polishing: 'Polishing',
    almostReady: 'Almost ready',
    historyCleared: 'History cleared',
    confirmClear: 'Clear all saved results? This cannot be undone.',
    requestFailed: 'Request failed.',
    audienceProfile: 'Audience Profile',
    titleLabel: 'Title',
    thumbnailLabel: 'Thumbnail',
    styleLabel: 'Style',
    triggersLabel: 'Triggers',
    topPick: 'Top pick',
    clickToCopy: 'Click to copy',
    collapseExpand: 'Collapse/Expand',
    removeResult: 'Remove result',
    dismiss: 'Dismiss',
    languageMarker: 'English',
    pageTitle: 'TITLE CRAFT — by Genial Design',
    inputsTitle: 'Inputs',
    resultsTitle: 'Results',
    titlesOnly: 'Titles only',
    thumbnailsOnly: 'Thumbnail texts only',
    titlesAndThumbnails: 'Titles & Thumbnail texts',
    clickbaitLevel1: 'Subtle (Level 1)',
    clickbaitLevel2: 'Balanced (Level 2)',
    clickbaitLevel3: 'Maximum (Level 3)',
    clickbaitLevel4: 'OTHERWORLDLY (Level 4)',
    notSpecified: '(not specified)',
    loading: 'Loading',
    clearField: 'Clear field',
    components: 'Components',
    scrollToTop: 'Scroll to top',
    byGemini: 'by Gemini',
    logoAlt: 'TITLE CRAFT logo',
    loadingPhrases: [
      'Let\'s improve your CTR? 🚀',
      'We\'ll boost your views 😊',
      'Their clicks will be unstoppable! 🔥',
      'Let\'s work on video packaging?',
      'Let\'s maximize engagement! 💪',
      'Create irresistible titles? ✨',
      'Make your content viral? 🔥',
      'We\'ll craft click-worthy content! 🎯',
      'We\'ll boost your reach? 🌟',
      'We\'ll make content irresistible! ⚡'
    ],
    tabCreate: 'Create New',
    tabImprove: 'Improve Draft',
    improvementTitle: 'Enhance Your Drafts',
    draftTitleLabel: 'Draft Title',
    draftTitlePlaceholder: 'Enter your draft title to improve...',
    draftThumbnailLabel: 'Draft Thumbnail Text',
    draftThumbnailPlaceholder: 'Enter your draft thumbnail text...',
    generateThumbnailCheck: 'Create thumbnail text for title',
    improveButton: 'Improve',
    improvingText: 'Improving your content...',
    improvementError: 'Failed to improve. Please try again.',
    improvementMinLength: 'Enter at least 3 characters',
    improvementAnalysis: 'Analysis',
    detectedStyle: 'Detected Style',
    improvementFocus: 'Improvement Focus',
    improvedTitle: 'Improved Title',
    improvedThumbnail: 'Improved Thumbnail',
    improved: 'Improved',
    changes: 'Changes',
    triggers: 'Triggers',
    function: 'Function',
    psychology: 'Psychology',
    analyzingDraft: 'Analyzing your draft',
    findingImprovements: 'Finding improvements',
    optimizingLanguage: 'Optimizing language',
    enhancingPsychology: 'Enhancing psychology',
    polishingResults: 'Polishing results'
  },
  es: {
    videoTopic: 'Tema del video <span class="req" aria-hidden="true">*</span>',
    topicPlaceholder: '¿De qué trata el video?',
    format: 'Formato (opcional)',
    formatPlaceholder: 'Documental, Reseña, Investigación...',
    targetAudience: 'Audiencia objetivo (opcional)',
    audiencePlaceholder: 'Nicho, rango de edad, región...',
    clickbaitLevel: 'Nivel de Clickbait',
    clickbaitLevel1Title: 'Sutil',
    clickbaitLevel1Desc: 'Atractivos pero honestos',
    clickbaitLevel2Title: 'Equilibrado',
    clickbaitLevel2Desc: 'Atractivos pero no extremos',
    clickbaitLevel3Title: 'Máximo',
    clickbaitLevel3Desc: 'Máximo impacto viral',
    clickbaitLevel4Title: 'EXTRATERRESTRE',
    clickbaitLevel4Desc: 'Enmarcado viral agresivo',
    componentsCount: 'Componentes y cantidad',
    titles: 'Títulos',
    thumbnailTexts: 'Textos de miniatura',
    countLabel: 'Cantidad (6–16)',
    send: 'Enviar',
    clearHistory: '🗑 Borrar historial',
    copyAllTitles: '⧉ Copiar todos los títulos',
    copyAllThumbs: '⧉ Copiar todas las miniaturas',
    historyPlaceholder: 'Los resultados aparecerán aquí después de la generación',
    stateOn: 'SÍ',
    stateOff: 'NO',
    copied: 'Copiado',
    copyFailed: 'Error al copiar',
    topicRequired: 'El tema es obligatorio',
    atLeastOneComponent: 'Al menos un componente debe estar seleccionado',
    pleaseWait: 'Por favor espera — procesando',
    working: 'Trabajando',
    analyzingTopic: 'Analizando tu tema',
    understandingAudience: 'Entendiendo la audiencia',
    findingPatterns: 'Buscando patrones virales',
    craftingTitles: 'Creando títulos atractivos',
    optimizingEngagement: 'Optimizando para engagement',
    addingTriggers: 'Añadiendo triggers psicológicos',
    testingCTR: 'Probando predicciones CTR',
    finalizingOptions: 'Finalizando mejores opciones',
    formatting: 'Formateando',
    polishing: 'Puliendo',
    almostReady: 'Casi listo',
    historyCleared: 'Historial borrado',
    confirmClear: '¿Borrar todos los resultados guardados? Esto no se puede deshacer.',
    requestFailed: 'Solicitud fallida.',
    audienceProfile: 'Perfil de audiencia',
    titleLabel: 'Título',
    thumbnailLabel: 'Miniatura',
    styleLabel: 'Estilo',
    triggersLabel: 'Disparadores',
    topPick: 'Mejor opción',
    clickToCopy: 'Clic para copiar',
    collapseExpand: 'Colapsar/Expandir',
    removeResult: 'Eliminar resultado',
    dismiss: 'Cerrar',
    languageMarker: 'Spanish/Español',
    pageTitle: 'TITLE CRAFT — por Genial Design',
    inputsTitle: 'Entradas',
    resultsTitle: 'Resultados',
    titlesOnly: 'Solo títulos',
    thumbnailsOnly: 'Solo textos de miniatura',
    titlesAndThumbnails: 'Títulos y textos de miniatura',
    clickbaitLevel1: 'Sutil (Nivel 1)',
    clickbaitLevel2: 'Equilibrado (Nivel 2)',
    clickbaitLevel3: 'Máximo (Nivel 3)',
    clickbaitLevel4: 'EXTRATERRESTRE (Nivel 4)',
    notSpecified: '(no especificado)',
    loading: 'Cargando',
    clearField: 'Limpiar campo',
    components: 'Componentes',
    scrollToTop: 'Desplazar hacia arriba',
    byGemini: 'por Gemini',
    logoAlt: 'Logo de TITLE CRAFT',
    loadingPhrases: [
      '¿Vamos a mejorar tu CTR? 🚀',
      'Aumentaremos tus vistas 😊',
      '¡Sus clics serán imparables! 🔥',
      '¿Trabajaremos en el empaque del video?',
      '¡Vamos a maximizar el engagement! 💪',
      '¿Crear títulos irresistibles? ✨',
      '¿Hacer tu contenido viral? 🔥',
      '¡Crearemos contenido irresistible! 🎯',
      '¿Impulsaremos tu alcance? 🌟',
      '¡Haremos el contenido irresistible! ⚡'
    ],
    tabCreate: 'Crear Nuevo',
    tabImprove: 'Mejorar Borrador',
    improvementTitle: 'Mejora tus borradores',
    draftTitleLabel: 'Borrador del Título',
    draftTitlePlaceholder: 'Ingresa tu borrador de título para mejorar...',
    draftThumbnailLabel: 'Borrador del Texto de Miniatura',
    draftThumbnailPlaceholder: 'Ingresa tu borrador de texto de miniatura...',
    generateThumbnailCheck: 'Crear texto de miniatura para el título',
    improveButton: 'Mejorar',
    improvingText: 'Mejorando tu contenido...',
    improvementError: 'Error al mejorar. Inténtalo de nuevo.',
    improvementMinLength: 'Ingresa al menos 3 caracteres',
    improvementAnalysis: 'Análisis',
    detectedStyle: 'Estilo Detectado',
    improvementFocus: 'Enfoque de Mejora',
    improvedTitle: 'Título Mejorado',
    improvedThumbnail: 'Miniatura Mejorada',
    improved: 'Mejorado',
    changes: 'Cambios',
    triggers: 'Triggers',
    function: 'Función',
    psychology: 'Psicología',
    analyzingDraft: 'Analizando tu borrador',
    findingImprovements: 'Buscando mejoras',
    optimizingLanguage: 'Optimizando lenguaje',
    enhancingPsychology: 'Mejorando psicología',
    polishingResults: 'Puliendo resultados'
  },
  ru: {
    videoTopic: 'Тема видео <span class="req" aria-hidden="true">*</span>',
    topicPlaceholder: 'О чём видео?',
    format: 'Формат (необязательно)',
    formatPlaceholder: 'Документальный, Обзор, Расследование...',
    targetAudience: 'Целевая аудитория (необязательно)',
    audiencePlaceholder: 'Ниша, возраст, регион...',
    clickbaitLevel: 'Уровень Кликбейта',
    clickbaitLevel1Title: 'Сдержанный',
    clickbaitLevel1Desc: 'Привлекательные, но честные',
    clickbaitLevel2Title: 'Сбалансированный',
    clickbaitLevel2Desc: 'Привлекательные, но не экстремальные',
    clickbaitLevel3Title: 'Максимальный',
    clickbaitLevel3Desc: 'Максимальный вирусный эффект',
    clickbaitLevel4Title: 'НЕЗЕМНОЙ',
    clickbaitLevel4Desc: 'Агрессивная вирусная подача',
    componentsCount: 'Компоненты и количество',
    titles: 'Заголовки',
    thumbnailTexts: 'Тексты превью',
    countLabel: 'Количество (6–16)',
    send: 'Отправить',
    clearHistory: '🗑 Очистить историю',
    copyAllTitles: '⧉ Копировать все заголовки',
    copyAllThumbs: '⧉ Копировать все превью',
    historyPlaceholder: 'Результаты появятся здесь после генерации',
    stateOn: 'ВКЛ',
    stateOff: 'ВЫКЛ',
    copied: 'Скопировано',
    copyFailed: 'Ошибка копирования',
    topicRequired: 'Тема обязательна',
    atLeastOneComponent: 'Должен быть выбран хотя бы один компонент',
    pleaseWait: 'Пожалуйста, подождите — обработка',
    working: 'Работаю',
    analyzingTopic: 'Анализирую тему',
    understandingAudience: 'Изучаю аудиторию',
    findingPatterns: 'Ищу вирусные паттерны',
    craftingTitles: 'Создаю привлекательные заголовки',
    optimizingEngagement: 'Оптимизирую для вовлечения',
    addingTriggers: 'Добавляю психологические триггеры',
    testingCTR: 'Тестирую прогнозы CTR',
    finalizingOptions: 'Финализирую лучшие варианты',
    formatting: 'Форматирую',
    polishing: 'Дорабатываю',
    almostReady: 'Почти готово',
    historyCleared: 'История очищена',
    confirmClear: 'Очистить всю историю? Это действие нельзя отменить.',
    requestFailed: 'Запрос не удался.',
    audienceProfile: 'Профиль аудитории',
    titleLabel: 'Заголовок',
    thumbnailLabel: 'Превью',
    styleLabel: 'Стиль',
    triggersLabel: 'Триггеры',
    topPick: 'Лучший вариант',
    clickToCopy: 'Нажмите для копирования',
    collapseExpand: 'Свернуть/Развернуть',
    removeResult: 'Удалить результат',
    dismiss: 'Закрыть',
    languageMarker: 'Russian/Русский',
    pageTitle: 'TITLE CRAFT — от Genial Design',
    inputsTitle: 'Вводы',
    resultsTitle: 'Результаты',
    titlesOnly: 'Только заголовки',
    thumbnailsOnly: 'Только тексты превью',
    titlesAndThumbnails: 'Заголовки и тексты превью',
    clickbaitLevel1: 'Сдержанный (Уровень 1)',
    clickbaitLevel2: 'Сбалансированный (Уровень 2)',
    clickbaitLevel3: 'Максимальный (Уровень 3)',
    clickbaitLevel4: 'НЕЗЕМНОЙ (Уровень 4)',
    notSpecified: '(не указано)',
    loading: 'Загрузка',
    clearField: 'Очистить поле',
    components: 'Компоненты',
    scrollToTop: 'Прокрутить вверх',
    byGemini: 'от Gemini',
    logoAlt: 'Логотип TITLE CRAFT',
    loadingPhrases: [
      'Давай улучшим твой CTR? 🚀',
      'Увеличим твои просмотры 😊',
      'Их клики будет не остановить! 🔥',
      'Поработаем над упаковкой видео?',
      'Давай максимизируем вовлечение! 💪',
      'Создадим неотразимые заголовки? ✨',
      'Сделаем твой контент вирусным? 🔥',
      'Создадим кликабельный контент! 🎯',
      'Увеличим охват? 🌟',
      'Сделаем контент неотразимым! ⚡'
    ],
    tabCreate: 'Создать новое',
    tabImprove: 'Улучшить черновик',
    improvementTitle: 'Улучши свои черновики',
    draftTitleLabel: 'Черновик заголовка',
    draftTitlePlaceholder: 'Введи черновик заголовка для улучшения...',
    draftThumbnailLabel: 'Черновик текста превью',
    draftThumbnailPlaceholder: 'Введи черновик текста превью...',
    generateThumbnailCheck: 'Создать текст превью для заголовка',
    improveButton: 'Улучшить',
    improvingText: 'Улучшаю твой контент...',
    improvementError: 'Не удалось улучшить. Попробуй еще раз.',
    improvementMinLength: 'Введи минимум 3 символа',
    improvementAnalysis: 'Анализ',
    detectedStyle: 'Выявленный стиль',
    improvementFocus: 'Фокус улучшения',
    improvedTitle: 'Улучшенный заголовок',
    improvedThumbnail: 'Улучшенное превью',
    improved: 'Улучшено',
    changes: 'Изменения',
    triggers: 'Триггеры',
    function: 'Функция',
    psychology: 'Психология',
    analyzingDraft: 'Анализирую твой черновик',
    findingImprovements: 'Ищу улучшения',
    optimizingLanguage: 'Оптимизирую язык',
    enhancingPsychology: 'Улучшаю психологию',
    polishingResults: 'Дорабатываю результаты'
  },
  uk: {
    videoTopic: 'Тема відео <span class="req" aria-hidden="true">*</span>',
    topicPlaceholder: 'Про що відео?',
    format: 'Формат (необов\'язково)',
    formatPlaceholder: 'Документальний, Огляд, Розслідування...',
    targetAudience: 'Цільова аудиторія (необов\'язково)',
    audiencePlaceholder: 'Ніша, вік, регіон...',
    clickbaitLevel: 'Рівень Клікбейту',
    clickbaitLevel1Title: 'Стриманий',
    clickbaitLevel1Desc: 'Привабливі, але чесні',
    clickbaitLevel2Title: 'Збалансований',
    clickbaitLevel2Desc: 'Привабливі, але не екстремальні',
    clickbaitLevel3Title: 'Максимальний',
    clickbaitLevel3Desc: 'Максимальний вірусний ефект',
    clickbaitLevel4Title: 'НЕЗЕМНИЙ',
    clickbaitLevel4Desc: 'Агресивна вірусна подача',
    componentsCount: 'Компоненти та кількість',
    titles: 'Заголовки',
    thumbnailTexts: 'Тексти прев\'ю',
    countLabel: 'Кількість (6–16)',
    send: 'Відправити',
    clearHistory: '🗑 Очистити історію',
    copyAllTitles: '⧉ Копіювати всі заголовки',
    copyAllThumbs: '⧉ Копіювати всі прев\'ю',
    historyPlaceholder: 'Результати з\'являться тут після генерації',
    stateOn: 'УВІМК',
    stateOff: 'ВИМК',
    copied: 'Скопійовано',
    copyFailed: 'Помилка копіювання',
    topicRequired: 'Тема обов\'язкова',
    atLeastOneComponent: 'Повинен бути обраний хоча б один компонент',
    pleaseWait: 'Будь ласка, зачекайте — обробка',
    working: 'Працюю',
    analyzingTopic: 'Аналізую тему',
    understandingAudience: 'Вивчаю аудиторію',
    findingPatterns: 'Шукаю вірусні патерни',
    craftingTitles: 'Створюю привабливі заголовки',
    optimizingEngagement: 'Оптимізую для залучення',
    addingTriggers: 'Додаю психологічні тригери',
    testingCTR: 'Тестую прогнози CTR',
    finalizingOptions: 'Фіналізую найкращі варіанти',
    formatting: 'Форматую',
    polishing: 'Доопрацьовую',
    almostReady: 'Майже готово',
    historyCleared: 'Історію очищено',
    confirmClear: 'Очистити всю історію? Цю дію не можна скасувати.',
    requestFailed: 'Запит не вдався.',
    audienceProfile: 'Профіль аудиторії',
    titleLabel: 'Заголовок',
    thumbnailLabel: 'Прев\'ю',
    styleLabel: 'Стиль',
    triggersLabel: 'Тригери',
    topPick: 'Найкращий варіант',
    clickToCopy: 'Натисніть для копіювання',
    collapseExpand: 'Згорнути/Розгорнути',
    removeResult: 'Видалити результат',
    dismiss: 'Закрити',
    languageMarker: 'Ukrainian/Українська',
    pageTitle: 'TITLE CRAFT — від Genial Design',
    inputsTitle: 'Вводи',
    resultsTitle: 'Результати',
    titlesOnly: 'Тільки заголовки',
    thumbnailsOnly: 'Тільки тексти прев\'ю',
    titlesAndThumbnails: 'Заголовки і тексти прев\'ю',
    clickbaitLevel1: 'Стриманий (Рівень 1)',
    clickbaitLevel2: 'Збалансований (Рівень 2)',
    clickbaitLevel3: 'Максимальний (Рівень 3)',
    clickbaitLevel4: 'НЕЗЕМНИЙ (Рівень 4)',
    notSpecified: '(не вказано)',
    loading: 'Завантаження',
    clearField: 'Очистити поле',
    components: 'Компоненти',
    scrollToTop: 'Прокрутити вгору',
    byGemini: 'від Gemini',
    logoAlt: 'Логотип TITLE CRAFT',
    loadingPhrases: [
      'Давай покращимо твій CTR? 🚀',
      'Збільшимо твої перегляди 😊',
      'Їхні кліки буде не зупинити! 🔥',
      'Попрацюємо над упаковкою відео?',
      'Давай максимізуємо залучення! 💪',
      'Створимо невіддільні заголовки? ✨',
      'Зробимо твій контент вірусним? 🔥',
      'Створимо клікабельний контент! 🎯',
      'Збільшимо охоплення? 🌟',
      'Зробимо контент невіддільним! ⚡'
    ],
    tabCreate: 'Створити нове',
    tabImprove: 'Покращити чернетку',
    improvementTitle: 'Покращ свої чернетки',
    draftTitleLabel: 'Чернетка заголовка',
    draftTitlePlaceholder: 'Введи чернетку заголовка для покращення...',
    draftThumbnailLabel: 'Чернетка тексту прев\'ю',
    draftThumbnailPlaceholder: 'Введи чернетку тексту прев\'ю...',
    generateThumbnailCheck: 'Створити текст прев\'ю для заголовка',
    improveButton: 'Покращити',
    improvingText: 'Покращую твій контент...',
    improvementError: 'Не вдалося покращити. Спробуй ще раз.',
    improvementMinLength: 'Введи мінімум 3 символи',
    improvementAnalysis: 'Аналіз',
    detectedStyle: 'Виявлений стиль',
    improvementFocus: 'Фокус покращення',
    improvedTitle: 'Покращений заголовок',
    improvedThumbnail: 'Покращене прев\'ю',
    improved: 'Покращено',
    changes: 'Зміни',
    triggers: 'Тригери',
    function: 'Функція',
    psychology: 'Психологія',
    analyzingDraft: 'Аналізую твою чернетку',
    findingImprovements: 'Шукаю покращення',
    optimizingLanguage: 'Оптимізую мову',
    enhancingPsychology: 'Покращую психологію',
    polishingResults: 'Доопрацьовую результати'
  }
};

function getRandomLoadingPhrase() {
  const phrases = t.loadingPhrases || [];
  if (phrases.length === 0) return 'Loading...';
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function detectLanguage() {
  const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('uk')) return 'uk';
  return 'en';
}

let currentLang = detectLanguage();
let t = translations[currentLang];

function applyTranslations() {
  // Обновляем заголовок страницы
  document.title = t.pageTitle;
  
  // Обновляем скрытые заголовки
  const inputsTitle = document.getElementById('inputs-title');
  const resultsTitle = document.getElementById('results-title');
  if (inputsTitle) inputsTitle.textContent = t.inputsTitle;
  if (resultsTitle) resultsTitle.textContent = t.resultsTitle;
  
  // Обновляем toast
  const toast = document.getElementById('toast');
  if (toast) toast.textContent = t.copied;
  
  // Обновляем aria-label атрибуты
  const pageloader = document.getElementById('pageloader');
  if (pageloader) pageloader.setAttribute('aria-label', t.loading);
  
  const componentsGroup = document.querySelector('[aria-label="Components"]');
  if (componentsGroup) componentsGroup.setAttribute('aria-label', t.components);
  
  const fabBtn = document.getElementById('fabBtn');
  if (fabBtn) fabBtn.setAttribute('aria-label', t.scrollToTop);
  
  // Обновляем title атрибуты для кнопок очистки
  document.querySelectorAll('[title="Clear field"]').forEach(el => {
    el.title = t.clearField;
  });
  
  // Обновляем alt атрибуты для логотипов
  document.querySelectorAll('img[alt*="TITLE CRAFT logo"]').forEach(el => {
    el.alt = t.logoAlt;
  });
  
  // Обновляем placeholder текст истории
  document.querySelectorAll('.placeholder-text').forEach(el => {
    el.textContent = t.historyPlaceholder;
  });
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      if (el.tagName === 'BUTTON' && el.querySelector('.btn-text')) {
        el.querySelector('.btn-text').innerHTML = t[key];
      } else {
        el.innerHTML = t[key];
      }
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key]) {
      el.placeholder = t[key];
    }
  });
  
  document.querySelectorAll('[title]').forEach(el => {
    if (el.title === 'Click to copy') el.title = t.clickToCopy;
    if (el.title === 'Collapse/Expand') el.title = t.collapseExpand;
    if (el.title === 'Remove result') el.title = t.removeResult;
    if (el.title === 'Dismiss') el.title = t.dismiss;
    if (el.title === 'Top pick') el.title = t.topPick;
  });
  
  document.querySelectorAll('.state').forEach(el => {
    el.setAttribute('data-on', t.stateOn);
    el.setAttribute('data-off', t.stateOff);
  });
  
  document.documentElement.lang = currentLang;
}

function updateLoadingPhrase() {
  const loadingPhrase = document.querySelector('.pl-text');
  const pageloader = document.getElementById('pageloader');
  
  // Обновляем фразу только если загрузчик еще виден
  if (loadingPhrase && pageloader && !pageloader.classList.contains('hidden')) {
    loadingPhrase.textContent = getRandomLoadingPhrase();
  }
}

function startLoadingPhraseRotation() {
  const loadingPhrase = document.querySelector('.pl-text');
  if (!loadingPhrase) return;
  
  // Сразу устанавливаем первую фразу
  updateLoadingPhrase();
  
  // Обновляем фразу каждые 2.5 секунды
  const interval = setInterval(() => {
    const pageloader = document.getElementById('pageloader');
    if (pageloader && pageloader.classList.contains('hidden')) {
      clearInterval(interval);
      return;
    }
    updateLoadingPhrase();
  }, 2500);
}

// Функция для обновления фразы при смене языка
function updateLoadingPhraseOnLanguageChange() {
  const loadingPhrase = document.querySelector('.pl-text');
  const pageloader = document.getElementById('pageloader');
  
  // Обновляем фразу только если загрузчик еще виден
  if (loadingPhrase && pageloader && !pageloader.classList.contains('hidden')) {
    loadingPhrase.textContent = getRandomLoadingPhrase();
  }
}

/* ================= CONFIG ================= */
const GEMINI_API_KEY = "DLcdVbD-slBsMN9vH2VnxN4rTsW8KV0Lk9kl8PX";
const OPENAI_API_KEY = "vn-surm-I1-EsdWxwVOCwhdtB-OP8c3hZwh8Zljwg_9l4A1Q1VcU8qGkn7mg9DvoeXhUHajBFZ76PGjCn3W3EoenIMyY4RZ0gEd7y_i4NboJjliZWetdJt4yOOOCQ1NtINS3XN6wxYEXJ2Sz4REn-AbYQOPz8giPpWBD";
const GEMINI_MODEL = "gemini-3-pro-preview";
const OPENAI_MODEL = "gpt-5-chat-latest"; // GPT-5 модель
const RETRIES = 5;
const BASE_DELAY = 800;

/* ================= SYSTEM PROMPT ================= */
const SYSTEM_PROMPT = `You are an expert in viral YouTube titles and thumbnail texts with subtle click psychology (hundreds of A/B tests).
Goal: based on the user's topic, generate a set of options that strictly match the selected clickbait level, boosting CTR.

Input data

VIDEO_TOPIC: {{topic}} ← the output language is defined ONLY from here
FORMAT: {{format}}
AUDIENCE: {{audience}}
CLICKBAIT_LVL: {{1-4}}
N: {{N|6}}
ONLY_TITLES: {{only_titles}}
ONLY_THUMBS: {{only_thumbs}}

Language & Locale (priority)

The language of the entire output = the language of the {{topic}} field.
If the topic is mixed/bilingual — take the first language and stick to it.
If the user writes in Russian, the default region = UA, unless explicitly specified otherwise.
Always adapt to the local format of numbers, rules, etc. (e.g., RU/UA → 0,1%; EN/ES → 0.1%).

Clickbait Levels & Quotas (titles; emojis only in titles)

L1 – Light: honest, low arousal, curiosity; minimize CAPS. Thumbnail text: short and clear.

L2 – Balanced: moderate arousal, concrete benefits, light "power words." Thumbnail text: concise and impactful.

L3 – Maximum: strong viral tension with sophistication; precise numbers, explicit stakes, strong verbs, well-crafted clickbait, psychological hooks. Thumbnail text: sharp and high-impact.

L4 – Tabloid / Unleashed: aggressive framing, contrasts, hyperbole allowed. Sky-high clickbait. But remember the difference between clickbait and deception.
Example: clickbait = "I'll teach you guitar in 10 minutes."
Deception = "I'll teach you guitar in 10 minutes," but the video is about cooking pilaf.
Thumbnail text: bold and striking.

For all: emojis only in 1–3 titles. NEVER in thumbnails.

Tone

Entertainment/Gaming → conversational allowed

Tech/Finance/Education/Health/News/Professional → premium, clear, evidence-forward

Hook Styles (mandatory choice; one or two per option)

Curiosity Gap – curiosity gap with promise of closure

FOMO (Fear of Missing Out) – fear of missed opportunity

Loss Aversion / Negativity Bias – focus on risk, error, penalty, loss

Salvation / Positive Payoff – promise of relief, upgrade, improvement

Blueprint / Roadmap – ready-made plan or step-by-step recipe

Expectation Inversion – "it's not what it seems," flipping expectations

Contrarian Flip – provocation: "everyone thinks X, but truth is Y"

Numerical / Specificity Hook – precise numbers, metrics, facts

Status & Competence – mastery, insider angle, level-check

Narrative Energy & Agency – explicit hero + strong action verb

Diversity (mandatory)

Cover ≥6 different styles, must include: Curiosity Gap, FOMO, Loss Aversion/Negativity, Salvation/Positive Payoff; plus ≥1 of {Expectation Inversion | Contrarian Flip}, ≥1 Numerical/Specificity.
Keep semantic overlap low.

Title Rules

≤80 characters

strongest hook in ~first 40

one idea only

specificity (numbers/names/dates), explicit agent, strong verbs

special characters/emojis only per quota

no fabrications/toxicity

For L3/L4: within the first ~40 chars include ≥2 of: precise number, strong verb, explicit stake/risk.

Almost always highlight 1–3 key words in CAPS (Cyrillic CAPS allowed). Combine this with other techniques (numbers, strong verbs, curiosity gaps, etc.).

Title Case (Each Word Capitalized, MrBeast style) is acceptable when it improves readability or emphasis.

Thumbnail Text Rules

Thumbnail text should be ultra-scannable. Usually short (1–8 words), but you may go shorter or longer if it improves clarity, stakes, or emotional punch.

NO emojis, NO colons.

All words ALWAYS CAPS.

Do NOT repeat/rephrase the title (≤60% overlap).

Add the missing piece: stake, metric, verdict, or micro-question.

Variation guideline: in each batch, about half of the thumbnails must be very short (1–3 words), and the other half must be clearly longer (4–8 words). Do not treat 3–4 words as "long." Longer texts are allowed if they improve clarity or emotional impact.

If only titles or only thumbnails requested → leave the other key "".

Hints for titles and thumbnails (subtle techniques + psychology)

Notation:

PS = psychology (why it works)

EX = examples (sample phrasings)

PATTERN BREAK
PS: the brain expects predictability; breaking it = "WTF effect."
EX: "Eat more to lose weight"; "Learn faster if you sleep longer"; "Shawarma is the key to weight loss."

OPEN LOOP (Zeigarnik effect)
PS: unfinished = tension → click for closure.
EX: "I learned 10,000 words and…"; "After that call I didn't sleep for 3 nights."

SOCIAL TRIGGER
PS: people fear isolation/shame, want to be "insiders."
EX: "7 phrases that expose a newbie"; "The method trainers keep silent about"; "If you type like this you waste years"; "Embarrassing not to know this in the US."

LOSS & RISK
PS: fear of loss > desire to gain.
EX: "If you type like this — you lose ×2 time"; "90% make this mistake and lose money."

FOMO / LIMITED CHANCE
PS: missed opportunity = click pressure.
EX: "Only 7 people will make it"; "This disappears in a week."

MICRO DETAIL
PS: oddly specific detail enhances realism.
EX: "I spent 731 hours learning"; "He quit over one apple."

EMOTION CONTRAST
PS: combining opposites creates intrigue.
EX: "The funniest tragedy"; "Sweet mistake."

AUTHORITY EFFECT
PS: trust in experts/unusual confessions.
EX: "Psychologist said: forget the advice"; "Trainer admitted he does the opposite."

PRECISE DETAILS
PS: numbers, dates, places = credibility.
EX: "372 days in Germany" instead of "a year in Germany."

PARTIAL INCOMPLETENESS
PS: incompleteness sparks curiosity.
EX: "He did this at the worst possible moment…"

EXPECTATION INVERSION
PS: "not as it should be."
EX: "Why 90% of diets DON'T work"; "Touch typing? Two fingers is the best way!"

PARADOXICAL FORMULATIONS
PS: brain stumbles over contradictions.
EX: "Slower = faster."

FOCUS ON REACTION
PS: emotions/consequences > event itself.
EX: "Everyone went silent after this phrase" instead of "He said a phrase."

ANTI-ADVICE / ANTI-NORM
PS: categorical claim against "common sense."
EX: "Type only with two fingers"; "Eat shawarma to lose weight."

CONTRAST TO TITLE
PS: add timeframe, number, hidden stake.
EX: "How to save ₴50,000" → "in 14 months."

MICRO VERDICT
PS: short sharp word = instant focus.
EX: "BAN"; "Mistake №1"; "Forget it."

UNEXPECTED DETAIL
PS: odd actor/detail attracts attention.
EX: "The cat decided"; "11 seconds of silence changed my life."

QUESTION PROVOCATION
PS: doubt or challenge triggers self-reflection.
EX: "What if the opposite?"; "Do you do this?"

SUPER-FORMULA (combination)
PS: combining hooks amplifies effect.
Formula: [Pattern Break] + [Open Loop] = max click.
EX: "I worked 2 hours a day and outpaced all colleagues" → "Secret in silence."
EX: "Why smart people never cram words" → "They do THIS."

CONCRETE EMOTION INSTEAD OF "SHOCK"
PS: abstract words ("shock," "wow," "amazing") = cliché; concrete emotional manifestations feel real.
EX: "My hands were shaking when I pressed Enter"; "Everyone went silent"; "I didn't sleep 3 nights"; "The mistake cost ₴372,000"; "Pulled off air after 12 minutes."

DRY DELIVERY
PS: deliberately plain/technical tone feels more credible than hype.
EX: "The file was 1.43 GB"; "The experiment lasted 27 days"; "Errors at 0.8%."

COMPARISON WITH THE INCOMMENSURABLE
PS: odd comparisons break perception and add contrast.
EX: "One bug cost more than a Tesla"; "Less than a cup of coffee (€2.1)."

SALVATION / POSITIVE PAYOFF
PS: promise of relief or upgrade.
EX: "How to remove stress in 3 minutes"; "Lose 2kg in a week without diets."

BLUEPRINT / ROADMAP
PS: step-by-step recipe = control.
EX: "3 steps to perfect memory"; "14-day plan."

TEST / CHECK
PS: people enjoy "passing a test."
EX: "If you get this meme — you're a zoomer"; "This puzzle is asked at Google interviews. Can you solve it?"

NAMES / ENTITIES
PS: brands, people, objects = concreteness and recognition.
EX: "What Musk said at the meeting"; "Apple hid this feature."

PERSONAL STAKES
PS: framing as personal raises relevance.
EX: "You lose ₴372 every day"; "This trick saves you years."

COUNTERFACTUAL HOOK
PS: "What if…" forces the brain to imagine alternatives.
EX: "What if the Internet vanished tomorrow?"; "What if everything's the opposite?"

PROCESSING FLUENCY
PS: short words, numbers, simple structure = quick readability.
EX: "24 hours without food"; "×3 in a month."

IMPORTANT:
All "EX" are examples. They are given to show the essence of the technique (how the style/trigger works).
You must understand the logic and apply it to the user's topic, but not copy them word-for-word.
Final titles and thumbnails must be original.


Conflict resolution

JSON contract & validation > language/locale rule > levels/quotas > other.

Validation (internal, do not output)

Single language from {{topic}}

Correct number/currency format

Field lengths

CAPS/emoji quotas

Style coverage

ThumbnailText: no ":" or emoji

Title↔thumbnail overlap ≤60%

topPicks = two unique numbers in [1..N]

Process

Immediately generate N final options per the rules above and select the two best: output their indices (1-based) in topPicks.

Output contract (STRICTLY JSON, no extra keys)
{
  "audienceProfile": "3–6 benefit-focused sentences (if unclear — start with 'Assumptions: …')",
  "options": [
    {"title": "STRING", "thumbnailText": "STRING", "style": "DESCRIPTIVE_STYLE_NAME", "triggers": "PSYCHOLOGICAL_TRIGGERS"}
  ],
  "topPicks": [{"index": NUMBER}, {"index": NUMBER}]
}

IMPORTANT: For each option in the json response, you MUST specify both "style" and "triggers" fields. 
- "style": Use one of the Hook Styles listed above OR create your own descriptive style name that best describes the psychological approach used in that title.
- "triggers": List the specific psychological triggers used (e.g., "Curiosity, FOMO, Status", "Loss Aversion, Authority", "Social Proof," etc).
`;


/* ================= USER PROMPT BUILDER ================= */
function buildUserBlockWithAudience({topic, format, audience, wantTitles, wantThumbs, count, clickbaitLevel}){
  const onlyTitles = wantTitles && !wantThumbs ? "true" : "false";
  const onlyThumbs = wantThumbs && !wantTitles ? "true" : "false";
  
  const clickbaitLevelNames = {
    1: "L1",
    2: "L2", 
    3: "L3",
    4: "L4"
  };
  
  const lines = [
    `VIDEO_TOPIC: ${escapeForPrompt(topic)}`,
    `FORMAT: ${escapeForPrompt(format || t.notSpecified)}`,
    `AUDIENCE: ${escapeForPrompt(audience)}`,
    `CLICKBAIT_LVL: ${clickbaitLevelNames[clickbaitLevel] || "L3"}`,
    `N: ${count}`,
    `ONLY_TITLES: ${onlyTitles}`,
    `ONLY_THUMBS: ${onlyThumbs}`
  ];
  
  return lines.join('\n');
}


function responseSchema(N) {
  return {
    type: "OBJECT",
    properties: {
      audienceProfile: { type: "STRING" },
      options: {
        type: "ARRAY",
        minItems: N, // если хочешь зафиксировать ровно N
        maxItems: N,
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            thumbnailText: { type: "STRING" },
            style: { type: "STRING" },      // 🔥 добавлено
            triggers: { type: "STRING" }    // 🔥 добавлено
          },
          required: ["title", "thumbnailText", "style", "triggers"] // 🔥 теперь обязательные
        }
      },
      topPicks: {
        type: "ARRAY",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "OBJECT",
          properties: {
            index: { type: "INTEGER" }
          },
          required: ["index"]
        }
      }
    },
    required: ["audienceProfile", "options", "topPicks"]
  };
}

function GENCFG_HQ(N) {
  return {
    temperature: 0.9,
    topP: 0.92,
    maxOutputTokens: 65535,
    responseMimeType: "application/json",
    responseSchema: responseSchema(N),
    thinkingConfig: { includeThoughts: false, thinkingLevel: "high" }
  };
}

/* ================= STORAGE ================= */
const store = {
  saveInputs(v){ localStorage.setItem("tc_inputs_v7", JSON.stringify(v)); },
  loadInputs(){ try{ return JSON.parse(localStorage.getItem("tc_inputs_v7"))||{} }catch{ return {} } },
  addSession(s){ const all = store.loadSessions(); all.unshift(s); localStorage.setItem("tc_sessions_v7", JSON.stringify(all)); },
  loadSessions(){ try{ return JSON.parse(localStorage.getItem("tc_sessions_v7"))||[] }catch{ return [] } },
  clearSessions(){ localStorage.setItem("tc_sessions_v7", JSON.stringify([])); },
  deleteSession(id){ const all = store.loadSessions().filter(x => x.id !== id); localStorage.setItem("tc_sessions_v7", JSON.stringify(all)); },
  addImprovementSession(s){ const all = store.loadImprovementSessions(); all.unshift(s); localStorage.setItem("tc_improvement_sessions_v1", JSON.stringify(all)); },
  loadImprovementSessions(){ try{ return JSON.parse(localStorage.getItem("tc_improvement_sessions_v1"))||[] }catch{ return [] } },
  clearImprovementSessions(){ localStorage.setItem("tc_improvement_sessions_v1", JSON.stringify([])); },
  deleteImprovementSession(id){ const all = store.loadImprovementSessions().filter(x => x.id !== id); localStorage.setItem("tc_improvement_sessions_v1", JSON.stringify(all)); }
};

/* ================= UTILS ================= */
const $ = s => document.querySelector(s);
const clamp = (n,min,max)=> Math.max(min, Math.min(max, n));
const clampStr = (s,n)=> (s||"").trim().slice(0,n);
const MAX_CHARS_TOPIC=800, MAX_CHARS_FORMAT=300, MAX_CHARS_AUDIENCE=300;

// Global operation lock to prevent simultaneous create/improve operations
let isOperationInProgress = false;
const toast = (msg)=>{
  const actualMsg = t[msg] || msg || t.copied;
  const el=$("#toast");
  el.textContent=actualMsg;
  el.classList.add("show");
  haptic.notification();
  setTimeout(()=> el.classList.remove("show"), 1600);
};

// Кастомный confirm диалог без показа домена
function customConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: linear-gradient(135deg, #0f1420, #0b0f1a);
      border: 2px solid rgba(255,255,255,0.15);
      border-radius: 20px; padding: 24px;
      max-width: 320px; width: calc(100% - 40px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    
    const text = document.createElement('p');
    text.textContent = message;
    text.style.cssText = `
      color: #e8edf6; font-size: 16px; font-weight: 500;
      margin: 0 0 20px 0; line-height: 1.5; text-align: center;
    `;
    
    const buttons = document.createElement('div');
    buttons.style.cssText = `display: flex; gap: 12px; justify-content: center;`;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t.dismiss || 'Cancel';
    cancelBtn.style.cssText = `
      padding: 12px 24px; border-radius: 12px; font-weight: 700;
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
      color: #e8edf6; cursor: pointer; font-size: 14px;
    `;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'OK';
    confirmBtn.style.cssText = `
      padding: 12px 24px; border-radius: 12px; font-weight: 700;
      background: linear-gradient(135deg, #ff6b6b, #ff5252);
      border: none; color: #fff; cursor: pointer; font-size: 14px;
    `;
    
    const close = (result) => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
      haptic.light();
      resolve(result);
    };
    
    cancelBtn.onclick = () => close(false);
    confirmBtn.onclick = () => close(true);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    
    buttons.append(cancelBtn, confirmBtn);
    dialog.append(text, buttons);
    overlay.append(dialog);
    document.body.append(overlay);
    
    haptic.medium();
    confirmBtn.focus();
  });
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    toast('copied');
    haptic.success();
  }).catch(() => {
    toast('copyFailed');
    haptic.error();
  });
}

function showToast(msg) {
  toast(msg);
}
function escapeForPrompt(s){ return (s||"").replace(/[<>]/g, m => ({'<':'&lt;','>':'&gt;'}[m])) }
function nowStr(){ try{ return new Date().toLocaleString('en-GB', { hour12:false, timeZone:'Europe/London' }); }catch{ return new Date().toLocaleString(); } }
function joinParts(parts){ return (parts||[]).map(p=> p.text).filter(Boolean).join("") }
function truncate(s,n){ return s && s.length>n ? s.slice(0,n-1)+'…' : (s||"") }
function uid(){ return 's_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7) }
function safeParseJSON(m){ if(!m) return null; try{ return JSON.parse(m) }catch{} const a=m.indexOf("{"), b=m.lastIndexOf("}"); if(a>=0&&b>a){ try{ return JSON.parse(m.slice(a,b+1)) }catch{} } return null }

// Extract first sentence from topic
function getFirstSentence(text) {
  if (!text) return '';
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.split(/\s+/).slice(0, 5).join(' ') + '...';
}

/* ================= NORMALIZE OUTPUT ================= */
function normalizeOutput(o, opts){
  const { wantTitles, wantThumbs, count, source } = opts;
  const options = (o.options||[]).slice(0, count).map(x=> {
    const title = wantTitles ? (x.title||"").trim().slice(0,100) : "";
    const thumbnailText = wantThumbs ? (x.thumbnailText||"").replace(/:/g,"").trim().slice(0,50).toUpperCase() : "";
    
    // Используем только стиль и триггеры от модели, без дополнительного анализа
    const style = (x.style||"").trim() || "Unknown";
    const triggers = (x.triggers||"").trim() || "Unknown";
    
    return {
      title,
      thumbnailText,
      style,
      triggers
    };
  });
  while(options.length < count) options.push({ title: wantTitles ? "" : "", thumbnailText: wantThumbs ? "" : "", style: "Unknown", triggers: "Unknown" });

  // Возвращаем все TopPicks (до 2 лучших вариантов)
  const allTopPicks = Array.isArray(o.topPicks) ? o.topPicks
              .filter(v => Number.isInteger(v.index))
              .map(v => ({ index: clamp(parseInt(v.index,10)||1, 1, options.length) }))
              .slice(0, 2) : [];
  
  const tp = allTopPicks; // Возвращаем все доступные topPicks

  return { audienceProfile: (o.audienceProfile||"").trim(), options, topPicks: tp };
}

/* ================= AUDIENCE ANALYSIS ================= */

/* ================= NETWORK ================= */
async function callGemini(payload, tries=RETRIES){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  
  let lastErr;
  for(let i=0;i<tries;i++){
    try{
      const res = await fetch(url, { 
        method:"POST", 
        headers:{ 
          "Content-Type":"application/json",
          "x-goog-api-key": decryptApiKey(GEMINI_API_KEY)
        }, 
        body: JSON.stringify(payload) 
      });
      if(!res.ok){ const txt = await res.text().catch(()=> ""); throw new Error(`HTTP ${res.status}: ${txt||res.statusText}`) }
      
      const result = await res.json();
      return result;
    }catch(err){
      lastErr = err;
      console.warn(`⚠️ Gemini API Attempt ${i+1}/${tries} failed:`, err.message);
      const delay = BASE_DELAY * Math.pow(2, i) + Math.random()*300;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error(`❌ Gemini API Failed after ${tries} attempts:`, lastErr.message);
  throw lastErr;
}

async function callOpenAI(payload, tries=RETRIES){
  const url = "https://api.openai.com/v1/chat/completions";
  const model = payload.model || OPENAI_MODEL;
  
  let lastErr;
  for(let i=0;i<tries;i++){
    try{
      const res = await fetch(url, { 
        method:"POST", 
        headers:{ 
          "Content-Type":"application/json",
          "Authorization": `Bearer ${decryptApiKey(OPENAI_API_KEY)}`
        }, 
        body: JSON.stringify(payload) 
      });
      if(!res.ok){ const txt = await res.text().catch(()=> ""); throw new Error(`HTTP ${res.status}: ${txt||res.statusText}`) }
      
        const result = await res.json();
        return result;
    }catch(err){
      lastErr = err;
      console.warn(`⚠️ OpenAI API Attempt ${i+1}/${tries} failed:`, err.message);
      const delay = BASE_DELAY * Math.pow(2, i) + Math.random()*300;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error(`❌ OpenAI API Failed after ${tries} attempts:`, lastErr.message);
  throw lastErr;
}

/* ================= TITLE ANALYSIS ================= */
function analyzeTitle(title, thumbnail) {
  const titleLower = title.toLowerCase();
  const thumbLower = thumbnail.toLowerCase();
  
  // More diverse style detection with randomization
  const styles = [];
  
  if (titleLower.includes('почему') || titleLower.includes('как') || titleLower.includes('что')) {
    styles.push('Q&A');
  }
  if (titleLower.includes('vs') || titleLower.includes('против') || titleLower.includes('сравнение')) {
    styles.push('VS');
  }
  if (titleLower.includes('я ') || titleLower.includes('мой ') || titleLower.includes('мы ')) {
    styles.push('Personal Experience');
  }
  if (titleLower.includes('ошибка') || titleLower.includes('не делай') || titleLower.includes('не покупай')) {
    styles.push('Mistakes');
  }
  if (titleLower.includes('секрет') || titleLower.includes('скрывал') || titleLower.includes('правда')) {
    styles.push('Secret/Truth revealing');
  }
  if (titleLower.includes('топ') || titleLower.includes('лучшие') || /\d+/.test(title)) {
    styles.push('Lists');
  }
  if (titleLower.includes('уничтожил') || titleLower.includes('шок') || titleLower.includes('невозможно')) {
    styles.push('Shock Theses');
  }
  if (titleLower.includes('новый') || titleLower.includes('2024') || titleLower.includes('2025')) {
    styles.push('Trend/Innovation');
  }
  if (titleLower.includes('деньги') || titleLower.includes('заработок') || titleLower.includes('доход')) {
    styles.push('Financial');
  }
  if (titleLower.includes('рецепт') || titleLower.includes('готовить') || titleLower.includes('кулинария')) {
    styles.push('Tutorial');
  }
  
  // Add some randomization to avoid repetition
  const additionalStyles = ['Curiosity Gap', 'Problem-Solution', 'Before-After', 'Transformation'];
  if (Math.random() < 0.3) {
    styles.push(additionalStyles[Math.floor(Math.random() * additionalStyles.length)]);
  }
  
  // Более умное определение стиля
  let style;
  if (styles.length > 0) {
    style = styles[Math.floor(Math.random() * styles.length)];
  } else {
    // Если не найдено совпадений, попробуем определить по общим паттернам
    if (titleLower.includes('?') || titleLower.includes('как') || titleLower.includes('почему') || titleLower.includes('что')) {
      style = 'Q&A';
    } else if (titleLower.includes('я ') || titleLower.includes('мой ') || titleLower.includes('мы ')) {
      style = 'Personal Experience';
    } else if (/\d+/.test(title) || titleLower.includes('топ') || titleLower.includes('лучшие')) {
      style = 'Lists';
    } else if (titleLower.includes('новый') || titleLower.includes('2024') || titleLower.includes('2025')) {
      style = 'Trend/Innovation';
    } else {
      style = 'Curiosity Gap';
    }
  }
  
  // More diverse trigger detection
  const triggers = [];
  if (titleLower.includes('секрет') || titleLower.includes('скрывал') || titleLower.includes('?')) {
    triggers.push('Curiosity');
  }
  if (titleLower.includes('не покупай') || titleLower.includes('ошибка') || titleLower.includes('не делай')) {
    triggers.push('FOMO');
  }
  if (titleLower.includes('я ') || titleLower.includes('мой опыт') || titleLower.includes('мы попробовали')) {
    triggers.push('Social Proof');
  }
  if (titleLower.includes('шок') || titleLower.includes('невозможно') || titleLower.includes('уничтожил')) {
    triggers.push('Emotional Response');
  }
  if (titleLower.includes('лучший') || titleLower.includes('топ') || titleLower.includes('революция')) {
    triggers.push('Status');
  }
  if (titleLower.includes('новый') || titleLower.includes('2024') || titleLower.includes('2025')) {
    triggers.push('Trend/Urgency');
  }
  if (titleLower.includes('деньги') || titleLower.includes('заработок') || titleLower.includes('доход')) {
    triggers.push('Financial Gain');
  }
  if (titleLower.includes('быстро') || titleLower.includes('легко') || titleLower.includes('просто')) {
    triggers.push('Ease of Use');
  }
  if (titleLower.includes('бесплатно') || titleLower.includes('скидка') || titleLower.includes('подарок')) {
    triggers.push('Value Proposition');
  }
  
  // Add some randomization to triggers
  const additionalTriggers = ['Urgency', 'Scarcity', 'Authority', 'Reciprocity'];
  if (Math.random() < 0.4) {
    triggers.push(additionalTriggers[Math.floor(Math.random() * additionalTriggers.length)]);
  }
  
  // Более умное определение триггеров
  if (triggers.length === 0) {
    // Попробуем определить триггер по общим паттернам
    if (titleLower.includes('?') || titleLower.includes('как') || titleLower.includes('почему') || titleLower.includes('что')) {
      triggers.push('Curiosity');
    } else if (titleLower.includes('я ') || titleLower.includes('мой ') || titleLower.includes('мы ')) {
      triggers.push('Social Proof');
    } else if (/\d+/.test(title) || titleLower.includes('топ') || titleLower.includes('лучшие')) {
      triggers.push('Status');
    } else if (titleLower.includes('новый') || titleLower.includes('2024') || titleLower.includes('2025')) {
      triggers.push('Trend/Urgency');
    } else {
    triggers.push('Curiosity');
    }
  }
  
  // Generate synergy
  let synergy = '';
  synergy = '';
  
  return {
    style: style,
    triggers: triggers.join(', '),
    synergy: synergy
  };
}

/* ================= RENDER ================= */
function rowHTML(i, opt, topSet, showTitle, showThumb){
  const n = i+1; const isTop = topSet.has(n);
  const titleVal = opt.title || '';
  const thumbVal = opt.thumbnailText || '';
  const source = opt.source || '';
  
  // Use only style and triggers from model response
  const styleVal = opt.style || "Unknown";
  const triggersVal = opt.triggers || "Unknown";
  const analysis = analyzeTitle(titleVal, thumbVal);
  const synergyVal = analysis.synergy;
  
  const titleHTML = showTitle && titleVal ? `
    <div class="line">
      <div class="label">${t.titleLabel}</div>
      <div class="txt" data-kind="title" role="button" tabindex="0" title="${t.clickToCopy}">${titleVal}</div>
    </div>` : '';
  const thumbHTML = showThumb && thumbVal ? `
    <div class="line">
      <div class="label">${t.thumbnailLabel}</div>
      <div class="txt" data-kind="thumb" role="button" tabindex="0" title="${t.clickToCopy}">${thumbVal}</div>
    </div>` : '';
  
  if (!titleHTML && !thumbHTML) return '';
  
  // Source indicator removed - no model badges
  
  // Analysis section - always show client-generated analysis
  const analysisHTML = `
    <div class="title-analysis">
      <div class="analysis-item">
        <div class="analysis-label">${t.styleLabel}:</div>
        <div class="analysis-value style">${styleVal}</div>
      </div>
      <div class="analysis-item">
        <div class="analysis-label">${t.triggersLabel}:</div>
        <div class="analysis-value triggers">${triggersVal}</div>
      </div>
      ${synergyVal ? `<div class="synergy-note">${synergyVal}</div>` : ''}
    </div>`;
  
  return `
  <div class="row${isTop? ' top':''}" data-idx="${n}" style="--row-index: ${i}">
    <div class="badge" aria-hidden="true">${n}</div>${isTop? `<span class="star" aria-label="${t.topPick}" title="${t.topPick}">★</span>`:''}
    <div class="pair">
      ${titleHTML}${thumbHTML}
      ${analysisHTML}
    </div>
  </div>`;
}

function sessionHTML(session, showCloseButton = true){
  const { output, view, input } = session;
  const showTitle = view.wantTitles, showThumb = view.wantThumbs;
  const topSet = new Set((output.topPicks||[]).map(x=> x.index));
  const list = (output.options||[]).map((o,i)=> rowHTML(i,o,topSet,showTitle,showThumb)).filter(Boolean).join('');
  const cardTitle = getFirstSentence(input.topic);
  
  const closeButton = showCloseButton ? `
      <div class="session-actions">
        <button class="iconbtn close" title="${t.removeResult}" aria-label="${t.removeResult}">
          <svg viewBox="0 0 24 24"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.18 12 2.89 5.71 4.3 4.29 10.59 10.6l6.3-6.31z"/></svg>
        </button>
    </div>` : '';
  
  return `
  <article class="session collapsed" role="region" aria-label="Result session" data-id="${session.id}">
    <div class="session-head">
      <span class="session-title">${cardTitle}</span>
      ${closeButton}
    </div>
    <div class="audience" data-label="${t.audienceProfile}">${output.audienceProfile||''}</div>
    <div class="list">${list}</div>
  </article>`;
}

function skeletonCard(){
  const wrap = document.createElement('div');
  wrap.className = 'session';
  wrap.innerHTML = `
    <div class="session-head">
      <span class="session-title">${t.loading}</span>
    </div>
    <div class="skeleton">
      <div class="pulse"></div><div class="pulse"></div><div class="pulse"></div>
    </div>`;
  return wrap;
}

/* ================= 3D CARD SYSTEM ================= */
let cardClickHandler = null;
let improvementCardClickHandler = null;

function setup3DCards() {
  const stream = $('#stream');

  // Remove old handler if exists
  if (cardClickHandler) {
    stream.removeEventListener('click', cardClickHandler);
  }

  // Update stack indices for collapsed cards
  function updateStackIndices() {
    const sessions = [...stream.querySelectorAll('.session')];
    let stackIndex = 0;

    sessions.forEach(session => {
      if (session.classList.contains('collapsed')) {
        session.style.setProperty('--stack-index', stackIndex);
        stackIndex++;
      } else {
        session.style.setProperty('--stack-index', 0);
      }
    });
  }

  // Create new handler
  cardClickHandler = (e) => {
    const session = e.target.closest('.session');
    if (!session || e.target.closest('.iconbtn')) return;

    const isExpanded = session.classList.contains('expanded');
    const allSessions = [...stream.querySelectorAll('.session')];

    if (isExpanded) {
      // Collapse the card
      session.classList.remove('expanded');
      session.classList.add('collapsed');
      allSessions.forEach(s => s.classList.remove('pushed-down'));
    } else {
      // Expand this card and push others down
      allSessions.forEach(s => {
        s.classList.remove('expanded');
        s.classList.add('collapsed');
        if (s !== session) {
          s.classList.add('pushed-down');
        }
      });
      session.classList.remove('collapsed', 'pushed-down');
      session.classList.add('expanded');
    }

    haptic.medium();
    setTimeout(updateStackIndices, 50);
  };

  // Add new handler
  stream.addEventListener('click', cardClickHandler);

  updateStackIndices();
}

function setupImprovement3DCards() {
  const stream = document.getElementById('improvement-stream');
  if (!stream) return;

  // Remove old handler if exists
  if (improvementCardClickHandler) {
    stream.removeEventListener('click', improvementCardClickHandler);
  }

  // Update stack indices for collapsed cards
  function updateStackIndices() {
    const sessions = [...stream.querySelectorAll('.session')];
    let stackIndex = 0;

    sessions.forEach(session => {
      if (session.classList.contains('collapsed')) {
        session.style.setProperty('--stack-index', stackIndex);
        stackIndex++;
      } else {
        session.style.setProperty('--stack-index', 0);
      }
    });
  }

  // Create new handler
  improvementCardClickHandler = (e) => {
    const session = e.target.closest('.session');
    if (!session || e.target.closest('.iconbtn')) return;

    const isExpanded = session.classList.contains('expanded');
    const allSessions = [...stream.querySelectorAll('.session')];

    if (isExpanded) {
      // Collapse the card
      session.classList.remove('expanded');
      session.classList.add('collapsed');
      allSessions.forEach(s => s.classList.remove('pushed-down'));
    } else {
      // Expand this card and push others down
      allSessions.forEach(s => {
        s.classList.remove('expanded');
        s.classList.add('collapsed');
        if (s !== session) {
          s.classList.add('pushed-down');
        }
      });
      session.classList.remove('collapsed', 'pushed-down');
      session.classList.add('expanded');
    }

    haptic.medium();
    setTimeout(updateStackIndices, 50);
  };

  // Add new handler
  stream.addEventListener('click', improvementCardClickHandler);

  updateStackIndices();
}

/* ================= COPY / CONTROLS ================= */
function attachCopyHandlers(scope=document){
  function copyText(el){
    const text = el?.textContent?.trim() || '';
    if(!text) return;
    navigator.clipboard.writeText(text).then(()=>{
      el.classList.add('copied');
      setTimeout(()=> el.classList.remove('copied'), 500);
      toast('copied');
      haptic.success();
    }).catch(()=> {
      toast('copyFailed');
      haptic.error();
    });
  }
  scope.querySelectorAll('.txt').forEach(el=>{
    el.onclick = (e) => { 
      e.stopPropagation(); 
      copyText(el); 
    };
    el.addEventListener('touchstart', ()=> haptic.light());
    el.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); copyText(el); }});
  });
}

function attachSessionControls(scope=document){
  scope.querySelectorAll('.session .close').forEach(btn=>{
    btn.onclick = (e) => {
      e.stopPropagation();
      const card = btn.closest('.session');
      const id = card?.dataset?.id;
      card.style.transform='scale(.95)';
      card.style.opacity='0';
      haptic.medium();
      setTimeout(()=>{
        card.remove();

        // Определяем, из какого stream удаляется сессия
        const isImprovementSession = card.closest('#improvement-stream') !== null;

        if(id) {
          if (isImprovementSession) {
            store.deleteImprovementSession(id);
          } else {
            store.deleteSession(id);
          }
        }

        setup3DCards();

        // Проверяем, остались ли сессии, и обрабатываем соответственно
        const remainingSessions = isImprovementSession ? store.loadImprovementSessions() : store.loadSessions();
        const resultsPanel = isImprovementSession
          ? document.querySelector('.improvement-results-panel')
          : document.querySelector('.panel.results:not(.improvement-results-panel)');

        if (remainingSessions.length === 0 && resultsPanel) {
          if (isMobileDevice()) {
            // На мобильных скрываем блок
            resultsPanel.style.opacity = '0';
            resultsPanel.style.transform = 'translateY(-20px)';
            setTimeout(() => {
              resultsPanel.style.display = 'none';
            }, 300);
          } else {
            // На ПК показываем placeholder
            const container = isImprovementSession
              ? document.querySelector('#improvement-stream')
              : document.querySelector('#stream');
            container.innerHTML = '';
            const placeholder = document.createElement('div');
            placeholder.className = 'history-placeholder';
            placeholder.innerHTML = `
              <div class="placeholder-content">
                <div class="placeholder-icon">📝</div>
                <div class="placeholder-text">${t.historyPlaceholder}</div>
              </div>
            `;
            container.appendChild(placeholder);
          }
        }
      }, 300);
    };
  });
  scope.querySelectorAll('.sk-close').forEach(btn=>{
    btn.onclick = (e) => { 
      e.stopPropagation();
      const card = btn.closest('.session');
      card.style.transform='scale(.95)'; 
      card.style.opacity='0';
      haptic.light();
      setTimeout(()=> card?.remove(), 300);
    };
  });
}

/* ================= FLOW ================= */
function updateCountSlider(value){
  const countValue = document.getElementById('count-value');
  const thumb = document.getElementById('count-thumb');
  if (!countValue || !thumb) return;
  
  // Ensure value is even and in range 6-16
  value = Math.max(6, Math.min(16, value));
  if (value % 2 !== 0) {
    value = Math.round(value / 2) * 2;
  }
  
  countValue.textContent = value;
  
  // Calculate position (6-16 range maps to 0-100%)
  const percentage = ((value - 6) / (16 - 6)) * 100;
  thumb.style.left = percentage + '%';
  
  // Save to storage
  const inputs = store.loadInputs();
  store.saveInputs({ ...inputs, count: value });
  
  // Haptic feedback
  haptic.selectionChanged();
}

function blinkFields(){
  ['#topicField','#formatField','#audienceField'].forEach(sel=>{
    const host = document.querySelector(sel);
    if(!host) return;
    host.style.boxShadow='0 0 0 3px rgba(110,231,255,.3), inset 0 0 20px rgba(134,160,255,.1)';
    setTimeout(()=> host.style.boxShadow='', 500);
  });
}

let btnMsgTimer=null;
let improveBtnMsgTimer=null;

function setBtnBusy(btn, on){
  if(on){
    btn.setAttribute('aria-busy','true');
    btn.classList.add('processing');
    btn.disabled=true;
    const msgs = [
      t.working,
      t.analyzingTopic,
      t.understandingAudience,
      t.findingPatterns,
      t.craftingTitles,
      t.optimizingEngagement,
      t.addingTriggers,
      t.testingCTR,
      t.finalizingOptions,
      t.almostReady
    ];
    let i=0;
    btn.querySelector('.btn-text').innerHTML = `${msgs[i]}<span class="dots"></span>`;
    clearInterval(btnMsgTimer);
    btnMsgTimer = setInterval(()=>{
      i=(i+1)%msgs.length;
      btn.querySelector('.btn-text').innerHTML = `${msgs[i]}<span class="dots"></span>`;
    }, 10000); // 10 seconds per status
  }else{
    btn.setAttribute('aria-busy','false');
    btn.classList.remove('processing');
    btn.disabled=false;
    clearInterval(btnMsgTimer);
    btnMsgTimer=null;
    btn.querySelector('.btn-text').textContent = t.send;
  }
}

function setImproveBtnBusy(btn, on){
  if(on){
    btn.setAttribute('aria-busy','true');
    btn.classList.add('processing');
    btn.disabled=true;
    const msgs = [
      t.improvingText || 'Improving',
      t.analyzingDraft || 'Analyzing your draft',
      t.findingImprovements || 'Finding improvements',
      t.optimizingLanguage || 'Optimizing language',
      t.enhancingPsychology || 'Enhancing psychology',
      t.polishingResults || 'Polishing results',
      t.almostReady || 'Almost ready'
    ];
    let i=0;
    btn.querySelector('.btn-text').innerHTML = `${msgs[i]}<span class="dots"></span>`;
    clearInterval(improveBtnMsgTimer);
    improveBtnMsgTimer = setInterval(()=>{
      i=(i+1)%msgs.length;
      btn.querySelector('.btn-text').innerHTML = `${msgs[i]}<span class="dots"></span>`;
    }, 8000); // 8 seconds per status
  }else{
    btn.setAttribute('aria-busy','false');
    btn.classList.remove('processing');
    btn.disabled=false;
    clearInterval(improveBtnMsgTimer);
    improveBtnMsgTimer=null;
    btn.querySelector('.btn-text').textContent = t.improveButton || 'Improve';
  }
}

async function generateDualModels(topic, format, audience, wantTitles, wantThumbs, count, clickbaitLevel) {
  // Создаем промпт для генерации контента только через Gemini
  const geminiPrompt = buildUserBlockWithAudience({topic, format, audience, wantTitles, wantThumbs, count, clickbaitLevel});
  
  // Формируем полный промпт для отправки
  const fullPrompt = SYSTEM_PROMPT + '\n\n' + geminiPrompt;
  
  
  // Запрос только к Gemini
  const geminiResult = await callGemini({
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: GENCFG_HQ(count)
  });
  
  const results = [];
  
  // Обрабатываем результат Gemini
  try {
    const geminiData = geminiResult;
    const first = (geminiData.candidates||[])[0];
    const text = joinParts(first?.content?.parts);
    let parsed = safeParseJSON(text);
    
    if (parsed && Array.isArray(parsed.options)) {
      const normalized = normalizeOutput(parsed, { wantTitles, wantThumbs, count, source: 'Gemini' });
      // Используем ЦА от Gemini
      results.push({ source: 'Gemini', data: normalized, order: 1 });
    }
  } catch (err) {
    console.warn('Gemini parsing error:', err);
  }
  
  return results;
}

async function generate(){
  const btn = $("#send");
  if(btn.getAttribute('aria-busy')==='true'){
    toast('pleaseWait');
    haptic.error();
    return;
  }

  // Check if another operation is in progress
  if(isOperationInProgress) {
    toast('pleaseWait');
    haptic.error();
    return;
  }

  const topic = clampStr($("#topic").value, MAX_CHARS_TOPIC);
  const format = clampStr($("#format").value, MAX_CHARS_FORMAT);
  const audience = clampStr($("#audience").value, MAX_CHARS_AUDIENCE);
  let wantTitles = $("#wantTitles").checked, wantThumbs = $("#wantThumbs").checked;
  
  // Get count from slider
  const countValue = document.getElementById('count-value');
  let count = parseInt(countValue?.textContent || "8", 10) || 8;
  count = clamp(count, 6, 16);
  // Ensure count is even
  if (count % 2 !== 0) {
    count = Math.round(count / 2) * 2;
  }
  
  // Get selected clickbait level
  const clickbaitLevel = getCurrentClickbaitLevel();

  if(!wantTitles && !wantThumbs){ 
    // Принудительно включаем заголовки, если оба отключены
    wantTitles = true;
    $("#wantTitles").checked = true;
    
    // Добавляем визуальную анимацию предупреждения
    const titleCheck = $("#checkTitles");
    titleCheck.classList.add('forced-check');
    setTimeout(() => {
      titleCheck.classList.remove('forced-check');
    }, 600);
    
    toast("atLeastOneComponent");
    haptic.error();
  }
  if(!topic){ 
    $("#topic").focus(); 
    toast("topicRequired"); 
    haptic.error();
    return; 
  }

  store.saveInputs({topic, format, audience, wantTitles, wantThumbs, count, clickbaitLevel});

  setBtnBusy(btn, true);
  isOperationInProgress = true;
  blinkFields();
  haptic.medium();

  const stream = $("#stream");

  // Remove placeholder if it exists
  const placeholder = stream.querySelector('.history-placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  const skel = skeletonCard();
  stream.prepend(skel);

  try {
    // Используем двойную модель
    const results = await generateDualModels(topic, format, audience, wantTitles, wantThumbs, count, clickbaitLevel);
    
    if (results.length === 0) {
      throw new Error('No models responded successfully');
    }
    
    // Объединяем результаты от Gemini
    let combinedOptions = [];
    let combinedTopPicks = [];
    let audienceProfile = '';
    
    // Берем результат от Gemini
    const geminiResult = results.find(r => r.source === 'Gemini');
    if (geminiResult && geminiResult.data) {
      const { data } = geminiResult;
      
      if (data.options) {
        // Добавляем опции от Gemini
        data.options.forEach((option, optIndex) => {
          combinedOptions.push({
            ...option,
            source: 'Gemini',
            originalIndex: optIndex
          });
        });
      }
      
      if (data.topPicks) {
        // Добавляем top picks от Gemini
        data.topPicks.forEach(pick => {
          combinedTopPicks.push({
            index: pick.index,
            source: 'Gemini'
          });
        });
      }
      
      // Берем ЦА от Gemini
      if (data.audienceProfile) {
        audienceProfile = data.audienceProfile;
      }
    }
    
    // Создаем финальный результат
    const finalOutput = {
      audienceProfile,
      options: combinedOptions,
      topPicks: combinedTopPicks.slice(0, 2) // Берем только первые 2
    };
    
    const session = { 
      id: uid(), 
      createdAt: nowStr(), 
      input:{topic,format,audience}, 
      view:{ wantTitles, wantThumbs, count }, 
      output: finalOutput 
    };
    store.addSession(session);

    // Показываем блок истории, если он был скрыт или показываем placeholder
    const resultsPanel = stream.closest('.panel.results');
    if (resultsPanel && (resultsPanel.style.display === 'none' || stream.querySelector('.history-placeholder'))) {
      resultsPanel.style.display = '';
      // Плавное появление
      setTimeout(() => {
        resultsPanel.style.opacity = '1';
        resultsPanel.style.transform = 'translateY(0)';
      }, 50);
    }

    const cardWrap = document.createElement('div'); 
    cardWrap.innerHTML = sessionHTML(session, false); // Создаем без кнопки закрытия
    const newSession = cardWrap.firstElementChild;
    stream.replaceChild(newSession, skel);
    
    // Re-initialize everything for the new content
    attachCopyHandlers(stream);
    attachSessionControls(stream);
    setup3DCards();
    
    // Добавляем кнопку закрытия после завершения генерации
    setTimeout(() => {
      const sessionHead = newSession.querySelector('.session-head');
      if (sessionHead && !sessionHead.querySelector('.session-actions')) {
        const closeButtonHTML = `
          <div class="session-actions" style="opacity: 0; animation: fadeInActions 0.5s ease forwards;">
            <button class="iconbtn close" title="${t.removeResult}" aria-label="${t.removeResult}">
              <svg viewBox="0 0 24 24"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.18 12 2.89 5.71 4.3 4.29 10.59 10.6l6.3-6.31z"/></svg>
            </button>
          </div>`;
        sessionHead.insertAdjacentHTML('beforeend', closeButtonHTML);
        
        // Re-attach controls for the new close button
        attachSessionControls(newSession);
      }
    }, 800); // Задержка для появления кнопки после завершения генерации
    
    // Auto-expand the new card
    setTimeout(() => {
      const allSessions = [...stream.querySelectorAll('.session')];
      allSessions.forEach(s => {
        s.classList.add('collapsed');
        s.classList.remove('expanded');
        if (s !== newSession) {
          s.classList.add('pushed-down');
        }
      });
      newSession.classList.remove('collapsed', 'pushed-down');
      newSession.classList.add('expanded');
      
      // Update stack indices after expansion
      let stackIndex = 0;
      allSessions.forEach(session => {
        if (session.classList.contains('collapsed')) {
          session.style.setProperty('--stack-index', stackIndex);
          stackIndex++;
        } else {
          session.style.setProperty('--stack-index', 0);
        }
      });
    }, 100);
    
    haptic.success();
  } catch(err) {
    const message = err?.message||'Unknown error';
    skel.innerHTML = `<div class="session-head">
        <button class="iconbtn sk-close" title="${t.dismiss}" aria-label="${t.dismiss}">
          <svg viewBox="0 0 24 24"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.18 12 2.89 5.71 4.3 4.29 10.59 10.6l6.3-6.31z"/></svg>
        </button>
      </div>
      <div class="skeleton" role="alert" style="border:2px solid #3e2c2c; background:#1a0f12; color:#ffc7c7">
        <div><strong>${t.requestFailed}</strong> ${truncate(message,260)}</div>
      </div>`;
    attachSessionControls(skel);
    haptic.error();
  } finally {
    setBtnBusy(btn, false);
    isOperationInProgress = false;
  }
}

/* ================= INIT ================= */
// Определяем тип устройства
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768;
}

function renderAll(){
  const container = $("#stream"); 
  const resultsPanel = container.closest('.panel.results');
  const sessions = store.loadSessions();
  
  container.innerHTML = "";
  
  if (sessions.length === 0) {
    if (isMobileDevice()) {
      // На мобильных скрываем блок истории, если нет данных
      if (resultsPanel) {
        resultsPanel.style.opacity = '0';
        resultsPanel.style.transform = 'translateY(-20px)';
        setTimeout(() => {
          resultsPanel.style.display = 'none';
        }, 300);
      }
    } else {
      // На ПК показываем placeholder
      if (resultsPanel) {
        resultsPanel.style.display = '';
        resultsPanel.style.opacity = '1';
        resultsPanel.style.transform = 'translateY(0)';
        
        // Добавляем placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'history-placeholder';
        placeholder.innerHTML = `
          <div class="placeholder-content">
            <div class="placeholder-icon">📝</div>
            <div class="placeholder-text">${t.historyPlaceholder}</div>
          </div>
        `;
        container.appendChild(placeholder);
      }
    }
  } else {
    // Показываем блок истории и рендерим сессии
    if (resultsPanel) {
      resultsPanel.style.display = '';
      // Небольшая задержка для плавного появления
      setTimeout(() => {
        resultsPanel.style.opacity = '1';
        resultsPanel.style.transform = 'translateY(0)';
      }, 50);
    }
    
    sessions.forEach(s => {
    const wrap = document.createElement("div"); 
      wrap.innerHTML = sessionHTML(s, true); // Существующие сессии показываем с кнопкой
    container.appendChild(wrap.firstElementChild);
  });
  attachCopyHandlers(container);
  attachSessionControls(container);
  setup3DCards();
  }
}

function bindUI(){
  // Apply translations first
  applyTranslations();
  
  // Start loading phrase rotation after translations
  setTimeout(() => {
    startLoadingPhraseRotation();
  }, 100);
  
  // Initialize particles background
  setTimeout(() => {
    new ParticlesBackground();
  }, 500);
  
  // Hide loader
  setTimeout(()=> {
    const pl = $("#pageloader"); 
    if(pl){ 
      pl.classList.add('hidden');
      haptic.light();
    }
    const app = $("#appRoot"); 
    if(app){ app.removeAttribute('aria-hidden'); }
  }, 2200);

  // Load saved inputs
  const inputs = store.loadInputs();
  if(inputs.topic) $("#topic").value=inputs.topic;
  if(inputs.format) $("#format").value=inputs.format;
  if(inputs.audience) $("#audience").value=inputs.audience;
  if(typeof inputs.wantTitles==="boolean") $("#wantTitles").checked=inputs.wantTitles;
  if(typeof inputs.wantThumbs==="boolean") $("#wantThumbs").checked=inputs.wantThumbs;
  if(inputs.count) {
    let savedCount = parseInt(inputs.count,10)||8;
    savedCount = clamp(savedCount, 6, 16);
    if (savedCount % 2 !== 0) {
      savedCount = Math.round(savedCount / 2) * 2;
    }
    updateCountSlider(savedCount);
  } else {
    updateCountSlider(8); // Default value
  }
  
  // Load clickbait level
  if(inputs.clickbaitLevel) {
    updateClickbaitSlider(inputs.clickbaitLevel);
  }


  // Count slider handlers
  initCountSlider();

  // Clear field buttons
  $("#clearTopic").addEventListener("click", () => {
    $("#topic").value = '';
    $("#topic").focus();
    haptic.light();
  });
  $("#clearFormat").addEventListener("click", () => {
    $("#format").value = '';
    $("#format").focus();
    haptic.light();
  });
  $("#clearAudience").addEventListener("click", () => {
    $("#audience").value = '';
    $("#audience").focus();
    haptic.light();
  });

  // Main button with ripple effect
  const sendBtn = $("#send");
  sendBtn.addEventListener("click", (e) => {
    addRippleEffect(sendBtn, e);
    generate();
  });
  sendBtn.addEventListener("touchstart", () => haptic.light());
  
  
  // Enter key submit
  document.addEventListener("keydown", (e)=>{ 
    if(e.key==='Enter' && ['topic','format','audience'].includes(document.activeElement?.id)){ 
      e.preventDefault(); 
      generate(); 
    } 
  });

  // Clear history
  $("#clear-history").addEventListener("click", async ()=>{
    const confirmed = await customConfirm(t.confirmClear);
    if(confirmed){
      store.clearSessions();
      store.saveInputs({}); // Also clear saved inputs
      // Force clear all localStorage to ensure fresh start
      localStorage.removeItem("tc_sessions_v7");
      localStorage.removeItem("tc_inputs_v7");
      renderAll();
      toast("historyCleared");
      haptic.success();
    }
  });
  $("#clear-history").addEventListener("touchstart", () => haptic.light());

  // Clear improvement history
  $("#clear-improvement-history").addEventListener("click", async ()=>{
    const confirmed = await customConfirm(t.confirmClear);
    if(confirmed){
      store.clearImprovementSessions();
      localStorage.removeItem("tc_improvement_sessions_v1");
      loadImprovementHistory();
      toast("historyCleared");
      haptic.success();
    }
  });
  $("#clear-improvement-history").addEventListener("touchstart", () => haptic.light());

  // Checkbox ripple effects and validation
  const titleCheck = $("#checkTitles");
  const thumbCheck = $("#checkThumbs");
  
  function ensureAtLeastOneChecked(changedCheckbox) {
    const titleChecked = $("#wantTitles").checked;
    const thumbChecked = $("#wantThumbs").checked;
    
    if (!titleChecked && !thumbChecked) {
      // Если оба отключены, включаем обратно измененный чекбокс
      changedCheckbox.checked = true;
      
      // Обновляем визуальное состояние
      if (changedCheckbox.id === 'wantTitles') {
        titleCheck.classList.add('ripple', 'forced-check');
        setTimeout(() => {
          titleCheck.classList.remove('ripple', 'forced-check');
        }, 600);
      } else {
        thumbCheck.classList.add('ripple', 'forced-check');
        setTimeout(() => {
          thumbCheck.classList.remove('ripple', 'forced-check');
        }, 600);
      }
      
      // Показываем уведомление
      toast('atLeastOneComponent');
      haptic.error();
    }
  }
  
  titleCheck.addEventListener("click", () => {
    titleCheck.classList.add('ripple');
      haptic.light();
    setTimeout(() => titleCheck.classList.remove('ripple'), 600);
    
    // Проверяем после изменения состояния
    setTimeout(() => {
      ensureAtLeastOneChecked($("#wantTitles"));
    }, 10);
  });
  
  thumbCheck.addEventListener("click", () => {
    thumbCheck.classList.add('ripple');
    haptic.light();
    setTimeout(() => thumbCheck.classList.remove('ripple'), 600);
    
    // Проверяем после изменения состояния
    setTimeout(() => {
      ensureAtLeastOneChecked($("#wantThumbs"));
    }, 10);
  });

  // Initialize clickbait slider
  initClickbaitSlider();


  // Field mouse tracking
  ["#topicField", "#formatField", "#audienceField"].forEach(id => {
    const field = $(id);
    if(field) trackMouseOnField(field);
  });

  // FAB button
  $("#fabBtn").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    haptic.medium();
  });
  $("#fabBtn").addEventListener("touchstart", () => haptic.light());

  // FAB scroll visibility
  let fabTimeout;
  function updateFabVisibility() {
    const fab = $("#fabBtn");
    if (!fab) return;
    
    const scrollY = window.scrollY;
    const showThreshold = 300; // Show after scrolling 300px down
    
    if (scrollY > showThreshold) {
      fab.classList.add('visible');
    } else {
      fab.classList.remove('visible');
    }
  }

  // Throttled scroll handler
  function handleScroll() {
    if (fabTimeout) clearTimeout(fabTimeout);
    fabTimeout = setTimeout(updateFabVisibility, 10);
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  updateFabVisibility(); // Initial check

  // Brand click
  $("#brand").addEventListener("click", () => {
    haptic.light();
  });

  // Render all sessions
  renderAll();
  loadImprovementHistory();

  // Reduce animations on low battery
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      if(battery.level < 0.2) {
        document.body.style.setProperty('--reduce-animations', '1');
      }
    });
  }
}

// Clickbait slider functions
let currentClickbaitLevel = 3;

function getCurrentClickbaitLevel() {
  return currentClickbaitLevel;
}

function updateClickbaitSlider(level) {
  currentClickbaitLevel = level;
  const thumb = document.getElementById('clickbait-thumb');
  const track = document.querySelector('.clickbait-slider-track');
  if (!thumb || !track) return;
  
  const positions = { 1: 0, 2: 33.33, 3: 66.66, 4: 100 };
  thumb.style.left = positions[level] + '%';
  
  // Update gradient animation classes
  track.className = 'clickbait-slider-track';
  thumb.className = 'clickbait-slider-thumb';
  
  // Add level-specific classes for gradient animation
  track.classList.add(`level-${level}`);
  thumb.classList.add(`level-${level}`);
  
  // Update display
  const titleEl = document.querySelector('.clickbait-current-title');
  const descEl = document.querySelector('.clickbait-current-desc');
  if (titleEl && descEl) {
    const titleKey = `clickbaitLevel${level}Title`;
    const descKey = `clickbaitLevel${level}Desc`;
    if (t[titleKey]) titleEl.innerHTML = t[titleKey];
    if (t[descKey]) descEl.innerHTML = t[descKey];
  }
  
  // Save to storage
  store.saveInputs({ clickbaitLevel: level });
  
  // Haptic feedback
  if (navigator.vibrate) navigator.vibrate(50);
}

function initClickbaitSlider() {
  const thumb = document.getElementById('clickbait-thumb');
  const track = document.querySelector('.clickbait-slider-track');
  const labels = document.querySelectorAll('.clickbait-label');
  
  if (!thumb || !track) return;
  
  let isDragging = false;

  // Click on track
  track.addEventListener('click', (e) => {
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    
    let level;
    if (percentage < 25) level = 1;
    else if (percentage < 50) level = 2;
    else if (percentage < 75) level = 3;
    else level = 4;
    
    updateClickbaitSlider(level);
  });

  // Click on labels
  labels.forEach(label => {
    label.addEventListener('click', () => {
      const level = parseInt(label.getAttribute('data-level'));
      updateClickbaitSlider(level);
      haptic.light();
    });
    
    label.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const level = parseInt(label.getAttribute('data-level'));
      updateClickbaitSlider(level);
      haptic.light();
    });
  });

  // Drag functionality
  thumb.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const rect = track.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
    
    let level;
    if (percentage < 25) level = 1;
    else if (percentage < 75) level = 2;
    else level = 3;
    
    updateClickbaitSlider(level);
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch support
  thumb.addEventListener('touchstart', (e) => {
    isDragging = true;
    e.preventDefault();
    e.stopPropagation();
    haptic.light();
  });

  track.addEventListener('touchstart', (e) => {
    const rect = track.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = (touchX / rect.width) * 100;
    
    let level;
    if (percentage < 25) level = 1;
    else if (percentage < 50) level = 2;
    else if (percentage < 75) level = 3;
    else level = 4;
    
    updateClickbaitSlider(level);
    haptic.light();
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = track.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (touchX / rect.width) * 100));
    
    let level;
    if (percentage < 25) level = 1;
    else if (percentage < 50) level = 2;
    else if (percentage < 75) level = 3;
    else level = 4;
    
    updateClickbaitSlider(level);
  });

  document.addEventListener('touchend', (e) => {
    if (isDragging) {
    isDragging = false;
      haptic.light();
    }
  });
  
  // Initialize with level 3 (maximum)
  updateClickbaitSlider(3);
}

// Count slider functions
function initCountSlider() {
  const thumb = document.getElementById('count-thumb');
  const track = document.querySelector('.count-slider-track');
  const labels = document.querySelectorAll('.count-label-item');
  
  if (!thumb || !track) return;
  
  let isDragging = false;

  // Click on track
  track.addEventListener('click', (e) => {
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    
    // Convert percentage to value (6-16 range, even numbers only)
    const rawValue = 6 + (percentage / 100) * 10;
    const value = Math.round(rawValue / 2) * 2; // Round to nearest even number
    const clampedValue = clamp(value, 6, 16);
    
    updateCountSlider(clampedValue);
  });

  // Click on labels
  labels.forEach(label => {
    label.addEventListener('click', () => {
      const value = parseInt(label.getAttribute('data-value'));
      updateCountSlider(value);
      haptic.light();
    });
    
    label.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const value = parseInt(label.getAttribute('data-value'));
      updateCountSlider(value);
      haptic.light();
    });
  });

  // Drag functionality
  thumb.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const rect = track.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
    
    // Convert percentage to value (6-16 range, even numbers only)
    const rawValue = 6 + (percentage / 100) * 10;
    const value = Math.round(rawValue / 2) * 2; // Round to nearest even number
    const clampedValue = clamp(value, 6, 16);
    
    updateCountSlider(clampedValue);
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch support
  thumb.addEventListener('touchstart', (e) => {
    isDragging = true;
    e.preventDefault();
    e.stopPropagation();
    haptic.light();
  });

  track.addEventListener('touchstart', (e) => {
    const rect = track.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = (touchX / rect.width) * 100;
    
    // Convert percentage to value (6-16 range, even numbers only)
    const rawValue = 6 + (percentage / 100) * 10;
    const value = Math.round(rawValue / 2) * 2; // Round to nearest even number
    const clampedValue = clamp(value, 6, 16);
    
    updateCountSlider(clampedValue);
    haptic.light();
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = track.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (touchX / rect.width) * 100));
    
    // Convert percentage to value (6-16 range, even numbers only)
    const rawValue = 6 + (percentage / 100) * 10;
    const value = Math.round(rawValue / 2) * 2; // Round to nearest even number
    const clampedValue = clamp(value, 6, 16);
    
    updateCountSlider(clampedValue);
  });

  document.addEventListener('touchend', (e) => {
    if (isDragging) {
      isDragging = false;
      haptic.light();
    }
  });
  
  // Initialize with default value
  updateCountSlider(8);
}

/* ================= IMPROVEMENT SYSTEM PROMPT ================= */
const IMPROVEMENT_SYSTEM_PROMPT = `You are an expert in viral YouTube optimization with deep understanding of click psychology, linguistic refinement, and audience adaptation (hundreds of A/B tests).

Goal: take the user's draft title/thumbnail and improve it while preserving their original style and intent. Focus on grammar, psychology, readability, and audience adaptation.

Input data

DRAFT_TITLE: {{draft_title}}
DRAFT_THUMBNAIL: {{draft_thumbnail}}
VIDEO_TOPIC: {{topic}} ← optional context for better understanding
FORMAT: {{format}} ← optional context
AUDIENCE: {{audience}} ← optional context
MODE: {{mode}} ← "improve_title" | "improve_thumbnail" | "improve_both"
GENERATE_THUMBNAIL_FOR_TITLE: {{boolean}} ← if true, create thumbnail text for each improved title
N: 3 ← always output exactly 3 improved versions

Language & Locale (priority)

The language of the entire output = the language of the draft input.
Preserve the original language and tone of the user's draft.
If the draft is in Russian, default region = UA, unless context suggests otherwise.
Always adapt to the local format of numbers, rules, etc. (e.g., RU/UA → 0,1%; EN/ES → 0.1%).

Core Improvement Principles

PRESERVE USER'S STYLE AND INTENT
- Maintain the original tone (casual/professional/energetic/dry)
- Keep the clickbait level of the original draft
- Preserve key phrases and unique voice elements
- Don't change entertainment content to professional tone or vice versa
- If user used emojis → keep similar emoji density (but improve placement)
- If user avoided emojis → don't add them

GRAMMAR & LANGUAGE
- Fix spelling errors
- Correct punctuation
- Improve sentence structure without changing meaning
- Remove redundant words
- Fix awkward phrasing
- Ensure proper capitalization (but respect intentional CAPS usage)

PSYCHOLOGICAL OPTIMIZATION
- Strengthen existing psychological triggers (don't add new unrelated ones)
- Improve hook placement (strongest element in first ~40 characters for titles)
- Enhance emotional impact without changing the emotion type
- Add specificity where vague (numbers, names, concrete details)
- Remove weak filler words
- Strengthen verbs and action words

READABILITY & CLARITY
- Simplify complex/awkward constructions
- Replace overly complex words with clearer alternatives (but don't oversimplify)
- Ensure the message is immediately clear
- Remove ambiguity
- Improve rhythm and flow

AUDIENCE ADAPTATION
- If AUDIENCE specified → adjust vocabulary complexity to match
  * Kids/teens → simpler language, more energy
  * Professionals → clear but sophisticated
  * General → balanced, accessible
- Replace jargon with understandable terms (unless audience is specialized)
- Adjust cultural references if needed
- Maintain accessibility without dumbing down

LENGTH OPTIMIZATION
- Titles: aim for 40-80 characters (ideal: 50-65)
- Thumbnail text: 2-5 words (max 7 for complex topics)
- If draft is too long → condense without losing meaning
- If draft is too short → add specificity/context

Title Improvement Rules

STRUCTURE:
- Strongest hook in first ~40 characters
- One clear idea only
- Strong verb + explicit agent + specificity
- No fabrications or exaggerations beyond original intent
- Remove generic phrases ("you won't believe," "amazing," "incredible" unless user specifically used them)

SPECIFICITY:
- Vague numbers → precise numbers ("many" → "372")
- Generic time → specific time ("long time" → "731 days")
- Abstract → concrete ("improved a lot" → "×3 growth")
- General → specific ("in Europe" → "in Germany")

PSYCHOLOGICAL DEPTH:
- Use original psychological triggers as base
- Strengthen them with proven patterns
- Add micro-details for credibility
- Enhance emotional resonance

EMOJI USAGE (titles only):
- If draft has 0 emojis → add maximum 1-2 (and only if it genuinely helps)
- If draft has emojis → optimize placement and relevance
- Remove excessive or irrelevant emojis
- Never use emojis in thumbnail text

Thumbnail Text Improvement Rules

CORE RULES:
- 2-5 words maximum (exception: up to 7 for complex technical topics)
- Must complement title, NOT duplicate it
- No colons (:), no emojis, no punctuation except occasional "!", "?" or "%"
- Must be readable on 320×180px thumbnail
- High contrast with title (if title asks question → thumbnail states fact)

STYLE:
- Sharp, punchy, immediate impact
- Single concept or number
- CAPS allowed for 1-2 words max (if impactful)
- Preserve the tone of original draft

PSYCHOLOGICAL FUNCTION:
- Add urgency, scale, or stakes
- Provide missing context
- Enhance curiosity
- Create contrast or reinforcement

Output Contract (STRICTLY JSON, no extra keys)

FOR MODE = "improve_title" OR "improve_both":
{
  "analysis": {
    "detectedStyle": "brief analysis of user's original style",
    "identifiedTriggers": "psychological triggers present in the draft",
    "improvementFocus": "what was improved and why"
  },
  "improvedTitles": [
    {
      "title": "STRING",
      "thumbnailText": "STRING or null",
      "changes": "brief explanation of key improvements",
      "strengthenedTriggers": "triggers that were enhanced"
    },
    {
      "title": "STRING",
      "thumbnailText": "STRING or null",
      "changes": "brief explanation of key improvements",
      "strengthenedTriggers": "triggers that were enhanced"
    },
    {
      "title": "STRING",
      "thumbnailText": "STRING or null",
      "changes": "brief explanation of key improvements",
      "strengthenedTriggers": "triggers that were enhanced"
    }
  ]
}

FOR MODE = "improve_thumbnail":
{
  "analysis": {
    "detectedStyle": "brief analysis of user's original style",
    "identifiedPurpose": "what the thumbnail text is trying to achieve",
    "improvementFocus": "what was improved and why"
  },
  "improvedThumbnails": [
    {
      "text": "STRING",
      "changes": "brief explanation of key improvements",
      "psychologicalFunction": "how this version enhances the title"
    },
    {
      "text": "STRING",
      "changes": "brief explanation of key improvements",
      "psychologicalFunction": "how this version enhances the title"
    },
    {
      "text": "STRING",
      "changes": "brief explanation of key improvements",
      "psychologicalFunction": "how this version enhances the title"
    }
  ]
}

CRITICAL RULES:
- NEVER output in markdown format
- NEVER add explanations outside JSON
- ONLY valid JSON
- All text fields in the same language as the input draft
- "changes" and other explanation fields should be brief (1-2 sentences max)
- If GENERATE_THUMBNAIL_FOR_TITLE is false → thumbnailText = null for all improved titles
- Each improved version must be meaningfully different from others
- All improvements must preserve the user's original intent and style
`;

/* ================= IMPROVEMENT FEATURE ================= */
function renderImprovementSession(session) {
  const stream = document.getElementById('improvement-stream');
  if (!stream) {
    console.error('improvement-stream not found!');
    return;
  }

  const { id, timestamp, draftTitle, draftThumbnail, mode, generateThumbnail, result } = session;
  const data = result;

  console.log('Rendering session with data:', data);

  // Create session title
  let sessionTitle = mode === 'improve_title' ? (t.improvedTitle || 'Improved Title') :
                     mode === 'improve_thumbnail' ? (t.improvedThumbnail || 'Improved Thumbnail') :
                     (t.improved || 'Improved');

  // Add draft info to title
  if (draftTitle) {
    sessionTitle += ` • ${truncate(draftTitle, 40)}`;
  }

  // Build list HTML using same structure as create
  let listHTML = '';

  // Render improved titles
  if (data.improvedTitles && Array.isArray(data.improvedTitles) && data.improvedTitles.length > 0) {
    data.improvedTitles.forEach((item, index) => {
      let metaHTML = '';
      if (item.changes || item.strengthenedTriggers) {
        metaHTML = '<div class="meta-info" style="margin-top: 8px; font-size: 12px; color: var(--text-weak); line-height: 1.5;">';
        if (item.changes) {
          metaHTML += `<div style="margin-bottom: 4px;"><strong style="color: var(--brand-2);">${t.improved || 'Improved'}:</strong> ${item.changes}</div>`;
        }
        if (item.strengthenedTriggers) {
          metaHTML += `<div style="opacity: 0.8;"><strong style="color: var(--brand-2);">${t.triggers || 'Triggers'}:</strong> ${item.strengthenedTriggers}</div>`;
        }
        metaHTML += '</div>';
      }

      listHTML += `
        <div class="row" style="--row-index: ${index};">
          <div class="txt" tabindex="0" role="button" aria-label="Copy title">${item.title}</div>
          ${item.thumbnailText ? `
            <div class="txt thumb" tabindex="0" role="button" aria-label="Copy thumbnail text" style="margin-top: 8px;">${item.thumbnailText}</div>
          ` : ''}
          ${metaHTML}
        </div>
      `;
    });
  }

  // Render improved thumbnails
  if (data.improvedThumbnails && Array.isArray(data.improvedThumbnails) && data.improvedThumbnails.length > 0) {
    data.improvedThumbnails.forEach((item, index) => {
      let metaHTML = '';
      if (item.changes || item.psychologicalFunction) {
        metaHTML = '<div class="meta-info" style="margin-top: 8px; font-size: 12px; color: var(--text-weak); line-height: 1.5;">';
        if (item.changes) {
          metaHTML += `<div style="margin-bottom: 4px;"><strong style="color: var(--brand-2);">${t.improved || 'Improved'}:</strong> ${item.changes}</div>`;
        }
        if (item.psychologicalFunction) {
          metaHTML += `<div style="opacity: 0.8;"><strong style="color: var(--brand-2);">${t.psychology || 'Psychology'}:</strong> ${item.psychologicalFunction}</div>`;
        }
        metaHTML += '</div>';
      }

      listHTML += `
        <div class="row" style="--row-index: ${index};">
          <div class="txt thumb" tabindex="0" role="button" aria-label="Copy thumbnail text">${item.text}</div>
          ${metaHTML}
        </div>
      `;
    });
  }

  // Create draft info audience-style block
  let draftInfoHTML = '';
  if (draftTitle || draftThumbnail) {
    draftInfoHTML = `<div class="audience" data-label="${t.original || 'Original Draft'}">`;
    if (draftTitle) draftInfoHTML += `<div><strong>${t.title || 'Title'}:</strong> ${draftTitle}</div>`;
    if (draftThumbnail) draftInfoHTML += `<div><strong>${t.thumbnail || 'Thumbnail'}:</strong> ${draftThumbnail}</div>`;
    draftInfoHTML += `</div>`;
  }

  const card = document.createElement('article');
  card.className = 'session collapsed';
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', 'Improvement session');
  card.dataset.id = id;
  card.innerHTML = `
    <div class="session-head">
      <span class="session-title">${sessionTitle}</span>
    </div>
    ${draftInfoHTML}
    <div class="list">${listHTML}</div>
  `;

  console.log('Prepending card to stream');
  stream.prepend(card);

  attachCopyHandlers(card);
  attachSessionControls(card);

  console.log('Card rendered successfully');
}

function loadImprovementHistory() {
  const sessions = store.loadImprovementSessions();
  const stream = document.getElementById('improvement-stream');
  const resultsPanel = document.querySelector('.improvement-results-panel');

  if (!stream) return;

  stream.innerHTML = '';

  if (sessions.length === 0) {
    if (isMobileDevice()) {
      // На мобильных скрываем блок истории, если нет данных
      if (resultsPanel) {
        resultsPanel.style.opacity = '0';
        resultsPanel.style.transform = 'translateY(-20px)';
        setTimeout(() => {
          resultsPanel.style.display = 'none';
        }, 300);
      }
    } else {
      // На ПК показываем placeholder
      if (resultsPanel) {
        resultsPanel.style.display = '';
        resultsPanel.style.opacity = '1';
        resultsPanel.style.transform = 'translateY(0)';
      }

      const placeholder = document.createElement('div');
      placeholder.className = 'history-placeholder';
      placeholder.innerHTML = `
        <div class="placeholder-content">
          <div class="placeholder-icon">✨</div>
          <div class="placeholder-text">${t.historyPlaceholder || 'Results will appear here after improvement'}</div>
        </div>
      `;
      stream.appendChild(placeholder);
    }
  } else {
    // Показываем панель результатов
    if (resultsPanel) {
      resultsPanel.style.display = '';
      resultsPanel.style.opacity = '1';
      resultsPanel.style.transform = 'translateY(0)';
    }

    sessions.forEach(session => {
      renderImprovementSession(session);
    });

    setupImprovement3DCards();
  }
}

function bindImprovementFeature() {
  const draftTitleField = document.getElementById('draftTitle');
  const draftThumbnailField = document.getElementById('draftThumbnail');
  const clearDraftTitle = document.getElementById('clearDraftTitle');
  const clearDraftThumbnail = document.getElementById('clearDraftThumbnail');
  const generateThumbnailCheck = document.getElementById('checkGenerateThumbnail');
  const generateThumbnailInput = document.getElementById('generateThumbnailForTitle');
  const improveBtn = document.getElementById('improveBtn');

  if (!draftTitleField || !draftThumbnailField || !improveBtn) return;

  // Track mouse movement for field effects
  trackMouseOnField(document.getElementById('draftTitleField'));
  trackMouseOnField(document.getElementById('draftThumbnailField'));

  // Clear button handlers
  clearDraftTitle.addEventListener('click', () => {
    draftTitleField.value = '';
    draftTitleField.focus();
    updateImprovementUI();
    haptic.light();
  });

  clearDraftThumbnail.addEventListener('click', () => {
    draftThumbnailField.value = '';
    draftThumbnailField.focus();
    updateImprovementUI();
    haptic.light();
  });

  // Update UI based on field state
  function updateImprovementUI() {
    const hasTitleDraft = draftTitleField.value.trim().length >= 3;
    const hasThumbnailDraft = draftThumbnailField.value.trim().length >= 3;

    // Show checkbox with animation only when title is entered and thumbnail is empty
    if (hasTitleDraft && !hasThumbnailDraft) {
      generateThumbnailCheck.classList.add('visible');
    } else {
      generateThumbnailCheck.classList.remove('visible');
      generateThumbnailInput.checked = false;
    }

    // Enable button if at least one field has valid input
    improveBtn.disabled = !(hasTitleDraft || hasThumbnailDraft);
  }

  // Listen to input changes
  draftTitleField.addEventListener('input', updateImprovementUI);
  draftThumbnailField.addEventListener('input', updateImprovementUI);

  // Improve button handler
  improveBtn.addEventListener('click', async () => {
    // Check if another operation is in progress
    if(isOperationInProgress) {
      toast('pleaseWait');
      haptic.error();
      return;
    }

    const draftTitle = draftTitleField.value.trim();
    const draftThumbnail = draftThumbnailField.value.trim();
    const generateThumbnail = generateThumbnailInput.checked;

    // Validate
    if (draftTitle.length < 3 && draftThumbnail.length < 3) {
      showToast(t.improvementMinLength || 'Enter at least 3 characters');
      return;
    }

    // Determine mode
    let mode = 'improve_title';
    if (draftTitle && draftThumbnail) {
      mode = 'improve_both';
    } else if (draftThumbnail && !draftTitle) {
      mode = 'improve_thumbnail';
    }

    // Get context from main inputs (optional)
    const topic = document.getElementById('topic')?.value?.trim() || '';
    const format = document.getElementById('format')?.value?.trim() || '';
    const audience = document.getElementById('audience')?.value?.trim() || '';

    // Show loading state
    setImproveBtnBusy(improveBtn, true);
    isOperationInProgress = true;

    haptic.medium();

    const stream = document.getElementById('improvement-stream');
    const skel = skeletonCard();
    stream.prepend(skel);

    try {
      const result = await callImprovementAPI({
        mode,
        draftTitle,
        draftThumbnail,
        generateThumbnail,
        topic,
        format,
        audience
      });

      console.log('Improvement result:', result);

      // Remove skeleton loader
      skel.remove();

      // Clear loading state
      const resultsPanel = document.querySelector('.improvement-results-panel');

      // Remove placeholder if it exists
      const placeholder = stream?.querySelector('.history-placeholder');
      if (placeholder) {
        placeholder.remove();
      }

      // Show results panel
      if (resultsPanel) {
        resultsPanel.style.display = '';
        resultsPanel.style.opacity = '1';
        resultsPanel.style.transform = 'translateY(0)';
      }

      // Create session object
      const session = {
        id: uid(),
        timestamp: Date.now(),
        draftTitle,
        draftThumbnail,
        mode,
        generateThumbnail,
        result
      };

      // Save to history
      console.log('Saving improvement session:', session);
      store.addImprovementSession(session);

      // Render as card in stream
      console.log('Rendering improvement session');
      renderImprovementSession(session);

      // Setup 3D cards and auto-expand the new one
      setupImprovement3DCards();

      // Auto-expand the newest card and push down others
      setTimeout(() => {
        const stream = document.getElementById('improvement-stream');
        const newestCard = stream?.querySelector('.session');
        const allSessions = [...stream.querySelectorAll('.session')];

        if (newestCard) {
          // Collapse all and push down all except newest
          allSessions.forEach(s => {
            s.classList.remove('expanded');
            s.classList.add('collapsed');
            if (s !== newestCard) {
              s.classList.add('pushed-down');
            }
          });

          // Expand the newest card
          newestCard.classList.remove('collapsed', 'pushed-down');
          newestCard.classList.add('expanded');
        }
      }, 100);

      haptic.success();
    } catch (error) {
      console.error('Improvement error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);

      // Remove skeleton loader on error
      skel.remove();

      // Show detailed error in alert for debugging
      alert(`Improvement error: ${error.message}\n\nCheck console for details.`);

      toast('improvementError');
      haptic.error();
    } finally {
      setImproveBtnBusy(improveBtn, false);
      isOperationInProgress = false;
      updateImprovementUI();
    }
  });

  // Initialize
  updateImprovementUI();
}

async function callImprovementAPI(params) {
  const { mode, draftTitle, draftThumbnail, generateThumbnail, topic, format, audience } = params;

  // Build user prompt
  let userPrompt = `MODE: ${mode}\n`;
  if (draftTitle) userPrompt += `DRAFT_TITLE: ${draftTitle}\n`;
  if (draftThumbnail) userPrompt += `DRAFT_THUMBNAIL: ${draftThumbnail}\n`;
  if (topic) userPrompt += `VIDEO_TOPIC: ${topic}\n`;
  if (format) userPrompt += `FORMAT: ${format}\n`;
  if (audience) userPrompt += `AUDIENCE: ${audience}\n`;
  userPrompt += `GENERATE_THUMBNAIL_FOR_TITLE: ${generateThumbnail}\n`;
  userPrompt += `\nPlease analyze and improve according to the instructions. Output ONLY valid JSON.`;

  const fullPrompt = IMPROVEMENT_SYSTEM_PROMPT + '\n\n' + userPrompt;

  // Try Gemini first
  try {
    const geminiResult = await callGemini({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.92,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      }
    });

    // Parse Gemini response
    const first = (geminiResult.candidates || [])[0];
    const text = joinParts(first?.content?.parts);

    console.log('Gemini raw response:', text);

    const parsed = safeParseJSON(text);

    if (!parsed) {
      console.error('Failed to parse Gemini response. Raw text:', text);
      throw new Error('Failed to parse Gemini response');
    }

    console.log('Gemini parsed data:', parsed);
    return parsed;
  } catch (geminiError) {
    console.warn('Gemini failed, trying OpenAI:', geminiError);

    // Fallback to OpenAI
    try {
      const openaiResult = await callOpenAI({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: fullPrompt }],
        temperature: 0.8,
        max_tokens: 2048
      });

      // Parse OpenAI response
      const text = openaiResult.choices?.[0]?.message?.content || '';

      console.log('OpenAI raw response:', text);

      const parsed = safeParseJSON(text);

      if (!parsed) {
        console.error('Failed to parse OpenAI response. Raw text:', text);
        throw new Error('Failed to parse OpenAI response');
      }

      console.log('OpenAI parsed data:', parsed);
      return parsed;
    } catch (openaiError) {
      console.error('Both APIs failed. Gemini error:', geminiError.message, 'OpenAI error:', openaiError.message);
      throw new Error(`All API attempts failed: ${geminiError.message} | ${openaiError.message}`);
    }
  }
}

/* ================= TAB SWITCHING ================= */
function bindTabSwitching() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  console.log('bindTabSwitching: Found', tabBtns.length, 'tab buttons and', tabContents.length, 'tab contents');

  if (tabBtns.length === 0) {
    console.error('No tab buttons found!');
    return;
  }

  tabBtns.forEach(btn => {
    console.log('Binding click to tab button:', btn.getAttribute('data-tab'));
    btn.addEventListener('click', (e) => {
      console.log('Tab button clicked:', btn.getAttribute('data-tab'));
      e.preventDefault();
      e.stopPropagation();

      const targetTab = btn.getAttribute('data-tab');

      // Update buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update content
      tabContents.forEach(content => {
        const contentTab = content.getAttribute('data-tab-content');
        if (contentTab === targetTab) {
          content.classList.add('active');
          console.log('Showing tab content:', contentTab);
        } else {
          content.classList.remove('active');
        }
      });

      // Haptic feedback
      haptic.medium();

      // Save current tab to localStorage
      try {
        localStorage.setItem('tc_active_tab', targetTab);
      } catch (e) {
        console.warn('Failed to save active tab:', e);
      }
    });
  });

  // Restore last active tab
  try {
    const savedTab = localStorage.getItem('tc_active_tab');
    if (savedTab) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        const targetBtn = document.querySelector(`.tab-btn[data-tab="${savedTab}"]`);
        if (targetBtn) {
          console.log('Restoring saved tab:', savedTab);
          targetBtn.click();
        }
      }, 100);
    }
  } catch (e) {
    console.warn('Failed to restore active tab:', e);
  }
}

// Start app
bindUI();
bindImprovementFeature();
bindTabSwitching();
 
