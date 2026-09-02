// ==================== Username op dit apparaat ====================
const USERNAME_STORAGE_KEY = 'bestelsysteemUsername';
const USERNAME_MAX_LENGTH = 15;

function getUsername() {
  return (localStorage.getItem(USERNAME_STORAGE_KEY) || '').trim();
}

function setUsername(value) {
  const username = String(value || '').trim();
  if (!username || username.length > USERNAME_MAX_LENGTH) return false;
  localStorage.setItem(USERNAME_STORAGE_KEY, username);
  updateUsernameLabels();
  if (typeof db !== 'undefined' && window.BESTELSYSTEEM_USER_ID) {
    db.ref('users/' + window.BESTELSYSTEEM_USER_ID).update({ username: username, lastSeen: Date.now() }).catch(() => {});
  }
  window.dispatchEvent(new CustomEvent('usernameChanged', { detail: { username } }));
  return true;
}

function updateUsernameLabels() {
  const username = getUsername();
  const top = document.getElementById('username-top-label');
  if (top) top.textContent = username || 'Username';
  const label = document.getElementById('my-username-label');
  if (label) label.textContent = username || 'Username';
  const badge = document.getElementById('my-name-badge');
  if (badge && username) badge.title = 'Klik om je username te wijzigen';
}

function openUsernameWarning() {
  const modal = document.getElementById('modal-username-warning');
  if (!modal) return Promise.resolve();
  openModal('modal-username-warning');
  return new Promise(resolve => {
    const btn = document.getElementById('username-warning-ok');
    const finish = () => {
      closeModal('modal-username-warning');
      btn.removeEventListener('click', finish);
      resolve();
    };
    btn.addEventListener('click', finish);
  });
}

function validateUsername(value, errorEl) {
  const username = String(value || '').trim();
  if (!username) {
    errorEl.textContent = 'Vul een username in.';
    return null;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    errorEl.textContent = `Je username mag maximaal ${USERNAME_MAX_LENGTH} tekens lang zijn.`;
    return null;
  }
  errorEl.textContent = '';
  return username;
}

function setupUsernameSystem() {
  updateUsernameLabels();

  const setupModal = document.getElementById('modal-username-setup');
  const setupInput = document.getElementById('username-setup-input');
  const setupError = document.getElementById('username-setup-error');
  const setupConfirm = document.getElementById('username-setup-confirm');
  const editBtn = document.getElementById('btn-username');

  // Eerste keer op dit apparaat: eerst username instellen.
  if (setupModal && !getUsername()) {
    openModal('modal-username-setup');
    setTimeout(() => setupInput && setupInput.focus(), 50);
  }

  if (setupConfirm) {
    setupConfirm.addEventListener('click', async () => {
      const username = validateUsername(setupInput.value, setupError);
      if (!username) return;
      setupConfirm.disabled = true;
      setUsername(username);
      await openUsernameWarning();
      setupConfirm.disabled = false;
      if (setupModal) closeModal('modal-username-setup');
    });
  }

  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      const current = getUsername();
      if (setupInput && setupModal) {
        setupInput.value = current;
        setupError.textContent = '';
        openModal('modal-username-setup');
        setTimeout(() => setupInput.focus(), 50);
      }
    });
  }

  // Geen username-badge in de HTML? Dan niets doen.
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupUsernameSystem);
} else {
  setupUsernameSystem();
}
