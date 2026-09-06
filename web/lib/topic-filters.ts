export type CouncilScope =
  | "roetgesbuettel"
  | "include-joint-municipality";

export const DEFAULT_COUNCIL_SCOPE: CouncilScope = "roetgesbuettel";
export const ROETGESBUETTEL_COUNCIL_ORGANIZATION_ID =
  "municipality-roetgesbuettel";

export type FilterableTopic = {
  title: string;
  summary: string;
  status: string;
  categories: string[];
  organizations: string[];
  relevantAreaIds: string[];
  searchTerms?: string[];
};

export type TopicFilters = {
  query: string;
  councilScope: CouncilScope;
  area: string;
  status: string;
  category: string;
};

export function normalizeFilterText(value: string): string {
  return value
    .toLocaleLowerCase("de-DE")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function matchesCouncilScope(
  organizations: string[],
  councilScope: CouncilScope,
): boolean {
  return (
    councilScope === "include-joint-municipality" ||
    organizations.includes(ROETGESBUETTEL_COUNCIL_ORGANIZATION_ID)
  );
}

export function areaIsAvailableForCouncilScope(
  areaId: string,
  councilScope: CouncilScope,
): boolean {
  return (
    councilScope === "include-joint-municipality" ||
    areaId === ROETGESBUETTEL_COUNCIL_ORGANIZATION_ID
  );
}

export function areaForCouncilScope(
  areaId: string,
  councilScope: CouncilScope,
): string {
  return areaIsAvailableForCouncilScope(areaId, councilScope)
    ? areaId
    : ROETGESBUETTEL_COUNCIL_ORGANIZATION_ID;
}

export function matchesTopicFilters(
  topic: FilterableTopic,
  filters: TopicFilters,
): boolean {
  if (!matchesCouncilScope(topic.organizations, filters.councilScope)) {
    return false;
  }
  if (!topic.relevantAreaIds.includes(filters.area)) return false;
  if (filters.status !== "all" && topic.status !== filters.status) {
    return false;
  }
  if (
    filters.category !== "all" &&
    !topic.categories.includes(filters.category)
  ) {
    return false;
  }

  const queryTokens = normalizeFilterText(filters.query)
    .split(" ")
    .filter(Boolean);
  if (queryTokens.length === 0) return true;

  const searchable = normalizeFilterText(
    [
      topic.title,
      topic.summary,
      ...topic.categories,
      ...(topic.searchTerms ?? []),
    ].join(" "),
  );
  return queryTokens.every((token) => searchable.includes(token));
}
