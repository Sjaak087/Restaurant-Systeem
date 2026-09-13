// ==================== Sitebrede gebruikersstatus ====================
// Houdt online/offline bij en handhaaft timeout/ban op alle pagina's.
(function () {
  // Gebruik de centrale ID uit het auth systeem
  function getUid() { return window.BESTELSYSTEEM_USER_ID || localStorage.getItem('bestelsysteemUserId'); }
  function username() { return typeof getUsername === 'function' ? getUsername() : (localStorage.getItem('bestelsysteemUsername') || '').trim(); }
  function userRef() {
    const uid = getUid();
    return uid ? db.ref('users/' + uid) : null;
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function fmt(ts) { return new Date(ts).toLocaleString('nl-NL', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }); }

  async function registerUser() {
    const name = username();
    const ref = userRef();
    if (!name || !ref || typeof db === 'undefined') return;
    const updates = { username: name, lastSeen: Date.now() };
    try { await ref.update(updates); } catch (e) { console.error('Gebruiker registreren mislukt', e); }
  }

  function presence() {
    if (typeof db === 'undefined') return;
    const connectedRef = db.ref('.info/connected');
    connectedRef.on('value', snap => {
      const connected = snap.val() === true;
      const ref = userRef();
      if (!username() || !ref) return;
      if (connected) {
        ref.onDisconnect().update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP }).then(() => {
          return ref.update({ username: username(), online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP });
        }).catch(()=>{});
      }
    });
    document.addEventListener('visibilitychange', () => {
      const ref = userRef();
      if (document.visibilityState === 'visible' && username() && ref) {
        db.ref('.info/connected').once('value').then(snap => {
          if (snap.val() === true) ref.update({ username: username(), online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP }).catch(()=>{});
        }).catch(()=>{});
      }
    });
  }

  let accessExpiryTimer = null;
  function clearAccessExpiryTimer() { if (accessExpiryTimer) { clearTimeout(accessExpiryTimer); accessExpiryTimer = null; } }

  function renderLock(type, until) {
    if (document.getElementById('global-access-lock')) return;
    const banned = type === 'ban';
    const stateReason = banned ? (window.__ACCESS_USER__ && (window.__ACCESS_USER__.banReasonTranslations || window.__ACCESS_USER__.banReason)) : (window.__ACCESS_USER__ && (window.__ACCESS_USER__.timeoutReasonTranslations || window.__ACCESS_USER__.timeoutReason));
    const reasonText = window.AutoTranslator ? window.AutoTranslator.pickBilingual(stateReason) : (typeof stateReason === 'string' ? stateReason : '');
    const overlay = document.createElement('div');
    overlay.id = 'global-access-lock';
    overlay.className = 'global-access-lock';
    overlay.style.zIndex = "3000";
    overlay.innerHTML = `<div class="global-access-lock-card">
      <div class="global-access-lock-icon">${banned ? '⛔' : '⏱️'}</div>
      <h1>${banned ? 'Je bent verbannen' : 'Je hebt een time out'}</h1>
      <p>${banned ? 'Je hebt momenteel geen toegang.' : `Je hebt een time out tot <strong>${esc(fmt(until))}</strong>.`}</p>
      ${reasonText ? `<p><strong>Reden:</strong> ${esc(reasonText)}</p>` : ''}
      ${banned ? '<div class="global-access-lock-actions"><button type="button" class="btn-primary" id="global-access-logout">Uitloggen / Ander account</button></div>' : ''}
    </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('access-locked');

    if (banned) {
        const logoutBtn = document.getElementById('global-access-logout');
        if (logoutBtn) logoutBtn.onclick = () => {
            localStorage.clear();
            window.location.reload();
        };
    }

    if (!banned && until) {
      clearAccessExpiryTimer();
      const delay = Math.max(0, Number(until) - Date.now()) + 50;
      accessExpiryTimer = setTimeout(() => {
        const ref = userRef();
        if (ref) ref.once('value').then(snap => enforceUserState(snap.val() || {})).catch(() => {});
      }, delay);
    }
  }

  function enforceUserState(user) {
    if (!user) return;
    window.__ACCESS_USER__ = user || {};
    if (user.banned) { renderLock('ban'); return; }
    const until = Number(user.timeoutUntil||0);
    if (until && until > Date.now()) { renderLock('timeout', until); return; }
    const lock = document.getElementById('global-access-lock');
    if (lock) { lock.remove(); document.body.classList.remove('access-locked'); }
  }

  async function gate() {
    const ref = userRef();
    if (!username() || !ref || typeof db === 'undefined') return;
    await registerUser();
    const snap = await ref.once('value');
    enforceUserState(snap.val() || {});

    // Live luisteren naar wijzigingen
    ref.on('value', snap => {
      if (username()) enforceUserState(snap.val() || {});
    });
  }

  window.refreshGlobalUserAccess = gate;
  window.addEventListener('usernameChanged', () => { registerUser().then(gate); });

  // Starten als de database er is
  const checkInterval = setInterval(() => {
    if (typeof db !== 'undefined' && getUid()) {
      clearInterval(checkInterval);
      presence();
      gate();
    }
  }, 100);
})();
