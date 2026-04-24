

// ─── CUENTAS V2 INTERFACE (#9) ──────────────────────────
let _cv2Currency = 'USD';
let _cv2Tab = 'todas';

function openModalCuentasV2() {
  renderCuentasV2List();
  const modal = document.getElementById('modal-cuentas-v2-view');
  if(modal) { lockScroll(); modal.classList.add('open'); }
}
function closeModalCuentasV2() {
  const modal = document.getElementById('modal-cuentas-v2-view');
  if(modal) modal.classList.remove('open');
  unlockScroll();
}
function setCuentasV2Currency(cur) {
  _cv2Currency = cur;
  ['usd','eur','bs'].forEach(c=>{
    const el=document.getElementById('cv2-'+c);
    if(el) el.classList.toggle('active', c===cur.toLowerCase());
  });
  renderCuentasV2List();
}
function setCuentasV2Tab(tab) {
  _cv2Tab = tab;
  ['todas','bs','usd'].forEach(t=>{
    const el=document.getElementById('cv2-tab-'+t);
    if(el) el.classList.toggle('active', t===tab);
  });
  renderCuentasV2List();
}
function renderCuentasV2List() {
  const container=document.getElementById('cuentas-v2-list');
  const totalEl=document.getElementById('cuentas-v2-total');
  if(!container) return;
  let cuentas=[...(CUENTAS||[])];
  if(_cv2Tab==='bs') cuentas=cuentas.filter(c=>c.moneda==='BS');
  if(_cv2Tab==='usd') cuentas=cuentas.filter(c=>c.moneda==='USD'||!c.moneda);
  let total=0;
  cuentas.forEach(c=>{ total+=calcCuentaBalance(c); });
  if(totalEl) {
    const _hide = window._hideAmounts;
    if(_hide) totalEl.textContent = '••••••';
    else if(_cv2Currency==='BS') totalEl.textContent='Bs '+parseInt(total*(rateBCV||1)).toLocaleString();
    else if(_cv2Currency==='EUR') totalEl.textContent='€'+(total/((rateEUR||499)/(rateBCV||431))).toFixed(2);
    else totalEl.textContent='$'+total.toFixed(2);
  }
  if(!cuentas.length) {
    container.innerHTML='<div style="color:var(--muted);text-align:center;padding:30px;font-size:.78rem">No hay cuentas aún.</div>';
    return;
  }
  container.innerHTML=cuentas.map(c=>{
    const bal=calcCuentaBalance(c);
    const balBs=parseInt(bal*(rateBCV||1));
    const faviconUrl = (typeof _resolveLogoUrl==='function' ? _resolveLogoUrl(c) : null)
                    || (typeof _getCuentaFaviconUrl==='function' ? _getCuentaFaviconUrl(c) : null)
                    || (typeof getAccountLogo==='function' ? getAccountLogo(c) : null)
                    || c.logo_url || null;
    const _fbLetter = escHtml((c.nombre||'?').charAt(0).toUpperCase());
    const logoHtml = faviconUrl
      ? '<img src="'+escHtml(faviconUrl)+'" style="width:100%;height:100%;object-fit:contain;border-radius:10px" onerror="this.outerHTML=\'<span style=\\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:18px;font-weight:800;color:#fff\\\'>' + _fbLetter + '</span>\'">'
      : '<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:18px;font-weight:800;color:#fff">'+_fbLetter+'</span>';
    // Mostrar saldo en la moneda seleccionada por los pills
    const balEUR = (bal * (rateBCV||431) / (rateEUR||499));
    let monedaLabel;
    if (window._hideAmounts) {
      monedaLabel = '••••••';
    } else if (_cv2Currency === 'BS') {
      monedaLabel = 'Bs ' + balBs.toLocaleString() + (c.moneda==='BS' ? '' : ' · $' + bal.toFixed(2));
    } else if (_cv2Currency === 'EUR') {
      monedaLabel = '€' + balEUR.toFixed(2) + ' · $' + bal.toFixed(2);
    } else {
      monedaLabel = '$' + bal.toFixed(2) + (c.moneda==='BS' ? ' · Bs ' + balBs.toLocaleString() : '');
    }
    const intlBadge = c.internacional
      ? '<span style="font-size:9px;background:rgba(88,166,255,.15);color:#58a6ff;border:1px solid rgba(88,166,255,.3);border-radius:4px;padding:1px 4px;margin-left:4px">🌎</span>'
      : '';
    return '<div class="cuentas-v2-item" onclick="openCuentaDetail(\'' + escHtml(c.id) + '\')">' +
      '<div class="cuentas-v2-logo" style="background:' + (c.color||'#3fb950') + '">' + logoHtml + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="cuentas-v2-name">' + escHtml(c.nombre) + intlBadge + '</div>' +
        '<div class="cuentas-v2-bal">' + monedaLabel + '</div>' +
        (c.banco_pais ? '<div style="font-size:10px;color:var(--muted)">' + escHtml(c.banco_pais) + '</div>' : '') +
        (c.owner ? '<div style="font-size:10px;color:var(--muted)">' + escHtml(c.owner) + '</div>' : '') +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-shrink:0">' +
        '<button onclick="event.stopPropagation();editCuenta(\'' + escHtml(c.id) + '\')" style="background:none;border:1px solid var(--border);color:var(--muted);width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:12px">✏️</button>' +
        '<button onclick="event.stopPropagation();deleteCuentaFromDash(\'' + escHtml(c.id) + '\')" style="background:none;border:1px solid var(--border);color:var(--red);width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:12px">🗑</button>' +
      '</div>' +
    '</div>';
  }).join('');
}
// Override openModalCuentas globally
setTimeout(()=>{
  window.openModalCuentas = function() { openModalCuentasV2(); };
}, 500);
/* openNuevaCuenta defined above */


// ─── OFFLINE QUEUE (#13) ─────────────────────────────────
const OFFLINE_Q_KEY = 'fin_offline_queue';
function getOfflineQueue() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_Q_KEY)||'[]'); } catch(e){ return []; }
}
function saveOfflineQueue(q) { localStorage.setItem(OFFLINE_Q_KEY, JSON.stringify(q)); }

function queueOfflineMove(mov, monthName) {
  // Register Background Sync so SW can wake us up when online
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(reg => {
      reg.sync.register('sync-movimientos').catch(()=>{});
    });
  }
  const q = getOfflineQueue();
  q.push({ mov, monthName, ts: Date.now() });
  saveOfflineQueue(q);
  const banner = document.getElementById('offline-banner');
  if(banner) { banner.classList.add('visible'); banner.textContent = '📡 Sin conexión — ' + q.length + ' movimiento' + (q.length>1?'s':'') + ' pendiente' + (q.length>1?'s':'') + ' de sync'; }
}

async function processOfflineQueue() {
  const q = getOfflineQueue();
  if(!q.length || !navigator.onLine || !currentUser) return;
  let synced = 0; const failed = [];
  for(const item of q) {
    try {
      await sb.from('movimientos').upsert([item.mov]);
      synced++;
    } catch(e) { failed.push(item); }
  }
  saveOfflineQueue(failed);
  if(synced > 0) {
    toast('✅ ' + synced + ' movimiento' + (synced>1?'s':'') + ' sincronizado' + (synced>1?'s':''), 'ok');
    typeof renderDashboard==='function' && renderDashboard();
  }
  if(!failed.length) {
    const banner = document.getElementById('offline-banner');
    if(banner) banner.classList.remove('visible');
  }
}

window.addEventListener('online', () => {
  const q = getOfflineQueue();
  const banner = document.getElementById('offline-banner');
  if(q.length > 0) {
    if(banner) { banner.classList.add('visible'); banner.textContent = '🔄 Conexión restaurada — sincronizando ' + q.length + ' movimiento' + (q.length>1?'s':'') + '...'; }
    setTimeout(processOfflineQueue, 1200);
  } else {
    if(banner) banner.classList.remove('visible');
    toast('✅ Conexión restaurada', 'ok');
  }
});


// ─── PRESUPUESTO INGRESOS HELPERS ─────────────────────────
function switchPresupTab(tab) {
  const gBtn  = document.getElementById('presup-tab-gastos');
  const iBtn  = document.getElementById('presup-tab-ingresos');
  const gPanel = document.getElementById('presup-panel-gastos');
  const iPanel = document.getElementById('presup-panel-ingresos');
  if(!gBtn||!iBtn||!gPanel||!iPanel) return;
  if(tab==='gastos') {
    gPanel.style.display='block'; iPanel.style.display='none';
    gBtn.style.borderBottomColor='var(--red)'; gBtn.style.color='var(--red)';
    iBtn.style.borderBottomColor='transparent'; iBtn.style.color='var(--muted)';
  } else {
    gPanel.style.display='none'; iPanel.style.display='block';
    iBtn.style.borderBottomColor='var(--green)'; iBtn.style.color='var(--green)';
    gBtn.style.borderBottomColor='transparent'; gBtn.style.color='var(--muted)';
  }
}

function addIncomeBudget() {
  if(!CONFIG.presupuestosIngresos) CONFIG.presupuestosIngresos = {};
  const sel = document.getElementById('new-income-type');
  const k = sel ? sel.value.trim() : '';
  const v = parseFloat(document.getElementById('new-income-val')?.value)||0;
  if(!k) { toast('Selecciona un tipo de ingreso','err'); return; }
  if(v<=0) { toast('El monto meta debe ser mayor a 0','err'); return; }
  CONFIG.presupuestosIngresos[k] = v;
  // Refresh list in DOM
  const list = document.getElementById('budget-ingresos-list');
  if(list) {
    const entries = Object.entries(CONFIG.presupuestosIngresos).filter(([,v2])=>v2>0);
    list.innerHTML = entries.map(([k2,v2])=>'<div class="settings-item"><span style="flex:1;font-size:.74rem;color:var(--text)">'+escHtml(k2)+'</span><input type="number" value="'+v2+'" onchange="updateIncomeBudget(\''+k2+'\',this.value)" style="width:80px;background:var(--surface3,#0d1117);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 6px;font-family:inherit"><span style="font-size:.68rem;color:var(--muted)">USD</span><button class="btn-sm red" onclick="removeIncomeBudget(\''+k2+'\')">✕</button></div>').join('') || '<div style="color:var(--muted);font-size:.72rem;text-align:center;padding:12px">Sin metas.</div>';
  }
  toast('✅ Meta de ingreso guardada', 'ok');
  sbSaveConfig();
  typeof renderIncomeBudgetBars==='function' && renderIncomeBudgetBars();
}

function updateIncomeBudget(k, v) {
  if(!CONFIG.presupuestosIngresos) CONFIG.presupuestosIngresos = {};
  CONFIG.presupuestosIngresos[k] = parseFloat(v)||0;
  typeof renderIncomeBudgetBars==='function' && renderIncomeBudgetBars();
  sbSaveConfig();
}

async function removeIncomeBudget(k) {
  const ok = await showConfirm('Eliminar meta', '¿Eliminar la meta de ingreso "'+k+'"?', '💵');
  if(!ok) return;
  delete CONFIG.presupuestosIngresos[k];
  const list = document.getElementById('budget-ingresos-list');
  if(list) {
    const entries = Object.entries(CONFIG.presupuestosIngresos||{}).filter(([,v])=>v>0);
    list.innerHTML = entries.length ? entries.map(([k2,v2])=>'<div class="settings-item"><span style="flex:1;font-size:.74rem">'+escHtml(k2)+'</span><span>$'+v2+'</span><button class="btn-sm red" onclick="removeIncomeBudget(\''+k2+'\')">✕</button></div>').join('') : '<div style="color:var(--muted);font-size:.72rem;text-align:center;padding:12px">Sin metas.</div>';
  }
  toast('Meta eliminada', 'ok');
  sbSaveConfig();
  typeof renderIncomeBudgetBars==='function' && renderIncomeBudgetBars();
}

function renderIncomeBudgetBars(d) {
  d = d || EXCEL_DATA[currentMonth];
  if(!d) return;
  const container = document.getElementById('income-budget-bars');
  if(!container) return;
  const metas = Object.entries(CONFIG.presupuestosIngresos||{}).filter(([,v])=>v>0);
  if(!metas.length) { container.style.display='none'; return; }
  container.style.display='block';
  const ingXTipo = {};
  (d.transactions||[]).forEach(t=>{
    if((t.tipo||'').includes('Ingreso')) ingXTipo[t.tipo]=(ingXTipo[t.tipo]||0)+(t.amount||0);
  });
  container.innerHTML = '<div style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">💵 Metas de Ingreso</div>' +
    metas.map(([tipo,meta])=>{
      const real = ingXTipo[tipo]||0;
      const pct  = meta>0 ? Math.min((real/meta)*100,120) : 0;
      const color = pct>=100?'#3fb950':pct>=60?'#e3b341':'#484f58';
      const labelColor = pct>=100?'var(--green)':pct>=60?'var(--gold)':'var(--muted)';
      return '<div class="budget-cat"><div class="budget-label"><span style="font-size:.7rem">'+escHtml(tipo)+'</span><span style="font-size:.67rem;color:'+labelColor+'">$'+real.toFixed(2)+' / $'+meta.toFixed(2)+' ('+Math.round(pct)+'%)</span></div><div class="budget-track"><div class="budget-fill" style="width:'+Math.min(pct,100)+'%;background:'+color+'"></div></div></div>';
    }).join('');
}

// ─── AUTO LOGO PREVIEW (#12) ─────────────────────────────
function previewLogoFromUrl(val) {
  const inp = document.getElementById('nc-logo-url');
  if(!val) return;
  let url = val.trim();
  if(!url.startsWith('http')) {
    // Mapa de nombres comunes → dominio correcto para favicon
    const _LOGO_MAP = {
      'bancamiga':'bancamiga.com', 'banco amiga':'bancamiga.com',
      'banesco':'banesco.com',
      'exterior':'bancoexterior.com.ve', 'banco exterior':'bancoexterior.com.ve',
      'venezuela':'bancodevenezuela.com', 'banco de venezuela':'bancodevenezuela.com', 'bdv':'bancodevenezuela.com',
      'mercantil':'mercantilbanco.com', 'banco mercantil':'mercantilbanco.com',
      'provincial':'bbva.com', 'bbva provincial':'bbva.com', 'bbva':'bbva.com',
      'bicentenario':'bancobicentenario.com.ve',
      'bod':'bod.com.ve',
      'banplus':'banplus.com.ve',
      'sofitasa':'sofitasa.com',
      'zinli':'zinli.com',
      'paypal':'paypal.com',
      'zelle':'zellepay.com',
      'binance':'binance.com',
      'reserve':'reserve.org',
      'wise':'wise.com',
      'revolut':'revolut.com',
      'mercado pago':'mercadopago.com', 'mercadopago':'mercadopago.com',
      'nequi':'nequi.com',
      'stripe':'stripe.com',
      'cash app':'cash.app',
    };
    const valLower = url.toLowerCase();
    let domain = null;
    for (const [k, d] of Object.entries(_LOGO_MAP)) {
      if (valLower.includes(k)) { domain = d; break; }
    }
    if (!domain) domain = url.replace(/^www\./, '');
    url = 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(domain);
    if(inp) inp.dataset.resolved = url;
  }
  let prev = document.getElementById('nc-logo-preview');
  if(!prev) {
    prev = document.createElement('img');
    prev.id = 'nc-logo-preview';
    prev.style.cssText = 'width:32px;height:32px;border-radius:8px;object-fit:cover;margin-top:6px;border:1px solid #30363d;display:none';
    inp && inp.parentElement && inp.parentElement.appendChild(prev);
  }
  prev.src = url;
  prev.onerror = function() { prev.style.display='none'; };
  prev.onload  = function() { prev.style.display='block'; };
}


function getTransferCurrency(cuentaId) {
  if(!CUENTAS) return 'USD';
  var c = CUENTAS.find(function(x){ return x.id == cuentaId; });
  return (c && c.moneda === 'BS') ? 'BS' : 'USD';
}
function validateTransferAccounts(fromId, toId) {
  var fromCur = getTransferCurrency(fromId);
  var toCur   = getTransferCurrency(toId);
  return fromCur === toCur;
}
// FIX-X-4: segundo override de updateTransferAmountDisplay eliminado (Batch-X)
