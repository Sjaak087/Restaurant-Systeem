// ---- Product-kaartjes automatisch opbouwen op basis van products.js ----
const counts = {};
const stockStatus = {}; // true = uitverkocht
const productsContainer = document.getElementById('products');

PRODUCTS.forEach(product => {
  counts[product.key] = 0;
  stockStatus[product.key] = false;

  const card = document.createElement('div');
  card.className = 'product-card';
  card.id = `card-${product.key}`;
  card.innerHTML = `
    <div class="name">${product.emoji} ${product.label}</div>
    <div class="stepper">
      <button type="button" class="min-btn" data-key="${product.key}">−</button>
      <span class="count" id="${product.key}-count">0</span>
      <button type="button" class="plus-btn" data-key="${product.key}">+</button>
    </div>
    <button type="button" class="stock-btn" data-key="${product.key}">Uitverkocht</button>
  `;
  productsContainer.appendChild(card);
});

function updateCountDisplay(key) {
  document.getElementById(`${key}-count`).textContent = counts[key];
}

productsContainer.querySelectorAll('.plus-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-key');
    if (stockStatus[key]) return; // uitverkocht, niet aanklikbaar
    counts[key]++;
    updateCountDisplay(key);
    updateIceSelectorVisibility();
  });
});

productsContainer.querySelectorAll('.min-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-key');
    if (stockStatus[key]) return;
    if (counts[key] > 0) counts[key]--;
    updateCountDisplay(key);
    updateIceSelectorVisibility();
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
  }
}

// Live luisteren naar voorraadwijzigingen (vanuit keuken of bestelpagina)
let ijsklontjesOut = false;

db.ref('stock').on('value', snapshot => {
  const data = snapshot.val() || {};
  PRODUCTS.forEach(product => {
    stockStatus[product.key] = !!data[product.key];
    applyStockUI(product.key);
  });
  ijsklontjesOut = !!data['ijsklontjes'];
  updateIceSelectorVisibility();
});

// ---- IJsklontjes-keuze ----
const iceSelector = document.getElementById('ice-selector');
const iceButtons = iceSelector.querySelectorAll('.ice-btn');
let iceChoice = null; // 'met' | 'zonder' | null

iceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    iceChoice = btn.getAttribute('data-choice');
    iceButtons.forEach(b => b.classList.toggle('active', b === btn));
  });
});

function updateIceSelectorVisibility() {
  const heeftIjsDrankje = ICE_OPTION_KEYS.some(key => counts[key] > 0);
  const moetTonen = heeftIjsDrankje && !ijsklontjesOut;

  iceSelector.classList.toggle('hidden', !moetTonen);

  if (!moetTonen) {
    iceChoice = null;
    iceButtons.forEach(b => b.classList.remove('active'));
  }
}

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

  if (!iceSelector.classList.contains('hidden') && !iceChoice) {
    statusMsg.textContent = 'Kies nog even met of zonder ijsklontjes.';
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
  if (iceChoice) orderData.ijs = iceChoice;

  const newOrderRef = db.ref('orders').push();
  newOrderRef.set(orderData).then(() => {
    // Reset formulier
    PRODUCTS.forEach(product => {
      counts[product.key] = 0;
      updateCountDisplay(product.key);
    });
    document.getElementById('opmerking').value = '';
    iceChoice = null;
    iceButtons.forEach(b => b.classList.remove('active'));
    updateIceSelectorVisibility();

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
function productLabel(key) {
  const product = PRODUCTS.find(p => p.key === key);
  return product ? product.label : key;
}

function itemsToText(items) {
  return Object.entries(items)
    .map(([key, aantal]) => `${aantal}x ${productLabel(key)}`)
    .join(', ');
}

function iceLineHtml(order) {
  if (!order.ijs) return '';
  const tekst = order.ijs === 'met' ? '🧊 Met ijsklontjes' : '🚫 Zonder ijsklontjes';
  return `<div class="note-line">${tekst}</div>`;
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
