/** Independent malformed-field cases protect the public data boundary against partial/corrupt future fixtures. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateData, isISODate } from "../src/data.js";
import { deliveryStats, weeklyRevenue, toCSV } from "../src/engine.js";
const source = JSON.parse(
  readFileSync(new URL("../data.json", import.meta.url), "utf8"),
);
function rejects(name, edit) {
  test(name, () => {
    const data = structuredClone(source);
    edit(data);
    assert.throws(() => validateData(data));
  });
}
for (const group of [
  "suppliers",
  "products",
  "customers",
  "orders",
  "purchaseOrders",
  "deliveries",
]) {
  for (const value of [null, {}, "wrong"])
    rejects(
      `${group}: rejects non-array ${JSON.stringify(value)}`,
      (d) => (d[group] = value),
    );
  for (const value of [null, "", 42])
    rejects(
      `${group}: rejects ID ${JSON.stringify(value)}`,
      (d) => (d[group][0].id = value),
    );
  rejects(
    `${group}: rejects duplicate ID`,
    (d) => (d[group][1].id = d[group][0].id),
  );
  rejects(`${group}: rejects null row`, (d) => (d[group][0] = null));
}
for (const [group, fields] of [
  [
    "products",
    [
      "stock",
      "reserved",
      "unitCost",
      "unitPrice",
      "dailyDemand",
      "reorderPoint",
    ],
  ],
  ["suppliers", ["leadTime", "paymentDays"]],
  ["orders", ["quantity", "unitPrice"]],
  ["purchaseOrders", ["quantity", "unitCost"]],
]) {
  for (const field of fields)
    for (const value of [-1, null, "5", Infinity, NaN])
      rejects(
        `${group}.${field}: rejects ${String(value)} (${typeof value})`,
        (d) => (d[group][0][field] = value),
      );
}
for (const group of ["orders", "purchaseOrders"])
  for (const field of ["date", "promisedDate", "deliveredAt"])
    for (const value of ["2026-02-31", "2026-13-01", "bad", null])
      rejects(
        `${group}.${field}: rejects ${value}`,
        (d) => (d[group].find((o) => o.status === "delivered")[field] = value),
      );
for (const field of [
  "supplierId",
  "productId",
  "orderId",
  "carrier",
  "region",
  "type",
  "dispatchDate",
  "promisedDate",
  "deliveredAt",
])
  rejects(
    `delivery consistency: ${field}`,
    (d) => (d.deliveries[0][field] = field === "carrier" ? "" : "invalid"),
  );
rejects("completed orders need a delivery record", (d) => d.deliveries.shift());
rejects("future completed delivery cannot precede the snapshot", (d) => {
  d.meta.asOf = "2026-08-01";
});
rejects(
  "invalid customer cannot enter sales aggregates",
  (d) => (d.orders[0].customerId = "missing"),
);
rejects("missing metadata rejected", (d) => delete d.meta);
rejects("unsupported currency rejected", (d) => (d.meta.currency = "USD"));
rejects(
  "reservations cannot exceed stock",
  (d) => (d.products[0].reserved = d.products[0].stock + 1),
);
for (const date of [
  "2026-02-31",
  "2025-02-29",
  "2026-00-10",
  "2026-12-32",
  "0000-00-00",
  "09/01/2026",
])
  test(`strict calendar rejects ${date}`, () =>
    assert.equal(isISODate(date), false));
test("leap day validation accepts actual leap years", () =>
  assert.equal(isISODate("2024-02-29"), true));
test("an intentionally empty dataset is a valid empty state", () => {
  const empty = {
    meta: source.meta,
    ...Object.fromEntries(
      [
        "suppliers",
        "products",
        "customers",
        "orders",
        "purchaseOrders",
        "deliveries",
      ].map((k) => [k, []]),
    ),
  };
  assert.equal(validateData(empty), empty);
});
test("open receipts do not inflate delivery reliability", () =>
  assert.equal(deliveryStats([{ deliveredAt: null }]).count, 0));
test("February weekly chart has no impossible 29–28 interval", () =>
  assert.equal(weeklyRevenue({ orders: [] }, "2026-02").length, 4));
for (const prefix of ["=", "+", "-", "@", " =", "\t=", "\n@", "\uFEFF="])
  test(`CSV neutralizes formula prefix ${JSON.stringify(prefix)}`, () => {
    const csv = toCSV(
      [{ value: prefix + "SUM(1,1)" }],
      [{ label: "value", value: (r) => r.value }],
    );
    assert.ok(csv.split("\r\n")[1].startsWith("\"'"));
  });

test("action IDs use full cryptographic entropy and do not require randomUUID", async () => {
  const { createActionId } = await import("../src/data.js");
  const id = createActionId();
  assert.match(id, /^ACT-[0-9a-f]{32}$/);
  assert.notEqual(id, createActionId());
});
