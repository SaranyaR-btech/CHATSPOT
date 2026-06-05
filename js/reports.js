function getSalesForMonth(monthKey) {
  return getSales().filter((sale) => sale.monthKey === monthKey);
}

function summarizeMonth(monthKey) {
  const sales = getSalesForMonth(monthKey);
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const orderCount = sales.length;
  const averageBill = orderCount > 0 ? totalRevenue / orderCount : 0;

  const itemCounts = {};
  sales.forEach((sale) => {
    sale.items.forEach((line) => {
      const key = line.name;
      itemCounts[key] = (itemCounts[key] || 0) + line.qty;
    });
  });

  const topItems = Object.entries(itemCounts)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);

  return {
    monthKey,
    totalRevenue,
    orderCount,
    averageBill,
    sales: sales.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)),
    topItems,
  };
}

function formatCurrency(amount) {
  return `₹${amount.toFixed(2)}`;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSaleFromCart(cartLines, total) {
  const now = new Date();
  return {
    id: generateId(),
    dateISO: now.toISOString(),
    monthKey: getMonthKey(now),
    items: cartLines.map((line) => ({
      menuId: line.menuId,
      name: line.name,
      qty: line.qty,
      lineTotal: line.price * line.qty,
    })),
    total,
    paidAt: now.toISOString(),
  };
}
