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

    card.innerHTML = `
      <div class="items-line">${itemsToText(order.items)}</div>
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
