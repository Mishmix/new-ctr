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

/* ================= HAPTIC ENGINE ================= */
class HapticEngine {
  constructor() {
    this.canVibrate = 'vibrate' in navigator;
    this.enabled = true;
  }
  
  light() {
    if(this.canVibrate && this.enabled) {
      try { navigator.vibrate(10); } catch(e) {}
    }
  }
  
  medium() {
    if(this.canVibrate && this.enabled) {
      try { navigator.vibrate(20); } catch(e) {}
    }
  }
  
  success() {
    if(this.canVibrate && this.enabled) {
      try { navigator.vibrate([30, 50, 30]); } catch(e) {}
    }
  }
  
  error() {
    if(this.canVibrate && this.enabled) {
      try { navigator.vibrate([100, 30, 100, 30, 100]); } catch(e) {}
    }
  }
  
  notification() {
    if(this.canVibrate && this.enabled) {
      try { navigator.vibrate([20, 100, 20]); } catch(e) {}
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

/* ================= PULL TO REFRESH ================= */
class PullToRefresh {
  constructor() {
    this.startY = 0;
    this.pullDistance = 0;
    this.threshold = 100;
    this.indicator = document.getElementById('pullToRefresh');
    this.init();
  }
  
  init() {
    let isRefreshing = false;
    
    document.addEventListener('touchstart', (e) => {
      if(window.scrollY === 0 && !isRefreshing) {
        this.startY = e.touches[0].clientY;
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if(this.startY && !isRefreshing) {
        this.pullDistance = e.touches[0].clientY - this.startY;
        
        if(this.pullDistance > 0 && this.pullDistance < 200) {
          const progress = Math.min(this.pullDistance / this.threshold, 1);
          document.body.style.transform = `translateY(${this.pullDistance * 0.5}px)`;
          
          if(this.pullDistance > 30) {
            this.indicator.classList.add('visible');
            this.indicator.style.transform = `translateX(-50%) scale(${progress})`;
          }
          
          if(this.pullDistance > this.threshold * 0.5 && this.pullDistance < this.threshold * 0.6) {
            haptic.light();
          }
          if(this.pullDistance > this.threshold && this.pullDistance < this.threshold * 1.1) {
            haptic.medium();
          }
        }
      }
    });
    
    document.addEventListener('touchend', () => {
      if(this.pullDistance > this.threshold && !isRefreshing) {
        isRefreshing = true;
        haptic.success();
        this.indicator.classList.add('refreshing');
        
        setTimeout(() => {
          location.reload();
        }, 1000);
      } else {
        document.body.style.transform = '';
        this.indicator.classList.remove('visible');
        this.indicator.style.transform = '';
      }
      
      this.pullDistance = 0;
      this.startY = 0;
    });
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
    confirmClear: 'Clear all saved generations? This cannot be undone.',
    requestFailed: 'Request failed.',
    audienceProfile: 'Audience Profile',
    titleLabel: 'Title',
    thumbnailLabel: 'Thumbnail',
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
    ]
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
    confirmClear: '¿Borrar todas las generaciones guardadas? Esto no se puede deshacer.',
    requestFailed: 'Solicitud fallida.',
    audienceProfile: 'Perfil de audiencia',
    titleLabel: 'Título',
    thumbnailLabel: 'Miniatura',
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
    ]
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
    confirmClear: 'Очистить все сохранённые генерации? Это действие нельзя отменить.',
    requestFailed: 'Запрос не удался.',
    audienceProfile: 'Профиль аудитории',
    titleLabel: 'Заголовок',
    thumbnailLabel: 'Превью',
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
    ]
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
    confirmClear: 'Очистити всі збережені генерації? Цю дію не можна скасувати.',
    requestFailed: 'Запит не вдався.',
    audienceProfile: 'Профіль аудиторії',
    titleLabel: 'Заголовок',
    thumbnailLabel: 'Прев\'ю',
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
    ]
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
const GEMINI_API_KEY = "DLcdVbFjy5PA641ao7t62BM1lvrbanswZExAjLf";
const OPENAI_API_KEY = "vn-surm-I1-EsdWxwVOCwhdtB-OP8c3hZwh8Zljwg_9l4A1Q1VcU8qGkn7mg9DvoeXhUHajBFZ76PGjCn3W3EoenIMyY4RZ0gEd7y_i4NboJjliZWetdJt4yOOOCQ1NtINS3XN6wxYEXJ2Sz4REn-AbYQOPz8giPpWBD";
const GEMINI_MODEL = "gemini-2.5-pro";
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
    temperature: 0.85,
    topP: 0.92,
    maxOutputTokens: 65535,
    responseMimeType: "application/json",
    responseSchema: responseSchema(N),
    thinkingConfig: { includeThoughts: false, thinkingBudget: 32768 }
  };
}

/* ================= STORAGE ================= */
const store = {
  saveInputs(v){ localStorage.setItem("tc_inputs_v7", JSON.stringify(v)); },
  loadInputs(){ try{ return JSON.parse(localStorage.getItem("tc_inputs_v7"))||{} }catch{ return {} } },
  addSession(s){ const all = store.loadSessions(); all.unshift(s); localStorage.setItem("tc_sessions_v7", JSON.stringify(all)); },
  loadSessions(){ try{ return JSON.parse(localStorage.getItem("tc_sessions_v7"))||[] }catch{ return [] } },
  clearSessions(){ localStorage.setItem("tc_sessions_v7", JSON.stringify([])); },
  deleteSession(id){ const all = store.loadSessions().filter(x => x.id !== id); localStorage.setItem("tc_sessions_v7", JSON.stringify(all)); }
};

/* ================= UTILS ================= */
const $ = s => document.querySelector(s);
const clamp = (n,min,max)=> Math.max(min, Math.min(max, n));
const clampStr = (s,n)=> (s||"").trim().slice(0,n);
const MAX_CHARS_TOPIC=800, MAX_CHARS_FORMAT=300, MAX_CHARS_AUDIENCE=300;
const toast = (msg)=>{ 
  const actualMsg = t[msg] || msg || t.copied; 
  const el=$("#toast"); 
  el.textContent=actualMsg; 
  el.classList.add("show"); 
  haptic.notification();
  setTimeout(()=> el.classList.remove("show"), 1600);
};
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
    console.log('🔍 Option data:', x);
    const style = (x.style||"").trim() || "Unknown";
    const triggers = (x.triggers||"").trim() || "Unknown";
    console.log('🔍 Style:', style, 'Triggers:', triggers);
    
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(decryptApiKey(GEMINI_API_KEY))}`;
  
  let lastErr;
  for(let i=0;i<tries;i++){
    try{
      const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
      if(!res.ok){ const txt = await res.text().catch(()=> ""); throw new Error(`HTTP ${res.status}: ${txt||res.statusText}`) }
      
      const result = await res.json();
      console.log(`✅ Gemini API Response: Model "${GEMINI_MODEL}" completed successfully`);
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
        <div class="analysis-label">Стиль:</div>
        <div class="analysis-value style">${styleVal}</div>
      </div>
      <div class="analysis-item">
        <div class="analysis-label">Триггеры:</div>
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
        if(id) store.deleteSession(id); 
        setup3DCards();
        
        // Проверяем, остались ли сессии, и обрабатываем соответственно
        const remainingSessions = store.loadSessions();
        const resultsPanel = document.querySelector('.panel.results');
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
            const container = document.querySelector('#stream');
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
  if (navigator.vibrate) navigator.vibrate(30);
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

async function generateDualModels(topic, format, audience, wantTitles, wantThumbs, count, clickbaitLevel) {
  // Создаем промпт для генерации контента только через Gemini
  const geminiPrompt = buildUserBlockWithAudience({topic, format, audience, wantTitles, wantThumbs, count, clickbaitLevel});
  
  // Формируем полный промпт для отправки
  const fullPrompt = SYSTEM_PROMPT + '\n\n' + geminiPrompt;
  
  // Логируем полный промпт в консоль
  console.log('🚀 ПОЛНЫЙ ПРОМПТ ДЛЯ GEMINI:');
  console.log('='.repeat(80));
  console.log(fullPrompt);
  console.log('='.repeat(80));
  
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
    console.log('🔍 Raw Gemini response:', text);
    let parsed = safeParseJSON(text);
    console.log('🔍 Parsed JSON:', parsed);
    
    if (parsed && Array.isArray(parsed.options)) {
      const normalized = normalizeOutput(parsed, { wantTitles, wantThumbs, count, source: 'Gemini' });
      console.log('🔍 Normalized data:', normalized);
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
  blinkFields();
  haptic.medium();

  const stream = $("#stream"); 
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
  
  // Initialize pull to refresh
  new PullToRefresh();
  
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
  $("#clear-history").addEventListener("click", ()=>{
    if(confirm(t.confirmClear)){
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

// Start app
bindUI();
