import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_COUNCIL_SCOPE,
  areaForCouncilScope,
  areaIsAvailableForCouncilScope,
  matchesCouncilScope,
  matchesTopicFilters,
  normalizeFilterText,
} from "../lib/topic-filters.ts";

const municipalityTopic = {
  title: "Straßenbeleuchtung in Rötgesbüttel",
  summary: "Die Erneuerung wird im Gemeinderat beraten.",
  status: "committee",
  categories: ["transport"],
  organizations: ["municipality-roetgesbuettel"],
  relevantAreaIds: ["municipality-roetgesbuettel"],
  searchTerms: ["Verkehr"],
};

const jointMunicipalityTopic = {
  title: "Feuerwehrbedarfsplan im Papenteich",
  summary: "Das Thema wird in der Samtgemeinde beraten.",
  status: "council",
  categories: ["fire-protection"],
  organizations: ["joint-municipality-papenteich"],
  relevantAreaIds: [
    "joint-municipality-papenteich",
    "municipality-roetgesbuettel",
  ],
};

const defaultFilters = {
  query: "",
  councilScope: DEFAULT_COUNCIL_SCOPE,
  area: "municipality-roetgesbuettel",
  status: "all",
  category: "all",
};

test("normalizes German search terms without requiring umlauts", () => {
  assert.equal(normalizeFilterText("Rötgesbüttel"), "rotgesbuttel");
  assert.equal(normalizeFilterText("SCHWÜLPER"), "schwulper");
});

test("defaults to topics owned by the Rötgesbüttel council", () => {
  assert.equal(
    matchesCouncilScope(municipalityTopic.organizations, DEFAULT_COUNCIL_SCOPE),
    true,
  );
  assert.equal(
    matchesCouncilScope(
      jointMunicipalityTopic.organizations,
      DEFAULT_COUNCIL_SCOPE,
    ),
    false,
  );
  assert.equal(matchesTopicFilters(municipalityTopic, defaultFilters), true);
  assert.equal(matchesTopicFilters(jointMunicipalityTopic, defaultFilters), false);
});

test("adds relevant joint-municipality topics only when requested", () => {
  const filters = {
    ...defaultFilters,
    councilScope: "include-joint-municipality",
  };
  assert.equal(matchesTopicFilters(municipalityTopic, filters), true);
  assert.equal(matchesTopicFilters(jointMunicipalityTopic, filters), true);
});

test("combines political level, area, status, category and search", () => {
  assert.equal(
    matchesTopicFilters(municipalityTopic, {
      ...defaultFilters,
      query: "rotgesbuttel",
      status: "committee",
      category: "transport",
    }),
    true,
  );
  assert.equal(
    matchesTopicFilters(municipalityTopic, {
      ...defaultFilters,
      status: "completed",
    }),
    false,
  );
  assert.equal(
    matchesTopicFilters(jointMunicipalityTopic, {
      ...defaultFilters,
      councilScope: "include-joint-municipality",
      area: "municipality-adenbuettel",
    }),
    false,
  );
});

test("keeps area choices compatible with the selected political level", () => {
  assert.equal(
    areaIsAvailableForCouncilScope(
      "municipality-roetgesbuettel",
      DEFAULT_COUNCIL_SCOPE,
    ),
    true,
  );
  assert.equal(
    areaIsAvailableForCouncilScope(
      "municipality-adenbuettel",
      DEFAULT_COUNCIL_SCOPE,
    ),
    false,
  );
  assert.equal(
    areaForCouncilScope("municipality-adenbuettel", DEFAULT_COUNCIL_SCOPE),
    "municipality-roetgesbuettel",
  );
  assert.equal(
    areaForCouncilScope(
      "municipality-adenbuettel",
      "include-joint-municipality",
    ),
    "municipality-adenbuettel",
  );
});
