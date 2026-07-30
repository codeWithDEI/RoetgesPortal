import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the public topic overview", async () => {
  const response = await render("/themen");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="de">/i);
  assert.match(html, /Kommunale Themen im Überblick · RötgesPortal/);
  assert.match(html, /Was bewegt/);
  assert.match(html, /12(?:<!-- -->)* veröffentlichte Themen/);
  assert.match(html, /Wohngebiet Aukenroth/);
  assert.match(html, /Themen durchsuchen/);
  assert.match(html, /Bearbeitungsstand/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("server-renders a source-backed topic detail", async () => {
  const response = await render("/themen/aukenroth-residential-development");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Wohngebiet Aukenroth/);
  assert.match(html, /Worum geht es\?/);
  assert.match(html, /Was ist bisher passiert\?/);
  assert.match(html, /Öffentliche Quellen/);
  assert.match(html, /Vorlage Rötg\/2026\/0298/);
  assert.match(html, /Neutral zusammengefasst/);
});

test("returns not found for an unknown topic", async () => {
  const response = await render("/themen/unknown-topic");
  assert.equal(response.status, 404);
});
