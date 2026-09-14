const MAX_RESTAURANTS = 2;
const STORAGE_KEY = 'mijnRestaurants';

// Helpers voor modals (globaal beschikbaar maken)
window.openModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function requireUsername() {
  const username = getUsername();
  if (username) return username;
  openModal('modal-auth');
  return '';
}

function getMyRestaurants() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addMyRestaurant(entry) {
  const list = getMyRestaurants();
  if (list.some(r => r.id === entry.id)) return list;
  list.push(entry);
  window.saveMyRestaurants(list);
  return list;
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function genMemberId() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function genSelfserviceCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

async function genUniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = genCode();
    const snap = await db.ref('restaurantCodes/' + code).get();
    if (!snap.exists()) return code;
  }
  throw new Error('Kon geen unieke code genereren');
}

// ---- Opruimen: spookrestaurants & verlopen verwijdertimers ----
async function cleanupExpiredRestaurants() {
  try {
    if (typeof db === 'undefined') return;
    const snap = await db.ref('restaurants').get();
    const data = snap.val() || {};
    const nu = Date.now();
    const updates = {};

    for (const [id, r] of Object.entries(data)) {
      const isGhost = !r.leden || Object.keys(r.leden).length === 0;
      const isExpired = !!(r.autoDelete && r.autoDelete.deleteAt && r.autoDelete.deleteAt <= nu);
      if (!isGhost && !isExpired) continue;
      updates[`restaurants/${id}`] = null;
      if (r.code) updates[`restaurantCodes/${r.code}`] = null;
    }
    if (Object.keys(updates).length > 0) await db.ref().update(updates);

    // Check of de restaurants in MIJN lijst nog bestaan.
    const mijnLijst = getMyRestaurants();
    if (mijnLijst.length === 0) return;

    const nieuweLijst = [];
    let veranderd = false;

    for (const r of mijnLijst) {
      if (data[r.id]) {
        nieuweLijst.push(r);
      } else {
        veranderd = true;
      }
    }

    if (veranderd) {
      window.saveMyRestaurants(nieuweLijst);
    }
  } catch (e) {
    console.error('Opruimen mislukt:', e);
  }
}

const myRestaurantsEl = document.getElementById('my-restaurants');
const maxMsgEl = document.getElementById('max-msg');

window.renderMyRestaurants = function() {
  if (!myRestaurantsEl) return;
  const list = getMyRestaurants();
  const aangemaakt = list.filter(r => r.rol === 'eigenaar');
  const gejoined = list.filter(r => r.rol !== 'eigenaar');
  myRestaurantsEl.innerHTML = '';

  function renderCard(r) {
    const card = document.createElement('div');
    card.className = 'restaurant-card';
    card.innerHTML = `
      <div class="restaurant-card-main">
        <div class="restaurant-card-name">${escapeHtml(r.naam)}</div>
        <div class="restaurant-card-role">${r.rol === 'eigenaar' ? '👑 Eigenaar' : '👤 Gejoined'}</div>
      </div>
    `;
    card.onclick = () => {
      window.location.href = `restaurant.html?id=${encodeURIComponent(r.id)}`;
    };
    return card;
  }

  if (list.length === 0) {
    myRestaurantsEl.innerHTML = '<div class="empty-msg">Je hebt nog geen restaurant. Maak er één, of join met een code.</div>';
  } else {
    if (aangemaakt.length > 0) {
      const title = document.createElement('div');
      title.className = 'my-restaurants-group-title';
      title.textContent = '🏠 Door mij aangemaakt';
      myRestaurantsEl.appendChild(title);
      aangemaakt.forEach(r => myRestaurantsEl.appendChild(renderCard(r)));
    }
    if (gejoined.length > 0) {
      const title = document.createElement('div');
      title.className = 'my-restaurants-group-title';
      title.textContent = '🤝 Gejoined';
      myRestaurantsEl.appendChild(title);
      gejoined.forEach(r => myRestaurantsEl.appendChild(renderCard(r)));
    }
  }

  const createAtMax = aangemaakt.length >= MAX_RESTAURANTS;
  if (maxMsgEl) maxMsgEl.style.display = createAtMax ? 'block' : 'none';
  const btnCreate = document.getElementById('btn-open-create');
  if (btnCreate) btnCreate.style.display = createAtMax ? 'none' : '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Feedback Systeem ----
const feedbackLimitKey = 'feedbackLastSentAt';
const FEEDBACK_COOLDOWN_MS = 5 * 60 * 1000;

function getFeedbackCooldownRemaining() {
  const lastSent = Number(localStorage.getItem(feedbackLimitKey) || 0);
  return Math.max(0, FEEDBACK_COOLDOWN_MS - (Date.now() - lastSent));
}

function initLanding() {
  window.renderMyRestaurants();
  cleanupExpiredRestaurants();

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modal-overlay').forEach(m => {
        if (m.id !== 'modal-auth' || getUsername()) m.classList.remove('open');
      });
    };
  });

  const btnOpenCreate = document.getElementById('btn-open-create');
  if (btnOpenCreate) {
    btnOpenCreate.onclick = () => {
      if (!requireUsername()) return;
      document.getElementById('create-name').value = '';
      document.getElementById('create-error').textContent = '';
      openModal('modal-create');
    };
  }

  const btnCreateConfirm = document.getElementById('create-confirm');
  if (btnCreateConfirm) {
    btnCreateConfirm.onclick = async () => {
      const naam = document.getElementById('create-name').value.trim();
      const mijnNaam = getUsername();
      const errorEl = document.getElementById('create-error');
      if (!naam) { errorEl.textContent = 'Vul een naam in.'; return; }
      if (!mijnNaam) { errorEl.textContent = 'Vul je eigen naam in.'; return; }
      if (getMyRestaurants().filter(r => r.rol === 'eigenaar').length >= MAX_RESTAURANTS) { errorEl.textContent = 'Je hebt al 2 restaurants.'; return; }

      btnCreateConfirm.disabled = true;
      btnCreateConfirm.textContent = 'Bezig...';
      try {
        const code = await genUniqueCode();
        const ssCode = genSelfserviceCode();
        const newRef = db.ref('restaurants').push();
        const id = newRef.key;
        await newRef.set({ naam: naam, code: code, selfserviceCode: ssCode, aangemaakt: Date.now() });
        await db.ref('restaurantCodes/' + code).set(id);
        const memberId = genMemberId();
        await newRef.child('leden/' + memberId).set({
          rol: 'eigenaar',
          userId: window.BESTELSYSTEEM_USER_ID || '',
          naam: mijnNaam,
          tabs: { bestellen: true, voorraad: true, keuken: true, gereed: true, historie: true, instellingen: true },
          toegevoegdOp: Date.now()
        });
        addMyRestaurant({ id, naam, code, rol: 'eigenaar', memberId });
        closeModal('modal-create');
        document.getElementById('code-display').textContent = code;
        window.pendingRestaurantId = id;
        openModal('modal-code-shown');
      } catch (e) {
        console.error(e);
        errorEl.textContent = 'Fout bij aanmaken.';
      } finally {
        btnCreateConfirm.disabled = false;
        btnCreateConfirm.textContent = 'Aanmaken';
      }
    };
  }

  const btnCodeShownOk = document.getElementById('code-shown-ok');
  if (btnCodeShownOk) {
    btnCodeShownOk.onclick = () => {
      const id = window.pendingRestaurantId;
      if (id) window.location.href = `restaurant.html?id=${encodeURIComponent(id)}`;
    };
  }

  const btnOpenJoin = document.getElementById('btn-open-join');
  if (btnOpenJoin) {
    btnOpenJoin.onclick = () => {
      if (!requireUsername()) return;
      document.getElementById('join-code').value = '';
      document.getElementById('join-error').textContent = '';
      openModal('modal-join');
    };
  }

  const btnJoinConfirm = document.getElementById('join-confirm');
  if (btnJoinConfirm) {
    btnJoinConfirm.onclick = async () => {
      const code = document.getElementById('join-code').value.trim().toUpperCase();
      const mijnNaam = getUsername();
      const errorEl = document.getElementById('join-error');
      if (!code) { errorEl.textContent = 'Vul een code in.'; return; }
      if (!mijnNaam) { errorEl.textContent = 'Vul je eigen naam in.'; return; }

      btnJoinConfirm.disabled = true;
      btnJoinConfirm.textContent = 'Bezig...';
      try {
        const snap = await db.ref('restaurantCodes/' + code).get();
        if (!snap.exists()) { errorEl.textContent = 'Code onbekend.'; btnJoinConfirm.disabled = false; return; }
        const id = snap.val();
        const infoSnap = await db.ref('restaurants/' + id + '/naam').get();
        const naam = infoSnap.exists() ? infoSnap.val() : 'Restaurant';
        if (getMyRestaurants().some(r => r.id === id)) { errorEl.textContent = 'Je zit al in dit restaurant.'; btnJoinConfirm.disabled = false; return; }
        const memberId = genMemberId();
        await db.ref('restaurants/' + id + '/leden/' + memberId).set({
          rol: 'gejoined',
          userId: window.BESTELSYSTEEM_USER_ID || '',
          naam: mijnNaam,
          tabs: { bestellen: true, voorraad: false, keuken: false, gereed: false, historie: false, instellingen: false },
          toegevoegdOp: Date.now()
        });
        addMyRestaurant({ id, naam, code, rol: 'gejoined', memberId });
        window.location.href = `restaurant.html?id=${encodeURIComponent(id)}`;
      } catch (e) {
        console.error(e);
        errorEl.textContent = 'Fout bij joinen.';
      } finally {
        btnJoinConfirm.disabled = false;
        btnJoinConfirm.textContent = 'Joinen';
      }
    };
  }

  const btnFeedback = document.getElementById('btn-feedback');
  if (btnFeedback) {
    btnFeedback.onclick = () => {
      const username = requireUsername();
      if (!username) return;

      const errorEl = document.getElementById('feedback-error');
      if (errorEl) errorEl.textContent = '';
      const nameEl = document.getElementById('feedback-name');
      if (nameEl) nameEl.value = username;
      const textEl = document.getElementById('feedback-text');
      if (textEl) textEl.value = '';

      const remaining = getFeedbackCooldownRemaining();
      if (remaining > 0 && errorEl) {
        const minutes = Math.ceil(remaining / 60000);
        errorEl.textContent = `Je kunt over ${minutes} minuut${minutes === 1 ? '' : 'en'} opnieuw feedback geven.`;
      }
      openModal('modal-feedback');
    };
  }

  const btnSendFeedback = document.getElementById('send-feedback');
  if (btnSendFeedback) {
    btnSendFeedback.onclick = async () => {
      const nameEl = document.getElementById('feedback-name');
      const textEl = document.getElementById('feedback-text');
      const errorEl = document.getElementById('feedback-error');
      const name = nameEl.value.trim();
      const text = textEl.value.trim();

      if (errorEl) errorEl.textContent = '';
      if (!name) { if (errorEl) errorEl.textContent = 'Vul je naam in.'; nameEl.focus(); return; }
      if (!text) { if (errorEl) errorEl.textContent = 'Vul je feedback in.'; textEl.focus(); return; }

      const remaining = getFeedbackCooldownRemaining();
      if (remaining > 0) return;

      btnSendFeedback.disabled = true;
      btnSendFeedback.textContent = 'Versturen...';
      try {
        const sourceLang = window.AutoTranslator ? window.AutoTranslator.currentLanguage() : (localStorage.getItem('appLanguage') || 'nl');
        const translated = window.AutoTranslator ? await window.AutoTranslator.buildBilingual(text, sourceLang) : { nl:text, en:text, sourceLang };
        await db.ref('feedback').push({ name, text, textTranslations: translated, sourceLang, createdAt: Date.now() });
        localStorage.setItem(feedbackLimitKey, String(Date.now()));
        closeModal('modal-feedback');
        alert('Bedankt voor je feedback!');
      } catch (e) {
        console.error(e);
        if (errorEl) errorEl.textContent = 'Fout bij versturen.';
      } finally {
        btnSendFeedback.disabled = false;
        btnSendFeedback.textContent = 'Versturen';
      }
    };
  }

  const btnLinks = document.getElementById('btn-links');
  if (btnLinks) {
    btnLinks.onclick = () => {
      const contentEl = document.getElementById('links-content');
      if (contentEl) contentEl.textContent = 'Bezig met laden...';
      openModal('modal-links');

      if (typeof db !== 'undefined') {
        db.ref('siteSettings/linksText').once('value').then(snap => {
          if (!contentEl) return;
          const rawText = snap.val() || 'Er zijn nog geen links ingevuld. Voeg deze toe via Sitebeheer.';

          // Escape HTML en maak links klikbaar
          const div = document.createElement('div');
          div.textContent = rawText;
          const escaped = div.innerHTML;
          const linkified = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--gold-soft);text-decoration:underline;">$1</a>');

          contentEl.innerHTML = linkified;
        }).catch(err => {
          console.error(err);
          if (contentEl) contentEl.textContent = 'Fout bij het laden van de links.';
        });
      }
    };
  }

  const btnCredits = document.getElementById('btn-credits');
  if (btnCredits) {
    btnCredits.onclick = () => {
      const contentEl = document.getElementById('credits-content');
      if (contentEl) contentEl.textContent = 'Bezig met laden...';
      openModal('modal-credits');

      if (typeof db !== 'undefined') {
        db.ref('siteSettings/creditsText').once('value').then(snap => {
          if (!contentEl) return;
          const rawText = snap.val() || 'Er zijn nog geen credits ingevuld. Voeg deze toe via Sitebeheer.';
          const div = document.createElement('div');
          div.textContent = rawText;
          const escaped = div.innerHTML;
          const linkified = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--gold-soft);text-decoration:underline;">$1</a>');
          contentEl.innerHTML = linkified;
        }).catch(err => {
          console.error(err);
          if (contentEl) contentEl.textContent = 'Fout bij het laden van de credits.';
        });
      }
    };
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLanding);
else initLanding();
