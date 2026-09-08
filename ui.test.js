/** DOM integration tests (jsdom, not a real browser). They exercise actual rendered controls and events. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
const data = JSON.parse(
  readFileSync(new URL("../data.json", import.meta.url), "utf8"),
);
const dom = new JSDOM(
  '<!doctype html><html><body><div id="app"></div><div id="toast"></div><dialog id="dialog"></dialog></body></html>',
  { url: "https://example.org/portfolio/flowpilot/" },
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
// jsdom does not implement native dialog lifecycle; visibility is shimmed, browser focus trapping is not claimed.
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
globalThis.fetch = async () => ({
  ok: true,
  json: async () => structuredClone(data),
});
await import("../src/main.js");
await new Promise((resolve) => setTimeout(resolve, 20));
const $ = (q) => document.querySelector(q);
const click = (q) => {
  const node = $(q);
  assert.ok(node, `Missing control: ${q}`);
  node.click();
};
const change = (q, value) => {
  const node = $(q);
  assert.ok(node, q);
  node.value = value;
  node.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
};
const route = (name) => click(`a[href="#${name}"]`);

test("every module renders localized content in all three languages", () => {
  for (const locale of ["tr", "en", "de"]) {
    change("#language", locale);
    for (const name of [
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
      route(name);
      assert.ok($("#main h1").textContent.length);
      assert.equal(document.documentElement.lang, locale);
      assert.ok(!$("#main").textContent.includes("undefined"));
      assert.ok(!$("#main").textContent.includes("NaN"));
      assert.ok(!$("#main").textContent.includes("[object Object]"));
    }
  }
});
test("procurement tabs and supplier details resolve real records", () => {
  route("procurement");
  click('tbody [data-action="record"]');
  assert.ok($("#dialog").textContent.includes(data.suppliers[0].name));
  assert.ok($("#dialog .related-list button"));
  click('#dialog [data-action="close"]');
  click('[data-tab="purchaseOrders"]');
  assert.match($("tbody").textContent, /PO-/);
});
test("stock filter changes visible results and record opens coverage evidence", () => {
  route("inventory");
  change('[data-filter][name="risk"]', "high");
  assert.ok(
    [...document.querySelectorAll("tbody .badge")].every((n) =>
      n.classList.contains("high"),
    ),
  );
  click('tbody [data-action="record"]');
  assert.ok($("#dialog .detail-grid").textContent.includes("SKU") === false);
  assert.ok($("#dialog .detail-grid dd"));
  click('#dialog [data-action="close"]');
});
test("explorer applies status and date filters, hides a column and resets", () => {
  route("explorer");
  change('[name="status"]', "open");
  assert.ok(
    [...document.querySelectorAll("tbody .badge")].every((n) =>
      n.classList.contains("open"),
    ),
  );
  const oldHeaders = document.querySelectorAll("thead th").length;
  const checkbox = $('[data-column="customer"]');
  checkbox.checked = false;
  checkbox.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  assert.equal(document.querySelectorAll("thead th").length, oldHeaders - 1);
  change('[name="start"]', "2026-10-01");
  assert.ok($("tbody .empty"));
  click('[data-action="clear"]');
  assert.ok(!$("tbody .empty"));
});
test("global search and Ctrl+K return records and open details", () => {
  document.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    }),
  );
  assert.ok($("#dialog").open);
  $("#global-search").value = "SO-26001";
  $("#global-search").dispatchEvent(
    new dom.window.Event("input", { bubbles: true }),
  );
  assert.equal($("#search-results [data-id]").dataset.id, "SO-26001");
  click("#search-results [data-id]");
  assert.ok($("#dialog").textContent.includes("SO-26001"));
  click('#dialog [data-action="close"]');
});
test("insight → evidence → action → persisted status is a working flow", () => {
  route("insights");
  click('[data-action="insight"]');
  assert.ok($("#dialog .analysis-chain").textContent.length > 100);
  assert.ok($("#dialog .evidence-links [data-id]"));
  click('#dialog [data-action="createAction"]');
  const form = $("#action-form");
  assert.ok(form);
  form.elements.owner.value = "Muhammet";
  form.elements.notes.value = "<script>alert(1)</script>";
  form.elements.due.value = "2026-10-04";
  form.elements.status.value = "doing";
  form.dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true }),
  );
  route("actions");
  assert.equal(document.querySelectorAll(".action-card").length, 1);
  assert.ok($(".action-card").textContent.includes("Muhammet"));
  assert.equal(
    JSON.parse(localStorage.getItem("flowpilot.v1.actions"))[0].status,
    "doing",
  );
  click('[data-action="editAction"]');
  assert.equal(
    $("#action-form").elements.notes.value,
    "<script>alert(1)</script>",
  );
  assert.equal($("#dialog script"), null);
  click('[data-action="deleteAction"]');
  click('[data-action="confirmDelete"]');
  assert.equal(document.querySelectorAll(".action-card").length, 0);
});
test("mark-read is persistent and removes the unread badge", () => {
  click('[data-action="notifications"]');
  click('#dialog [data-action="markRead"]');
  assert.equal($(".notification-count"), null);
  assert.ok(JSON.parse(localStorage.getItem("flowpilot.v1.read")).length > 0);
  click('#dialog [data-action="close"]');
});
test("period changes recognized revenue and persists language choice", () => {
  route("overview");
  const before = $(".metric strong").textContent;
  change("#period", "2026-08");
  assert.notEqual($(".metric strong").textContent, before);
  assert.equal(JSON.parse(localStorage.getItem("flowpilot.v1.lang")), "de");
});
test("tabs support keyboard navigation and logistics detail is real", () => {
  route("logistics");
  const tab = $('[data-tab="carriers"]');
  tab.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
    }),
  );
  assert.equal(
    $('[data-tab="regional"]').getAttribute("aria-selected"),
    "true",
  );
  click('[data-tab="deliveries"]');
  click('tbody [data-action="record"]');
  assert.ok($("#dialog").textContent.includes("DEL-"));
  click('#dialog [data-action="close"]');
});

test("dialog is named and closing returns focus to an attached element", () => {
  route("insights");
  click('[data-action="insight"]');
  assert.equal($("#dialog").getAttribute("aria-labelledby"), "dialog-title");
  click('#dialog [data-action="close"]');
  assert.ok(document.activeElement.isConnected);
});
test("mobile menu closes with Escape and hidden navigation is inert", () => {
  Object.defineProperty(window, "innerWidth", {
    value: 390,
    configurable: true,
  });
  window.dispatchEvent(new dom.window.Event("resize"));
  assert.equal($(".sidebar").inert, true);
  click('[data-action="menu"]');
  assert.equal($(".sidebar").inert, false);
  document.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert.equal($(".sidebar").inert, true);
  Object.defineProperty(window, "innerWidth", {
    value: 1024,
    configurable: true,
  });
  window.dispatchEvent(new dom.window.Event("resize"));
});
test("unknown-demand CSV coverage is blank instead of Infinity", async () => {
  route("inventory");
  change('[data-filter][name="risk"]', "dead");
  let exported;
  const originalCreate = URL.createObjectURL,
    originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = (blob) => {
    exported = blob;
    return "blob:test";
  };
  URL.revokeObjectURL = () => {};
  const stop = (event) => {
    if (event.target.closest("a[download]")) event.preventDefault();
  };
  document.addEventListener("click", stop);
  click('[data-action="export"]');
  const csv = await exported.text();
  assert.ok(!csv.includes("Infinity"));
  assert.ok(csv.includes('""'));
  document.removeEventListener("click", stop);
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});
test("storage failure cannot be overwritten by an optimistic success toast", () => {
  const prototype = Object.getPrototypeOf(localStorage),
    original = prototype.setItem;
  prototype.setItem = () => {
    throw new Error("QuotaExceeded");
  };
  try {
    route("insights");
    click('[data-action="insight"]');
    click('[data-action="createAction"]');
    assert.ok($("#dialog .storage-warning"));
    assert.ok($("#toast").textContent.includes("Browserspeicher"));
    $("#action-form").dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
    assert.ok($(".storage-warning"));
    assert.ok($("#toast").textContent.includes("Browserspeicher"));
  } finally {
    prototype.setItem = original;
  }
});
