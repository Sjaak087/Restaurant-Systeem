// ==================== Setup & toegang ====================
const params = new URLSearchParams(window.location.search);
const restaurantId = params.get('id');

function getMyRestaurants() {
  try { return JSON.parse(localStorage.getItem('mijnRestaurants')) || []; }
  catch (e) { return []; }
}

const mijnEntry = getMyRestaurants().find(r => r.id === restaurantId);
if (!restaurantId || !mijnEntry) {
  alert('Dit restaurant is niet bekend op dit apparaat. Join het eerst met een code.');
  window.location.href = 'index.html';
}

const isOwner = !!mijnEntry && mijnEntry.rol === 'eigenaar';

const restRef = db.ref('restaurants/' + restaurantId);

function saveMyRestaurantsLocal(list) {
  localStorage.setItem('mijnRestaurants', JSON.stringify(list));
}

// ==================== Leden & rechten per tabblad ====================
const ALL_TABS = ['bestellen', 'keuken', 'gereed', 'historie', 'instellingen'];
const TAB_LABELS = { bestellen: 'Bestellen', keuken: 'Keuken', gereed: 'Gereed', historie: 'Historie', instellingen: 'Instellingen' };

function genLidId() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
async function genUniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = genCode();
    const snap = await db.ref('restaurantCodes/' + code).get();
    if (!snap.exists()) return code;
  }
  throw new Error('Kon geen unieke code genereren');
}

// Zorg dat dit apparaat een lid-id heeft. Bestaande memberships (van vóór deze functie,
// of als de join-schrijfactie ooit mislukte) krijgen bij het eerste bezoek gewoon alle
// tabbladen, zodat niemand onverwacht wordt buitengesloten.
let myMemberId = mijnEntry.memberId;
if (!myMemberId) {
  myMemberId = genLidId();
  const list = getMyRestaurants();
  const idx = list.findIndex(r => r.id === restaurantId);
  if (idx > -1) { list[idx].memberId = myMemberId; saveMyRestaurantsLocal(list); }
}
function applyTabPermissions(tabs) {
  tabs = tabs || {};
  let firstVisible = null;
  ALL_TABS.forEach(t => {
    const btn = document.querySelector(`.tab-btn[data-tab="${t}"]`);
    if (!btn) return;
    // Veiligheidsklep: de eigenaar behoudt altijd toegang tot Instellingen, anders zou
    // die zichzelf per ongeluk kunnen buitensluiten van het ledenbeheer.
    const allowed = (isOwner && t === 'instellingen') || tabs[t] === true;
    btn.style.display = allowed ? '' : 'none';
    if (allowed && !firstVisible) firstVisible = t;
  });
  const activeBtn = document.querySelector('.tab-btn.active');
  if (firstVisible && (!activeBtn || activeBtn.style.display === 'none')) {
    document.querySelector(`.tab-btn[data-tab="${firstVisible}"]`).click();
  }
}

restRef.child('leden/' + myMemberId).once('value').then(snap => {
  if (!snap.exists()) {
    const tabs = {};
    ALL_TABS.forEach(t => { tabs[t] = true; });
    const data = { rol: isOwner ? 'eigenaar' : 'gejoined', tabs: tabs, toegevoegdOp: Date.now() };
    return restRef.child('leden/' + myMemberId).set(data).then(() => tabs);
  }
  return snap.val().tabs;
}).then(tabs => {
  applyTabPermissions(tabs);
  if (isOwner) {
    // Zorg dat de eigenaar zichzelf meteen in de ledenlijst ziet, ook nog vóórdat
    // het live-abonnement op /leden zijn eerste update heeft binnengekregen.
    LEDEN_STATE[myMemberId] = LEDEN_STATE[myMemberId] || { rol: 'eigenaar', tabs: tabs, toegevoegdOp: Date.now() };
    renderLedenList();
  }
  // Pas ná het aanmaken/ophalen van dit lid-record live gaan luisteren, anders kan het
  // even (foutief) lijken alsof je bent gekickt terwijl het record nog geschreven wordt.
  restRef.child('leden/' + myMemberId).on('value', snap => {
    if (!snap.exists()) {
      alert('Je bent verwijderd uit dit restaurant.');
      const list = getMyRestaurants().filter(r => r.id !== restaurantId);
      saveMyRestaurantsLocal(list);
      window.location.href = 'index.html';
      return;
    }
    applyTabPermissions(snap.val().tabs);
  });
});

// ---- Ledenlijst (alleen zichtbaar/bewerkbaar voor de eigenaar) ----
let LEDEN_STATE = {};
if (!isOwner) {
  document.getElementById('subtab-btn-leden').style.display = 'none';
} else {
  restRef.child('leden').on('value', snap => {
    LEDEN_STATE = snap.val() || {};
    renderLedenList();
  });
}

function renderLedenList() {
  const list = document.getElementById('leden-list');
  const entries = Object.entries(LEDEN_STATE).sort((a, b) => (a[1].toegevoegdOp || 0) - (b[1].toegevoegdOp || 0));
  if (entries.length === 0) {
    list.innerHTML = '<div class="empty-msg">Nog geen leden gevonden.</div>';
    return;
  }
  list.innerHTML = '';
  let volgnummer = 0;
  entries.forEach(([mid, lid]) => {
    const isEigenaarRow = lid.rol === 'eigenaar';
    const isMe = mid === myMemberId;
    const naam = isEigenaarRow ? '👑 Eigenaar' : `👤 Lid ${++volgnummer}`;
    const tabs = lid.tabs || {};
    const row = document.createElement('div');
    row.className = 'lid-row';
    const tabsHtml = ALL_TABS.map(t => {
      const checked = tabs[t] ? 'checked' : '';
      return `<label class="lid-tab-toggle"><input type="checkbox" data-mid="${mid}" data-tab="${t}" ${checked}> ${TAB_LABELS[t]}</label>`;
    }).join('');
    row.innerHTML = `
      <div class="lid-row-head">
        <span class="lid-row-name">${naam}${isMe ? ' <span class="lid-me-tag">(jij)</span>' : ''}</span>
        ${isEigenaarRow ? '' : `<button type="button" class="mini-btn danger" data-kick="${mid}">Verwijderen</button>`}
      </div>
      <div class="lid-tabs">${tabsHtml}</div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      restRef.child(`leden/${cb.dataset.mid}/tabs/${cb.dataset.tab}`).set(cb.checked);
    });
  });
  list.querySelectorAll('[data-kick]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Weet je zeker dat je dit lid wilt verwijderen? De join-code wordt daarna automatisch vernieuwd.')) return;
      kickLid(btn.dataset.kick, btn);
    });
  });
}

async function kickLid(mid, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Bezig...'; }
  try {
    const huidigeCodeSnap = await restRef.child('code').once('value');
    const huidigeCode = huidigeCodeSnap.val();
    const nieuweCode = await genUniqueCode();
    await restRef.update({ ['leden/' + mid]: null, code: nieuweCode });
    if (huidigeCode) await db.ref('restaurantCodes/' + huidigeCode).remove();
    await db.ref('restaurantCodes/' + nieuweCode).set(restaurantId);
  } catch (err) {
    console.error(err);
    alert('Er ging iets mis bij het verwijderen van dit lid.');
    if (btn) { btn.disabled = false; btn.textContent = 'Verwijderen'; }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function formatPrice(p) {
  const n = Number(p) || 0;
  return '€ ' + n.toFixed(2).replace('.', ',');
}
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

// ==================== Restaurantinfo ====================
restRef.child('naam').on('value', snap => {
  const naam = snap.val() || 'Restaurant';
  document.getElementById('restaurant-title').textContent = naam;
  document.getElementById('info-naam').textContent = naam;
  const idx = getMyRestaurants().findIndex(r => r.id === restaurantId);
  if (idx > -1) {
    const list = getMyRestaurants();
    list[idx].naam = naam;
    localStorage.setItem('mijnRestaurants', JSON.stringify(list));
  }
});
restRef.child('code').on('value', snap => {
  document.getElementById('info-code').textContent = snap.val() || '—';
});

// ==================== Tabs ====================
let activeTab = 'bestellen';
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    document.getElementById('panel-' + activeTab).classList.add('active');
  });
});

// ==================== Rechten (alleen eigenaar mag plattegrond/producten aanpassen) ====================
if (!isOwner) {
  document.getElementById('tool-add-area').style.display = 'none';
  document.getElementById('tool-add-table').style.display = 'none';
  document.getElementById('tool-delete').style.display = 'none';
  document.getElementById('fp-gridsize-row').style.display = 'none';
  document.getElementById('fp-hint').textContent = 'Alleen de eigenaar kan de plattegrond aanpassen.';
  document.getElementById('btn-add-product').style.display = 'none';
  document.getElementById('producten-readonly-note').style.display = 'block';
} else {
  document.getElementById('btn-rename-restaurant').style.display = '';
  document.getElementById('btn-header-color').style.display = '';
}

document.getElementById('btn-rename-restaurant').addEventListener('click', () => {
  document.getElementById('rename-restaurant-input').value = document.getElementById('info-naam').textContent.trim();
  document.getElementById('rename-restaurant-error').textContent = '';
  openModal('modal-rename-restaurant');
});
document.getElementById('rename-restaurant-confirm').addEventListener('click', () => {
  const naam = document.getElementById('rename-restaurant-input').value.trim();
  const errorEl = document.getElementById('rename-restaurant-error');
  if (!naam) { errorEl.textContent = 'Vul een naam in.'; return; }
  const btn = document.getElementById('rename-restaurant-confirm');
  btn.disabled = true;
  restRef.child('naam').set(naam).then(() => {
    btn.disabled = false;
    closeModal('modal-rename-restaurant');
  }).catch(err => {
    console.error(err);
    btn.disabled = false;
    errorEl.textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});
// ==================== Kleur bovenbalk ====================
const HEADER_COLORS = [
  '#171310', '#211a14', '#3a2f24', '#5c4a34', '#8c3a3a',
  '#6e2c2c', '#a8482f', '#c9793a', '#c9a24b', '#e0b84a',
  '#6f8f5c', '#3f6b4f', '#2f6e6e', '#356b8c', '#2c4a75',
  '#3a3a75', '#5c3a75', '#7a3a63', '#8c4a63', '#b05f7a',
  '#4a4438', '#5a5a5a', '#787066', '#2a2115', '#f2e8d5'
];

function hexToRgb(hex) {
  const clean = (hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function mix(hex, target, amt) {
  const c = hexToRgb(hex);
  const t = hexToRgb(target);
  const r = Math.round(c.r + (t.r - c.r) * amt);
  const g = Math.round(c.g + (t.g - c.g) * amt);
  const b = Math.round(c.b + (t.b - c.b) * amt);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const norm = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

function applyHeaderColor(color) {
  const root = document.documentElement.style;
  const bg = color || '#171310';
  const isLight = relativeLuminance(bg) > 0.5;
  root.setProperty('--bg', bg);
  root.setProperty('--bg-elevated', mix(bg, isLight ? '#000000' : '#ffffff', 0.08));
  root.setProperty('--card', mix(bg, isLight ? '#000000' : '#ffffff', 0.16));
  root.setProperty('--line', mix(bg, isLight ? '#000000' : '#ffffff', 0.32));
  root.setProperty('--ink', isLight ? '#241c12' : '#f3ead9');
  root.setProperty('--muted', isLight ? '#5a4c38' : '#a99a83');
  const preview = document.getElementById('info-header-color');
  if (preview) preview.style.background = bg;
}

const colorPaletteEl = document.getElementById('color-palette');
if (colorPaletteEl) {
  colorPaletteEl.innerHTML = HEADER_COLORS.map(c =>
    `<button type="button" class="color-swatch" data-color="${c}" style="background:${c};"></button>`
  ).join('');
  colorPaletteEl.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      const color = sw.dataset.color;
      restRef.child('headerColor').set(color).then(() => {
        closeModal('modal-header-color');
      }).catch(err => {
        console.error(err);
        alert('Er ging iets mis bij het opslaan van de kleur.');
      });
    });
  });
}

restRef.child('headerColor').on('value', snap => {
  const color = snap.val();
  applyHeaderColor(color);
  if (colorPaletteEl) {
    colorPaletteEl.querySelectorAll('.color-swatch').forEach(sw => {
      sw.classList.toggle('selected', !!color && sw.dataset.color.toLowerCase() === String(color).toLowerCase());
    });
  }
});

const btnHeaderColor = document.getElementById('btn-header-color');
if (btnHeaderColor) {
  btnHeaderColor.addEventListener('click', () => openModal('modal-header-color'));
}

document.querySelectorAll('.subtab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.subtab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subpanel-' + btn.dataset.subtab).classList.add('active');
  });
});

// ==================== Modal helpers ====================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  });
});

// ==================== Producten (live) ====================
let PRODUCTS_STATE = {}; // key -> {label, emoji, price, ice}

restRef.child('products').on('value', snap => {
  PRODUCTS_STATE = snap.val() || {};
  renderSettingsProducts();
  renderOrderModalIfOpen();
});

function productList() {
  return Object.entries(PRODUCTS_STATE).map(([key, p]) => ({ key, ...p }));
}

// ---- Emoji-picker opbouwen ----
let selectedEmoji = null;
function buildEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  picker.innerHTML = '';
  EMOJI_CATEGORIES.forEach(cat => {
    const catEl = document.createElement('div');
    catEl.className = 'emoji-cat';
    catEl.innerHTML = `<div class="emoji-cat-label">${cat.label}</div>`;
    const grid = document.createElement('div');
    grid.className = 'emoji-grid';
    cat.emojis.forEach(em => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-opt';
      btn.textContent = em;
      btn.addEventListener('click', () => {
        selectedEmoji = em;
        picker.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      grid.appendChild(btn);
    });
    catEl.appendChild(grid);
    picker.appendChild(catEl);
  });
}
buildEmojiPicker();

function markEmojiSelected(em) {
  selectedEmoji = em;
  document.querySelectorAll('.emoji-opt').forEach(b => {
    b.classList.toggle('selected', b.textContent === em);
  });
}

// ---- Product toevoegen/bewerken modal ----
let editingProductKey = null;

document.getElementById('btn-add-product').addEventListener('click', () => {
  editingProductKey = null;
  document.getElementById('product-modal-title').textContent = 'Nieuw product';
  document.getElementById('product-name-input').value = '';
  document.getElementById('product-price-input').value = '';
  document.getElementById('product-ice-input').checked = false;
  document.getElementById('product-error').textContent = '';
  markEmojiSelected(null);
  openModal('modal-product');
});

function openEditProduct(key) {
  const p = PRODUCTS_STATE[key];
  if (!p) return;
  editingProductKey = key;
  document.getElementById('product-modal-title').textContent = 'Product bewerken';
  document.getElementById('product-name-input').value = p.label || '';
  document.getElementById('product-price-input').value = p.price != null ? p.price : '';
  document.getElementById('product-ice-input').checked = !!p.ice;
  document.getElementById('product-error').textContent = '';
  markEmojiSelected(p.emoji || null);
  openModal('modal-product');
}

document.getElementById('product-confirm').addEventListener('click', () => {
  const naam = document.getElementById('product-name-input').value.trim();
  const prijsRaw = document.getElementById('product-price-input').value;
  const ice = document.getElementById('product-ice-input').checked;
  const errorEl = document.getElementById('product-error');

  if (!naam) { errorEl.textContent = 'Vul een naam in.'; return; }
  if (!selectedEmoji) { errorEl.textContent = 'Kies een emoji.'; return; }
  const prijs = prijsRaw === '' ? 0 : Number(prijsRaw);
  if (isNaN(prijs) || prijs < 0) { errorEl.textContent = 'Vul een geldige prijs in.'; return; }

  const data = { label: naam, emoji: selectedEmoji, price: prijs, ice: ice };

  const key = editingProductKey || restRef.child('products').push().key;
  restRef.child('products/' + key).set(data).then(() => {
    closeModal('modal-product');
  }).catch(err => {
    console.error(err);
    errorEl.textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});

function renderSettingsProducts() {
  const list = document.getElementById('settings-product-list');
  const items = productList();
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-msg">Nog geen producten. Voeg er één toe.</div>';
    return;
  }
  list.innerHTML = '';
  items.forEach(p => {
    const row = document.createElement('div');
    row.className = 'settings-product-row';
    row.innerHTML = `
      <div class="settings-product-main">
        <span class="settings-product-emoji">${p.emoji}</span>
        <span class="settings-product-name">${escapeHtml(p.label)}</span>
        <span class="menu-dots"></span>
        <span class="settings-product-price">${formatPrice(p.price)}</span>
        ${p.ice ? '<span class="ice-badge">🧊 ijs-optie</span>' : ''}
      </div>
      ${isOwner ? `<div class="settings-product-actions">
        <button type="button" class="mini-btn edit" data-key="${p.key}">Bewerken</button>
        <button type="button" class="mini-btn danger" data-key="${p.key}">Verwijderen</button>
      </div>` : ''}
    `;
    if (isOwner) {
      const [editBtn, delBtn] = row.querySelectorAll('.mini-btn');
      editBtn.addEventListener('click', () => openEditProduct(p.key));
      delBtn.addEventListener('click', () => {
        if (!confirm(`"${p.label}" verwijderen?`)) return;
        restRef.child('products/' + p.key).remove();
      });
    }
    list.appendChild(row);
  });
}

// ==================== Plattegrond (live data) ====================
let AREAS_STATE = {};  // id -> {name, x, y, w, h}
let TABLES_STATE = {}; // id -> {number, x, y}

// ---- Grootte van de plattegrond (aantal vierkantjes) ----
const GRID_MIN = 10;
const GRID_MAX = 50;
const GRID_STEP = 1;
const GRID_DEFAULT = 20; // komt overeen met de oorspronkelijke vaste 24px-vierkantjes
let currentGridSize = GRID_DEFAULT;

function applyGridSize(size) {
  const n = Math.max(GRID_MIN, Math.min(GRID_MAX, size || GRID_DEFAULT));
  currentGridSize = n;
  const cellPct = 100 / n;
  const scale = Math.max(0.45, Math.min(1.8, GRID_DEFAULT / n));
  [document.getElementById('order-canvas'), document.getElementById('edit-canvas')].forEach(canvasEl => {
    if (!canvasEl) return;
    canvasEl.style.backgroundSize = `${cellPct}% ${cellPct}%`;
    canvasEl.style.setProperty('--fp-scale', scale);
  });
  const valueEl = document.getElementById('grid-size-value');
  if (valueEl) valueEl.textContent = `${n} × ${n}`;
  const minusBtn = document.getElementById('grid-size-minus');
  const plusBtn = document.getElementById('grid-size-plus');
  if (minusBtn) minusBtn.disabled = n <= GRID_MIN;
  if (plusBtn) plusBtn.disabled = n >= GRID_MAX;
}
applyGridSize(GRID_DEFAULT);

restRef.child('floorplan/gridSize').on('value', snap => {
  applyGridSize(snap.val() || GRID_DEFAULT);
});

const gridSizeMinusBtn = document.getElementById('grid-size-minus');
if (gridSizeMinusBtn) {
  gridSizeMinusBtn.addEventListener('click', () => {
    changeGridSize(Math.max(GRID_MIN, currentGridSize - GRID_STEP));
  });
}
const gridSizePlusBtn = document.getElementById('grid-size-plus');
if (gridSizePlusBtn) {
  gridSizePlusBtn.addEventListener('click', () => {
    changeGridSize(Math.min(GRID_MAX, currentGridSize + GRID_STEP));
  });
}

// Past de opgeslagen grootte van alle gebieden proportioneel aan zodat er, relatief
// gezien, precies zoveel tafels in een gebied blijven passen als voorheen: als de
// vierkantjes kleiner worden (meer vierkantjes), krimpen de gebieden mee in dezelfde
// verhouding als de tafels. De linkerbovenhoek van een gebied blijft vast. Tafels die
// binnen een gebied liggen, verschuiven mee op exact dezelfde relatieve plek in dat
// gebied, zodat ze nooit over de rand heen schuiven.
function changeGridSize(nextN) {
  if (nextN === currentGridSize) return;
  const ratio = currentGridSize / nextN;
  const updates = { 'floorplan/gridSize': nextN };
  const oldAreas = AREAS_STATE;
  const appliedRatios = {}; // id -> { rw, rh } (de werkelijk toegepaste verhouding, na begrenzing aan de rand van de plattegrond)

  Object.entries(oldAreas).forEach(([id, area]) => {
    const maxW = Math.max(3, 100 - area.x);
    const maxH = Math.max(3, 100 - area.y);
    const newW = Math.max(3, Math.min(area.w * ratio, maxW));
    const newH = Math.max(3, Math.min(area.h * ratio, maxH));
    updates['floorplan/areas/' + id + '/w'] = newW;
    updates['floorplan/areas/' + id + '/h'] = newH;
    appliedRatios[id] = { rw: newW / area.w, rh: newH / area.h };
  });

  Object.entries(TABLES_STATE).forEach(([tid, table]) => {
    const entry = Object.entries(oldAreas).find(([, a]) =>
      table.x >= a.x && table.x <= a.x + a.w && table.y >= a.y && table.y <= a.y + a.h
    );
    if (!entry) return;
    const [areaId, area] = entry;
    const r = appliedRatios[areaId];
    const newX = area.x + (table.x - area.x) * r.rw;
    const newY = area.y + (table.y - area.y) * r.rh;
    updates['floorplan/tables/' + tid + '/x'] = Math.max(0, Math.min(100, newX));
    updates['floorplan/tables/' + tid + '/y'] = Math.max(0, Math.min(100, newY));
  });

  restRef.update(updates);
}

restRef.child('floorplan/areas').on('value', snap => {
  AREAS_STATE = snap.val() || {};
  renderEditCanvas();
  renderOrderCanvas();
});
restRef.child('floorplan/tables').on('value', snap => {
  TABLES_STATE = snap.val() || {};
  renderEditCanvas();
  renderOrderCanvas();
});

// ---- Actieve tafel-status (bezet = heeft open bestelling) ----
let ACTIEVE_TAFELS = new Set(); // table numbers met status nieuw of klaar

function herbereken_actieve_tafels() {
  // Een tafel is bezet zolang er nog niet-afgerekende bestellingen voor die tafel bestaan
  // (in welke keukenstatus dan ook). Zodra is afgerekend, verdwijnt de bestelling uit
  // ALLE_ORDERS (verplaatst naar de historie), dus dan is de tafel automatisch weer vrij.
  ACTIEVE_TAFELS = new Set();
  Object.values(ALLE_ORDERS).forEach(o => ACTIEVE_TAFELS.add(o.tableNumber));
  renderOrderCanvas();
}

// ---- Canvas renderen (algemene functie) ----
function renderCanvas(canvasEl, { editable, onTableClick }) {
  canvasEl.innerHTML = '';

  Object.entries(AREAS_STATE).forEach(([id, area]) => {
    const el = document.createElement('div');
    el.className = 'fp-area';
    el.style.left = area.x + '%';
    el.style.top = area.y + '%';
    el.style.width = area.w + '%';
    el.style.height = area.h + '%';
    el.innerHTML = `<div class="fp-area-label">${escapeHtml(area.name)}</div>`;
    if (editable) {
      el.dataset.type = 'area';
      el.dataset.id = id;
      // Twee sleepgrepen: linksboven én rechtsonder, zodat een gebied aan beide
      // kanten vergroot/verkleind kan worden (niet alleen naar rechtsonder toe).
      const handleTl = document.createElement('div');
      handleTl.className = 'fp-resize-handle tl';
      handleTl.dataset.corner = 'tl';
      el.appendChild(handleTl);
      const handleBr = document.createElement('div');
      handleBr.className = 'fp-resize-handle br';
      handleBr.dataset.corner = 'br';
      el.appendChild(handleBr);
    }
    canvasEl.appendChild(el);
  });

  Object.entries(TABLES_STATE).forEach(([id, table]) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'fp-table';
    if (!editable && ACTIEVE_TAFELS.has(table.number)) el.classList.add('bezet');
    el.style.left = table.x + '%';
    el.style.top = table.y + '%';
    el.textContent = table.number;
    if (editable) {
      el.dataset.type = 'table';
      el.dataset.id = id;
    } else if (onTableClick) {
      el.addEventListener('click', () => onTableClick(table));
    }
    canvasEl.appendChild(el);
  });
}

function renderOrderCanvas() {
  const canvas = document.getElementById('order-canvas');
  renderCanvas(canvas, { editable: false, onTableClick: (table) => handleTableClick(table) });
  document.getElementById('order-no-tables').style.display =
    Object.keys(TABLES_STATE).length === 0 ? 'block' : 'none';
}

// ---- Klik op tafel: kies tussen bestelling opnemen of bestelde dingen bekijken ----
function tableOrders(number) {
  return Object.entries(ALLE_ORDERS).filter(([, o]) => o.tableNumber === number);
}

function handleTableClick(table) {
  if (tableOrders(table.number).length === 0) {
    openOrderModalForTable(table);
    return;
  }
  window.pendingChoiceTable = table;
  document.getElementById('table-choice-title').textContent = `Tafel ${table.number}`;
  openModal('modal-table-choice');
}

document.getElementById('choice-new-order').addEventListener('click', () => {
  closeModal('modal-table-choice');
  openOrderModalForTable(window.pendingChoiceTable);
});
document.getElementById('choice-view-bill').addEventListener('click', () => {
  closeModal('modal-table-choice');
  openBillModal(window.pendingChoiceTable);
});

function renderEditCanvas() {
  const canvas = document.getElementById('edit-canvas');
  renderCanvas(canvas, { editable: true });
  attachEditHandlers();
}

// ==================== Plattegrond bewerken (Instellingen) ====================
const editCanvas = document.getElementById('edit-canvas');
let pendingMode = null; // null | 'area-corner1' | 'area-corner2' | 'table'
let areaCorner1 = null;
let deleteMode = false;
const fpHint = document.getElementById('fp-hint');
const defaultHint = fpHint.textContent;

document.getElementById('tool-add-area').addEventListener('click', () => {
  deleteMode = false;
  document.getElementById('tool-delete').classList.remove('active');
  pendingMode = 'area-corner1';
  areaCorner1 = null;
  fpHint.textContent = 'Klik op de plattegrond om de eerste hoek van het gebied te plaatsen.';
});

document.getElementById('tool-add-table').addEventListener('click', () => {
  deleteMode = false;
  document.getElementById('tool-delete').classList.remove('active');
  pendingMode = 'table';
  fpHint.textContent = 'Klik op de plattegrond om een tafel te plaatsen.';
});

document.getElementById('tool-delete').addEventListener('click', (e) => {
  deleteMode = !deleteMode;
  pendingMode = null;
  e.target.classList.toggle('active', deleteMode);
  fpHint.textContent = deleteMode ? 'Klik op een tafel of gebied om het te verwijderen.' : defaultHint;
});

function getPercentPos(clientX, clientY) {
  const rect = editCanvas.getBoundingClientRect();
  let x = ((clientX - rect.left) / rect.width) * 100;
  let y = ((clientY - rect.top) / rect.height) * 100;
  x = Math.max(0, Math.min(100, x));
  y = Math.max(0, Math.min(100, y));
  return { x, y };
}

editCanvas.addEventListener('click', (e) => {
  // Zodra we in een plaatsingsmodus zitten, telt elke klik binnen de plattegrond (ook
  // bovenop een bestaand gebied/tafel) als plaatsing — sleep-handlers slaan zichzelf
  // in die modus over (zie onDragStart), dus hier is geen speciale e.target-check nodig.
  if (pendingMode === 'area-corner1') {
    areaCorner1 = getPercentPos(e.clientX, e.clientY);
    pendingMode = 'area-corner2';
    fpHint.textContent = 'Klik nu op de andere hoek om het gebied af te maken.';
    return;
  }
  if (pendingMode === 'area-corner2') {
    const corner2 = getPercentPos(e.clientX, e.clientY);
    const x = Math.min(areaCorner1.x, corner2.x);
    const y = Math.min(areaCorner1.y, corner2.y);
    const w = Math.max(6, Math.abs(corner2.x - areaCorner1.x));
    const h = Math.max(6, Math.abs(corner2.y - areaCorner1.y));
    pendingMode = null;
    fpHint.textContent = defaultHint;
    document.getElementById('area-name-input').value = '';
    openModal('modal-area-name');
    window.pendingAreaRect = { x, y, w, h };
    return;
  }
  if (pendingMode === 'table') {
    const pos = getPercentPos(e.clientX, e.clientY);
    pendingMode = null;
    fpHint.textContent = defaultHint;
    document.getElementById('table-number-input').value = '';
    document.getElementById('table-number-error').textContent = '';
    window.pendingTablePos = pos;
    openModal('modal-table-number');
    return;
  }
});

document.getElementById('area-name-confirm').addEventListener('click', () => {
  const naam = document.getElementById('area-name-input').value.trim();
  if (!naam) return;
  const rect = window.pendingAreaRect;
  restRef.child('floorplan/areas').push({ name: naam, ...rect });
  closeModal('modal-area-name');
});

document.getElementById('table-number-confirm').addEventListener('click', () => {
  const raw = document.getElementById('table-number-input').value.trim();
  const errorEl = document.getElementById('table-number-error');
  if (!raw) { errorEl.textContent = 'Vul een tafelnummer in.'; return; }
  const nummer = Number(raw);
  if (isNaN(nummer) || nummer <= 0) { errorEl.textContent = 'Ongeldig nummer.'; return; }
  const bestaatAl = Object.values(TABLES_STATE).some(t => t.number === nummer);
  if (bestaatAl) { errorEl.textContent = 'Dit tafelnummer bestaat al.'; return; }

  const pos = window.pendingTablePos;
  restRef.child('floorplan/tables').push({ number: nummer, x: pos.x, y: pos.y });
  closeModal('modal-table-number');
});

// ---- Slepen (verplaatsen) en resizen ----
function attachEditHandlers() {
  if (!isOwner) return;
  editCanvas.querySelectorAll('.fp-table, .fp-area').forEach(el => {
    el.addEventListener('pointerdown', onDragStart);
  });
  editCanvas.querySelectorAll('.fp-resize-handle').forEach(handle => {
    handle.addEventListener('pointerdown', onResizeStart);
  });
}

function onDragStart(e) {
  if (pendingMode) return; // laat de klik doorgaan naar het plaatsen van een nieuw gebied/tafel
  if (e.target.classList.contains('fp-resize-handle')) return;
  const el = e.currentTarget;
  const type = el.dataset.type;
  const id = el.dataset.id;

  if (deleteMode) {
    e.stopPropagation();
    const label = type === 'table' ? `tafel ${TABLES_STATE[id].number}` : `gebied "${AREAS_STATE[id].name}"`;
    if (confirm(`Weet je zeker dat je ${label} wilt verwijderen?`)) {
      restRef.child('floorplan/' + (type === 'table' ? 'tables' : 'areas') + '/' + id).remove();
    }
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  el.setPointerCapture(e.pointerId);

  // Onthoud waar precies gepakt werd t.o.v. de linkerbovenhoek, zodat het element
  // niet ineens onder de cursor "springt" bij het eerste contact.
  const startData = type === 'table' ? TABLES_STATE[id] : AREAS_STATE[id];
  const grabPos = getPercentPos(e.clientX, e.clientY);
  const offsetX = grabPos.x - startData.x;
  const offsetY = grabPos.y - startData.y;

  const move = (ev) => {
    const pos = getPercentPos(ev.clientX, ev.clientY);
    el.style.left = Math.max(0, Math.min(100, pos.x - offsetX)) + '%';
    el.style.top = Math.max(0, Math.min(100, pos.y - offsetY)) + '%';
  };
  const up = (ev) => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    const pos = getPercentPos(ev.clientX, ev.clientY);
    const path = type === 'table' ? 'tables' : 'areas';
    restRef.child('floorplan/' + path + '/' + id).update({
      x: Math.max(0, Math.min(100, pos.x - offsetX)),
      y: Math.max(0, Math.min(100, pos.y - offsetY))
    });
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
}

function onResizeStart(e) {
  if (pendingMode) return;
  e.preventDefault();
  e.stopPropagation();
  const handle = e.currentTarget;
  const corner = handle.dataset.corner; // 'tl' of 'br'
  const areaEl = handle.parentElement;
  const id = areaEl.dataset.id;
  handle.setPointerCapture(e.pointerId);

  // De hoek tegenover de sleepgreep blijft vast op zijn plek tijdens het slepen.
  const start = AREAS_STATE[id];
  const fixedRight = start.x + start.w;
  const fixedBottom = start.y + start.h;

  function computeRect(pos) {
    if (corner === 'tl') {
      const x = Math.max(0, Math.min(pos.x, fixedRight - 6));
      const y = Math.max(0, Math.min(pos.y, fixedBottom - 6));
      return { x, y, w: fixedRight - x, h: fixedBottom - y };
    }
    // 'br': linkerbovenhoek blijft vast, zoals voorheen
    const w = Math.max(6, pos.x - start.x);
    const h = Math.max(6, pos.y - start.y);
    return { x: start.x, y: start.y, w, h };
  }

  const move = (ev) => {
    const pos = getPercentPos(ev.clientX, ev.clientY);
    const r = computeRect(pos);
    areaEl.style.left = r.x + '%';
    areaEl.style.top = r.y + '%';
    areaEl.style.width = r.w + '%';
    areaEl.style.height = r.h + '%';
  };
  const up = (ev) => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    const pos = getPercentPos(ev.clientX, ev.clientY);
    const r = computeRect(pos);
    restRef.child('floorplan/areas/' + id).update(r);
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
}

// ==================== Bestellen: tafel -> producten kiezen ====================
let currentOrderTable = null;
let orderCounts = {};      // key -> aantal
let orderIceChoices = {};  // key -> array van 'met'/'zonder'
let stockStatus = {};      // key -> uitverkocht?

restRef.child('stock').on('value', snap => {
  stockStatus = snap.val() || {};
  renderOrderModalIfOpen();
});

function openOrderModalForTable(table) {
  currentOrderTable = table;
  orderCounts = {};
  orderIceChoices = {};
  productList().forEach(p => { orderCounts[p.key] = 0; orderIceChoices[p.key] = []; });
  document.getElementById('order-modal-title').textContent = `Tafel ${table.number}`;
  document.getElementById('order-note').value = '';
  document.getElementById('order-error').textContent = '';
  renderOrderProducts();
  openModal('modal-order');
}

function renderOrderModalIfOpen() {
  if (document.getElementById('modal-order').classList.contains('open')) {
    renderOrderProducts();
  }
}

function renderOrderProducts() {
  const container = document.getElementById('order-products');
  const items = productList();
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-msg">Nog geen producten ingesteld. Voeg producten toe via Instellingen.</div>';
    return;
  }
  container.innerHTML = '';
  items.forEach(p => {
    if (orderCounts[p.key] === undefined) { orderCounts[p.key] = 0; orderIceChoices[p.key] = []; }
    const isOut = !!stockStatus[p.key];
    const card = document.createElement('div');
    card.className = 'product-card' + (isOut ? ' out-of-stock' : '');
    card.id = `order-card-${p.key}`;
    card.innerHTML = `
      <div class="name"><span class="menu-name-text">${p.emoji} ${escapeHtml(p.label)}</span><span class="menu-dots"></span><span class="price-tag">${formatPrice(p.price)}</span></div>
      <div class="product-row-main">
        <div class="stepper">
          <button type="button" class="min-btn" data-key="${p.key}" ${isOut ? 'disabled' : ''}>−</button>
          <span class="count" id="order-${p.key}-count">${orderCounts[p.key]}</span>
          <button type="button" class="plus-btn" data-key="${p.key}" ${isOut ? 'disabled' : ''}>+</button>
        </div>
        ${isOut ? '<span class="uitverkocht-tag">Uitverkocht</span>' : ''}
      </div>
      <div class="ice-toggles" id="order-ice-${p.key}"></div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.plus-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      orderCounts[key]++;
      document.getElementById(`order-${key}-count`).textContent = orderCounts[key];
      renderOrderIceToggles(key);
    });
  });
  container.querySelectorAll('.min-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (orderCounts[key] > 0) orderCounts[key]--;
      document.getElementById(`order-${key}-count`).textContent = orderCounts[key];
      renderOrderIceToggles(key);
    });
  });

  items.forEach(p => renderOrderIceToggles(p.key));
}

function renderOrderIceToggles(key) {
  const p = PRODUCTS_STATE[key];
  const container = document.getElementById(`order-ice-${key}`);
  if (!container) return;
  container.innerHTML = '';
  if (!p || !p.ice) return;

  const n = orderCounts[key] || 0;
  if (!orderIceChoices[key]) orderIceChoices[key] = [];
  while (orderIceChoices[key].length < n) orderIceChoices[key].push('zonder');
  while (orderIceChoices[key].length > n) orderIceChoices[key].pop();

  orderIceChoices[key].forEach((choice, i) => {
    const nummer = n > 1 ? `#${i + 1} ` : '';
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'ice-chip' + (choice === 'met' ? ' met' : '');
    chip.textContent = `${nummer}${choice === 'met' ? '🧊 Met ijs' : '🚫 Zonder ijs'}`;
    chip.addEventListener('click', () => {
      orderIceChoices[key][i] = orderIceChoices[key][i] === 'met' ? 'zonder' : 'met';
      renderOrderIceToggles(key);
    });
    container.appendChild(chip);
  });
}

document.getElementById('order-confirm').addEventListener('click', () => {
  const errorEl = document.getElementById('order-error');
  const items = {};
  Object.entries(orderCounts).forEach(([key, aantal]) => {
    if (aantal > 0 && !stockStatus[key]) items[key] = aantal;
  });
  if (Object.keys(items).length === 0) {
    errorEl.textContent = 'Kies eerst iets.';
    return;
  }

  const ijsKeuzes = {};
  Object.keys(items).forEach(key => {
    if (orderIceChoices[key] && orderIceChoices[key].length > 0) {
      ijsKeuzes[key] = orderIceChoices[key].slice();
    }
  });

  const orderData = {
    tableNumber: currentOrderTable.number,
    items: items,
    status: 'nieuw',
    tijd: Date.now()
  };
  const opmerking = document.getElementById('order-note').value.trim();
  if (opmerking) orderData.opmerking = opmerking;
  if (Object.keys(ijsKeuzes).length > 0) orderData.ijsKeuzes = ijsKeuzes;

  restRef.child('orders').push().set(orderData).then(() => {
    closeModal('modal-order');
  }).catch(err => {
    console.error(err);
    errorEl.textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});

// ==================== Rekening & betalen ====================
function openBillModal(table) {
  window.currentBillTable = table;
  document.getElementById('bill-modal-title').textContent = `Rekening — Tafel ${table.number}`;
  document.getElementById('bill-error').textContent = '';
  document.getElementById('bill-confirm').style.display = 'none';
  document.getElementById('bill-pay-btn').style.display = '';

  const orders = tableOrders(table.number);
  const merged = {}; // key -> aantal
  orders.forEach(([, order]) => {
    Object.entries(order.items || {}).forEach(([key, aantal]) => {
      merged[key] = (merged[key] || 0) + aantal;
    });
  });

  const container = document.getElementById('bill-items');
  container.innerHTML = '';
  let total = 0;
  const keys = Object.keys(merged);
  if (keys.length === 0) {
    container.innerHTML = '<div class="empty-msg">Geen openstaande bestellingen.</div>';
  } else {
    keys.forEach(key => {
      const p = PRODUCTS_STATE[key];
      const aantal = merged[key];
      const label = p ? p.label : '(verwijderd product)';
      const prijs = p ? p.price : 0;
      total += prijs * aantal;
      const row = document.createElement('div');
      row.className = 'settings-product-row';
      row.innerHTML = `
        <div class="settings-product-main">
          <span class="settings-product-emoji">${p ? p.emoji : '❓'}</span>
          <span class="settings-product-name">${aantal}x ${escapeHtml(label)}</span>
        </div>
        <span class="settings-product-price">${formatPrice(prijs * aantal)}</span>
      `;
      container.appendChild(row);
    });
  }

  window.currentBillTotal = total;
  document.getElementById('bill-total').textContent = `Totaal: ${formatPrice(total)}`;
  openModal('modal-bill');
}

document.getElementById('bill-pay-btn').addEventListener('click', () => {
  document.getElementById('bill-confirm-amount').textContent = formatPrice(window.currentBillTotal || 0);
  document.getElementById('bill-confirm-table').textContent = window.currentBillTable.number;
  document.getElementById('bill-confirm').style.display = 'block';
  document.getElementById('bill-pay-btn').style.display = 'none';
});
document.getElementById('bill-pay-cancel').addEventListener('click', () => {
  document.getElementById('bill-confirm').style.display = 'none';
  document.getElementById('bill-pay-btn').style.display = '';
});
document.getElementById('bill-pay-confirm').addEventListener('click', () => {
  const table = window.currentBillTable;
  const orders = tableOrders(table.number);
  const nu = Date.now();
  const updates = {};
  orders.forEach(([id, order]) => {
    updates['history/' + id] = { ...order, betaaldOp: nu };
    updates['orders/' + id] = null;
  });
  const btn = document.getElementById('bill-pay-confirm');
  btn.disabled = true;
  restRef.update(updates).then(() => {
    btn.disabled = false;
    closeModal('modal-bill');
  }).catch(err => {
    console.error(err);
    btn.disabled = false;
    document.getElementById('bill-error').textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});

// ==================== Keuken & Gereed (live orders) ====================
let ALLE_ORDERS = {}; // id -> order

function productLabel(key) {
  const p = PRODUCTS_STATE[key];
  return p ? p.label : key;
}

function itemsToLinesHtml(order) {
  return Object.entries(order.items).map(([key, aantal]) => {
    const label = productLabel(key);
    const keuzes = order.ijsKeuzes && order.ijsKeuzes[key];
    if (keuzes && keuzes.length > 0) {
      return keuzes.map(keuze => {
        const suffix = keuze === 'met' ? ' — 🧊 met ijs' : '';
        return `<div class="item-line">1x ${escapeHtml(label)}${suffix}</div>`;
      }).join('');
    }
    return `<div class="item-line">${aantal}x ${escapeHtml(label)}</div>`;
  }).join('');
}

// ---- Meldingsgeluid ----
const meldingGeluid = new Audio('melding%20geluid.mp3');
const paginaGeladenOp = Date.now();
function speelMeldingGeluid() {
  try {
    meldingGeluid.currentTime = 0;
    meldingGeluid.play().catch(() => {});
  } catch (e) { /* geluid niet beschikbaar */ }
}

function renderOrderCardHtml(id, order, actionHtml) {
  const noteHtml = order.opmerking ? `<div class="note-line">"${escapeHtml(order.opmerking)}"</div>` : '';
  return `
    <div class="table-badge">🪑 Tafel ${order.tableNumber}</div>
    <div class="items-block">${itemsToLinesHtml(order)}</div>
    ${noteHtml}
    <div class="time-line">Binnengekomen om ${formatTime(order.tijd)}</div>
    ${actionHtml}
  `;
}

function renderKitchen() {
  const nieuwList = document.getElementById('kitchen-list-nieuw');
  const bereidenList = document.getElementById('kitchen-list-bereiden');
  const kitchenCount = document.getElementById('kitchen-count');

  const nieuw = Object.entries(ALLE_ORDERS).filter(([, o]) => o.status === 'nieuw').sort((a, b) => a[1].tijd - b[1].tijd);
  const bereiden = Object.entries(ALLE_ORDERS).filter(([, o]) => o.status === 'bereiden').sort((a, b) => a[1].tijd - b[1].tijd);

  kitchenCount.textContent = (nieuw.length === 0 && bereiden.length === 0)
    ? 'Nieuwe bestellingen worden hier automatisch getoond.'
    : `${nieuw.length} nieuw · ${bereiden.length} in bereiding`;

  if (nieuw.length === 0) {
    nieuwList.innerHTML = '<div class="empty-msg">Nog geen nieuwe bestellingen</div>';
  } else {
    nieuwList.innerHTML = '';
    nieuw.forEach(([id, order]) => {
      const card = document.createElement('div');
      card.className = 'order-card nieuw';
      card.innerHTML = renderOrderCardHtml(id, order, `<div class="actions"><button class="chip-btn prepare" data-id="${id}">Start bereiden</button></div>`);
      nieuwList.appendChild(card);
    });
    nieuwList.querySelectorAll('.chip-btn.prepare').forEach(btn => {
      btn.addEventListener('click', () => {
        restRef.child('orders/' + btn.dataset.id + '/status').set('bereiden');
      });
    });
  }

  if (bereiden.length === 0) {
    bereidenList.innerHTML = '<div class="empty-msg">Nog niets in bereiding</div>';
  } else {
    bereidenList.innerHTML = '';
    bereiden.forEach(([id, order]) => {
      const card = document.createElement('div');
      card.className = 'order-card bereiden';
      card.innerHTML = renderOrderCardHtml(id, order, `<div class="actions"><button class="chip-btn ready" data-id="${id}">Klaar</button></div>`);
      bereidenList.appendChild(card);
    });
    bereidenList.querySelectorAll('.chip-btn.ready').forEach(btn => {
      btn.addEventListener('click', () => {
        restRef.child('orders/' + btn.dataset.id + '/status').set('klaar');
      });
    });
  }
}

function renderReady() {
  const readyList = document.getElementById('ready-list');
  const readyCount = document.getElementById('ready-count');

  const klaar = Object.entries(ALLE_ORDERS).filter(([, o]) => o.status === 'klaar').sort((a, b) => a[1].tijd - b[1].tijd);

  if (klaar.length === 0) {
    readyList.innerHTML = '<div class="empty-msg">Geen klaargemaakte bestellingen</div>';
    readyCount.textContent = 'Klaargemaakte bestellingen wachtend op bezorging.';
    return;
  }
  readyCount.textContent = `${klaar.length} klaar voor bezorging`;
  readyList.innerHTML = '';

  klaar.forEach(([id, order]) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = renderOrderCardHtml(id, order, `<div class="actions"><button class="chip-btn delivered" data-id="${id}">Bezorgd</button></div>`);
    readyList.appendChild(card);
  });

  readyList.querySelectorAll('.chip-btn.delivered').forEach(btn => {
    btn.addEventListener('click', () => {
      // Bezorgd, maar nog niet afgerekend: blijft meetellen op de rekening van de tafel
      // totdat er via "Bestelde dingen" -> "Betalen" wordt afgerekend.
      restRef.child('orders/' + btn.dataset.id + '/status').set('bezorgd');
    });
  });
}

// ==================== Historie (afgerekende bestellingen, alle tafels) ====================
let HISTORY_STATE = {};

restRef.child('history').on('value', snap => {
  HISTORY_STATE = snap.val() || {};
  renderHistory();
});

function renderHistory() {
  const list = document.getElementById('history-list');
  const countEl = document.getElementById('history-count');
  const summaryEl = document.getElementById('history-summary');

  const entries = Object.entries(HISTORY_STATE).sort((a, b) => (b[1].betaaldOp || b[1].tijd || 0) - (a[1].betaaldOp || a[1].tijd || 0));

  if (entries.length === 0) {
    list.innerHTML = '<div class="empty-msg">Nog geen historie</div>';
    countEl.textContent = 'Alle afgerekende bestellingen verschijnen hier.';
    summaryEl.innerHTML = '';
    return;
  }

  countEl.textContent = `${entries.length} afgerekende bestelling${entries.length === 1 ? '' : 'en'}`;
  list.innerHTML = '';
  let totaalOmzet = 0;
  const perProduct = {};

  entries.forEach(([id, order]) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    const noteHtml = order.opmerking ? `<div class="note-line">"${escapeHtml(order.opmerking)}"</div>` : '';
    const betaaldHtml = order.betaaldOp ? ` · betaald om ${formatTime(order.betaaldOp)}` : '';
    card.innerHTML = `
      <div class="table-badge">🪑 Tafel ${order.tableNumber}</div>
      <div class="items-block">${itemsToLinesHtml(order)}</div>
      ${noteHtml}
      <div class="time-line">Besteld om ${formatTime(order.tijd)}${betaaldHtml}</div>
    `;
    list.appendChild(card);

    Object.entries(order.items || {}).forEach(([key, aantal]) => {
      const p = PRODUCTS_STATE[key];
      const prijs = p ? p.price : 0;
      totaalOmzet += prijs * aantal;
      if (!perProduct[key]) perProduct[key] = { label: p ? p.label : '(verwijderd product)', aantal: 0 };
      perProduct[key].aantal += aantal;
    });
  });

  let summaryHtml = `<div class="history-summary-title">Totaaloverzicht</div>`;
  Object.values(perProduct).sort((a, b) => b.aantal - a.aantal).forEach(p => {
    summaryHtml += `<div class="history-summary-row"><span>${escapeHtml(p.label)}</span><span>${p.aantal}x</span></div>`;
  });
  summaryHtml += `<div class="history-summary-row"><span>Totale omzet</span><span>${formatPrice(totaalOmzet)}</span></div>`;
  summaryEl.innerHTML = summaryHtml;
}

document.getElementById('btn-reset-history').addEventListener('click', () => {
  if (!confirm('Weet je zeker dat je de hele historie wilt wissen? Dit kan niet ongedaan worden gemaakt.')) return;
  restRef.child('history').remove();
});

const ordersRef = restRef.child('orders');

ordersRef.on('child_added', snap => {
  const order = snap.val();
  const isNew = order.status === 'nieuw' && order.tijd && order.tijd > paginaGeladenOp && !ALLE_ORDERS[snap.key];
  ALLE_ORDERS[snap.key] = order;
  renderKitchen();
  renderReady();
  herbereken_actieve_tafels();
  if (isNew && activeTab === 'keuken') speelMeldingGeluid();
});
ordersRef.on('child_changed', snap => {
  const vorige = ALLE_ORDERS[snap.key];
  const nieuwe = snap.val();
  const werdKlaar = vorige && vorige.status !== 'klaar' && nieuwe.status === 'klaar';
  ALLE_ORDERS[snap.key] = nieuwe;
  renderKitchen();
  renderReady();
  herbereken_actieve_tafels();
  if (werdKlaar && activeTab === 'gereed') speelMeldingGeluid();
});
ordersRef.on('child_removed', snap => {
  delete ALLE_ORDERS[snap.key];
  renderKitchen();
  renderReady();
  herbereken_actieve_tafels();
});
