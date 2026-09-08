/** Validate at the integration boundary; corrupted imports must fail before rendering financial values. */
export function isISODate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function validateData(data) {
  const fail = (message) => {
    throw new Error(message);
  };
  const text = (value) => typeof value === "string" && value.trim().length > 0;
  const number = (value) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;
  const integer = (value) => number(value) && Number.isSafeInteger(value);
  if (
    !data ||
    !data.meta ||
    !text(data.meta.company) ||
    !isISODate(data.meta.asOf) ||
    data.meta.currency !== "EUR" ||
    data.meta.synthetic !== true
  )
    fail("Invalid metadata");
  const keys = [
    "suppliers",
    "products",
    "customers",
    "orders",
    "purchaseOrders",
    "deliveries",
  ];
  const maps = {};
  for (const key of keys) {
    if (!Array.isArray(data[key])) fail("Missing collection: " + key);
    maps[key] = new Map();
    for (const row of data[key]) {
      if (!row || !text(row.id) || maps[key].has(row.id))
        fail("Invalid IDs: " + key);
      maps[key].set(row.id, row);
    }
  }
  for (const s of data.suppliers)
    if (
      !text(s.name) ||
      !text(s.region) ||
      !integer(s.leadTime) ||
      !integer(s.paymentDays)
    )
      fail("Invalid supplier");
  for (const c of data.customers)
    if (!text(c.name) || !text(c.region)) fail("Invalid customer");
  for (const p of data.products) {
    if (
      !text(p.name) ||
      !["sensors", "motion", "mechanical", "electronics"].includes(
        p.category,
      ) ||
      !maps.suppliers.has(p.supplierId) ||
      !["stock", "reserved", "reorderPoint"].every((k) => integer(p[k])) ||
      !["unitCost", "unitPrice", "dailyDemand"].every((k) => number(p[k])) ||
      p.reserved > p.stock
    )
      fail("Invalid product");
  }
  for (const key of ["orders", "purchaseOrders"])
    for (const o of data[key]) {
      const product = maps.products.get(o.productId);
      if (
        !product ||
        product.supplierId !== o.supplierId ||
        !text(o.region) ||
        !integer(o.quantity) ||
        !o.quantity ||
        !number(o[key === "orders" ? "unitPrice" : "unitCost"]) ||
        !["open", "processing", "delivered"].includes(o.status)
      )
        fail("Invalid order fields");
      if (
        !isISODate(o.date) ||
        !isISODate(o.promisedDate) ||
        o.promisedDate < o.date ||
        o.date > data.meta.asOf
      )
        fail("Invalid order dates");
      if (
        key === "orders" &&
        (!maps.customers.has(o.customerId) ||
          maps.customers.get(o.customerId).region !== o.region)
      )
        fail("Invalid order customer");
      if (o.status === "delivered") {
        if (
          !isISODate(o.deliveredAt) ||
          o.deliveredAt < o.date ||
          o.deliveredAt > data.meta.asOf
        )
          fail("Invalid completion date");
      } else if (o.deliveredAt !== null) fail("Open order has delivery date");
    }
  const seen = new Set();
  for (const d of data.deliveries) {
    if (!["sales", "purchase"].includes(d.type)) fail("Invalid delivery type");
    const key = d.type === "sales" ? "orders" : "purchaseOrders",
      order = maps[key].get(d.orderId),
      identity = key + "/" + d.orderId;
    if (
      !order ||
      seen.has(identity) ||
      order.status !== "delivered" ||
      order.supplierId !== d.supplierId ||
      order.productId !== d.productId ||
      order.region !== d.region ||
      order.promisedDate !== d.promisedDate ||
      order.deliveredAt !== d.deliveredAt ||
      !text(d.carrier) ||
      !isISODate(d.dispatchDate) ||
      d.dispatchDate < order.date ||
      d.dispatchDate > d.deliveredAt
    )
      fail("Inconsistent delivery");
    seen.add(identity);
  }
  for (const key of ["orders", "purchaseOrders"])
    for (const o of data[key])
      if (o.status === "delivered" && !seen.has(key + "/" + o.id))
        fail("Missing completed delivery");
  return data;
}
export async function loadData() {
  const response = await fetch(new URL("../data.json", import.meta.url), {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return validateData(await response.json());
}
/** Storage can be denied in private contexts; callers get an explicit warning instead of losing the session. */
export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem("flowpilot.v1." + key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeStorage(key, value) {
  try {
    localStorage.setItem("flowpilot.v1." + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** getRandomValues also works on local HTTP previews; randomUUID requires a secure context in browsers. */
export function createActionId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return (
    "ACT-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}
