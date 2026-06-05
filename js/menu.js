const DEFAULT_MENU = [
  { id: 'seed-idly', name: 'Idly', price: 30, imageUrl: 'images/idly.svg' },
  { id: 'seed-ven-pongal', name: 'Ven Pongal', price: 50, imageUrl: 'images/ven-pongal.svg' },
  { id: 'seed-vada', name: 'Vada', price: 15, imageUrl: 'images/vada.svg' },
  { id: 'seed-dosa', name: 'Dosa', price: 60, imageUrl: 'images/dosa.svg' },
  { id: 'seed-tea', name: 'Tea', price: 10, imageUrl: 'images/tea.svg' },
  { id: 'seed-coffee', name: 'Coffee', price: 15, imageUrl: 'images/coffee.svg' },
];

function ensureMenuSeeded() {
  let menu = getMenu();
  if (!menu || !Array.isArray(menu) || menu.length === 0) {
    menu = DEFAULT_MENU.map((item) => ({ ...item }));
    saveMenu(menu);
  }
  return menu;
}

function getAllMenuItems() {
  return ensureMenuSeeded();
}

function getMenuItemById(id) {
  return getAllMenuItems().find((item) => item.id === id);
}

function createMenuItem({ name, price, imageUrl }) {
  const menu = getAllMenuItems();
  const item = {
    id: generateId(),
    name: name.trim(),
    price: Number(price),
    imageUrl: imageUrl.trim(),
  };
  menu.push(item);
  saveMenu(menu);
  return item;
}

function updateMenuItem(id, updates) {
  const menu = getAllMenuItems();
  const index = menu.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const current = menu[index];
  menu[index] = {
    ...current,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    price: updates.price !== undefined ? Number(updates.price) : current.price,
    imageUrl: updates.imageUrl !== undefined ? updates.imageUrl.trim() : current.imageUrl,
  };
  saveMenu(menu);
  return menu[index];
}

function deleteMenuItem(id) {
  const menu = getAllMenuItems();
  const filtered = menu.filter((item) => item.id !== id);
  if (filtered.length === menu.length) return false;
  saveMenu(filtered);
  return true;
}

function validateMenuInput({ name, price, imageUrl }) {
  const errors = [];
  if (!name || !name.trim()) errors.push('Name is required.');
  const numPrice = Number(price);
  if (Number.isNaN(numPrice) || numPrice <= 0) errors.push('Price must be greater than 0.');
  if (!imageUrl || !imageUrl.trim()) errors.push('Image URL or file is required.');
  return errors;
}
