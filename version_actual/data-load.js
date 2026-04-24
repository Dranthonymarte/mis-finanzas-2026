
// ═══════════════════════════════════════════════
// DATA-LOAD.JS — Carga, guardado y sincronización de datos
// Globals: sb, currentUser, HOUSEHOLD_ID, CONFIG, EXCEL_DATA, RECURRENTES,
//          templates, rateBCV, rateEUR, lastRateDate, emergencyFundByMonth,
//          activeMonths, currentMonth, userModifiedMonths, realtimeChannel
// Depende de: recalcMonth, init, syncEF, renderTemplatePills, showLoadingOverlay,
//             toast, showConfirm, getLocalToday, pushOfflineQueue, sbLogMovimiento,
//             loadTemplatesFromSupabase, runHealthCheck
// ═══════════════════════════════════════════════

async function loadFromSupabase() {
  showLoadingOverlay(true);
  const hid = HOUSEHOLD_ID || currentUser.id;
  try {
    const [cfgRes, movsRes, tasasGlobalRes, tasasMesRes, fondosRes] = await Promise.all([
      sb.from('config_usuario').select('*').eq('user_id', hid).single(),
      sb.from('movimientos').select('*').eq('user_id', hid).is('deleted_at', null).order('fecha', { ascending: true }),
      sb.from('tasas_cambio').select('*').eq('user_id', hid).eq('mes', 'global').single(),
      sb.from('tasas_cambio').select('*').eq('user_id', hid).eq('mes', currentMonth).single(),
      sb.from('fondo_emergencia').select('*').eq('user_id', hid)
    ]);

    const cfgData = cfgRes.data;
    if (cfgData) {
      if (cfgData.tipos?.length > 0) CONFIG.tipos = cfgData.tipos;
      if (cfgData.categorias && typeof cfgData.categorias === 'object' && Object.keys(cfgData.categorias).length > 0)
        CONFIG.categorias = cfgData.categorias;
      if (cfgData.subcategorias && typeof cfgData.subcategorias === 'object' && Object.keys(cfgData.subcategorias).length > 0)
        CONFIG.subcategorias = cfgData.subcategorias;
      if (cfgData.presupuestos && typeof cfgData.presupuestos === 'object' && Object.keys(cfgData.presupuestos).length > 0)
        CONFIG.presupuestos = cfgData.presupuestos;
      if (cfgData.presupuestos_ingresos) CONFIG.presupuestosIngresos = cfgData.presupuestos_ingresos;
      if (cfgData.closed_months) CONFIG.closedMonths = cfgData.closed_months;
      if (cfgData.dashboard_order && Array.isArray(cfgData.dashboard_order))
        CONFIG.dashboardOrder = cfgData.dashboard_order;
      if (cfgData.nav_order && Array.isArray(cfgData.nav_order) && cfgData.nav_order.length > 0)
        CONFIG.navOrder = cfgData.nav_order;
      if (cfgData.ef_manual_base != null) CONFIG.efManualBase = parseFloat(cfgData.ef_manual_base) || 0;
      if (cfgData.ef_auto_contrib != null) CONFIG.efAutoContrib = parseFloat(cfgData.ef_auto_contrib) || 0;
      if (cfgData.ef_reset_date != null) CONFIG.efResetDate = cfgData.ef_reset_date;
      if (Array.isArray(cfgData.wallet_order) && cfgData.wallet_order.length) CONFIG.walletOrder = cfgData.wallet_order;
      if (cfgData.emergency_fund_base != null && cfgData.ef_manual_base == null) {
        CONFIG.efManualBase = parseFloat(cfgData.emergency_fund_base) || 0;
        CONFIG.efAutoContrib = 0;
      }
      CONFIG.emergencyFundBase = (CONFIG.efManualBase || 0) + (CONFIG.efAutoContrib || 0);
      if (cfgData.emergency_fund_goal != null) CONFIG.emergencyFundGoal = parseFloat(cfgData.emergency_fund_goal) || 3000;
      CONFIG.subscriptionStatus  = cfgData.subscription_status || 'free';
      CONFIG.subscriptionExpires = cfgData.subscription_expires_at || null;
      if (cfgData.recurrentes && Array.isArray(cfgData.recurrentes) && cfgData.recurrentes.length > 0)
        RECURRENTES = cfgData.recurrentes;
      if (cfgData.pin_hash) {
        CONFIG._pinHash = cfgData.pin_hash;
        if (!localStorage.getItem('fin_pin_v2')) localStorage.setItem('fin_pin_v2', cfgData.pin_hash);
      }
      if (cfgData.cat_emojis && typeof cfgData.cat_emojis === 'object') CONFIG.catEmojis = cfgData.cat_emojis;
      try {
        const _localEmojis = localStorage.getItem('fin_cat_emojis_local');
        if (_localEmojis) {
          const _parsed = JSON.parse(_localEmojis);
          if (_parsed && typeof _parsed === 'object' && Object.keys(_parsed).length > 0)
            CONFIG.catEmojis = Object.assign({}, CONFIG.catEmojis || {}, _parsed);
        }
      } catch(e) {}
      if (cfgData.cat_rules && Array.isArray(cfgData.cat_rules) && cfgData.cat_rules.length > 0) {
        try { localStorage.setItem('fin_cat_rules_v1', JSON.stringify(cfgData.cat_rules)); } catch(e) {}
      }
      if (cfgData.presupuestos_subcat && typeof cfgData.presupuestos_subcat === 'object')
        CONFIG.presupuestosSubcat = cfgData.presupuestos_subcat;
      if (cfgData.metas_ahorro && Array.isArray(cfgData.metas_ahorro)) {
        CONFIG.metasAhorro = cfgData.metas_ahorro;
      } else {
        try {
          const localMetas = localStorage.getItem('fin_metas_ahorro');
          if (localMetas) CONFIG.metasAhorro = JSON.parse(localMetas);
        } catch(e) {}
      }
    }

    const _needsSeed = !CONFIG.tipos?.length || !CONFIG.categorias || Object.keys(CONFIG.categorias).length === 0;
    if (_needsSeed) { initConfigFromDefaults(); sbSaveConfig(); }

    const movs = movsRes.data || [];
    processMovimientosFromDB(movs, cfgData?.ef_auto_contrib);

    const tasas = tasasGlobalRes.data || tasasMesRes.data;
    if (tasas) {
      rateBCV = tasas.rate_bcv; rateEUR = tasas.rate_eur;
      const elBcv = document.getElementById('rate-bcv');
      const elEur = document.getElementById('rate-eur');
      if (elBcv) elBcv.value = rateBCV;
      if (elEur) elEur.value = rateEUR;
      lastRateDate = tasas.updated_at ? tasas.updated_at.slice(0,10) : null;
    }
    if (fondosRes.data) {
      fondosRes.data.forEach(f => { emergencyFundByMonth[f.mes] = parseFloat(f.monto); });
      window._efLoadedFromSupabase = true;
    }

    if (!RECURRENTES || RECURRENTES.length === 0) {
      try {
        const lsRec = localStorage.getItem('fin_recurrentes_bk');
        if (lsRec) { RECURRENTES = JSON.parse(lsRec); }
      } catch(e) {}
    }
    if (cfgData && cfgData.ef_manual_base == null) {
      try {
        const lsEF = localStorage.getItem('fin_ef_split');
        if (lsEF) {
          const ef = JSON.parse(lsEF);
          CONFIG.efManualBase = ef.base || 0; CONFIG.efAutoContrib = ef.auto || 0;
          CONFIG.efResetDate = ef.reset || null;
          if (ef.goal) CONFIG.emergencyFundGoal = ef.goal;
          CONFIG.emergencyFundBase = CONFIG.efManualBase + CONFIG.efAutoContrib;
        }
      } catch(e) {}
    }
    if (!CONFIG.metasAhorro || CONFIG.metasAhorro.length === 0) {
      try {
        const lsMetas = localStorage.getItem('fin_metas_ahorro');
        if (lsMetas) CONFIG.metasAhorro = JSON.parse(lsMetas);
      } catch(e) {}
    }

  } catch(e) {
    console.warn('[loadFromSupabase] Error en bloque principal:', e?.message || e);
    const isNetworkError = e?.message && (
      e.message.toLowerCase().includes('fetch') || e.message.toLowerCase().includes('network') ||
      e.message.toLowerCase().includes('load failed') || e.message.toLowerCase().includes('offline')
    );
    if (isNetworkError) {
      console.warn('[loadFromSupabase] Sin internet — restaurando desde localStorage');
      toast('📵 Sin internet — cargando datos guardados localmente...', 'warn');
      try { const t = localStorage.getItem('fin_templates_v3'); if (t) templates = JSON.parse(t); } catch(_) {}
      try { const r = localStorage.getItem('fin_recurrentes_bk'); if (r) RECURRENTES = JSON.parse(r); } catch(_) {}
      processMovimientosFromDB([], null);
      try {
        const ef = JSON.parse(localStorage.getItem('fin_ef_split') || '{}');
        CONFIG.efManualBase = ef.base || 0; CONFIG.efAutoContrib = ef.auto || 0;
        CONFIG.efResetDate = ef.reset || null;
        if (ef.goal) CONFIG.emergencyFundGoal = ef.goal;
        CONFIG.emergencyFundBase = CONFIG.efManualBase + CONFIG.efAutoContrib;
      } catch(_) {}
    }
  }

  await loadTemplatesFromSupabase();

  window._deudasData    = { deudas: [] };
  window._prestamosData = { prestamos: [] };
  window._dfLoadedFromSupabase = false;
  const hid2 = HOUSEHOLD_ID || currentUser.id;
  try {
    const uid = currentUser.id;
    const { data: dfOwn, error: dfOwnErr } = await sb.from('dinero_fuera')
      .select('*').eq('user_id', uid).order('created_at', { ascending: true });
    let dfHousehold = [];
    if (hid2 !== uid) {
      const { data: dfH } = await sb.from('dinero_fuera').select('*').eq('user_id', hid2).order('created_at', { ascending: true });
      if (dfH) dfHousehold = dfH;
    }
    if (dfOwnErr) console.warn('[dinero_fuera] load error:', dfOwnErr.message);
    const seen = new Set();
    const dfData = [...(dfOwn || []), ...dfHousehold].filter(r => {
      if (seen.has(r.id)) return false; seen.add(r.id); return true;
    });
    if (dfData.length > 0) {
      window._deudasData = { deudas: dfData.filter(r => r.tipo === 'deuda').map(r => ({
        id: r.id, acreedor: r.nombre || '', concepto: r.concepto || '',
        saldo: parseFloat(r.monto_original || 0) - parseFloat(r.monto_abonado || 0),
        montoOriginal: parseFloat(r.monto_original || 0), montoAbonado: parseFloat(r.monto_abonado || 0),
        abonos: Array.isArray(r.abonos) ? r.abonos : [],
        pagada: r.pagado || false, fecha: r.fecha_inicio,
        fechaVencimiento: r.fecha_vencimiento, fechaPago: r.fecha_pago
      })) };
      window._prestamosData = { prestamos: dfData.filter(r => r.tipo === 'prestamo').map(r => ({
        id: r.id, deudor: r.nombre || '', concepto: r.concepto || '',
        monto: parseFloat(r.monto_original || 0) - parseFloat(r.monto_abonado || 0),
        montoOriginal: parseFloat(r.monto_original || 0), montoAbonado: parseFloat(r.monto_abonado || 0),
        abonos: Array.isArray(r.abonos) ? r.abonos : [],
        cobrado: r.pagado || false, fecha: r.fecha_inicio,
        fechaVencimiento: r.fecha_vencimiento, fechaCobro: r.fecha_pago
      })) };
      window._dfLoadedFromSupabase = true;
      try {
        localStorage.setItem('fin_deudas_bk',    JSON.stringify(window._deudasData.deudas));
        localStorage.setItem('fin_prestamos_bk', JSON.stringify(window._prestamosData.prestamos));
      } catch(_) {}
      console.log('[dinero_fuera] ✅ deudas:', window._deudasData.deudas.length, '· préstamos:', window._prestamosData.prestamos.length);
    } else {
      try {
        const bkD = localStorage.getItem('fin_deudas_bk');
        const bkP = localStorage.getItem('fin_prestamos_bk');
        if (bkD) { const p = JSON.parse(bkD); if (p.length) window._deudasData = { deudas: p }; }
        if (bkP) { const p = JSON.parse(bkP); if (p.length) window._prestamosData = { prestamos: p }; }
      } catch(_) {}
    }
  } catch(e) {
    console.warn('[dinero_fuera] exception:', e.message);
    try {
      const bkD = localStorage.getItem('fin_deudas_bk');
      const bkP = localStorage.getItem('fin_prestamos_bk');
      if (bkD) { const p = JSON.parse(bkD); if (p.length) window._deudasData = { deudas: p }; }
      if (bkP) { const p = JSON.parse(bkP); if (p.length) window._prestamosData = { prestamos: p }; }
    } catch(_) {}
  }

  setTimeout(() => runHealthCheck(), 2000);
  showLoadingOverlay(false);
  init();
  if (typeof syncEF === 'function') syncEF();
  if (typeof renderTemplatePills === 'function') renderTemplatePills();
}

// ─── NORMALIZAR MES ───────────────────────────
function normalizeMes(raw) {
  if (!raw) return null;
  const map = {
    'january':'Enero','enero':'Enero','february':'Febrero','febrero':'Febrero','march':'Marzo','marzo':'Marzo',
    'april':'Abril','abril':'Abril','may':'Mayo','mayo':'Mayo','june':'Junio','junio':'Junio',
    'july':'Julio','julio':'Julio','august':'Agosto','agosto':'Agosto',
    'september':'Septiembre','septiembre':'Septiembre','october':'Octubre','octubre':'Octubre',
    'november':'Noviembre','noviembre':'Noviembre','december':'Diciembre','diciembre':'Diciembre'
  };
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const mn = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const idx = parseInt(raw.split('-')[1], 10) - 1;
    return mn[idx] || null;
  }
  return map[raw.toLowerCase()] || raw;
}

// ─── PROCESAR MOVIMIENTOS DESDE DB ───────────
function processMovimientosFromDB(movs, _cfgDataEfAutoContrib) {
  const mesNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  mesNames.forEach(m => {
    EXCEL_DATA[m] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
  });

  if (!movs || movs.length === 0) {
    try {
      const _snapKey = 'fin_movimientos_snapshot_' + (currentUser?.id || 'anon');
      const snap = localStorage.getItem(_snapKey);
      if (snap) {
        let parsed = null;
        try { parsed = JSON.parse(snap); } catch(_je) { localStorage.removeItem(_snapKey); }
        if (parsed) {
          let restored = 0;
          Object.entries(parsed).forEach(([mes, txns]) => {
            if (Array.isArray(txns) && txns.length > 0) {
              EXCEL_DATA[mes] = EXCEL_DATA[mes] || {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
              EXCEL_DATA[mes].transactions = txns;
              restored += txns.length;
            }
          });
          if (restored > 0) {
            console.warn('[processMovimientosFromDB] Sin datos de red — restaurados', restored, 'movimientos');
            toast('📵 Sin datos de red — mostrando último snapshot guardado (' + restored + ' movimientos)', 'warn');
            mesNames.forEach(m => {
              if (EXCEL_DATA[m].transactions.length > 0) { userModifiedMonths.add(m); recalcMonth(m); }
            });
            const activeMeses = mesNames.filter(m => EXCEL_DATA[m]?.transactions?.length > 0);
            if (activeMeses.length > 0) {
              activeMonths.length = 0;
              activeMeses.forEach(m => activeMonths.push(m));
              currentMonth = activeMeses[activeMeses.length - 1];
            }
          }
        }
      }
    } catch(_) {}
    return;
  }

  movs.forEach(r => {
    const m = normalizeMes(r.mes);
    if (!m) return;
    if (!EXCEL_DATA[m]) EXCEL_DATA[m] = {ingresos:0,gastos:0,ahorros:0,ajustes:0,balance:0,cat_totals:{},transactions:[]};
    const newTxn = {
      id: r.id, desc: r.descripcion, tipo: r.tipo, cat: r.cat,
      subcat: r.subcat, amount: parseFloat(r.amount),
      amountBs: parseFloat(r.amount_bs||0), method: r.method, date: r.fecha,
      author: r.author || null, cuenta_id: r.cuenta_id || null,
      rate_type: r.rate_type || 'bcv',
      ef_contribution: r.ef_contribution ? parseFloat(r.ef_contribution) : null
    };
    const idx = EXCEL_DATA[m].transactions.findIndex(t => t.id === r.id);
    if (idx >= 0) { EXCEL_DATA[m].transactions[idx] = newTxn; }
    else { EXCEL_DATA[m].transactions.push(newTxn); }
  });

  mesNames.forEach(m => {
    if (EXCEL_DATA[m].transactions.length > 0) { userModifiedMonths.add(m); recalcMonth(m); }
  });
  const activeMeses = mesNames.filter(m => EXCEL_DATA[m]?.transactions?.length > 0);
  if (activeMeses.length > 0) {
    activeMonths.length = 0;
    activeMeses.forEach(m => activeMonths.push(m));
    currentMonth = activeMeses[activeMeses.length - 1];
  }

  {
    const resetDate = CONFIG.efResetDate || null;
    let autoTotalFromTxns = 0, hasIngresoTxns = false;
    Object.values(EXCEL_DATA).forEach(md => {
      (md.transactions || []).forEach(t => {
        if (['Ingreso Fijo','Ingreso Variable'].includes(t.tipo)) {
          hasIngresoTxns = true;
          if (!resetDate || !t.date || t.date > resetDate)
            autoTotalFromTxns += t.ef_contribution ?? (parseFloat(t.amount) * 0.30);
        }
      });
    });
    if (hasIngresoTxns) {
      CONFIG.efAutoContrib = autoTotalFromTxns;
    } else {
      const savedAutoContrib = _cfgDataEfAutoContrib;
      CONFIG.efAutoContrib = (savedAutoContrib != null && parseFloat(savedAutoContrib) > 0)
        ? parseFloat(savedAutoContrib) : 0;
    }
    CONFIG.emergencyFundBase = (CONFIG.efManualBase || 0) + CONFIG.efAutoContrib;
  }

  try {
    const snap = {};
    mesNames.forEach(m => { if (EXCEL_DATA[m]?.transactions?.length > 0) snap[m] = EXCEL_DATA[m].transactions; });
    localStorage.setItem('fin_movimientos_snapshot_' + currentUser.id, JSON.stringify(snap));
  } catch(_) {}
}

// ─── HEALTHCHECK ─────────────────────────────
function runHealthCheck() {
  const warnings = [];
  activeMonths.forEach(m => {
    const d = EXCEL_DATA[m];
    if (!d?.transactions?.length) warnings.push(`⚠️ ${m} sin transacciones en memoria`);
    if (d && d.ingresos < 0) warnings.push(`⚠️ Ingresos negativos en ${m}`);
  });
  if (warnings.length > 0) { console.warn('[Healthcheck]', warnings); toast('⚠️ Healthcheck: ' + warnings[0], 'warn'); }
  else { console.log('[Healthcheck] ✅ Todos los datos íntegros'); }
}

// ─── GUARDAR MOVIMIENTO ───────────────────────
async function sbSaveMov(mov, month, _retry = 0) {
  if (!currentUser || !sb) { pushOfflineQueue({ type: 'saveMov', mov, month }); return; }
  const uid = currentUser.id;
  const payload = {
    id: mov.id, user_id: uid, mes: month,
    descripcion: mov.desc || '', tipo: mov.tipo || 'Gasto',
    cat: mov.cat || '', subcat: mov.subcat || '',
    amount: typeof mov.amount === 'number' ? mov.amount : parseFloat(mov.amount) || 0,
    amount_bs: typeof mov.amountBs === 'number' ? mov.amountBs : parseFloat(mov.amountBs) || 0,
    method: mov.method || 'Otro', fecha: mov.date || getLocalToday(),
    cuenta_id: mov.cuenta_id || null, rate_type: mov.rate_type || 'bcv',
    author: mov.author || null, ef_contribution: mov.ef_contribution || null
  };
  if (!payload.id || !payload.user_id || !payload.mes) {
    console.error('[sbSaveMov] Payload inválido:', payload);
    toast('⚠️ Error interno al guardar (payload inválido)', 'err'); return;
  }
  try {
    const { error } = await sb.from('movimientos').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('[sbSaveMov] Error (retry=' + _retry + '):', JSON.stringify(error));
      if (_retry === 0) toast(`⚠️ No se sincronizó "${(mov.desc||'').slice(0,20)}" — ${error.message||error.code||'Error desconocido'}`, 'err');
      if (_retry < 2) setTimeout(() => sbSaveMov(mov, month, _retry + 1), 3000);
      else pushOfflineQueue({ type: 'saveMov', mov, month });
    }
  } catch(e) {
    console.error('[sbSaveMov] Excepción (retry=' + _retry + '):', e.message);
    if (_retry === 0) toast(`⚠️ Error de red al guardar "${(mov.desc||'').slice(0,20)}". Se reintentará.`, 'err');
    if (_retry < 2) setTimeout(() => sbSaveMov(mov, month, _retry + 1), 3000);
    else pushOfflineQueue({ type: 'saveMov', mov, month });
  }
}

// ─── SOFT DELETE ─────────────────────────────
async function sbDeleteMov(id) {
  if (!currentUser) return;
  window._deleteCount = (window._deleteCount || 0) + 1;
  window._deleteTimer = window._deleteTimer || setTimeout(() => { window._deleteCount = 0; window._deleteTimer = null; }, 60000);
  if (window._deleteCount >= 5) {
    const ok = await showConfirm('⚠️ Muchas eliminaciones', `Has eliminado ${window._deleteCount} movimientos en menos de 1 minuto. ¿Continuar?`, '⚠️');
    if (!ok) return; window._deleteCount = 0;
  }
  try {
    const movToDelete = Object.values(EXCEL_DATA).flatMap(d => d.transactions || []).find(t => t.id === id);
    const { error } = await sb.from('movimientos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', HOUSEHOLD_ID || currentUser.id);
    if (error) { console.error('Error eliminando:', error); toast('⚠️ No se pudo eliminar de la nube. Recarga la app.', 'err'); }
    else if (movToDelete) { sbLogMovimiento('eliminar', movToDelete, movToDelete._mes || currentMonth, null); }
  } catch(e) { toast('⚠️ Error de red al eliminar. Revisa tu conexión.', 'err'); }
}

// ─── AUDIT LOG ────────────────────────────────
async function sbLogMovimiento(accion, mov, mes, movAnterior) {
  if (!currentUser) return;
  try {
    await sb.from('registro_movimientos').insert({
      user_id: currentUser.id, email: currentUser.email, accion,
      mov_id: mov.id, mes, descripcion: mov.desc, tipo: mov.tipo, cat: mov.cat||'',
      amount: mov.amount, fecha_mov: mov.date,
      valor_anterior: movAnterior ? JSON.stringify(movAnterior) : null,
      created_at: new Date().toISOString()
    });
  } catch(e) { console.log('[AuditLog]', e.message); }
}

// ─── COLA OFFLINE ─────────────────────────────
function pushOfflineQueue(item) {
  try {
    const q = JSON.parse(localStorage.getItem('finanzas_sync_queue') || '[]');
    q.push({ ...item, ts: Date.now() });
    localStorage.setItem('finanzas_sync_queue', JSON.stringify(q));
  } catch(e) {}
}
function popOfflineQueue() {
  try { return JSON.parse(localStorage.getItem('finanzas_sync_queue') || '[]'); } catch(e) { return []; }
}
function clearOfflineQueue() { localStorage.removeItem('finanzas_sync_queue'); }

window.addEventListener('online', async () => {
  const cola = popOfflineQueue();
  if (cola.length > 0) {
    toast(`📡 Reconectado — sincronizando ${cola.length} movimiento(s)...`, 'ok');
    clearOfflineQueue();
    for (const item of cola) {
      if (item.type === 'saveMov') await sbSaveMov(item.mov, item.month);
    }
    toast('✅ Sincronización completa', 'ok');
  }
});

// ─── CONFIG DEFAULTS (seed) ───────────────────
function initConfigFromDefaults() {
  if (!CONFIG.tipos?.length) {
    CONFIG.tipos = ['Gasto','Ingreso Fijo','Ingreso Variable','Ahorro en efectivo','Prestamo recibido','Prestamo pagado','Ajuste'];
  }
  if (!CONFIG.categorias || Object.keys(CONFIG.categorias).length === 0) {
    CONFIG.categorias = {
      'Gasto': ['🏡Casa','🥑ComidaMercado','Familia','🚓Transporte','Viajes','🏦Cashea','🚑Salud','📺Suscripciones','💅CuidadoPersonal','📽️Entretenimiento','🛸Otros','Antojos','Deudas'],
      'Ingreso Fijo': ['Salario mensual neto Isabel','Salario mensual neto Anthony','Salario pacientes Anthony','Dinerito extra'],
      'Ingreso Variable': ['Salario mensual neto Isabel','Salario mensual neto Anthony','Salario pacientes Anthony','Dinerito extra'],
      'Ahorro en efectivo': ['AHORRO COCHINITO'],
      'Prestamo recibido': ['🛸Otros','Familia','Amigos'],
      'Prestamo pagado': ['Familia','Amigos','🛸Otros','🏦Cashea'],
      'Ajuste': ['Ajuste general']
    };
  }
  if (!CONFIG.subcategorias || Object.keys(CONFIG.subcategorias).length === 0) {
    CONFIG.subcategorias = {
      '🏡Casa': ['Condominio','Luz y aseo','Articulo hogar','Internet'],
      '🥑ComidaMercado': ['Mercado','Restaurantes','Chucheria','Pan dulce','Charcuteria','Verduras','Mercadito','Proteinas','Frutas','Comida'],
      'Familia': ['Colegiaturas','Clases de deporte'],
      '🚓Transporte': ['Yummy','Autobus'],
      'Viajes': ['Vuelos de avión','Hospedajes'],
      '🏦Cashea': ['Pago de Cashea'],
      '🚑Salud': ['Consultas médicas','Ginecologo','Gimnasio'],
      '📺Suscripciones': ['Netflix','Spotify','Max','Amazon Prime','Disney +','Google One','Ads Facebook'],
      '💅CuidadoPersonal': ['Corte de cabello','Manos y pies','Cejas y uñas'],
      '📽️Entretenimiento': ['Tickets de cine','Otros'],
      '🛸Otros': ['Otros','Prestamo','Cashea'],
      'Antojos': ['Comida','Articulos','Ropa','Compras nerviosas'],
      'Deudas': ['Pago de Cashea','Pago de prestamos'],
      'AHORRO COCHINITO': [], 'Salario mensual neto Isabel': [],
      'Salario mensual neto Anthony': [], 'Salario pacientes Anthony': [],
      'Dinerito extra': [], 'Ajuste general': []
    };
  }
  if (!CONFIG.presupuestos || Object.keys(CONFIG.presupuestos).length === 0) {
    CONFIG.presupuestos = {
      'ingresos': 550, 'gastos': 1229.98,
      '🏡Casa': 130, '🥑ComidaMercado': 300, 'Familia': 0, '🚓Transporte': 144,
      'Viajes': 0, '🏦Cashea': 209.98, '🚑Salud': 60, '📺Suscripciones': 106,
      '💅CuidadoPersonal': 70, '📽️Entretenimiento': 0, '🛸Otros': 0, 'Antojos': 0, 'Deudas': 210
    };
  }
  console.log('[initConfigFromDefaults] seed aplicado');
}

// ─── GUARDAR CONFIG ───────────────────────────
async function sbSaveConfig() {
  if (!currentUser) return;
  const writeUid = currentUser.id;
  try {
    localStorage.setItem('fin_templates_v3',   JSON.stringify(templates || []));
    localStorage.setItem('fin_recurrentes_bk', JSON.stringify(RECURRENTES || []));
    localStorage.setItem('fin_ef_split', JSON.stringify({
      base: CONFIG.efManualBase || 0, auto: CONFIG.efAutoContrib || 0,
      reset: CONFIG.efResetDate || null, goal: CONFIG.emergencyFundGoal || 3000
    }));
    localStorage.setItem('fin_metas_ahorro', JSON.stringify(CONFIG.metasAhorro || []));
  } catch(e) {}
  if (!currentUser) return;
  try {
    const { error } = await sb.from('config_usuario').upsert({
      user_id:               writeUid,
      tipos:                 CONFIG.tipos,
      categorias:            CONFIG.categorias,
      subcategorias:         CONFIG.subcategorias,
      presupuestos:          CONFIG.presupuestos,
      presupuestos_ingresos: CONFIG.presupuestosIngresos || {},
      presupuestos_subcat:   CONFIG.presupuestosSubcat   || {},
      closed_months:         CONFIG.closedMonths,
      dashboard_order:       CONFIG.dashboardOrder || null,
      nav_order:             CONFIG.navOrder       || null,
      emergency_fund_base:   (CONFIG.efManualBase || 0) + (CONFIG.efAutoContrib || 0),
      emergency_fund_goal:   CONFIG.emergencyFundGoal || 3000,
      ef_manual_base:        CONFIG.efManualBase  || 0,
      ef_auto_contrib:       CONFIG.efAutoContrib || 0,
      ef_reset_date:         CONFIG.efResetDate   || null,
      recurrentes:           RECURRENTES || [],
      plantillas:            templates   || [],
      metas_ahorro:          CONFIG.metasAhorro || [],
      pin_hash:              CONFIG._pinHash    || null,
      cat_emojis:            CONFIG.catEmojis   || {},
      cat_rules:             (function(){ try { return JSON.parse(localStorage.getItem('fin_cat_rules_v1') || '[]'); } catch(e) { return []; } })(),
      wallet_order:          CONFIG.walletOrder || [],
      updated_at:            getLocalToday() + 'T' + new Date().toTimeString().slice(0,8) + 'Z'
    }, { onConflict: 'user_id' });
    try {
      if (CONFIG.catEmojis && Object.keys(CONFIG.catEmojis).length > 0)
        localStorage.setItem('fin_cat_emojis_local', JSON.stringify(CONFIG.catEmojis));
    } catch(e) {}
    if (error) { console.error('[sbSaveConfig] upsert error:', error.message); }
    else { console.log('[sbSaveConfig] ✓ guardado'); }
  } catch(e) { console.error('[sbSaveConfig] exception:', e.message); }
}

async function forzarSincConfig() {
  if (!currentUser) { toast('Inicia sesión primero', 'err'); return; }
  toast('🔄 Sincronizando configuración...', 'ok');
  try {
    await sbSaveConfig();
    toast('✅ Configuración sincronizada correctamente', 'ok');
    if (typeof renderSettingsTab === 'function') {
      const activePanelTab = document.querySelector('.sett-tab-btn.active');
      if (activePanelTab) renderSettingsTab(activePanelTab.dataset.tab || 'presupuestos');
    }
  } catch(e) { toast('❌ Error al sincronizar: ' + e.message, 'err'); }
}

// ─── GUARDAR TASAS ────────────────────────────
async function sbSaveTasas() {
  if (!currentUser) return;
  const hid = HOUSEHOLD_ID || currentUser.id;
  await sb.from('tasas_cambio').upsert({
    user_id: hid, mes: 'global', rate_bcv: rateBCV, rate_eur: rateEUR,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,mes' });
  sbSaveTasaHistorica();
}

async function sbSaveTasaHistorica(fecha) {
  if (!rateBCV || rateBCV <= 0) return;
  const dia = fecha || new Date().toISOString().slice(0, 10);
  try {
    await sb.from('tasas_historicas').upsert({
      fecha: dia, household_key: 'anthony-isabel-2026',
      rate_bcv: rateBCV, rate_eur: rateEUR
    }, { onConflict: 'fecha,household_key' });
  } catch(e) { console.warn('[tasas_historicas] save error:', e.message); }
}

async function getTasaByFecha(fecha) {
  if (!fecha || !sb) return null;
  try {
    const { data } = await sb.from('tasas_historicas').select('rate_bcv,rate_eur').eq('fecha', fecha).maybeSingle();
    return data || null;
  } catch(e) { return null; }
}

// ─── SUPABASE: GUARDAR FONDO EMERGENCIA ──────────────────────────────────────
// Extraído de app-core.js — función huérfana completada 13 Abr 2026
async function sbSaveFondo(month) {
  if (!currentUser) return;
  const hid = HOUSEHOLD_ID || currentUser.id;
  await sb.from('fondo_emergencia').upsert({
    user_id: hid, mes: month,
    monto: emergencyFundByMonth[month] || 0,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,mes' });
}
