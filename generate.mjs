/** Deterministic, relational fixtures: replayable evidence matters more than impressive hard-coded KPIs. */
import { writeFileSync } from "node:fs";
let seed = 87261;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const pick = (a) => a[Math.floor(random() * a.length)];
const integer = (a, b) => a + Math.floor(random() * (b - a + 1));
const date = (month, day) =>
  `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const addDays = (d, n) =>
  new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const names = [
  "Nordwerk",
  "Alpen Precision",
  "Rhein Components",
  "Baltic Systems",
  "Kern Industrial",
  "Atlas Motion",
  "Elbe Controls",
  "Vektor Steel",
  "Arden Electronics",
  "Helix Drives",
  "MainTech",
  "Bergmann",
  "Linden Parts",
  "Delta Works",
  "Falken",
  "Orion Supply",
  "Novak",
  "Boreal",
  "Silva",
  "Kobalt",
  "Aster",
  "Meridian",
  "Eichen",
  "Lumex",
  "Westfalen",
  "Prisma",
  "Riva",
  "Sonnen",
  "Duran",
  "Alto",
];
const suppliers = names.map((name, i) => ({
  id: `SUP-${String(i + 1).padStart(3, "0")}`,
  name: name + (i % 3 === 0 ? " GmbH" : i % 3 === 1 ? " AG" : " Industries"),
  region: ["DACH", "Benelux", "Nordics", "CEE"][i % 4],
  leadTime: 7 + (i % 9),
  paymentDays: 30 + (i % 3) * 15,
}));
const productNames = [
  "Precision sensor",
  "Servo motor",
  "Control valve",
  "Drive module",
  "Steel housing",
  "Power relay",
  "Optical encoder",
  "Hydraulic pump",
  "Circuit board",
  "Bearing assembly",
  "Thermal probe",
  "Pneumatic seal",
];
const products = Array.from({ length: 120 }, (_, i) => {
  const demand = integer(2, 14),
    stock =
      i % 13 === 0
        ? integer(8, 30)
        : i % 11 === 0
          ? integer(900, 1500)
          : integer(80, 500);
  return {
    id: `SKU-${String(i + 1).padStart(4, "0")}`,
    name: productNames[i % 12] + " " + (200 + i),
    supplierId: suppliers[i % 30].id,
    category: ["sensors", "motion", "mechanical", "electronics"][i % 4],
    unitCost: integer(15, 300),
    unitPrice: integer(350, 650),
    stock,
    reserved: Math.min(stock, integer(0, 35)),
    dailyDemand: i % 19 === 0 ? 0 : demand,
    reorderPoint: demand * (suppliers[i % 30].leadTime + 4),
  };
});
const customers = Array.from({ length: 24 }, (_, i) => ({
  id: `CUS-${String(i + 1).padStart(3, "0")}`,
  name:
    ["Apex", "Mittel", "Vertex", "Union", "Terra", "Nova"][i % 6] +
    " " +
    ["Automotive", "Engineering", "Robotics", "Industries"][Math.floor(i / 6)],
  region: ["DACH", "Benelux", "Nordics", "CEE"][i % 4],
}));
const orders = [],
  purchaseOrders = [],
  deliveries = [];
for (let i = 0; i < 360; i++) {
  const month = i < 180 ? 8 : 9,
    product = pick(products),
    customer = pick(customers),
    created = date(month, integer(1, 24)),
    promised = addDays(created, integer(2, 5));
  let open = month === 9 && i % 5 === 0;
  const late = month === 9 ? i % 4 === 0 : i % 9 === 0;
  let deliveredAt = open
    ? null
    : addDays(promised, late ? integer(1, 5) : -integer(0, 1));
  if (deliveredAt > "2026-09-30") {
    deliveredAt = null;
    open = true;
  }
  const row = {
    id: `SO-${26001 + i}`,
    productId: product.id,
    customerId: customer.id,
    supplierId: product.supplierId,
    quantity: integer(1, 12),
    unitPrice: product.unitPrice,
    date: created,
    promisedDate: promised,
    deliveredAt,
    status: open ? (i % 2 ? "processing" : "open") : "delivered",
    region: customer.region,
  };
  orders.push(row);
  if (!open)
    deliveries.push({
      id: `DEL-${deliveries.length + 1}`,
      orderId: row.id,
      type: "sales",
      supplierId: row.supplierId,
      productId: product.id,
      carrier: ["DHL Freight", "DB Schenker", "DACHSER"][i % 3],
      region: row.region,
      dispatchDate: created,
      promisedDate: promised,
      deliveredAt,
    });
}
for (let i = 0; i < 120; i++) {
  const month = i < 60 ? 8 : 9,
    supplier = suppliers[i % 30],
    product = pick(products.filter((p) => p.supplierId === supplier.id)),
    created = date(month, integer(1, 10)),
    promised = addDays(created, supplier.leadTime);
  let open = month === 9 && i % 11 === 0;
  const late = month === 9 ? i % 30 < 5 || i % 7 === 0 : i % 13 === 0;
  let deliveredAt = open ? null : addDays(promised, late ? integer(3, 8) : 0);
  if (deliveredAt > "2026-09-30") {
    deliveredAt = null;
    open = true;
  }
  const row = {
    id: `PO-${46001 + i}`,
    supplierId: supplier.id,
    productId: product.id,
    quantity: integer(20, 80),
    unitCost: Math.round(
      product.unitCost * (month === 9 && i % 30 < 5 ? 1.12 : 1),
    ),
    date: created,
    promisedDate: promised,
    deliveredAt,
    status: open ? "open" : "delivered",
    region: supplier.region,
  };
  purchaseOrders.push(row);
  if (!open)
    deliveries.push({
      id: `DEL-${deliveries.length + 1}`,
      orderId: row.id,
      type: "purchase",
      supplierId: supplier.id,
      productId: product.id,
      carrier: ["DHL Freight", "DB Schenker", "DACHSER"][i % 3],
      region: row.region,
      dispatchDate: created,
      promisedDate: promised,
      deliveredAt,
    });
}
// This snapshot is deliberately dated: no claim that synthetic data describes today's business.
writeFileSync(
  new URL("../dist/data.json", import.meta.url),
  JSON.stringify(
    {
      meta: {
        company: "Demo Manufacturing GmbH",
        asOf: "2026-09-30",
        currency: "EUR",
        seed: 87261,
        synthetic: true,
      },
      suppliers,
      products,
      customers,
      orders,
      purchaseOrders,
      deliveries,
    },
    null,
    2,
  ),
);
