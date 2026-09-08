/** Validate the portable release boundary: syntax, entrypoints, local URLs, dictionary references and fixture invariants. */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import assert from "node:assert/strict";
import { dictionary } from "../src/i18n.js";
import { validateData } from "../src/data.js";
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
for (const name of readdirSync(resolve(root, "src")).filter((n) =>
  n.endsWith(".js"),
)) {
  execFileSync(process.execPath, ["--check", resolve(root, "src", name)]);
}
const main = readFileSync(resolve(root, "src/main.js"), "utf8");
for (const [, key] of main.matchAll(/\bt\(['"]([^'"]+)['"]\)/g))
  assert.ok(dictionary.en[key], `Missing translation: ${key}`);
const data = validateData(
  JSON.parse(readFileSync(resolve(root, "data.json"), "utf8")),
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
  readFileSync(resolve(root, "index.html"), "utf8"),
  readFileSync(resolve(root, "dist/index.html"), "utf8"),
  "Root and dist entrypoints drifted",
);
console.log(
  "PASS: syntax, entrypoints, relative asset URLs, translations, references, snapshot bounds",
);

// Every public byte must match the deploy-only output; missing root assets now fail CI.
function checkTree(dir = "") {
  for (const entry of readdirSync(resolve(root, "dist", dir), {
    withFileTypes: true,
  })) {
    const file = dir + entry.name;
    if (entry.isDirectory()) checkTree(file + "/");
    else
      assert.deepEqual(
        readFileSync(resolve(root, file)),
        readFileSync(resolve(root, "dist", file)),
        `Stale build: ${file}`,
      );
  }
}
checkTree();
const manifest = JSON.parse(
  readFileSync(resolve(root, "manifest.webmanifest"), "utf8"),
);
for (const icon of manifest.icons) {
  const png = readFileSync(resolve(root, icon.src));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
}
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
execFileSync(process.execPath, ["--check", resolve(root, "sw.js")]);
console.log(
  "PASS: root/dist parity, PWA icons, relative scope, service-worker syntax",
);
