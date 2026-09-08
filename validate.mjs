/** Validate the portable release boundary: syntax, entrypoints, local URLs, dictionary references and fixture invariants. */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";
import { dictionary } from "../dist/src/i18n.js";
import { validateData } from "../dist/src/data.js";
const root = resolve(import.meta.dirname, "..");
for (const file of ["index.html", "dist/index.html"]) {
  const path = resolve(root, file),
    html = readFileSync(path, "utf8");
  for (const [, url] of html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)) {
    assert.ok(
      existsSync(resolve(dirname(path), url)),
      `${file}: missing ${url}`,
    );
  }
}
for (const name of readdirSync(resolve(root, "dist/src")).filter((n) =>
  n.endsWith(".js"),
)) {
  execFileSync(process.execPath, ["--check", resolve(root, "dist/src", name)]);
}
const main = readFileSync(resolve(root, "dist/src/main.js"), "utf8");
for (const [, key] of main.matchAll(/\bt\(['"]([^'"]+)['"]\)/g))
  assert.ok(dictionary.en[key], `Missing translation: ${key}`);
const data = validateData(
  JSON.parse(readFileSync(resolve(root, "dist/data.json"), "utf8")),
);
for (const row of [
  ...data.orders,
  ...data.purchaseOrders,
  ...data.deliveries,
]) {
  assert.ok(
    !row.deliveredAt || row.deliveredAt <= data.meta.asOf,
    "Delivery after snapshot",
  );
}
assert.equal(
  readFileSync(resolve(root, "index.html"), "utf8").replaceAll(
    "./dist/src/",
    "./src/",
  ),
  readFileSync(resolve(root, "dist/index.html"), "utf8"),
  "Root and dist entrypoints drifted",
);
console.log(
  "PASS: syntax, entrypoints, relative asset URLs, translations, references, snapshot bounds",
);
