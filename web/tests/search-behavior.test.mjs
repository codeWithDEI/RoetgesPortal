import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_COUNCIL_SCOPE,
  matchesTopicFilters,
  normalizeFilterText,
} from "../lib/topic-filters.ts";

const mapCollection = JSON.parse(
  readFileSync(
    new URL(
      "../public/data/views/council-map/layers/council-topics.geojson",
      import.meta.url,
    ),
    "utf8",
  ),
);

const topicItems = JSON.parse(
  readFileSync(
    new URL("../public/data/views/council/items.json", import.meta.url),
    "utf8",
  ),
).items;

const defaultFilters = {
  query: "",
  councilScope: DEFAULT_COUNCIL_SCOPE,
  area: "municipality-roetgesbuettel",
  status: "all",
  category: "all",
};

function topicMatches(topic, query) {
  return matchesTopicFilters(topic, { ...defaultFilters, query });
}

function mapFeatureMatches(feature, query) {
  const properties = feature.properties;
  return matchesTopicFilters(
    {
      title: properties.topicTitle,
      summary: properties.topicSummary,
      status: properties.topicStatus,
      categories: properties.categories,
      organizations: properties.organizations,
      relevantAreaIds: properties.relevantAreaIds,
      searchTerms: [properties.locationLabel, ...properties.areas],
    },
    { ...defaultFilters, query },
  );
}

test("normalizes umlauts, sharp s, punctuation and whitespace", () => {
  assert.equal(normalizeFilterText("  RÖTGESBÜTTEL  "), "rotgesbuttel");
  assert.equal(normalizeFilterText("Straße & Bahn"), "strasse bahn");
  assert.equal(normalizeFilterText("Feuerwehr-Bedarfsplan"), "feuerwehr bedarfsplan");
});

test("matches every search word independently of its order and source field", () => {
  const topic = {
    title: "Neue Straße",
    summary: "Die Erneuerung wird beraten.",
    status: "committee",
    categories: ["mobility"],
    organizations: ["municipality-roetgesbuettel"],
    relevantAreaIds: ["municipality-roetgesbuettel"],
    searchTerms: ["Verkehr"],
  };

  assert.equal(topicMatches(topic, "verkehr erneuerung strasse"), true);
  assert.equal(topicMatches(topic, "erneuerung unbekannt"), false);
});

test("finds real topics by title and keeps political scope active", () => {
  const aukenrothMatches = topicItems.filter((topic) =>
    topicMatches(topic, "AUKENROTH"),
  );
  assert.ok(
    aukenrothMatches.some(
      (topic) => topic.id === "aukenroth-residential-development",
    ),
  );

  const jointMunicipalityOnly = topicItems.find(
    (topic) => topic.id === "fire-service-procurements-2026",
  );
  assert.ok(jointMunicipalityOnly);
  assert.equal(topicMatches(jointMunicipalityOnly, "Feuerwehr"), false);
  assert.equal(
    matchesTopicFilters(jointMunicipalityOnly, {
      ...defaultFilters,
      query: "Feuerwehr",
      councilScope: "include-joint-municipality",
    }),
    true,
  );
});

test("finds map entries by topic and location without umlauts", () => {
  const pfaenderwegMatches = mapCollection.features.filter((feature) =>
    mapFeatureMatches(feature, "bahn pfanderweg"),
  );
  assert.ok(
    pfaenderwegMatches.some(
      (feature) => feature.properties.topicId === "pfaenderweg-rail-crossing",
    ),
  );

  const festplatzMatches = mapCollection.features.filter((feature) =>
    mapFeatureMatches(feature, "Festplatz"),
  );
  assert.ok(festplatzMatches.length > 0);
});
