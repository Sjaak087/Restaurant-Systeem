const MAX_RESTAURANTS = 2;
const STORAGE_KEY = 'mijnRestaurants';

function requireUsername() {
  const username = getUsername();
  if (username) return username;
  openModal('modal-username-setup');
  const input = document.getElementById('username-setup-input');
  if (input) input.focus();
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

function saveMyRestaurants(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function addMyRestaurant(entry) {
  const list = getMyRestaurants();
  if (list.some(r => r.id === entry.id)) return list;
  list.push(entry);
  saveMyRestaurants(list);
  return list;
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // zonder verwarrende tekens (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function genMemberId() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
// index.html is de pagina die vrijwel iedereen als eerste opent (leden,
// niet alleen sitebeheerders). Door dit hier ook te checken, wordt een
// verlopen restaurant al opgeruimd zodra ÉÉN willekeurig iemand de site
// bezoekt, in plaats van pas wanneer specifiek dat restaurant of het
// sitebeheer geopend wordt. Draait één keer per bezoek, op de achtergrond,
// zonder de pagina te blokkeren.
(async function cleanupExpiredRestaurants() {
  try {
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

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }
  } catch (e) {
    // Stil falen: dit is opruimen op de achtergrond, geen kernfunctionaliteit
    // van de pagina, dus een foutje hierin mag de rest niet verstoren.
    console.error('Opruimen mislukt:', e);
  }
})();

// ---- Render "Mijn restaurants" ----
const myRestaurantsEl = document.getElementById('my-restaurants');
const maxMsgEl = document.getElementById('max-msg');
const landingActionsEl = document.getElementById('landing-actions');

function renderMyRestaurants() {
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
    card.addEventListener('click', () => {
      window.location.href = `restaurant.html?id=${encodeURIComponent(r.id)}`;
    });
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

  // Alleen het ZELF AANMAKEN is aan een maximum van 2 gebonden; joinen mag
  // onbeperkt. Het "Restaurant maken"-knopje verdwijnt dus op zichzelf zodra
  // dat maximum bereikt is, terwijl "Restaurant joinen" altijd zichtbaar blijft.
  const createAtMax = aangemaakt.length >= MAX_RESTAURANTS;
  maxMsgEl.style.display = createAtMax ? 'block' : 'none';
  document.getElementById('btn-open-create').style.display = createAtMax ? 'none' : '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

renderMyRestaurants();

// ---- Modals ----
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  });
});

// ---- Restaurant maken ----
document.getElementById('btn-open-create').addEventListener('click', () => {
  if (!requireUsername()) return;
  document.getElementById('create-name').value = '';
    document.getElementById('create-error').textContent = '';
  openModal('modal-create');
});

document.getElementById('create-confirm').addEventListener('click', async () => {
  const naam = document.getElementById('create-name').value.trim();
  const mijnNaam = getUsername();
  const errorEl = document.getElementById('create-error');
  if (!naam) { errorEl.textContent = 'Vul een naam in.'; return; }
  if (!mijnNaam) { errorEl.textContent = 'Vul je eigen naam in.'; return; }
  if (getMyRestaurants().filter(r => r.rol === 'eigenaar').length >= MAX_RESTAURANTS) { errorEl.textContent = 'Je hebt al 2 zelf aangemaakte restaurants. Verwijder er eerst één om een nieuwe te maken.'; return; }

  const btn = document.getElementById('create-confirm');
  btn.disabled = true;
  btn.textContent = 'Bezig...';

  try {
    const code = await genUniqueCode();
    const newRef = db.ref('restaurants').push();
    const id = newRef.key;

    await newRef.set({
      naam: naam,
      code: code,
      aangemaakt: Date.now()
    });
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
    errorEl.textContent = 'Er ging iets mis, probeer het opnieuw.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Aanmaken';
  }
});

document.getElementById('code-shown-ok').addEventListener('click', () => {
  const id = window.pendingRestaurantId;
  window.location.href = `restaurant.html?id=${encodeURIComponent(id)}`;
});

// ---- Restaurant joinen ----
document.getElementById('btn-open-join').addEventListener('click', () => {
  if (!requireUsername()) return;
  document.getElementById('join-code').value = '';
    document.getElementById('join-error').textContent = '';
  openModal('modal-join');
});

document.getElementById('join-confirm').addEventListener('click', async () => {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  const mijnNaam = getUsername();
  const errorEl = document.getElementById('join-error');
  if (!code) { errorEl.textContent = 'Vul een code in.'; return; }
  if (!mijnNaam) { errorEl.textContent = 'Vul je eigen naam in.'; return; }

  const btn = document.getElementById('join-confirm');
  btn.disabled = true;
  btn.textContent = 'Bezig...';

  try {
    const snap = await db.ref('restaurantCodes/' + code).get();
    if (!snap.exists()) {
      errorEl.textContent = 'Geen restaurant gevonden met deze code.';
      return;
    }
    const id = snap.val();
    const infoSnap = await db.ref('restaurants/' + id + '/naam').get();
    const naam = infoSnap.exists() ? infoSnap.val() : 'Restaurant';

    if (getMyRestaurants().some(r => r.id === id)) {
      errorEl.textContent = 'Je zit al in dit restaurant.';
      return;
    }

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
    errorEl.textContent = 'Er ging iets mis, probeer het opnieuw.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Joinen';
  }
});


// ---- Feedback ----
const feedbackButton = document.getElementById('btn-feedback');
const feedbackSendButton = document.getElementById('send-feedback');
const feedbackLimitKey = 'feedbackLastSentAt';
const FEEDBACK_COOLDOWN_MS = 5 * 60 * 1000;

function getFeedbackCooldownRemaining() {
  const lastSent = Number(localStorage.getItem(feedbackLimitKey) || 0);
  return Math.max(0, FEEDBACK_COOLDOWN_MS - (Date.now() - lastSent));
}

if (feedbackButton) {
  feedbackButton.addEventListener('click', () => {
    const errorEl = document.getElementById('feedback-error');
    errorEl.textContent = '';
    document.getElementById('feedback-name').value = getUsername();
    document.getElementById('feedback-text').value = '';
    const remaining = getFeedbackCooldownRemaining();
    if (remaining > 0) {
      const minutes = Math.ceil(remaining / 60000);
      errorEl.textContent = `Je kunt over ${minutes} minuut${minutes === 1 ? '' : 'en'} opnieuw feedback geven.`;
    }
    openModal('modal-feedback');
  });
}

if (feedbackSendButton) {
  feedbackSendButton.addEventListener('click', async () => {
    const nameEl = document.getElementById('feedback-name');
    const textEl = document.getElementById('feedback-text');
    const errorEl = document.getElementById('feedback-error');
    const name = nameEl.value.trim();
    const text = textEl.value.trim();

    errorEl.textContent = '';
    if (!name) { errorEl.textContent = 'Vul je naam in.'; nameEl.focus(); return; }
    if (!text) { errorEl.textContent = 'Vul je feedback in.'; textEl.focus(); return; }

    const remaining = getFeedbackCooldownRemaining();
    if (remaining > 0) {
      const minutes = Math.ceil(remaining / 60000);
      errorEl.textContent = `Je kunt over ${minutes} minuut${minutes === 1 ? '' : 'en'} opnieuw feedback geven.`;
      return;
    }

    feedbackSendButton.disabled = true;
    feedbackSendButton.textContent = 'Versturen...';
    try {
      const sourceLang = window.AutoTranslator ? window.AutoTranslator.currentLanguage() : (localStorage.getItem('appLanguage') || 'nl');
      const translated = window.AutoTranslator
        ? await window.AutoTranslator.buildBilingual(text, sourceLang)
        : { nl:text, en:text, de:text, sourceLang };
      await db.ref('feedback').push({
        name: name,
        text: text,
        textTranslations: translated,
        sourceLang,
        createdAt: Date.now()
      });
      localStorage.setItem(feedbackLimitKey, String(Date.now()));
      closeModal('modal-feedback');
      alert('Bedankt voor je feedback!');
    } catch (e) {
      console.error('Feedback versturen mislukt:', e);
      errorEl.textContent = 'Er ging iets mis bij het versturen. Probeer het opnieuw.';
    } finally {
      feedbackSendButton.disabled = false;
      feedbackSendButton.textContent = 'Versturen';
    }
  });
}
