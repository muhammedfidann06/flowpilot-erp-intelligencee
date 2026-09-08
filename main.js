/** Application composition and events. Business formulas live in engine.js, not in templates. */
import {
  loadData,
  readStorage,
  writeStorage,
  isISODate,
  createActionId,
} from "./data.js";
import { translate, locales } from "./i18n.js";
import {
  sum,
  mean,
  days,
  inPeriod,
  delta,
  previousPeriod,
  deliveryStats,
  lateDays,
  inventoryRow,
  supplierRows,
  metrics,
  insights,
  filterOrders,
  toCSV,
  weeklyRevenue,
} from "./engine.js";
const app = document.querySelector("#app"),
  dialog = document.querySelector("#dialog");
const routes = [
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
];
const storedActions = readStorage("actions", []);
const state = {
  data: null,
  lang: locales.includes(readStorage("lang", "tr"))
    ? readStorage("lang", "tr")
    : "tr",
  period: "2026-09",
  route: routes.includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "overview",
  tab: "",
  page: 1,
  sort: "",
  direction: 1,
  filters: {},
  columns: [
    "id",
    "date",
    "product",
    "customer",
    "supplier",
    "amount",
    "status",
  ],
  actions: Array.isArray(storedActions)
    ? storedActions.filter(
        (a) =>
          a &&
          typeof a.id === "string" &&
          typeof a.insightId === "string" &&
          typeof a.type === "string" &&
          typeof a.entity === "string" &&
          typeof a.owner === "string" &&
          typeof a.notes === "string" &&
          typeof a.due === "string" &&
          (!a.due || isISODate(a.due)) &&
          ["todo", "doing", "done"].includes(a.status),
      )
    : [],
  read: Array.isArray(readStorage("read", [])) ? readStorage("read", []) : [],
  mobile: false,
  modal: null,
};
const t = (k) => translate(state.lang, k);
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (v, d = 0) =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat(
        { tr: "tr-TR", en: "en-GB", de: "de-DE" }[state.lang],
        { maximumFractionDigits: d },
      ).format(v);
const money = (v) =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat(
        { tr: "tr-TR", en: "en-IE", de: "de-DE" }[state.lang],
        { style: "currency", currency: "EUR", maximumFractionDigits: 0 },
      ).format(v);
const date = (v) =>
  v
    ? new Intl.DateTimeFormat(
        { tr: "tr-TR", en: "en-GB", de: "de-DE" }[state.lang],
        { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" },
      ).format(new Date(v + "T00:00:00Z"))
    : "—";
const badge = (v) => `<span class="badge ${e(v)}">${e(t(v))}</span>`;
const btn = (label, action, extra = "", className = "button") =>
  `<button class="${className}" data-action="${action}" ${extra}>${label}</button>`;
const link = (id, label) =>
  `<button class="record-link" data-action="record" data-id="${e(id)}">${e(label ?? id)}</button>`;
const find = (key, id) => state.data[key].find((r) => r.id === id);
const allInsights = () => insights(state.data, state.period);
const icons = {
  overview: "▦",
  procurement: "↙",
  inventory: "▤",
  sales: "↗",
  logistics: "⇄",
  insights: "◈",
  explorer: "⊞",
  actions: "☑",
  architecture: "⌘",
  home: "↗",
};
const metric = (label, value, note = "") =>
  `<article class="metric"><div class="muted">${e(t(label))}</div><strong>${value}</strong><small>${note}</small></article>`;
/** Format a comparison with a visible missing-baseline state instead of inventing percentage growth. */
function compare(now, before, pp = false) {
  if (before === null || before === undefined || (!before && !pp))
    return e(t("noBaseline"));
  const change = pp ? now - before : delta(now, before);
  return `<span class="change">${change > 0 ? "+" : ""}${fmt(change, 1)}${pp ? " " + e(t("percentPoints")) : "%"}</span> ${e(t("vsPrevious"))}`;
}
/** Announce feedback through a live region and clear stale timers when actions happen quickly. */
const pendingWrites = new Set();
function toast(message) {
  if (pendingWrites.size) message = t("storageFail");
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 3800);
}
/** Keep local work across reloads and warn explicitly if the browser denies storage. */
function persist(key) {
  if (writeStorage(key, state[key])) {
    pendingWrites.delete(key);
    return true;
  }
  pendingWrites.add(key);
  toast(t("storageFail"));
  return false;
}
/** Reset route-specific table state so filters cannot silently leak between modules. */
function setRoute(route, push = true) {
  if (!routes.includes(route)) return;
  state.route = route;
  state.tab = "";
  state.page = 1;
  state.sort = "";
  state.filters = {};
  state.mobile = false;
  if (push && location.hash !== "#" + route)
    history.pushState(null, "", "#" + route);
  render();
  document.querySelector("#main")?.focus({ preventScroll: true });
  document.scrollingElement?.scrollTo({ top: 0, behavior: "instant" });
}
/** Every record table shares semantic headers, keyboard-operable sorting and real pagination. */
let currentExport = { rows: [], columns: [] };
function table(rows, columns, { paginate = true, exportable = true } = {}) {
  let sorted = [...rows];
  const col = columns.find((c) => c.key === state.sort);
  if (col)
    sorted.sort((a, b) => {
      const x = col.value(a),
        y = col.value(b);
      if (x == null) return y == null ? 0 : 1;
      if (y == null) return -1;
      return (
        state.direction *
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x ?? "").localeCompare(String(y ?? ""), state.lang))
      );
    });
  if (exportable)
    currentExport = {
      rows: sorted,
      columns: columns.map((c) => ({ ...c, label: t(c.label) })),
    };
  const pages = Math.max(1, Math.ceil(sorted.length / 10));
  state.page = Math.min(state.page, pages);
  const visible = paginate
    ? sorted.slice((state.page - 1) * 10, state.page * 10)
    : sorted;
  return `<div class="table-scroll"><table><thead><tr>${columns.map((c) => `<th scope="col" aria-sort="${state.sort === c.key ? (state.direction === 1 ? "ascending" : "descending") : "none"}"><button data-action="sort" data-key="${c.key}">${e(t(c.label))}<span aria-hidden="true">${state.sort === c.key ? (state.direction === 1 ? " ↑" : " ↓") : " ↕"}</span></button></th>`).join("")}</tr></thead><tbody>${visible.map((r) => `<tr>${columns.map((c) => `<td>${c.render ? c.render(r) : e(c.value(r))}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${columns.length}" class="empty">${e(t("noResults"))}</td></tr>`}</tbody></table></div>${paginate ? `<div class="pagination"><span>${fmt(sorted.length)} ${e(t("records"))}</span><div>${btn("← " + e(t("previous")), "page", 'data-step="-1" ' + (state.page === 1 ? "disabled" : ""), "button quiet")}<span>${state.page} ${e(t("of"))} ${pages}</span>${btn(e(t("next")) + " →", "page", 'data-step="1" ' + (state.page === pages ? "disabled" : ""), "button quiet")}</div></div>` : ""}`;
}
/** Accessible CSS bars include exact values and native tooltips; no data is baked into the drawing. */
function chart(title, subtitle, rows, format = fmt) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return `<section class="panel chart"><div class="panel-heading"><div><h2>${e(t(title))}</h2><p>${e(t(subtitle))}</p></div></div><div class="bars">${rows.map((r) => `<div class="bar-row" title="${e(r.label)}: ${e(format(r.value))}"><span>${e(r.label)}</span><div class="track"><div class="bar" style="width:${Math.max(0, (r.value / max) * 100)}%"></div></div><b>${e(format(r.value))}</b></div>`).join("") || `<p class="empty">${e(t("noResults"))}</p>`}</div><div class="legend"><i></i>${e(t("chartLegend"))}</div></section>`;
}
/** Generate a labeled constrained picker from real entity options. */
function select(name, label, options, value = "", extra = "") {
  return `<label class="field">${e(t(label))}<select name="${name}" ${extra}><option value="">${e(t("all"))}</option>${options.map((o) => `<option value="${e(o.value)}" ${o.value === value ? "selected" : ""}>${e(o.label)}</option>`).join("")}</select></label>`;
}
/** Keep page context and export placement identical across the operational modules. */
function head(title, subtitle, exportable = false) {
  return `<header class="page-heading"><div><div class="eyebrow">${e(t("intelligence"))}</div><h1>${e(t(title))}</h1><p>${e(t(subtitle))}</p></div>${exportable ? btn("↓ " + e(t("export")), "export") : ""}</header>`;
}
/** Expose mutually exclusive dataset views using accessible tab semantics. */
function tabs(options) {
  return `<div class="tabs" role="tablist">${options.map((id, i) => `<button role="tab" aria-selected="${(state.tab || options[0]) === id}" tabindex="${(state.tab || options[0]) === id ? 0 : -1}" data-action="tab" data-tab="${id}">${e(t(id))}</button>`).join("")}</div>`;
}
/** Render ranked engine findings; the investigate control carries the stable finding ID. */
function insightCards(items, limit = items.length) {
  return `<div class="insight-list">${
    items
      .slice(0, limit)
      .map(
        (item) =>
          `<article class="insight-row"><div>${badge(item.severity)}</div><div class="insight-main"><h3>${e(t(item.type))}</h3><p>${e(item.entity || t("sales"))}</p><small>${item.type === "supplierRisk" ? `${fmt(item.affected)} ${e(t("lateOrders"))} · ${fmt(item.current, 0)}% ${e(t("otd"))}` : item.type === "stockRisk" ? `${fmt(item.cover, 1)} ${e(t("days"))} · ${e(t("cover"))}` : `${fmt(item.current, 1)}% ${e(t("vsPrevious"))}`}</small></div><div class="impact">${item.impact === null ? "" : `<strong>${money(item.impact)}</strong><small>${e(t("impact"))}</small>`}</div>${btn(e(t("investigate")) + " ↗", "insight", `data-id="${e(item.id)}"`, "button quiet")}</article>`,
      )
      .join("") || `<div class="empty">${e(t("noResults"))}</div>`
  }</div>`;
}
/** Compose the operation summary from actual period aggregates and explanatory charts. */
function overview() {
  const m = metrics(state.data, state.period),
    p = metrics(state.data, previousPeriod(state.period)),
    items = allInsights();
  return (
    head("overview", "overviewSub") +
    `<section class="metrics six">${metric("revenue", money(m.revenue), compare(m.revenue, p.revenue))}${metric("inventoryValue", money(m.inventory), e(t("currentSnapshot")))}${metric("openOrders", fmt(m.open), compare(m.open, p.open))}${metric("otd", fmt(m.otd, 1) + "%", compare(m.otd, p.otd, true))}${metric("critical", fmt(items.filter((i) => i.severity === "high").length), e(t("snapshotOnly")))}${metric("turnover", fmt(m.turnover, 2) + "×", e(t("estimate")))}</section><section class="panel priority"><div class="panel-heading"><div><h2>${e(t("attention"))} <span class="count">${items.length}</span></h2><p>${e(t("attentionSub"))}</p></div><a href="#insights">${e(t("viewAll"))} →</a></div>${insightCards(items, 4)}</section><div class="two-col">${chart("salesTrend", "salesTrendSub", weeklyRevenue(state.data, state.period), money)}${chart(
      "supplierChart",
      "supplierChartSub",
      supplierRows(state.data, state.period)
        .filter((s) => s.late)
        .sort((a, b) => b.late - a.late)
        .slice(0, 5)
        .map((s) => ({ label: s.name, value: s.late })),
    )}</div>`
  );
}
const orderColumns = () => [
  { key: "id", label: "orders", value: (o) => o.id, render: (o) => link(o.id) },
  {
    key: "date",
    label: "date",
    value: (o) => o.date,
    render: (o) => e(date(o.date)),
  },
  {
    key: "product",
    label: "product",
    value: (o) => find("products", o.productId).name,
    render: (o) => link(o.productId, find("products", o.productId).name),
  },
  {
    key: "customer",
    label: "customer",
    value: (o) => find("customers", o.customerId)?.name ?? "",
    render: (o) => link(o.customerId, find("customers", o.customerId)?.name),
  },
  {
    key: "supplier",
    label: "supplier",
    value: (o) => find("suppliers", o.supplierId).name,
    render: (o) => link(o.supplierId, find("suppliers", o.supplierId).name),
  },
  { key: "quantity", label: "quantity", value: (o) => o.quantity },
  {
    key: "amount",
    label: "amount",
    value: (o) => o.quantity * (o.unitPrice ?? o.unitCost),
    render: (o) => money(o.quantity * (o.unitPrice ?? o.unitCost)),
  },
  {
    key: "status",
    label: "status",
    value: (o) => t(o.status),
    render: (o) => badge(o.status),
  },
];
/** Join purchase commitments with completed-receipt reliability without mixing their denominators. */
function procurement() {
  const rows = supplierRows(state.data, state.period),
    pos = state.data.purchaseOrders.filter((o) =>
      inPeriod(o.date, state.period),
    );
  const selected = state.tab || "suppliers";
  return (
    head("procurement", "procurementSub", true) +
    `<section class="metrics">${metric("spend", money(sum(rows, (s) => s.spend)))}${metric("suppliers", fmt(rows.length))}${metric("openOrders", fmt(pos.filter((o) => o.status !== "delivered").length))}${metric("lateOrders", fmt(sum(rows, (s) => s.late)))}</section><section class="panel">${tabs(["suppliers", "purchaseOrders"])}${
      selected === "suppliers"
        ? table(rows, [
            {
              key: "name",
              label: "supplier",
              value: (s) => s.name,
              render: (s) => link(s.id, s.name),
            },
            { key: "orders", label: "orders", value: (s) => s.orders },
            {
              key: "otd",
              label: "otd",
              value: (s) => s.otd,
              render: (s) => (s.otd === null ? "—" : fmt(s.otd, 1) + "%"),
            },
            {
              key: "delay",
              label: "avgDelay",
              value: (s) => s.delay,
              render: (s) => fmt(s.delay, 1) + " " + e(t("days")),
            },
            {
              key: "spend",
              label: "spend",
              value: (s) => s.spend,
              render: (s) => money(s.spend),
            },
            {
              key: "risk",
              label: "risk",
              value: (s) => t(s.risk),
              render: (s) => badge(s.risk),
            },
          ])
        : table(
            pos,
            orderColumns().filter((c) => c.key !== "customer"),
          )
    }</section>`
  );
}
/** Display the dated stock snapshot and filter the derived replenishment classifications. */
function inventory() {
  const items = state.data.products.map(inventoryRow),
    rows = items.filter(
      (p) => !state.filters.risk || p.risk === state.filters.risk,
    );
  return (
    head("inventory", "inventorySub", true) +
    `<section class="metrics">${metric("inventoryValue", money(sum(items, (p) => p.value)))}${metric("lowStock", fmt(items.filter((p) => ["high", "medium"].includes(p.risk)).length))}${metric("overstock", fmt(items.filter((p) => p.risk === "overstock").length))}${metric("deadStock", fmt(items.filter((p) => p.risk === "dead").length))}</section><p class="data-note">${e(t("stockHistory"))} ${e(t("snapshot"))}</p><section class="panel"><div class="filter-bar">${select(
      "risk",
      "risk",
      ["high", "medium", "low", "overstock", "dead"].map((value) => ({
        value,
        label: t(value),
      })),
      state.filters.risk,
      "data-filter",
    )}</div>${table(rows, [
      {
        key: "name",
        label: "product",
        value: (p) => p.name,
        render: (p) => link(p.id, p.name),
      },
      { key: "stock", label: "stock", value: (p) => p.stock },
      { key: "reserved", label: "reserved", value: (p) => p.reserved },
      { key: "available", label: "available", value: (p) => p.available },
      {
        key: "cover",
        label: "cover",
        value: (p) => p.cover,
        render: (p) =>
          p.cover === null ? "—" : fmt(p.cover, 1) + " " + e(t("days")),
      },
      {
        key: "value",
        label: "inventoryValue",
        value: (p) => p.value,
        render: (p) => money(p.value),
      },
      {
        key: "risk",
        label: "risk",
        value: (p) => t(p.risk),
        render: (p) => badge(p.risk),
      },
    ])}</section>${chart(
      "stockQuestion",
      "stockChartSub",
      items
        .filter((p) => p.cover !== null)
        .sort((a, b) => a.cover - b.cover)
        .slice(0, 8)
        .map((p) => ({ label: p.name, value: p.cover })),
      (v) => fmt(v, 1),
    )}`
  );
}
/** Aggregate recognized revenue by customer or product using delivery dates. */
function sales() {
  const m = metrics(state.data, state.period),
    orders = state.data.orders.filter((o) =>
      inPeriod(o.deliveredAt, state.period),
    ),
    tab = state.tab || "customers";
  const entities =
    tab === "products" ? state.data.products : state.data.customers;
  const rows = entities
    .map((x) => ({
      ...x,
      total: sum(
        orders.filter(
          (o) => (tab === "products" ? o.productId : o.customerId) === x.id,
        ),
        (o) => o.quantity * o.unitPrice,
      ),
      count: orders.filter(
        (o) => (tab === "products" ? o.productId : o.customerId) === x.id,
      ).length,
    }))
    .filter((x) => x.count)
    .sort((a, b) => b.total - a.total);
  return (
    head("sales", "salesSub", true) +
    `<section class="metrics">${metric("revenue", money(m.revenue))}${metric("aov", money(m.aov))}${metric("orders", fmt(orders.length), e(t("delivered")))}${metric("customers", fmt(new Set(orders.map((o) => o.customerId)).size))}</section>${chart("salesTrend", "salesTrendSub", weeklyRevenue(state.data, state.period), money)}<section class="panel">${tabs(["customers", "products", "orders"])}${
      tab === "orders"
        ? table(
            orders,
            orderColumns().filter((c) => c.key !== "supplier"),
          )
        : table(rows, [
            {
              key: "name",
              label: tab === "products" ? "product" : "customer",
              value: (r) => r.name,
              render: (r) => link(r.id, r.name),
            },
            { key: "count", label: "orders", value: (r) => r.count },
            {
              key: "total",
              label: "revenue",
              value: (r) => r.total,
              render: (r) => money(r.total),
            },
          ])
    }</section>`
  );
}
/** Compare sales delivery cohorts by carrier or region, with record-level drilldown. */
function logistics() {
  const rows = state.data.deliveries.filter(
      (d) => d.type === "sales" && inPeriod(d.deliveredAt, state.period),
    ),
    stats = deliveryStats(rows),
    tab = state.tab || "carriers",
    field = tab === "regional" ? "region" : "carrier",
    groups = [...new Set(rows.map((r) => r[field]))].map((name) => ({
      name,
      ...deliveryStats(rows.filter((r) => r[field] === name)),
    }));
  return (
    head("logistics", "logisticsSub", true) +
    `<section class="metrics">${metric("otd", fmt(stats.otd, 1) + "%")}${metric("delayed", fmt(stats.late))}${metric("avgDelivery", fmt(stats.lead, 1) + " " + e(t("days")))}${metric("deliveries", fmt(stats.count))}</section><section class="panel">${tabs(["carriers", "regional", "deliveries"])}${
      tab === "deliveries"
        ? table(rows, [
            {
              key: "id",
              label: "deliveries",
              value: (d) => d.id,
              render: (d) => link(d.id),
            },
            {
              key: "orderId",
              label: "orders",
              value: (d) => d.orderId,
              render: (d) => link(d.orderId),
            },
            { key: "carrier", label: "carrier", value: (d) => d.carrier },
            {
              key: "promisedDate",
              label: "promised",
              value: (d) => d.promisedDate,
              render: (d) => e(date(d.promisedDate)),
            },
            {
              key: "deliveredAt",
              label: "deliveredAt",
              value: (d) => d.deliveredAt,
              render: (d) => e(date(d.deliveredAt)),
            },
            {
              key: "delay",
              label: "avgDelay",
              value: lateDays,
              render: (d) =>
                `<span class="${lateDays(d) ? "text-danger" : ""}">${fmt(lateDays(d))} ${e(t("days"))}</span>`,
            },
          ])
        : table(groups, [
            { key: "name", label: field, value: (r) => r.name },
            { key: "count", label: "deliveries", value: (r) => r.count },
            {
              key: "otd",
              label: "otd",
              value: (r) => r.otd,
              render: (r) => fmt(r.otd, 1) + "%",
            },
            { key: "late", label: "delayed", value: (r) => r.late },
            {
              key: "delay",
              label: "avgDelay",
              value: (r) => r.delay,
              render: (r) => fmt(r.delay, 1) + " " + e(t("days")),
            },
          ])
    }</section>`
  );
}
/** Expose the full prioritized finding list with severity filtering. */
function insightPage() {
  const rows = allInsights().filter(
    (i) => !state.filters.risk || i.severity === state.filters.risk,
  );
  return (
    head("insights", "insightsSub") +
    `<p class="data-note">${e(t("snapshotOnly"))}</p><section class="panel"><div class="filter-bar">${select(
      "risk",
      "risk",
      ["high", "medium", "low"].map((value) => ({ value, label: t(value) })),
      state.filters.risk,
      "data-filter",
    )}</div>${insightCards(rows)}</section>`
  );
}
/** Compose independent sales-order filters and export exactly the filtered visible columns. */
function explorer() {
  const f = state.filters,
    invalid = f.start && f.end && f.start > f.end;
  const cols = orderColumns().filter((c) => state.columns.includes(c.key));
  const rows = invalid
    ? []
    : filterOrders(state.data, { ...f, period: state.period });
  return (
    head("explorer", "explorerSub", true) +
    `<section class="panel"><div class="filter-grid"><label class="field">${e(t("start"))}<input type="date" name="start" data-filter value="${e(f.start)}"></label><label class="field">${e(t("end"))}<input type="date" name="end" data-filter value="${e(f.end)}"></label>${select(
      "supplier",
      "supplier",
      state.data.suppliers.map((s) => ({ value: s.id, label: s.name })),
      f.supplier,
      "data-filter",
    )}${select(
      "product",
      "product",
      state.data.products.map((p) => ({ value: p.id, label: p.name })),
      f.product,
      "data-filter",
    )}${select(
      "category",
      "category",
      ["sensors", "motion", "mechanical", "electronics"].map((value) => ({
        value,
        label: t(value),
      })),
      f.category,
      "data-filter",
    )}${select(
      "region",
      "region",
      ["DACH", "Benelux", "Nordics", "CEE"].map((value) => ({
        value,
        label: value,
      })),
      f.region,
      "data-filter",
    )}${select(
      "status",
      "status",
      ["open", "processing", "delivered"].map((value) => ({
        value,
        label: t(value),
      })),
      f.status,
      "data-filter",
    )}${select(
      "risk",
      "risk",
      ["high", "medium", "low", "dead", "overstock"].map((value) => ({
        value,
        label: t(value),
      })),
      f.risk,
      "data-filter",
    )}</div><div class="filter-bar">${btn(e(t("clear")), "clear", "", "button quiet")}<details class="column-picker"><summary>${e(t("columns"))}</summary><div>${orderColumns()
      .map(
        (c) =>
          `<label><input type="checkbox" data-column="${c.key}" ${state.columns.includes(c.key) ? "checked" : ""} ${c.key === "id" ? "disabled" : ""}>${e(t(c.label))}</label>`,
      )
      .join(
        "",
      )}</div></details></div>${invalid ? `<p role="alert" class="error-inline">${e(t("invalidDates"))}</p>` : ""}${table(rows, cols)}</section>`
  );
}
/** Group browser-local follow-up work by status; completing work does not rewrite ERP records. */
function actionsPage() {
  return (
    head("actions", "actionSub") +
    `<div class="kanban">${["todo", "doing", "done"]
      .map(
        (status) =>
          `<section class="kanban-column"><div class="kanban-heading">${badge(status)}<span>${state.actions.filter((a) => a.status === status).length}</span></div>${
            state.actions
              .filter((a) => a.status === status)
              .map(
                (a) =>
                  `<article class="action-card"><small>${e(a.id)}</small><h3>${e(t(a.type))}</h3><p>${e(a.entity)}</p><div>${e(a.owner || t("unassigned"))}</div><small>${e(t("due"))}: ${date(a.due)}</small>${btn(e(t("detail")) + " →", "editAction", `data-id="${e(a.id)}"`, "button quiet")}</article>`,
              )
              .join("") || `<p class="empty">—</p>`
          }</section>`,
      )
      .join(
        "",
      )}</div>${!state.actions.length ? `<p class="empty">${e(t("noActions"))} <a href="#insights">${e(t("insights"))} →</a></p>` : ""}`
  );
}
/** Explain delivered components and the work still required for a real production integration. */
function architecture() {
  return (
    head("architecture", "archSub") +
    `<div class="architecture-flow">${["archClient", "archEngine", "archData"].map((key, i) => `<section class="panel"><div class="step-number">0${i + 1}</div><h2>${e(t(key))}</h2><p>${e(t(key + "Text"))}</p><code>${["HTML / CSS / ES modules", "engine.js / node:test", "data.json / Mock REST API"][i]}</code></section>`).join("")}</div><section class="panel prose"><div class="eyebrow">ERP Integration Ready Architecture</div><h2>${e(t("archFuture"))}</h2><p>${e(t("archFutureText"))}</p><h2>${e(t("security"))}</h2><p>${e(t("securityText"))}</p>${btn(e(t("resetDemo")), "reset", "", "button danger quiet")}</section>`
  );
}
/** Introduce the product with real calculated examples, avoiding fictional commercial evidence. */
function landing() {
  return `<div class="landing"><div class="landing-top"><div class="eyebrow">FLOWPILOT / OPERATIONS INTELLIGENCE</div><a href="#architecture">${e(t("viewArchitecture"))} ↗</a></div><section class="hero"><span class="pill">ERP PROCESS INTELLIGENCE</span><h1>${e(t("hero"))}</h1><p>${e(t("heroSub"))}</p><div class="hero-buttons"><a class="button primary" href="#overview">${e(t("exploreDemo"))} →</a><a class="button" href="#architecture">${e(t("viewArchitecture"))}</a></div><div class="hero-proof"><span><b>30</b> ${e(t("suppliers"))}</span><span><b>120</b> ${e(t("products"))}</span><span><b>360</b> ${e(t("orders"))}</span></div></section><section class="landing-split"><div><div class="eyebrow">01 / ${e(t("problem"))}</div><h2>${e(t("problemTitle"))}</h2><p>${e(t("problemText"))}</p></div><section class="panel sample-insight"><div class="eyebrow">${e(t("insights"))}</div>${insightCards(
    allInsights().filter((i) => i.type === "supplierRisk"),
    1,
  )}</section></section><section class="landing-section"><div class="eyebrow">02 / ${e(t("how"))}</div><div class="steps">${["raw", "rules", "priorities", "followUp"].map((x, i) => `<div><b>0${i + 1}</b><h3>${e(t(x))}</h3></div>`).join("")}</div></section><section class="landing-section"><div class="eyebrow">03 / ${e(t("workspace"))}</div><div class="module-grid">${["procurement", "inventory", "sales", "logistics"].map((x) => `<a href="#${x}"><span>${icons[x]}</span><h3>${e(t(x))} ↗</h3><p>${e(t(x + "Sub"))}</p></a>`).join("")}</div></section><section class="landing-section"><h2>${e(t("security"))}</h2><p>${e(t("securityText"))}</p><a href="#architecture">${e(t("viewArchitecture"))} →</a></section><footer>FlowPilot · ${e(t("dataNote"))}</footer></div>`;
}
const pages = {
  overview,
  procurement,
  inventory,
  sales,
  logistics,
  insights: insightPage,
  explorer,
  actions: actionsPage,
  architecture,
  home: landing,
};
/** Compose the shared shell, route and locale; source records remain immutable. */
function render() {
  if (!state.data) return;
  document.documentElement.lang = state.lang;
  document.title = `${t(state.route)} · FlowPilot`;
  const unread = allInsights().filter(
    (i) => i.severity === "high" && !state.read.includes(i.id),
  ).length;
  app.innerHTML = `<div class="shell ${state.mobile ? "nav-open" : ""}">${state.mobile ? `<button class="nav-backdrop" data-action="menu" aria-label="${e(t("close"))}"></button>` : ""}<aside class="sidebar"><a class="brand" href="#overview"><span class="brand-symbol">F</span><span>FlowPilot<small>OPERATIONS INTELLIGENCE</small></span></a><div class="company"><div class="company-avatar">DM</div><div>Demo Manufacturing<small>GmbH · ${e(t("demo"))}</small></div></div><div class="nav-label">${e(t("workspace"))}</div><nav aria-label="${e(t("workspace"))}">${routes
    .slice(0, 8)
    .map(
      (r) =>
        `<a href="#${r}" ${state.route === r ? 'aria-current="page"' : ""}><span aria-hidden="true">${icons[r]}</span>${e(t(r))}${r === "insights" ? `<b>${allInsights().length}</b>` : ""}</a>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-bottom"><a href="#architecture">⌘ ${e(t("architecture"))}</a><a href="#home">↗ ${e(t("home"))}</a><div class="profile"><div class="avatar">MF</div><div>Muhammet Fidan<small>${e(t("local"))}</small></div></div></div></aside><div class="workspace"><header class="topbar">${btn("☰", "menu", `aria-label="${e(t("menu"))}" aria-expanded="${state.mobile}"`, "icon-button mobile-menu")}<button class="search-trigger" data-action="search" aria-label="${e(t("searchTitle"))}"><span>⌕</span><span>${e(t("search"))}</span><kbd>Ctrl K</kbd></button><div class="topbar-controls"><label class="sr-only" for="language">Language / Dil / Sprache</label><select id="language"><option value="tr" ${state.lang === "tr" ? "selected" : ""}>TR · Türkçe</option><option value="en" ${state.lang === "en" ? "selected" : ""}>EN · English</option><option value="de" ${state.lang === "de" ? "selected" : ""}>DE · Deutsch</option></select>${btn(`♧${unread ? `<b class="notification-count">${unread}</b>` : ""}`, "notifications", `aria-label="${e(t("notifications"))}: ${unread} ${e(t("unread"))}"`, "icon-button notifications-button")}</div></header><div class="contextbar"><span><span class="demo-dot"></span>${e(state.data.meta.company)} <span class="muted">/ ${e(t("demo"))}</span></span><label>${e(t("period"))}<select id="period"><option value="2026-09" ${state.period === "2026-09" ? "selected" : ""}>${e(t("september"))}</option><option value="2026-08" ${state.period === "2026-08" ? "selected" : ""}>${e(t("august"))}</option></select></label></div>${pendingWrites.size ? `<p class="storage-warning" role="alert">${e(t("storageFail"))}</p>` : ""}<main id="main" tabindex="-1">${pages[state.route]()}</main><footer class="workspace-footer"><span>FlowPilot / v1.0.1</span><span>${e(t("dataNote"))}</span></footer></div></div>`;
  syncNavigation();
}
/** Native dialog handles focus trapping and Escape. Focus returns to the invoking control on close. */
let previousFocus;
function modal(title, body, wide = false) {
  if (!dialog.open) previousFocus = document.activeElement;
  dialog.className = wide ? "wide" : "";
  dialog.innerHTML = `<div class="modal-head"><h2 id="dialog-title">${e(title)}</h2>${btn("×", "close", `aria-label="${e(t("close"))}"`, "icon-button")}</div><div class="modal-body">${pendingWrites.size ? `<p class="storage-warning" role="alert">${e(t("storageFail"))}</p>` : ""}${body}</div>`;
  dialog.setAttribute("aria-labelledby", "dialog-title");
  if (!dialog.open) dialog.showModal();
  dialog.querySelector("button, input, select, textarea")?.focus();
}
/** Restore the invoking control after closing a detail or edit surface. */
function closeModal() {
  dialog.close();
  state.modal = null;
  if (previousFocus?.isConnected) previousFocus.focus();
  else document.querySelector("#main")?.focus();
}
/** Present labeled facts using definition-list semantics. */
function detailGrid(items) {
  return `<dl class="detail-grid">${items.map(([key, value]) => `<div><dt>${e(t(key))}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
}
/** Resolve each entity type and link related source records without fake detail screens. */
function recordModal(id) {
  state.modal = { type: "record", id };
  const data = state.data;
  let row,
    body = "";
  if ((row = find("suppliers", id))) {
    const s = supplierRows(data, state.period).find((s) => s.id === id),
      prev = supplierRows(data, previousPeriod(state.period)).find(
        (s) => s.id === id,
      ),
      pos = data.purchaseOrders.filter(
        (o) => o.supplierId === id && inPeriod(o.date, state.period),
      );
    body =
      detailGrid([
        ["supplier", e(row.name)],
        ["region", e(row.region)],
        ["otd", fmt(s.otd, 1) + "%"],
        ["avgDelay", fmt(s.delay, 1) + " " + e(t("days"))],
        ["spend", money(s.spend)],
        ["openOrders", fmt(s.open)],
        ["leadTime", fmt(s.leadTime) + " " + e(t("days"))],
        ["risk", badge(s.risk)],
      ]) +
      `<h3>${e(t("comparison"))}</h3><p>${e(t("otd"))}: ${fmt(prev.otd, 1)}% → ${fmt(s.otd, 1)}%</p><p>${e(t("priceTrend"))}: ${money(prev.price)} → ${money(s.price)}</p><small>${e(t("priceCaveat"))}</small><h3>${e(t("purchaseOrders"))}</h3>` +
      simpleOrders(pos);
  } else if ((row = find("products", id))) {
    const p = inventoryRow(row);
    body =
      detailGrid([
        ["product", e(p.name)],
        ["supplier", link(p.supplierId, find("suppliers", p.supplierId).name)],
        ["stock", fmt(p.stock)],
        ["reserved", fmt(p.reserved)],
        ["available", fmt(p.available)],
        ["demand", fmt(p.dailyDemand)],
        [
          "cover",
          p.cover === null ? "—" : fmt(p.cover, 1) + " " + e(t("days")),
        ],
        ["reorder", fmt(p.reorderPoint)],
        ["unitCost", money(p.unitCost)],
        ["risk", badge(p.risk)],
      ]) +
      `<p class="data-note">${e(t("snapshot"))}</p><h3>${e(t("related"))}</h3>` +
      simpleOrders(
        data.orders.filter(
          (o) => o.productId === id && inPeriod(o.date, state.period),
        ),
      );
  } else if ((row = find("customers", id))) {
    const orders = data.orders.filter(
      (o) => o.customerId === id && inPeriod(o.date, state.period),
    );
    body =
      detailGrid([
        ["customer", e(row.name)],
        ["region", e(row.region)],
        ["orders", fmt(orders.length)],
      ]) + simpleOrders(orders);
  } else if ((row = find("orders", id) || find("purchaseOrders", id))) {
    body = detailGrid([
      ["orders", e(row.id)],
      ["product", link(row.productId, find("products", row.productId).name)],
      [
        "supplier",
        link(row.supplierId, find("suppliers", row.supplierId).name),
      ],
      ...(row.customerId
        ? [
            [
              "customer",
              link(row.customerId, find("customers", row.customerId).name),
            ],
          ]
        : []),
      ["quantity", fmt(row.quantity)],
      ["amount", money(row.quantity * (row.unitPrice ?? row.unitCost))],
      ["date", e(date(row.date))],
      ["promised", e(date(row.promisedDate))],
      ["deliveredAt", e(date(row.deliveredAt))],
      ["status", badge(row.status)],
    ]);
    const ds = data.deliveries.filter((d) => d.orderId === id);
    body += `<h3>${e(t("deliveries"))}</h3><div class="evidence-links">${ds.map((d) => link(d.id)).join("") || e(t("noResults"))}</div>`;
  } else if ((row = find("deliveries", id))) {
    body = detailGrid([
      ["deliveries", e(row.id)],
      ["orders", link(row.orderId)],
      ["carrier", e(row.carrier)],
      ["region", e(row.region)],
      ["dispatch", e(date(row.dispatchDate))],
      ["promised", e(date(row.promisedDate))],
      ["deliveredAt", e(date(row.deliveredAt))],
      ["avgDelay", fmt(lateDays(row)) + " " + e(t("days"))],
      [
        "source",
        e(t(row.type === "sales" ? "salesDelivery" : "purchaseDelivery")),
      ],
    ]);
  }
  if (!row) return;
  modal(`${id} · ${t("detail")}`, body, true);
}
/** Show related orders without changing the main table export or pagination state. */
function simpleOrders(rows) {
  return `<div class="related-list">${rows.map((o) => `<div>${link(o.id)}<span>${e(date(o.date))}</span>${badge(o.status)}<b>${money(o.quantity * (o.unitPrice ?? o.unitCost))}</b></div>`).join("") || `<p class="empty">${e(t("noResults"))}</p>`}</div>`;
}
/** Make every finding explainable through facts, contribution, evidence, assumptions and action. */
function insightModal(id) {
  const item = allInsights().find((i) => i.id === id);
  if (!item) return;
  state.modal = { type: "insight", id };
  const existing = state.actions.find((a) => a.insightId === id);
  modal(
    t(item.type),
    `<div class="finding-hero">${badge(item.severity)}<h3>${e(item.entity || t("sales"))}</h3>${item.entityId ? link(item.entityId) : ""}<strong>${money(item.impact)}</strong><small>${e(t("impact"))}</small></div><ol class="analysis-chain"><li><span>01</span><div><h3>${e(t("problem"))}</h3><p>${e(t(item.type))}${item.type === "supplierRisk" ? ` · ${fmt(item.previous, 1)}% → ${fmt(item.current, 1)}%` : item.type === "stockRisk" ? ` · ${fmt(item.cover, 1)} ${e(t("days"))}` : ` · ${fmt(item.current, 1)}%`}</p></div></li><li><span>02</span><div><h3>${e(t("factor"))}</h3><p>${e(t(item.factor))}</p></div></li><li><span>03</span><div><h3>${e(t("evidence"))} (${item.evidence.length})</h3><div class="evidence-links">${item.evidence.map((id) => link(id)).join("") || `<p>${e(t("noEvidence"))}</p>`}</div></div></li><li><span>04</span><div><h3>${e(t("method"))}</h3><p>${e(t(item.formula))}</p></div></li><li><span>05</span><div><h3>${e(t("recommended"))}</h3><p>${e(t(item.action))}</p></div></li></ol><div class="modal-actions">${btn(e(t(existing ? "actionExists" : "createAction")), existing ? "editAction" : "createAction", `data-id="${e(existing?.id ?? item.id)}"`, "button primary")}</div>`,
    true,
  );
}
/** Edit bounded local fields with native input validation; no data leaves this browser. */
function actionModal(id) {
  const a = state.actions.find((a) => a.id === id);
  if (!a) return;
  state.modal = { type: "action", id };
  modal(
    t("actions"),
    `<form id="action-form" data-id="${e(id)}"><h3>${e(t(a.type))} · ${e(a.entity)}</h3><div class="form-grid"><label class="field">${e(t("owner"))}<input name="owner" maxlength="80" value="${e(a.owner)}"></label><label class="field">${e(t("due"))}<input name="due" type="date" value="${e(a.due)}"></label><label class="field">${e(t("status"))}<select name="status">${["todo", "doing", "done"].map((x) => `<option value="${x}" ${a.status === x ? "selected" : ""}>${e(t(x))}</option>`).join("")}</select></label><label class="field full">${e(t("notes"))}<textarea name="notes" maxlength="2000" rows="5">${e(a.notes)}</textarea></label></div><div class="modal-actions">${btn(e(t("delete")), "deleteAction", `type="button" data-id="${e(id)}"`, "button danger quiet")}<button class="button primary" type="submit">${e(t("save"))}</button></div></form>`,
  );
}
/** Search builds category-specific matches rather than displaying decorative suggestions. */
function searchResults(query) {
  const q = query.trim().toLocaleLowerCase(state.lang),
    data = state.data;
  let html = "";
  if (!q) {
    html = routes
      .map(
        (r) =>
          `<button class="search-result" data-action="navigate" data-route="${r}"><span>${icons[r]} ${e(t(r))}</span><span>↗</span></button>`,
      )
      .join("");
  } else {
    for (const key of [
      "suppliers",
      "products",
      "customers",
      "orders",
      "purchaseOrders",
    ]) {
      const rows = data[key]
        .filter((r) =>
          [r.id, r.name, r.productId, r.customerId]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase(state.lang)
            .includes(q),
        )
        .slice(0, 8);
      if (rows.length)
        html += `<h3>${e(t(key))}</h3>${rows.map((r) => `<button class="search-result" data-action="record" data-id="${e(r.id)}"><span>${e(r.name ?? r.id)}</span><small>${e(r.name ? r.id : find("products", r.productId)?.name)}</small></button>`).join("")}`;
    }
  }
  return html || `<p class="empty">${e(t("noResults"))}</p>`;
}
/** Focus the query immediately so keyboard users can search without an extra click. */
function searchModal() {
  if (!state.data) return;
  state.modal = { type: "search" };
  modal(
    t("searchTitle"),
    `<input id="global-search" type="search" autocomplete="off" placeholder="${e(t("search"))}" aria-label="${e(t("searchTitle"))}"><div id="search-results">${searchResults("")}</div>`,
  );
  document.querySelector("#global-search").focus();
}
/** Surface only unread high-severity findings, not repetitive low-priority updates. */
function notifications() {
  state.modal = { type: "notifications" };
  const items = allInsights().filter(
    (i) => i.severity === "high" && !state.read.includes(i.id),
  );
  modal(
    t("notifications"),
    `<div class="notification-header"><p>${e(t("recent"))}</p>${btn(e(t("markRead")), "markRead")}</div>${items.length ? insightCards(items) : `<p class="empty">${e(t("notificationEmpty"))}</p>`}`,
    true,
  );
}
/** Require an explicit second action before destructive local changes. */
function confirmModal(text, action, id = "") {
  modal(
    t("actions"),
    `<p>${e(t(text))}</p><div class="modal-actions">${btn(e(t("cancel")), "close")}${btn(e(t("delete")), action, `data-id="${e(id)}"`, "button danger")}</div>`,
  );
}
/** One delegated event layer survives rerenders and keeps element handlers out of HTML. */
document.addEventListener("click", (event) => {
  const anchor = event.target.closest('a[href^="#"]');
  if (
    anchor &&
    (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
  )
    return;
  if (anchor?.getAttribute("href") === "#main") {
    event.preventDefault();
    document.querySelector("#main")?.focus();
    return;
  }
  if (anchor && anchor.getAttribute("href") !== "#main") {
    event.preventDefault();
    if (dialog.open) closeModal();
    setRoute(anchor.getAttribute("href").slice(1));
    return;
  }
  const el = event.target.closest("[data-action]");
  if (!el) return;
  const { action, id } = el.dataset;
  if (action === "close") closeModal();
  else if (action === "menu") {
    state.mobile = !state.mobile;
    render();
  } else if (action === "search") searchModal();
  else if (action === "notifications") notifications();
  else if (action === "markRead") {
    state.read = [
      ...new Set([
        ...state.read,
        ...allInsights()
          .filter((i) => i.severity === "high")
          .map((i) => i.id),
      ]),
    ];
    persist("read");
    render();
    notifications();
    toast(t("allRead"));
  } else if (action === "navigate") {
    closeModal();
    setRoute(el.dataset.route);
  } else if (action === "record") recordModal(id);
  else if (action === "insight") insightModal(id);
  else if (action === "tab") {
    state.tab = el.dataset.tab;
    state.sort = "";
    state.page = 1;
    render();
    document.querySelector(`[data-tab="${state.tab}"]`)?.focus();
  } else if (action === "sort") {
    state.direction = state.sort === el.dataset.key ? -state.direction : 1;
    state.sort = el.dataset.key;
    render();
    document
      .querySelector(`[data-action="sort"][data-key="${state.sort}"]`)
      ?.focus();
  } else if (action === "page") {
    state.page += Number(el.dataset.step);
    render();
  } else if (action === "clear") {
    state.filters = {};
    state.page = 1;
    render();
  } else if (action === "export") {
    const blob = new Blob([toCSV(currentExport.rows, currentExport.columns)], {
        type: "text/csv;charset=utf-8",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `flowpilot-${state.route}-${state.period}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (action === "createAction") {
    const i = allInsights().find((i) => i.id === id);
    if (i && !state.actions.some((a) => a.insightId === id)) {
      const a = {
        id: createActionId(),
        insightId: id,
        type: i.type,
        entity: i.entity || t("sales"),
        status: "todo",
        owner: "",
        due: "",
        notes: "",
        createdAt: new Date().toISOString(),
      };
      state.actions.push(a);
      persist("actions");
      render();
      actionModal(a.id);
      toast(t("created"));
    }
  } else if (action === "editAction") actionModal(id);
  else if (action === "deleteAction")
    confirmModal("deleteConfirm", "confirmDelete", id);
  else if (action === "confirmDelete") {
    state.actions = state.actions.filter((a) => a.id !== id);
    persist("actions");
    closeModal();
    render();
    toast(t("saved"));
  } else if (action === "reset") confirmModal("resetConfirm", "confirmReset");
  else if (action === "confirmReset") {
    state.actions = [];
    state.read = [];
    persist("actions");
    persist("read");
    closeModal();
    render();
    toast(t("saved"));
  } else if (action === "retry") {
    boot();
  }
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "language") {
    state.lang = el.value;
    persist("lang");
    render();
  } else if (el.id === "period") {
    state.period = el.value;
    state.page = 1;
    render();
  } else if (el.hasAttribute("data-filter")) {
    state.filters[el.name] = el.value;
    state.page = 1;
    render();
    document.querySelector(`[data-filter][name="${el.name}"]`)?.focus();
  } else if (el.dataset.column) {
    state.columns = el.checked
      ? [...state.columns, el.dataset.column]
      : state.columns.filter((c) => c !== el.dataset.column);
    render();
    document.querySelector(".column-picker").open = true;
    document.querySelector(`[data-column="${el.dataset.column}"]`)?.focus();
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "global-search")
    document.querySelector("#search-results").innerHTML = searchResults(
      event.target.value,
    );
});
document.addEventListener("submit", (event) => {
  if (event.target.id !== "action-form") return;
  event.preventDefault();
  const f = new FormData(event.target),
    a = state.actions.find((a) => a.id === event.target.dataset.id);
  if (!a) return;
  Object.assign(a, {
    owner: String(f.get("owner")).trim().slice(0, 80),
    due: String(f.get("due")),
    status: String(f.get("status")),
    notes: String(f.get("notes")).slice(0, 2000),
  });
  persist("actions");
  closeModal();
  render();
  toast(t("saved"));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.mobile && !dialog.open) {
    state.mobile = false;
    render();
    document.querySelector(".mobile-menu")?.focus();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchModal();
  }
  if (
    event.target.getAttribute?.("role") === "tab" &&
    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
  ) {
    event.preventDefault();
    const tabs = [
      ...event.target.parentElement.querySelectorAll('[role="tab"]'),
    ];
    const i = tabs.indexOf(event.target);
    tabs[
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length
    ].click();
  }
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeModal();
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      closeModal();
  }
});
window.addEventListener("hashchange", () => {
  const route = location.hash.slice(1);
  if (routes.includes(route)) setRoute(route, false);
});
/** Load and validate source data once, with loading, failure and retry states. */
async function boot() {
  app.innerHTML = `<div class="boot" role="status"><div class="skeleton"></div><h1>FlowPilot</h1><p>${e(t("loading"))}</p><div class="skeleton"></div></div>`;
  try {
    state.data = await loadData();
    render();
  } catch (error) {
    console.error("FlowPilot data load failed:", error);
    app.innerHTML = `<div class="boot" role="alert"><h1>FlowPilot</h1><p>${e(t("error"))}</p>${btn(e(t("retry")), "retry")}</div>`;
  }
}
if (!routes.includes(location.hash.slice(1)))
  history.replaceState(null, "", "#overview");
boot();

/** Off-canvas navigation must not remain in keyboard or screen-reader order while closed. */
function syncNavigation() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  const narrow = window.matchMedia
    ? window.matchMedia("(max-width: 850px)").matches
    : window.innerWidth <= 850;
  sidebar.inert = narrow && !state.mobile;
  if (narrow && !state.mobile) sidebar.setAttribute("aria-hidden", "true");
  else sidebar.removeAttribute("aria-hidden");
}
window.addEventListener("resize", syncNavigation);
