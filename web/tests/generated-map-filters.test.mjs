import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_COUNCIL_SCOPE,
  matchesTopicFilters,
} from "../lib/topic-filters.ts";

const collection = JSON.parse(
  readFileSync(
    new URL(
      "../public/data/views/council-map/layers/council-topics.geojson",
      import.meta.url,
    ),
    "utf8",
  ),
);

function matchesFeature(feature, councilScope) {
  const properties = feature.properties;
  return matchesTopicFilters(
    {
      title: properties.topicTitle,
      summary: properties.topicSummary,
      status: properties.topicStatus,
      categories: properties.categories,
      organizations: properties.organizations,
      relevantAreaIds: properties.relevantAreaIds,
    },
    {
      query: "",
      councilScope,
      area: "municipality-roetgesbuettel",
      status: "all",
      category: "all",
    },
  );
}

test("generated map features contain every property required by the filters", () => {
  assert.ok(collection.features.length > 0);
  for (const feature of collection.features) {
    assert.ok(Array.isArray(feature.properties.organizations));
    assert.ok(Array.isArray(feature.properties.relevantAreaIds));
    assert.ok(Array.isArray(feature.properties.categories));
    assert.equal(typeof feature.properties.topicStatus, "string");
  }
});

test("the generated map defaults to council topics and can add joint-municipality topics", () => {
  const municipalityFeatures = collection.features.filter((feature) =>
    matchesFeature(feature, DEFAULT_COUNCIL_SCOPE),
  );
  const combinedFeatures = collection.features.filter((feature) =>
    matchesFeature(feature, "include-joint-municipality"),
  );

  assert.ok(municipalityFeatures.length > 0);
  assert.ok(combinedFeatures.length > municipalityFeatures.length);
  assert.ok(
    municipalityFeatures.every((feature) =>
      feature.properties.organizations.includes(
        "municipality-roetgesbuettel",
      ),
    ),
  );
  assert.ok(
    combinedFeatures.some(
      (feature) =>
        !feature.properties.organizations.includes(
          "municipality-roetgesbuettel",
        ),
    ),
  );
});
