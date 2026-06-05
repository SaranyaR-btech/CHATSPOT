const StorageKeys = {
  MENU: 'restaurant_menu',
  SALES: 'restaurant_sales',
  SETTINGS: 'restaurant_settings',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getMenu() {
  return readJSON(StorageKeys.MENU, null);
}

function saveMenu(menu) {
  writeJSON(StorageKeys.MENU, menu);
}

function getSales() {
  return readJSON(StorageKeys.SALES, []);
}

function saveSales(sales) {
  writeJSON(StorageKeys.SALES, sales);
}

function addSale(sale) {
  const sales = getSales();
  sales.push(sale);
  saveSales(sales);
  return sale;
}

function getSettings() {
  return readJSON(StorageKeys.SETTINGS, { shopName: 'Chatspot Restaurant', upiId: '' });
}

function saveSettings(settings) {
  writeJSON(StorageKeys.SETTINGS, settings);
}
