
// ═══════════════════════════════════════════════
// HOUSEHOLD.JS — Sistema multi-usuario con hogares aislados
// Globals requeridos: sb, currentUser, HOUSEHOLD_ID (declarados en app-core.js)
// Depende de: escHtml(), toast(), showConfirm(), doLogout(), loadFromSupabase(), USER_NAMES
// ═══════════════════════════════════════════════

async function resolveHouseholdId() {
  if (!currentUser || !sb) return;
  const uid = currentUser.id;
  try {
    const invite = await checkPendingInvitation();
    if (invite) {
      const accepted = await showInvitationModal(invite);
      if (accepted) {
        await sb.from('household_members').update({
          user_id: uid, invite_status: 'accepted',
          accepted_at: new Date().toISOString()
        }).eq('id', invite.id);
        HOUSEHOLD_ID = invite.household_id;
        console.log('[Household] invitación aceptada:', HOUSEHOLD_ID);
        return;
      } else {
        await sb.from('household_members').update({ invite_status: 'declined' }).eq('id', invite.id);
      }
    }
    const { data: membership, error: memErr } = await sb
      .from('household_members').select('household_id, role')
      .eq('user_id', uid).eq('invite_status', 'accepted').maybeSingle();
    if (memErr) throw memErr;
    if (membership?.household_id) {
      HOUSEHOLD_ID = membership.household_id;
      console.log('[Household] membresía activa:', HOUSEHOLD_ID, '| rol:', membership.role);
      return;
    }
    const { data: newHousehold, error: hhErr } = await sb
      .from('households').insert({ owner_user_id: uid, name: 'Mi Hogar' }).select('id').single();
    if (hhErr) throw hhErr;
    const { error: memInsertErr } = await sb.from('household_members').insert({
      household_id: newHousehold.id, user_id: uid,
      role: 'owner', invite_status: 'accepted',
      invite_email: currentUser.email?.toLowerCase()
    });
    if (memInsertErr) throw memInsertErr;
    HOUSEHOLD_ID = newHousehold.id;
    console.log('[Household] hogar nuevo creado:', HOUSEHOLD_ID);
  } catch (e) {
    console.error('[Household] error, fallback uid:', e.message);
    HOUSEHOLD_ID = uid;
  }
}

async function checkPendingInvitation() {
  if (!currentUser || !sb) return null;
  try {
    const { data: invite } = await sb.from('household_members')
      .select('id, household_id')
      .eq('invite_email', currentUser.email?.toLowerCase())
      .eq('invite_status', 'pending').maybeSingle();
    return invite || null;
  } catch (e) {
    console.warn('[Household] checkPendingInvitation falló:', e.message);
    return null;
  }
}

async function showInvitationModal(invite) {
  let hogarName = 'Hogar compartido', ownerEmail = '';
  try {
    const { data: hh } = await sb.from('households')
      .select('name, owner_user_id').eq('id', invite.household_id).maybeSingle();
    if (hh?.name) hogarName = hh.name;
    const { data: ownerMem } = await sb.from('household_members')
      .select('invite_email').eq('household_id', invite.household_id)
      .eq('role', 'owner').maybeSingle();
    if (ownerMem?.invite_email) ownerEmail = ownerMem.invite_email;
  } catch(_) {}
  const ownerDisplay = ownerEmail ? (USER_NAMES?.[ownerEmail] || ownerEmail.split('@')[0]) : 'otro usuario';
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:30000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:#161b22;border:1px solid #30363d;border-radius:16px;padding:28px;max-width:380px;width:100%;font-family:system-ui,sans-serif">
        <div style="font-size:2rem;text-align:center;margin-bottom:12px">🏠</div>
        <div style="font-size:1rem;font-weight:700;color:#e6edf3;text-align:center;margin-bottom:6px">Invitación a hogar compartido</div>
        <div style="font-size:.83rem;color:#8b949e;text-align:center;margin-bottom:20px">
          <b style="color:#58a6ff">${escHtml(ownerDisplay)}</b> te invitó a unirte a <b style="color:#e6edf3">${escHtml(hogarName)}</b>
        </div>
        <div style="background:#0d1117;border:1px solid #21262d;border-radius:10px;padding:14px;margin-bottom:18px;font-size:.78rem;color:#8b949e;line-height:1.6">
          <div style="margin-bottom:8px"><span style="color:#3fb950;font-weight:700">✔</span> Podrás registrar movimientos y hacer cambios en el hogar compartido.</div>
          <div style="margin-bottom:8px"><span style="color:#3fb950;font-weight:700">✔</span> Ambos verán los mismos datos financieros en tiempo real.</div>
          <div style="color:#e3b341"><span style="font-weight:700">⚠</span> Si en el futuro deseas registrar finanzas <b>personales separadas</b>, deberás usar un correo distinto.</div>
        </div>
        <div style="display:flex;gap:10px">
          <button id="_inv-decline" style="flex:1;padding:11px;border-radius:8px;border:1px solid #30363d;background:transparent;color:#8b949e;font-size:.85rem;cursor:pointer;font-weight:600">✗ Rechazar</button>
          <button id="_inv-accept" style="flex:2;padding:11px;border-radius:8px;border:none;background:#238636;color:#fff;font-size:.85rem;cursor:pointer;font-weight:700">✓ Aceptar y unirme</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#_inv-accept').onclick  = () => { overlay.remove(); resolve(true);  };
    overlay.querySelector('#_inv-decline').onclick = () => { overlay.remove(); resolve(false); };
  });
}

async function invitePartner(partnerEmail) {
  if (!HOUSEHOLD_ID || !currentUser) { toast('Error: sesión no iniciada', 'err'); return; }
  const email = partnerEmail?.trim().toLowerCase();
  if (!email || !email.includes('@')) { toast('Escribe un correo válido', 'err'); return; }
  const { data: me } = await sb.from('household_members').select('role')
    .eq('household_id', HOUSEHOLD_ID).eq('user_id', currentUser.id).maybeSingle();
  if (me?.role !== 'owner') { toast('Solo el administrador puede invitar', 'err'); return; }
  if (email === currentUser.email?.toLowerCase()) { toast('No puedes invitarte a ti mismo', 'err'); return; }
  const { error } = await sb.from('household_members').insert({
    household_id: HOUSEHOLD_ID, role: 'partner',
    invite_status: 'pending', invite_email: email
  });
  if (error) {
    toast(error.code === '23505' ? 'Ya existe invitación para ese correo' : 'Error: ' + error.message, 'err');
    return;
  }
  toast(`✅ Invitación creada para ${email}.`, 'ok');
}

function invitePartnerFromUI() {
  const input = document.getElementById('invite-email-input');
  const email = input?.value?.trim();
  if (!email) { toast('Ingresa un correo electrónico', 'err'); return; }
  invitePartner(email);
  if (input) input.value = '';
}

async function confirmDeleteAccount() {
  if (!currentUser) return;
  const uid = currentUser.id;
  const hid = HOUSEHOLD_ID;
  const { data: me } = await sb.from('household_members').select('role')
    .eq('user_id', uid).eq('household_id', hid).maybeSingle();
  const isOwner = me?.role === 'owner';
  const titulo = isOwner ? '⚠️ Eliminar cuenta y datos' : '🚪 Salir del hogar compartido';
  const msg = isOwner
    ? 'Se borrarán TODOS los datos del hogar. IRREVERSIBLE.'
    : 'Saldrás del hogar y recuperarás tu cuenta personal vacía. Los datos del hogar NO se borran.';
  const ok = await showConfirm(titulo, msg, '🗑️');
  if (!ok) return;
  const palabra = isOwner ? 'ELIMINAR' : 'SALIR';
  const word = prompt(`Escribe ${palabra} para confirmar:`);
  if (word?.trim().toUpperCase() !== palabra) { toast('Cancelado', 'ok'); return; }
  try {
    toast(isOwner ? '🗑️ Eliminando datos...' : '🚪 Saliendo del hogar...', 'ok');
    if (isOwner) {
      await sb.from('registro_movimientos').delete().eq('user_id', hid);
      await sb.from('movimientos').delete().eq('household_id', hid);
      await sb.from('cuentas').delete().eq('household_id', hid);
      await sb.from('fondo_emergencia').delete().eq('user_id', hid);
      await sb.from('dinero_fuera').delete().eq('user_id', hid);
      await sb.from('config_usuario').delete().eq('user_id', uid);
      await sb.from('tasas_cambio').delete().eq('user_id', hid);
      await sb.from('household_members').delete().eq('household_id', hid);
      await sb.from('households').delete().eq('id', hid);
      const { data: sessionData } = await sb.auth.getSession();
      await fetch('https://jcgoccaisemrfsuwwrrl.supabase.co/functions/v1/delete-user', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` }
      });
      await doLogout();
      toast('✅ Cuenta eliminada permanentemente.', 'ok');
    } else {
      await sb.from('household_members').delete().eq('user_id', uid).eq('household_id', hid);
      HOUSEHOLD_ID = null;
      await resolveHouseholdId();
      await loadFromSupabase();
      toast('✅ Saliste del hogar.', 'ok');
    }
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}
