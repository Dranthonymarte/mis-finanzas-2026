// charts.js — extraído de app-core.js (bytes ~110k-145k)
// Funciones: renderKPIs, calcScore, scoreLabel, renderAlertas,
//            renderCharts, renderSubcatChart, renderIncomeTypeChart,
//            renderRanking, renderIncomeRanking, renderEmergencyFund,
//            saveEFGoal, updateEFGoal, renderWeeklyBreakdown,
//            renderBudgetBars, renderAnomalias, renderTransactions,
//            renderPatrimonio, showPatrimonioHelp

function renderKPIs(d) {
  document.getElementById('k-ingresos').textContent = fmt(d.ingresos);
  document.getElementById('k-gastos').textContent = fmt(d.gastos);
  const totalAhorrosTodosMeses = activeMonths.reduce((s,m) => s + (EXCEL_DATA[m]?.ahorros||0), 0);
  document.getElementById('k-ahorros').textContent = fmt(d.ahorros);
  const kAhorrosSub = document.getElementById('k-ahorros-sub');
  if (kAhorrosSub) kAhorrosSub.textContent = `Total: ${fmt(totalAhorrosTodosMeses)}`;
  const bal = d.balance;
  const balEl = document.getElementById('k-balance');
  balEl.textContent = (bal >= 0 ? '+' : '') + fmtSigned(bal);
  balEl.style.color = bal >= 0 ? 'var(--green)' : 'var(--red)';
  const score = calcScore(d);
  const [slabel, scolor] = scoreLabel(score);
  document.getElementById('k-score').textContent = score + '/100';
  document.getElementById('k-score').style.color = scolor;
  document.getElementById('k-score-label').textContent = slabel;
  document.getElementById('k-score-bar').style.width = score + '%';
  syncEF();
  const avgSaving = activeMonths.reduce((s,m) => s + EXCEL_DATA[m].ahorros, 0) / activeMonths.length;
  document.getElementById('k-forecast').textContent = fmt(avgSaving * 12);
}

function calcScore(d) {
  if (!d.ingresos) return 0;
  const ratioAhorro = d.ahorros / d.ingresos;
  const ratioGasto = d.gastos / d.ingresos;
  let score = Math.min(ratioAhorro * 200, 50) + Math.max(0, 50 - ratioGasto * 50);
  if (d.balance > 0) score += 10;
  return Math.round(Math.min(100, Math.max(0, score)));
}
function scoreLabel(s) {
  if (s >= 80) return ['Excelente','#3fb950'];
  if (s >= 60) return ['Bueno','#58a6ff'];
  if (s >= 40) return ['Regular','#e3b341'];
  return ['Critico','#f85149'];
}

function renderAlertas(d) {
  const c = document.getElementById('alertas-container');
  c.innerHTML = '';
  if (!d.ingresos && !d.gastos) return;
  const alerts = [];
  const ratioAhorro = d.ingresos ? d.ahorros / d.ingresos : 0;
  const ratioGasto = d.ingresos ? d.gastos / d.ingresos : 0;
  if (d.balance < 0) alerts.push(['bad','','Deficit de '+fmt(Math.abs(d.balance))+' este mes.']);
  else if (d.balance > 0) alerts.push(['ok','','Superavit de '+fmt(d.balance)+' excelente gestion este mes.']);
  if (ratioAhorro >= 0.20) alerts.push(['ok','','Tasa de ahorro: '+Math.round(ratioAhorro*100)+'% sobre meta 20%.']);
  else if (ratioAhorro > 0) alerts.push(['warn','','Tasa de ahorro: '+Math.round(ratioAhorro*100)+'%. Meta: 20%.']);
  if (ratioGasto > 1) alerts.push(['bad','','Gastos = '+Math.round(ratioGasto*100)+'% de ingresos. Gastando mas de lo que entra.']);
  else if (ratioGasto > 0.8) alerts.push(['warn','','Gastos = '+Math.round(ratioGasto*100)+'% de ingresos. Margen ajustado.']);
  const catExcedidas = Object.entries(d.cat_totals).filter(([cat,amt]) => CONFIG.presupuestos[cat] > 0 && amt > CONFIG.presupuestos[cat]);
  if (catExcedidas.length > 0) alerts.push(['bad','','Presupuesto excedido en: '+catExcedidas.map(([c])=>c).join(', ')]);
  const ef = (CONFIG.efManualBase||0)+(CONFIG.efAutoContrib||0);
  const efPct = ef/(CONFIG.emergencyFundGoal||3000);
  if (efPct < 0.20) alerts.push(['warn','','Fondo emergencia al '+Math.round(efPct*100)+'%. Meta: '+fmt(CONFIG.emergencyFundGoal)]);
  else if (efPct >= 1) alerts.push(['ok','','Fondo de emergencia completo! '+fmt(ef)+' acumulados.']);
  if (CONFIG.closedMonths.includes(currentMonth)) alerts.push(['info','','Mes '+currentMonth+' cerrado.']);
  const topCat = Object.entries(d.cat_totals)[0];
  if (topCat) alerts.push(['info','','Top gasto: '+topCat[0]+' '+fmt(topCat[1])+' ('+Math.round(topCat[1]/d.gastos*100)+'% del total).']);
  alerts.forEach(([type,icon,msg]) => {
    const div = document.createElement('div');
    div.className = 'alerta alerta-'+type;
    div.innerHTML = '<span class="alerta-icon">'+icon+'</span><span>'+msg+'</span>';
    c.appendChild(div);
  });
}

function renderCharts(d) {
  const ctx1 = document.getElementById('chart-overview').getContext('2d');
  if (charts.overview) charts.overview.destroy();
  charts.overview = new Chart(ctx1, {
    type:'bar', data:{
      labels: activeMonths,
      datasets:[
        {label:'Ingresos',data:activeMonths.map(m=>convertAmt(EXCEL_DATA[m].ingresos)),backgroundColor:'rgba(63,185,80,.7)',borderRadius:4},
        {label:'Gastos',data:activeMonths.map(m=>convertAmt(EXCEL_DATA[m].gastos)),backgroundColor:'rgba(248,81,73,.7)',borderRadius:4},
        {label:'Ahorros',data:activeMonths.map(m=>convertAmt(EXCEL_DATA[m].ahorros)),backgroundColor:'rgba(88,166,255,.7)',borderRadius:4},
        {label:'Ajustes',data:activeMonths.map(m=>convertAmt(EXCEL_DATA[m].ajustes||0)),backgroundColor:'rgba(188,140,255,.7)',borderRadius:4}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8b949e',font:{size:10}}}},scales:{x:{ticks:{color:'#8b949e'},grid:{color:'rgba(48,54,61,.4)'}},y:{ticks:{color:'#8b949e',callback:function(v){return (currentCurrency==='BS'?'Bs ':currentCurrency==='EUR'?'e':'$')+v.toLocaleString();}},grid:{color:'rgba(48,54,61,.4)'}}}}
  });
  const cats = Object.entries(d.cat_totals).slice(0,7);
  const ctx2 = document.getElementById('chart-pie').getContext('2d');
  if (charts.pie) charts.pie.destroy();
  const pieColors = ['#f85149','#e3b341','#58a6ff','#3fb950','#bc8cff','#39d353','#ff7b72'];
  charts.pie = new Chart(ctx2, {
    type:'doughnut', data:{
      labels: cats.map(function([k]){return k;}),
      datasets:[{data:cats.map(function([,v]){return convertAmt(v);}),backgroundColor:pieColors,borderColor:'#0d1117',borderWidth:2}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8b949e',font:{size:9},boxWidth:9}}}}
  });
  const ctx3 = document.getElementById('chart-patrimonio').getContext('2d');
  if (charts.pat) charts.pat.destroy();
  let cumAhorro=0, cumBalance=0;
  const patData = activeMonths.map(function(m){ cumAhorro+=EXCEL_DATA[m].ahorros; cumBalance+=EXCEL_DATA[m].balance; return convertAmt(cumAhorro+cumBalance); });
  charts.pat = new Chart(ctx3, {
    type:'line', data:{
      labels:activeMonths,
      datasets:[{label:'Patrimonio Neto',data:patData,borderColor:'#e3b341',backgroundColor:'rgba(227,179,65,.1)',fill:true,tension:.4,pointBackgroundColor:'#e3b341',pointRadius:4}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8b949e',font:{size:10}}}},scales:{x:{ticks:{color:'#8b949e'},grid:{color:'rgba(48,54,61,.4)'}},y:{ticks:{color:'#8b949e',callback:function(v){return '$'+v;}},grid:{color:'rgba(48,54,61,.4)'}}}}
  });
}

function renderSubcatChart(d) {
  const filtersDiv = document.getElementById('subcat-cat-filters');
  const cats = Object.keys(d.cat_totals);
  filtersDiv.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'currency-btn'+(selectedSubcatFilter?'':' active');
  allBtn.textContent = 'Todos';
  allBtn.style.fontSize = '.65rem';
  allBtn.onclick = function(){ selectedSubcatFilter=null; renderSubcatChart(d); };
  filtersDiv.appendChild(allBtn);
  cats.forEach(function(cat){
    const btn = document.createElement('button');
    btn.className = 'currency-btn'+(selectedSubcatFilter===cat?' active':'');
    btn.textContent = cat;
    btn.style.fontSize = '.65rem';
    btn.onclick = function(){ selectedSubcatFilter=cat; renderSubcatChart(d); };
    filtersDiv.appendChild(btn);
  });
  const subcatTotals = {};
  d.transactions.filter(function(t){ return t.tipo==='Gasto'&&(!selectedSubcatFilter||t.cat===selectedSubcatFilter); })
    .forEach(function(t){ const k=t.subcat||t.cat; subcatTotals[k]=(subcatTotals[k]||0)+t.amount; });
  const entries = Object.entries(subcatTotals).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
  const ctx = document.getElementById('chart-subcat').getContext('2d');
  if (charts.subcat) charts.subcat.destroy();
  if (!entries.length) return;
  charts.subcat = new Chart(ctx, {
    type:'bar', data:{
      labels:entries.map(function([k]){return k;}),
      datasets:[{label:'Gasto',data:entries.map(function([,v]){return convertAmt(v);}),backgroundColor:'rgba(248,81,73,.7)',borderRadius:3}]
    },
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b949e',font:{size:9}},grid:{color:'rgba(48,54,61,.3)'}},y:{ticks:{color:'#8b949e',font:{size:9}},grid:{color:'rgba(48,54,61,.3)'}}}}
  });
}

function renderIncomeTypeChart(d) {
  const GREEN_PALETTE=['#3fb950','#56d364','#2ea043','#4ac26b','#26a641','#6fdd8b','#1f7a35','#34d058','#22863a','#85e89d'];
  const catTotals={};
  d.transactions.filter(function(t){return ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);})
    .forEach(function(t){ catTotals[t.cat||t.tipo]=(catTotals[t.cat||t.tipo]||0)+t.amount; });
  const catKeys=Object.keys(catTotals);
  const catColors=catKeys.map(function(_,i){return GREEN_PALETTE[i%GREEN_PALETTE.length];});
  const ctx=document.getElementById('chart-income-type').getContext('2d');
  if (charts.incType) charts.incType.destroy();
  charts.incType=new Chart(ctx,{type:'doughnut',data:{labels:catKeys,datasets:[{data:catKeys.map(function(k){return convertAmt(catTotals[k]);}),backgroundColor:catColors,borderColor:'#0d1117',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#8b949e',font:{size:10},boxWidth:10}}}}});
  const listDiv=document.getElementById('income-type-list');
  const catEntries=Object.entries(catTotals).sort(function(a,b){return b[1]-a[1];}).slice(0,4);
  listDiv.innerHTML=catEntries.map(function([cat,amt],i){
    return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:.72rem;padding:3px 0;border-bottom:1px solid rgba(48,54,61,.4)"><span>'+cat+'</span><span style="color:'+GREEN_PALETTE[i]+';font-weight:600">'+fmt(amt)+'</span></div>';
  }).join('');
}

function renderRanking(d) {
  const c=document.getElementById('ranking-container');
  const entries=Object.entries(d.cat_totals).slice(0,5);
  const max=entries[0]?entries[0][1]:1;
  const colors=['#f85149','#e3b341','#58a6ff','#3fb950','#bc8cff'];
  c.innerHTML=entries.map(function([cat,amt],i){
    return '<div class="rank-item"><div class="rank-num">#'+(i+1)+'</div><div class="rank-bar-wrap"><div class="rank-label"><span>'+cat+'</span><span style="color:'+colors[i]+';font-weight:600">'+fmt(amt)+'</span></div><div class="rank-bar"><div class="rank-fill" style="width:'+Math.round(amt/max*100)+'%;background:'+colors[i]+'"></div></div></div></div>';
  }).join('')||'<p style="color:var(--muted);font-size:.77rem">Sin datos.</p>';
}

function renderIncomeRanking(d) {
  const c=document.getElementById('income-ranking-container');
  const catTotals={};
  d.transactions.filter(function(t){return ['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);})
    .forEach(function(t){ catTotals[t.cat]=(catTotals[t.cat]||0)+t.amount; });
  const entries=Object.entries(catTotals).sort(function(a,b){return b[1]-a[1];}).slice(0,3);
  const max=entries[0]?entries[0][1]:1;
  const colors=['#3fb950','#39d353','#58a6ff'];
  c.innerHTML=entries.map(function([cat,amt],i){
    return '<div class="rank-item"><div class="rank-num">#'+(i+1)+'</div><div class="rank-bar-wrap"><div class="rank-label"><span>'+cat+'</span><span style="color:'+colors[i]+';font-weight:600">'+fmt(amt)+'</span></div><div class="rank-bar"><div class="rank-fill" style="width:'+Math.round(amt/max*100)+'%;background:'+colors[i]+'"></div></div></div></div>';
  }).join('')||'<p style="color:var(--muted);font-size:.77rem">Sin ingresos registrados.</p>';
}

function renderEmergencyFund() { syncEF(); }

async function saveEFGoal() {
  const val=parseFloat(document.getElementById('ef-goal-input')?.value);
  if (isNaN(val)||val<=0){toast('Ingresa un monto valido.','err');return;}
  const ok=await showConfirm('Cambiar Meta del Fondo','Establecer la meta en '+fmt(val)+'?','info');
  if (!ok) return;
  CONFIG.emergencyFundGoal=val; syncEF(); sbSaveConfig();
  toast('Meta guardada: '+fmt(val),'ok');
}
function updateEFGoal(val){
  const v=parseFloat(val);
  if (isNaN(v)||v<=0) return;
  CONFIG.emergencyFundGoal=v; syncEF();
}

function renderWeeklyBreakdown() {
  const cont=document.getElementById('weekly-breakdown-container');
  if (!cont) return;
  const d=EXCEL_DATA[currentMonth];
  const txns=(d?.transactions||[]).filter(function(t){return t.date&&t.tipo!=='Ajuste';});
  if (!txns.length){cont.innerHTML='<div style="color:#484f58;font-size:.75rem;padding:10px 0">Sin movimientos en este mes.</div>';return;}
  const weeks=[{label:'Sem 1',g:0,i:0,a:0,d:'1-7'},{label:'Sem 2',g:0,i:0,a:0,d:'8-14'},{label:'Sem 3',g:0,i:0,a:0,d:'15-21'},{label:'Sem 4+',g:0,i:0,a:0,d:'22-31'}];
  txns.forEach(function(t){
    const day=parseInt((t.date||'').split('-')[2])||parseInt((t.date||'').split('/')[0])||0;
    const wi=day<=7?0:day<=14?1:day<=21?2:3;
    if (['Gasto','Prestamo pagado'].includes(t.tipo)) weeks[wi].g+=t.amount;
    else if (['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo)) weeks[wi].i+=t.amount;
    else if (t.tipo.includes('Ahorro')) weeks[wi].a+=t.amount;
  });
  const maxVal=Math.max.apply(null,weeks.map(function(w){return Math.max(w.g,w.i,w.a);}));
  const mv=maxVal||1;
  let html='';
  weeks.forEach(function(w){
    const gP=Math.round((w.g/mv)*100), iP=Math.round((w.i/mv)*100), aP=Math.round((w.a/mv)*100);
    const hasData=w.g>0||w.i>0||w.a>0;
    html+='<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:.72rem;font-weight:600;color:var(--text)">'+w.label+'</span><span style="font-size:.65rem;color:var(--muted)">'+w.d+'</span></div>';
    if (!hasData){html+='<div style="font-size:.68rem;color:#484f58">Sin movimientos</div>';}
    else {
      if (w.i>0) html+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:.62rem;color:var(--green);width:14px">i</span><div style="flex:1;background:#1c2128;border-radius:3px;height:6px;overflow:hidden"><div style="width:'+iP+'%;height:100%;background:var(--green);border-radius:3px"></div></div><span style="font-size:.65rem;color:var(--green);min-width:44px;text-align:right">$'+w.i.toFixed(0)+'</span></div>';
      if (w.g>0) html+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:.62rem;color:var(--red);width:14px">g</span><div style="flex:1;background:#1c2128;border-radius:3px;height:6px;overflow:hidden"><div style="width:'+gP+'%;height:100%;background:var(--red);border-radius:3px"></div></div><span style="font-size:.65rem;color:var(--red);min-width:44px;text-align:right">$'+w.g.toFixed(0)+'</span></div>';
      if (w.a>0) html+='<div style="display:flex;align-items:center;gap:6px"><span style="font-size:.62rem;color:var(--blue);width:14px">a</span><div style="flex:1;background:#1c2128;border-radius:3px;height:6px;overflow:hidden"><div style="width:'+aP+'%;height:100%;background:var(--blue);border-radius:3px"></div></div><span style="font-size:.65rem;color:var(--blue);min-width:44px;text-align:right">$'+w.a.toFixed(0)+'</span></div>';
    }
    html+='</div>';
  });
  cont.innerHTML=html;
}

function renderBudgetBars(d) {
  const div=document.getElementById('budget-bars');
  const cats=Object.entries(CONFIG.presupuestos).filter(function([k,v]){return k!=='ingresos'&&k!=='gastos'&&v>0;});
  if (!cats.length){div.innerHTML='<p style="color:var(--muted);font-size:.73rem;text-align:center;padding:10px">Sin presupuestos configurados.</p>';return;}
  div.innerHTML=cats.slice(0,8).map(function([cat,budget]){
    const real=d.cat_totals[cat]||0;
    const pct=Math.min(real/budget*100,120);
    const colorText=pct>100?'var(--red)':pct>80?'var(--gold)':'var(--green)';
    const barBg=pct>100?'var(--red)':pct>80?'var(--gold)':'var(--green)';
    const realBold=pct>100?'font-weight:700;':'';
    const subcatPresup=CONFIG.presupuestosSubcat?CONFIG.presupuestosSubcat[cat]||{}:{};
    const subcatItems=Object.entries(subcatPresup).filter(function([,v]){return v>0;});
    let subcatHtml='';
    subcatItems.forEach(function([sc,bSc]){
      const realSc=(d.transactions||[]).filter(function(t){return t.tipo==='Gasto'&&t.cat===cat&&t.subcat===sc;}).reduce(function(s,t){return s+t.amount;},0);
      const pSc=bSc>0?Math.min(realSc/bSc*100,120):0;
      const cSc=pSc>100?'var(--red)':pSc>80?'var(--gold)':'#484f58';
      subcatHtml+='<div style="display:flex;align-items:center;gap:6px;margin-top:3px;padding-left:10px"><span style="font-size:.62rem;color:#8b949e;flex:1">'+sc+'</span><span style="font-size:.62rem;color:'+cSc+'">'+fmt(realSc)+'/'+fmt(bSc)+'</span><div style="width:50px;height:3px;background:#21262d;border-radius:2px"><div style="width:'+Math.min(pSc,100)+'%;height:3px;background:'+cSc+';border-radius:2px"></div></div></div>';
    });
    return '<div class="budget-cat" style="margin-bottom:'+(subcatItems.length?'10':'8')+'px"><div class="budget-label"><span style="font-size:.7rem">'+cat+'</span><span style="font-size:.67rem;color:'+colorText+';'+realBold+'">'+fmt(real)+' / '+fmt(budget)+'</span></div><div class="budget-track"><div class="budget-fill" style="width:'+Math.min(pct,100)+'%;background:'+barBg+'"></div></div>'+subcatHtml+'</div>';
  }).join('');
}

function renderAnomalias(d) {
  const c=document.getElementById('anomalias-container');
  c.innerHTML='';
  const gastos=d.transactions.filter(function(t){return t.tipo==='Gasto';});
  if (!gastos.length){c.innerHTML='<div class="alerta alerta-ok"><span>Sin transacciones para analizar.</span></div>';return;}
  const avg=gastos.reduce(function(s,t){return s+t.amount;},0)/gastos.length;
  const anomalias=gastos.filter(function(t){return t.amount>avg*1.8;}).sort(function(a,b){return b.amount-a.amount;}).slice(0,3);
  if (!anomalias.length){c.innerHTML='<div class="alerta alerta-ok"><span>Sin gastos anomalos. Promedio: '+fmt(avg)+'</span></div>';return;}
  anomalias.forEach(function(t){
    c.innerHTML+='<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:6px;padding:8px 10px;margin-bottom:6px;font-size:.73rem"><strong style="color:var(--red)">!! '+t.desc+'</strong> - '+fmt(t.amount)+'<br><span style="color:var(--muted);font-size:.67rem">'+t.date+' - '+t.cat+' - '+Math.round(t.amount/avg*100)+'% del promedio</span></div>';
  });
}

function renderTransactions(d) {
  const tbody=document.getElementById('txn-body');
  tbody.innerHTML='';
  const txns=[...d.transactions].sort(function(a,b){return b.date.localeCompare(a.date);});
  document.getElementById('txn-count').textContent='('+txns.length+' mov.)';
  if (!txns.length){tbody.innerHTML='<tr><td colspan="7" style="color:var(--muted);padding:16px;text-align:center">Sin movimientos registrados</td></tr>';return;}
  const isMobile=document.body.classList.contains('is-mobile')||window.innerWidth<=820;
  const isClosed=CONFIG.closedMonths.includes(currentMonth);
  if (isMobile) {
    tbody.innerHTML='<tr><td colspan="7" style="padding:0;border:none"><div id="txn-mobile-list"></div></td></tr>';
    const container=document.getElementById('txn-mobile-list');
    txns.forEach(function(t){
      const isIncome=['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);
      const isSaving=t.tipo==='Ahorro en efectivo';
      const isAdjust=t.tipo==='Ajuste';
      const amtColor=isAdjust?'var(--purple)':isIncome?'var(--green)':isSaving?'var(--blue)':'var(--red)';
      const sign=isAdjust?(t.amount>=0?'+':''):isIncome?'+':isSaving?'~':'-';
      const typeShort=t.tipo.replace('en efectivo','').replace('recibido','').replace(' Fijo','').replace(' Variable','').trim();
      const card=document.createElement('div');
      card.className='txn-mobile-card';
      card.dataset.id=t.id;
      card.style.cssText='position:relative;border-bottom:1px solid rgba(48,54,61,.5)';
      let btns=isClosed?'':'<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0"><button onclick="editMov(\''+t.id+'\',\''+currentMonth+'\')" style="background:rgba(58,166,255,0.12);border:1px solid rgba(88,166,255,0.3);color:var(--blue);width:30px;height:30px;border-radius:8px;font-size:.75rem;cursor:pointer">e</button><button onclick="deleteMov(\''+t.id+'\',\''+currentMonth+'\')" style="background:rgba(248,81,73,0.12);border:1px solid rgba(248,81,73,0.3);color:var(--red);width:30px;height:30px;border-radius:8px;font-size:.75rem;cursor:pointer">d</button></div>';
      card.innerHTML='<div class="txn-card-content" style="display:flex;align-items:center;gap:10px;padding:11px 12px;background:transparent"><div style="flex:1;min-width:0"><div style="font-size:.8rem;color:var(--text);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+t.desc+'</div><div style="font-size:.65rem;color:var(--muted);margin-top:2px">'+t.date.slice(5)+' - <span style="color:'+amtColor+';font-weight:600">'+typeShort+'</span> - '+t.cat+(t.subcat?' - '+t.subcat:'')+'</div></div><div style="text-align:right;flex-shrink:0;margin-right:6px"><div style="font-size:.9rem;font-weight:700;color:'+amtColor+'">'+sign+fmt(t.amount)+'</div><div style="font-size:.6rem;color:var(--muted)">'+(t.method||'-')+'</div></div>'+btns+'</div>';
      container.appendChild(card);
    });
    return;
  }
  txns.forEach(function(t){
    const isIncome=['Ingreso Fijo','Ingreso Variable','Prestamo recibido'].includes(t.tipo);
    const isSaving=t.tipo==='Ahorro en efectivo';
    const isAdjust=t.tipo==='Ajuste';
    const badge={'Gasto':'tipo-gasto','Ingreso Fijo':'tipo-ingreso','Ingreso Variable':'tipo-ingreso','Ahorro en efectivo':'tipo-ahorro','Prestamo recibido':'tipo-prestamo','Prestamo pagado':'tipo-gasto','Ajuste':'tipo-ajuste'}[t.tipo]||'tipo-ajuste';
    const amtClass=isAdjust?'txn-amount-adj':isIncome?'txn-amount-pos':isSaving?'txn-amount-sav':'txn-amount-neg';
    const sign=isAdjust?(t.amount>=0?'+':''):isIncome?'+':isSaving?'~':'-';
    const editBtn=isClosed?'':'<button class="btn-icon btn-edit" onclick="editMov(\''+t.id+'\',\''+currentMonth+'\')">e</button><button class="btn-icon btn-delete" onclick="deleteMov(\''+t.id+'\',\''+currentMonth+'\')">d</button>';
    tbody.innerHTML+='<tr><td style="color:var(--muted);white-space:nowrap">'+t.date.slice(5)+'</td><td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+t.desc+'</td><td><span class="tipo-badge '+badge+'">'+t.tipo.replace('en efectivo','').replace('recibido','').replace('pagado','').trim()+'</span></td><td style="color:var(--muted);font-size:.7rem">'+t.cat+(t.subcat?' - '+t.subcat:'')+'</td><td style="color:var(--muted);font-size:.68rem">'+(t.method||'-')+'</td><td class="'+amtClass+'">'+sign+fmt(t.amount)+'</td><td>'+editBtn+'</td></tr>';
  });
}

function renderPatrimonio() {
  let cumAhorro=0;
  activeMonths.forEach(function(m){cumAhorro+=(EXCEL_DATA[m].ahorros||0);});
  const d=EXCEL_DATA[currentMonth]||{};
  const currentBalance=d.balance||0;
  const totalDeudas=(window._deudasData&&window._deudasData.deudas||[]).filter(function(x){return !x.pagada;}).reduce(function(s,x){return s+((x.montoOriginal||0)-(x.montoAbonado||0));},0);
  const totalPrestamos=(window._prestamosData&&window._prestamosData.prestamos||[]).filter(function(x){return !x.cobrado;}).reduce(function(s,x){return s+((x.montoOriginal||0)-(x.montoAbonado||0));},0);
  const total=currentBalance+cumAhorro-totalDeudas+totalPrestamos;
  document.getElementById('p-ahorro').textContent=fmt(cumAhorro);
  document.getElementById('p-balance').textContent=(currentBalance>=0?'+':'')+fmt(currentBalance);
  const pDeudas=document.getElementById('p-deudas');
  const pPrestamos=document.getElementById('p-prestamos');
  if (pDeudas) pDeudas.textContent=totalDeudas>0?'-'+fmt(totalDeudas):'$0.00';
  if (pPrestamos) pPrestamos.textContent=totalPrestamos>0?'+'+fmt(totalPrestamos):'$0.00';
  const el=document.getElementById('p-total');
  el.textContent=(total>=0?'+':'')+fmt(total);
  el.style.color=total>=0?'var(--gold)':'var(--red)';
}

function showPatrimonioHelp() {
  showConfirm('Patrimonio Estimado','<div style="text-align:left;line-height:1.7;font-size:.78rem"><b>Ahorro acumulado:</b> Todo lo apartado como Ahorro en efectivo en todos los meses.<br><br><b>Balance mes actual:</b> Ingresos menos Gastos mas Ajustes.<br><br><b>Patrimonio Neto:</b> Ahorro + Balance menos Deudas + Prestamos por cobrar.<br><br><i style="color:#8b949e">No incluye propiedades ni inversiones externas.</i></div>','info');
}
