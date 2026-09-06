// ==================== Sitebrede gebruikersstatus ====================
// Registreert elke username op het apparaat, houdt online/offline bij en
// handhaaft timeout/ban op alle pagina's van de site.
(function () {
  const USER_ID_KEY = 'bestelsysteemUserId';
  const userId = (() => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  })();
  window.BESTELSYSTEEM_USER_ID = userId;

  function username() { return typeof getUsername === 'function' ? getUsername() : (localStorage.getItem('bestelsysteemUsername') || '').trim(); }
  function userRef() { return db.ref('users/' + userId); }
  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function fmt(ts) { return new Date(ts).toLocaleString('nl-NL', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }); }

  async function registerUser() {
    const name = username();
    if (!name || typeof db === 'undefined') return;
    const updates = { username: name, lastSeen: Date.now() };
    try { await userRef().update(updates); } catch (e) { console.error('Gebruiker registreren mislukt', e); }
  }

  function presence() {
    if (typeof db === 'undefined') return;
    const connectedRef = db.ref('.info/connected');
    connectedRef.on('value', snap => {
      const connected = snap.val() === true;
      if (!username()) return;
      if (connected) {
        // onDisconnect wordt door Firebase server-side uitgevoerd, ook als
        // het tabblad/crash/browser onverwacht wegvalt. Daardoor blijft een
        // gebruiker niet onterecht op Online staan.
        userRef().onDisconnect().update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP }).then(() => {
          return userRef().update({ username: username(), online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP });
        }).catch(()=>{});
      } else {
        // Zodra de Firebase-verbinding wegvalt, mag de beheerpagina hem niet
        // als online blijven tonen. De server-side onDisconnect is de bron
        // voor het definitieve offline-signaal.
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && username()) {
        db.ref('.info/connected').once('value').then(snap => {
          if (snap.val() === true) userRef().update({ username: username(), online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP }).catch(()=>{});
        }).catch(()=>{});
      }
    });
  }

  let accessExpiryTimer = null;

  function clearAccessExpiryTimer() {
    if (accessExpiryTimer) { clearTimeout(accessExpiryTimer); accessExpiryTimer = null; }
  }

  function renderLock(type, until) {
    if (document.getElementById('global-access-lock')) return;
    const banned = type === 'ban';
    const stateReason = banned ? (window.__ACCESS_USER__ && (window.__ACCESS_USER__.banReasonTranslations || window.__ACCESS_USER__.banReason)) : (window.__ACCESS_USER__ && (window.__ACCESS_USER__.timeoutReasonTranslations || window.__ACCESS_USER__.timeoutReason));
    const reasonText = window.AutoTranslator ? window.AutoTranslator.pickBilingual(stateReason) : (typeof stateReason === 'string' ? stateReason : '');
    const overlay = document.createElement('div');
    overlay.id = 'global-access-lock';
    overlay.className = 'global-access-lock';
    overlay.innerHTML = `<div class="global-access-lock-card">
      <div class="global-access-lock-icon">${banned ? '⛔' : '⏱️'}</div>
      <h1>${banned ? 'Je bent verbannen van deze website' : 'Je hebt een time out gekregen'}</h1>
      <p>${banned ? 'Je hebt momenteel geen toegang tot deze website.' : `Je hebt een time out gekregen tot <strong>${esc(fmt(until))}</strong>.`}</p>
      ${reasonText ? `<p><strong>Reden:</strong> ${esc(reasonText)}</p>` : ''}
      ${banned ? '<div class="global-access-lock-actions"><button type="button" class="btn-secondary" id="global-access-admin">🔧 Sitebeheer</button><button type="button" class="btn-primary" id="global-access-message">✉️ Stuur bericht naar owner</button></div>' : ''}
    </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('access-locked');
    if (banned) {
      const messageBtn = document.getElementById('global-access-message');
      const adminBtn = document.getElementById('global-access-admin');
      if (messageBtn) messageBtn.addEventListener('click', () => openMessageModal());
      if (adminBtn) adminBtn.addEventListener('click', () => {
        // Rechtstreeks naar Sitebeheer, zodat de login-modal niet achter het
        // blokkeerscherm komt te staan. De normale admin-login blijft vereist.
        window.location.href = 'index.html?openSitebeheer=1';
      });
    }
    if (!banned && until) {
      clearAccessExpiryTimer();
      const delay = Math.max(0, Number(until) - Date.now()) + 50;
      accessExpiryTimer = setTimeout(() => {
        // Controleer opnieuw via Firebase zodra de timeout afloopt,
        // zodat de gebruiker zonder herladen direct weer toegang krijgt.
        userRef().once('value').then(snap => enforceUserState(snap.val() || {})).catch(() => {});
      }, delay);
    }
  }

  function openMessageModal() {
    let modal = document.getElementById('global-user-message-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'global-user-message-modal';
      modal.className = 'modal-overlay open';
      modal.style.zIndex = '100001';
      modal.innerHTML = `<div class="modal-box"><div class="modal-title">✉️ Bericht naar owner</div>
        <p class="modal-text">Stuur een bericht naar de sitebeheerder.</p>
        <textarea id="global-user-message-input" class="modal-input" rows="6" maxlength="1000" placeholder="Typ je bericht..."></textarea>
        <div class="modal-error" id="global-user-message-error"></div>
        <div class="modal-actions"><button type="button" class="btn-secondary" id="global-user-message-cancel">Annuleren</button><button type="button" class="btn-primary" id="global-user-message-send">Versturen</button></div>
      </div>`;
      document.body.appendChild(modal);
      document.getElementById('global-user-message-cancel').onclick = () => modal.remove();
      document.getElementById('global-user-message-send').onclick = async () => {
        const input = document.getElementById('global-user-message-input');
        const err = document.getElementById('global-user-message-error');
        const text = input.value.trim();
        if (!text) { err.textContent = 'Typ eerst een bericht.'; return; }
        const btn = document.getElementById('global-user-message-send'); btn.disabled = true;
        try {
          const sourceLang = window.AutoTranslator ? window.AutoTranslator.currentLanguage() : (localStorage.getItem('appLanguage') || 'nl');
          const translated = window.AutoTranslator ? await window.AutoTranslator.buildBilingual(text, sourceLang) : { nl:text, en:text, sourceLang };
          const message = { userId, username: username() || 'Onbekend', text, textTranslations: translated, sourceLang, createdAt: Date.now(), read: false };
          // Bewaar het bericht ook onder de eigen gebruiker. Dit werkt met
          // dezelfde gebruikersrechten als de bestaande gebruikersstatus.
          const msgRef = userRef().child('ownerMessages').push();
          await msgRef.set(message);
          // Daarnaast proberen we de centrale berichtenlijst bij te werken.
          // Als daarvoor geen schrijfrechten bestaan, blijft het bericht via
          // users/<uid>/ownerMessages gewoon beschikbaar voor Sitebeheer.
          try { await db.ref('userMessages/' + msgRef.key).set(message); } catch (secondaryError) { console.warn('Centrale berichtenlijst niet beschikbaar; gebruikerskopie is opgeslagen.', secondaryError); }
          modal.remove();
        } catch (e) { console.error(e); err.textContent = 'Versturen mislukt. Probeer het opnieuw.'; btn.disabled = false; }
      };
    }
  }
  window.openGlobalUserMessageModal = openMessageModal;

  function showPendingWarning(warningId, warning) {
    if (!warning || !warning.text || document.getElementById('global-warning-lock')) return;
    const overlay=document.createElement('div'); overlay.id='global-warning-lock'; overlay.className='global-access-lock';
    overlay.innerHTML=`<div class="global-access-lock-card"><div class="global-access-lock-icon">⚠️</div><h1>Waarschuwing</h1><p style="white-space:pre-wrap">${esc(window.AutoTranslator && warning.textTranslations ? window.AutoTranslator.pickBilingual(warning.textTranslations) : warning.text)}</p><button type="button" class="btn-primary" id="global-warning-ok">Begrepen</button></div>`;
    document.body.appendChild(overlay);
    document.getElementById('global-warning-ok').onclick=async()=>{ overlay.remove(); await userRef().child('warnings/'+warningId+'/read').set(true); };
  }

  function listenWarnings() {
    userRef().child('warnings').on('value', snap=>{
      const data=snap.val()||{}; const entries=Object.entries(data).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
      const pending=entries.find(([,w])=>w && w.read!==true);
      if (pending && !location.pathname.toLowerCase().includes('admin.html')) showPendingWarning(pending[0],pending[1]);
      const list=document.getElementById('warnings-list'), empty=document.getElementById('warnings-empty-msg');
      if(list && !location.pathname.toLowerCase().includes('admin.html')) {
        entries.forEach(([id,w])=>{ if(document.getElementById('global-warning-'+id)) return; const item=document.createElement('div'); item.id='global-warning-'+id; item.className='announcement-item'; item.innerHTML=`<div class="announcement-item-head"><span class="announcement-item-title">⚠️ Sitewaarschuwing</span><span class="announcement-item-date">${esc(fmt(w.createdAt))}</span></div><div class="announcement-item-info">${esc(w.text)}</div>`; list.appendChild(item); }); if(entries.length && empty) empty.style.display='none';
      }
    });
  }

  function removeLock() {
    const lock=document.getElementById('global-access-lock'); if(lock) lock.remove();
    document.body.classList.remove('access-locked');
    clearAccessExpiryTimer();
  }

  function enforceUserState(user) {
    if (!user) return;
    window.__ACCESS_USER__ = user || {};
    if (user.banned) { removeLock(); renderLock('ban'); return; }
    const until=Number(user.timeoutUntil||0);
    if (until && until>Date.now()) { removeLock(); renderLock('timeout',until); return; }
    if (user.timeoutUntil) userRef().update({timeoutUntil:null}).catch(()=>{});
    removeLock();
  }

  async function gate() {
    if (!username() || typeof db === 'undefined') return;
    await registerUser();
    listenWarnings();
    const snap = await userRef().once('value');
    enforceUserState(snap.val() || {});
  }

  // Realtime controle: wijzigingen van de beheerder (timeout/ban/unban)
  // worden direct op het geopende apparaat verwerkt, zonder pagina-refresh.
  userRef().on('value', snap => {
    if (username()) enforceUserState(snap.val() || {});
  });

  // Extra child-listeners maken wijzigingen aan afzonderlijke velden ook
  // onmiddellijk zichtbaar wanneer Firebase alleen dat veld synchroniseert.
  userRef().child('banned').on('value', () => {
    if (!username()) return;
    userRef().once('value').then(snap => enforceUserState(snap.val() || {})).catch(() => {});
  });
  userRef().child('timeoutUntil').on('value', () => {
    if (!username()) return;
    userRef().once('value').then(snap => enforceUserState(snap.val() || {})).catch(() => {});
  });

  window.refreshGlobalUserAccess = gate;
  window.addEventListener('usernameChanged', () => { registerUser().then(gate); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { registerUser().then(() => { presence(); gate(); }); });
  else { registerUser().then(() => { presence(); gate(); }); }
})();
