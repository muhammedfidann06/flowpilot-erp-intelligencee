/** Behavioral tests use small independent examples and relational invariants, not just snapshots of implementation. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateData } from "../src/data.js";
import { dictionary } from "../src/i18n.js";
import {
  metrics,
  insights,
  deliveryStats,
  inventoryRow,
  filterOrders,
  toCSV,
  days,
  previousPeriod,
  weeklyRevenue,
  sum,
} from "../src/engine.js";
const data = JSON.parse(
  readFileSync(new URL("../data.json", import.meta.url), "utf8"),
);
test("fixture is relational and meets promised entity volumes", () => {
  validateData(data);
  assert.equal(data.suppliers.length, 30);
  assert.equal(data.products.length, 120);
  assert.equal(data.customers.length, 24);
  assert.equal(data.orders.length, 360);
  assert.equal(data.purchaseOrders.length, 120);
  for (const d of data.deliveries) {
    const order = [...data.orders, ...data.purchaseOrders].find(
      (o) => o.id === d.orderId,
    );
    assert.equal(order.deliveredAt, d.deliveredAt);
    assert.equal(order.productId, d.productId);
    assert.equal(order.supplierId, d.supplierId);
  }
});
test("OTD excludes missing denominators and counts early delivery as on time", () => {
  assert.equal(deliveryStats([]).otd, null);
  const result = deliveryStats([
    {
      promisedDate: "2026-09-03",
      deliveredAt: "2026-09-02",
      dispatchDate: "2026-09-01",
    },
    {
      promisedDate: "2026-09-03",
      deliveredAt: "2026-09-05",
      dispatchDate: "2026-09-01",
    },
  ]);
  assert.equal(result.otd, 50);
  assert.equal(result.delay, 1);
  assert.equal(result.late, 1);
});
test("coverage excludes reservations; zero demand is not infinity", () => {
  const p = {
    stock: 20,
    reserved: 8,
    dailyDemand: 3,
    reorderPoint: 30,
    unitCost: 10,
  };
  assert.equal(inventoryRow(p).cover, 4);
  assert.equal(inventoryRow(p).value, 200);
  assert.equal(inventoryRow(p).risk, "high");
  assert.equal(inventoryRow({ ...p, dailyDemand: 0 }).cover, null);
  assert.equal(inventoryRow({ ...p, dailyDemand: 0 }).risk, "dead");
});
test("month boundary and UTC arithmetic are stable", () => {
  assert.equal(previousPeriod("2026-01"), "2025-12");
  assert.equal(days("2026-10-01", "2026-09-30"), 1);
});
test("recognized revenue uses delivery date, not order date", () => {
  const sample = {
    ...data,
    orders: [
      {
        date: "2026-08-29",
        deliveredAt: "2026-09-02",
        quantity: 2,
        unitPrice: 100,
        productId: data.products[0].id,
        status: "delivered",
      },
      {
        date: "2026-09-10",
        deliveredAt: null,
        quantity: 5,
        unitPrice: 100,
        productId: data.products[0].id,
        status: "open",
      },
    ],
  };
  assert.equal(metrics(sample, "2026-09").revenue, 200);
  assert.equal(metrics(sample, "2026-09").open, 1);
});
test("weekly revenue reconciles to headline revenue", () => {
  for (const p of ["2026-08", "2026-09"])
    assert.equal(
      sum(weeklyRevenue(data, p), (r) => r.value),
      metrics(data, p).revenue,
    );
});
test("all supplier findings have actual late evidence and exact impact calculations", () => {
  for (const i of insights(data, "2026-09").filter(
    (i) => i.type === "supplierRisk",
  )) {
    assert.ok(i.evidence.length);
    let total = 0;
    for (const id of i.evidence) {
      const o = data.purchaseOrders.find((o) => o.id === id);
      assert.equal(o.supplierId, i.entityId);
      assert.ok(o.deliveredAt > o.promisedDate);
      total +=
        days(o.deliveredAt, o.promisedDate) * o.quantity * o.unitCost * 0.005;
    }
    assert.ok(Math.abs(total - i.impact) < 1e-8);
  }
});
test("combined filters intersect and can produce an empty set", () => {
  const o = data.orders[190],
    p = data.products.find((p) => p.id === o.productId);
  const rows = filterOrders(data, {
    period: "2026-09",
    supplier: o.supplierId,
    product: o.productId,
    region: o.region,
    status: o.status,
    category: p.category,
    start: o.date,
    end: o.date,
  });
  assert.ok(rows.some((r) => r.id === o.id));
  assert.ok(
    rows.every((r) => r.productId === o.productId && r.date === o.date),
  );
  assert.equal(filterOrders(data, { query: "NONEXISTENT" }).length, 0);
  assert.equal(
    filterOrders(data, { start: "2026-10-01", end: "2026-09-01" }).length,
    0,
  );
});
test("CSV handles embedded comma/newline/quote and blocks formula injection", () => {
  const csv = toCSV(
    [{ v: "=SUM(1,2)" }, { v: 'A"B\nC' }, { v: "@cmd" }],
    [{ label: "Value", value: (r) => r.v }],
  );
  assert.ok(csv.startsWith('\uFEFF"Value"\r\n'));
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes('"A""B\nC"'));
  assert.ok(csv.includes('"\'@cmd"'));
});
test("three dictionaries have identical nonempty key sets", () => {
  for (const locale of ["tr", "en", "de"]) {
    assert.deepEqual(
      Object.keys(dictionary[locale]),
      Object.keys(dictionary.en),
    );
    assert.ok(
      Object.values(dictionary[locale]).every(
        (v) => typeof v === "string" && v.length > 0,
      ),
    );
  }
});
test("invalid references and duplicate IDs are rejected", () => {
  const bad = structuredClone(data);
  bad.products[0].supplierId = "bad";
  assert.throws(() => validateData(bad));
  const duplicate = structuredClone(data);
  duplicate.orders[1].id = duplicate.orders[0].id;
  assert.throws(() => validateData(duplicate));
});
test("precomputed API analytics exactly match the live client engine", () => {
  const cached = JSON.parse(
    readFileSync(new URL("../backend/analytics.json", import.meta.url), "utf8"),
  );
  for (const period of ["2026-08", "2026-09"]) {
    assert.deepEqual(cached[period].insights, insights(data, period));
    assert.deepEqual(cached[period].metrics, metrics(data, period));
  }
});
