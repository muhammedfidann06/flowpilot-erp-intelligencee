/** Pure business rules. UI, tests and exports all use this module to avoid conflicting numbers. */
export const sum = (rows, fn) => rows.reduce((n, r) => n + fn(r), 0);
export const mean = (values) =>
  values.length ? sum(values, (x) => x) / values.length : 0;
export const days = (end, start) =>
  Math.round((Date.parse(end) - Date.parse(start)) / 864e5);
export const inPeriod = (date, period) => date?.startsWith(period);
export const delta = (current, previous) =>
  previous ? ((current - previous) / previous) * 100 : null;
export const lateDays = (r) =>
  r.deliveredAt ? Math.max(0, days(r.deliveredAt, r.promisedDate)) : 0;
export const previousPeriod = (period) => {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
};
/** OTD is measured on completed deliveries by actual receipt month; open orders are never counted as on time. */
export function deliveryStats(rows) {
  rows = rows.filter(
    (r) =>
      typeof r.deliveredAt === "string" &&
      Number.isFinite(Date.parse(r.deliveredAt)),
  );
  return {
    count: rows.length,
    late: rows.filter((r) => lateDays(r) > 0).length,
    otd: rows.length
      ? (100 * rows.filter((r) => lateDays(r) === 0).length) / rows.length
      : null,
    delay: mean(rows.map(lateDays)),
    lead: mean(rows.map((r) => days(r.deliveredAt, r.dispatchDate))),
  };
}
/** Available inventory cannot be negative. Coverage excludes reserved units and assumes constant forecast demand. */
export function inventoryRow(p) {
  const available = Math.max(0, p.stock - p.reserved),
    cover = p.dailyDemand ? available / p.dailyDemand : null;
  return {
    ...p,
    available,
    cover,
    value: p.stock * p.unitCost,
    risk: !p.dailyDemand
      ? "dead"
      : cover < 7
        ? "high"
        : available < p.reorderPoint
          ? "medium"
          : cover > 90
            ? "overstock"
            : "low",
  };
}
export function supplierRows(data, period) {
  return data.suppliers.map((s) => {
    const pos = data.purchaseOrders.filter(
      (p) => p.supplierId === s.id && inPeriod(p.date, period),
    );
    const receipts = data.deliveries.filter(
      (d) =>
        d.type === "purchase" &&
        d.supplierId === s.id &&
        inPeriod(d.deliveredAt, period),
    );
    const stats = deliveryStats(receipts);
    return {
      ...s,
      ...stats,
      orders: pos.length,
      open: pos.filter((p) => p.status !== "delivered").length,
      spend: sum(pos, (p) => p.quantity * p.unitCost),
      price: mean(pos.map((p) => p.unitCost)),
      risk:
        stats.count && stats.otd < 70
          ? "high"
          : stats.count && stats.otd < 90
            ? "medium"
            : "low",
    };
  });
}
export function metrics(data, period) {
  const orders = data.orders.filter((o) => inPeriod(o.date, period)),
    recognized = data.orders.filter((o) => inPeriod(o.deliveredAt, period));
  const delivery = deliveryStats(
    data.deliveries.filter(
      (d) => d.type === "sales" && inPeriod(d.deliveredAt, period),
    ),
  );
  const inventory = sum(data.products, (p) => p.stock * p.unitCost);
  const cogs = sum(
    recognized,
    (o) =>
      o.quantity * data.products.find((p) => p.id === o.productId).unitCost,
  );
  return {
    revenue: sum(recognized, (o) => o.quantity * o.unitPrice),
    inventory,
    open: orders.filter((o) => o.status !== "delivered").length,
    otd: delivery.otd,
    turnover: inventory ? (cogs * 12) / inventory : 0,
    aov: recognized.length
      ? sum(recognized, (o) => o.quantity * o.unitPrice) / recognized.length
      : 0,
    orders: orders.length,
  };
}
/** Risk impact is an explicit estimate, not lost revenue: procurement delay × quantity × unit cost × 0.5% / day. */
export function insights(data, period) {
  const list = [];
  for (const s of supplierRows(data, period).filter((s) => s.risk !== "low")) {
    const evidence = data.purchaseOrders.filter(
      (p) =>
        p.supplierId === s.id &&
        inPeriod(p.deliveredAt, period) &&
        lateDays(p) > 0,
    );
    if (!evidence.length) continue;
    const prev = supplierRows(data, previousPeriod(period)).find(
      (p) => p.id === s.id,
    );
    list.push({
      id: `supplier-${period}-${s.id}`,
      type: "supplierRisk",
      entityId: s.id,
      entity: s.name,
      severity: s.risk,
      affected: evidence.length,
      impact: sum(
        evidence,
        (p) => lateDays(p) * p.quantity * p.unitCost * 0.005,
      ),
      current: s.otd,
      previous: prev.otd,
      delay: s.delay,
      evidence: evidence.map((p) => p.id),
      factor: "supplierFactor",
      action: "supplierAction",
      formula: "delayFormula",
    });
  }
  for (const p of data.products
    .map(inventoryRow)
    .filter((p) => ["high", "medium"].includes(p.risk))) {
    const quantity = Math.max(0, p.reorderPoint - p.available);
    list.push({
      id: `stock-${p.id}`,
      type: "stockRisk",
      entityId: p.id,
      entity: p.name,
      severity: p.risk,
      affected: quantity,
      impact: quantity * p.unitCost,
      cover: p.cover,
      evidence: [
        p.id,
        ...data.orders
          .filter((o) => o.productId === p.id && o.status !== "delivered")
          .map((o) => o.id),
      ],
      factor: "stockFactor",
      action: "stockAction",
      formula: "stockFormula",
    });
  }
  const now = metrics(data, period),
    before = metrics(data, previousPeriod(period));
  if (before.revenue && Math.abs(delta(now.revenue, before.revenue)) > 10)
    list.push({
      id: `sales-${period}`,
      type: "salesChange",
      entityId: null,
      entity: "",
      severity: "low",
      affected: now.orders,
      impact: null,
      current: delta(now.revenue, before.revenue),
      evidence: data.orders
        .filter((o) => inPeriod(o.deliveredAt, period))
        .map((o) => o.id),
      factor: "salesFactor",
      action: "salesAction",
      formula: "salesFormula",
    });
  return list.sort(
    (a, b) =>
      ({ high: 0, medium: 1, low: 2 })[a.severity] -
        { high: 0, medium: 1, low: 2 }[b.severity] ||
      (b.impact ?? 0) - (a.impact ?? 0),
  );
}
/** Filters compose by AND; dates are ISO strings so comparisons are timezone independent. */
export function filterOrders(data, filters = {}) {
  return data.orders.filter((o) => {
    const p = data.products.find((p) => p.id === o.productId);
    return (
      (!filters.period || inPeriod(o.date, filters.period)) &&
      (!filters.start || o.date >= filters.start) &&
      (!filters.end || o.date <= filters.end) &&
      (!filters.supplier || o.supplierId === filters.supplier) &&
      (!filters.product || o.productId === filters.product) &&
      (!filters.category || p.category === filters.category) &&
      (!filters.region || o.region === filters.region) &&
      (!filters.status || o.status === filters.status) &&
      (!filters.risk || inventoryRow(p).risk === filters.risk) &&
      (!filters.query ||
        [o.id, p.name, o.customerId]
          .join(" ")
          .toLowerCase()
          .includes(filters.query.toLowerCase()))
    );
  });
}
/** RFC 4180 quoting plus formula-injection protection for spreadsheet consumers. */
export function toCSV(rows, columns) {
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      columns.map((c) => cell(c.label)).join(","),
      ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(",")),
    ].join("\r\n")
  );
}
export function weeklyRevenue(data, period) {
  const lastDay = new Date(
    Number(period.slice(0, 4)),
    Number(period.slice(5)),
    0,
  ).getDate();
  return Array.from({ length: Math.ceil(lastDay / 7) }, (_, i) => i + 1).map(
    (week) => ({
      label: `${(week - 1) * 7 + 1}–${Math.min(week * 7, new Date(Number(period.slice(0, 4)), Number(period.slice(5)), 0).getDate())}`,
      value: sum(
        data.orders.filter(
          (o) =>
            inPeriod(o.deliveredAt, period) &&
            Math.ceil(Number(o.deliveredAt.slice(8)) / 7) === week,
        ),
        (o) => o.quantity * o.unitPrice,
      ),
    }),
  );
}
