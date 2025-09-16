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
    clickbaitLevel4Title: 'НЕЗЕМНОЙ',
    clickbaitLevel4Desc: 'Aggressive viral framing',
    componentsCount: 'Components & Count',
    titles: 'Titles',
    thumbnailTexts: 'Thumbnail texts',
    countLabel: 'Count (5–15)',
    send: 'Send',
    clearHistory: '🗑 Clear history',
    copyAllTitles: '⧉ Copy all titles',
    copyAllThumbs: '⧉ Copy all thumbnails',
    stateOn: 'ON',
    stateOff: 'OFF',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    topicRequired: 'Topic is required',
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
    languageMarker: 'English'
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
    clickbaitLevel4Title: 'НЕЗЕМНОЙ',
    clickbaitLevel4Desc: 'Enmarcado viral agresivo',
    componentsCount: 'Componentes y cantidad',
    titles: 'Títulos',
    thumbnailTexts: 'Textos de miniatura',
    countLabel: 'Cantidad (5–15)',
    send: 'Enviar',
    clearHistory: '🗑 Borrar historial',
    copyAllTitles: '⧉ Copiar todos los títulos',
    copyAllThumbs: '⧉ Copiar todas las miniaturas',
    stateOn: 'SÍ',
    stateOff: 'NO',
    copied: 'Copiado',
    copyFailed: 'Error al copiar',
    topicRequired: 'El tema es obligatorio',
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
    languageMarker: 'Spanish/Español'
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
    countLabel: 'Количество (5–15)',
    send: 'Отправить',
    clearHistory: '🗑 Очистить историю',
    copyAllTitles: '⧉ Копировать все заголовки',
    copyAllThumbs: '⧉ Копировать все превью',
    stateOn: 'ВКЛ',
    stateOff: 'ВЫКЛ',
    copied: 'Скопировано',
    copyFailed: 'Ошибка копирования',
    topicRequired: 'Тема обязательна',
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
    languageMarker: 'Russian/Русский'
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
    clickbaitLevel4Title: 'НЕЗЕМНОЙ',
    clickbaitLevel4Desc: 'Агресивна вірусна подача',
    componentsCount: 'Компоненти та кількість',
    titles: 'Заголовки',
    thumbnailTexts: 'Тексти прев\'ю',
    countLabel: 'Кількість (5–15)',
    send: 'Відправити',
    clearHistory: '🗑 Очистити історію',
    copyAllTitles: '⧉ Копіювати всі заголовки',
    copyAllThumbs: '⧉ Копіювати всі прев\'ю',
    stateOn: 'УВІМК',
    stateOff: 'ВИМК',
    copied: 'Скопійовано',
    copyFailed: 'Помилка копіювання',
    topicRequired: 'Тема обов\'язкова',
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
    languageMarker: 'Ukrainian/Українська'
  }
};

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

/* ================= CONFIG ================= */
const API_KEY = "AIzaSyCgv5MX641xl7q62YJ1isoyxkptWBuXgIc";
const MODEL   = "gemini-2.5-pro";
const RETRIES = 5;
const BASE_DELAY = 800;

/* ================= SYSTEM PROMPT ================= */
const SYSTEM_PROMPT = `ROLE & MISSION
You are an expert in viral YouTube titles & thumbnail texts 🔥 with a finely tuned sense for click psychology (hundreds of A/B tests). Your mission: from the user's topic/context, craft options that match the selected clickbait level and hold attention — maximizing CTR without brand damage.

LANGUAGE & LOCALIZATION — LANGUAGE PRIORITY RULE
- Detect the language of VIDEO TOPIC (title/topic field) ONLY, and use exactly that language for ALL output (titles, thumbnail texts, audienceProfile).
- If VIDEO TOPIC is bilingual/mixed, choose the first language that appears and stick to it. Do NOT fall back to the system prompt's language. Do NOT mix languages in one response.
- Default regionalization: Ukraine (UA) unless specified otherwise — even if the request is in Russian. Use local currency/units/slang (₴, Kyiv cues), and decimal style by language (RU/UA → 0,1%; EN/ES → 0.1%).
- Emojis allowed in titles only (never in thumbnails), used moderately per batch quotas below.

CLICKBAIT LEVELS (user selects)
• L1 — Subtle: Intriguing, honest, low-arousal. Clean curiosity; professional tone. Minimize CAPS/punctuation. Good for education/cooking/B2B/explainers/sober reviews. Thumbnail text: 3–4 words.
• L2 — Balanced: Engaging but controlled. Moderate emotion, concrete benefits, light power words. Thumbnail text: 2–4 words.
• L3 — Maximum: High viral tension with sophistication. Prefer precise numbers, explicit stakes, time/constraint pressure, strong action verbs. Thumbnail text: 1–3 words.
• L4 — НЕЗЕМНОЙ: Optimize for CTR with aggressive framing, sharper contrasts, sensational tropes and mild exaggeration permitted. Still policy-safe: no fabricated core facts, no defamation/hate/harassment, no harmful medical/financial promises. Thumbnail text: 1–5 words. Emojis in titles only.

CAPS & EMOJI POLICY (titles only; thumbnails never use emojis)
- L1: CAPS optional (brands/acronyms). Emojis rarely (0–1 per batch).
- L2: Default 1 CAPS token per title; emojis in 1 title per batch (if N≥4; else 0–1).
- L3: Default 1–2 CAPS tokens per title; emojis in 1–2 titles per batch.
- L4: Default 2–3 CAPS tokens per title where natural; emojis in 2–3 titles per batch.
Batch rule: across the set, add emojis to titles in only 1–3 items total. Thumbnails: NO emojis, ever.

CONTEXTUAL TONE POLICY (niche-flex)
- Entertainment/Gaming/Comedy/Vlogs: colloquial slang/playful wording ALLOWED if it fits audience and brand.
- Tech/Finance/Education/Science/Health/News/Professional: premium, clear, evidence-forward; avoid childish slang/empty hyperbole.
- Promise should feel delivered within the first 30–60 seconds (even on L4; exaggeration may frame but must not invent outcomes).

NICHE AUTO-CALIBRATION (INTERNAL — NEVER OUTPUT)
- Auto-detect niche, brandVoice, riskTolerance, energyLevel, metricUse, slang permissibility, and framing from Topic/Format/Audience/Clickbait Level and the user's wording. Adjust tone/diction accordingly.
- If brief implies very short/vertical content, compress phrasing, front-load verbs, reduce function words.
- If inferred riskTolerance ≥2 and niche ∈ {Gaming, Entertainment}, allow edgier hooks (still policy-safe).

PSYCHOLOGY-FIRST GENERATIVE PRIORS (soft biases guiding every option)
- Curiosity Gap + closure promise (ask a specific question → imply a fast, satisfying answer).
- Negativity & Loss Aversion: foreground danger, error cost, ban/penalty risk, missed opportunity (FOMO).
- Salvation/Positive Payoff: a credible path to relief/upgrade ("watch/apply and things get better"), without unverifiable miracle claims.
- Processing Fluency: numerals/symbols/short units (0,1% / 0.1%, −10M, ×3, 24 год); compact, concrete nouns.
- Status/Competence: mastery/insider angle/hard test or proof (no sponsor bias).
- Narrative Energy & Agency: when equally clear, prefer stronger action verbs and explicit agents/counts.

EXPECTATION INVERSION (CONTRARIAN FLIP — internal pattern)
- Use "not-what-it-seems / you're doing it wrong / the right way is different" angles where suitable. 
- Title may gently misdirect (policy-safe); thumbnail supplies the clarifying constraint (stakes/metric/verdict). If thumbnails-only are requested, each line must stand alone.

VALENCE & ANGLE DIVERSITY (REQUIRED ACROSS THE BATCH)
- Include at least one strongly negative/risk framing, at least one positive/salvation framing, and at least one balanced/neutral analysis framing.
- Also include a contrarian/inversion item where suitable to the topic.
- Keep semantic overlap low across options.

TITLE RULES (defaults; model should naturally comply)
- ≤100 chars; strongest hook within ~40 chars. One core idea per title.
- Specificity & novelty: prefer exact numbers and crisp nouns when informative.
- Prefer decisive action verbs over neutral motion verbs; prefer explicit agents and counts over vague subjects.
- Light emojis/special characters allowed per CAPS & EMOJI POLICY.
- Title ↔ Thumbnail synergy by default: title frames/poses; thumbnail adds a sharp complementary hint (stakes/number/constraint/verdict). If thumbnails-only are requested, each line must stand alone.

THUMBNAIL TEXT RULES (words on the image only)
- Ultra-short, scannable tokens (prefer 1–3 words; L1 up to 4; L4 up to 1–5). ≤50 chars. No colons ":".
- Do NOT repeat or paraphrase the title (>70% overlap). Add the missing piece: stakes, metric, constraint, verdict, or a micro-question.
- Favor high-processing tokens: numerals, symbols, short units (0,1% / 0.1%, −10M, ×3, 24 год).
- Loss/polar cues allowed when appropriate. NO emojis in thumbnails.

LEVEL-3/4 NATURAL BIAS (strong steer; not a hard mandate)
- Early specifics: within the first ~40 chars, surface ≥2 of {exact number, strong action verb, explicit stake/risk, time/constraint}.
- Selective CAPS on key verb/noun tokens (Cyrillic CAPS allowed).
- Concrete agency: explicit actor + decisive verb preferred over neutral motion, when accurate.
- L4: sensational tropes allowed; mild exaggeration OK; anchor in plausible framing.

QUALITY GUARDS — NO VAGUE FILLERS (INTERNAL SANITATION)
- Reject abstract empty tokens and generic hype (e.g., undefined "wow/shock/amazing" claims) unless paired with a concrete, verifiable stake, metric, or outcome.
- Always replace abstractions with measurable or clearly described effects (numbers, named entities, time bounds, explicit stakes).

MORPHOLOGY & GRAMMAR QA (INTERNAL)
- Enforce correct morphology, syntax, and idiom for the detected language (case, number, gender, aspect/imperative forms).
- Validate that imperative/negative forms are grammatically correct and semantically intended.
- If any item fails linguistic QA, rewrite once; keep the corrected version only.

STYLE DIALS (INTERNAL — AUTO-DETECT; user wording may implicitly override)
- brandVoice ∈ {premium | playful | bold | neutral}
- riskTolerance ∈ {0..3}
- energyLevel ∈ {Low | Medium | High}
- metricUse ∈ {None | Moderate | High}
- slangUse ∈ {Auto | GamingOnly | Forbidden}
- framing ∈ {Question | Verdict | Story | VS/OR | How-to | List}

METHODOLOGY (INTERNAL ONLY — NEVER OUTPUT)
• Selection logic: silently choose 1–2 emotional levers (curiosity, stakes, FOMO, status) + one specificity angle (numbers, constraint, locale).
• Chain of Verification (each candidate):
  1) strong emotion/curiosity?  2) instant clarity at scroll speed?  3) truthful enough for policy-safe framing (even on L4)?
  4) hook in ≤40 chars?  5) title–thumb synergy (non-repetitive)?  6) low semantic overlap across options?
  7) language QA passed (morphology/idiom)?  8) no empty hype; concrete stakes/metrics present?
• Target Quality Parameters: Clickability 15/10; Info-structure & clarity 10/10; Unconventionality & creativity 11/10.

SELF-CRITIC RERANK (INTERNAL — DO NOT OUTPUT RATIONALE)
- Over-generate drafts: L1≈1.5N, L2≈2N, L3≈2.5N, L4≈3–4N with internal temperature sweep {0.7, 0.9, 1.1}.
- Score each: Clickability(15/10), Clarity(10/10), Creativity(11/10).
- Downrank: weak first-40 hook, generic verbs, absent specifics, title↔thumb overlap >70% (prefer ≤60%), near-duplicates, CAPS/emoji quota misuse, language errors, vague fillers.
- Angle & Valence Quotas: ensure ≥1 risk/loss, ≥1 missed opportunity/FOMO, ≥1 salvation/blueprint, and ≥1 contrarian flip across the batch.
- Surface top-N diversified by angle; then emit final JSON only.

BATCH STYLE BALANCER (INTERNAL)
- Enforce per-level emoji/CAPS quotas across the set (titles only). Maintain contrast: even on L4, include a few calmer items.

INPUT HANDLING & MINI-PLAN
Expected fields (infer if absent):
VIDEO TOPIC: {{topic}}
FORMAT: {{format}}
TARGET AUDIENCE: {{audience}}
CLICKBAIT LEVEL: {{1|2|3|4}}
NUMBER OF VARIANTS: {{N}}
If N is absent: set N=6 (do not ask follow-ups).
Mini-plan: detect niche/tone → pick 1–2 emotional levers + 1 specificity → generate ~2N drafts → QA → rerank → select N. Criteria: early hook, specificity, mobile readability, title↔thumb synergy, low overlap, quotas met, language QA passed. Output strictly JSON (see contract).

==== HARD CONSTRAINTS & OUTPUT CONTRACT (MUST OBEY) ====
1) STRICT JSON ONLY — NO MARKDOWN, NO LISTS, NO COMMENTARY, NO CHAIN-OF-THOUGHT.
   Return exactly ONE JSON object:
   {
     "audienceProfile": "STRING (3–6 concise, benefit-focused sentences)",
     "options": [{"title":"STRING","thumbnailText":"STRING"}],
     "topPicks": [{"index":INTEGER},{"index":INTEGER}]
   }
2) COUNT — Return exactly N options (N provided externally; if missing, N=6). Do not exceed or fall short.
3) TITLES — ≤100 chars; strongest hook in ~first 40 chars; specific power words; policy-safe truth framing (L4 may be sensational but not fabricated).
4) THUMBNAIL TEXTS — 1–5 words, ≤50 chars, NO colons ":"; 1–2 ALL-CAPS words allowed; do NOT repeat/paraphrase the title; provide a complementary hint. If user requests titles-only or thumbnails-only, keep both keys; set the unused one to "".
5) FIELDS — Only "audienceProfile", "options", "topPicks". No extra keys.
6) TOP PICKS — Exactly two unique 1-based indexes into the options array (numbers only; no rationales).
7) RELIABILITY GUARD — Start output with "{" and end with "}". Escape quotes; no smart quotes; no dangling commas; normalize spaces; no line breaks inside values.

RESOLUTION RULES
- On conflict: schema & hard constraints > tone/niche policy > other details.
- Tease without deception; mobile scan-ability first.
- Respect Language Priority Rule, Contextual Tone Policy, Niche Auto-Calibration, Psychology-First Priors (including Loss/FOMO/Salvation and Contrarian Flip), and the selected Clickbait Level.`;

/* ================= USER PROMPT BUILDER ================= */
function buildUserBlock({topic, format, audience, wantTitles, wantThumbs, count, clickbaitLevel}){
  const comp =
    wantTitles && wantThumbs ? "Titles & Thumbnail texts" :
    wantTitles ? "Titles only" :
    wantThumbs ? "Thumbnail texts only" : "Titles & Thumbnail texts";
  
  const clickbaitLevelNames = {
    1: "Subtle (Level 1)",
    2: "Balanced (Level 2)", 
    3: "Maximum (Level 3)",
    4: "НЕЗЕМНОЙ (Level 4)"
  };
  
  const lines = [
    `VIDEO TOPIC: ${escapeForPrompt(topic)}`,
    `FORMAT: ${escapeForPrompt(format || "(not specified)")}`,
    `TARGET AUDIENCE: ${escapeForPrompt(audience || "(not specified)")}`,
    `CLICKBAIT LEVEL: ${clickbaitLevelNames[clickbaitLevel] || "Maximum (Level 3)"}`,
    `LANGUAGE: auto-detect from topic (current interface language: ${t.languageMarker})`,
    `REQUESTED COMPONENTS: ${comp}`,
    `NUMBER OF VARIANTS: ${count}`,
    `OUTPUT REQUIREMENTS:
• Return exactly ${count} options with the requested components
• Include Audience Profile (3-6 sentences about the target viewers)
• Include Top Picks (2 best options by index)
• IMPORTANT: Respond in the same language as the topic text
• Follow the specified clickbait level guidelines from system instructions
• For Level 1: Use 3-4 words in thumbnail texts, compelling and intriguing but honest style
• For Level 2: Use 2-4 words in thumbnail texts, moderate engagement  
• For Level 3: Use maximum viral impact (1-3 words), embrace strong viral language, focus on high CTR potential
• For Level 4: Use 1-5 words in thumbnail texts (NOT forced to 1-2), aggressive framing with eye-catching CAPS, NO emojis in thumbnails
`
  ];
  return lines.join("\n");
}

function responseSchema(){
  return {
    type: "OBJECT",
    properties: {
      audienceProfile: { type: "STRING" },
      options: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            thumbnailText: { type: "STRING" }
          },
          required: ["title", "thumbnailText"]
        }
      },
      topPicks: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            index: { type: "INTEGER" }
          },
          required: ["index"]
        }
      }
    },
    required: ["audienceProfile","options","topPicks"]
  };
}

const GENCFG_HQ = {
  temperature: 0.85,
  topP: 0.92,
  maxOutputTokens: 65535,
  responseMimeType: "application/json",
  responseSchema: responseSchema(),
  thinkingConfig: { includeThoughts: false, thinkingBudget: 32768 }
};

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
  const { wantTitles, wantThumbs, count } = opts;
  const options = (o.options||[]).slice(0, count).map(x=> ({
    title: wantTitles ? (x.title||"").trim().slice(0,100) : "",
    thumbnailText: wantThumbs ? (x.thumbnailText||"").replace(/:/g,"").trim().slice(0,50) : ""
  }));
  while(options.length < count) options.push({ title: wantTitles ? "" : "", thumbnailText: wantThumbs ? "" : "" });

  const tp = Array.isArray(o.topPicks) ? o.topPicks
              .filter(v => Number.isInteger(v.index))
              .map(v => ({ index: clamp(parseInt(v.index,10)||1, 1, options.length) }))
              .slice(0, 2) : [];

  return { audienceProfile: (o.audienceProfile||"").trim(), options, topPicks: tp };
}

/* ================= NETWORK ================= */
async function callGemini(payload, tries=RETRIES){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  let lastErr;
  for(let i=0;i<tries;i++){
    try{
      const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
      if(!res.ok){ const txt = await res.text().catch(()=> ""); throw new Error(`HTTP ${res.status}: ${txt||res.statusText}`) }
      return await res.json();
    }catch(err){
      lastErr = err;
      const delay = BASE_DELAY * Math.pow(2, i) + Math.random()*300;
      await new Promise(r => setTimeout(r, delay));
    }
  }
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
  
  const style = styles.length > 0 ? styles[Math.floor(Math.random() * styles.length)] : 'Curiosity Gap';
  
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
  
  if (triggers.length === 0) {
    triggers.push('Curiosity');
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
  
  // Generate analysis on client side
  const analysis = analyzeTitle(titleVal, thumbVal);
  const styleVal = analysis.style;
  const triggersVal = analysis.triggers;
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

function sessionHTML(session){
  const { output, view, input } = session;
  const showTitle = view.wantTitles, showThumb = view.wantThumbs;
  const topSet = new Set((output.topPicks||[]).map(x=> x.index));
  const list = (output.options||[]).map((o,i)=> rowHTML(i,o,topSet,showTitle,showThumb)).filter(Boolean).join('');
  const cardTitle = getFirstSentence(input.topic);
  
  return `
  <article class="session collapsed" role="region" aria-label="Result session" data-id="${session.id}">
    <div class="session-head">
      <span class="session-title">${cardTitle}</span>
      <div class="session-actions">
        <button class="iconbtn close" title="${t.removeResult}" aria-label="${t.removeResult}">
          <svg viewBox="0 0 24 24"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.18 12 2.89 5.71 4.3 4.29 10.59 10.6l6.3-6.31z"/></svg>
        </button>
      </div>
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
      <button class="iconbtn sk-close" title="${t.dismiss}" aria-label="${t.dismiss}">
        <svg viewBox="0 0 24 24"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.18 12 2.89 5.71 4.3 4.29 10.59 10.6l6.3-6.31z"/></svg>
      </button>
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
function clampCountInput(){
  const el = $("#count");
  let val = parseInt(el.value||"10",10);
  if(isNaN(val)) val = 10;
  if(val < 1) val = 1;
  if(val > 15) val = 15;
  el.value = String(val);
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
  clampCountInput();
  let count = clamp(parseInt($("#count").value||"10",10)||10, 1, 15);
  
  // Get selected clickbait level
  const clickbaitLevel = getCurrentClickbaitLevel();

  if(!wantTitles && !wantThumbs){ wantTitles = true; }
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

  const userPrompt = buildUserBlock({topic, format, audience, wantTitles, wantThumbs, count, clickbaitLevel});
  
  // Use Gemini API
  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: GENCFG_HQ
  };
  const json = await callGemini(payload);

  try{
    const first = (json.candidates||[])[0];
    const text = joinParts(first?.content?.parts);
    // Try to parse JSON directly
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      parsed = safeParseJSON(text);
    }
    
    if(!parsed || !Array.isArray(parsed.options)) {
      throw new Error('Invalid model response - not a valid JSON array');
    }

    const normalized = normalizeOutput(parsed, { wantTitles, wantThumbs, count });
    const session = { 
      id: uid(), 
      createdAt: nowStr(), 
      input:{topic,format,audience}, 
      view:{ wantTitles, wantThumbs, count }, 
      output: normalized 
    };
    store.addSession(session);

    const cardWrap = document.createElement('div'); 
    cardWrap.innerHTML = sessionHTML(session);
    const newSession = cardWrap.firstElementChild;
    stream.replaceChild(newSession, skel);
    
    // Re-initialize everything for the new content
    attachCopyHandlers(stream);
    attachSessionControls(stream);
    setup3DCards();
    
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
  }catch(err){
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
  }finally{
    setBtnBusy(btn,false);
  }
}

/* ================= INIT ================= */
function renderAll(){
  const container = $("#stream"); 
  container.innerHTML = "";
  store.loadSessions().forEach(s => {
    const wrap = document.createElement("div"); 
    wrap.innerHTML = sessionHTML(s);
    container.appendChild(wrap.firstElementChild);
  });
  attachCopyHandlers(container);
  attachSessionControls(container);
  setup3DCards();
}

function bindUI(){
  // Apply translations first
  applyTranslations();
  
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
  if(inputs.count) $("#count").value = clamp(parseInt(inputs.count,10)||10, 1, 15);
  
  // Load clickbait level
  if(inputs.clickbaitLevel) {
    updateClickbaitSlider(inputs.clickbaitLevel);
  }


  // Count input handlers
  const countEl = $("#count");
  countEl.addEventListener('input', clampCountInput);
  countEl.addEventListener('blur', clampCountInput);
  countEl.addEventListener('keydown', (e)=> {
    if(e.key==='-' || e.key==='e' || e.key==='E' || e.key==='+') e.preventDefault();
  });

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

  // Checkbox ripple effects
  ["#checkTitles", "#checkThumbs"].forEach(id => {
    const check = $(id);
    check.addEventListener("click", () => {
      check.classList.add('ripple');
      haptic.light();
      setTimeout(() => check.classList.remove('ripple'), 600);
    });
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
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const rect = track.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (touchX / rect.width) * 100));
    
    let level;
    if (percentage < 25) level = 1;
    else if (percentage < 75) level = 2;
    else level = 3;
    
    updateClickbaitSlider(level);
  });

  document.addEventListener('touchend', () => {
    isDragging = false;
  });
  
  // Initialize with level 3 (maximum)
  updateClickbaitSlider(3);
}



// Start app
bindUI();
