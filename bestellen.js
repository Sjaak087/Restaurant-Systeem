// ---- Product-rijen automatisch opbouwen op basis van products.js ----
const counts = {};
const stockStatus = {}; // true = uitverkocht
const iceChoices = {};  // key -> array van 'met' | 'zonder', lengte = counts[key]
const productsContainer = document.getElementById('products');

function productLabel(key) {
  const product = PRODUCTS.find(p => p.key === key);
  return product ? product.label : key;
}

PRODUCTS.forEach(product => {
  counts[product.key] = 0;
  stockStatus[product.key] = false;
  iceChoices[product.key] = [];

  const card = document.createElement('div');
  card.className = 'product-card';
  card.id = `card-${product.key}`;
  card.innerHTML = `
    <div class="name">${product.emoji} ${product.label}</div>
    <div class="product-row-main">
      <div class="stepper">
        <button type="button" class="min-btn" data-key="${product.key}">−</button>
        <span class="count" id="${product.key}-count">0</span>
        <button type="button" class="plus-btn" data-key="${product.key}">+</button>
      </div>
      <button type="button" class="stock-btn" data-key="${product.key}">Uitverkocht</button>
    </div>
    <div class="ice-toggles" id="ice-toggles-${product.key}"></div>
  `;
  productsContainer.appendChild(card);
});

function updateCountDisplay(key) {
  document.getElementById(`${key}-count`).textContent = counts[key];
}

// ---- IJs-chips per besteld stuk (standaard "zonder ijs") ----
let ijsklontjesOut = false;

function renderIceToggles(key) {
  const container = document.getElementById(`ice-toggles-${key}`);
  if (!container) return;
  container.innerHTML = '';

  if (ijsklontjesOut) { iceChoices[key] = []; return; }

  const n = counts[key] || 0;
  if (!iceChoices[key]) iceChoices[key] = [];
  while (iceChoices[key].length < n) iceChoices[key].push('zonder');
  while (iceChoices[key].length > n) iceChoices[key].pop();

  iceChoices[key].forEach((choice, i) => {
    const nummer = n > 1 ? `#${i + 1} ` : '';
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'ice-chip' + (choice === 'met' ? ' met' : '');
    chip.textContent = `${nummer}${choice === 'met' ? '🧊 Met ijs' : '🚫 Zonder ijs'}`;
    chip.addEventListener('click', () => {
      iceChoices[key][i] = iceChoices[key][i] === 'met' ? 'zonder' : 'met';
      renderIceToggles(key);
    });
    container.appendChild(chip);
  });
}

// ---- Tellers ----
productsContainer.querySelectorAll('.plus-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-key');
    if (stockStatus[key]) return; // uitverkocht, niet aanklikbaar
    counts[key]++;
    updateCountDisplay(key);
    renderIceToggles(key);
  });
});

productsContainer.querySelectorAll('.min-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-key');
    if (stockStatus[key]) return;
    if (counts[key] > 0) counts[key]--;
    updateCountDisplay(key);
    renderIceToggles(key);
  });
});

// ---- Uitverkocht-knop per product ----
productsContainer.querySelectorAll('.stock-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-key');
    db.ref('stock/' + key).set(!stockStatus[key]);
  });
});

function applyStockUI(key) {
  const card = document.getElementById(`card-${key}`);
  if (!card) return;
  const isOut = !!stockStatus[key];

  card.classList.toggle('out-of-stock', isOut);
  card.querySelector('.plus-btn').disabled = isOut;
  card.querySelector('.min-btn').disabled = isOut;

  const stockBtn = card.querySelector('.stock-btn');
  stockBtn.textContent = isOut ? 'Weer op voorraad' : 'Uitverkocht';
  stockBtn.classList.toggle('active', isOut);

  if (isOut && counts[key] > 0) {
    counts[key] = 0;
    updateCountDisplay(key);
    renderIceToggles(key);
  }
}

// Live luisteren naar voorraadwijzigingen (vanuit keuken of bestelpagina)
db.ref('stock').on('value', snapshot => {
  const data = snapshot.val() || {};
  PRODUCTS.forEach(product => {
    stockStatus[product.key] = !!data[product.key];
    applyStockUI(product.key);
  });
  ijsklontjesOut = !!data['ijsklontjes'];
  PRODUCTS.forEach(product => renderIceToggles(product.key));
});

// ---- Bestelling plaatsen ----
const statusMsg = document.getElementById('status-msg');

document.getElementById('plaats-bestelling').addEventListener('click', () => {
  const items = {};
  PRODUCTS.forEach(product => {
    if (!stockStatus[product.key] && counts[product.key] > 0) {
      items[product.key] = counts[product.key];
    }
  });

  if (Object.keys(items).length === 0) {
    statusMsg.textContent = 'Kies eerst iets, bijv. een drankje of snack.';
    statusMsg.style.color = '#c1552f';
    return;
  }

  const opmerking = document.getElementById('opmerking').value.trim();

  const orderData = {
    items: items,
    opmerking: opmerking,
    status: 'nieuw',
    tijd: Date.now()
  };

  const ijsKeuzes = {};
  Object.keys(items).forEach(key => {
    if (iceChoices[key] && iceChoices[key].length > 0) {
      ijsKeuzes[key] = iceChoices[key].slice();
    }
  });
  if (Object.keys(ijsKeuzes).length > 0) orderData.ijsKeuzes = ijsKeuzes;

  const newOrderRef = db.ref('orders').push();
  newOrderRef.set(orderData).then(() => {
    // Reset formulier
    PRODUCTS.forEach(product => {
      counts[product.key] = 0;
      updateCountDisplay(product.key);
      renderIceToggles(product.key);
    });
    document.getElementById('opmerking').value = '';

    statusMsg.style.color = '#4a7856';
    statusMsg.textContent = 'Bestelling geplaatst! Deze is nu naar de keuken gestuurd.';
    setTimeout(() => { statusMsg.textContent = ''; }, 4000);
  }).catch(err => {
    statusMsg.style.color = '#c1552f';
    statusMsg.textContent = 'Er ging iets mis, probeer het opnieuw.';
    console.error(err);
  });
});

// ---- Gemaakte bestellingen tonen/verbergen ----
const readyList = document.getElementById('ready-list');
const toggleBtn = document.getElementById('toggle-ready');

toggleBtn.addEventListener('click', () => {
  readyList.classList.toggle('open');
});

// ---- Live lijst met klaar-gemelde bestellingen ----
function itemsToText(items) {
  return Object.entries(items)
    .map(([key, aantal]) => `${aantal}x ${productLabel(key)}`)
    .join(', ');
}

function iceLineHtml(order) {
  if (!order.ijsKeuzes) return '';
  const regels = [];
  Object.entries(order.ijsKeuzes).forEach(([key, keuzes]) => {
    const label = productLabel(key);
    keuzes.forEach((keuze, i) => {
      const nummer = keuzes.length > 1 ? ` #${i + 1}` : '';
      const tekst = keuze === 'met' ? '🧊 Met ijs' : '🚫 Zonder ijs';
      regels.push(`${label}${nummer}: ${tekst}`);
    });
  });
  if (regels.length === 0) return '';
  return `<div class="note-line">${regels.join('<br>')}</div>`;
}

const readyOrders = {};

function renderReadyList() {
  const ids = Object.keys(readyOrders);
  readyList.innerHTML = '';

  if (ids.length === 0) {
    readyList.innerHTML = '<div class="empty-msg">Geen gemaakte bestellingen</div>';
    return;
  }

  ids.sort((a, b) => readyOrders[a].tijd - readyOrders[b].tijd);

  ids.forEach(id => {
    const order = readyOrders[id];
    const card = document.createElement('div');
    card.className = 'order-card';

    const noteHtml = order.opmerking
      ? `<div class="note-line">"${escapeHtml(order.opmerking)}"</div>`
      : '';

    card.innerHTML = `
      <div class="items-line">${itemsToText(order.items)}</div>
      ${iceLineHtml(order)}
      ${noteHtml}
      <div class="actions">
        <button class="chip-btn delivered" data-id="${id}">Bezorgd</button>
      </div>
    `;
    readyList.appendChild(card);
  });

  readyList.querySelectorAll('.chip-btn.delivered').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      db.ref('orders/' + id).update({ status: 'bezorgd', bezorgdTijd: Date.now() });
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const ordersRef = db.ref('orders');

ordersRef.on('child_added', snap => {
  const order = snap.val();
  if (order.status === 'klaar') {
    readyOrders[snap.key] = order;
    renderReadyList();
  }
});

ordersRef.on('child_changed', snap => {
  const order = snap.val();
  if (order.status === 'klaar') {
    readyOrders[snap.key] = order;
  } else {
    delete readyOrders[snap.key];
  }
  renderReadyList();
});

ordersRef.on('child_removed', snap => {
  delete readyOrders[snap.key];
  renderReadyList();
  delete historyOrders[snap.key];
  renderHistoryList();
});

// ---- Historie (bezorgde bestellingen) ----
const historyBtn = document.getElementById('history-btn');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const resetHistoryBtn = document.getElementById('reset-history');
const historyOrders = {};

historyBtn.addEventListener('click', () => {
  historyPanel.classList.toggle('open');
});

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderHistoryList() {
  const ids = Object.keys(historyOrders);
  historyList.innerHTML = '';

  if (ids.length === 0) {
    historyList.innerHTML = '<div class="empty-msg">Nog geen bezorgde bestellingen</div>';
    return;
  }

  ids.sort((a, b) => (historyOrders[b].bezorgdTijd || 0) - (historyOrders[a].bezorgdTijd || 0));

  ids.forEach(id => {
    const order = historyOrders[id];
    const card = document.createElement('div');
    card.className = 'order-card';

    const noteHtml = order.opmerking
      ? `<div class="note-line">"${escapeHtml(order.opmerking)}"</div>`
      : '';
    const timeHtml = order.bezorgdTijd
      ? `<div class="time-line">Bezorgd om ${formatTime(order.bezorgdTijd)}</div>`
      : '';

    card.innerHTML = `
      <div class="items-line">${itemsToText(order.items)}</div>
      ${iceLineHtml(order)}
      ${noteHtml}
      ${timeHtml}
    `;
    historyList.appendChild(card);
  });
}

resetHistoryBtn.addEventListener('click', () => {
  const ids = Object.keys(historyOrders);
  if (ids.length === 0) return;
  if (!confirm('Weet je zeker dat je alle bezorgde bestellingen wilt wissen?')) return;

  const updates = {};
  ids.forEach(id => { updates['orders/' + id] = null; });
  db.ref().update(updates);
});

ordersRef.on('child_added', snap => {
  const order = snap.val();
  if (order.status === 'bezorgd') {
    historyOrders[snap.key] = order;
    renderHistoryList();
  }
});

ordersRef.on('child_changed', snap => {
  const order = snap.val();
  if (order.status === 'bezorgd') {
    historyOrders[snap.key] = order;
  } else {
    delete historyOrders[snap.key];
  }
  renderHistoryList();
});
