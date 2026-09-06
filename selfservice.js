const params = new URLSearchParams(location.search);
const restaurantId = params.get('id');
const errorEl = document.getElementById('error');
const appEl = document.getElementById('app');

if (!restaurantId) {
  errorEl.textContent = 'Deze zelfservice-link is ongeldig.';
  throw new Error('Missing restaurant id');
}

const restRef = db.ref('restaurants/' + restaurantId);
const DEVICE_KEY = 'zelfserviceDeviceId';
let deviceId = localStorage.getItem(DEVICE_KEY);
if (!deviceId) {
  deviceId = 'd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem(DEVICE_KEY, deviceId);
}

let PRODUCTS = {};
let TABLES = {};
let STOCK = {};
let STOCK_OPTIONS = {};
let CATEGORIES = {};
let SERVICES = {};
let myOrders = {};
let selectedTable = null;
let selectedServiceTable = null;
let counts = {};
let optionsByProduct = {};
let allOrders = {};

function esc(v) {
  const d = document.createElement('div');
  d.textContent = v == null ? '' : String(v);
  return d.innerHTML;
}
function money(n) { return '€ ' + Number(n || 0).toFixed(2).replace('.', ','); }
function optionsFor(p) {
  // Alleen opmerkingen die voor dit product daadwerkelijk in Instellingen
  // zijn opgeslagen. Geen automatisch bedachte/ingebouwde opmerkingen.
  if (!Array.isArray(p?.opties)) return [];
  return p.opties.filter(o => {
    const label = typeof o === 'string' ? o : o?.label;
    return typeof label === 'string' && label.trim().length > 0;
  });
}

function mix(hex, target, amt) {
  if (!hex || !target) return hex || target;
  const a = hex.replace('#','');
  const b = target.replace('#','');
  const ar = parseInt(a.slice(0,2),16), ag = parseInt(a.slice(2,4),16), ab = parseInt(a.slice(4,6),16);
  const br = parseInt(b.slice(0,2),16), bg = parseInt(b.slice(2,4),16), bb = parseInt(b.slice(4,6),16);
  const c = n => Math.round(n).toString(16).padStart(2,'0');
  return '#' + c(ar + (br-ar)*amt) + c(ag + (bg-ag)*amt) + c(ab + (bb-ab)*amt);
}
function relativeLuminance(hex) {
  const h = String(hex || '#171310').replace('#','');
  const rgb = [0,2,4].map(i => parseInt(h.slice(i,i+2),16)/255).map(v => v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4));
  return .2126*rgb[0] + .7152*rgb[1] + .0722*rgb[2];
}
function applyRestaurantTheme(r) {
  const root = document.documentElement.style;
  const bg = r.headerColor || '#171310';
  const isLight = relativeLuminance(bg) > .5;
  root.setProperty('--bg', bg);
  root.setProperty('--bg-elevated', mix(bg, isLight ? '#000000' : '#ffffff', .08));
  root.setProperty('--card', mix(bg, isLight ? '#000000' : '#ffffff', .16));
  root.setProperty('--line', mix(bg, isLight ? '#000000' : '#ffffff', .32));
  root.setProperty('--ink', isLight ? '#241c12' : '#f3ead9');
  root.setProperty('--muted', isLight ? '#5a4c38' : '#a99a83');
  if (r.font) { root.setProperty('--font-body', r.font); root.setProperty('--font-display', r.font); }
  else { root.removeProperty('--font-body'); root.removeProperty('--font-display'); }
  const title = document.getElementById('restaurant-name');
  if (title) {
    if (r.titleColor) { title.style.background='none'; title.style.webkitTextFillColor=r.titleColor; title.style.color=r.titleColor; }
    else { title.style.background=''; title.style.webkitTextFillColor=''; title.style.color=''; }
  }
}

restRef.on('value', snap => {
  const r = snap.val() || {};
  document.getElementById('restaurant-name').textContent = r.naam || r.name || 'Restaurant';
  applyRestaurantTheme(r);
  PRODUCTS = r.products || {};
  TABLES = r.floorplan?.tables || {};
  STOCK = r.stock || {};
  STOCK_OPTIONS = r.stockOpties || {};
  CATEGORIES = r.categories || {};
  SERVICES = r.services || {};
  renderTables();
  renderServiceTables();
  renderServices();
  renderProducts();
  renderMine();
  appEl.classList.remove('selfservice-hidden');
}, err => {
  errorEl.textContent = 'Het restaurant kon niet worden geladen.';
  console.error(err);
});

function renderTables() {
  const el = document.getElementById('tables');
  // Zowel tafels als banken zijn plekken waar je kunt bestellen.
  const tables = Object.entries(TABLES).filter(([,t]) => {
    const kind = t.kind || 'tafel';
    return kind === 'tafel' || kind === 'bank';
  }).sort((a,b) => (a[1].number || 0) - (b[1].number || 0));
  el.innerHTML = tables.length ? '' : `<div class="selfservice-muted">${window.I18N ? window.I18N.t('Er zijn nog geen tafels ingesteld.') : 'Er zijn nog geen tafels ingesteld.'}</div>`;
  tables.forEach(([id,t]) => {
    const isBank = t.kind === 'bank';
    const b = document.createElement('button');
    b.className = 'selfservice-table' + (selectedTable === t.number ? ' active' : '');
    b.textContent = (isBank ? '🛋️ ' + (localStorage.getItem('appLanguage') === 'en' ? 'Bench ' : 'Bank ') : '🪑 ' + (localStorage.getItem('appLanguage') === 'en' ? 'Table ' : 'Tafel ')) + t.number;
    b.onclick = () => { selectedTable = (selectedTable === t.number) ? null : t.number; renderTables(); };
    el.appendChild(b);
  });
}

// ==================== Service aanvragen ====================
// Eigen, losse tafelkeuze (net als bij bestellen) zodat je niet per se al
// een tafel voor een bestelling hoeft te hebben gekozen om een service aan
// te vragen.
function renderServiceTables() {
  const el = document.getElementById('service-tables');
  if (!el) return;
  const tables = Object.entries(TABLES).filter(([,t]) => {
    const kind = t.kind || 'tafel';
    return kind === 'tafel' || kind === 'bank';
  }).sort((a,b) => (a[1].number || 0) - (b[1].number || 0));
  el.innerHTML = tables.length ? '' : `<div class="selfservice-muted">${window.I18N ? window.I18N.t('Er zijn nog geen tafels ingesteld.') : 'Er zijn nog geen tafels ingesteld.'}</div>`;
  tables.forEach(([id,t]) => {
    const isBank = t.kind === 'bank';
    const b = document.createElement('button');
    b.className = 'selfservice-table' + (selectedServiceTable === t.number ? ' active' : '');
    b.textContent = (isBank ? '🛋️ ' + (localStorage.getItem('appLanguage') === 'en' ? 'Bench ' : 'Bank ') : '🪑 ' + (localStorage.getItem('appLanguage') === 'en' ? 'Table ' : 'Tafel ')) + t.number;
    b.onclick = () => { selectedServiceTable = (selectedServiceTable === t.number) ? null : t.number; renderServiceTables(); };
    el.appendChild(b);
  });
}

function serviceList() {
  return Object.entries(SERVICES).map(([key, s]) => ({ key, ...s }));
}

function renderServices() {
  const el = document.getElementById('services');
  if (!el) return;
  const items = serviceList();
  el.innerHTML = items.length ? '' : `<div class="selfservice-muted">${window.I18N ? window.I18N.t('Dit restaurant heeft nog geen services ingesteld.') : 'Dit restaurant heeft nog geen services ingesteld.'}</div>`;
  items.forEach(s => {
    const b = document.createElement('button');
    b.className = 'selfservice-table';
    b.textContent = '🛎️ ' + s.titel;
    b.onclick = () => requestService(s);
    el.appendChild(b);
  });
}

function requestService(s) {
  const errorEl = document.getElementById('service-error');
  const confirmEl = document.getElementById('service-confirm');
  errorEl.textContent = '';
  confirmEl.style.display = 'none';
  if (!selectedServiceTable) { errorEl.textContent = window.I18N ? window.I18N.t('Kies eerst je tafel.') : 'Kies eerst je tafel.'; return; }

  const tableEntry = Object.values(TABLES).find(t => t.number === selectedServiceTable);
  const kind = tableEntry?.kind === 'bank' ? 'bank' : 'tafel';

  restRef.child('serviceRequests').push({
    tableNumber: selectedServiceTable,
    titel: s.titel,
    tijd: firebase.database.ServerValue.TIMESTAMP,
    deviceId,
    kind,
  }).then(() => {
    confirmEl.textContent = localStorage.getItem('appLanguage') === 'en' ? `✅ "${s.titel}" has been requested at table ${selectedServiceTable}. Staff will be with you shortly.` : `✅ "${s.titel}" is aangevraagd bij tafel ${selectedServiceTable}. Het personeel komt zo naar je toe.`;
    confirmEl.style.display = 'block';
  }).catch(err => {
    console.error(err);
    errorEl.textContent = localStorage.getItem('appLanguage') === 'en' ? 'The request could not be submitted, please try again.' : 'Het aanvragen is niet gelukt, probeer opnieuw.';
  });
}

// Eigen openstaande serviceaanvragen: zolang het personeel een aanvraag nog
// niet op "Gedaan" heeft gezet (in restaurant.js), blijft die hier staan met
// "Medewerker is onderweg". Zodra het personeel 'm afrondt, verdwijnt de
// aanvraag uit Firebase en daarmee automatisch ook hier.
restRef.child('serviceRequests').on('value', snap => {
  const alle = snap.val() || {};
  const mijnAanvragen = Object.entries(alle).filter(([, s]) => s.deviceId === deviceId);
  const el = document.getElementById('my-service-requests');
  if (!el) return;

  if (mijnAanvragen.length === 0) {
    el.innerHTML = `<div class="selfservice-muted">${window.I18N ? window.I18N.t('Nog geen services aangevraagd.') : 'Nog geen services aangevraagd.'}</div>`;
    return;
  }
  mijnAanvragen.sort((a, b) => (a[1].tijd || 0) - (b[1].tijd || 0));
  el.innerHTML = mijnAanvragen.map(([, s]) => `
    <div class="selfservice-my-service">
      <span class="selfservice-my-service-title">🛎️ ${esc(s.titel)} — ${(s.kind === 'bank' ? (localStorage.getItem('appLanguage') === 'en' ? 'Bench' : 'Bank') : (localStorage.getItem('appLanguage') === 'en' ? 'Table' : 'Tafel'))} ${esc(s.tableNumber)}</span>
      <span class="selfservice-my-service-status">${localStorage.getItem('appLanguage') === 'en' ? 'Staff member is on the way' : 'Medewerker is onderweg'}</span>
    </div>
  `).join('');
});

// Sorteert categorieën op plaats (1 boven, 255 onder).
function categoryList() {
  return Object.entries(CATEGORIES)
    .map(([key, c]) => ({ key, ...c }))
    .sort((a, b) => (a.plaats ?? 999) - (b.plaats ?? 999) || (a.naam || '').localeCompare(b.naam || '', 'nl'));
}

// Verdeelt de product-entries in groepen per categorie, gesorteerd op plaats.
// Producten zonder (bestaande) categorie komen in een groep "Overig" aan het
// einde. Zolang er nog geen categorieën zijn ingesteld, blijft de lijst plat.
function groupProductEntriesByCategory(entries) {
  const cats = categoryList();
  if (cats.length === 0) return [{ naam: null, entries }];
  const groups = cats.map(c => ({ key: c.key, naam: c.naam, entries: [] }));
  const overig = { key: null, naam: 'Overig', entries: [] };
  entries.forEach(([key, p]) => {
    const g = groups.find(g => g.key === p.categorie);
    (g || overig).entries.push([key, p]);
  });
  const result = groups.filter(g => g.entries.length > 0);
  if (overig.entries.length > 0) result.push(overig);
  return result;
}

function renderProducts() {
  const el = document.getElementById('products');
  const entries = Object.entries(PRODUCTS);
  el.innerHTML = '';
  if (!entries.length) { el.innerHTML = '<div class="selfservice-muted">Dit restaurant heeft nog geen producten ingesteld.</div>'; return; }

  groupProductEntriesByCategory(entries).forEach(group => {
    if (group.naam) {
      const heading = document.createElement('div');
      heading.className = 'category-heading';
      heading.textContent = group.naam;
      el.appendChild(heading);
    }
    group.entries.forEach(([key, p]) => renderProductCard(key, p, el));
  });
}

function renderProductCard(key, p, el) {
    if (counts[key] == null) counts[key] = 0;
    if (!optionsByProduct[key]) optionsByProduct[key] = [];
    const card = document.createElement('div');
    card.className = 'selfservice-product';
    const out = !!STOCK[key];
    card.innerHTML = `
      <div class="selfservice-prodtop"><div class="selfservice-product-name"><span class="selfservice-product-emoji">${esc(p.emoji || '🍽️')}</span><strong>${esc(p.label)}</strong></div><span class="selfservice-price">${money(p.price)}</span></div>
      ${out ? '<div class="selfservice-out">Uitverkocht</div>' : ''}
      <div class="selfservice-stepper">
        <button class="minus" ${out ? 'disabled' : ''}>−</button>
        <strong>${counts[key]}</strong>
        <button class="plus" ${out ? 'disabled' : ''}>+</button>
      </div>
      <div class="selfservice-option"></div>`;
    const optionEl = card.querySelector('.selfservice-option');
    const opts = optionsFor(p);
    const n = counts[key] || 0;
    if (n > 0) {
      while (optionsByProduct[key].length < n) optionsByProduct[key].push([]);
      while (optionsByProduct[key].length > n) optionsByProduct[key].pop();
      for (let i = 0; i < n; i++) {
        const row = document.createElement('div');
        row.className = 'selfservice-option-unit';
        if (n > 1) {
          const tag = document.createElement('span'); tag.className = 'selfservice-option-unit-tag'; tag.textContent = '#' + (i + 1); row.appendChild(tag);
        }
        opts.forEach(o => {
          const outOpt = !!STOCK_OPTIONS[String(o.label).toLowerCase()];
          const b = document.createElement('button');
          const selected = Array.isArray(optionsByProduct[key][i]) ? optionsByProduct[key][i].includes(o.label) : false;
          b.textContent = (selected ? '✅ ' : '') + (o.emoji ? o.emoji + ' ' : '') + o.label + (outOpt ? ' (uitverkocht)' : '');
          b.disabled = outOpt;
          b.className = 'selfservice-option-button' + (selected ? ' active' : '');
          b.onclick = () => {
            if (!Array.isArray(optionsByProduct[key][i])) optionsByProduct[key][i] = [];
            const idx = optionsByProduct[key][i].indexOf(o.label);
            if (idx >= 0) optionsByProduct[key][i].splice(idx, 1); else optionsByProduct[key][i].push(o.label);
            renderProducts();
          };
          row.appendChild(b);
        });
        optionEl.appendChild(row);
      }
    }
    card.querySelector('.minus').onclick = () => { counts[key] = Math.max(0, counts[key]-1); renderProducts(); };
    card.querySelector('.plus').onclick = () => { counts[key]++; renderProducts(); };
    el.appendChild(card);
}

function submitOrder() {
  const sendError = document.getElementById('send-error');
  sendError.textContent = '';
  if (selectedTable == null) { sendError.textContent = 'Kies eerst een tafel.'; return; }

  const items = {};
  const itemOpties = {};
  Object.entries(counts).forEach(([key,n]) => {
    if (n > 0 && !STOCK[key]) {
      items[key] = n;
      const opts = optionsByProduct[key] || [];
      if (opts.some(x => Array.isArray(x) && x.length)) itemOpties[key] = opts.map(x => Array.isArray(x) ? x.slice() : []);
    }
  });
  if (!Object.keys(items).length) { sendError.textContent = 'Kies eerst minstens één product.'; return; }

  const note = document.getElementById('note').value.trim();

  // Splits de bestelling op in een keuken- en een bar-deel, op basis van de
  // bestemming die is ingesteld bij elk product (Instellingen -> Producten).
  // Zo komt bijv. de frisdrank meteen bij de bar terecht en het eten bij de
  // keuken, ook al is het in één keer besteld.
  const groepen = { keuken: { items: {}, itemOpties: {} }, bar: { items: {}, itemOpties: {} } };
  Object.entries(items).forEach(([key, aantal]) => {
    const p = PRODUCTS[key];
    const bestemming = (p && p.bestemming === 'bar') ? 'bar' : 'keuken';
    groepen[bestemming].items[key] = aantal;
    if (itemOpties[key]) groepen[bestemming].itemOpties[key] = itemOpties[key];
  });

  const nu = Date.now();
  const bestemmingen = ['keuken', 'bar'].filter(b => Object.keys(groepen[b].items).length > 0);
  // Alleen een gedeelde groupId nodig als de bestelling écht in meerdere
  // tickets wordt opgesplitst; zo telt de wachtrijpositie hierna dit als één
  // bestelling in plaats van als twee (of meer).
  const groupId = bestemmingen.length > 1 ? restRef.child('orders').push().key : null;
  const updates = {};
  bestemmingen.forEach(bestemming => {
    const groepItems = groepen[bestemming].items;
    const id = restRef.child('orders').push().key;
    const order = {
      tableNumber: selectedTable,
      items: groepItems,
      status: 'nieuw',
      tijd: nu,
      deviceId
    };
    if (note) order.opmerking = note;
    if (Object.keys(groepen[bestemming].itemOpties).length) order.itemOpties = groepen[bestemming].itemOpties;
    if (groupId) order.orderGroupId = groupId;
    updates['orders/' + id] = order;
  });

  document.getElementById('send').disabled = true;
  restRef.update(updates).then(() => {
    // Bewust NIET de aantallen/opmerkingen resetten: als je nog een bestelling
    // plaatst, blijft staan wat je al had aangeklikt (bijv. handig als je
    // meteen nog een rondje van hetzelfde wilt bestellen).
    document.getElementById('note').value = '';
    document.getElementById('tab-mine').click();
  }).catch(err => {
    console.error(err);
    sendError.textContent = 'De bestelling kon niet worden verzonden.';
  }).finally(() => document.getElementById('send').disabled = false);
}
document.getElementById('send').onclick = submitOrder;

const ordersRef = restRef.child('orders');
ordersRef.on('value', snap => {
  const all = snap.val() || {};
  allOrders = all;
  myOrders = Object.fromEntries(Object.entries(all).filter(([,o]) => o && o.deviceId === deviceId));
  renderMine();
});

function statusInfo(order) {
  const status = order.status;
  if (status === 'nieuw') return { label:'Ontvangen', pct:25, key:'nieuw' };
  if (status === 'bereiden') return { label:'Wordt bereid', pct:55, key:'bereiden' };
  if (status === 'klaar') return { label:'Klaar', pct:80, key:'klaar' };
  if (status === 'bezorgd') return { label:'Bezorgd / geserveerd', pct:100, key:'bezorgd' };
  return { label:status || 'Onbekend', pct:10, key:status };
}

function isWaitingForService(order) {
  // "klaar" betekent: klaar in de keuken maar nog niet bezorgd/geserveerd.
  // De klant moet zijn wachtrijpositie dus ook in deze fase blijven zien.
  return !!order && ['nieuw', 'bereiden', 'klaar'].includes(order.status);
}

// Een ticket bevat na het opsplitsen in submitOrder altijd producten van
// precies één bestemming (bar of keuken), dus het eerste item bepaalt de
// bestemming van het hele ticket.
function orderBestemming(order) {
  const keys = Object.keys(order?.items || {});
  for (const key of keys) {
    const p = PRODUCTS[key];
    if (p && p.bestemming === 'bar') return 'bar';
  }
  return 'keuken';
}

function positionBefore(id, order) {
  if (!isWaitingForService(order)) return 0;

  const phase = order.status;
  const bestemming = orderBestemming(order);

  // In Ontvangen en Wordt bereid tellen bar en keuken apart (een bar-ticket
  // telt alleen andere bar-tickets voor zich, een keuken-ticket alleen
  // andere keuken-tickets). Alleen in Klaar worden bar + keuken weer samen
  // geteld als één wachtrij.
  //
  // Let op: we sorteren hier bewust op de Firebase push-id en niet op het
  // veld 'tijd'. Keuken- en bar-tickets van dezelfde bestelling krijgen
  // namelijk exact dezelfde 'tijd' (ze worden in één klik aangemaakt), dus
  // met 'tijd' zouden ze elkaar niet meetellen en dezelfde (verkeerde)
  // positie tonen. Push-id's zijn altijd strikt oplopend in aanmaakvolgorde,
  // ook binnen dezelfde milliseconde, dus daarmee ontstaat geen gelijkstand.
  return Object.entries(allOrders).filter(([oid, o]) => {
    if (oid === id || !o || o.status !== phase) return false;
    if (phase !== 'klaar' && orderBestemming(o) !== bestemming) return false;
    return oid < id;
  }).length;
}

function queueMessage(id, order) {
  if (!isWaitingForService(order)) return '';
  const before = positionBefore(id, order);
  if (before === 0) return 'Je bestelling is aan de beurt.';
  if (before === 1) return 'Nog 1 bestelling voor jou in deze fase.';
  return `Nog ${before} bestellingen voor jou in deze fase.`;
}

function itemText(order) {
  return Object.entries(order.items || {}).map(([key,n]) => {
    const p = PRODUCTS[key];
    const label = p ? p.label : '(verwijderd product)';
    const opts = order.itemOpties?.[key] || [];
    const ice = order.itemIce?.[key] || [];
    const parts = [];
    const optFlat = opts.flat?.() || [];
    if (optFlat.length) parts.push(optFlat.join(', '));
    const iceFlags = Array.isArray(ice) ? ice.slice(0, n).map(Boolean) : [];
    const iceCount = iceFlags.filter(Boolean).length;
    if (iceCount && n > 1 && iceFlags.length === n) {
      return iceFlags.map((hasIce, unit) => `${unit + 1}. 1x ${label}${hasIce ? ' — 🧊 IJsklontjes' : ''}`).join(' · ');
    }
    if (iceCount) parts.push(`🧊 IJsklontjes ${iceCount}/${n}`);
    return `${n}x ${label}${parts.length ? ' — ' + parts.join(', ') : ''}`;
  }).join(' · ');
}

function tableKindLabel(number) {
  const entry = Object.values(TABLES).find(t => t.number === number);
  return entry && entry.kind === 'bank' ? { icon: '🛋️', woord: 'Bank' } : { icon: '🪑', woord: 'Tafel' };
}

function renderMine() {
  const el = document.getElementById('mine');
  const entries = Object.entries(myOrders).sort((a,b)=>(b[1].tijd||0)-(a[1].tijd||0));
  if (!entries.length) {
    el.innerHTML = '<div class="selfservice-card"><h2>Mijn bestellingen</h2><div class="muted">Je hebt op dit apparaat nog geen actieve bestellingen.</div></div>';
    return;
  }
  el.innerHTML = '<div class="selfservice-card"><h2>Mijn bestellingen</h2><div class="selfservice-device-note">Alleen bestellingen van dit apparaat worden hier getoond.</div></div>';
  entries.forEach(([id,o]) => {
    const st = statusInfo(o);
    const tk = tableKindLabel(o.tableNumber);
    const card = document.createElement('div');
    card.className = 'selfservice-card selfservice-order-card';
    card.innerHTML = `
      <div class="selfservice-order-top"><strong>${tk.icon} ${tk.woord} ${esc(o.tableNumber)}</strong><span class="selfservice-status">${esc(st.label)}</span></div>
      <div class="selfservice-progress"><div style="width:${st.pct}%"></div></div>
      <div class="selfservice-items">${esc(itemText(o))}</div>
      ${o.opmerking ? `<div class="selfservice-small selfservice-muted">Opmerking: "${esc(o.opmerking)}"</div>` : ''}
      ${isWaitingForService(o) ? `<div class="selfservice-small selfservice-muted" style="margin-top:8px;">${esc(queueMessage(id, o))}</div>` : ''}
    `;
    el.appendChild(card);
  });
}

document.getElementById('tab-order').onclick = () => {
  document.getElementById('tab-order').classList.add('active');
  document.getElementById('tab-service').classList.remove('active');
  document.getElementById('tab-mine').classList.remove('active');
  document.getElementById('order-view').classList.remove('selfservice-hidden');
  document.getElementById('service-view').classList.add('selfservice-hidden');
  document.getElementById('mine-view').classList.add('selfservice-hidden');
};
document.getElementById('tab-service').onclick = () => {
  document.getElementById('tab-service').classList.add('active');
  document.getElementById('tab-order').classList.remove('active');
  document.getElementById('tab-mine').classList.remove('active');
  document.getElementById('service-view').classList.remove('selfservice-hidden');
  document.getElementById('order-view').classList.add('selfservice-hidden');
  document.getElementById('mine-view').classList.add('selfservice-hidden');
};
document.getElementById('tab-mine').onclick = () => {
  document.getElementById('tab-mine').classList.add('active');
  document.getElementById('tab-order').classList.remove('active');
  document.getElementById('tab-service').classList.remove('active');
  document.getElementById('mine-view').classList.remove('selfservice-hidden');
  document.getElementById('order-view').classList.add('selfservice-hidden');
  document.getElementById('service-view').classList.add('selfservice-hidden');
};
