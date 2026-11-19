import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import http from "node:http";
import { gzipSync } from "node:zlib";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const appRequire = createRequire(resolve(root, "artifacts/moai-bmu/package.json"));
const apiRequire = createRequire(resolve(root, "artifacts/api-server/package.json"));
const sandboxRequire = createRequire(resolve(root, "artifacts/mockup-sandbox/package.json"));
const expoRequire = createRequire(appRequire.resolve("expo/package.json"));
const cliRequire = createRequire(expoRequire.resolve("@expo/cli/package.json"));
const configRequire = createRequire(expoRequire.resolve("@expo/config-plugins/package.json"));
const fingerprintRequire = createRequire(expoRequire.resolve("@expo/fingerprint/package.json"));

test("upgraded pattern libraries retain Expo's glob and minimatch entry points", async () => {
  const { minimatch, Minimatch } = fingerprintRequire("minimatch");
  assert.equal(minimatch("photo.jpg", "*.{jpg,png}"), true);
  assert.equal(new Minimatch("**/*.png").match("assets/icon.png"), true);
  assert.equal(minimatch("note.txt", "*.{jpg,png}"), false);
  const { glob, globSync } = configRequire("glob");
  const files = globSync("artifacts/*/package.json", { cwd: root });
  assert.ok(files.includes("artifacts/moai-bmu/package.json"));
  await assert.rejects(glob("**/*", { cwd: root, signal: AbortSignal.abort() }), {
    name: "AbortError",
  });
});

test("Zod 4 bounds oversized validation and the error formatter accepts its errors", () => {
  const { z } = appRequire("zod");
  const { fromZodError } = appRequire("zod-validation-error");
  const result = z.array(z.number()).max(2).safeParse(Array(1000).fill("invalid"));
  assert.equal(result.success, false);
  assert.ok(result.error.issues.length < 10, "oversized arrays must not accumulate an issue per element");
  assert.match(fromZodError(result.error).message, /Validation error/i);
  assert.deepEqual(z.object({ status: z.string() }).parse({ status: "ok" }), { status: "ok" });
});

test("the form resolver returns normal form errors with Zod 4", async () => {
  const { z } = sandboxRequire("zod");
  const { zodResolver } = sandboxRequire("@hookform/resolvers/zod");
  const resolver = zodResolver(z.object({ weight: z.number().positive() }));
  const options = { fields: {}, shouldUseNativeValidation: false };
  const valid = await resolver({ weight: 8 }, undefined, options);
  assert.deepEqual(valid.values, { weight: 8 });
  assert.deepEqual(valid.errors, {});
  const invalid = await resolver({ weight: -1 }, undefined, options);
  assert.ok(invalid.errors.weight.message);
});

test("patched certificate tooling can sign and verify without accepting another message", () => {
  const forge = cliRequire("node-forge");
  // An ephemeral test-only key, never used or stored by the application.
  const key = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const digest = forge.md.sha256.create().update("dependency compatibility");
  const signature = key.privateKey.sign(digest);
  assert.equal(key.publicKey.verify(digest.digest().bytes(), signature), true);
  const other = forge.md.sha256.create().update("different message");
  assert.equal(key.publicKey.verify(other.digest().bytes(), signature), false);
});

test("Express resolves trusted proxy addresses without trusting the supplied client address", () => {
  const expressRequire = createRequire(apiRequire.resolve("express/package.json"));
  const proxyaddr = expressRequire("proxy-addr");
  const request = {
    socket: { remoteAddress: "127.0.0.1" },
    headers: { "x-forwarded-for": "198.51.100.10, 203.0.113.25" },
  };
  assert.equal(proxyaddr(request, proxyaddr.compile("loopback")), "203.0.113.25");
});

test("malformed compressed bodies cannot terminate the Express server", { timeout: 5000 }, async () => {
  const express = apiRequire("express");
  const app = express();
  app.use(express.json());
  app.post("/body", (req, res) => res.json(req.body));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: "Invalid body" }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const port = server.address().port;
    const payload = Buffer.concat([gzipSync('{"weight":8}'), Buffer.from("trailing bytes")]);
    const result = await new Promise((resolveResponse, reject) => {
      const req = http.request({
        hostname: "127.0.0.1", port, path: "/body", method: "POST",
        headers: { "content-type": "application/json", "content-encoding": "gzip", "content-length": payload.length },
      }, res => {
        res.resume();
        res.on("end", () => resolveResponse(res.statusCode));
      });
      req.on("error", reject);
      req.end(payload);
    });
    assert.equal(result, 400);
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.deepEqual(await health.json(), { status: "ok" });
  } finally {
    server.closeAllConnections();
    await new Promise(resolveClose => server.close(resolveClose));
  }
});
