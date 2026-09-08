/** Materialize analytics from the same JavaScript engine used by the client: no duplicated Python formulas. */
import { readFileSync, writeFileSync } from "node:fs";
import { insights, metrics, inventoryRow } from "../src/engine.js";
const data = JSON.parse(
  readFileSync(new URL("../data.json", import.meta.url), "utf8"),
);
const result = Object.fromEntries(
  ["2026-08", "2026-09"].map((period) => [
    period,
    {
      insights: insights(data, period),
      metrics: metrics(data, period),
      inventory: data.products.map(inventoryRow),
    },
  ]),
);
writeFileSync(
  new URL("../backend/analytics.json", import.meta.url),
  JSON.stringify(result, null, 2),
);
