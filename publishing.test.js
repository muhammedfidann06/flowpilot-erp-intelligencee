/** Serve actual files beneath a GitHub-style repository prefix; no SPA fallback can hide a missing asset. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve(import.meta.dirname, "..");
for (const output of [".", "dist"])
  for (const prefix of ["/", "/flowpilot-erp-intelligence/"]) {
    test(`HTTP asset graph: ${output} mounted at ${prefix}`, async () => {
      const server = createServer(async (req, res) => {
        const path = new URL(req.url, "http://localhost").pathname;
        if (!path.startsWith(prefix)) {
          res.writeHead(404).end();
          return;
        }
        const file = path.slice(prefix.length) || "index.html";
        try {
          const bytes = await readFile(resolve(root, output, file));
          res.setHeader(
            "Content-Type",
            {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".json": "application/json",
              ".webmanifest": "application/manifest+json",
              ".svg": "image/svg+xml",
              ".png": "image/png",
            }[extname(file)] || "application/octet-stream",
          );
          res.end(bytes);
        } catch {
          res.writeHead(404).end();
        }
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const base = `http://127.0.0.1:${server.address().port}${prefix}`;
      try {
        const html = await (await fetch(base)).text();
        assert.ok(!html.includes("./dist/"));
        const assets = [...html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)].map(
          (m) => m[1],
        );
        assets.push(
          "./src/data.js",
          "./src/engine.js",
          "./src/i18n.js",
          "./data.json",
          "./sw.js",
        );
        const manifest = await (
          await fetch(new URL("./manifest.webmanifest", base))
        ).json();
        assets.push(...manifest.icons.map((i) => i.src));
        for (const asset of assets) {
          const response = await fetch(new URL(asset, base));
          assert.equal(response.status, 200, asset);
          const text = await response.text();
          assert.ok(
            !text.startsWith("<!doctype html>"),
            `${asset} incorrectly returned HTML`,
          );
          if (asset.endsWith(".js"))
            assert.equal(
              response.headers.get("content-type"),
              "text/javascript",
            );
        }
        assert.equal((await fetch(new URL("missing.js", base))).status, 404);
        assert.equal(new URL(manifest.start_url, base).pathname, prefix);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });
  }
