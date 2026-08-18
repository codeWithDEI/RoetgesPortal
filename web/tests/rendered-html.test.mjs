import assert from "node:assert/strict";
import test from "node:test";

const legalEnvironment = {
  LEGAL_OPERATOR_NAME: "Erika Prüfer",
  LEGAL_OPERATOR_STREET: "Prüfweg 1",
  LEGAL_OPERATOR_POSTAL_CODE: "12345",
  LEGAL_OPERATOR_CITY: "Prüfstadt",
  LEGAL_CONTACT_EMAIL: "kontakt@pruefportal.de",
  LEGAL_HOSTING_PROVIDER_NAME: "Prüfhost GmbH",
  LEGAL_HOSTING_PROCESSING_LOCATIONS: "Deutschland und EU/EWR",
  LEGAL_HOSTING_RETENTION_INFORMATION:
    "Providerseitige Betriebsdaten werden nach den geprüften Vertragsfristen gelöscht.",
  LEGAL_HOSTING_THIRD_COUNTRY_INFORMATION:
    "Eine Übermittlung durch den Hostinganbieter in Drittländer ist nicht vorgesehen.",
  LEGAL_EMAIL_PROVIDER_NAME: "Prüfmail GmbH",
  LEGAL_EMAIL_PROCESSING_LOCATIONS: "Deutschland und EU/EWR",
  LEGAL_EMAIL_THIRD_COUNTRY_INFORMATION:
    "Eine Übermittlung durch den Mailanbieter in Drittländer ist nicht vorgesehen.",
};

async function render(pathname = "/", environment = legalEnvironment) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ...environment,
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
  assert.match(html, /17(?:<!-- -->)* Themen aus dem Gemeinderat/);
  assert.match(html, /Wohngebiet Aukenroth/);
  assert.match(html, /Themen durchsuchen/);
  assert.match(html, /Politische Ebene/);
  assert.match(html, /Gemeinderat Rötgesbüttel/);
  assert.match(html, /Rötgesbüttel \+ Samtgemeinde/);
  assert.match(html, /Bearbeitungsstand/);
  assert.match(html, /Räumlicher Bezug/);
  assert.match(html, /Gesamte Samtgemeinde/);
  assert.match(html, /href="\/impressum"/);
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

test("renders complete legal and privacy disclosures from runtime configuration", async () => {
  const legalNotice = await render("/impressum");
  assert.equal(legalNotice.status, 200);
  const legalHtml = await legalNotice.text();
  assert.match(legalHtml, /Anbieterkennzeichnung/);
  assert.match(legalHtml, /Erika Prüfer/);
  assert.match(legalHtml, /Prüfweg 1/);
  assert.match(legalHtml, /mailto:kontakt@pruefportal.de/);
  assert.match(legalHtml, /§ 18 Abs. 1/);
  assert.match(legalHtml, /§ 18 Abs. 2/);
  assert.match(legalHtml, /Keine amtliche Veröffentlichung/);

  const privacyNotice = await render("/datenschutz");
  assert.equal(privacyNotice.status, 200);
  const privacyHtml = await privacyNotice.text();
  assert.match(privacyHtml, /Prüfhost GmbH/);
  assert.match(privacyHtml, /Prüfmail GmbH/);
  assert.match(privacyHtml, /Art. 6 Abs. 1 lit. f DSGVO/);
  assert.match(privacyHtml, /tile\.openstreetmap\.org/);
  assert.match(privacyHtml, /Angemessenheitsbeschluss/);
  assert.match(privacyHtml, /Prinzenstraße 5/);
  assert.match(privacyHtml, /Art. 22 DSGVO/);
  assert.match(privacyHtml, /Stand: 18. August 2026/);
  assert.doesNotMatch(privacyHtml, /TODO|NOCH ANGEBEN|im Aufbau/i);
});

test("blocks every route when legal production values are missing or placeholders", async () => {
  const missingResponse = await render("/api/health", {});
  assert.equal(missingResponse.status, 503);
  assert.equal(missingResponse.headers.get("cache-control"), "no-store");

  const placeholderResponse = await render("/impressum", {
    ...legalEnvironment,
    LEGAL_OPERATOR_STREET: "<Straße und Hausnummer>",
  });
  assert.equal(placeholderResponse.status, 503);
  assert.doesNotMatch(await placeholderResponse.text(), /Straße und Hausnummer/);
});

test("server-renders the source-backed council map", async () => {
  const response = await render("/karte");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Wo werden Entscheidungen sichtbar\?/);
  assert.match(html, /2(?:<!-- -->)* verortete Themen/);
  assert.match(html, /Themen auf der Karte/);
  assert.match(html, /Kartendaten: OpenStreetMap/);
  assert.match(html, /href="https:\/\/www\.openstreetmap\.org\/copyright"/);
  assert.match(html, /© OpenStreetMap contributors/);
  assert.match(html, /Kartenfehler bei OpenStreetMap melden/);
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
