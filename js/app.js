/* global QRCode */

let cart = [];
let qrInstance = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function init() {
  ensureMenuSeeded();
  applySettings();
  bindNavigation();
  bindBilling();
  bindMenuAdmin();
  bindReports();
  bindModals();
  renderMenuGrid();
  renderCart();
  setDefaultReportMonth();
  renderReports();
}

function applySettings() {
  const settings = getSettings();
  $('#shopNameDisplay').textContent = settings.shopName || 'Chatspot Restaurant';
  $('#inputShopName').value = settings.shopName || '';
  $('#inputUpiId').value = settings.upiId || '';
}

function bindNavigation() {
  $$('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      $$('.nav-btn').forEach((b) => b.classList.toggle('active', b === btn));
      $$('.view').forEach((v) => v.classList.add('hidden'));
      const target =
        view === 'billing'
          ? '#view-billing'
          : view === 'menu-admin'
            ? '#view-menu-admin'
            : '#view-reports';
      $(target).classList.remove('hidden');
      if (view === 'menu-admin') renderMenuTable();
      if (view === 'reports') renderReports();
    });
  });
}

function bindBilling() {
  $('#btnClearCart').addEventListener('click', () => {
    if (cart.length === 0) return;
    if (confirm('Clear all items from the cart?')) {
      cart = [];
      renderCart();
    }
  });

  $('#btnPrintBill').addEventListener('click', printBill);

  $('#btnPayNow').addEventListener('click', openPayModal);
  $('#btnConfirmPayment').addEventListener('click', confirmPayment);
}

function bindMenuAdmin() {
  $('#settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const shopName = $('#inputShopName').value.trim();
    const upiId = $('#inputUpiId').value.trim();
    saveSettings({ shopName, upiId });
    applySettings();
    alert('Settings saved.');
  });

  $('#menuForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleMenuFormSubmit();
  });

  $('#menuCancelEdit').addEventListener('click', resetMenuForm);

  $('#menuImageFile').addEventListener('change', async (e) => {
    const url = await fileToDataUrl(e.target.files[0]);
    if (url) $('#menuImageUrl').value = url;
  });

  $('#editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleEditFormSubmit();
  });

  $('#editImageFile').addEventListener('change', async (e) => {
    const url = await fileToDataUrl(e.target.files[0]);
    if (url) $('#editImageUrl').value = url;
  });
}

function bindReports() {
  $('#reportMonth').addEventListener('change', renderReports);
}

function bindModals() {
  $$('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closePayModal);
  });

  $$('[data-close-edit]').forEach((el) => {
    el.addEventListener('click', closeEditModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePayModal();
      closeEditModal();
    }
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function renderMenuGrid() {
  const menu = getAllMenuItems();
  const grid = $('#menuGrid');
  const empty = $('#menuEmpty');

  grid.innerHTML = '';
  if (menu.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  menu.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-card';
    btn.setAttribute('role', 'listitem');
    btn.innerHTML = `
      <img src="${escapeAttr(item.imageUrl)}" alt="${escapeAttr(item.name)}" onerror="this.src='images/idly.svg'">
      <div class="menu-card-body">
        <p class="menu-card-name">${escapeHtml(item.name)}</p>
        <p class="menu-card-price">${formatCurrency(item.price)}</p>
      </div>
    `;
    btn.addEventListener('click', () => addToCart(item));
    grid.appendChild(btn);
  });
}

function addToCart(item) {
  const existing = cart.find((line) => line.menuId === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      menuId: item.id,
      name: item.name,
      price: item.price,
      qty: 1,
    });
  }
  renderCart();
}

function renderCart() {
  const list = $('#cartList');
  const totalEl = $('#cartTotal');
  list.innerHTML = '';

  let total = 0;
  cart.forEach((line) => {
    const lineTotal = line.price * line.qty;
    total += lineTotal;

    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-name">${escapeHtml(line.name)}</span>
        <span class="cart-item-price">${formatCurrency(line.price)} each</span>
      </div>
      <div class="cart-qty-controls">
        <button type="button" class="qty-btn" data-action="dec" aria-label="Decrease">−</button>
        <span>${line.qty}</span>
        <button type="button" class="qty-btn" data-action="inc" aria-label="Increase">+</button>
      </div>
      <span class="cart-item-total">${formatCurrency(lineTotal)}</span>
    `;

    li.querySelector('[data-action="dec"]').addEventListener('click', () => {
      line.qty -= 1;
      if (line.qty <= 0) {
        cart = cart.filter((l) => l.menuId !== line.menuId);
      }
      renderCart();
    });

    li.querySelector('[data-action="inc"]').addEventListener('click', () => {
      line.qty += 1;
      renderCart();
    });

    list.appendChild(li);
  });

  totalEl.textContent = formatCurrency(total);
  $('#btnPayNow').disabled = cart.length === 0;
  $('#btnPrintBill').disabled = cart.length === 0;
  $('#btnClearCart').disabled = cart.length === 0;
}

function getCartTotal() {
  return cart.reduce((sum, line) => sum + line.price * line.qty, 0);
}

function buildUpiString(amount) {
  const settings = getSettings();
  const pa = encodeURIComponent(settings.upiId.trim());
  const pn = encodeURIComponent(settings.shopName || 'Restaurant');
  const am = amount.toFixed(2);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`;
}

function openPayModal() {
  if (cart.length === 0) {
    alert('Cart is empty. Add items first.');
    return;
  }

  const total = getCartTotal();
  const settings = getSettings();
  $('#payAmount').textContent = formatCurrency(total);
  const warning = $('#payUpiWarning');
  const qrContainer = $('#qrContainer');

  qrContainer.innerHTML = '';
  if (qrInstance) {
    qrInstance.clear();
    qrInstance = null;
  }

  if (!settings.upiId || !settings.upiId.includes('@')) {
    warning.classList.remove('hidden');
    $('#btnConfirmPayment').disabled = false;
  } else {
    warning.classList.add('hidden');
    if (typeof QRCode !== 'undefined') {
      qrInstance = new QRCode(qrContainer, {
        text: buildUpiString(total),
        width: 200,
        height: 200,
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      qrContainer.innerHTML = '<p class="form-errors">QR library failed to load. Check your internet connection.</p>';
    }
  }

  $('#payModal').classList.remove('hidden');
}

function closePayModal() {
  $('#payModal').classList.add('hidden');
  $('#qrContainer').innerHTML = '';
  qrInstance = null;
}

function confirmPayment() {
  if (cart.length === 0) return;

  const total = getCartTotal();
  const sale = buildSaleFromCart(cart, total);
  addSale(sale);
  cart = [];
  renderCart();
  closePayModal();
  alert('Payment recorded. Sale saved to monthly report.');
}

function printBill() {
  if (cart.length === 0) {
    alert('Cart is empty. Nothing to print.');
    return;
  }

  const settings = getSettings();
  const total = getCartTotal();
  const now = new Date();
  const rows = cart
    .map(
      (line) => `
      <tr>
        <td>${escapeHtml(line.name)} × ${line.qty}</td>
        <td style="text-align:right">${formatCurrency(line.price * line.qty)}</td>
      </tr>
    `
    )
    .join('');

  $('#printReceipt').innerHTML = `
    <h1>${escapeHtml(settings.shopName || 'Restaurant')}</h1>
    <p class="receipt-meta">${now.toLocaleString('en-IN')}</p>
    <table>
      <tbody>${rows}</tbody>
    </table>
    <p class="receipt-total">Total: ${formatCurrency(total)}</p>
    <p class="receipt-meta">Thank you!</p>
  `;

  window.print();
}

async function handleMenuFormSubmit() {
  const errorsEl = $('#menuFormErrors');
  const editId = $('#menuEditId').value;
  let imageUrl = $('#menuImageUrl').value.trim();

  if (!imageUrl && $('#menuImageFile').files[0]) {
    imageUrl = await fileToDataUrl($('#menuImageFile').files[0]);
  }

  const payload = {
    name: $('#menuName').value,
    price: $('#menuPrice').value,
    imageUrl: imageUrl || '',
  };

  const errors = validateMenuInput(payload);
  if (errors.length) {
    errorsEl.textContent = errors.join(' ');
    errorsEl.classList.remove('hidden');
    return;
  }
  errorsEl.classList.add('hidden');

  if (editId) {
    updateMenuItem(editId, payload);
  } else {
    createMenuItem(payload);
  }

  resetMenuForm();
  renderMenuGrid();
  renderMenuTable();
}

function resetMenuForm() {
  $('#menuForm').reset();
  $('#menuEditId').value = '';
  $('#menuFormTitle').textContent = 'Add Menu Item';
  $('#menuSubmitBtn').textContent = 'Add Item';
  $('#menuCancelEdit').classList.add('hidden');
  $('#menuFormErrors').classList.add('hidden');
}

function renderMenuTable() {
  const menu = getAllMenuItems();
  const tbody = $('#menuTableBody');
  const empty = $('#adminMenuEmpty');

  tbody.innerHTML = '';
  if (menu.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  menu.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img class="table-thumb" src="${escapeAttr(item.imageUrl)}" alt="" onerror="this.src='images/idly.svg'"></td>
      <td>${escapeHtml(item.name)}</td>
      <td>${formatCurrency(item.price)}</td>
      <td class="table-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-edit="${item.id}">Edit</button>
        <button type="button" class="btn btn-danger btn-sm" data-delete="${item.id}">Delete</button>
      </td>
    `;

    tr.querySelector('[data-edit]').addEventListener('click', () => openEditModal(item));
    tr.querySelector('[data-delete]').addEventListener('click', () => {
      if (confirm(`Delete "${item.name}"?`)) {
        deleteMenuItem(item.id);
        cart = cart.filter((line) => line.menuId !== item.id);
        renderMenuGrid();
        renderMenuTable();
        renderCart();
      }
    });

    tbody.appendChild(tr);
  });
}

function openEditModal(item) {
  $('#editId').value = item.id;
  $('#editName').value = item.name;
  $('#editPrice').value = item.price;
  $('#editImageUrl').value = item.imageUrl;
  $('#editFormErrors').classList.add('hidden');
  $('#editModal').classList.remove('hidden');
}

function closeEditModal() {
  $('#editModal').classList.add('hidden');
  $('#editForm').reset();
}

async function handleEditFormSubmit() {
  const id = $('#editId').value;
  let imageUrl = $('#editImageUrl').value.trim();

  if ($('#editImageFile').files[0]) {
    const uploaded = await fileToDataUrl($('#editImageFile').files[0]);
    if (uploaded) imageUrl = uploaded;
  }

  const payload = {
    name: $('#editName').value,
    price: $('#editPrice').value,
    imageUrl,
  };

  const errors = validateMenuInput(payload);
  const errorsEl = $('#editFormErrors');
  if (errors.length) {
    errorsEl.textContent = errors.join(' ');
    errorsEl.classList.remove('hidden');
    return;
  }
  errorsEl.classList.add('hidden');

  updateMenuItem(id, payload);
  closeEditModal();
  renderMenuGrid();
  renderMenuTable();
}

function setDefaultReportMonth() {
  const input = $('#reportMonth');
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  input.value = `${y}-${m}`;
}

function renderReports() {
  const monthKey = $('#reportMonth').value;
  if (!monthKey) return;

  const summary = summarizeMonth(monthKey);

  $('#metricRevenue').textContent = formatCurrency(summary.totalRevenue);
  $('#metricOrders').textContent = String(summary.orderCount);
  $('#metricAverage').textContent = formatCurrency(summary.averageBill);

  const topList = $('#topItemsList');
  const topEmpty = $('#topItemsEmpty');
  topList.innerHTML = '';

  if (summary.topItems.length === 0) {
    topEmpty.classList.remove('hidden');
  } else {
    topEmpty.classList.add('hidden');
    const maxQty = summary.topItems[0].qty;
    summary.topItems.forEach(({ name, qty }) => {
      const li = document.createElement('li');
      const pct = maxQty > 0 ? (qty / maxQty) * 100 : 0;
      li.innerHTML = `
        <div class="top-item-row">
          <span>${escapeHtml(name)}</span>
          <span>${qty} sold</span>
        </div>
        <div class="top-bar"><div class="top-bar-fill" style="width:${pct}%"></div></div>
      `;
      topList.appendChild(li);
    });
  }

  const tbody = $('#salesTableBody');
  const salesEmpty = $('#salesEmpty');
  tbody.innerHTML = '';

  if (summary.sales.length === 0) {
    salesEmpty.classList.remove('hidden');
    return;
  }
  salesEmpty.classList.add('hidden');

  summary.sales.forEach((sale) => {
    const itemsSummary = sale.items
      .map((i) => `${i.name}×${i.qty}`)
      .join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateTime(sale.paidAt)}</td>
      <td>${escapeHtml(itemsSummary)}</td>
      <td>${formatCurrency(sale.total)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
}

document.addEventListener('DOMContentLoaded', init);
