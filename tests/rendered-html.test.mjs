import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the branded secure login", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>EUROPLUS Work Command<\/title>/i);
  assert.match(html, /Welcome back\./);
  assert.match(html, /One command centre for every EUROPLUS handoff\./);
  assert.match(html, /europlus-logo-red\.png/);
  assert.match(html, /Enter Work Command/);
  assert.doesNotMatch(html, /service_role/i);
});

test("keeps the GitHub package free of secrets and includes security rules", async () => {
  const [envExample, schema, gitignore, packageJson] = await Promise.all([
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(envExample, /eyJ[A-Za-z0-9_-]{20,}/);
  assert.match(schema, /is_accounts_manager/);
  assert.match(schema, /accounts_ledger/);
  assert.match(schema, /enable row level security/);
  assert.match(gitignore, /^\.env\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(packageJson, /"name": "europlus-work-command"/);
  await access(new URL("../public/europlus-logo-red.png", import.meta.url));
  await access(projectRoot);
});

