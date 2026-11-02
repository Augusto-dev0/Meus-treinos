/* ═══════════════════════════════════════════════════════════════════════════
   MEUS TREINOS — script.js  (v4)
   Features: ícones Phosphor, timer hh:mm:ss, edição de histórico,
             100% responsivo, PWA offline
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── PWA: Service Worker ─────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const DAYS_SHORT   = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const DAYS_FULL    = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
let   WEEKDAY      = (new Date().getDay() + 6) % 7; /* let: atualiza se o app passar da meia-noite aberto */
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CATALOG_CATEGORIES = ['Academia','Casa','Calistenia','Esportes','Funcional','Mobilidade'];
const EQUIPMENT_OPTIONS = ['Todos','Nenhum','Barra','Halteres','Máquina','Cabo','Elástico','Kettlebell','Banco','Bola','Cardio','Faixa/TRX','Anilha','Caixa','Medicine ball'];

/* Normaliza texto para comparar/buscar sem depender de acento ou caixa. */
function norm(txt) {
  return String(txt == null ? '' : txt).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}

/* Grupos musculares: nome correto (com acento), cor e ícone.
   glyph = desenho de corpo (SVG) com o músculo destacado;
   ph    = ícone Phosphor para grupos que não são um músculo específico. */
const GROUP_META = {
  'Peito':      { glyph:'chest',   color:'#f97373' },
  'Costas':     { glyph:'back',    color:'#60a5fa' },
  'Pernas':     { glyph:'legs',    color:'#c8f060' },
  'Ombros':     { glyph:'shoulders', color:'#facc15' },
  'Bíceps':     { glyph:'biceps',  color:'#f472b6' },
  'Tríceps':    { glyph:'triceps', color:'#c084fc' },
  'Abdômen':    { glyph:'abs',     color:'#fb923c' },
  'Glúteos':    { glyph:'glutes',  color:'#a78bfa' },
  'Cardio':     { ph:'ph-heartbeat',            color:'#ef4444' },
  'Mobilidade': { ph:'ph-person-simple-tai-chi', color:'#3ecfb0' },
  'Corpo':      { ph:'ph-person-simple-run',    color:'#38bdf8' },
};
const GROUP_KEYS = Object.keys(GROUP_META);

/* Devolve o nome correto do grupo ("Biceps" → "Bíceps"), ou o texto
   original se for um grupo personalizado criado pelo usuário. */
function canonMuscle(m) {
  const n = norm(m);
  return GROUP_KEYS.find(k => norm(k) === n) || (m == null ? '' : String(m));
}
function groupMeta(m) { return GROUP_META[canonMuscle(m)] || GROUP_META.Corpo; }

/* Equipamentos: nome correto com acento. */
function canonEquip(e) {
  const n = norm(e);
  const hit = EQUIPMENT_OPTIONS.find(k => norm(k) === n);
  return hit || (e == null ? '' : String(e));
}

/* Corrige acentuação/ortografia de nomes em português (idempotente). */
const PT_FIX = {
  'flexao':'flexão','flexoes':'flexões','bracos':'braços','avanco':'avanço','abducao':'abdução',
  'rotacao':'rotação','pelvica':'pélvica','bulgaro':'búlgaro','frances':'francês',
  'triceps':'tríceps','biceps':'bíceps','gluteo':'glúteo','gluteos':'glúteos','abdomen':'abdômen',
  'maquina':'máquina','elastico':'elástico','isometrico':'isométrico','isometrica':'isométrica',
  'cabeca':'cabeça','abracando':'abraçando','suica':'suíça','ergometrica':'ergométrica',
  'eliptico':'elíptico','toracica':'torácica','respiracao':'respiração','aceleracao':'aceleração',
  'desaceleracao':'desaceleração','mudanca':'mudança','direcao':'direção','extensao':'extensão',
  'diafragmatica':'diafragmática','rapido':'rápido','chao':'chão','em pe':'em pé',
  'elevacao':'elevação','pliometrica':'pliométrica','tecnico':'técnico',
};
/* Ajustes de redação (só exibição; o id do catálogo não muda). */
const PT_NAME_OVERRIDE = {
  'Puxada frente':'Puxada frontal',
  'Triceps banco':'Tríceps no banco',
  'Mergulho banco':'Mergulho no banco',
  'Prancha toque ombro':'Prancha com toque no ombro',
};
const _ptKeys = Object.keys(PT_FIX).sort((a,b)=>b.length-a.length).map(k=>k.replace(/ /g,'\\s+'));
const _ptRe = new RegExp('(^|[^A-Za-zÀ-ÿ])(' + _ptKeys.join('|') + ')(?![A-Za-zÀ-ÿ])','gi');
function fixPt(txt) {
  if (!txt) return txt;
  let out = String(txt);
  Object.keys(PT_NAME_OVERRIDE).forEach(k => {
    if (out.toLowerCase().startsWith(k.toLowerCase())) out = PT_NAME_OVERRIDE[k] + out.slice(k.length);
  });
  return out.replace(_ptRe, (m, pre, word) => {
    const fixed = PT_FIX[word.toLowerCase().replace(/\s+/g,' ')];
    if (!fixed) return m;
    const cap = word[0] !== word[0].toLowerCase();
    return pre + (cap ? fixed[0].toUpperCase() + fixed.slice(1) : fixed);
  });
}

/* ── Ícones de grupo muscular ─────────────────────────────────────────────
   Boneco simples (vista frontal/costas) com o músculo do grupo em
   destaque. Usa a cor do exercício; escala com font-size (1em). */
const BODY_BASE = `
  <circle cx="12" cy="3.6" r="2.6"/>
  <path d="M6.6 7.4h10.8l-1 10.2H7.6z"/>
  <rect x="2.6" y="7.6" width="3.2" height="6.8" rx="1.6"/><rect x="18.2" y="7.6" width="3.2" height="6.8" rx="1.6"/>
  <rect x="2.2" y="14.8" width="2.8" height="6" rx="1.4"/><rect x="19" y="14.8" width="2.8" height="6" rx="1.4"/>
  <path d="M7.4 17.8h9.2l.5 3.2H6.9z"/>
  <rect x="7" y="21.2" width="4.4" height="5.8" rx="2.1"/><rect x="12.6" y="21.2" width="4.4" height="5.8" rx="2.1"/>
  <rect x="7.4" y="27.4" width="3.6" height="4.2" rx="1.7"/><rect x="13" y="27.4" width="3.6" height="4.2" rx="1.7"/>`;
const BODY_HI = {
  chest:     `<path d="M7.2 8.4h4.4v4.2c0 1-.7 1.7-1.7 1.7H8.8c-.9 0-1.6-.8-1.6-1.7z"/><path d="M12.4 8.4h4.4v4.2c0 .9-.7 1.7-1.6 1.7h-1.1c-1 0-1.7-.7-1.7-1.7z"/>`,
  back:      `<path d="M7 8h10l-1.3 8h-7.4z"/>`,
  shoulders: `<circle cx="5.2" cy="8.6" r="2.5"/><circle cx="18.8" cy="8.6" r="2.5"/>`,
  biceps:    `<rect x="2.6" y="7.6" width="3.2" height="6.8" rx="1.6"/><rect x="18.2" y="7.6" width="3.2" height="6.8" rx="1.6"/>`,
  triceps:   `<rect x="2.6" y="7.6" width="3.2" height="6.8" rx="1.6"/><rect x="18.2" y="7.6" width="3.2" height="6.8" rx="1.6"/>`,
  abs:       `<rect x="9" y="10.4" width="6" height="7" rx="1.3"/>`,
  glutes:    `<ellipse cx="9.6" cy="19.6" rx="2.9" ry="2.5"/><ellipse cx="14.4" cy="19.6" rx="2.9" ry="2.5"/>`,
  legs:      `<rect x="7" y="21.2" width="4.4" height="5.8" rx="2.1"/><rect x="12.6" y="21.2" width="4.4" height="5.8" rx="2.1"/><rect x="7.4" y="27.4" width="3.6" height="4.2" rx="1.7"/><rect x="13" y="27.4" width="3.6" height="4.2" rx="1.7"/>`,
};
/* Vista de costas (traço da coluna) para costas, tríceps e glúteos */
const BODY_BACKVIEW = new Set(['back','triceps','glutes']);
const BODY_LINES = { abs: `<path d="M9 12.8h6M9 15.1h6M12 10.4v7" style="stroke:var(--bg)" stroke-width=".7" fill="none"/>` };

function muscleIcon(muscle, color) {
  const meta = groupMeta(muscle);
  const col = color || meta.color;
  if (meta.glyph) {
    const spine = BODY_BACKVIEW.has(meta.glyph)
      ? `<path d="M12 7.6v10" style="stroke:var(--bg)" stroke-width=".8" stroke-linecap="round" fill="none" opacity=".7"/>` : '';
    return `<svg class="mus-svg" viewBox="0 0 24 32" aria-hidden="true" focusable="false">
      <g fill="${col}" fill-opacity=".28">${BODY_BASE}</g>
      <g fill="${col}">${BODY_HI[meta.glyph]}</g>${spine}${BODY_LINES[meta.glyph]||''}</svg>`;
  }
  return `<i class="ph-bold ${meta.ph} mus-ph" style="color:${col}" aria-hidden="true"></i>`;
}

/* ── Storage keys ────────────────────────────────────────────────────────── */
const K_LIB      = 'mt-library-v1';
const K_WORKOUTS = 'mt-workouts-v1';
const K_HISTORY  = 'mt-history-v1';
const K_CHECKLIST_DISMISSED = 'mt-checklist-dismissed';
const K_REST  = 'mt-restdays-v1';   /* datas (YYYY-MM-DD) marcadas como descanso */
const K_SINCE = 'mt-train-since-v1'; /* data do 1º treino, guardada caso o histórico seja cortado */

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || (key===K_WORKOUTS?{}:[]); }
  catch { return key===K_WORKOUTS?{}:[]; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ── App State ───────────────────────────────────────────────────────────── */
let library  = load(K_LIB);
let workouts = load(K_WORKOUTS);
let history  = load(K_HISTORY);
let restDays = new Set((() => { const r = load(K_REST); return Array.isArray(r) ? r : []; })());

/* Migração única v4→v5: a v4 pré-populava a biblioteca automaticamente.
   Roda apenas uma vez (flag mt-migrated-v5) e nunca mais toca nos dados. */
(function migrateV4toV5() {
  const K_MIG = 'mt-migrated-v5';
  if (localStorage.getItem(K_MIG)) return;
  localStorage.setItem(K_MIG, '1');
  const allAuto = library.length > 0 && library.every(e => e.catalogId && !e._userImported);
  if (allAuto) { library = []; save(K_LIB, library); }
})();
/* Migração única v6: corrige ortografia/acentos dos nomes já salvos,
   padroniza o nome dos grupos musculares (Biceps → Bíceps etc.) e remove
   os emojis guardados em cada exercício (agora o ícone vem do grupo). */
(function migrateV6() {
  const K_MIG6 = 'mt-migrated-v6';
  if (localStorage.getItem(K_MIG6)) return;
  localStorage.setItem(K_MIG6, '1');
  const cleanEx = e => {
    const o = { ...e };
    if (o.name)      o.name = fixPt(o.name);
    if (o.muscle)    o.muscle = canonMuscle(o.muscle);
    if (o.equipment) o.equipment = canonEquip(o.equipment);
    delete o.icon;
    return o;
  };
  library = library.map(cleanEx);
  save(K_LIB, library);
  history = history.map(h => Array.isArray(h.exSnap) ? { ...h, exSnap: h.exSnap.map(cleanEx) } : h);
  save(K_HISTORY, history);
})();
let selDay   = WEEKDAY;
let clipboardWorkout = null; /* treino copiado, aguardando ser colado em outro dia */
let libFilter = 'Todos';
let libraryMode = 'my';
const exerciseCatalog = buildExerciseCatalog();

/* Workout builder */
let wkDay=null, wkEditIdx=null, wkSel=[], wkFilter='Todos';
/* Exercise editor */
let exEditId = null;
/* Drag & drop */

/* Timer (rest) */
let tTotal=60, tRemain=60, tRunning=false, tInterval=null;
const PRESETS=[30,60,90,120];

/* ═══════════════════════════════════════════════════════════════════════════
   NOTIFICAÇÃO DE FIM DE CRONÔMETRO — som + vibração + flash + notificação
   do sistema (funciona offline, PWA)
   ═══════════════════════════════════════════════════════════════════════════ */
let _audioCtx = null;
function _getAudioCtx() {
  if (_audioCtx) return _audioCtx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    _audioCtx = new Ctx();
  } catch { _audioCtx = null; }
  return _audioCtx;
}
/* Desbloqueia o AudioContext no primeiro toque do usuário (exigência de
   autoplay policy em iOS/Android). Sem isso o beep pode não soar depois. */
function _unlockAudio() {
  const ctx = _getAudioCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(()=>{});
  window.removeEventListener('pointerdown', _unlockAudio);
  window.removeEventListener('touchstart', _unlockAudio);
}
window.addEventListener('pointerdown', _unlockAudio, { once:true });
window.addEventListener('touchstart', _unlockAudio, { once:true });

/* Toca uma série de bips (não só um par) ao longo de alguns segundos.
   Um som curto de menos de 1s passa despercebido se o usuário não está
   olhando pro celular naquele instante exato — repetir por mais tempo
   aumenta bastante a chance de ser percebido. */
function playBeep() {
  const ctx = _getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
  const now = ctx.currentTime;
  const beepTimes = [0, 0.22, 1.0, 1.22, 2.0, 2.22]; // 3 "duplas" de bips em ~2.4s
  beepTimes.forEach(offset => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now + offset);
    gain.gain.setValueAtTime(0, now + offset);
    gain.gain.linearRampToValueAtTime(0.4, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.19);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.2);
  });
}

/* ── Notificação do sistema (banner) ──────────────────────────────────────
   No iPhone, se o app estiver ADICIONADO À TELA DE INÍCIO (iOS 16.4+),
   isso mostra um banner de notificação de verdade, com som/haptic do
   próprio sistema — funciona mesmo com a tela bloqueada ou o app em
   segundo plano, que é justamente o caso em que som/flash na tela não
   adiantam nada. Em Safari comum (sem instalar) ou iOS antigo, a API
   simplesmente não existe e essa parte é ignorada sem gerar erro. */
let _notifPermissionAsked = false;
function ensureNotifPermission() {
  if (_notifPermissionAsked) return;
  _notifPermissionAsked = true;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(()=>{});
  }
}
/* Pede a permissão assim que o usuário interage com o site pela primeira
   vez (não pode ser pedida sem gesto do usuário). */
window.addEventListener('pointerdown', ensureNotifPermission, { once:true });
window.addEventListener('touchstart', ensureNotifPermission, { once:true });

function showSystemNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const title = 'Cronômetro finalizado!';
  const options = {
    body: 'Seu tempo de descanso acabou. Bora continuar o treino!',
    icon: './imagens/icon-192.png',
    badge: './imagens/icon-192.png',
    tag: 'timer-done',
    renotify: true,
    vibrate: [160, 80, 160]
  };
  /* Preferir o Service Worker (mais confiável em segundo plano no
     celular); cair para Notification direta se não houver SW ativo. */
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification(title, options))
      .catch(() => { try { new Notification(title, options); } catch {} });
  } else {
    try { new Notification(title, options); } catch {}
  }
}

/* Notifica o usuário quando QUALQUER cronômetro do site chega a zero,
   combinando 4 canais ao mesmo tempo — cada um cobre a limitação do
   outro em algum aparelho/situação:
   1. Vibração        → funciona em Android; iOS nunca implementou.
   2. Som (Web Audio)  → pode ser silenciado pela chavinha lateral no iOS.
   3. Flash na tela    → só percebido se o usuário estiver olhando.
   4. Notificação do sistema → funciona com tela bloqueada/app em 2º
      plano no iOS 16.4+, mas só se o app estiver instalado na tela de
      início E o usuário tiver aceitado a permissão. */
function notifyTimerEnd() {
  if ('vibrate' in navigator) {
    try { navigator.vibrate([160, 80, 160, 80, 160]); } catch {}
  }
  playBeep();
  flashScreen();
  showSystemNotification();
}

function flashScreen() {
  let el = document.getElementById('timer-flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'timer-flash';
    el.innerHTML = `<div class="timer-flash-toast"><i class="ph-bold ph-timer"></i> Tempo esgotado!</div>`;
    document.body.appendChild(el);
  }
  el.classList.remove('flash-active');
  void el.offsetWidth; /* reinicia a animação se disparar de novo rápido */
  el.classList.add('flash-active');
  el.addEventListener('animationend', () => el.classList.remove('flash-active'), { once:true });
}

/* Active workout */
let activeWk    = null;
let activeCur   = 0;
let activeStart = null;
let elapsedInterval = null;
let restInterval = null;
let restRemain   = 0;

/* History edit */
let histEditId = null;

/* Library selection */
let libSelectMode = false;
let libSelected   = new Set();
let catalogEditId = null;

/* Catalog selection mode */
let catalogSelectMode = false;
let catalogSelected   = new Set();

/* ═══════════════════════════════════════════════════════════════════════════
   BACKUP DOS DADOS (exportar / importar arquivo .json)
   Os dados vivem só no localStorage; o backup é a única proteção contra
   limpar o navegador, desinstalar o app ou trocar de aparelho.
   A importação VALIDA e LIMPA tudo que vem do arquivo, porque o app insere
   nomes direto no HTML: um arquivo adulterado não pode injetar código.
   ═══════════════════════════════════════════════════════════════════════════ */
const K_LASTBK    = 'mt-last-backup-v1';   /* data do último backup exportado */
const K_PREIMPORT = 'mt-pre-import-v1';    /* cópia dos dados de antes da última importação */
const BACKUP_SCHEMA = 1;
const BACKUP_STALE_DAYS = 30;

function buildBackup() {
  const since = trainingStartDate();
  return {
    app: 'meus-treinos', schema: BACKUP_SCHEMA, exportedAt: new Date().toISOString(),
    data: {
      library, workouts, history,
      restDays: [...restDays],
      trainSince: since ? since.toISOString() : null,
      checklistDismissed: !!localStorage.getItem(K_CHECKLIST_DISMISSED),
    }
  };
}

/* ── Limpeza dos dados vindos do arquivo ─────────────────────────────────── */
const BK_CHARS = { '<':'‹', '>':'›', '"':'”', "'":'’', '`':'´', '\\':'/' };
const bkStr   = (v, max = 200) => String(v == null ? '' : v)
  .replace(/[<>"'`\\]/g, c => BK_CHARS[c]).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const bkId    = v => String(v == null ? '' : v).replace(/[^\w-]/g, '').slice(0, 40);
const bkColor = c => /^#[0-9a-fA-F]{6}$/.test(String(c)) ? String(c) : '#7a7870';
const bkInt   = (n, min, max, def) => { n = Math.round(Number(n)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const bkISO   = d => { const t = Date.parse(d); return isNaN(t) ? null : new Date(t).toISOString(); };
const bkArr   = v => Array.isArray(v) ? v : [];

function sanitizeBackup(raw) {
  if (!raw || typeof raw !== 'object' || raw.app !== 'meus-treinos' || !raw.data || typeof raw.data !== 'object') {
    throw new Error('Este arquivo não parece ser um backup do Meus Treinos.');
  }
  if (Number(raw.schema) > BACKUP_SCHEMA) {
    throw new Error('Este backup foi criado por uma versão mais nova do app. Atualize o app e tente de novo.');
  }
  const d = raw.data;
  let ignored = 0;

  const seen = new Set();
  const lib = [];
  bkArr(d.library).slice(0, 5000).forEach(e => {
    const id = bkId(e && e.id), name = fixPt(bkStr(e && e.name, 80));
    if (!id || !name || seen.has(id)) { ignored++; return; }
    seen.add(id);
    const o = {
      id, name,
      muscle:    canonMuscle(bkStr(e.muscle, 30)) || 'Corpo',
      color:     bkColor(e.color),
      sets:      bkStr(e.sets, 30),
      tip:       bkStr(e.tip, 300),
      category:  bkStr(e.category, 30) || 'Academia',
      equipment: canonEquip(bkStr(e.equipment, 30)),
    };
    if (e.catalogId) o.catalogId = bkId(e.catalogId);
    if (e._userImported) o._userImported = true;
    lib.push(o);
  });

  const wk = {};
  if (d.workouts && typeof d.workouts === 'object' && !Array.isArray(d.workouts)) {
    for (let day = 0; day < 7; day++) {
      const list = bkArr(d.workouts[day]).slice(0, 20).map(w => {
        const name = bkStr(w && w.name, 60);
        if (!name) { ignored++; return null; }
        return { name, exIds: bkArr(w.exIds).slice(0, 100).map(bkId).filter(Boolean) };
      }).filter(Boolean);
      if (list.length) wk[day] = list;
    }
  }

  const hist = bkArr(d.history).slice(0, 500).map(h => {
    const date = bkISO(h && h.date);
    if (!date) { ignored++; return null; }
    const exSnap = bkArr(h.exSnap).slice(0, 100).map(x => {
      const o = {
        name: fixPt(bkStr(x && x.name, 80)), muscle: canonMuscle(bkStr(x && x.muscle, 30)),
        sets: bkStr(x && x.sets, 30), color: bkColor(x && x.color),
      };
      if (x && x.removed) o.removed = true;
      const sid = x && x.id ? bkId(x.id) : '';
      if (sid) o.id = sid;
      const kg = Number(x && x.kg), rp = Math.round(Number(x && x.reps));
      if (x && x.kg != null && x.kg !== '' && Number.isFinite(kg) && kg >= 0) o.kg = Math.round(Math.min(kg, 999) * 100) / 100;
      if (x && x.reps != null && x.reps !== '' && Number.isFinite(rp) && rp > 0) o.reps = Math.min(rp, 999);
      return o;
    });
    const o = {
      id:       bkId(h.id) || Math.random().toString(36).slice(2, 8),
      date,
      wkName:   bkStr(h.wkName, 60),
      exIds:    bkArr(h.exIds).slice(0, 100).map(bkId).filter(Boolean),
      duration: bkInt(h.duration, 1, 1440, 1),
      dayIndex: bkInt(h.dayIndex, 0, 6, (new Date(date).getDay() + 6) % 7),
    };
    if (exSnap.length) o.exSnap = exSnap;
    return o;
  }).filter(Boolean).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  /* O app guarda no máximo 100 registros; a data do mais antigo descartado
     continua valendo para o contador "tempo treinando". */
  let trainSince = bkISO(d.trainSince);
  while (hist.length > 100) {
    const old = hist.pop().date;
    if (!trainSince || Date.parse(old) < Date.parse(trainSince)) trainSince = old;
  }

  const rest = [...new Set(bkArr(d.restDays).map(String).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)))].slice(0, 3650);

  return {
    ignored, exportedAt: bkISO(raw.exportedAt),
    data: { library: lib, workouts: wk, history: hist, restDays: rest, trainSince, checklistDismissed: !!d.checklistDismissed }
  };
}

function applyBackupData(data) {
  library  = data.library;
  workouts = data.workouts;
  history  = data.history;
  restDays = new Set(data.restDays);
  save(K_LIB, library); save(K_WORKOUTS, workouts); save(K_HISTORY, history); saveRestDays();
  if (data.trainSince) localStorage.setItem(K_SINCE, data.trainSince); else localStorage.removeItem(K_SINCE);
  if (data.checklistDismissed) localStorage.setItem(K_CHECKLIST_DISMISSED, '1');
  else localStorage.removeItem(K_CHECKLIST_DISMISSED);
  clipboardWorkout = null; selDay = WEEKDAY; libFilter = 'Todos';
  renderStats(); renderChecklist(); renderDayStrip(); renderDayContent(); renderHistory(); renderLibrary();
  updateBackupBadge();
}

const bkCountWorkouts = wk => Object.values(wk).reduce((n, l) => n + l.length, 0);
const bkFmtDate = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
function bkDescribe(data) {
  return `${data.library.length} exercício${data.library.length !== 1 ? 's' : ''} · `
       + `${bkCountWorkouts(data.workouts)} treino${bkCountWorkouts(data.workouts) !== 1 ? 's' : ''} · `
       + `${data.history.length} registro${data.history.length !== 1 ? 's' : ''} no histórico`;
}

/* ── Interface ───────────────────────────────────────────────────────────── */
function bkMessage(text, type) {
  const el = document.getElementById('bk-msg');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'bk-msg' + (text ? ' ' + (type || 'ok') : '');
}
function backupStale() {
  const hasData = history.length > 0 || library.length > 0 || Object.keys(workouts).length > 0;
  if (!hasData) return false;
  const last = Date.parse(localStorage.getItem(K_LASTBK) || '');
  return isNaN(last) || (Date.now() - last) > BACKUP_STALE_DAYS * 86400000;
}
function updateBackupBadge() {
  const b = document.getElementById('header-data-btn');
  if (!b) return;
  const stale = backupStale();
  b.classList.toggle('needs-backup', stale);
  b.title = stale ? 'Backup dos dados (faça uma cópia!)' : 'Backup dos dados';
}
function renderBackupModal() {
  const tile = (n, l) => `<div class="bk-tile"><strong>${n}</strong><span>${l}</span></div>`;
  document.getElementById('bk-summary').innerHTML =
    tile(library.length, 'Exercícios') + tile(bkCountWorkouts(workouts), 'Treinos') +
    tile(history.length, 'Histórico') + tile(restDays.size, 'Descansos');
  const last = Date.parse(localStorage.getItem(K_LASTBK) || '');
  const lastEl = document.getElementById('bk-last');
  if (isNaN(last)) {
    lastEl.textContent = 'Você ainda não exportou nenhum backup.';
    lastEl.className = 'bk-last warn';
  } else {
    lastEl.textContent = 'Último backup: ' + bkFmtDate(new Date(last).toISOString());
    lastEl.className = 'bk-last' + (backupStale() ? ' warn' : '');
  }
  document.getElementById('bk-undo-btn').style.display = localStorage.getItem(K_PREIMPORT) ? '' : 'none';
  let canShare = false;
  try {
    canShare = !!(navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'a.json', { type: 'application/json' })] }));
  } catch {}
  document.getElementById('bk-share-btn').style.display = canShare ? '' : 'none';
}
function openBackupModal() {
  bkMessage('');
  renderBackupModal();
  document.getElementById('overlay-backup').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeBackupModal() {
  document.getElementById('overlay-backup').classList.remove('open');
  document.body.style.overflow = '';
}

async function exportBackup(mode) {
  const json  = JSON.stringify(buildBackup(), null, 2);
  const fname = `meus-treinos-backup-${dateKey(new Date())}.json`;
  try {
    if (mode === 'share') {
      await navigator.share({ files: [new File([json], fname, { type: 'application/json' })], title: 'Backup do Meus Treinos' });
    } else {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return; /* o usuário cancelou o compartilhamento */
    bkMessage('Não foi possível gerar o arquivo. Tente novamente.', 'err');
    return;
  }
  localStorage.setItem(K_LASTBK, new Date().toISOString());
  bkMessage('Backup gerado. Guarde o arquivo em um lugar seguro (nuvem, e-mail ou outro aparelho).', 'ok');
  renderBackupModal(); updateBackupBadge();
}

async function importBackupFile(input) {
  const file = input.files && input.files[0];
  input.value = ''; /* permite escolher o mesmo arquivo de novo */
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { bkMessage('Arquivo grande demais para ser um backup do app.', 'err'); return; }
  let parsed, result;
  try { parsed = JSON.parse(await file.text()); }
  catch { bkMessage('Não consegui ler o arquivo. Ele precisa ser um .json exportado pelo app.', 'err'); return; }
  try { result = sanitizeBackup(parsed); }
  catch (e) { bkMessage(e.message, 'err'); return; }
  confirmRestore(result, 'Importar backup', false);
}

function confirmRestore(result, title, isUndo) {
  const when = result.exportedAt ? ` (de ${bkFmtDate(result.exportedAt)})` : '';
  const warn = result.ignored ? `<br><br>${result.ignored} item${result.ignored !== 1 ? 's' : ''} inválido${result.ignored !== 1 ? 's' : ''} no arquivo ${result.ignored !== 1 ? 'serão ignorados' : 'será ignorado'}.` : '';
  const now  = { library, workouts, history };
  showConfirm(title,
    `Os dados atuais serão <strong>substituídos</strong> pelos do arquivo${when}.<br><br>`
    + `<strong>Arquivo:</strong> ${bkDescribe(result.data)}<br>`
    + `<strong>Agora neste aparelho:</strong> ${bkDescribe(now)}`
    + (isUndo ? '' : '<br><br>Dá para desfazer logo depois, em "Desfazer última importação".') + warn,
    () => {
      const before = buildBackup();
      try {
        if (!isUndo) {
          try { localStorage.setItem(K_PREIMPORT, JSON.stringify(before)); } catch {}
        }
        applyBackupData(result.data);
        if (isUndo) localStorage.removeItem(K_PREIMPORT);
      } catch {
        try { applyBackupData(before.data); } catch {}
        bkMessage('Não foi possível importar (sem espaço no navegador?). Seus dados foram mantidos.', 'err');
        renderBackupModal();
        return;
      }
      bkMessage(isUndo ? 'Importação desfeita: seus dados anteriores voltaram.' : 'Backup importado com sucesso.', 'ok');
      renderBackupModal();
      showToast(isUndo ? 'Dados anteriores restaurados' : 'Backup importado');
    });
}

function undoImport() {
  let result;
  try { result = sanitizeBackup(JSON.parse(localStorage.getItem(K_PREIMPORT))); }
  catch { bkMessage('Não há uma importação anterior para desfazer.', 'err'); localStorage.removeItem(K_PREIMPORT); renderBackupModal(); return; }
  confirmRestore(result, 'Desfazer importação', true);
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════════════════ */
(function init() {
  const dn = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  document.getElementById('today-label').textContent = dn[new Date().getDay()];

  document.querySelectorAll('.tab, .bnav-btn').forEach(b =>
    b.addEventListener('click', () => switchTab(b.dataset.tab))
  );

  renderStats();
  renderChecklist();
  renderDayStrip();
  renderDayContent();
  renderHistory();
  renderLibrary();
  renderTimerPresets();
  updateBackupBadge();
  updateTimerUI();
})();

/* ═══════════════════════════════════════════════════════════════════════════
   ELAPSED TIME FORMATTER
   Formata segundos em mm:ss ou h:mm:ss quando >= 3600s
   ═══════════════════════════════════════════════════════════════════════════ */
function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/* Formata duração em minutos para exibição legível */
function formatDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function slugify(txt) {
  return txt.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'');
}

function buildExerciseCatalog() {
  const groups = [
    { muscle:'Peito', category:'Academia', equipment:['Barra','Halteres','Maquina','Cabo','Elastico'], base:['Supino reto','Supino inclinado','Supino declinado','Crucifixo','Fly inclinado','Crossover','Pullover','Press convergente','Peck deck','Squeeze press','Flexao no smith','Supino fechado'] },
    { muscle:'Peito', category:'Casa', equipment:['Nenhum','Elastico','Halteres','Banco'], base:['Flexao de bracos','Flexao inclinada','Flexao declinada','Flexao diamante','Flexao aberta','Flexao arqueiro','Crucifixo no chao','Press no chao','Pullover no chao','Isometria de flexao'] },
    { muscle:'Peito', category:'Calistenia', equipment:['Nenhum','Barra','Faixa/TRX'], base:['Flexao hindu','Flexao explosiva','Flexao pseudo planche','Flexao com palmada','Flexao pike','Mergulho em paralelas','Mergulho entre bancos','Flexao unilateral assistida','Flexao typewriter','Planche lean'] },
    { muscle:'Costas', category:'Academia', equipment:['Barra','Halteres','Maquina','Cabo','Elastico'], base:['Puxada frente','Puxada supinada','Puxada neutra','Remada curvada','Remada baixa','Remada cavalinho','Remada unilateral','Pulldown reto','Remada articulada','Remada alta','Levantamento terra','Encolhimento escapular'] },
    { muscle:'Costas', category:'Casa', equipment:['Elastico','Halteres','Faixa/TRX','Nenhum'], base:['Remada com elastico','Remada curvada caseira','Remada unilateral caseira','Superman','Superman alternado','Good morning','Pulldown com elastico','Remada invertida na mesa','Extensao lombar no chao','Y raise'] },
    { muscle:'Costas', category:'Calistenia', equipment:['Barra','Faixa/TRX','Nenhum'], base:['Barra fixa pronada','Barra fixa supinada','Barra fixa neutra','Chin up','Australian pull up','Remada invertida','Scapular pull up','Muscle up assistido','Archer pull up','Front lever tuck','Skin the cat','Back extension'] },
    { muscle:'Pernas', category:'Academia', equipment:['Barra','Halteres','Maquina','Cabo','Anilha'], base:['Agachamento livre','Agachamento frontal','Leg press','Cadeira extensora','Mesa flexora','Stiff','Levantamento terra romeno','Afundo','Passada','Hack squat','Panturrilha em pe','Panturrilha sentado','Adutora','Abdutora','Agachamento sumo'] },
    { muscle:'Pernas', category:'Casa', equipment:['Nenhum','Halteres','Elastico','Banco','Caixa'], base:['Agachamento livre','Agachamento sumo','Agachamento bulgaro','Afundo parado','Avanco alternado','Passada reversa','Step up','Ponte de gluteo','Elevação de panturrilha','Wall sit','Agachamento isometrico','Good morning'] },
    { muscle:'Pernas', category:'Calistenia', equipment:['Nenhum','Caixa','Banco'], base:['Pistol squat assistido','Pistol squat','Shrimp squat','Sissy squat','Nordic curl assistido','Agachamento com salto','Salto na caixa','Cossack squat','Skater squat','Panturrilha unilateral','Lunge jump','Step down'] },
    { muscle:'Gluteos', category:'Academia', equipment:['Barra','Halteres','Maquina','Cabo','Elastico'], base:['Hip thrust','Glute bridge','Coice no cabo','Abducao no cabo','Abdutora','Levantamento sumo','Stiff unilateral','Pull through','Passada longa','Agachamento sumo','Kickback maquina','Extensao de quadril'] },
    { muscle:'Gluteos', category:'Casa', equipment:['Nenhum','Elastico','Halteres','Banco'], base:['Ponte de gluteo','Ponte unilateral','Abducao lateral','Clamshell','Coice no chao','Fire hydrant','Elevação pelvica','Frog pump','Step up alto','Afundo longo','Good morning unilateral','Caminhada lateral'] },
    { muscle:'Ombros', category:'Academia', equipment:['Barra','Halteres','Maquina','Cabo','Elastico'], base:['Desenvolvimento militar','Desenvolvimento sentado','Elevação lateral','Elevação frontal','Crucifixo inverso','Remada alta','Face pull','Arnold press','Encolhimento','Rotacao externa','Rotacao interna','Desenvolvimento maquina'] },
    { muscle:'Ombros', category:'Casa', equipment:['Halteres','Elastico','Nenhum'], base:['Elevação lateral caseira','Elevação frontal caseira','Pike push up','Handstand hold','Wall walk','Y raise','T raise','Rotacao externa com elastico','Desenvolvimento com elastico','Prancha toque ombro'] },
    { muscle:'Ombros', category:'Calistenia', equipment:['Nenhum','Barra','Faixa/TRX'], base:['Pike push up','Handstand push up assistido','Handstand hold','Wall walk','Pseudo planche push up','Scapular push up','Dips inclinados','Planche lean','Prancha shoulder tap','Bear crawl'] },
    { muscle:'Biceps', category:'Academia', equipment:['Barra','Halteres','Maquina','Cabo','Elastico'], base:['Rosca direta','Rosca alternada','Rosca martelo','Rosca scott','Rosca concentrada','Rosca inversa','Rosca punho','Rosca 21','Rosca inclinada','Rosca Zottman','Rosca unilateral no cabo','Rosca bayesian'] },
    { muscle:'Biceps', category:'Casa', equipment:['Halteres','Elastico','Nenhum'], base:['Rosca com elastico','Rosca martelo caseira','Rosca concentrada caseira','Rosca isometrica','Rosca com garrafinha','Rosca alternada sentado'] },
    { muscle:'Biceps', category:'Calistenia', equipment:['Nenhum','Barra','Faixa/TRX'], base:['Chin up supinado','Barra supinada','Bodyweight curl','Commando pull up','Negative chin up','Australian pull up supinado','Archer chin up'] },
    { muscle:'Triceps', category:'Academia', equipment:['Barra','Halteres','Maquina','Cabo','Elastico'], base:['Triceps testa','Triceps corda','Triceps frances','Triceps coice','Triceps barra reta','Triceps unilateral','Paralela maquina','Mergulho banco','Extensao punho','Kickback','Triceps supinado no cabo','Triceps overhead'] },
    { muscle:'Triceps', category:'Casa', equipment:['Halteres','Elastico','Nenhum','Banco'], base:['Triceps banco','Triceps frances caseiro','Triceps coice caseiro','Flexao fechada','Flexao diamante','Prancha sobe e desce','Mergulho entre cadeiras','Triceps com elastico'] },
    { muscle:'Triceps', category:'Calistenia', equipment:['Nenhum','Barra','Faixa/TRX'], base:['Dips','Flexao diamante','Flexao fechada','Triceps extension TRX','Bench dips','Dips assistido','Pseudo planche dip','Diamond push up explosivo'] },
    { muscle:'Abdomen', category:'Academia', equipment:['Cabo','Maquina','Banco','Bola','Anilha'], base:['Abdominal maquina','Crunch no cabo','Elevação de pernas','Abdominal infra','Prancha com carga','Russian twist','Abdominal declinado','Woodchopper','Pallof press','Hanging knee raise','Hanging leg raise','Ab wheel'] },
    { muscle:'Abdomen', category:'Casa', equipment:['Nenhum','Bola','Elastico','Anilha'], base:['Prancha','Prancha lateral','Crunch','Bicicleta abdominal','Abdominal infra','Elevação de pernas','Dead bug','Hollow hold','Mountain climber','Canivete','Russian twist','Bird dog'] },
    { muscle:'Abdomen', category:'Calistenia', equipment:['Nenhum','Barra'], base:['L-sit tuck','L-sit','Dragon flag assistido','Toes to bar','Hanging knee raise','Hollow rock','V-up','Plank walk','Windshield wiper','Front lever tuck raise'] },
    { muscle:'Cardio', category:'Casa', equipment:['Nenhum','Cardio','Caixa'], base:['Polichinelo','Burpee','Corrida parada','Skipping alto','Mountain climber rapido','Agachamento com salto','Lunge jump','High knees','Jumping jack','Shadow boxing','Step touch','Corrida lateral'] },
    { muscle:'Cardio', category:'Academia', equipment:['Cardio'], base:['Esteira caminhada','Esteira corrida','Bike ergometrica','Eliptico','Remo indoor','Escada ergometrica','Air bike','Ski erg','Bike spinning','Trote inclinado'] },
    { muscle:'Corpo', category:'Funcional', equipment:['Kettlebell','Medicine ball','Caixa','Corda','Halteres','Nenhum'], base:['Kettlebell swing','Turkish get up','Clean com kettlebell','Snatch com kettlebell','Arremesso medicine ball','Slam ball','Farmer walk','Bear crawl','Caminhada do caranguejo','Thruster','Devil press','Renegade row','Burpee box jump','Corda naval'] },
    { muscle:'Corpo', category:'Esportes', equipment:['Nenhum','Elastico','Medicine ball','Caixa','Cardio'], base:['Sprint curto','Sprint em subida','Mudanca de direcao','Salto vertical','Salto horizontal','Pliometria lateral','Drill de agilidade','Carioca drill','Aceleracao 10m','Desaceleracao','Arremesso rotacional','Pogo jump','Shuttle run','Skipping tecnico'] },
    { muscle:'Mobilidade', category:'Mobilidade', equipment:['Nenhum','Elastico','Bola'], base:['Mobilidade de quadril','Mobilidade toracica','Alongamento posterior','Alongamento de peitoral','Alongamento de flexor do quadril','Rotacao de ombro','Mobilidade de tornozelo','Couch stretch','World greatest stretch','Cat cow','Child pose','Dead hang leve','90 90 de quadril','Respiracao diafragmatica'] },
  ];
  const variations = {
    Barra:['com barra','pegada pronada','pegada supinada','pegada fechada','pegada aberta'],
    Halteres:['com halteres','alternado','unilateral','bilateral','no banco inclinado'],
    Maquina:['na maquina','articulado','sentado','unilateral','com pausa'],
    Cabo:['no cabo','com corda','com barra reta','unilateral','alto para baixo'],
    Elastico:['com elastico','com mini band','com pausa','unilateral','bilateral'],
    Kettlebell:['com kettlebell','unilateral','alternado','em circuito'],
    Banco:['no banco','inclinado','declinado','com apoio'],
    Bola:['na bola','com bola suica','com medicine ball'],
    Cardio:['leve','moderado','intervalado','sprint','tempo run'],
    'Faixa/TRX':['no TRX','com faixa','inclinado','unilateral'],
    Anilha:['com anilha','abracando anilha','acima da cabeca'],
    Caixa:['na caixa','com salto','lateral','baixo impacto'],
    'Medicine ball':['com medicine ball','rotacional','acima da cabeca'],
    Nenhum:['livre','isometrico','alternado','com pausa','explosivo'],
  };
  const catalog = [];
  const seen = new Set();
  groups.forEach(g => {
    const meta = groupMeta(g.muscle);
    g.base.forEach(base => {
      g.equipment.forEach(eq => {
        (variations[eq] || ['']).forEach(v => {
          const name = v ? `${base} ${v}` : base;
          const id = `cat-${slugify(g.category)}-${slugify(g.muscle)}-${slugify(eq)}-${slugify(name)}`;
          if (seen.has(id)) return;
          seen.add(id);
          /* id usa o nome "cru" (estável); o que aparece é o nome corrigido */
          catalog.push({
            id, name:fixPt(name), muscle:canonMuscle(g.muscle), category:g.category,
            equipment:canonEquip(eq), color:meta.color, sets:'', tip:''
          });
        });
      });
    });
  });
  return catalog;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHECKLIST
   ═══════════════════════════════════════════════════════════════════════════ */
function renderChecklist() {
  const el = document.getElementById('checklist-card');
  if (!el) return;

  if (localStorage.getItem(K_CHECKLIST_DISMISSED)) { el.innerHTML = ''; return; }

  const s1 = library.length > 0;
  const s2 = Object.values(workouts).some(w => w && w.length);
  const s3 = history.length > 0;
  const done = [s1, s2, s3].filter(Boolean).length;

  if (done === 3) {
    el.innerHTML = `
      <div class="checklist-card" style="border-color:rgba(200,240,96,.5);text-align:center;padding:18px">
        <div style="font-size:30px;margin-bottom:6px;color:var(--accent);line-height:1"><i class="ph-fill ph-confetti"></i></div>
        <div class="checklist-title">Configuração concluída!</div>
        <div class="checklist-sub" style="margin-top:4px">Você já sabe usar o app. Bons treinos!</div>
      </div>`;
    setTimeout(() => {
      localStorage.setItem(K_CHECKLIST_DISMISSED, '1');
      el.style.transition = 'opacity .5s, max-height .5s';
      el.style.opacity = '0';
      el.style.maxHeight = '0';
      el.style.overflow = 'hidden';
      setTimeout(() => { el.innerHTML = ''; el.style = ''; }, 520);
    }, 2800);
    return;
  }

  const steps = [
    { done: s1, label: 'Adicionar um exercício',        hint: 'Vá em Biblioteca → + Exercício',               action: `onclick="dismissAndGo('biblioteca')"` },
    { done: s2, label: 'Criar um treino para algum dia', hint: 'Selecione um dia e clique em "Criar treino"',  action: s1 ? `onclick="checklistFocusDay()"` : `onclick="dismissAndGo('biblioteca')"` },
    { done: s3, label: 'Iniciar seu primeiro treino',    hint: 'Toque no ícone de play no card do treino',          action: s2 ? `` : `onclick="checklistFocusDay()"` },
  ];
  const pct = Math.round((done / 3) * 100);

  el.innerHTML = `
    <div class="checklist-card">
      <div class="checklist-header">
        <div>
          <div class="checklist-title">Primeiros passos</div>
          <div class="checklist-sub">${done} de 3 concluídos — siga a ordem abaixo</div>
        </div>
        <button class="checklist-dismiss" onclick="dismissChecklist()">Dispensar</button>
      </div>
      <div class="checklist-progress">
        <div class="checklist-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="checklist-steps">
        ${steps.map((s, i) => `
          <div class="checklist-step ${s.done ? 'done' : ''}" ${!s.done ? s.action : ''}>
            <div class="step-check">${s.done ? '<i class="ph-bold ph-check"></i>' : (i + 1)}</div>
            <div class="step-body">
              <div class="step-label">${s.label}</div>
              <div class="step-hint">${s.hint}</div>
            </div>
            ${!s.done ? '<span class="step-arrow">→</span>' : ''}
          </div>`).join('')}
      </div>
    </div>`;
}

function dismissChecklist() {
  localStorage.setItem(K_CHECKLIST_DISMISSED, '1');
  const el = document.getElementById('checklist-card');
  el.style.transition = 'opacity .3s, max-height .4s, margin .4s';
  el.style.opacity = '0';
  el.style.maxHeight = '0';
  el.style.overflow = 'hidden';
  el.style.marginBottom = '0';
  setTimeout(() => { el.innerHTML = ''; el.style = ''; }, 420);
}

function dismissAndGo(tab) { switchTab(tab); }
function checklistFocusDay() {
  document.getElementById('day-strip').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ═══════════════════════════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════════════════════════ */
function switchTab(tab) {
  ['treinos','historico','biblioteca','timer'].forEach(t => {
    document.getElementById('sec-'+t).classList.toggle('active', t===tab);
  });
  document.querySelectorAll('.tab, .bnav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab===tab)
  );
  reanimate(document.getElementById('sec-'+tab));
}

/* Reinicia a animação de entrada (fade+slide) de um elemento — usado em
   toda troca de tela/conteúdo (tabs, dias, filtros) para dar sensação de
   transição fluida sem precisar reescrever o DOM. */
function reanimate(el) {
  if (!el) return;
  el.classList.remove('fade-swap');
  void el.offsetWidth; /* força reflow para reiniciar a animação */
  el.classList.add('fade-swap');
}

/* ── Toast genérico ────────────────────────────────────────────────────────
   Mensagem curta que aparece na parte de baixo da tela e some sozinha.
   Usado para confirmar ações rápidas (copiar/colar treino, etc.) sem
   precisar de um modal de confirmação. */
let _toastTimeout = null;
function showToast(msg) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('toast-active');
  void el.offsetWidth;
  el.classList.add('toast-active');
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => el.classList.remove('toast-active'), 2800);
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITÁRIOS DE DATA · DESCANSO · TEMPO DE TREINO
   ═══════════════════════════════════════════════════════════════════════════ */
function pad2(n) { return String(n).padStart(2, '0'); }
/* Escapa texto digitado pelo usuário antes de colocar em innerHTML */
function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* "YYYY-MM-DD" no fuso local (nunca usar toISOString aqui: ele converte p/ UTC) */
function dateKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth()+1)}-${pad2(x.getDate())}`;
}
function dateFromKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m-1, d);
}
/* Data real (desta semana) correspondente a um dia da faixa Seg..Dom (0..6) */
function dateForWeekday(i) {
  const now = new Date(); now.setHours(0,0,0,0);
  const todayIdx = (now.getDay() + 6) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() - todayIdx + i);
  return d;
}
function longDate(d) {
  const wd = (d.getDay() + 6) % 7;
  const nome = DAYS_FULL[wd] + (wd <= 4 ? '-feira' : '');
  return `${nome}, ${d.getDate()} de ${MONTHS_FULL[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}
function hasTrainedOn(key) { return history.some(h => dateKey(h.date) === key); }
function saveRestDays()    { save(K_REST, [...restDays]); }

/* Libera/trava a rolagem da página conforme existam modais abertos */
function syncBodyScroll() {
  const anyOpen = document.querySelector('.overlay.open, .active-screen.open');
  document.body.style.overflow = anyOpen ? 'hidden' : '';
}
function refreshCalendarIfOpen() {
  if (document.getElementById('overlay-calendar').classList.contains('open')) renderCalendar();
}

/* ── Descanso: marcar / desmarcar o dia selecionado na faixa de dias ───── */
function toggleRestDayForSelected() {
  const d   = dateForWeekday(selDay);
  const key = dateKey(d);
  const label = `${DAYS_FULL[selDay]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

  if (restDays.has(key)) {
    restDays.delete(key);
    showToast(`Descanso removido de ${label}.`);
  } else {
    if (hasTrainedOn(key)) {
      showToast('Você já treinou neste dia — não dá para marcá-lo como descanso.');
      return;
    }
    restDays.add(key);
    showToast(`Descanso marcado: ${label}. Sua sequência não quebra.`);
  }
  saveRestDays();
  refreshAfterRestChange();
}
function refreshAfterRestChange() {
  renderDayStrip(); renderDayContent(); renderHistory(); refreshCalendarIfOpen();
}

/* ── Tempo de treino (pílula do cabeçalho) ─────────────────────────────────
   Conta desde o PRIMEIRO treino concluído. Mostra uma unidade só:
   dias (< 1 mês) · meses (< 1 ano) · anos. A data inicial também fica
   guardada à parte, porque o histórico guarda no máx. 100 registros. */
function rememberTrainingStart(iso) {
  const t = Date.parse(iso);
  if (isNaN(t)) return;
  const stored = Date.parse(localStorage.getItem(K_SINCE) || '');
  if (isNaN(stored) || t < stored) localStorage.setItem(K_SINCE, new Date(t).toISOString());
}
function trainingStartDate() {
  const times = history.map(h => Date.parse(h.date)).filter(n => !isNaN(n));
  const stored = Date.parse(localStorage.getItem(K_SINCE) || '');
  if (!isNaN(stored)) times.push(stored);
  return times.length ? new Date(Math.min(...times)) : null;
}
function trainingTimeInfo() {
  const since = trainingStartDate();
  if (!since) return { value: 0, unit: 'Dias' };
  const start = new Date(since.getFullYear(), since.getMonth(), since.getDate());
  const now   = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let months = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) months--;

  if (months >= 12) { const y = Math.floor(months / 12); return { value: y, unit: y === 1 ? 'Ano' : 'Anos' }; }
  if (months >= 1)  return { value: months, unit: months === 1 ? 'Mês' : 'Meses' };
  /* o dia do 1º treino conta como "dia 1" */
  const days = Math.max(1, Math.round((today - start) / 86400000) + 1);
  return { value: days, unit: days === 1 ? 'Dia' : 'Dias' };
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATS
   ═══════════════════════════════════════════════════════════════════════════ */
function renderStats() {
  const days = Object.values(workouts).filter(w=>w&&w.length).length;
  const t = trainingTimeInfo();
  document.getElementById('header-stats').innerHTML = `
    <div class="stat-pill stat-pill-time" title="Tempo desde o seu primeiro treino">
      <span class="stat-num">${t.value}</span>
      <span class="stat-lbl">${t.unit}<br>treinando</span>
    </div>
    <div class="stat-pill">
      <span class="stat-num">${library.length}</span>
      <span class="stat-lbl">Exerc.</span>
    </div>
    <div class="stat-pill">
      <span class="stat-num">${days}</span>
      <span class="stat-lbl">Dias</span>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DAY STRIP
   ═══════════════════════════════════════════════════════════════════════════ */
function renderDayStrip() {
  document.getElementById('day-strip').innerHTML = DAYS_SHORT.map((d,i) => {
    const rest = restDays.has(dateKey(dateForWeekday(i)));
    const flags = (rest ? '<i class="ph ph-moon-stars" title="Descanso"></i>' : '')
                + (i===WEEKDAY ? '<span class="day-today-dot">●</span>' : '');
    return `
    <div class="day-cell ${workouts[i]&&workouts[i].length?'has-workout':''} ${rest?'is-rest':''} ${i===selDay?'selected':''}"
         onclick="selectDay(${i})" ${rest?`aria-label="${DAYS_FULL[i]} (descanso)"`:''}>
      <span class="day-letter">${d}</span>
      <div class="day-dot"></div>
      <span class="day-flags">${flags}</span>
    </div>`;
  }).join('');
}

function selectDay(i) { selDay=i; renderDayStrip(); renderDayContent(); }

/* ═══════════════════════════════════════════════════════════════════════════
   DAY CONTENT
   ═══════════════════════════════════════════════════════════════════════════ */
function renderDayContent() {
  const c  = document.getElementById('day-content');
  const ws = workouts[selDay] || [];

  const dayDate  = dateForWeekday(selDay);
  const isRest   = restDays.has(dateKey(dayDate));
  const hdr = `<div class="day-header">
    <div class="day-header-title">
      <h3 class="day-header-name">${DAYS_FULL[selDay]}${selDay===WEEKDAY?' <span>(hoje)</span>':''}</h3>
      <div class="day-header-date">${dayDate.getDate()} de ${MONTHS_FULL[dayDate.getMonth()].toLowerCase()}</div>
    </div>
    <button class="rest-toggle ${isRest?'active':''}" type="button" onclick="toggleRestDayForSelected()"
            aria-pressed="${isRest}" title="${isRest?'Desmarcar este dia de descanso':'Marcar este dia como descanso'}">
      <i class="ph ${isRest?'ph-moon-stars':'ph-moon'}"></i>
      <span>${isRest?'Descanso marcado':'Marcar descanso'}</span>
    </button>
  </div>`;

  const restBanner = isRest ? `
    <div class="rest-banner">
      <i class="ph ph-moon-stars"></i>
      <div><strong>Dia de descanso</strong>
        <span>Seus treinos programados ficam guardados e a sequência não quebra.</span></div>
    </div>` : '';

  /* Faixa de "área de transferência": aparece em qualquer dia enquanto
     houver um treino copiado esperando ser colado em outro lugar. */
  const clipboardBanner = clipboardWorkout ? `
    <div class="clipboard-banner">
      <i class="ph ph-clipboard-text"></i>
      <span>Treino <strong>"${clipboardWorkout.name}"</strong> copiado.</span>
      <button class="clipboard-cancel" onclick="clearClipboard()" title="Cancelar cópia">
        <i class="ph ph-x"></i>
      </button>
    </div>` : '';

  const pasteBtn = clipboardWorkout ? `
    <button class="btn-ghost" onclick="pasteWorkout(${selDay})">
      <i class="ph ph-clipboard"></i> Colar "${clipboardWorkout.name}" aqui
    </button>` : '';

  if (!ws.length) {
    c.innerHTML = hdr + restBanner + clipboardBanner + (isRest ? '' : `
      <div class="day-empty">Nenhum treino em <strong>${DAYS_FULL[selDay]}</strong>.<br>
        <span style="font-size:12px">Dia de descanso, ou crie um treino abaixo.</span></div>`) + `
      <div class="day-actions">
        <button class="btn-ghost" onclick="openWorkoutModal(${selDay},null)">
          <i class="ph ph-pencil-simple"></i> Criar treino
        </button>
        ${pasteBtn}
      </div>`;
    reanimate(c);
    return;
  }

  const cards = ws.map((w,wi) => {
    const valid = w.exIds.filter(id=>library.find(e=>e.id===id));
    const rows  = w.exIds.map(id=>{
      const ex=library.find(e=>e.id===id); if(!ex) return '';
      return `<div class="ex-row">
        <div class="ex-ico" style="background:${ex.color}22">${muscleIcon(ex.muscle, ex.color)}</div>
        <div class="ex-meta">
          <div class="ex-title">${ex.name}</div>
          ${ex.tip?`<div class="ex-sub">${ex.tip}</div>`:''}
        </div>
        <span class="ex-muscle-tag" style="color:${ex.color};border:1px solid ${ex.color}33">${ex.muscle}</span>
        ${ex.sets?`<span class="ex-sets-tag" style="color:var(--muted)">${ex.sets}</span>`:''}
      </div>`;
    }).join('');

    return `<div class="workout-card">
      <div class="wcard-header">
        <div class="wcard-left">
          <span class="wcard-name">${w.name}</span>
          <span class="wcard-badge">${valid.length} exercício${valid.length!==1?'s':''}</span>
        </div>
        <div class="wcard-actions">
          <button class="icon-btn play" onclick="startActiveWorkout(${selDay},${wi})" title="Iniciar treino">
            <i class="ph ph-play-circle"></i>
          </button>
          <button class="icon-btn" onclick="copyWorkout(${selDay},${wi})" title="Copiar treino para outro dia">
            <i class="ph ph-copy"></i>
          </button>
          <button class="icon-btn edit" onclick="openWorkoutModal(${selDay},${wi})" title="Editar">
            <i class="ph ph-pencil-simple"></i>
          </button>
          <button class="icon-btn del"  onclick="confirmDeleteWorkout(${selDay},${wi})" title="Remover">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
      ${rows||`<div style="padding:12px 14px;font-size:12px;color:var(--muted)">Exercícios removidos da biblioteca.</div>`}
    </div>`;
  }).join('');

  c.innerHTML = hdr + restBanner + clipboardBanner + cards + `
    <div class="day-actions">
      <button class="btn-ghost" onclick="openWorkoutModal(${selDay},null)">
        <i class="ph ph-plus"></i> Novo treino
      </button>
      ${pasteBtn}
    </div>`;
  reanimate(c);
}

/* ── Copiar / colar treinos entre dias ────────────────────────────────────
   Copia mantém o treino "na área de transferência" (variável em memória)
   até o usuário colar em um ou mais dias, ou cancelar. Assim dá pra
   copiar de Segunda e colar em Terça, Quinta etc. sem repetir a ação. */
function copyWorkout(day, wi) {
  const w = workouts[day]?.[wi];
  if (!w) return;
  clipboardWorkout = JSON.parse(JSON.stringify(w)); /* clone independente */
  showToast(`Treino "${w.name}" copiado. Selecione o dia e toque em "Colar".`);
  renderDayContent();
}

function pasteWorkout(day) {
  if (!clipboardWorkout) return;
  const clone = JSON.parse(JSON.stringify(clipboardWorkout));
  if (!workouts[day]) workouts[day] = [];
  workouts[day].push(clone);
  save(K_WORKOUTS, workouts);
  renderDayStrip(); renderDayContent(); renderStats();
  showToast(`Treino colado em ${DAYS_FULL[day]}!`);
}

function clearClipboard() {
  clipboardWorkout = null;
  renderDayContent();
}

function confirmDeleteWorkout(day,wi) {
  showConfirm('Remover treino', `Remover o treino "<strong>${workouts[day][wi].name}</strong>"?`, () => {
    workouts[day].splice(wi,1);
    if(!workouts[day].length) delete workouts[day];
    save(K_WORKOUTS,workouts);
    renderDayStrip(); renderDayContent(); renderStats();
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   WORKOUT MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function openWorkoutModal(day, wi) {
  wkDay=day; wkEditIdx=wi; wkFilter='Todos';
  if(wi!==null && workouts[day]?.[wi]) {
    const w=workouts[day][wi];
    document.getElementById('wk-name').value=w.name;
    wkSel=[...w.exIds];
  } else {
    document.getElementById('wk-name').value='';
    wkSel=[];
  }
  document.getElementById('wk-modal-title').textContent = wi!==null ? 'Editar Treino' : `Treino de ${DAYS_FULL[day]}`;
  renderWkFilters(); renderWkPicker(); renderWkSelected();
  document.getElementById('overlay-workout').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeWorkoutModal() {
  document.getElementById('overlay-workout').classList.remove('open');
  document.body.style.overflow='';
}

function renderWkFilters() {
  const muscles=['Todos',...new Set(library.map(e=>e.muscle))];
  document.getElementById('wk-filter-row').innerHTML=muscles.map(m=>
    `<button class="filter-btn ${m===wkFilter?'active':''}" onclick="setWkFilter('${m}')">${m}</button>`
  ).join('');
}
function setWkFilter(m){wkFilter=m;renderWkFilters();renderWkPicker();}

function renderWkPicker() {
  const list=document.getElementById('wk-ex-list');
  const empty=document.getElementById('wk-lib-empty');
  if(!library.length){list.style.display='none';empty.style.display='block';return;}
  list.style.display='flex';empty.style.display='none';
  const filtered=wkFilter==='Todos'?library:library.filter(e=>e.muscle===wkFilter);
  list.innerHTML=filtered.map(ex=>{
    const chk=wkSel.includes(ex.id);
    return `<div class="pick-item ${chk?'checked':''}" onclick="toggleWkEx('${ex.id}')">
      <span class="pick-ico">${muscleIcon(ex.muscle, ex.color)}</span>
      <div class="pick-info"><div class="pick-name">${ex.name}</div><div class="pick-sub">${ex.muscle}${ex.sets?' · '+ex.sets:''}</div></div>
      <div class="pick-check"><i class="ph-bold ${chk?'ph-check':'ph-plus'}"></i></div>
    </div>`;
  }).join('');
}

function toggleWkEx(id){
  const p=wkSel.indexOf(id);
  p===-1?wkSel.push(id):wkSel.splice(p,1);
  renderWkPicker(); renderWkSelected();
}

function renderWkSelected() {
  const wrap=document.getElementById('wk-selected-list');
  document.getElementById('wk-count').textContent=wkSel.length;
  if(!wkSel.length){wrap.innerHTML='<div class="wk-empty-sel">Nenhum exercício selecionado.</div>';return;}
  wrap.innerHTML=wkSel.map((id,pos)=>{
    const ex=library.find(e=>e.id===id); if(!ex) return '';
    const last = wkSel.length - 1;
    return `<div class="sel-item" data-pos="${pos}"
        onpointerdown="wkPointerDown(event,${pos})" onpointermove="wkPointerMove(event)"
        onpointerup="wkPointerUp(event)" onpointercancel="wkPointerCancel(event)">
      <i class="ph ph-dots-six-vertical drag-handle" aria-hidden="true"></i>
      <span class="sel-ico">${muscleIcon(ex.muscle, ex.color)}</span>
      <span class="sel-name">${ex.name}</span>
      ${ex.sets?`<span class="sel-sets">${ex.sets}</span>`:''}
      <button class="sel-move sel-up" ${pos===0?'disabled':''} onclick="moveWkSel(${pos},-1)"
        title="Subir" aria-label="Mover ${ex.name} para cima"><i class="ph-bold ph-caret-up"></i></button>
      <button class="sel-move sel-down" ${pos===last?'disabled':''} onclick="moveWkSel(${pos},1)"
        title="Descer" aria-label="Mover ${ex.name} para baixo"><i class="ph-bold ph-caret-down"></i></button>
      <button class="sel-remove" onclick="removeWkSel(${pos})" title="Remover" aria-label="Remover ${ex.name}"><i class="ph ph-x"></i></button>
    </div>`;
  }).join('');
}

function removeWkSel(pos){wkSel.splice(pos,1);renderWkPicker();renderWkSelected();}

/* ── Reordenar os exercícios do treino ────────────────────────────────────
   O arrastar nativo do HTML5 (draggable/ondrag*) não dispara em telas de
   toque, por isso a ordenação usa Pointer Events (mouse, toque e caneta) e
   os botões de subir/descer funcionam em qualquer aparelho.
   - Mouse: arraste a linha inteira.
   - Toque/caneta: arraste pela alça (⋮⋮); o resto da linha continua
     rolando a lista normalmente. */
function moveWkSel(pos, dir) {
  const to = pos + dir;
  if (to < 0 || to >= wkSel.length) return;
  const [m] = wkSel.splice(pos, 1);
  wkSel.splice(to, 0, m);
  renderWkSelected();
  const btn = document.querySelector(`.sel-item[data-pos="${to}"] .${dir < 0 ? 'sel-up' : 'sel-down'}`);
  if (btn && !btn.disabled) btn.focus({ preventScroll: true });
}

let wkDrag = null;
function wkScroller(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n;
  }
  return el;
}
function wkPointerDown(e, pos) {
  if (wkDrag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (e.target.closest('.sel-remove, .sel-move')) return;
  if (e.pointerType !== 'mouse' && !e.target.closest('.drag-handle')) return;
  const item  = e.currentTarget;
  const list  = item.parentElement;
  const items = [...list.querySelectorAll('.sel-item')];
  const gap   = items.length > 1 ? items[1].offsetTop - items[0].offsetTop - items[0].offsetHeight : 6;
  const scroller = wkScroller(list);
  wkDrag = {
    pos, over: pos, item, list, items, scroller, pid: e.pointerId,
    startY: e.clientY, lastY: e.clientY, scroll0: scroller.scrollTop,
    step: item.offsetHeight + gap,
    centers: items.map(el => el.offsetTop + el.offsetHeight / 2),
    raf: 0
  };
  try { item.setPointerCapture(e.pointerId); } catch {}
  e.preventDefault();
  item.classList.add('dragging-live');
  list.classList.add('is-sorting');
  if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
}
function wkDragUpdate() {
  const d = wkDrag; if (!d) return;
  const dy = d.lastY - d.startY + (d.scroller.scrollTop - d.scroll0);
  d.item.style.transform = `translateY(${dy}px)`;
  const c = d.centers[d.pos] + dy;
  let over = d.pos, best = Infinity;
  d.centers.forEach((cy, i) => { const dist = Math.abs(cy - c); if (dist < best) { best = dist; over = i; } });
  d.over = over;
  d.items.forEach((el, i) => {
    if (i === d.pos) return;
    let shift = 0;
    if (d.pos < over && i > d.pos && i <= over) shift = -d.step;
    else if (d.pos > over && i < d.pos && i >= over) shift = d.step;
    el.style.transform = shift ? `translateY(${shift}px)` : '';
  });
}
function wkAutoScroll() {
  const d = wkDrag; if (!d || d.raf) return;
  const tick = () => {
    d.raf = 0;
    if (wkDrag !== d) return;
    const r = d.scroller.getBoundingClientRect();
    const edge = 36; let v = 0;
    if (d.lastY < r.top + edge)         v = -Math.ceil((r.top + edge - d.lastY) / 6);
    else if (d.lastY > r.bottom - edge) v =  Math.ceil((d.lastY - (r.bottom - edge)) / 6);
    if (v) {
      const before = d.scroller.scrollTop;
      d.scroller.scrollTop += v;
      if (d.scroller.scrollTop !== before) wkDragUpdate();
      d.raf = requestAnimationFrame(tick);
    }
  };
  d.raf = requestAnimationFrame(tick);
}
function wkPointerMove(e) {
  const d = wkDrag;
  if (!d || e.pointerId !== d.pid) return;
  e.preventDefault();
  d.lastY = e.clientY;
  wkDragUpdate();
  wkAutoScroll();
}
function wkPointerEnd(e, commit) {
  const d = wkDrag;
  if (!d || e.pointerId !== d.pid) return;
  cancelAnimationFrame(d.raf);
  wkDrag = null;
  try { d.item.releasePointerCapture(e.pointerId); } catch {}
  if (commit && d.over !== d.pos) {
    const [m] = wkSel.splice(d.pos, 1);
    wkSel.splice(d.over, 0, m);
  }
  renderWkSelected(); renderWkPicker();
}
function wkPointerUp(e)     { wkPointerEnd(e, true); }
function wkPointerCancel(e) { wkPointerEnd(e, false); }

function saveWorkout() {
  const name=document.getElementById('wk-name').value.trim();
  if(!name){
    const inp=document.getElementById('wk-name');
    inp.style.borderColor='var(--red)'; inp.focus();
    setTimeout(()=>inp.style.borderColor='',1500); return;
  }
  if(!wkSel.length){alert('Selecione pelo menos um exercício.');return;}
  const obj={name,exIds:[...wkSel]};
  if(!workouts[wkDay]) workouts[wkDay]=[];
  wkEditIdx!==null?workouts[wkDay][wkEditIdx]=obj:workouts[wkDay].push(obj);
  save(K_WORKOUTS,workouts);
  closeWorkoutModal();
  renderDayStrip(); renderDayContent(); renderStats(); renderChecklist();
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVE WORKOUT MODE
   ═══════════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   CARGA E REPETIÇÕES (uma linha por exercício)
   Durante o treino cada exercício mostra "Carga (kg)" e "Repetições", já
   preenchidos com a última vez em que você fez aquele exercício. Os valores
   são gravados no histórico (dentro da "foto" do exercício) quando o treino
   é concluído. Campos vazios = nada é gravado. Cardio e mobilidade não usam.
   ═══════════════════════════════════════════════════════════════════════════ */
let activeLog = {};
const NO_LOAD_GROUPS = ['Cardio', 'Mobilidade'];
const wantsLoad = ex => !NO_LOAD_GROUPS.includes(canonMuscle(ex.muscle));

function parseKg(v) {
  const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(Math.min(n, 999) * 100) / 100 : null;
}
function parseReps(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 999) : null;
}
const fmtKg = n => String(n).replace('.', ',');
function fmtLoad(kg, reps) {
  if (kg != null && reps != null) return `${fmtKg(kg)} kg × ${reps}`;
  if (kg != null) return `${fmtKg(kg)} kg`;
  if (reps != null) return `${reps} rep${reps !== 1 ? 's' : ''}`;
  return '';
}
/* "4x10" → 10 (usado como sugestão no campo de repetições) */
function plannedReps(ex) {
  const m = String(ex.sets || '').match(/\d+\s*[x×]\s*(\d+)/i);
  return m ? m[1] : '';
}
/* Último registro de carga/reps deste exercício (mais recente primeiro). */
function lastLoadFor(ex) {
  const n = norm(ex.name);
  for (const h of history) {
    if (!Array.isArray(h.exSnap)) continue;
    const hit = h.exSnap.find(x => x && (x.kg != null || x.reps != null) &&
      ((x.id && x.id === ex.id) || norm(x.name) === n));
    if (hit) return { kg: hit.kg != null ? hit.kg : null, reps: hit.reps != null ? hit.reps : null, date: h.date };
  }
  return null;
}
function currentActiveEx() {
  return library.find(e => e.id === activeWk.exIds[activeCur]);
}
function renderLoadPanel(ex) {
  const box = document.getElementById('active-log');
  if (!wantsLoad(ex)) { box.style.display = 'none'; return; }
  box.style.display = '';
  const last = lastLoadFor(ex);
  if (!activeLog[ex.id]) {
    activeLog[ex.id] = {
      kg:   last && last.kg   != null ? fmtKg(last.kg)    : '',
      reps: last && last.reps != null ? String(last.reps) : '',
    };
  }
  document.getElementById('log-kg').value   = activeLog[ex.id].kg;
  document.getElementById('log-reps').value = activeLog[ex.id].reps;
  document.getElementById('log-reps').placeholder = plannedReps(ex) || '—';
  document.getElementById('log-last').textContent = last
    ? `Última vez: ${fmtLoad(last.kg, last.reps)} · ${bkFmtDate(last.date)}`
    : 'Primeira vez registrando este exercício';
}
function onLogInput() {
  const ex = currentActiveEx(); if (!ex || !wantsLoad(ex)) return;
  activeLog[ex.id] = {
    kg:   document.getElementById('log-kg').value,
    reps: document.getElementById('log-reps').value,
  };
}
/* Botões − e +: carga anda de 2,5 em 2,5 kg; repetições de 1 em 1. */
function stepLog(field, delta) {
  const ex = currentActiveEx(); if (!ex) return;
  const input = document.getElementById(field === 'kg' ? 'log-kg' : 'log-reps');
  let cur = field === 'kg' ? parseKg(input.value) : parseReps(input.value);
  if (cur == null) {
    if (delta < 0) return;
    cur = field === 'reps' ? (parseInt(plannedReps(ex), 10) || 0) : 0;
    if (field === 'reps' && cur) delta = 0; /* primeiro toque só aceita a sugestão do plano */
  }
  let next = Math.round((cur + delta) * 100) / 100;
  if (field === 'reps') next = Math.max(1, Math.min(999, next));
  else next = Math.max(0, Math.min(999, next));
  input.value = field === 'kg' ? fmtKg(next) : String(next);
  onLogInput();
}
/* Valores digitados → campos gravados no histórico */
function loadFieldsFor(ex) {
  const e = activeLog[ex.id];
  if (!e || !wantsLoad(ex)) return {};
  const out = {};
  const kg = parseKg(e.kg), reps = parseReps(e.reps);
  if (kg != null) out.kg = kg;
  if (reps != null) out.reps = reps;
  return out;
}

function startActiveWorkout(day, wi) {
  const w = workouts[day][wi];
  const validIds = w.exIds.filter(id=>library.find(e=>e.id===id));
  if(!validIds.length){alert('Nenhum exercício válido neste treino.');return;}
  activeWk    = {name:w.name, exIds:validIds, dayIndex:day, workoutName:w.name};
  activeCur   = 0;
  activeLog   = {};
  activeStart = Date.now();
  stopRestTimer();
  clearInterval(elapsedInterval);

  stopConfetti();
  document.getElementById('active-screen').classList.add('open');
  document.getElementById('active-finish').style.display='none';
  document.getElementById('active-ex-view').style.display='flex';
  document.body.style.overflow='hidden';
  renderActiveExercise();

  /* ── Elapsed timer: atualiza a cada segundo ── */
  elapsedInterval = setInterval(() => {
    const secs = Math.floor((Date.now() - activeStart) / 1000);
    document.getElementById('active-elapsed').textContent = formatElapsed(secs);
  }, 1000);
}

function renderActiveExercise(dir) {
  const ids  = activeWk.exIds;
  const ex   = library.find(e=>e.id===ids[activeCur]);
  if(!ex) return;

  document.getElementById('active-wk-name').textContent       = activeWk.name;
  document.getElementById('active-progress-label').textContent = `${activeCur+1} / ${ids.length}`;
  document.getElementById('active-progress-fill').style.width  = `${((activeCur+1)/ids.length)*100}%`;

  /* Transição direcional: avança desliza da direita, volta desliza da
     esquerda; entrada inicial do treino usa o fade+scale padrão. */
  const card=document.getElementById('active-ex-card');
  card.classList.remove('slide-from-right','slide-from-left');
  card.style.animation='none'; card.offsetHeight; card.style.animation='';
  if (dir === 1) card.classList.add('slide-from-right');
  else if (dir === -1) card.classList.add('slide-from-left');

  document.getElementById('active-ex-icon').innerHTML      = muscleIcon(ex.muscle, ex.color);
  document.getElementById('active-ex-name').textContent    = ex.name;
  document.getElementById('active-ex-sets').textContent    = ex.sets||'';
  document.getElementById('active-ex-tip').textContent     = ex.tip||'';
  document.getElementById('active-ex-muscle').textContent  = ex.muscle;
  document.getElementById('active-ex-muscle').style.color  = ex.color;

  renderLoadPanel(ex);

  document.getElementById('active-prev').disabled = activeCur===0;
  document.getElementById('active-next').innerHTML =
    activeCur===ids.length-1
      ? '<i class="ph ph-flag-checkered"></i> Concluir'
      : 'Próximo <i class="ph ph-arrow-right"></i>';
}

function activeNav(dir) {
  stopRestTimer();
  if(dir===1 && activeCur===activeWk.exIds.length-1) {
    finishWorkout(); return;
  }
  activeCur = Math.max(0, Math.min(activeWk.exIds.length-1, activeCur+dir));
  renderActiveExercise(dir);
}

function finishWorkout() {
  stopRestTimer();
  clearInterval(elapsedInterval);
  const totalSecs  = Math.floor((Date.now()-activeStart)/1000);
  const duration   = Math.max(1, Math.round(totalSecs/60));

  /* "Foto" dos exercícios no momento do treino: o card de detalhes continua
     mostrando nome/séries corretos mesmo se o exercício for editado ou
     apagado da biblioteca depois. */
  const exSnap = activeWk.exIds.map(id => {
    const ex = library.find(e => e.id === id);
    return ex ? { id: ex.id, name: ex.name, muscle: ex.muscle, sets: ex.sets || '', color: ex.color, ...loadFieldsFor(ex) } : null;
  }).filter(Boolean);

  const entry = {
    id:       Date.now().toString(36),
    date:     new Date().toISOString(),
    wkName:   activeWk.name,
    exIds:    [...activeWk.exIds],
    exSnap,
    duration,
    dayIndex: activeWk.dayIndex,
  };
  history.unshift(entry);
  /* Limite de 100 registros: antes de descartar o mais antigo, guarda a data
     dele para o contador "tempo treinando" não encolher. */
  while (history.length > 100) rememberTrainingStart(history.pop().date);
  save(K_HISTORY, history);

  /* Treinou hoje → hoje deixa de ser "descanso" */
  if (restDays.delete(dateKey(new Date()))) saveRestDays();

  document.getElementById('active-ex-view').style.display='none';
  document.getElementById('active-finish').style.display='flex';
  document.getElementById('active-progress-fill').style.width='100%';

  const subs=['Mandou muito bem!','Continue assim!','Cada treino conta!','Você é incrível!'];
  document.getElementById('finish-sub').textContent = subs[Math.floor(Math.random()*subs.length)];

  /* Mostra tempo formatado no resumo final */
  const timeLabel = totalSecs >= 3600
    ? formatElapsed(totalSecs)
    : `${duration} min`;

  document.getElementById('finish-stats').innerHTML = `
    <div class="finish-stat">
      <span class="finish-stat-num" data-count="${activeWk.exIds.length}">${activeWk.exIds.length}</span>
      <span class="finish-stat-lbl">Exercícios</span>
    </div>
    <div class="finish-stat">
      <span class="finish-stat-num"${totalSecs < 3600 ? ` data-count="${duration}" data-suffix=" min"` : ''}>${timeLabel}</span>
      <span class="finish-stat-lbl">Tempo</span>
    </div>`;

  spawnConfetti();
  renderHistory();
  renderStats(); renderDayStrip(); renderDayContent();
}

function closeActiveWorkout() {
  stopConfetti();
  clearInterval(elapsedInterval);
  stopRestTimer();
  document.getElementById('active-screen').classList.remove('open');
  document.body.style.overflow='';
  renderChecklist();
}

function confirmStopWorkout() {
  showConfirm('Sair do treino','Deseja sair? O progresso não será salvo no histórico.',()=>{
    clearInterval(elapsedInterval);
    stopRestTimer();
    document.getElementById('active-screen').classList.remove('open');
    document.body.style.overflow='';
  });
}

/* Rest timer */
function startRestTimer(secs) {
  stopRestTimer();
  restRemain = secs;
  document.getElementById('active-timer-mini').style.display='flex';
  updateRestUI();
  restInterval = setInterval(()=>{
    restRemain--;
    updateRestUI();
    if(restRemain<=0){ notifyTimerEnd(); stopRestTimer(); }
  },1000);
}
function stopRestTimer() {
  clearInterval(restInterval);
  const el = document.getElementById('active-timer-mini');
  if(el) el.style.display='none';
}
function updateRestUI() {
  const m=Math.floor(restRemain/60), s=restRemain%60;
  document.getElementById('active-timer-val').textContent =
    String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

/* ═══════════════════════════════════════════════════════════════════════════
   CELEBRAÇÃO DE TREINO CONCLUÍDO
   Sequência: anel que se completa → troféu → ondas de impacto → confetes
   (explosão no troféu + canhões nos cantos + chuva leve) → texto, números
   subindo e botão. Os confetes são desenhados em <canvas> com física
   (gravidade, resistência do ar, papel girando). Respeita a preferência do
   sistema por menos movimento.
   ═══════════════════════════════════════════════════════════════════════════ */
let confettiRAF = 0;
let confettiCleanup = [];

function stopConfetti() {
  cancelAnimationFrame(confettiRAF); confettiRAF = 0;
  confettiCleanup.forEach(fn => { try { fn(); } catch {} });
  confettiCleanup = [];
  const wrap = document.getElementById('confetti-wrap');
  if (wrap) wrap.innerHTML = '';
}

/* Números do resumo "sobem" de 0 até o valor final. */
function runCountUp() {
  const els = [...document.querySelectorAll('#finish-stats .finish-stat-num[data-count]')];
  if (!els.length) return;
  const fmt = (el, v) => { el.textContent = v + (el.dataset.suffix || ''); };
  els.forEach(el => fmt(el, 0));
  const start = performance.now() + 1250, dur = 900;
  let raf = 0;
  const step = now => {
    const k = Math.min(1, Math.max(0, (now - start) / dur));
    const e = 1 - Math.pow(1 - k, 3);
    els.forEach(el => fmt(el, Math.round(+el.dataset.count * e)));
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  confettiCleanup.push(() => { cancelAnimationFrame(raf); els.forEach(el => fmt(el, el.dataset.count)); });
}

function spawnConfetti() {
  stopConfetti();
  const fin  = document.getElementById('active-finish');
  const wrap = document.getElementById('confetti-wrap');
  if (!fin || !wrap) return;

  /* reinicia as animações CSS da tela de conclusão */
  fin.classList.remove('celebrate'); void fin.offsetWidth; fin.classList.add('celebrate');

  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  runCountUp();

  /* vibração curta de "vitória" (Android; iPhone não suporta) */
  const vib = setTimeout(() => {
    if (navigator.vibrate) { try { navigator.vibrate([40, 50, 40, 50, 140]); } catch {} }
  }, 750);
  confettiCleanup.push(() => clearTimeout(vib));

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, S = 1;
  const fit = () => {
    const r = wrap.getBoundingClientRect();
    W = r.width; H = r.height;
    S = Math.min(1.35, Math.max(.75, Math.min(W, H) / 420)); /* escala conforme a tela */
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  window.addEventListener('resize', fit);
  confettiCleanup.push(() => window.removeEventListener('resize', fit));

  const COLORS = ['#c8f060', '#c8f060', '#3ecfb0', '#22d3ee', '#facc15', '#f472b6', '#fb923c', '#f2efe9'];
  const SHAPES = ['rect', 'rect', 'rect', 'circle', 'ribbon', 'star'];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const parts = [];

  function add(x, y, speed, angle, extra) {
    parts.push(Object.assign({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      rot: rand(0, 6.283), vr: rand(-9, 9), flip: rand(0, 6.283), vf: rand(6, 14),
      w: rand(6, 11) * S, h: rand(3.5, 6.5) * S, color: pick(COLORS), shape: pick(SHAPES),
      sway: rand(0, 6.283), swayAmp: rand(10, 30) * S, age: 0, life: rand(2.6, 4.2)
    }, extra));
  }
  function burst() {
    const b = document.getElementById('finish-badge').getBoundingClientRect();
    const r = wrap.getBoundingClientRect();
    const ox = b.left - r.left + b.width / 2, oy = b.top - r.top + b.height / 2;
    for (let i = 0; i < 80; i++) add(ox, oy, rand(380, 980) * S, rand(0, 6.283));
  }
  function cannon(side) {
    const x = side === 0 ? W * .03 : W * .97, y = H * 1.02;
    const base = side === 0 ? -1.13 : -2.01; /* ~ -65° e -115° */
    for (let i = 0; i < 42; i++) add(x, y, rand(1250, 1950) * S, base + rand(-.2, .2));
  }
  function rain(n) {
    for (let i = 0; i < n; i++) add(rand(0, W), -14, rand(40, 120) * S, 1.5708 + rand(-.3, .3), { life: rand(3, 4.6) });
  }

  const events = [{ t: 750, fn: burst }, { t: 1000, fn: () => cannon(0) }, { t: 1000, fn: () => cannon(1) }];
  for (let i = 0; i < 14; i++) events.push({ t: 1150 + i * 110, fn: () => rain(4) });

  const G = 520, DRAG = 2.6; /* velocidade terminal ≈ G/DRAG ≈ 200 px/s: papel flutuando */
  function draw(p) {
    const fade = Math.min(1, Math.max(0, (p.life - p.age) / .6));
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = fade; ctx.fillStyle = p.color;
    if (p.shape === 'rect') {
      ctx.scale(1, Math.cos(p.flip)); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else if (p.shape === 'ribbon') {
      ctx.scale(1, Math.cos(p.flip)); ctx.fillRect(-p.w * .9, -S, p.w * 1.8, 2 * S);
    } else if (p.shape === 'circle') {
      ctx.beginPath(); ctx.arc(0, 0, p.h * .75, 0, 6.283); ctx.fill();
    } else { /* estrela de 4 pontas */
      const R = p.w * .6, r = R * .38;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 ? r : R, a = i * Math.PI / 4;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  let t0 = null, last = 0;
  const frame = now => {
    if (t0 === null) { t0 = now; last = now; }
    const el = now - t0;
    const dt = Math.min(.033, Math.max(0, (now - last) / 1000)); last = now;
    while (events.length && events[0].t <= el) events.shift().fn();

    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      p.vx -= p.vx * DRAG * dt;
      p.vy += (G * S - p.vy * DRAG) * dt;
      p.sway += 3 * dt;
      p.x += (p.vx + Math.sin(p.sway) * p.swayAmp) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt; p.flip += p.vf * dt;
      if (p.age > p.life || p.y > H + 30) { parts.splice(i, 1); continue; }
      draw(p);
    }
    if (events.length || parts.length) confettiRAF = requestAnimationFrame(frame);
    else { confettiRAF = 0; canvas.remove(); }
  };
  confettiRAF = requestAnimationFrame(frame);
}

/* ═══════════════════════════════════════════════════════════════════════════
   HISTORY
   ═══════════════════════════════════════════════════════════════════════════ */
function renderHistory() {
  const list  = document.getElementById('hist-list');
  const empty = document.getElementById('hist-empty');

  const streak = calcStreak();
  document.getElementById('streak-badge').innerHTML =
    `<span class="streak-num">${streak}</span><span class="streak-lbl"><i class="ph-fill ph-flame"></i> sequência</span>`;

  const hint = document.getElementById('hist-hint');
  if(!history.length){ list.innerHTML=''; empty.style.display='flex'; if(hint) hint.style.display='none'; return; }
  empty.style.display='none';
  if(hint) hint.style.display='flex';

  list.innerHTML = history.slice(0,50).map(h=>{
    const d = new Date(h.date);
    const allEx   = entryExercises(h).filter(e => !e.removed);
    const exNames = allEx.map(e => e.name).slice(0,4);
    const more = allEx.length - exNames.length;
    const durLabel = formatDuration(h.duration);
    const key = dateKey(h.date);
    return `<div class="hist-entry clickable" role="button" tabindex="0"
        aria-label="Ver detalhes de ${esc(h.wkName)}"
        onclick="openDayDetail('${key}')"
        onkeydown="if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openDayDetail('${key}')}">
      <div class="hist-date-col">
        <span class="hist-day-num">${d.getDate()}</span>
        <span class="hist-month">${MONTHS_SHORT[d.getMonth()]}</span>
      </div>
      <div class="hist-divider"></div>
      <div class="hist-info">
        <div class="hist-wk-name">${esc(h.wkName)}</div>
        <div class="hist-day-name">${DAYS_FULL[h.dayIndex]}</div>
        <div class="hist-ex-pills">
          ${exNames.map(n=>`<span class="hist-pill">${esc(n)}</span>`).join('')}
          ${more>0?`<span class="hist-pill">+${more}</span>`:''}
        </div>
        ${durLabel?`<div class="hist-duration"><i class="ph ph-clock" style="font-size:11px"></i> ${durLabel}</div>`:''}
      </div>
      <div class="hist-actions">
        <button class="icon-btn edit" onclick="event.stopPropagation();openHistEditModal('${h.id}')" title="Editar" aria-label="Editar registro">
          <i class="ph ph-pencil-simple"></i>
        </button>
        <button class="icon-btn del" onclick="event.stopPropagation();confirmDeleteHistory('${h.id}')" title="Apagar" aria-label="Apagar registro">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    </div>`;
  }).join('');
  reanimate(list);
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALENDÁRIO DE TREINOS (modal no Histórico)
   Mostra o mês com um círculo verde em volta de cada dia em que houve
   pelo menos um treino registrado no histórico.
   ═══════════════════════════════════════════════════════════════════════════ */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-11

function openCalendarModal() {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
  document.getElementById('overlay-calendar').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCalendarModal() {
  document.getElementById('overlay-calendar').classList.remove('open');
  syncBodyScroll();
}
function calendarPrevMonth() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}
function calendarNextMonth() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function renderCalendar() {
  document.getElementById('cal-month-label').textContent =
    `${MONTHS_FULL[calMonth]} ${calYear}`;

  /* Dias (só a data, sem hora) em que existe ao menos 1 treino no histórico */
  const trainedDays = new Set(history.map(h => dateKey(h.date)));

  const today = new Date(); today.setHours(0,0,0,0);
  const isCurrentMonth = today.getFullYear()===calYear && today.getMonth()===calMonth;

  const firstOfMonth   = new Date(calYear, calMonth, 1);
  const startWeekday   = (firstOfMonth.getDay() + 6) % 7; // 0=Seg
  const daysInMonth    = new Date(calYear, calMonth+1, 0).getDate();

  let cells = '';
  for (let i=0; i<startWeekday; i++) cells += `<div class="cal-cell cal-cell-empty"></div>`;

  for (let day=1; day<=daysInMonth; day++) {
    const dateObj  = new Date(calYear, calMonth, day);
    const key      = dateKey(dateObj);
    const trained  = trainedDays.has(key);
    const rest     = restDays.has(key);
    const isToday  = isCurrentMonth && today.getDate()===day;
    const isPast   = dateObj.getTime() < today.getTime();

    /* "Perdido" = dia útil que tinha treino programado na semana, já
       passou e não foi treinado. Dias sem treino programado (folga) e
       fins de semana nunca contam como falha — mesma regra usada na
       sequência. Hoje nunca é marcado como perdido, mesmo que
       tenha treino programado e ainda não tenha sido feito. */
    const weekday     = (dateObj.getDay() + 6) % 7;
    const isBizDay     = weekday <= 4;
    const isScheduled  = isBizDay && workouts[weekday] && workouts[weekday].length > 0;
    const missed       = isScheduled && isPast && !trained && !rest; /* descanso marcado não é falta */

    const cls = ['cal-cell'];
    if (trained) cls.push('cal-cell-trained');
    else if (rest) cls.push('cal-cell-rest');
    if (missed)  cls.push('cal-cell-missed');
    if (isToday) cls.push('cal-cell-today');
    const inner = `<span>${day}</span>${isToday?'<i class="cal-today-dot"></i>':''}`;
    if (trained || rest) {
      const lbl = `${day} de ${MONTHS_FULL[calMonth]}: ${trained ? 'treino realizado' : 'descanso'}. Toque para ver os detalhes`;
      cells += `<button type="button" class="${cls.join(' ')}" aria-label="${lbl}" onclick="openDayDetail('${key}')">${inner}</button>`;
    } else {
      cells += `<div class="${cls.join(' ')}">${inner}</div>`;
    }
  }

  document.getElementById('cal-grid').innerHTML = cells;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DETALHES DO DIA — abre ao tocar num treino do histórico ou num dia
   colorido do calendário (treino ou descanso)
   ═══════════════════════════════════════════════════════════════════════════ */

/* Exercícios de um registro: usa a "foto" salva no treino; em registros
   antigos (sem foto) busca na biblioteca atual. */
function entryExercises(h) {
  if (Array.isArray(h.exSnap) && h.exSnap.length) return h.exSnap;
  return (h.exIds || []).map(id => {
    const ex = library.find(e => e.id === id);
    return ex
      ? { name: ex.name, muscle: ex.muscle, sets: ex.sets || '', color: ex.color }
      : { name: 'Exercício removido da biblioteca', muscle: '', sets: '', color: '#7a7870', removed: true };
  });
}

function ddTile(icon, value, label) {
  return `<div class="dd-tile"><i class="ph ${icon}"></i><strong>${value}</strong><span>${label}</span></div>`;
}

function renderDayDetailEntry(h) {
  const exs     = entryExercises(h);
  const real    = exs.filter(e => !e.removed);
  const muscles = [...new Set(real.map(e => e.muscle).filter(Boolean))];
  const when    = new Date(h.date);
  const actualWd = (when.getDay() + 6) % 7;
  const planned = (h.dayIndex !== undefined && h.dayIndex !== actualWd && DAYS_FULL[h.dayIndex])
    ? `<div class="dd-planned"><i class="ph ph-calendar-blank"></i> Programado para ${DAYS_FULL[h.dayIndex]}</div>` : '';

  return `
  <section class="dd-entry">
    <h3 class="dd-wk-name">${esc(h.wkName)}</h3>
    ${planned}
    <div class="dd-tiles">
      ${ddTile('ph-timer', h.duration ? formatDuration(h.duration) : '—', 'Duração')}
      ${ddTile('ph-barbell', real.length, real.length === 1 ? 'Exercício' : 'Exercícios')}
      ${ddTile('ph-clock', `${pad2(when.getHours())}:${pad2(when.getMinutes())}`, 'Concluído às')}
    </div>
    ${muscles.length ? `<div class="dd-muscles">${muscles.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
    <div class="dd-ex-list">
      ${exs.map(e => `
        <div class="dd-ex ${e.removed ? 'removed' : ''}">
          <span class="dd-ex-ico" style="background:${esc(e.color || '#7a7870')}22">${muscleIcon(e.muscle, e.color || '#7a7870')}</span>
          <div class="dd-ex-meta">
            <div class="dd-ex-name">${esc(e.name)}</div>
            ${e.muscle ? `<div class="dd-ex-sub" style="color:${esc(e.color || 'var(--muted)')}">${esc(e.muscle)}</div>` : ''}
            ${fmtLoad(e.kg != null ? e.kg : null, e.reps != null ? e.reps : null) ? `<div class="dd-ex-load"><i class="ph-bold ph-barbell"></i> ${esc(fmtLoad(e.kg != null ? e.kg : null, e.reps != null ? e.reps : null))}</div>` : ''}
          </div>
          ${e.sets ? `<span class="dd-ex-sets">${esc(e.sets)}</span>` : ''}
        </div>`).join('')}
    </div>
    <div class="dd-actions">
      <button class="tbtn sm" type="button" onclick="editFromDetail('${h.id}')"><i class="ph ph-pencil-simple"></i> Editar</button>
      <button class="tbtn sm danger-outline" type="button" onclick="deleteFromDetail('${h.id}')"><i class="ph ph-trash"></i> Apagar</button>
    </div>
  </section>`;
}

function openDayDetail(key) {
  const date    = dateFromKey(key);
  const entries = history.filter(h => dateKey(h.date) === key)
                         .sort((a, b) => new Date(a.date) - new Date(b.date));
  const rest    = restDays.has(key);

  let html = `<div class="dd-date"><i class="ph ph-calendar-blank"></i> ${longDate(date)}</div>`;

  /* Mais de um treino no mesmo dia: mostra o total do dia primeiro */
  if (entries.length > 1) {
    const totalMin = entries.reduce((a, h) => a + (h.duration || 0), 0);
    const totalEx  = entries.reduce((a, h) => a + entryExercises(h).filter(e => !e.removed).length, 0);
    html += `<div class="dd-tiles dd-total">
      ${ddTile('ph-lightning', entries.length, 'Treinos')}
      ${ddTile('ph-barbell', totalEx, 'Exercícios')}
      ${ddTile('ph-timer', totalMin ? formatDuration(totalMin) : '—', 'Tempo total')}
    </div>`;
  }

  html += entries.map(renderDayDetailEntry).join('');

  if (rest) {
    html += `<div class="dd-rest">
      <i class="ph ph-moon-stars"></i>
      <div><strong>Dia de descanso</strong>
        <span>${entries.length ? 'Este dia também está marcado como descanso.' : 'Marcado por você. Não quebra a sua sequência.'}</span></div>
    </div>
    <button class="tbtn sm danger-outline dd-rest-btn" type="button" onclick="unmarkRestFromDetail('${key}')">
      <i class="ph ph-x-circle"></i> Remover descanso
    </button>`;
  }

  if (!entries.length && !rest) {
    html += `<div class="dd-empty">Nenhum registro neste dia.</div>`;
  }

  document.getElementById('dd-title').textContent = entries.length ? 'Detalhes do treino' : 'Dia de descanso';
  const body = document.getElementById('dd-body');
  body.innerHTML = html;
  body.scrollTop = 0;
  document.getElementById('overlay-day-detail').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDayDetail() {
  document.getElementById('overlay-day-detail').classList.remove('open');
  syncBodyScroll();
}
function editFromDetail(id)   { closeDayDetail(); openHistEditModal(id); }
function deleteFromDetail(id) { closeDayDetail(); setTimeout(() => confirmDeleteHistory(id), 180); }
function unmarkRestFromDetail(key) {
  restDays.delete(key); saveRestDays();
  closeDayDetail(); refreshAfterRestChange();
  showToast('Descanso removido.');
}

/* ── Virou o dia com o app aberto (PWA fica na memória): atualiza o que
   depende da data de hoje — "hoje", datas da semana, contador de tempo. ── */
let _lastDayKey = dateKey(new Date());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const k = dateKey(new Date());
  if (k === _lastDayKey) return;
  _lastDayKey = k;
  WEEKDAY = (new Date().getDay() + 6) % 7;
  const dn = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  document.getElementById('today-label').textContent = dn[new Date().getDay()];
  renderStats(); renderDayStrip(); renderDayContent(); renderHistory();
});

/* ── Apagar histórico ─────────────────────────────────────────────────────── */
function confirmDeleteHistory(id) {
  const h = history.find(e => e.id === id);
  if (!h) return;
  const d = new Date(h.date);
  const label = `${h.wkName} — ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  showConfirm('Apagar registro', `Apagar "<strong>${label}</strong>" do histórico?<br><span style="font-size:11px;color:var(--muted)">Isso pode afetar a contagem da sequência.</span>`, () => {
    history = history.filter(e => e.id !== id);
    save(K_HISTORY, history);
    renderHistory(); renderStats(); refreshCalendarIfOpen();
  });
}

/* ── Editar histórico ─────────────────────────────────────────────────────── */
function openHistEditModal(id) {
  const h = history.find(e => e.id === id);
  if (!h) return;
  histEditId = id;

  const d = new Date(h.date);
  // Formata data para input type="date" (YYYY-MM-DD)
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth()+1).padStart(2,'0');
  const dd   = String(d.getDate()).padStart(2,'0');

  document.getElementById('hist-edit-name').value     = h.wkName;
  document.getElementById('hist-edit-date').value     = `${yyyy}-${mm}-${dd}`;
  document.getElementById('hist-edit-duration').value = h.duration || '';
  document.getElementById('hist-edit-day').value      = String(h.dayIndex);

  document.getElementById('overlay-hist-edit').classList.add('open');
  document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('hist-edit-name').focus(), 80);
}

function closeHistEditModal() {
  document.getElementById('overlay-hist-edit').classList.remove('open');
  syncBodyScroll();
  histEditId = null;
}

function saveHistEdit() {
  const name     = document.getElementById('hist-edit-name').value.trim();
  const dateVal  = document.getElementById('hist-edit-date').value;
  const duration = parseInt(document.getElementById('hist-edit-duration').value) || null;
  const dayIndex = parseInt(document.getElementById('hist-edit-day').value);

  if(!name){ 
    const inp = document.getElementById('hist-edit-name');
    inp.style.borderColor='var(--red)'; inp.focus();
    setTimeout(()=>inp.style.borderColor='',1500); return;
  }

  const idx = history.findIndex(e => e.id === histEditId);
  if(idx === -1) return;

  // Preserva hora original, troca só a data
  const originalDate = new Date(history[idx].date);
  let newDate;
  if(dateVal) {
    const [y,m,d] = dateVal.split('-').map(Number);
    newDate = new Date(y, m-1, d,
      originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds()
    );
  } else {
    newDate = originalDate;
  }

  history[idx] = {
    ...history[idx],
    wkName:   name,
    date:     newDate.toISOString(),
    duration: duration,
    dayIndex: dayIndex,
  };

  // Reordena histórico por data (mais recente primeiro)
  history.sort((a,b) => new Date(b.date) - new Date(a.date));
  save(K_HISTORY, history);
  closeHistEditModal();
  renderHistory(); renderStats(); refreshCalendarIfOpen();
}

function confirmDeleteHistFromEdit() {
  closeHistEditModal();
  setTimeout(() => confirmDeleteHistory(histEditId), 200);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ── Sequência (streak) ───────────────────────────────────────────────────
   Regra: a sequência só considera DIAS ÚTEIS (Seg-Sex) que TÊM treino
   programado na semana (workouts[weekday].length > 0). Fins de semana e
   dias úteis sem treino programado são pulados — não quebram e não somam
   a sequência. Só quebra quando um dia útil COM treino programado passa
   sem registro no histórico. Hoje nunca quebra a sequência antes de acabar
   o dia (se ainda não treinou hoje, a contagem simplesmente começa em ontem).
   Dias marcados como DESCANSO também são pulados: não quebram e não somam.
   ─────────────────────────────────────────────────────────────────────── */
function calcStreak() {
  if(!history.length) return 0;

  const hasAnyScheduledDay = Object.values(workouts).some(w => w && w.length);

  const dayKey = d => { const c=new Date(d); c.setHours(0,0,0,0); return c.getTime(); };
  const historyDays = new Set(history.map(h => dayKey(h.date)));

  const today = new Date(); today.setHours(0,0,0,0);

  /* Sem nenhum plano semanal cadastrado: usa a lógica antiga (dias
     corridos consecutivos), para não deixar o usuário sem sequência. */
  if (!hasAnyScheduledDay) {
    const days = [...historyDays].sort((a,b)=>b-a);
    let streak=0, cur=today.getTime();
    for(const d of days){
      if(d===cur){ streak++; cur-=86400000; }
      else if(d===cur+86400000){ streak++; cur=d-86400000; }
      else break;
    }
    return streak;
  }

  let streak = 0;
  let cur = new Date(today);
  let isToday = true;
  const LIMIT = 3650; // trava de segurança (~10 anos)

  for (let i=0; i<LIMIT; i++) {
    const weekday      = (cur.getDay() + 6) % 7; // 0=Seg ... 6=Dom
    const isBusinessDay = weekday <= 4;           // Seg-Sex
    const isScheduled   = isBusinessDay && workouts[weekday] && workouts[weekday].length > 0;

    if (isScheduled) {
      const trained = historyDays.has(cur.getTime());
      if (trained) {
        streak++;
      } else if (isToday) {
        /* Hoje ainda não treinou: não quebra, apenas não conta ainda. */
      } else if (restDays.has(dateKey(cur))) {
        /* Descanso marcado pelo usuário: não quebra e também não soma. */
      } else {
        break; // dia útil com treino programado ficou sem registro → quebra
      }
    }
    /* dia sem treino programado (fim de semana ou dia útil livre): ignora */

    isToday = false;
    cur.setDate(cur.getDate() - 1);
  }

  return streak;
}


function setLibFilter(m){libFilter=m;renderLibrary();}

function setLibraryMode(mode) {
  libraryMode = mode;
  libSelectMode = false;
  libSelected.clear();
  catalogSelectMode = false;
  catalogSelected.clear();
  const search = document.getElementById('lib-search');
  if (search) { search.value = ''; search.placeholder = mode === 'catalog' ? 'Buscar no catálogo...' : 'Buscar exercício...'; }
  // Reset catalog filters when switching to catalog
  if (mode === 'catalog') {
    const cat = document.getElementById('catalog-category');
    if (cat) { cat.value = 'Todos'; }
    const mus = document.getElementById('catalog-muscle');
    if (mus) { mus.value = 'Todos'; }
    const eq = document.getElementById('catalog-equipment');
    if (eq) { eq.value = 'Todos'; }
  }
  renderLibrary();
}

function ensureCatalogFilters() {
  const cat = document.getElementById('catalog-category');
  if (!cat) return;
  // Only populate if empty (first time) to preserve user selections
  if (!cat.options.length) {
    const MUSCLE_ORDER = ['Todos','Peito','Costas','Pernas','Glúteos','Ombros','Bíceps','Tríceps','Abdômen','Cardio','Mobilidade','Corpo'];
    cat.innerHTML = ['Todos',...CATALOG_CATEGORIES].map(v=>`<option value="${v}">${v}</option>`).join('');
    document.getElementById('catalog-muscle').innerHTML = MUSCLE_ORDER.map(v=>`<option value="${v}">${v}</option>`).join('');
    document.getElementById('catalog-equipment').innerHTML = EQUIPMENT_OPTIONS.map(v=>`<option value="${v}">${v}</option>`).join('');
  }
}

function getFilteredCatalog(ignoreQuery=false) {
  ensureCatalogFilters();
  const category = document.getElementById('catalog-category')?.value || 'Todos';
  const muscle = document.getElementById('catalog-muscle')?.value || 'Todos';
  const equipment = document.getElementById('catalog-equipment')?.value || 'Todos';
  const query = ignoreQuery ? '' : norm(document.getElementById('lib-search')?.value || '');
  return exerciseCatalog.filter(ex => {
    const matchCategory = category === 'Todos' || ex.category === category;
    const matchMuscle = muscle === 'Todos' || ex.muscle === muscle;
    const matchEquipment = equipment === 'Todos' || ex.equipment === equipment;
    const matchQuery = !query || norm(ex.name).includes(query) || norm(ex.muscle).includes(query) ||
      norm(ex.category).includes(query) || norm(ex.equipment).includes(query);
    return matchCategory && matchMuscle && matchEquipment && matchQuery;
  });
}

function isCatalogImported(catId) {
  return library.some(ex => ex.catalogId === catId || ex.id === catId);
}

function catalogActionButton(ex) {
  if (isCatalogImported(ex.id)) {
    return `<button class="icon-btn imported" title="Ja importado"><i class="ph ph-check"></i></button>`;
  }
  return `<button class="icon-btn play" onclick="importCatalogExercise('${ex.id}')" title="Adicionar"><i class="ph ph-plus"></i></button>`;
}

function importCatalogExercise(catId, silent=false) {
  const ex = exerciseCatalog.find(item => item.id === catId);
  if (!ex || isCatalogImported(catId)) return false;
  library.push({
    ...ex,
    id: Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    catalogId: ex.id,
    _userImported: true,
    sets: '',
    tip: '',
  });
  save(K_LIB, library);
  if (!silent) {
    renderLibrary(); renderStats(); renderChecklist();
  }
  return true;
}

function importFilteredCatalog() {
  const items = getFilteredCatalog();
  let added = 0;
  items.forEach(ex => { if (importCatalogExercise(ex.id, true)) added++; });
  save(K_LIB, library);
  renderLibrary(); renderStats(); renderChecklist();
  showConfirm('Importados!', `${added} exercício${added!==1?'s':''} adicionado${added!==1?'s':''} à sua biblioteca.`, () => {});
}

function renderLibrary() {
  ensureCatalogFilters();
  const isCatalog = libraryMode === 'catalog';
  const query = norm(document.getElementById('lib-search')?.value || '');
  const filterEl = document.getElementById('lib-filter-row');
  const tools    = document.getElementById('catalog-tools');
  const summary  = document.getElementById('catalog-summary');

  document.getElementById('lib-mode-my')?.classList.toggle('active', !isCatalog);
  document.getElementById('lib-mode-catalog')?.classList.toggle('active', isCatalog);
  if (tools)   tools.style.display   = isCatalog ? 'grid' : 'none';
  if (summary) summary.style.display = isCatalog ? 'block' : 'none';

  /* ── Update section subtitle ── */
  const sub = document.getElementById('lib-section-sub');
  if (sub) sub.textContent = isCatalog ? 'Catálogo de exercícios' : 'Seus exercícios pessoais';

  /* ── Update toolbar actions ── */
  const toolbarActions = document.getElementById('lib-toolbar-actions');
  if (toolbarActions) {
    if (!isCatalog && libSelectMode) {
      toolbarActions.innerHTML = `
        <div class="lib-select-bar">
          <button class="tbtn sm" onclick="selectAllLib()">
            <i class="ph ph-check-square"></i> Todos
          </button>
          <button class="tbtn sm" onclick="deselectAllLib()">
            <i class="ph ph-square"></i> Nenhum
          </button>
          <button class="tbtn sm danger" onclick="deleteSelectedLib()">
            <i class="ph ph-trash"></i>${libSelected.size>0?' Excluir ('+libSelected.size+')':' Excluir'}
          </button>
          <button class="tbtn sm" onclick="exitLibSelectMode()">Cancelar</button>
        </div>`;
    } else if (isCatalog && catalogSelectMode) {
      toolbarActions.innerHTML = `
        <div class="lib-select-bar">
          <button class="tbtn sm" onclick="deselectAllCatalog()">
            <i class="ph ph-square"></i> Nenhum
          </button>
          <button class="tbtn sm" style="background:var(--accent);color:#000" onclick="importSelectedCatalog()">
            <i class="ph ph-plus-circle"></i> Adicionar (${catalogSelected.size})
          </button>
          <button class="tbtn sm" onclick="exitCatalogSelectMode()">Cancelar</button>
        </div>`;
    } else {
      toolbarActions.innerHTML = `
        <div class="lib-toolbar-actions-wrap">
          ${isCatalog
            ? `<button class="tbtn sm" onclick="enterCatalogSelectMode()" title="Selecionar para adicionar">
                <i class="ph ph-check-square"></i> Selecionar
               </button>`
            : `<button class="btn-accent" onclick="openExModal(null)">
                <i class="ph ph-plus"></i><span class="tbtn-label"> Exercício</span>
               </button>
               ${library.length > 0
                 ? `<button class="tbtn sm" onclick="enterLibSelectMode()" title="Selecionar para excluir">
                     <i class="ph ph-check-square"></i>
                    </button>`
                 : ''}`}
        </div>`;
    }
  }

  let filtered;
  if (isCatalog) {
    filtered = getFilteredCatalog();
    filterEl.innerHTML = '';
    const MAX_CATALOG = 150;
    const showing = filtered.slice(0, MAX_CATALOG);
    if (summary) summary.innerHTML = `Mostrando <strong>${showing.length}</strong> de ${filtered.length} exercícios encontrados (${exerciseCatalog.length} no total).
      ${filtered.length > 0 ? `<button class="tbtn sm" style="margin-left:8px;vertical-align:middle" onclick="importFilteredCatalog()"><i class="ph ph-plus-circle"></i> Importar filtrados</button>` : ''}
      ${filtered.length > MAX_CATALOG ? `<span style="color:var(--muted);font-size:11px;display:block;margin-top:4px">Use os filtros acima para refinar.</span>` : ''}`;
    filtered = showing;
  } else {
    const muscles = ['Todos',...new Set(library.map(e=>e.muscle))];
    filterEl.innerHTML = library.length
      ? muscles.map(m=>`<button class="filter-btn ${m===libFilter?'active':''}" onclick="setLibFilter('${m}')">${m}</button>`).join('')
      : '';
    filtered = libFilter==='Todos' ? library : library.filter(e=>e.muscle===libFilter);
    if (query) filtered = filtered.filter(e=>
      norm(e.name).includes(query) ||
      norm(e.muscle).includes(query) ||
      norm(e.category).includes(query) ||
      norm(e.equipment).includes(query)
    );
  }

  const grid  = document.getElementById('lib-grid');
  const empty = document.getElementById('lib-empty');
  if (!isCatalog && !library.length) { grid.style.display='none'; empty.style.display='flex'; return; }
  grid.style.display='grid'; empty.style.display='none';

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted);font-size:13px">Nenhum exercício encontrado.</div>`;
    reanimate(grid);
    return;
  }

  grid.innerHTML = filtered.map(ex => {
    if (isCatalog) {
      const imported   = isCatalogImported(ex.id);
      const isSelCat   = catalogSelected.has(ex.id);
      if (catalogSelectMode) {
        return `<div class="lib-card lib-card-selectable ${isSelCat?'lib-card-selected':''} ${imported?'lib-card-imported':''}"
            data-cat-id="${ex.id}"
            onclick="toggleCatalogSelect('${ex.id}')">
          <div class="lib-card-top">
            <span class="lib-card-icon">${muscleIcon(ex.muscle, ex.color)}</span>
            <div class="lib-card-actions" style="opacity:1">
              <div class="lib-card-checkbox ${isSelCat?'checked':''}">
                ${isSelCat?'<i class="ph ph-check"></i>':''}
              </div>
            </div>
          </div>
          <div class="lib-card-name">${ex.name}</div>
          <div class="lib-card-muscle"><span class="muscle-dot" style="background:${ex.color}"></span>${ex.muscle}</div>
          ${ex.category ? `<div class="lib-card-sets">${ex.category}${ex.equipment?' · '+ex.equipment:''}</div>` : ''}
          ${imported ? `<div class="lib-card-tip" style="color:var(--teal)"><i class="ph-bold ph-check"></i> Já na biblioteca</div>` : ''}
        </div>`;
      }
      return `<div class="lib-card">
        <div class="lib-card-top">
          <span class="lib-card-icon">${muscleIcon(ex.muscle, ex.color)}</span>
          <div class="lib-card-actions" style="opacity:1">
            <button class="icon-btn edit" onclick="editCatalogExercise('${ex.id}')" title="Editar e importar">
              <i class="ph ph-pencil-simple"></i>
            </button>
            ${imported
              ? `<button class="icon-btn imported" title="Já importado"><i class="ph ph-check"></i></button>`
              : `<button class="icon-btn play" onclick="quickAddCatalogEx('${ex.id}')" title="Adicionar à biblioteca">
                  <i class="ph ph-plus"></i>
                </button>`}
          </div>
        </div>
        <div class="lib-card-name">${ex.name}</div>
        <div class="lib-card-muscle"><span class="muscle-dot" style="background:${ex.color}"></span>${ex.muscle}</div>
        ${ex.category ? `<div class="lib-card-sets">${ex.category}${ex.equipment?' · '+ex.equipment:''}</div>` : ''}
        ${imported ? `<div class="lib-card-tip" style="color:var(--teal)"><i class="ph-bold ph-check"></i> Na sua biblioteca</div>` : ''}
      </div>`;
    } else {
      const isSelected = libSelected.has(ex.id);
      return `<div class="lib-card ${libSelectMode?'lib-card-selectable':''} ${isSelected?'lib-card-selected':''}"
          data-lib-id="${ex.id}"
          ${libSelectMode ? `onclick="toggleLibSelect('${ex.id}')"` : ''}>
        <div class="lib-card-top">
          <span class="lib-card-icon">${muscleIcon(ex.muscle, ex.color)}</span>
          <div class="lib-card-actions" ${libSelectMode?'style="opacity:1"':''}>
            ${libSelectMode
              ? `<div class="lib-card-checkbox ${isSelected?'checked':''}">
                  ${isSelected?'<i class="ph ph-check"></i>':''}
                </div>`
              : `<button class="icon-btn edit" onclick="openExModal('${ex.id}')" title="Editar">
                  <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="icon-btn del" onclick="confirmDeleteEx('${ex.id}')" title="Remover">
                  <i class="ph ph-trash"></i>
                </button>`}
          </div>
        </div>
        <div class="lib-card-name">${ex.name}</div>
        <div class="lib-card-muscle"><span class="muscle-dot" style="background:${ex.color}"></span>${ex.muscle}</div>
        ${ex.sets?`<div class="lib-card-sets">${ex.sets}</div>`:''}
        ${ex.tip?`<div class="lib-card-tip">${ex.tip}</div>`:''}
      </div>`;
    }
  }).join('');
  reanimate(grid);
}

function confirmDeleteEx(id) {
  const ex=library.find(e=>e.id===id);
  showConfirm('Remover exercício',`Remover "<strong>${ex?.name}</strong>" da biblioteca?`,()=>{
    library=library.filter(e=>e.id!==id);
    save(K_LIB,library);
    Object.keys(workouts).forEach(day=>{
      workouts[day]=workouts[day].map(w=>({...w,exIds:w.exIds.filter(eid=>eid!==id)}));
    });
    save(K_WORKOUTS,workouts);
    renderLibrary(); renderStats();
  });
}

/* ─── Library selection mode ─────────────────────────────────────────────── */
function enterLibSelectMode() {
  libSelectMode = true;
  libSelected.clear();
  renderLibrary();
}

function exitLibSelectMode() {
  libSelectMode = false;
  libSelected.clear();
  renderLibrary();
}

function toggleLibSelect(id) {
  libSelected.has(id) ? libSelected.delete(id) : libSelected.add(id);
  // Update just the card and the delete button count instead of full re-render
  const card = document.querySelector(`.lib-card[data-lib-id="${id}"]`);
  if (card) {
    const isSelected = libSelected.has(id);
    card.classList.toggle('lib-card-selected', isSelected);
    const cb = card.querySelector('.lib-card-checkbox');
    if (cb) { cb.className = `lib-card-checkbox${isSelected?' checked':''}`; cb.innerHTML = isSelected?'<i class="ph ph-check"></i>':''; }
  }
  // Update the delete button count
  const delBtn = document.querySelector('.lib-select-bar .danger');
  if (delBtn) delBtn.innerHTML = `<i class="ph ph-trash"></i>${libSelected.size>0?' Excluir ('+libSelected.size+')':' Excluir'}`;
}

function selectAllLib() {
  const query = norm(document.getElementById('lib-search')?.value||'');
  let filtered = libFilter==='Todos' ? library : library.filter(e=>e.muscle===libFilter);
  if (query) filtered = filtered.filter(e=>norm(e.name).includes(query)||norm(e.muscle).includes(query));
  filtered.forEach(ex => libSelected.add(ex.id));
  renderLibrary();
}

function deselectAllLib() {
  libSelected.clear();
  renderLibrary();
}

function deleteSelectedLib() {
  if (!libSelected.size) return;
  const count = libSelected.size;
  showConfirm(
    'Excluir selecionados',
    `Excluir <strong>${count} exercício${count>1?'s':''}</strong> da biblioteca?<br><span style="font-size:11px;color:var(--muted)">Eles serão removidos de todos os treinos.</span>`,
    () => {
      const toDelete = new Set(libSelected);
      library = library.filter(e => !toDelete.has(e.id));
      Object.keys(workouts).forEach(day => {
        workouts[day] = workouts[day].map(w => ({
          ...w, exIds: w.exIds.filter(eid => !toDelete.has(eid))
        }));
        workouts[day] = workouts[day].filter(w => w.exIds.length > 0);
        if (!workouts[day].length) delete workouts[day];
      });
      save(K_LIB, library);
      save(K_WORKOUTS, workouts);
      libSelectMode = false;
      libSelected.clear();
      renderLibrary(); renderStats(); renderDayStrip(); renderDayContent();
    }
  );
}

/* ─── Catalog selection mode ─────────────────────────────────────────────── */
function enterCatalogSelectMode() {
  catalogSelectMode = true;
  catalogSelected.clear();
  renderLibrary();
}

function exitCatalogSelectMode() {
  catalogSelectMode = false;
  catalogSelected.clear();
  renderLibrary();
}

function toggleCatalogSelect(id) {
  const ex = exerciseCatalog.find(e => e.id === id);
  if (!ex || isCatalogImported(id)) return;
  catalogSelected.has(id) ? catalogSelected.delete(id) : catalogSelected.add(id);
  // Update just the card UI
  const card = document.querySelector(`.lib-card[data-cat-id="${id}"]`);
  if (card) {
    const isSelCat = catalogSelected.has(id);
    card.classList.toggle('lib-card-selected', isSelCat);
    const cb = card.querySelector('.lib-card-checkbox');
    if (cb) { cb.className = `lib-card-checkbox${isSelCat?' checked':''}`; cb.innerHTML = isSelCat?'<i class="ph ph-check"></i>':''; }
  }
  // Update the add button count
  const addBtn = document.querySelector('.lib-select-bar button[onclick="importSelectedCatalog()"]');
  if (addBtn) addBtn.innerHTML = `<i class="ph ph-plus-circle"></i> Adicionar (${catalogSelected.size})`;
}

function deselectAllCatalog() {
  catalogSelected.clear();
  renderLibrary();
}

function importSelectedCatalog() {
  if (!catalogSelected.size) return;
  const count = catalogSelected.size;
  let added = 0;
  catalogSelected.forEach(id => { if (importCatalogExercise(id, true)) added++; });
  save(K_LIB, library);
  catalogSelectMode = false;
  catalogSelected.clear();
  renderLibrary(); renderStats(); renderChecklist();
  showConfirm('Adicionados!', `${added} exercício${added!==1?'s':''} adicionado${added!==1?'s':''} à sua biblioteca.`, () => {});
}

/* ─── Catalog quick-add and edit ─────────────────────────────────────────── */
function quickAddCatalogEx(catId) {
  const added = importCatalogExercise(catId, false);
  if (!added) renderLibrary();
}

function editCatalogExercise(catId) {
  const cat = exerciseCatalog.find(e => e.id === catId);
  if (!cat) return;
  catalogEditId = catId;
  exEditId = null;
  document.getElementById('ex-modal-title').innerHTML =
    `<span>Editar do Catálogo</span>
     <span class="modal-edit-badge" style="margin-left:8px"><i class="ph ph-pencil-simple"></i> Importar personalizado</span>`;
  const catSelect = document.getElementById('ex-category');
  if (catSelect) catSelect.innerHTML = CATALOG_CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
  document.getElementById('ex-name').value      = cat.name;
  fillExSelect('muscle', cat.muscle);
  fillExSelect('equipment', cat.equipment);
  document.getElementById('ex-sets').value      = cat.sets || '';
  document.getElementById('ex-color').value     = cat.color || '#c8f060';
  document.getElementById('ex-tip').value       = cat.tip || '';
  if (catSelect) catSelect.value = cat.category || 'Academia';
  updateExIconPreview();
  document.getElementById('overlay-ex').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('ex-name').focus(), 80);
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXERCISE MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function openExModal(id) {
  exEditId=id;
  document.getElementById('ex-modal-title').textContent=id?'Editar Exercício':'Novo Exercício';
  const catSelect = document.getElementById('ex-category');
  if (catSelect) catSelect.innerHTML = CATALOG_CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
  if(id){
    const ex=library.find(e=>e.id===id);
    if(ex){
      document.getElementById('ex-name').value  =ex.name;
      fillExSelect('muscle', ex.muscle);
      fillExSelect('equipment', ex.equipment);
      document.getElementById('ex-sets').value  =ex.sets||'';
      document.getElementById('ex-color').value =ex.color||'#c8f060';
      document.getElementById('ex-tip').value   =ex.tip||'';
      if (catSelect) catSelect.value = ex.category || 'Academia';
    }
  } else {
    ['ex-name','ex-sets','ex-tip'].forEach(i=>document.getElementById(i).value='');
    fillExSelect('muscle', '');
    fillExSelect('equipment', '');
    document.getElementById('ex-color').value='#c8f060';
    if (catSelect) catSelect.value = 'Academia';
  }
  updateExIconPreview();
  document.getElementById('overlay-ex').classList.add('open');
  document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('ex-name').focus(),80);
}
/* ── Grupo muscular e equipamento: listas de sugestão (como a Categoria) ──
   Mostra as opções padrão + as que você já usa na biblioteca. "Outro..."
   libera um campo de texto para criar um valor novo. */
function exSelectOptions(field) {
  const used = library.map(e => field === 'muscle' ? e.muscle : e.equipment).filter(Boolean);
  const base = field === 'muscle'
    ? GROUP_KEYS
    : EQUIPMENT_OPTIONS.filter(o => o !== 'Todos');
  const out = [...base];
  used.forEach(u => { if (!out.some(o => norm(o) === norm(u))) out.push(u); });
  return out;
}
function fillExSelect(field, value) {
  const sel   = document.getElementById('ex-' + field);
  const other = document.getElementById('ex-' + field + '-other');
  if (!sel) return;
  const list = exSelectOptions(field);
  const v = String(value || '').trim();
  if (v && !list.some(o => norm(o) === norm(v))) list.push(v);
  const placeholder = field === 'muscle' ? 'Selecione o grupo' : 'Sem equipamento';
  sel.innerHTML = `<option value="">${placeholder}</option>`
    + list.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')
    + '<option value="__other__">Outro...</option>';
  sel.value = v ? list.find(o => norm(o) === norm(v)) : '';
  if (other) { other.style.display = 'none'; other.value = ''; }
}
function exFieldValue(field) {
  const sel = document.getElementById('ex-' + field);
  if (!sel) return '';
  if (sel.value === '__other__') {
    return (document.getElementById('ex-' + field + '-other')?.value || '').trim();
  }
  return sel.value.trim();
}
function onExSelectChange(field) {
  const sel   = document.getElementById('ex-' + field);
  const other = document.getElementById('ex-' + field + '-other');
  const isOther = sel.value === '__other__';
  if (other) {
    other.style.display = isOther ? '' : 'none';
    if (isOther) setTimeout(() => other.focus(), 40);
  }
  updateExIconPreview();
}

/* Mostra no formulário qual ícone o exercício terá (definido pelo grupo). */
function updateExIconPreview() {
  const box = document.getElementById('ex-icon-preview');
  if (!box) return;
  const muscle = exFieldValue('muscle');
  const color  = document.getElementById('ex-color').value || '#c8f060';
  box.innerHTML = muscleIcon(muscle, color) + '<span>Automático pelo grupo</span>';
}
function closeExModal(){
  document.getElementById('overlay-ex').classList.remove('open');
  document.body.style.overflow='';
  catalogEditId = null;
}
function saveExercise(){
  const name  =fixPt(document.getElementById('ex-name').value.trim());
  const muscle=canonMuscle(exFieldValue('muscle'));
  if(!name||!muscle){
    const muscleEl = document.getElementById('ex-muscle').value==='__other__'
      ? document.getElementById('ex-muscle-other') : document.getElementById('ex-muscle');
    [document.getElementById('ex-name'), muscleEl].forEach(el=>{
      if(!el.value.trim()){el.style.borderColor='var(--red)';el.focus();}
      setTimeout(()=>el.style.borderColor='',1500);
    });
    return;
  }
  const ex={
    id:    exEditId||Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    name, muscle,
    sets:  document.getElementById('ex-sets').value.trim()||'',
    color: document.getElementById('ex-color').value||'#c8f060',
    tip:   document.getElementById('ex-tip').value.trim()||'',
    category: document.getElementById('ex-category')?.value || 'Academia',
    equipment: canonEquip(exFieldValue('equipment')),
    _userImported: true,
  };
  if(exEditId){const i=library.findIndex(e=>e.id===exEditId);if(i!==-1){ex.catalogId=library[i].catalogId; ex._userImported=library[i]._userImported; library[i]=ex;}}
  else {
    if (catalogEditId) { ex.catalogId = catalogEditId; ex._userImported = true; }
    library.push(ex);
  }
  save(K_LIB,library);
  catalogEditId = null;
  closeExModal();
  renderLibrary(); renderStats(); renderDayContent(); renderChecklist();
}

/* ═══════════════════════════════════════════════════════════════════════════
   TIMER (descanso)
   ═══════════════════════════════════════════════════════════════════════════ */
function renderTimerPresets(){
  document.getElementById('preset-row').innerHTML=PRESETS.map(s=>`
    <div class="preset-btn ${tTotal===s&&tRemain===s?'active':''}" onclick="setPreset(${s})">
      ${s<60?s+'s':s===60?'1min':s===90?'1m30':'2min'}
    </div>`).join('');
}
function setPreset(s){
  clearInterval(tInterval);tTotal=s;tRemain=s;tRunning=false;
  document.getElementById('start-btn').textContent='Iniciar';
  document.getElementById('timer-status').textContent='PRONTO';
  updateTimerUI();renderTimerPresets();
}
function toggleTimer(){
  if(tRunning){
    clearInterval(tInterval);tRunning=false;
    document.getElementById('start-btn').textContent='Retomar';
    document.getElementById('timer-status').textContent='PAUSADO';
  } else {
    if(tRemain<=0) tRemain=tTotal;
    tRunning=true;
    document.getElementById('start-btn').textContent='Pausar';
    document.getElementById('timer-status').textContent='CONTANDO';
    tInterval=setInterval(()=>{
      tRemain--;updateTimerUI();
      if(tRemain<=0){
        clearInterval(tInterval);tRunning=false;
        document.getElementById('start-btn').textContent='Iniciar';
        document.getElementById('timer-status').textContent='PRONTO!';
        document.getElementById('ring').style.stroke='var(--red)';
        setTimeout(()=>document.getElementById('ring').style.stroke='var(--accent)',1400);
        notifyTimerEnd();
      }
    },1000);
  }
}
function resetTimer(){
  clearInterval(tInterval);tRunning=false;tRemain=tTotal;
  document.getElementById('start-btn').textContent='Iniciar';
  document.getElementById('timer-status').textContent='PRONTO';
  updateTimerUI();
}
function addTimerMinute(){tTotal+=60;tRemain+=60;updateTimerUI();}
function updateTimerUI(){
  const m=Math.floor(tRemain/60),s=tRemain%60;
  document.getElementById('timer-display').textContent=
    String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  const pct=tTotal>0?tRemain/tTotal:1;
  document.getElementById('ring').setAttribute('stroke-dashoffset',534*(1-pct));
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIRM DIALOG
   ═══════════════════════════════════════════════════════════════════════════ */
let confirmCallback=null;
function showConfirm(title,msg,cb){
  confirmCallback=cb;
  document.getElementById('confirm-title').textContent=title;
  document.getElementById('confirm-msg').innerHTML=msg;
  document.getElementById('confirm-ok').onclick=()=>{cb();closeConfirm();};
  document.getElementById('overlay-confirm').classList.add('open');
}
function closeConfirm(){
  document.getElementById('overlay-confirm').classList.remove('open');
  confirmCallback=null;
}