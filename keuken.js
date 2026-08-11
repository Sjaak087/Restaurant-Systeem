const kitchenList = document.getElementById('kitchen-list');
const kitchenEmpty = document.getElementById('kitchen-empty');
const kitchenCount = document.getElementById('kitchen-count');

const nieuweOrders = {};

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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function render() {
  const ids = Object.keys(nieuweOrders);
  kitchenList.innerHTML = '';

  if (ids.length === 0) {
    kitchenList.appendChild(kitchenEmpty);
    kitchenCount.textContent = 'Nieuwe bestellingen worden hier automatisch getoond.';
    return;
  }

  kitchenCount.textContent = `${ids.length} nieuwe bestelling${ids.length === 1 ? '' : 'en'}`;

  ids.sort((a, b) => nieuweOrders[a].tijd - nieuweOrders[b].tijd);

  ids.forEach(id => {
    const order = nieuweOrders[id];
    const card = document.createElement('div');
    card.className = 'order-card nieuw';

    const noteHtml = order.opmerking
      ? `<div class="note-line">"${escapeHtml(order.opmerking)}"</div>`
      : '';
    const iceHtml = iceLineHtml(order);

    card.innerHTML = `
      <div class="items-line">${itemsToText(order.items)}</div>
      ${iceHtml}
      ${noteHtml}
      <div class="time-line">Binnengekomen om ${formatTime(order.tijd)}</div>
      <div class="actions">
        <button class="chip-btn ready" data-id="${id}">Klaar</button>
      </div>
    `;
    kitchenList.appendChild(card);
  });

  kitchenList.querySelectorAll('.chip-btn.ready').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      db.ref('orders/' + id + '/status').set('klaar');
    });
  });
}

const ordersRef = db.ref('orders');

ordersRef.on('child_added', snap => {
  const order = snap.val();
  if (order.status === 'nieuw') {
    nieuweOrders[snap.key] = order;
    render();
  }
});

ordersRef.on('child_changed', snap => {
  const order = snap.val();
  if (order.status === 'nieuw') {
    nieuweOrders[snap.key] = order;
  } else {
    delete nieuweOrders[snap.key];
  }
  render();
});

ordersRef.on('child_removed', snap => {
  delete nieuweOrders[snap.key];
  render();
});

// ---- Voorraadbeheer ----
const stockList = document.getElementById('stock-list');
const toggleStockBtn = document.getElementById('toggle-stock');
const stockStatus = {}; // true = uitverkocht

toggleStockBtn.addEventListener('click', () => {
  stockList.classList.toggle('open');
});

function renderStockList() {
  stockList.innerHTML = '';

  [...PRODUCTS, ...EXTRA_STOCK_ITEMS].forEach(product => {
    const isOut = !!stockStatus[product.key];
    const row = document.createElement('div');
    row.className = 'stock-row' + (isOut ? ' out' : '');
    row.innerHTML = `
      <span class="stock-name">${product.emoji} ${product.label}</span>
      <button type="button" class="stock-btn${isOut ? ' active' : ''}" data-key="${product.key}">
        ${isOut ? 'Weer op voorraad' : 'Uitverkocht'}
      </button>
    `;
    stockList.appendChild(row);
  });

  stockList.querySelectorAll('.stock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      db.ref('stock/' + key).set(!stockStatus[key]);
    });
  });
}

// Live luisteren naar voorraadwijzigingen (vanuit keuken of bestelpagina)
db.ref('stock').on('value', snapshot => {
  const data = snapshot.val() || {};
  [...PRODUCTS, ...EXTRA_STOCK_ITEMS].forEach(product => {
    stockStatus[product.key] = !!data[product.key];
  });
  renderStockList();
});
