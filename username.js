// ==================== Auth & Username Systeem (Database Versie) ====================
const USERNAME_STORAGE_KEY = 'bestelsysteemUsername';
const USERID_STORAGE_KEY = 'bestelsysteemUserId';
const RESTAURANTS_STORAGE_KEY = 'mijnRestaurants';
const USERNAME_MAX_LENGTH = 15;

let authMode = 'login'; // 'login' of 'register'

// Helpers voor modals
window.openModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function getUsername() {
  return (localStorage.getItem(USERNAME_STORAGE_KEY) || '').trim();
}

function setUsername(value) {
  const username = String(value || '').trim();
  if (!username) return false;
  localStorage.setItem(USERNAME_STORAGE_KEY, username);
  updateUsernameLabels();
  window.dispatchEvent(new CustomEvent('usernameChanged', { detail: { username } }));
  return true;
}

// Centrale functie voor het opslaan van restaurants, zowel lokaal als in de DB.
window.saveMyRestaurants = function(list) {
  localStorage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(list));
  const uid = window.BESTELSYSTEEM_USER_ID || localStorage.getItem(USERID_STORAGE_KEY);
  if (uid && typeof db !== 'undefined') {
    db.ref('users/' + uid + '/myRestaurants').set(list).catch(e => {
        console.error('Fout bij syncen restaurants naar DB:', e);
    });
  }
  // Refresh de UI als we op het startscherm zijn
  if (typeof renderMyRestaurants === 'function') renderMyRestaurants();
}

function updateUsernameLabels() {
  const username = getUsername();
  const top = document.getElementById('username-top-label');
  if (top) top.textContent = username || 'Niet ingelogd';
  const label = document.getElementById('my-username-label');
  if (label) label.textContent = username || 'Niet ingelogd';
  const badge = document.getElementById('my-name-badge');
  if (badge && username) badge.title = 'Klik om je gegevens te bekijken';
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

// Haalt alle accountgegevens (username + restaurants) op uit de database
async function syncUserData(uid) {
    if (typeof db === 'undefined' || !uid) return;
    try {
        const snap = await db.ref('users/' + uid).once('value');
        if (snap.exists()) {
            const data = snap.val();
            if (data.username) {
                localStorage.setItem(USERNAME_STORAGE_KEY, data.username);
            }
            if (data.myRestaurants) {
                // Sla op maar gebruik de window functie om oneindige loops te voorkomen (zonder DB set hier)
                localStorage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(data.myRestaurants));
            }
            updateUsernameLabels();
            if (typeof renderMyRestaurants === 'function') renderMyRestaurants();
        }
    } catch (e) {
        console.error('Data synchronisatie mislukt:', e);
    }
}

function setupAuthSystem() {
  const authModal = document.getElementById('modal-auth');
  const profileModal = document.getElementById('modal-profile');
  const choiceView = document.getElementById('auth-choice-view');
  const formView = document.getElementById('auth-form-view');

  const btnChoiceLogin = document.getElementById('btn-choice-login');
  const btnChoiceRegister = document.getElementById('btn-choice-register');
  const btnBack = document.getElementById('auth-back');
  const btnLogout = document.getElementById('btn-logout');
  const btnUsernameTop = document.getElementById('btn-username');

  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const titleEl = document.getElementById('auth-title');
  const registerFields = document.getElementById('register-only-fields');
  const confirmBtn = document.getElementById('auth-confirm');
  const errorEl = document.getElementById('auth-error');

  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const usernameInput = document.getElementById('auth-username');

  function showChoice() {
    if (choiceView) choiceView.style.display = 'block';
    if (formView) formView.style.display = 'none';
    openModal('modal-auth');
  }

  function showForm(mode) {
    authMode = mode;
    if (choiceView) choiceView.style.display = 'none';
    if (formView) formView.style.display = 'block';

    if (mode === 'login') {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      if (titleEl) titleEl.textContent = 'Inloggen';
      if (registerFields) registerFields.style.display = 'none';
    } else {
      if (tabRegister) tabRegister.classList.add('active');
      if (tabLogin) tabLogin.classList.remove('active');
      if (titleEl) titleEl.textContent = 'Account maken';
      if (registerFields) registerFields.style.display = 'block';
    }
    if (errorEl) errorEl.textContent = '';
  }

  function checkLogin() {
    const savedUserId = localStorage.getItem(USERID_STORAGE_KEY);
    if (savedUserId) {
      window.BESTELSYSTEEM_USER_ID = savedUserId;
      syncUserData(savedUserId);
      closeModal('modal-auth');
    } else {
      showChoice();
    }
  }

  if (btnChoiceLogin) btnChoiceLogin.onclick = () => showForm('login');
  if (btnChoiceRegister) btnChoiceRegister.onclick = () => showForm('register');
  if (btnBack) btnBack.onclick = showChoice;

  if (tabLogin) tabLogin.onclick = () => showForm('login');
  if (tabRegister) tabRegister.onclick = () => showForm('register');

  if (btnUsernameTop) {
    btnUsernameTop.onclick = (e) => {
      e.preventDefault();
      const username = getUsername();
      if (username) {
        const profileLabel = document.getElementById('profile-username-label');
        if (profileLabel) profileLabel.textContent = username;
        openModal('modal-profile');
      } else {
        showChoice();
      }
    };
  }

  if (btnLogout) {
    btnLogout.onclick = () => {
      localStorage.removeItem(USERID_STORAGE_KEY);
      localStorage.removeItem(USERNAME_STORAGE_KEY);
      localStorage.removeItem(RESTAURANTS_STORAGE_KEY);
      window.BESTELSYSTEEM_USER_ID = null;
      updateUsernameLabels();
      closeModal('modal-profile');
      showChoice();
      window.location.reload();
    };
  }

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const username = usernameInput.value.trim();

      if (errorEl) errorEl.textContent = '';
      if (!email || !password) {
        if (errorEl) errorEl.textContent = 'Vul een e-mail en wachtwoord in.';
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Bezig...';

      try {
        if (typeof db === 'undefined') throw new Error('Database niet verbonden.');
        const accountsRef = db.ref('userAccounts');

        if (authMode === 'register') {
          if (!username) {
            if (errorEl) errorEl.textContent = 'Kies ook een username.';
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Doorgaan';
            return;
          }
          const snap = await accountsRef.orderByChild('email').equalTo(email).once('value');
          if (snap.exists()) {
            if (errorEl) errorEl.textContent = 'Dit e-mailadres is al in gebruik.';
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Doorgaan';
            return;
          }
          const newAccountRef = accountsRef.push();
          const uid = newAccountRef.key;
          await newAccountRef.set({ email: email, password: password, username: username, createdAt: Date.now() });
          await db.ref('users/' + uid).set({ username: username, lastSeen: Date.now() });
          localStorage.setItem(USERID_STORAGE_KEY, uid);
          window.BESTELSYSTEEM_USER_ID = uid;
          setUsername(username);
          closeModal('modal-auth');
          await openUsernameWarning();
        } else {
          const snap = await accountsRef.orderByChild('email').equalTo(email).once('value');
          if (!snap.exists()) {
            if (errorEl) errorEl.textContent = 'E-mail of wachtwoord onjuist.';
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Doorgaan';
            return;
          }
          let foundUser = null, foundUid = null;
          snap.forEach(child => { if (child.val().password === password) { foundUser = child.val(); foundUid = child.key; } });
          if (foundUser) {
            localStorage.setItem(USERID_STORAGE_KEY, foundUid);
            window.BESTELSYSTEEM_USER_ID = foundUid;
            await syncUserData(foundUid);
            closeModal('modal-auth');
          } else {
            if (errorEl) errorEl.textContent = 'E-mail of wachtwoord onjuist.';
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Doorgaan';
            return;
          }
        }
      } catch (err) {
        console.error(err);
        if (errorEl) errorEl.textContent = 'Fout: ' + err.message;
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Doorgaan';
      }
    };
  }
  checkLogin();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { updateUsernameLabels(); setupAuthSystem(); });
} else {
  updateUsernameLabels(); setupAuthSystem();
}
