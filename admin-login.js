// ==================== Restaurant beheer: inloggen ====================
const ADMIN_FAILS_KEY = 'adminLoginFails';
const ADMIN_LOCK_KEY = 'adminLoginLockUntil';

function getAdminFails() {
  return Number(localStorage.getItem(ADMIN_FAILS_KEY)) || 0;
}
function setAdminFails(n) {
  localStorage.setItem(ADMIN_FAILS_KEY, String(n));
}
function getAdminLockUntil() {
  return Number(localStorage.getItem(ADMIN_LOCK_KEY)) || 0;
}
function setAdminLockUntil(ts) {
  if (ts) localStorage.setItem(ADMIN_LOCK_KEY, String(ts));
  else localStorage.removeItem(ADMIN_LOCK_KEY);
}

function formatLockTime(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

let adminLockInterval = null;

function updateAdminLoginUI() {
  const input = document.getElementById('admin-password-input');
  const confirmBtn = document.getElementById('admin-login-confirm');
  const errorEl = document.getElementById('admin-login-error');
  const lockUntil = getAdminLockUntil();
  const remaining = lockUntil - Date.now();

  if (remaining > 0) {
    input.disabled = true;
    confirmBtn.disabled = true;
    errorEl.textContent = `Te vaak fout, probeer het over ${formatLockTime(remaining)} opnieuw.`;
    if (!adminLockInterval) {
      adminLockInterval = setInterval(() => {
        if (getAdminLockUntil() - Date.now() <= 0) {
          clearInterval(adminLockInterval);
          adminLockInterval = null;
          setAdminLockUntil(0);
          setAdminFails(0);
          updateAdminLoginUI();
        } else {
          updateAdminLoginUI();
        }
      }, 1000);
    }
    return true;
  }

  if (adminLockInterval) { clearInterval(adminLockInterval); adminLockInterval = null; }
  input.disabled = false;
  confirmBtn.disabled = false;
  return false;
}

const btnAdmin = document.getElementById('btn-admin');
if (btnAdmin) {
  btnAdmin.addEventListener('click', () => {
    document.getElementById('admin-password-input').value = '';
    document.getElementById('admin-login-error').textContent = '';
    openModal('modal-admin-login');
    updateAdminLoginUI();
  });
}

document.getElementById('admin-login-confirm').addEventListener('click', () => {
  if (updateAdminLoginUI()) return; // nog geblokkeerd

  const input = document.getElementById('admin-password-input');
  const errorEl = document.getElementById('admin-login-error');
  const wachtwoord = input.value;

  if (wachtwoord === ADMIN_PASSWORD) {
    setAdminFails(0);
    setAdminLockUntil(0);
    sessionStorage.setItem('isRestaurantAdmin', '1');
    window.location.href = 'admin.html';
    return;
  }

  const fails = getAdminFails() + 1;
  if (fails >= ADMIN_MAX_POGINGEN) {
    setAdminFails(0);
    setAdminLockUntil(Date.now() + ADMIN_LOCKOUT_MINUTEN * 60 * 1000);
    updateAdminLoginUI();
  } else {
    setAdminFails(fails);
    const over = ADMIN_MAX_POGINGEN - fails;
    errorEl.textContent = `Onjuist wachtwoord. Nog ${over} poging${over === 1 ? '' : 'en'} over.`;
  }
  input.value = '';
});

document.getElementById('admin-password-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('admin-login-confirm').click();
});
