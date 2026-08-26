// ==================== Aankondigingen (belletje naast Update log) ====================
// Sitebeheerders maken aankondigingen aan in Sitebeheer (titel + info). Iedereen
// ziet ze hier via het belletje. Zodra iemand op "Gelezen" drukt, wordt het id
// lokaal (op dit apparaat) onthouden en verdwijnt de aankondiging daar voorgoed,
// ook als er later weer een nieuwe wordt verstuurd.

const ANNOUNCEMENTS_READ_KEY = 'gelezenAankondigingen';

function getGelezenAankondigingen() {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_READ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function markAankondigingGelezen(id) {
  const gelezen = getGelezenAankondigingen();
  if (!gelezen.includes(id)) {
    gelezen.push(id);
    localStorage.setItem(ANNOUNCEMENTS_READ_KEY, JSON.stringify(gelezen));
  }
}

function escapeHtmlAnnouncements(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatAankondigingDatumTijd(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const datum = d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const tijd = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  return `${datum} · ${tijd}`;
}

let ALL_ANNOUNCEMENTS = {};

const announcementBadgeEl = document.getElementById('announcement-badge');
const announcementsListEl = document.getElementById('announcements-list');
const announcementsEmptyEl = document.getElementById('announcements-empty-msg');

function renderAnnouncements() {
  const gelezen = getGelezenAankondigingen();
  const entries = Object.entries(ALL_ANNOUNCEMENTS)
    .filter(([id]) => !gelezen.includes(id))
    .sort((a, b) => (b[1].aangemaakt || 0) - (a[1].aangemaakt || 0));

  if (announcementBadgeEl) {
    if (entries.length > 0) {
      announcementBadgeEl.textContent = entries.length > 9 ? '9+' : String(entries.length);
      announcementBadgeEl.style.display = 'flex';
    } else {
      announcementBadgeEl.style.display = 'none';
    }
  }

  if (!announcementsListEl) return;
  announcementsListEl.innerHTML = '';

  if (entries.length === 0) {
    if (announcementsEmptyEl) announcementsEmptyEl.style.display = 'block';
    return;
  }
  if (announcementsEmptyEl) announcementsEmptyEl.style.display = 'none';

  entries.forEach(([id, a]) => {
    const item = document.createElement('div');
    item.className = 'announcement-item';
    item.innerHTML = `
      <div class="announcement-item-head">
        <span class="announcement-item-title">📢 ${escapeHtmlAnnouncements(a.titel)}</span>
        <span class="announcement-item-date">${escapeHtmlAnnouncements(formatAankondigingDatumTijd(a.aangemaakt))}</span>
      </div>
      <div class="announcement-item-info">${escapeHtmlAnnouncements(a.info)}</div>
      <div class="announcement-item-actions">
        <button type="button" class="btn-primary announcement-read-btn">Gelezen</button>
      </div>
    `;
    item.querySelector('.announcement-read-btn').addEventListener('click', () => {
      markAankondigingGelezen(id);
      renderAnnouncements();
    });
    announcementsListEl.appendChild(item);
  });
}

if (typeof db !== 'undefined') {
  db.ref('announcements').on('value', snap => {
    ALL_ANNOUNCEMENTS = snap.val() || {};
    renderAnnouncements();
  });
}

const btnAnnouncements = document.getElementById('btn-announcements');
if (btnAnnouncements) {
  // Gebruikt de openModal-functie die al door landing.js/restaurant.js is gedefinieerd.
  btnAnnouncements.addEventListener('click', () => openModal('modal-announcements'));
}

// ==================== Tabs binnen de announcements-popup ====================
document.querySelectorAll('[data-notiftab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-notiftab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('[id^="notiftab-"]').forEach(panel => panel.classList.remove('active'));
    const target = document.getElementById('notiftab-' + btn.dataset.notiftab);
    if (target) target.classList.add('active');
  });
});

// ==================== Eerdere waarschuwingen (geschiedenis, per restaurant) ====================
let ALL_WARNING_HISTORY = {};
const warningsListEl = document.getElementById('warnings-list');
const warningsEmptyEl = document.getElementById('warnings-empty-msg');

function renderWarningHistory() {
  if (!warningsListEl) return;
  const entries = Object.entries(ALL_WARNING_HISTORY)
    .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  warningsListEl.innerHTML = '';
  if (entries.length === 0) {
    if (warningsEmptyEl) warningsEmptyEl.style.display = 'block';
    return;
  }
  if (warningsEmptyEl) warningsEmptyEl.style.display = 'none';

  entries.forEach(([id, w]) => {
    const item = document.createElement('div');
    item.className = 'announcement-item';
    item.innerHTML = `
      <div class="announcement-item-head">
        <span class="announcement-item-title">⚠️ ${escapeHtmlAnnouncements(w.restaurantNaam || 'Restaurant')}</span>
        <span class="announcement-item-date">${escapeHtmlAnnouncements(formatAankondigingDatumTijd(w.createdAt))}</span>
      </div>
      <div class="announcement-item-info">${escapeHtmlAnnouncements(w.text)}</div>
    `;
    warningsListEl.appendChild(item);
  });
}

if (typeof db !== 'undefined') {
  db.ref('warningHistory').on('value', snap => {
    ALL_WARNING_HISTORY = snap.val() || {};
    renderWarningHistory();
  });
}
