// ---- Stepper (aantal cola / vlaai) ----
const counts = { cola: 0, vlaai: 0 };

function updateCountDisplay(product) {
  document.getElementById(`${product}-count`).textContent = counts[product];
}

['cola', 'vlaai'].forEach(product => {
  document.getElementById(`${product}-plus`).addEventListener('click', () => {
    counts[product]++;
    updateCountDisplay(product);
  });
  document.getElementById(`${product}-min`).addEventListener('click', () => {
    if (counts[product] > 0) counts[product]--;
    updateCountDisplay(product);
  });
});

// ---- Bestelling plaatsen ----
const statusMsg = document.getElementById('status-msg');

document.getElementById('plaats-bestelling').addEventListener('click', () => {
  const items = {};
  if (counts.cola > 0) items.cola = counts.cola;
  if (counts.vlaai > 0) items.vlaai = counts.vlaai;

  if (Object.keys(items).length === 0) {
    statusMsg.textContent = 'Kies eerst iets, bijv. cola of vlaai.';
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
    counts.cola = 0;
    counts.vlaai = 0;
    updateCountDisplay('cola');
    updateCountDisplay('vlaai');
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
  const namen = { cola: 'Cola', vlaai: 'Vlaai' };
  return Object.entries(items)
    .map(([key, aantal]) => `${aantal}x ${namen[key] || key}`)
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
