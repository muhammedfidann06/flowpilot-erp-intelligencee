/** Recovery tests exercise failed HTTP, invalid data and the completely empty ERP state. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
const source = JSON.parse(
  readFileSync(new URL("../data.json", import.meta.url), "utf8"),
);
async function start(name, fetcher) {
  const dom = new JSDOM(
    '<div id="app"></div><div id="toast"></div><dialog id="dialog"></dialog>',
    { url: "https://example.org/repository/" },
  );
  for (const key of [
    "window",
    "document",
    "localStorage",
    "history",
    "location",
    "FormData",
  ])
    globalThis[key] = dom.window[key];
  globalThis.fetch = fetcher;
  await import("../src/main.js?boot=" + name);
  await new Promise(setImmediate);
  return dom;
}
test("HTTP failure shows retry and the retry actually recovers", async () => {
  let calls = 0;
  const original = console.error;
  console.error = () => {};
  try {
    await start("http", async () =>
      ++calls === 1
        ? { ok: false, status: 503 }
        : { ok: true, json: async () => structuredClone(source) },
    );
    assert.ok(document.querySelector('[role="alert"]'));
    document.querySelector('[data-action="retry"]').click();
    await new Promise(setImmediate);
    assert.ok(document.querySelector("#main"));
    assert.equal(calls, 2);
  } finally {
    console.error = original;
  }
});
test("malformed data produces an error screen rather than NaN KPIs", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    await start("bad-data", async () => ({
      ok: true,
      json: async () => ({ products: [] }),
    }));
    assert.ok(document.querySelector('[role="alert"]'));
    assert.equal(document.querySelector("#main"), null);
  } finally {
    console.error = original;
  }
});
test("all ten routes render safely for an intentionally empty dataset", async () => {
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
  await start("empty", async () => ({ ok: true, json: async () => empty }));
  for (const route of [
    "overview",
    "procurement",
    "inventory",
    "sales",
    "logistics",
    "insights",
    "explorer",
    "actions",
    "architecture",
    "home",
  ]) {
    document.querySelector(`a[href="#${route}"]`).click();
    assert.ok(document.querySelector("#main h1"));
    assert.ok(!document.querySelector("#main").textContent.includes("NaN"));
  }
});
