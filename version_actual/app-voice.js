// FIX-LOGO: Resolver favicon/logo de cuenta por URL o nombre conocido
function _getCuentaFaviconUrl(c) {
  if (!c) return null;

  // 1. logo_url manual tiene prioridad
  if (c.logo_url) {
    const raw = c.logo_url.trim();
    // Si ya es una URL de favicon de Google o cualquier URL http → usar directo
    if (raw.startsWith('http')) return raw;
    // Si es solo un dominio (ej: "zinli.com") → convertir a favicon URL
    if (raw.includes('.') && raw.length > 3) {
      return `https://www.google.com/s2/favicons?domain=${raw}&sz=128`;
    }
  }

  // 2. Favicon desde website_url o banco_pais si contienen dominio
  const urlSrc = c.website_url || (c.banco_pais && c.banco_pais.includes('.') ? c.banco_pais : '');
  if (urlSrc) {
    try {
      const domain = urlSrc.replace(/https?:\/\//,'').split('/')[0].replace(/^www\./,'').split(' ')[0];
      if (domain && domain.includes('.')) return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch(e) {}
  }
  // 3. Mapa de nombres comunes venezolanos → dominio
  const BANK_DOMAINS = {
    'zinli':'zinli.com','paypal':'paypal.com','zelle':'zellepay.com',
    'binance':'binance.com','reserve':'reserve.org','saldo':'saldo.com.ve',
    'bancamiga':'bancamiga.com','banesco':'banesco.com','mercantil':'mercantilbanco.com',
    'provincial':'bbva.com','exterior':'bancoexterior.com','venezuela':'bancodevenezuela.com','bdv':'bancodevenezuela.com','banco de venezuela':'bancodevenezuela.com',
    'bicentenario':'bancobicentenario.com.ve','tesoro':'btesoro.com.ve',
    'bfc':'bfc.com.ve','caroní':'bancocaroni.com.ve','sofitasa':'sofitasa.com',
    'bod':'bod.com.ve','fondo común':'foncomun.com','activo':'bancoactivo.com',
    'mi banco':'mibanco.com.ve','del sur':'bancosur.com',
    'plaza':'bancoplaza.com','banplus':'banplus.com.ve',
    'bancrecer':'bancrecer.com','100%banco':'100xbanco.com',
    'stripe':'stripe.com','cash app':'cash.app','apple pay':'apple.com',
    'pago móvil':'bancouniversal.com.ve','nequi':'nequi.com',
    'mercado pago':'mercadopago.com','bbva':'bbva.com',
    'wise':'wise.com','revolut':'revolut.com','transferwise':'wise.com'
  };
  const nameL = (c.nombre||'').toLowerCase().trim();
  for (const [k, domain] of Object.entries(BANK_DOMAINS)) {
    if (nameL.includes(k)) return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }
  // 4. Intentar con el nombre directamente como dominio (ej: "Zinli" → zinli.com)
  if (nameL.length > 2 && !nameL.includes(' ')) {
    return `https://www.google.com/s2/favicons?domain=${nameL}.com&sz=128`;
  }
  return null;
}



// ══════════════════════════════════════════════════════════
//  V3: Voice Landing, Transfer Rial, Plantilla IA,
//      Cuenta General, Hero fixes, Currency sync
// ══════════════════════════════════════════════════════════

// ── FIX HERO BALANCE — always show monthly data ───────────
// BATCH-IV — Hero balance SIEMPRE = ingresos − gastos + ajustes del mes actual
// (nunca saldo de cuentas — el usuario pidió explícitamente el saldo disponible del mes)
const _origUpdateHero = window.updateHeroBalance;
window.updateHeroBalance = function() {
  const heroInt = document.getElementById('hero-int');
  const heroDec = document.getElementById('hero-dec');
  const heroBS  = document.getElementById('hero-bs');
  const heroSym = document.getElementById('hero-symbol');

  // FIX-HIDE: ocultar todos los montos si _hideAmounts está activo
  if (window._hideAmounts) {
    if(heroSym) heroSym.textContent = '';
    if(heroInt) heroInt.textContent = '••••';
    if(heroDec) heroDec.textContent = '';
    if(heroBS)  heroBS.textContent  = 'Bs ••••';
    const mobInc = document.getElementById('mob-inc-val');
    const mobExp = document.getElementById('mob-exp-val');
    if(mobInc) mobInc.textContent = '••••••';
    if(mobExp) mobExp.textContent = '••••••';
    const badge = document.getElementById('cuentas-total-badge');
    if(badge && window.CUENTAS) badge.textContent = CUENTAS.length+' cuenta'+(CUENTAS.length!==1?'s':'');
    renderWalletCards();
    return;
  }

  const d = EXCEL_DATA[currentMonth];
  // Siempre usar el balance mensual (ingresos - gastos + ajustes)
  const totalUSD = d ? (d.balance || 0) : 0;
  const cur = window.currentCurrency || 'USD';
  let dispVal = totalUSD;
  let sym = '$';
  if(cur === 'BS') { dispVal = totalUSD * (rateBCV||1); sym = 'Bs'; }
  else if(cur === 'EUR') { dispVal = totalUSD / ((rateEUR||1) / (rateBCV||1) || 1); sym = '€'; }
  if(heroSym) heroSym.textContent = sym;
  // FIX-SIGN: mostrar signo negativo explícito cuando el balance es negativo
  const absVal = Math.abs(dispVal);
  if(heroInt) heroInt.textContent = (dispVal < 0 ? '-' : '') + Math.floor(absVal);
  if(heroDec) heroDec.textContent = '.' + (absVal%1).toFixed(2).slice(2);
  if(heroBS && cur === 'USD') heroBS.textContent = 'Bs ' + (totalUSD*(rateBCV||1)).toFixed(2);
  else if(heroBS && cur === 'BS') heroBS.textContent = '$ ' + totalUSD.toFixed(2);
  // Always sync inc/exp cards from monthly data
  if(d) {
    const mobInc = document.getElementById('mob-inc-val');
    const mobExp = document.getElementById('mob-exp-val');
    let inc = d.ingresos||0, exp = d.gastos||0;
    if(cur === 'BS') { inc*=(rateBCV||1); exp*=(rateBCV||1); }
    if(mobInc) mobInc.textContent = (cur==='BS'?'Bs ':'$') + inc.toFixed(2);
    if(mobExp) mobExp.textContent = (cur==='BS'?'Bs ':'$') + exp.toFixed(2);
  }
  // Badge
  const badge = document.getElementById('cuentas-total-badge');
  if(badge && CUENTAS) badge.textContent = CUENTAS.length + ' cuenta'+(CUENTAS.length!==1?'s':'');
};

// ── HERO CURRENCY PILLS ───────────────────────────────────
window.currentCurrency = 'USD';
function heroSetCurrency(cur) {
  window.currentCurrency = cur;
  ['USD','BS','EUR'].forEach(c => {
    const el = document.getElementById('pill-'+c);
    if(el) el.classList.toggle('active', c===cur);
  });
  setCurrency(cur); // sync main dashboard
  updateHeroBalance();
  renderMobileRecentTxn();
}
// Sync hero pills when main currency changes
const _origSetCurrency = typeof setCurrency==='function' ? setCurrency : null;
if(_origSetCurrency) {
  window.setCurrency = function(cur) {
    window.currentCurrency = cur;
    _origSetCurrency.call(this, cur);
    ['USD','BS','EUR'].forEach(c=>{
      const el=document.getElementById('pill-'+c);
      if(el) el.classList.toggle('active',c===cur);
    });
    updateHeroBalance();
  };
}

// ── CUENTA GENERAL VIRTUAL ────────────────────────────────
function renderWalletCards() {
  const container = document.getElementById('wallet-cards-container');
  if(!container) return;
  const hide = !!window._hideAmounts;
  let cards = [...(CUENTAS||[])];
  if(!cards.length) {
    const d = EXCEL_DATA[currentMonth];
    const bal = d ? (d.balance||0) : 0;
    container.innerHTML = `
      <div class="wallet-card general" onclick="openModalCuentas()" style="background:#13181f;border:1px dashed #30363d;border-radius:18px;padding:13px 14px;width:150px;flex-shrink:0;cursor:pointer">
        <div class="wallet-card-top">
          <div class="wallet-logo" style="background:#21262d;border:1px solid #30363d;color:#8b949e;font-size:12px">💰</div>
          <div>
            <div class="wallet-name">General</div>
            <div class="wallet-owner" style="color:#3fb950;font-size:9px">+ Agregar cuenta</div>
          </div>
        </div>
        <div class="wallet-amount" style="color:${bal>=0?'#3fb950':'#f85149'}">${hide ? '••••' : '$'+bal.toFixed(2)}</div>
      </div>`;
    return;
  }
  container.innerHTML = cards.map(c => {
    const bal = calcCuentaBalance(c);
    const balBs = (bal*(rateBCV||1)).toFixed(0);
    // FIX-LOGO: obtener favicon inteligente por URL o nombre de banco conocido
    const faviconUrl = _getCuentaFaviconUrl(c);
    const logoHtml = faviconUrl
      ? `<img src="${faviconUrl}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="${escHtml(c.nombre)}" style="width:100%;height:100%;object-fit:cover;border-radius:9px"><span style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:16px;font-weight:800;color:#fff">${escHtml(c.nombre.charAt(0).toUpperCase())}</span>`
      : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:16px;font-weight:800;color:#fff">${escHtml(c.nombre.charAt(0).toUpperCase())}</span>`;
    const bg = hexDim(c.color);
    return `
      <div class="wallet-card" style="background:${bg};border:1px solid ${c.color}28;border-radius:18px;padding:13px 14px;width:134px;cursor:pointer;transition:transform .15s"
           onclick="openCuentaDetail('${escHtml(c.id)}')"
           onmousedown="this.style.transform='scale(.97)'" onmouseup="this.style.transform=''">
        <button class="wallet-card-del" onclick="event.stopPropagation();deleteCuentaFromDash('${escHtml(c.id)}')" title="Eliminar">✕</button>
        <div class="wallet-card-top">
          <div class="wallet-logo" style="background:${c.color};overflow:hidden">${logoHtml}</div>
          <div>
            <div class="wallet-name">${escHtml(c.nombre)}</div>
            <div class="wallet-owner">${escHtml(c.owner||'')}</div>
          </div>
        </div>
        <div class="wallet-amount" style="color:${c.color}">${hide ? '••••' : '$'+bal.toFixed(2)}</div>
        <div style="font-size:9px;color:${c.color}88;margin-top:1px">${hide ? 'Bs ••••' : 'Bs '+parseInt(balBs).toLocaleString()}</div>
      </div>`;
  }).join('');
}

// ══ VOICE LANDING ═════════════════════════════════════════
let _voiceLandingRec = null;
let _voiceLandingTimer = null;
let _voiceLandingSec = 0;

function openVoiceLanding() {
  if(currentUser) {
    const name = getDisplayName(currentUser.email).split(' ')[0];
    const greet = document.getElementById('voice-greeting-name');
    if(greet) greet.textContent = 'Hola '+name+',';
  }
  // Reset preview area
  const previewArea = document.getElementById('voice-preview-area');
  if(previewArea) previewArea.style.display='none';
  const greetEl = document.getElementById('voice-greeting-area');
  const examplesEl = document.getElementById('voice-examples-area');
  if(greetEl) greetEl.style.display='flex';
  if(examplesEl) examplesEl.style.display='flex';
  const statusEl = document.getElementById('voice-status-text');
  if(statusEl) statusEl.textContent = 'Toca el micrófono para empezar';
  _voiceProcessedData = null;
  lockScroll(); // FIX-XVIII-1
  document.getElementById('modal-voice-landing').classList.add('open');
  haptic && haptic('light');
  // Load IA chips from patterns (same logic as plantilla IA)
  loadVoiceIAChips();
}

async function loadVoiceIAChips() {
  const chipsDiv = document.getElementById('voice-ia-chips');
  if(!chipsDiv) return;
  chipsDiv.innerHTML = '';
  const d = EXCEL_DATA[currentMonth];
  if(!d || !d.transactions?.length) return;
  // Find top 3 frequent descriptions
  const freq = {};
  (d.transactions||[]).forEach(t=>{ freq[t.desc] = (freq[t.desc]||0)+1; });
  const top3 = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([desc])=>desc);
  top3.forEach(desc => {
    const btn = document.createElement('button');
    btn.className = 'voice-chip';
    btn.style.cssText = 'background:rgba(63,185,80,.1);border-color:rgba(63,185,80,.3);color:#3fb950';
    btn.textContent = '⭐ ' + (desc.length > 18 ? desc.slice(0,18)+'…' : desc);
    btn.onclick = () => voiceLandingChip(desc);
    chipsDiv.appendChild(btn);
  });
}
function closeVoiceLanding() {
  document.getElementById('modal-voice-landing').classList.remove('open');
  stopVoiceLandingMic();
  unlockScroll(); // FIX-XVIII-1
}

function toggleVoiceLandingMic() {
  if(_voiceLandingRec) { stopVoiceLandingMic(); return; }
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRec) { toast('Usa Chrome para registro por voz','err'); return; }
  const micBtn    = document.getElementById('voice-landing-mic');
  const waveEl    = document.getElementById('voice-wave-anim');
  const greetEl   = document.getElementById('voice-greeting-area');
  const statusEl  = document.getElementById('voice-status-text');
  const examplesEl= document.getElementById('voice-examples-area');
  micBtn.classList.add('recording');
  micBtn.textContent = '⏹';
  if(waveEl)    { waveEl.style.display='flex'; }
  if(greetEl)   { greetEl.style.display='none'; }
  if(examplesEl){ examplesEl.style.display='none'; }
  if(statusEl)  { statusEl.textContent = 'Escuchando...'; }
  _voiceLandingSec = 0;
  _voiceLandingTimer = setInterval(()=>{
    _voiceLandingSec++;
    if(statusEl) statusEl.textContent = `Escuchando... ${_voiceLandingSec}s`;
  }, 1000);
  _voiceLandingRec = new SpeechRec();
  _voiceLandingRec.lang = 'es-VE';
  _voiceLandingRec.interimResults = false;
  _voiceLandingRec.maxAlternatives = 1;
  _voiceLandingRec.start();
  haptic && haptic('medium');
  _voiceLandingRec.onresult = async (ev) => {
    const spoken = ev.results[0][0].transcript;
    stopVoiceLandingMic(false);
    const statusEl2 = document.getElementById('voice-status-text');
    if(statusEl2) statusEl2.textContent = `"${spoken}" — procesando...`;
    await processVoiceLanding(spoken);
    // Don't auto-close — show preview and manual send button
  };
  _voiceLandingRec.onerror = () => {
    stopVoiceLandingMic();
    if(statusEl) statusEl.textContent = 'No pude escuchar. Intenta de nuevo.';
  };
  _voiceLandingRec.onend = () => { if(_voiceLandingRec) stopVoiceLandingMic(); };
}

function stopVoiceLandingMic(reset=true) {
  clearInterval(_voiceLandingTimer);
  _voiceLandingTimer = null;
  if(_voiceLandingRec) { try{_voiceLandingRec.stop();}catch(e){} _voiceLandingRec=null; }
  const micBtn    = document.getElementById('voice-landing-mic');
  const waveEl    = document.getElementById('voice-wave-anim');
  const greetEl   = document.getElementById('voice-greeting-area');
  const examplesEl= document.getElementById('voice-examples-area');
  if(micBtn) { micBtn.classList.remove('recording'); micBtn.textContent='🎙️'; }
  if(reset) {
    if(waveEl)    waveEl.style.display='none';
    if(greetEl)   greetEl.style.display='flex';
    if(examplesEl)examplesEl.style.display='flex';
    const statusEl=document.getElementById('voice-status-text');
    if(statusEl) statusEl.textContent='Toca el micrófono para empezar';
  }
}

let _voiceProcessedData = null;

async function processVoiceLanding(spoken) {
  const statusEl = document.getElementById('voice-status-text');
  if(statusEl) statusEl.textContent = '🤖 Interpretando con IA...';
  try {
    const today = getLocalToday();
    const cuentas = (CUENTAS||[]).map(c=>`${c.id}:${c.nombre}`).join(',') || 'ninguna';
    const recents = Object.values(EXCEL_DATA).flatMap(m=>m.transactions||[]).slice(-20)
      .map(t=>`${t.tipo}:${t.cat}:${t.method||''}:$${t.amount}`).join('; ');
    const cats = Object.entries(CONFIG?.categorias||{}).map(([k,v])=>`${k}:[${v.slice(0,6).join(',')}]`).join('; ');
    const prompt = `El usuario dijo: "${spoken}"
Fecha hoy: ${today}
Movimientos recientes: ${recents}
Categorías: ${cats}
Cuentas: ${cuentas}
Responde SOLO JSON sin markdown:
{"desc":"descripción","tipo":"Gasto|Ingreso Fijo|Ingreso Variable|Ahorro en efectivo","cat":"categoría","subcat":"subcategoría","amount":número_USD,"method":"Pago móvil|Transferencia|Efectivo $|Tarjeta|Otro","cuenta_id":"id_o_vacío","date":"${today}"}`;
    const raw = await groqCall(prompt, 'Asistente financiero venezolano. SOLO JSON.');
    const clean = raw.replace(/```json|```/g,'').trim();
    _voiceProcessedData = JSON.parse(clean);
    window._voicePendingData = _voiceProcessedData; // FIX-VOZ-SYNC: sendVoiceManual lo necesita
    showVoicePreview(_voiceProcessedData, spoken);
    if(statusEl) statusEl.textContent = '✅ Revisa y confirma';
  } catch(e) {
    if(statusEl) statusEl.textContent = 'No pude interpretar. Escribe manualmente →';
    const greetEl = document.getElementById('voice-greeting-area');
    const examplesEl = document.getElementById('voice-examples-area');
    const waveEl = document.getElementById('voice-wave-anim');
    if(greetEl) greetEl.style.display='flex';
    if(examplesEl) examplesEl.style.display='flex';
    if(waveEl) waveEl.style.display='none';
  }
}

function showVoicePreview(d, spoken) {
  const area = document.getElementById('voice-preview-area');
  const card = document.getElementById('voice-preview-card');
  const examplesEl = document.getElementById('voice-examples-area');
  const greetEl = document.getElementById('voice-greeting-area');
  if(examplesEl) examplesEl.style.display='none';
  if(greetEl) greetEl.style.display='none';
  if(!area || !card) return;
  const isPos = (d.tipo||'').includes('Ingreso');
  const cuentaNombre = d.cuenta_id ? (CUENTAS||[]).find(c=>c.id===d.cuenta_id)?.nombre||'' : '';
  card.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:#e6edf3;margin-bottom:5px">${escHtml(d.desc||'—')}</div>
    <div style="color:${isPos?'#3fb950':'#f85149'};font-size:14px;font-weight:800;margin-bottom:6px">${isPos?'+':'-'}$${parseFloat(d.amount||0).toFixed(2)}</div>
    <div style="font-size:10px;color:#8b949e;display:flex;flex-wrap:wrap;gap:5px">
      <span style="background:#21262d;padding:2px 7px;border-radius:4px">${escHtml(d.tipo||'')}</span>
      <span style="background:#21262d;padding:2px 7px;border-radius:4px">📂 ${escHtml(d.cat||'')}${d.subcat?' › '+escHtml(d.subcat):''}</span>
      ${d.method?`<span style="background:#21262d;padding:2px 7px;border-radius:4px">${escHtml(d.method)}</span>`:''}
      ${cuentaNombre?`<span style="background:#21262d;padding:2px 7px;border-radius:4px">💳 ${escHtml(cuentaNombre)}</span>`:''}
      <span style="background:#21262d;padding:2px 7px;border-radius:4px">📅 ${fmtDate(d.date)}</span>
    </div>`;
  area.style.display='block';
}

function cancelVoicePreview() {
  const area = document.getElementById('voice-preview-area');
  if(area) area.style.display='none';
  _voiceProcessedData = null;
  const greetEl = document.getElementById('voice-greeting-area');
  const examplesEl = document.getElementById('voice-examples-area');
  if(greetEl) greetEl.style.display='flex';
  if(examplesEl) examplesEl.style.display='flex';
  const statusEl = document.getElementById('voice-status-text');
  if(statusEl) statusEl.textContent = 'Toca el micrófono para empezar';
}

function sendVoiceManual() {
  // FIX-VOZ-SCOPE: window._voicePendingData compartido entre app-features y app-voice
  const d = window._voicePendingData;
  if (!d) { toast('No hay datos de voz para registrar', 'err'); return; }
  closeVoiceLanding();
  openModal();
  setTimeout(() => {
    if (d.desc)   document.getElementById('f-desc').value = d.desc;
    if (d.tipo)   { document.getElementById('f-tipo').value = d.tipo; onTipoChange(); }
    if (d.amount) document.getElementById('f-amount-usd').value = parseFloat(d.amount).toFixed(2);
    if (d.method) { const mEl = document.getElementById('f-method'); if (mEl) mEl.value = d.method; }
    if (d.date)   document.getElementById('f-date').value = d.date;
    setTimeout(() => {
      if (d.cat)  { document.getElementById('f-cat').value = d.cat; onCatChange(); }
      setTimeout(() => {
        if (d.subcat)    { const s = document.getElementById('f-subcat'); if (s) s.value = d.subcat; }
        if (d.cuenta_id) { const cu = document.getElementById('f-cuenta'); if (cu) cu.value = d.cuenta_id; }
      }, 80);
    }, 80);
    toast('🎙️ Movimiento listo para guardar');
    haptic && haptic('success');
    window._voicePendingData = null;
  }, 300);
}

function voiceLandingChip(text) {
  haptic && haptic('light');
  const statusEl = document.getElementById('voice-status-text');
  if(statusEl) statusEl.textContent = `"${text}" — procesando...`;
  const greetEl = document.getElementById('voice-greeting-area');
  const examplesEl = document.getElementById('voice-examples-area');
  if(greetEl) greetEl.style.display='none';
  if(examplesEl) examplesEl.style.display='none';
  processVoiceLanding(text);
}

// ══ TRANSFER RIAL ════════════════════════════════════════
let _transferFromId = null;
let _transferToId   = null;
let _transferAmount = 0;
let _transferPickerFor = null; // 'from' | 'to'

function openTransferRial() {
  _transferFromId = null;
  _transferToId   = null;
  _transferAmount = 0;
  // Reset UI
  document.getElementById('transfer-from-name').textContent = 'Seleccionar origen';
  document.getElementById('transfer-to-name').textContent   = 'Seleccionar destino';
  document.getElementById('transfer-from-dot').style.background = '#21262d';
  document.getElementById('transfer-from-dot').textContent = '💳';
  document.getElementById('transfer-to-dot').style.background = '#21262d';
  document.getElementById('transfer-to-dot').textContent = '💳';
  document.getElementById('transfer-amount-from').textContent = 'Bs 0,00';
  document.getElementById('transfer-amount-to').textContent = 'Bs 0,00';
  // Date
  const today = new Date().toLocaleDateString('es-VE',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const dateLabel = document.getElementById('transfer-date-label');
  if(dateLabel) dateLabel.textContent = 'Hoy ' + new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'});
  const dateInput = document.getElementById('transfer-date-input');
  if(dateInput) dateInput.value = getLocalToday();
  document.getElementById('modal-transfer-rial').classList.add('open');
  lockScroll();
  haptic && haptic('light');
}
function closeTransferRial() {
  document.getElementById('modal-transfer-rial').classList.remove('open');
  unlockScroll();
}
function setTransferView(type) {
  document.querySelectorAll('.transfer-type-pill').forEach((p,i)=>{
    p.classList.toggle('active', ['gasto','ingreso','transfer'][i]===type);
  });
  if(type==='gasto')   { closeTransferRial(); openModal(); document.getElementById('f-tipo') && (document.getElementById('f-tipo').value='Gasto', onTipoChange()); }
  else if(type==='ingreso') { closeTransferRial(); openModal(); document.getElementById('f-tipo') && (document.getElementById('f-tipo').value='Ingreso Fijo', onTipoChange()); }
}
function pickTransferDate() {
  document.getElementById('transfer-date-input').click();
}
function onTransferDateChange() {
  const val = document.getElementById('transfer-date-input').value;
  if(!val) return;
  const d = new Date(val+'T00:00:00');
  const label = d.toLocaleDateString('es-VE',{weekday:'short',day:'numeric',month:'short'});
  document.getElementById('transfer-date-label').textContent = label;
}
function openTransferAccountPicker(side) {
  _transferPickerFor = side;
  const title = document.getElementById('transfer-picker-title');
  if(title) title.textContent = side==='from' ? 'Cuenta origen (de dónde sale)' : 'Cuenta destino (a dónde llega)';
  const list = document.getElementById('transfer-picker-list');
  if(!list) return;
  const avail = (CUENTAS||[]).filter(c => side==='from' ? c.id!==_transferToId : c.id!==_transferFromId);
  if(!avail.length) {
    list.innerHTML='<div style="color:#8b949e;font-size:.78rem;padding:12px">No hay cuentas disponibles. Agrega cuentas primero.</div>';
  } else {
    list.innerHTML = avail.map(c => {
      const bal = calcCuentaBalance(c);
      return `
        <div onclick="selectTransferAccount('${escHtml(c.id)}','${side}')" style="display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #1c2128;cursor:pointer">
          <div style="width:36px;height:36px;border-radius:10px;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0">${c.nombre.charAt(0)}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:#e6edf3">${escHtml(c.nombre)}</div>
            <div style="font-size:11px;color:${c.color}">$${bal.toFixed(2)}</div>
          </div>
        </div>`;
    }).join('');
  }
  const overlay = document.getElementById('transfer-picker-overlay');
  const sheet   = document.getElementById('transfer-picker-sheet');
  lockScroll(); // FIX-XIX-3: ocultar FAB al abrir selector de cuenta
  overlay.style.display = 'block';
  requestAnimationFrame(()=>{ sheet.style.transform='translateY(0)'; });
}
function selectTransferAccount(id, side) {
  const c = CUENTAS.find(x=>x.id===id);
  if(!c) return;
  if(side==='from') {
    _transferFromId = id;
    document.getElementById('transfer-from-name').textContent = c.nombre;
    document.getElementById('transfer-from-dot').style.background = c.color;
    document.getElementById('transfer-from-dot').textContent = c.nombre.charAt(0);
    updateTransferAmountDisplay();
  } else {
    _transferToId = id;
    document.getElementById('transfer-to-name').textContent = c.nombre;
    document.getElementById('transfer-to-dot').style.background = c.color;
    document.getElementById('transfer-to-dot').textContent = c.nombre.charAt(0);
    updateTransferAmountDisplay();
  }
  closeTransferAccountPicker();
}
function closeTransferAccountPicker() {
  const overlay = document.getElementById('transfer-picker-overlay');
  const sheet   = document.getElementById('transfer-picker-sheet');
  if(sheet) sheet.style.transform = 'translateY(100%)';
  // FIX-XIX-1: unlock dentro del timeout para restaurar FAB tras animación
  setTimeout(()=>{ if(overlay) overlay.style.display='none'; unlockScroll(); }, 300);
  _transferPickerFor = null;
}
function openNumpadForTransfer(side) {
  // Reuse numpad
  _numpadTargetField = 'transfer_'+side;
  // FIX-TRANSFER-BS: detectar moneda de la cuenta origen
  const _tAccountId = side === 'from' ? _transferFromId : _transferToId;
  const _tAccount = (CUENTAS||[]).find(c => c.id === _tAccountId);
  const _tCurrency = _tAccount?.moneda === 'BS' ? 'bs' : 'usd';
  _numpadStr = _transferAmount > 0 ? String(_transferAmount) : '0';
  _numpadMode = _tCurrency;
  numpadSetMode(_tCurrency);
  const overlay = document.getElementById('numpad-overlay');
  const sheet   = document.getElementById('numpad-sheet');
  const label   = document.getElementById('numpad-label');
  const sublabel= document.getElementById('numpad-sublabel');
  if(label)   label.textContent   = side==='from' ? 'Monto a enviar' : 'Monto a recibir';
  if(sublabel)sublabel.textContent= '';
  overlay && overlay.classList.add('open');
  lockScroll(); // FIX-XIX-1: ocultar FAB al abrir numpad de transferencia
  requestAnimationFrame(()=>sheet&&sheet.classList.add('visible'));
  // Override confirm to update transfer amount
  window._numpadConfirmCallback = (val)=>{
    _transferAmount = parseFloat(val)||0;
    updateTransferAmountDisplay();
  };
}
function updateTransferAmountDisplay() {
  // FIX-X-4: detectar moneda de la cuenta origen en lugar de hardcodear Bs
  const fromC = (CUENTAS||[]).find(c => c.id === _transferFromId);
  const currency = fromC?.moneda || 'USD';
  const fromEl = document.getElementById('transfer-amount-from');
  const toEl   = document.getElementById('transfer-amount-to');
  let display;
  if (currency === 'BS' || currency === 'Bs') {
    display = `Bs ${(_transferAmount).toFixed(2).replace('.',',')}`;
  } else if (currency === 'EUR') {
    display = `€${_transferAmount.toFixed(2)}`;
  } else {
    display = `$${_transferAmount.toFixed(2)}`;
  }
  if(fromEl) fromEl.textContent = display;
  if(toEl)   toEl.textContent   = display;
}
// Patch numpadConfirm for transfer context
const _origNumpadConfirm = window.numpadConfirm;
window.numpadConfirm = function() {
  if(window._numpadConfirmCallback) {
    window._numpadConfirmCallback(_numpadStr);
    window._numpadConfirmCallback = null;
    closeNumpad();
    haptic && haptic('medium');
    return;
  }
  _origNumpadConfirm && _origNumpadConfirm();
};
async function executeTransferRial() {
  if(!_transferFromId) { toast('Selecciona la cuenta origen','err'); return; }
  if(!_transferToId)   { toast('Selecciona la cuenta destino','err'); return; }
  if(_transferFromId===_transferToId) { toast('Origen y destino deben ser distintos','err'); return; }
  if(!_transferAmount||_transferAmount<=0) { toast('Ingresa el monto a transferir','err'); return; }
  const dateInput = document.getElementById('transfer-date-input');
  const date = dateInput ? dateInput.value : getLocalToday();
  const fromC = CUENTAS.find(c=>c.id===_transferFromId);
  const toC   = CUENTAS.find(c=>c.id===_transferToId);
  // FIX-TRANSFER-BS: si la cuenta origen es BS, el monto ingresado está en Bs → convertir a USD
  const _isFromBS = fromC?.moneda === 'BS';
  const _amountUSD = _isFromBS ? (_transferAmount / (rateBCV||431)) : _transferAmount;
  const _amountBs  = _isFromBS ? _transferAmount : (_transferAmount * (rateBCV||431));
  const _dispAmt = _isFromBS
    ? `Bs ${_transferAmount.toFixed(2)} ($${_amountUSD.toFixed(2)})`
    : `$${_transferAmount.toFixed(2)}`;
  const ok = await showConfirm(
    '🔄 Confirmar transferencia',
    `¿Transferir ${_dispAmt} de ${fromC?.nombre} → ${toC?.nombre}?`,
    '🔄'
  );
  if(!ok) return;
  const month = currentMonth;
  const idBase = 'n'+Date.now();
  // FIX-XVIII-2: debit subcat='debit' → calcCuentaBalance resta de cuenta origen
  const debit = {
    id: idBase+'_debit',
    desc: `🔄 Transferencia a ${toC?.nombre||'cuenta'}`,
    tipo: 'Transferencia Interna', cat: 'Transferencia Interna', subcat:'debit',
    amount: _amountUSD,
    amountBs: _amountBs,
    method: 'Transferencia',
    date, author: getDisplayName(currentUser?.email),
    rate_type:'bcv', cuenta_id: _transferFromId
  };
  const credit = {
    id: idBase+'_credit',
    desc: `🔄 Transferencia desde ${fromC?.nombre||'cuenta'}`,
    tipo: 'Transferencia Interna', cat: 'Transferencia Interna', subcat:'credit',
    amount: _amountUSD,
    amountBs: _amountBs,
    method: 'Transferencia',
    date, author: getDisplayName(currentUser?.email),
    rate_type:'bcv', cuenta_id: _transferToId
  };
  // Save both
  if(!EXCEL_DATA[month]) EXCEL_DATA[month]={transactions:[],ingresos:0,gastos:0,ahorros:0,balance:0,ajustes:0};
  EXCEL_DATA[month].transactions.push(debit, credit);
  userModifiedMonths.add(month);
  recalcMonth(month);
  const sbSaveFn = window.sbSaveMovOrig || window.sbSaveMov || sbSaveMov;
  if (navigator.onLine) {
    sbSaveFn(debit, month, 0);
    sbSaveFn(credit, month, 0);
  } else {
    pushOfflineQueue({ type: 'saveMov', mov: debit, month });
    pushOfflineQueue({ type: 'saveMov', mov: credit, month });
  }
  closeTransferRial();
  render();
  // FIX-XIV-5: actualizar tarjetas de cuentas en tiempo real
  renderWalletCards && renderWalletCards();
  updateHeroBalance();
  toast(`✅ Transferencia de ${_dispAmt} completada`);
  haptic && haptic('success');
}

// ══ PLANTILLA IA ═════════════════════════════════════════
let _plantillaIASuggestion = null;

async function openPlantillaIA() {
  lockScroll();
  document.getElementById('modal-plantilla-ia').classList.add('open');
  document.getElementById('plantilla-ia-actions').style.display = 'none';
  document.getElementById('plantilla-ia-result').innerHTML = '<div style="color:#bc8cff;font-size:.78rem;display:flex;align-items:center;gap:8px"><span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> La IA está analizando tus patrones...</div>';
  await generatePlantillaIA();
}
function closeModalPlantillaIA() {
  unlockScroll();
  document.getElementById('modal-plantilla-ia').classList.remove('open');
}
async function generatePlantillaIA() {
  const d = EXCEL_DATA[currentMonth];
  if(!d) return;
  const today = getLocalToday();
  const todayDisplay = fmtDate ? fmtDate(today) : today;
  const todayTxns = (d.transactions||[]).filter(t=>t.date===today);
  const allDesc = (d.transactions||[]).map(t=>`${t.tipo}:${t.desc}:${t.cat}:${t.subcat||''}:$${t.amount}:${t.method||''}`).slice(-40).join('; ');
  const todayDesc = todayTxns.map(t=>t.desc).join(', ') || 'ninguno';
  const cuentas = (CUENTAS||[]).map(c=>`${c.id}:${c.nombre}`).join(',') || 'sin cuentas';
  const catsList = Object.entries(CONFIG?.categorias||{}).map(([tipo,cats])=>`${tipo}:[${cats.slice(0,5).join(',')}]`).join('; ');
  const prompt = `Analiza movimientos del mes: ${allDesc}
Hoy (${today}) ya registré: ${todayDesc}.
Cuentas disponibles: ${cuentas}
Categorías: ${catsList}
Genera 3 sugerencias de movimientos NO registrados hoy, basados en patrones frecuentes.
Responde SOLO con JSON array (sin markdown):
[{"desc":"descripción","tipo":"Gasto|Ingreso Fijo|Ingreso Variable|Ahorro en efectivo","cat":"categoría exacta","subcat":"subcategoría","amount":número_USD,"method":"Pago móvil|Transferencia|Efectivo $|Tarjeta|Otro","cuenta_id":"id_cuenta_o_vacío","razon":"1 oración"},...]`;
  try {
    const raw = await groqCall(prompt, 'Eres un asistente financiero venezolano. Responde SOLO con JSON array válido sin markdown.');
    const clean = raw.replace(/```json|```/g,'').trim();
    const suggestions = JSON.parse(clean);
    _plantillaIASuggestion = suggestions[0];
    window._plantillaIAAll = suggestions;
    const res = document.getElementById('plantilla-ia-result');
    res.innerHTML = (Array.isArray(suggestions) ? suggestions : [suggestions]).slice(0,3).map((s,i)=>{
      const isPos = s.tipo?.includes('Ingreso');
      const cuentaNombre = s.cuenta_id ? (CUENTAS||[]).find(c=>c.id===s.cuenta_id)?.nombre||'' : '';
      return `
      <div class="sugg-card" style="background:#13181f;border:1px solid ${i===0?'#bc8cff30':'#21262d'};border-radius:12px;padding:13px 15px;margin-bottom:8px;cursor:pointer;transition:all .15s"
           onclick="applyPlantillaIAByIndex(${i})"
           onmouseenter="this.style.borderColor='#bc8cff60'" onmouseleave="this.style.borderColor='${i===0?'#bc8cff30':'#21262d'}'">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:#e6edf3;margin-bottom:3px">${escHtml(s.desc||'—')}</div>
            <div style="font-size:11px;color:${isPos?'#3fb950':'#f85149'};margin-bottom:4px">
              ${escHtml(s.tipo)} · <strong>$${parseFloat(s.amount||0).toFixed(2)}</strong>
            </div>
            <div style="font-size:10px;color:#8b949e;display:flex;flex-wrap:wrap;gap:4px">
              <span>📂 ${escHtml(s.cat||'')}${s.subcat?' › '+escHtml(s.subcat):''}</span>
              ${s.method?`<span>• ${escHtml(s.method)}</span>`:''}
              ${cuentaNombre?`<span>• 💳 ${escHtml(cuentaNombre)}</span>`:''}
              <span>• 📅 ${todayDisplay}</span>
            </div>
          </div>
          <div style="font-size:20px;opacity:.6">${isPos?'💵':'💸'}</div>
        </div>
        <div style="font-size:10px;color:#8b949e;margin-top:6px;line-height:1.4">💡 ${escHtml(s.razon||'')}</div>
      </div>`;
    }).join('');
    document.getElementById('plantilla-ia-actions').style.display = 'flex';
  } catch(e) {
    document.getElementById('plantilla-ia-result').innerHTML = '<div style="color:#f85149;font-size:.78rem">No pude generar sugerencias. Intenta de nuevo.</div>';
    document.getElementById('plantilla-ia-actions').style.display = 'flex';
  }
}
function applyPlantillaIAByIndex(i) {
  const suggestions = window._plantillaIAAll || [];
  if(i >= suggestions.length) return;
  _plantillaIASuggestion = suggestions[i];
  applyPlantillaIA();
}
function applyPlantillaIA() {
  if(!_plantillaIASuggestion) return;
  closeModalPlantillaIA();
  openModal();
  const s = _plantillaIASuggestion;
  setTimeout(()=>{
    if(s.desc)   document.getElementById('f-desc').value = s.desc;
    if(s.tipo)   { document.getElementById('f-tipo').value = s.tipo; onTipoChange(); }
    if(s.amount) { document.getElementById('f-amount-usd').value = parseFloat(s.amount).toFixed(2); }
    if(s.method) { const mEl=document.getElementById('f-method'); if(mEl) mEl.value=s.method; }
    document.getElementById('f-date').value = getLocalToday();
    setTimeout(()=>{
      if(s.cat)    { document.getElementById('f-cat').value = s.cat; onCatChange(); }
      setTimeout(()=>{
        if(s.subcat) { const scEl=document.getElementById('f-subcat'); if(scEl) scEl.value=s.subcat; }
        if(s.cuenta_id) { const cuEl=document.getElementById('f-cuenta'); if(cuEl) cuEl.value=s.cuenta_id; }
      }, 80);
    }, 80);
    toast('🤖 Formulario completo con sugerencia IA');
  }, 300);
}
async function regeneratePlantillaIA() {
  document.getElementById('plantilla-ia-actions').style.display = 'none';
  document.getElementById('plantilla-ia-result').innerHTML = '<div style="color:#bc8cff;font-size:.78rem;display:flex;align-items:center;gap:8px"><span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> Generando nueva sugerencia...</div>';
  await generatePlantillaIA();
}

// ══ RISK 1 — API KEY PROTECTION REMINDER ════════════════
// Cloudflare Worker proxy instructions stored in app
window.WORKER_SETUP_INFO = `
Para proteger la API Key de Groq usa un Cloudflare Worker:
1. cloudflare.com → Workers → Create Worker
2. Pega este código:
   export default {
     async fetch(req) {
       if(req.method!=='POST') return new Response('Not found',{status:404});
       const body = await req.json();
       const res = await fetch('https://api.groq.com/openai/v1/chat/completions',{
         method:'POST',
         headers:{'Content-Type':'application/json','Authorization':'Bearer TU_GROQ_KEY'},
         body: JSON.stringify(body)
       });
       return new Response(await res.text(), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
     }
   };
3. Despliega → obtienes URL como https://groq-proxy.TU-USUARIO.workers.dev
4. En index.html reemplaza GROQ_URL por esa URL y elimina el header Authorization
Así la key nunca sale del Worker y el HTML público es seguro.
`;
// Log reminder once
setTimeout(()=>console.info('%c🔐 Tip de seguridad: ejecuta window.WORKER_SETUP_INFO para ver cómo proteger la API Key','color:#3fb950;font-weight:600'),2000);

// ══ HOOK renderDashboard to also update hero ══════════════
const _finalRenderDash = typeof renderDashboard==='function' ? renderDashboard : null;
if(_finalRenderDash) {
  window.renderDashboard = function(...args) {
    _finalRenderDash.apply(this,args);
    setTimeout(()=>{ updateHeroBalance(); renderMobileRecentTxn(); renderWalletCards(); }, 50);
  };
}

