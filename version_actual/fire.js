function showPatrimonioHelp() {
  showConfirm(
    '🏦 ¿Qué es el Patrimonio Estimado?',
    `<div style="text-align:left;line-height:1.7;font-size:.78rem">
      <b>💰 Ahorro acumulado:</b> Todo lo que has apartado como "Ahorro en efectivo" (cochinito) en todos los meses registrados.<br><br>
      <b>💵 Balance (mes actual)ulado:</b> La suma de (Ingresos − Gastos + Ajustes) de todos los meses. Lo que "quedó en mano" cada mes.<br><br>
      <b>📊 Patrimonio Neto:</b> Ahorro + Balance. Es el valor económico total que han construido Anthony e Isabel desde que empezaron a registrar en esta app.<br><br>
      <i style="color:#8b949e">⚠️ No incluye propiedades, inversiones externas, deudas ni activos físicos. Solo refleja lo registrado aquí.</i>
    </div>`,
    'ℹ️'
  );
}

function calcFire() {
  const meta = parseFloat(document.getElementById('fire-meta').value)||200000;
  const retorno = parseFloat(document.getElementById('fire-retorno').value)/100||0.07;
  const gastosAnuales = parseFloat(document.getElementById('fire-gastos-anuales').value)||15000;
  const avgAhorro = activeMonths.reduce((s,m)=>s+EXCEL_DATA[m].ahorros,0)/activeMonths.length;
  const ahorroAnual = avgAhorro * 12;
  let patrimonioActual = 0;
  activeMonths.forEach(m=>{patrimonioActual+=EXCEL_DATA[m].ahorros+EXCEL_DATA[m].balance});
  // Extra savings from Cochinito
  try{var _esRaw=localStorage.getItem('finanzas_cochinito_v2');if(_esRaw){var _esArr=JSON.parse(_esRaw);var _extraSavings=_esArr.reduce(function(s,x){return s+(parseFloat(x.amount)||0);},0);patrimonioActual+=_extraSavings;}}catch(e){}
  let años=0, acumulado=patrimonioActual;
  while(acumulado<meta && años<100){acumulado=acumulado*(1+retorno)+ahorroAnual;años++;}
  const capitalNecesario = gastosAnuales / 0.04;
  let añosFire=0, acc2=patrimonioActual;
  while(acc2<capitalNecesario && añosFire<100){acc2=acc2*(1+retorno)+ahorroAnual;añosFire++;}
  const añosFaltanMeta = años >= 100 ? '> 100' : `${años} años`;
  const añosFaltanFire = añosFire >= 100 ? '> 100' : `${añosFire} años`;
  const pctAvance = Math.min(100, (patrimonioActual / capitalNecesario * 100)).toFixed(1);
  document.getElementById('fire-result').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:7px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted)">Ahorro mensual prom.</div>
        <div style="font-size:.95rem;font-weight:700;color:var(--green)">${fmt(avgAhorro)}</div>
      </div>
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:7px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted)">Patrimonio actual</div>
        <div style="font-size:.95rem;font-weight:700;color:var(--blue)">${fmt(patrimonioActual)}</div>
      </div>
    </div>
    <div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:.65rem;margin-bottom:3px">
        <span style="color:var(--muted)">Avance hacia FIRE</span>
        <span style="color:var(--gold);font-weight:600">${pctAvance}%</span>
      </div>
      <div style="background:#0d1117;border-radius:4px;height:6px;overflow:hidden">
        <div style="height:100%;width:${pctAvance}%;background:linear-gradient(90deg,#e3b341,#3fb950);border-radius:4px;transition:.5s"></div>
      </div>
    </div>
    <hr style="border-color:var(--border);margin:6px 0">
    <strong>Capital FIRE necesario:</strong> ${fmt(capitalNecesario)}<br>
    <strong>Para llegar a tu meta ${fmt(meta)}:</strong> ${añosFaltanMeta} años<br>
    <strong>🎯 Independencia financiera:</strong> <span class="highlight">Año ${new Date().getFullYear()+Math.min(añosFire,100)}</span> (${añosFaltanFire} años)<br>
    <span style="font-size:.65rem;color:#484f58">Retorno ${(retorno*100).toFixed(1)}%/año · Gastos ${fmt(gastosAnuales)}/año · Regla 4%</span>`;
}

// ─── SIMULADOR META DE AHORRO ────────────────
function calcGoal() {
  const meta       = parseFloat(document.getElementById('goal-meta')?.value) || 3000;
  const yaAhorrado = parseFloat(document.getElementById('goal-actual')?.value) || 0;
  const extra      = parseFloat(document.getElementById('goal-extra')?.value) || 0;
  const plazoDeseado = parseInt(document.getElementById('goal-plazo')?.value) || 12;

  // Promedio mensual de ahorro real de los datos
  const avgAhorro = activeMonths.length
    ? activeMonths.reduce((s,m) => s + EXCEL_DATA[m].ahorros, 0) / activeMonths.length
    : 0;

  const totalMensual = avgAhorro + extra;
  const faltante     = Math.max(0, meta - yaAhorrado);
  const resultEl     = document.getElementById('goal-result');
  if (!resultEl) return;

  // Cuánto se necesita ahorrar para lograr la meta en el plazo deseado
  const ahorroNecesarioPorMes = plazoDeseado > 0 ? faltante / plazoDeseado : 0;

  if (totalMensual <= 0 && ahorroNecesarioPorMes <= 0) {
    resultEl.innerHTML = '<span style="color:var(--red)">⚠️ Sin datos de ahorro aún. Registra movimientos primero.</span>';
    return;
  }

  const meses         = totalMensual > 0 ? Math.ceil(faltante / totalMensual) : 9999;
  const años          = Math.floor(meses / 12);
  const mesesResto    = meses % 12;
  const fechaMeta     = new Date();
  fechaMeta.setMonth(fechaMeta.getMonth() + meses);
  const fechaStr      = fechaMeta.toLocaleDateString('es-VE', { month:'long', year:'numeric' });
  const pct           = Math.min(100, (yaAhorrado / meta * 100)).toFixed(1);
  const tiempoStr     = años > 0
    ? `${años} año${años>1?'s':''} y ${mesesResto} mes${mesesResto!==1?'es':''}`
    : `${meses} mes${meses!==1?'es':''}`;

  const diffVsNecesario = totalMensual - ahorroNecesarioPorMes;
  const colorNecesario = diffVsNecesario >= 0 ? 'var(--green)' : 'var(--red)';
  const statusMsg = diffVsNecesario >= 0 
    ? `✅ ¡Llegas! Ahorras ${fmt(diffVsNecesario)} extra/mes`
    : `⚠️ Necesitas ${fmt(Math.abs(diffVsNecesario))} más/mes`;

  resultEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:7px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted)">Ahorro actual/mes</div>
        <div style="font-size:.95rem;font-weight:700;color:var(--green)">${fmt(totalMensual)}</div>
      </div>
      <div style="background:#0d1117;border:1px solid #bc8cff;border-radius:6px;padding:7px;text-align:center">
        <div style="font-size:.6rem;color:var(--muted)">Necesitas/mes (en ${plazoDeseado} meses)</div>
        <div style="font-size:.95rem;font-weight:700;color:var(--purple)">${fmt(ahorroNecesarioPorMes)}</div>
      </div>
    </div>
    <div style="background:#1c2128;border:1px solid #30363d;border-radius:6px;padding:8px;margin-bottom:8px;font-size:.72rem;text-align:center;color:${colorNecesario};font-weight:600">${statusMsg}</div>
    <div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:.65rem;margin-bottom:3px">
        <span style="color:var(--muted)">Progreso hacia ${fmt(meta)}</span>
        <span style="color:var(--blue);font-weight:600">${pct}%</span>
      </div>
      <div style="background:#0d1117;border-radius:4px;height:6px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#58a6ff,#3fb950);border-radius:4px;transition:.5s"></div>
      </div>
    </div>
    <hr style="border-color:var(--border);margin:6px 0">
    <strong>Con tu ahorro actual llegarás en:</strong> <span class="highlight">${tiempoStr}</span><br>
    <strong>Fecha estimada:</strong> <span style="color:var(--blue)">${fechaStr}</span><br>
    <span style="font-size:.65rem;color:#484f58">Basado en ${activeMonths.length} mes${activeMonths.length!==1?'es':''} de datos reales</span>
  `;
}
async function saveGoal() {
  if (!currentUser) return;
  if (!navigator.onLine) { toast('📵 Sin internet', 'err'); return; }
  const cfg = {
    meta: parseFloat(document.getElementById('goal-meta')?.value) || 3000,
    actual: parseFloat(document.getElementById('goal-actual')?.value) || 0,
    extra: parseFloat(document.getElementById('goal-extra')?.value) || 0,
    plazo: parseInt(document.getElementById('goal-plazo')?.value) || 12
  };
  try {
    const hid2 = HOUSEHOLD_ID || currentUser.id;
    const { data: existing } = await sb.from('config_usuario').select('fire_config').eq('user_id', hid2).single();
    const merged = { ...(existing?.fire_config || {}), goal: cfg };
    await sb.from('config_usuario').upsert({ user_id: hid2, fire_config: merged }, { onConflict: 'user_id' });
    toast('🎯 Meta guardada ✅', 'ok');
  } catch(e) {
    // Fallback: guardar localmente si Supabase falla
    try { localStorage.setItem('fin_goal_cfg', JSON.stringify(cfg)); } catch(_){}
    toast('🎯 Meta guardada (sin internet se sincronizará después)', 'warn');
  }
}
async function loadGoal() {
  try {
    const { data } = await sb.from('config_usuario').select('fire_config').eq('user_id', HOUSEHOLD_ID || currentUser.id).single();
    const g = data?.fire_config?.goal;
    if (g) {
      if (g.meta !== undefined && document.getElementById('goal-meta')) document.getElementById('goal-meta').value = g.meta;
      if (g.actual !== undefined && document.getElementById('goal-actual')) document.getElementById('goal-actual').value = g.actual;
      if (g.extra !== undefined && document.getElementById('goal-extra')) document.getElementById('goal-extra').value = g.extra;
      if (g.plazo !== undefined && document.getElementById('goal-plazo')) document.getElementById('goal-plazo').value = g.plazo;
    }
  } catch(e) { console.log('loadGoal:', e); }
  calcGoal();
}

// ─── GUARDAR / CARGAR FIRE ───────────────────
async function saveFire() {
  if (!currentUser) return;
  if (!navigator.onLine) { toast('📵 Sin internet — no se puede guardar', 'err'); return; }
  const cfg = {
    meta: parseFloat(document.getElementById('fire-meta').value) || 200000,
    retorno: parseFloat(document.getElementById('fire-retorno').value) || 7,
    gastos: parseFloat(document.getElementById('fire-gastos-anuales').value) || 15000
  };
  try {
    const { error: fErr } = await sb.from('config_usuario')
      .upsert({ user_id: HOUSEHOLD_ID || currentUser.id, fire_config: cfg }, { onConflict: 'user_id' });
    if (fErr) throw fErr;
    toast('🔥 Simulador FIRE guardado ✅', 'ok');
  } catch(e) {
    try { localStorage.setItem('fin_fire_cfg', JSON.stringify(cfg)); } catch(_){}
    toast('🔥 FIRE guardado localmente ✅', 'ok');
    console.warn('[saveFire]', e.message);
  }
}
async function loadFire() {
  if (!currentUser) return;
  try {
    const { data } = await sb.from('config_usuario')
      .select('fire_config').eq('user_id', HOUSEHOLD_ID || currentUser.id).single();
    if (data?.fire_config && Object.keys(data.fire_config).length > 0) {
      const f = data.fire_config;
      if (f.meta) document.getElementById('fire-meta').value = f.meta;
      if (f.retorno) document.getElementById('fire-retorno').value = f.retorno;
      if (f.gastos) document.getElementById('fire-gastos-anuales').value = f.gastos;
    }
  } catch(e) { console.log('loadFire:', e.message); }
  calcFire();
  calcGoal();
}

