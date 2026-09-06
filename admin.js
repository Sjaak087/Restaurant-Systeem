// ==================== Modals (kleine eigen versie, restaurant.js/landing.js zijn hier niet geladen) ====================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  });
});

document.getElementById('btn-admin-logout').addEventListener('click', () => {
  sessionStorage.removeItem('isRestaurantAdmin');
  window.location.href = 'index.html';
});

function escapeHtmlAdmin(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatDatumAdmin(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ==================== Restaurants ophalen & tonen ====================
let editingRestaurantId = null;

db.ref('restaurants').on('value', snap => {
  const data = snap.val() || {};
  renderAdminRestaurants(data);
  cleanupGhostAndExpiredRestaurants(data);
});

function renderAdminRestaurants(data) {
  const list = document.getElementById('admin-restaurant-list');
  const emptyMsg = document.getElementById('admin-empty-msg');

  // Restaurants zonder leden zijn "spookrestaurants" (bijv. overgebleven na een
  // fout, of nog in het proces van verwijderd worden) en gelden niet als een
  // echt bestaand restaurant, dus die tonen we niet in het beheer.
  const entries = Object.entries(data)
    .filter(([, r]) => r.leden && Object.keys(r.leden).length > 0)
    .sort((a, b) => (b[1].aangemaakt || 0) - (a[1].aangemaakt || 0));

  if (entries.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';
  list.innerHTML = '';

  entries.forEach(([id, r]) => {
    const ledenAantal = r.leden ? Object.keys(r.leden).length : 0;
    const card = document.createElement('div');
    card.className = 'restaurant-card admin-restaurant-card';
    card.innerHTML = `
      <div class="restaurant-card-main">
        <div class="restaurant-card-name">${escapeHtmlAdmin(r.naam || 'Restaurant')}</div>
        <div class="restaurant-card-role">Code: ${escapeHtmlAdmin(r.code || '—')} · ${ledenAantal} lid/leden · aangemaakt ${formatDatumAdmin(r.aangemaakt)}</div>
        ${r.autoDelete && r.autoDelete.deleteAt ? `<div class="restaurant-card-role" style="color:#d99a9a;">⏱ Verwijdert automatisch op ${formatDatumTijdAdmin(r.autoDelete.deleteAt)}</div>` : ''}
      </div>
      <div class="admin-restaurant-actions">
        <button type="button" class="mini-btn edit" data-view="${id}">Bekijken &amp; beheren</button>
        <button type="button" class="mini-btn edit" data-edit="${id}">Naam</button>
        <button type="button" class="mini-btn edit" data-warn="${id}">⚠️ Waarschuwing</button>
        <button type="button" class="mini-btn edit" data-timer="${id}">⏱ Verwijdertimer</button>
        <button type="button" class="mini-btn danger" data-delete="${id}">Verwijderen</button>
      </div>
    `;
    // Klik op de kaart zelf opent de volledige restaurant-weergave, met alle
    // rechten van een eigenaar (plattegrond, producten, voorraad, leden, enz).
    card.addEventListener('click', () => openAdminRestaurantView(id));
    card.querySelector('[data-view]').addEventListener('click', (e) => {
      e.stopPropagation();
      openAdminRestaurantView(id);
    });
    card.querySelector('[data-edit]').addEventListener('click', (e) => {
      e.stopPropagation();
      openAdminRename(id, r.naam || '');
    });
    card.querySelector('[data-warn]').addEventListener('click', (e) => {
      e.stopPropagation();
      openAdminWarning(id, r.naam || 'dit restaurant');
    });
    card.querySelector('[data-timer]').addEventListener('click', (e) => {
      e.stopPropagation();
      openAdminDeleteTimer(id, r.naam || 'dit restaurant', r.autoDelete);
    });
    card.querySelector('[data-delete]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAdminRestaurant(id, r);
    });
    list.appendChild(card);
  });
}

function openAdminRestaurantView(id) {
  window.location.href = `restaurant.html?id=${encodeURIComponent(id)}&admin=1`;
}

function openAdminRename(id, naam) {
  editingRestaurantId = id;
  document.getElementById('admin-rename-input').value = naam;
  document.getElementById('admin-rename-error').textContent = '';
  openModal('modal-admin-rename');
}

document.getElementById('admin-rename-confirm').addEventListener('click', () => {
  const naam = document.getElementById('admin-rename-input').value.trim();
  const errorEl = document.getElementById('admin-rename-error');
  if (!naam) { errorEl.textContent = 'Vul een naam in.'; return; }
  if (!editingRestaurantId) return;

  const btn = document.getElementById('admin-rename-confirm');
  btn.disabled = true;
  db.ref('restaurants/' + editingRestaurantId + '/naam').set(naam).then(() => {
    btn.disabled = false;
    closeModal('modal-admin-rename');
  }).catch(err => {
    console.error(err);
    btn.disabled = false;
    errorEl.textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});

// ==================== Waarschuwing naar restaurant sturen ====================
// De waarschuwing wordt in Firebase gezet en verschijnt de eerstvolgende keer
// dat de eigenaar (niet de admin zelf) het restaurant opent, groot in beeld.
// Zodra de eigenaar op "Oké" drukt, wordt de waarschuwing verwijderd en komt
// hij dus nooit meer terug (tenzij er een nieuwe wordt verstuurd).
let editingWarningRestaurantId = null;
let editingWarningRestaurantNaam = '';

function openAdminWarning(id, naam) {
  editingWarningRestaurantId = id;
  editingWarningRestaurantNaam = naam;
  document.getElementById('admin-warning-restaurant-name').textContent = `Voor: ${naam}`;
  document.getElementById('admin-warning-input').value = '';
  document.getElementById('admin-warning-error').textContent = '';
  openModal('modal-admin-warning');
}

document.getElementById('admin-warning-confirm').addEventListener('click', () => {
  const tekst = document.getElementById('admin-warning-input').value.trim();
  const errorEl = document.getElementById('admin-warning-error');
  if (!tekst) { errorEl.textContent = 'Vul een bericht in.'; return; }
  if (!editingWarningRestaurantId) return;

  const btn = document.getElementById('admin-warning-confirm');
  btn.disabled = true;
  const createdAt = Date.now();
  Promise.all([
    db.ref('restaurants/' + editingWarningRestaurantId + '/warning').set({
      text: tekst,
      createdAt: createdAt
    }),
    // Blijvende geschiedenis: dit blijft staan ook nadat de eigenaar de
    // waarschuwing zelf heeft weggeklikt, zodat sitebeheerders kunnen
    // terugzien wat er wanneer naar welk restaurant is gestuurd.
    db.ref('warningHistory').push({
      restaurantId: editingWarningRestaurantId,
      restaurantNaam: editingWarningRestaurantNaam || 'Restaurant',
      text: tekst,
      createdAt: createdAt
    })
  ]).then(() => {
    btn.disabled = false;
    closeModal('modal-admin-warning');
  }).catch(err => {
    console.error(err);
    btn.disabled = false;
    errorEl.textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});

// ==================== Aankondigingen (sitebreed, via belletje op index.html) ====================
db.ref('announcements').on('value', snap => {
  renderAdminAnnouncements(snap.val() || {});
});

async function ensureAdminAnnouncementTranslations(id, a) {
  if (!window.AutoTranslator || !a) return;
  const patch = {};
  try {
    if (!a.titelTranslations && a.titel) {
      patch.titelTranslations = await window.AutoTranslator.buildBilingual(a.titel, a.sourceLang);
    }
    if (!a.infoTranslations && a.info) {
      patch.infoTranslations = await window.AutoTranslator.buildBilingual(a.info, a.sourceLang);
    }
    if (Object.keys(patch).length && typeof db !== 'undefined') {
      await db.ref('announcements/' + id).update(patch);
    }
  } catch (e) {
    console.warn('Admin announcement translation failed:', e);
  }
}

function renderAdminAnnouncements(data) {
  const list = document.getElementById('admin-announcement-list');
  const emptyMsg = document.getElementById('admin-announcement-empty-msg');

  const entries = Object.entries(data)
    .sort((a, b) => (b[1].aangemaakt || 0) - (a[1].aangemaakt || 0));

  if (entries.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';
  list.innerHTML = '';

  entries.forEach(([id, a]) => {
    ensureAdminAnnouncementTranslations(id, a);
    const card = document.createElement('div');
    card.className = 'restaurant-card admin-restaurant-card';
    card.innerHTML = `
      <div class="restaurant-card-main">
        <div class="restaurant-card-name">📢 ${escapeHtmlAdmin(window.AutoTranslator && a.titelTranslations ? window.AutoTranslator.pickBilingual(a.titelTranslations) : (a.titel || 'Announcement'))}</div>
        <div class="restaurant-card-role">${escapeHtmlAdmin(window.AutoTranslator && a.infoTranslations ? window.AutoTranslator.pickBilingual(a.infoTranslations) : (a.info || ''))}</div>
        <div class="restaurant-card-role" style="margin-top:2px;">${formatDatumTijdAdmin(a.aangemaakt)}</div>
      </div>
      <div class="admin-restaurant-actions">
        <button type="button" class="mini-btn danger" data-delete-announcement="${id}">Verwijderen</button>
      </div>
    `;
    card.querySelector('[data-delete-announcement]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAdminAnnouncement(id, a);
    });
    list.appendChild(card);
  });
}

function formatDatumTijdAdmin(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const datum = d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const tijd = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  return `${datum} · ${tijd}`;
}

document.getElementById('btn-admin-new-announcement').addEventListener('click', () => {
  document.getElementById('admin-announcement-title-input').value = '';
  document.getElementById('admin-announcement-info-input').value = '';
  document.getElementById('admin-announcement-error').textContent = '';
  openModal('modal-admin-announcement');
});

document.getElementById('admin-announcement-confirm').addEventListener('click', async () => {
  const titel = document.getElementById('admin-announcement-title-input').value.trim();
  const info = document.getElementById('admin-announcement-info-input').value.trim();
  const errorEl = document.getElementById('admin-announcement-error');
  if (!titel) { errorEl.textContent = 'Vul een titel in.'; return; }
  if (!info) { errorEl.textContent = 'Vul de info in.'; return; }

  const btn = document.getElementById('admin-announcement-confirm');
  btn.disabled = true;
  try {
    const sourceLang = window.AutoTranslator ? window.AutoTranslator.currentLanguage() : (localStorage.getItem('appLanguage') || 'nl');
    const translated = window.AutoTranslator
      ? await window.AutoTranslator.translateFieldSet({ titel, info }, sourceLang)
      : { titel: { nl: titel, en: titel }, info: { nl: info, en: info } };
    await db.ref('announcements').push().set({
      titel: titel,
      info: info,
      titelTranslations: translated.titel,
      infoTranslations: translated.info,
      sourceLang,
      aangemaakt: Date.now()
    });
    closeModal('modal-admin-announcement');
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Er ging iets mis, probeer opnieuw.';
  } finally {
    btn.disabled = false;
  }
});

function deleteAdminAnnouncement(id, a) {
  const titel = a.titel || 'dit announcement';
  if (!confirm(`Weet je zeker dat je "${titel}" wilt verwijderen?`)) return;
  db.ref('announcements/' + id).remove().catch(err => {
    console.error(err);
    alert('Er ging iets mis bij het verwijderen, probeer het opnieuw.');
  });
}

function deleteAdminRestaurant(id, r) {
  const naam = r.naam || 'dit restaurant';
  if (!confirm(`Weet je zeker dat je "${naam}" wilt verwijderen? Dit verwijdert het HELE restaurant definitief, inclusief alle leden, tafels, producten en geschiedenis. Dit kan niet ongedaan gemaakt worden.`)) return;

  db.ref('restaurants/' + id).remove().then(() => {
    if (r.code) return db.ref('restaurantCodes/' + r.code).remove();
  }).catch(err => {
    console.error(err);
    alert('Er ging iets mis bij het verwijderen, probeer het opnieuw.');
  });
}

// ==================== Automatische verwijdertimer ====================
// Stelt in na hoeveel uur/minuten een restaurant automatisch verwijderd
// wordt. Het restaurant zelf toont hierboven een countdown en verwijdert
// zichzelf zodra de tijd om is (zie restaurant.js). Dit sitebeheer ruimt
// daarnaast, zolang deze pagina open is, ook verlopen/leeggelopen
// restaurants op als niemand het restaurant zelf open heeft staan.
let editingTimerRestaurantId = null;

function openAdminDeleteTimer(id, naam, autoDelete) {
  editingTimerRestaurantId = id;
  document.getElementById('admin-timer-restaurant-name').textContent = `Voor: ${naam}`;
  document.getElementById('admin-timer-uren-input').value = '';
  document.getElementById('admin-timer-minuten-input').value = '';
  document.getElementById('admin-timer-error').textContent = '';
  const cancelBtn = document.getElementById('admin-timer-cancel');
  cancelBtn.style.display = (autoDelete && autoDelete.deleteAt) ? '' : 'none';
  openModal('modal-admin-timer');
}

document.getElementById('admin-timer-confirm').addEventListener('click', () => {
  const errorEl = document.getElementById('admin-timer-error');
  const uren = parseInt(document.getElementById('admin-timer-uren-input').value, 10) || 0;
  const minuten = parseInt(document.getElementById('admin-timer-minuten-input').value, 10) || 0;
  if (uren <= 0 && minuten <= 0) { errorEl.textContent = 'Vul minimaal 1 minuut of 1 uur in.'; return; }
  if (!editingTimerRestaurantId) return;

  const deleteAt = Date.now() + (uren * 60 + minuten) * 60000;
  const btn = document.getElementById('admin-timer-confirm');
  btn.disabled = true;
  db.ref('restaurants/' + editingTimerRestaurantId + '/autoDelete').set({ deleteAt, setAt: Date.now() }).then(() => {
    btn.disabled = false;
    closeModal('modal-admin-timer');
  }).catch(err => {
    console.error(err);
    btn.disabled = false;
    errorEl.textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});

document.getElementById('admin-timer-cancel').addEventListener('click', () => {
  if (!editingTimerRestaurantId) return;
  db.ref('restaurants/' + editingTimerRestaurantId + '/autoDelete').remove().then(() => {
    closeModal('modal-admin-timer');
  }).catch(err => {
    console.error(err);
    document.getElementById('admin-timer-error').textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});

// ==================== Opruimen: spookrestaurants & verlopen timers ====================
// Draait elke keer dat de restaurantenlijst binnenkomt (dus zolang deze
// sitebeheerpagina open staat). Een restaurant zonder leden (bijv. door een
// mislukte aanmaak, of omdat iedereen 'm heeft verlaten) of waarvan de
// verwijdertimer is verstreken, wordt dan definitief uit Firebase gehaald.
function cleanupGhostAndExpiredRestaurants(data) {
  const nu = Date.now();
  Object.entries(data).forEach(([id, r]) => {
    const isGhost = !r.leden || Object.keys(r.leden).length === 0;
    const isExpired = r.autoDelete && r.autoDelete.deleteAt && r.autoDelete.deleteAt <= nu;
    if (!isGhost && !isExpired) return;
    db.ref('restaurants/' + id).remove().then(() => {
      if (r.code) return db.ref('restaurantCodes/' + r.code).remove();
    }).catch(err => console.error('Opruimen mislukt voor', id, err));
  });
}


// ==================== Sitebeheer tabs ====================
document.querySelectorAll('[data-admin-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.adminTab;
    document.querySelectorAll('[data-admin-tab]').forEach(b => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[id^="admin-tab-"]').forEach(panel => panel.classList.remove('active'));
    document.getElementById('admin-tab-' + tab)?.classList.add('active');
  });
});

// ==================== Gegeven feedback ====================
const feedbackListEl = document.getElementById('feedback-list');
const feedbackEmptyEl = document.getElementById('feedback-empty-msg');

db.ref('feedback').on('value', snap => {
  if (!feedbackListEl) return;
  const data = snap.val() || {};
  const entries = Object.entries(data).sort((a, b) => {
    const aTime = Number(a[1]?.createdAt ?? a[1]?.time ?? 0);
    const bTime = Number(b[1]?.createdAt ?? b[1]?.time ?? 0);
    return bTime - aTime;
  });

  feedbackListEl.innerHTML = '';
  feedbackEmptyEl.style.display = entries.length ? 'none' : 'block';

  entries.forEach(([id, feedback]) => {
    const card = document.createElement('article');
    card.className = 'feedback-card';

    const createdAt = Number(feedback.createdAt ?? feedback.time ?? 0);
    const dateText = createdAt ? formatDatumTijdAdmin(createdAt) : '—';
    const name = feedback.name ?? feedback.naam ?? 'Onbekend';
    const text = (window.AutoTranslator && feedback.textTranslations) ? window.AutoTranslator.pickBilingual(feedback.textTranslations) : (feedback.text ?? feedback.tekst ?? '');

    card.innerHTML = `
      <div class="feedback-card-main">
        <div class="feedback-card-header">
          <div class="feedback-card-from">Van: ${escapeHtmlAdmin(name)}</div>
          <div class="feedback-card-date">${escapeHtmlAdmin(dateText)}</div>
        </div>
        <div class="feedback-card-text">${escapeHtmlAdmin(text).replace(/\n/g, '<br>')}</div>
      </div>
      <div class="admin-restaurant-actions">
        <button type="button" class="mini-btn edit" data-feedback-read="${escapeHtmlAdmin(id)}">Gelezen</button>
      </div>
    `;

    card.querySelector('[data-feedback-read]').addEventListener('click', async (e) => {
      e.stopPropagation();
      const button = e.currentTarget;
      button.disabled = true;
      button.textContent = 'Verwijderen...';
      try {
        await db.ref('feedback/' + id).remove();
      } catch (err) {
        console.error('Feedback verwijderen mislukt:', err);
        button.disabled = false;
        button.textContent = 'Gelezen';
        alert('Er ging iets mis bij het verwijderen van de feedback.');
      }
    });

    feedbackListEl.appendChild(card);
  });
});
