/** Generate a deploy-only directory from canonical root files. Never hand-edit dist. */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  cpSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const files = [
  "index.html",
  "data.json",
  "manifest.webmanifest",
  ...readdirSync(resolve(root, "src")).map((n) => "src/" + n),
  ...readdirSync(resolve(root, "icons")).map((n) => "icons/" + n),
];
// A content digest changes the cache whenever any public asset changes, without manual version bumps.
const digest = createHash("sha256");
digest.update(readFileSync(resolve(root, "scripts/sw-template.js")));
for (const f of files) digest.update(f).update(readFileSync(resolve(root, f)));
const worker = readFileSync(resolve(root, "scripts/sw-template.js"), "utf8")
  .replace("__REVISION__", digest.digest("hex").slice(0, 16))
  .replace("__ASSETS__", JSON.stringify(files));
writeFileSync(resolve(root, "sw.js"), worker);
rmSync(resolve(root, "dist"), { recursive: true, force: true });
mkdirSync(resolve(root, "dist"));
for (const f of [...files, "sw.js", ".nojekyll"])
  cpSync(resolve(root, f), resolve(root, "dist", f), { recursive: true });
console.log(
  `Built ${files.length + 2} public files; root and dist use identical URLs.`,
);
