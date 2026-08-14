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
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/);

  const html = await response.text();
  assert.match(html, /<html lang="de">/i);
  assert.match(html, /Kommunale Themen im Überblick · RötgesPortal/);
  assert.match(html, /Was bewegt/);
  assert.match(html, /31(?:<!-- -->)* Themen für Rötgesbüttel/);
  assert.match(html, /Wohngebiet Aukenroth/);
  assert.match(html, /Themen durchsuchen/);
  assert.match(html, /Bearbeitungsstand/);
  assert.match(html, /Räumlicher Bezug/);
  assert.match(html, /Gesamte Samtgemeinde/);
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
  assert.match(html, /Räumlicher Bezug/);
  assert.match(html, /Rötgesbüttel/);
});

test("returns not found for an unknown topic", async () => {
  const response = await render("/themen/unknown-topic");
  assert.equal(response.status, 404);
});

test("server-renders project and trust pages", async () => {
  for (const [pathname, text] of [
    ["/projekt", "Transparenz, die man prüfen kann"],
    ["/barrierefreiheit", "Barrierefreiheit ist Teil des Fundaments"],
    ["/datenschutz", "So wenig personenbezogene Daten wie möglich"],
    ["/impressum", "Verantwortung klar benennen"],
    ["/kontakt", "Gemeinsam genauer werden"],
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(text));
  }
});

test("server-renders the source-backed council map", async () => {
  const response = await render("/karte");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Wo werden Entscheidungen sichtbar\?/);
  assert.match(html, /2(?:<!-- -->)* verortete Themen/);
  assert.match(html, /Themen auf der Karte/);
  assert.match(html, /Kartendaten: OpenStreetMap/);
  assert.match(html, /Räumlicher Bezug/);
});

test("exposes a non-cached health endpoint", async () => {
  const response = await render("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.service, "roetgesportal");
  assert.match(body.contentLastVerifiedAt, /^\d{4}-\d{2}-\d{2}$/);
});
