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
  });
});

productsContainer.querySelectorAll('.min-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-key');
    if (stockStatus[key]) return;
    if (counts[key] > 0) counts[key]--;
    updateCountDisplay(key);
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
db.ref('stock').on('value', snapshot => {
  const data = snapshot.val() || {};
  PRODUCTS.forEach(product => {
    stockStatus[product.key] = !!data[product.key];
    applyStockUI(product.key);
  });
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

  const newOrderRef = db.ref('orders').push();
  newOrderRef.set({
    items: items,
    opmerking: opmerking,
    status: 'nieuw',
    tijd: Date.now()
  }).then(() => {
    // Reset formulier
    PRODUCTS.forEach(product => {
      counts[product.key] = 0;
      updateCountDisplay(product.key);
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
function productLabel(key) {
  const product = PRODUCTS.find(p => p.key === key);
  return product ? product.label : key;
}

function itemsToText(items) {
  return Object.entries(items)
    .map(([key, aantal]) => `${aantal}x ${productLabel(key)}`)
    .join(', ');
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
      db.ref('orders/' + id).remove();
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
});
