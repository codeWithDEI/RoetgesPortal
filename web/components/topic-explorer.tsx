"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  areaLabel,
  categoryLabel,
  decisionOutcomeLabels,
  formatCompactDate,
  statusLabels,
  topicAreaLabel,
} from "@/lib/presentation";
import { DEFAULT_AREA_ID, type AdministrativeArea } from "@/lib/areas";
import {
  type TopicListItem,
  type TopicStatus,
} from "@/lib/topics";
import {
  DEFAULT_COUNCIL_SCOPE,
  areaForCouncilScope,
  areaIsAvailableForCouncilScope,
  matchesTopicFilters,
  type CouncilScope,
} from "@/lib/topic-filters";
import { StatusBadge } from "./status-badge";

type TopicExplorerProps = {
  items: TopicListItem[];
  statuses: TopicStatus[];
  categories: string[];
  areas: AdministrativeArea[];
};

export function TopicExplorer({
  items,
  statuses,
  categories,
  areas,
}: TopicExplorerProps) {
  const [query, setQuery] = useState("");
  const [councilScope, setCouncilScope] = useState<CouncilScope>(
    DEFAULT_COUNCIL_SCOPE,
  );
  const [area, setArea] = useState(DEFAULT_AREA_ID);
  const [status, setStatus] = useState<TopicStatus | "all">("all");
  const [category, setCategory] = useState("all");

  const availableAreas = useMemo(
    () =>
      areas.filter((itemArea) =>
        areaIsAvailableForCouncilScope(itemArea.id, councilScope),
      ),
    [areas, councilScope],
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        matchesTopicFilters(
          {
            ...item,
            searchTerms: [
              ...item.categories.map(categoryLabel),
              ...item.areas.map(areaLabel),
            ],
          },
          { query, councilScope, area, status, category },
        ),
      ),
    [area, category, councilScope, items, query, status],
  );

  const hasFilters =
    query !== "" ||
    councilScope !== DEFAULT_COUNCIL_SCOPE ||
    area !== DEFAULT_AREA_ID ||
    status !== "all" ||
    category !== "all";

  function resetFilters() {
    setQuery("");
    setCouncilScope(DEFAULT_COUNCIL_SCOPE);
    setArea(DEFAULT_AREA_ID);
    setStatus("all");
    setCategory("all");
  }

  function changeCouncilScope(nextScope: CouncilScope) {
    setCouncilScope(nextScope);
    setArea((currentArea) => areaForCouncilScope(currentArea, nextScope));
  }

  return (
    <section className="topic-explorer" aria-labelledby="topic-list-heading">
      <div className="filter-panel">
        <div className="filter-panel__search">
          <label htmlFor="topic-search">Themen durchsuchen</label>
          <div className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              id="topic-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="z. B. Kita, Verkehr oder Aukenroth"
              type="search"
              value={query}
            />
          </div>
        </div>
        <div className="filter-panel__select">
          <label htmlFor="council-scope-filter">Politische Ebene</label>
          <select
            id="council-scope-filter"
            onChange={(event) =>
              changeCouncilScope(event.target.value as CouncilScope)
            }
            value={councilScope}
          >
            <option value="roetgesbuettel">
              Gemeinderat Rötgesbüttel
            </option>
            <option value="include-joint-municipality">
              Rötgesbüttel + Samtgemeinde
            </option>
          </select>
        </div>
        <div className="filter-panel__select">
          <label htmlFor="area-filter">Räumlicher Bezug</label>
          <select
            id="area-filter"
            onChange={(event) => setArea(event.target.value)}
            value={area}
          >
            {availableAreas.map((itemArea) => (
              <option key={itemArea.id} value={itemArea.id}>
                {itemArea.type === "jointMunicipality"
                  ? "Gesamte Samtgemeinde"
                  : itemArea.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-panel__select">
          <label htmlFor="status-filter">Themenstand</label>
          <select
            id="status-filter"
            onChange={(event) =>
              setStatus(event.target.value as TopicStatus | "all")
            }
            value={status}
          >
            <option value="all">Alle Status</option>
            {statuses.map((itemStatus) => (
              <option key={itemStatus} value={itemStatus}>
                {statusLabels[itemStatus]}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-panel__select">
          <label htmlFor="category-filter">Themenbereich</label>
          <select
            id="category-filter"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="all">Alle Bereiche</option>
            {categories.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {categoryLabel(itemCategory)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="result-heading">
        <div>
          <p className="eyebrow">Aktuelle Übersicht</p>
          <h2 id="topic-list-heading">
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "Thema" : "Themen"}
          </h2>
        </div>
        {hasFilters ? (
          <button className="reset-button" onClick={resetFilters} type="button">
            Filter zurücksetzen
          </button>
        ) : null}
      </div>

      {filteredItems.length > 0 ? (
        <div className="topic-list">
          {filteredItems.map((topic) => (
            <article className="topic-card" key={topic.id}>
              <div className="topic-card__meta">
                <span className="topic-card__status">
                  <small>Themenstand</small>
                  <StatusBadge status={topic.status} />
                </span>
                {topic.latestDecision ? (
                  <span>
                    Letzte Entscheidung:{" "}
                    {decisionOutcomeLabels[topic.latestDecision.outcome]}
                  </span>
                ) : null}
                <span>
                  Aktualisiert am {formatCompactDate(topic.dates.updatedAt)}
                </span>
                <span>Betrifft: {topicAreaLabel(topic.areas)}</span>
              </div>
              <div className="topic-card__content">
                <h3>
                  <Link href={`/themen/${topic.id}`}>{topic.title}</Link>
                </h3>
                <p>{topic.summary}</p>
              </div>
              <div className="topic-card__footer">
                <ul className="tag-list" aria-label="Themenbereiche">
                  {topic.categories.slice(0, 3).map((itemCategory) => (
                    <li key={itemCategory}>{categoryLabel(itemCategory)}</li>
                  ))}
                </ul>
                <Link
                  className="topic-card__link"
                  href={`/themen/${topic.id}`}
                >
                  Details
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="eyebrow">Keine Treffer</p>
          <h3>Zu dieser Auswahl gibt es aktuell kein Thema.</h3>
          <p>Ändere den Suchbegriff oder setze die Filter zurück.</p>
          <button onClick={resetFilters} type="button">
            Alle Themen anzeigen
          </button>
        </div>
      )}
    </section>
  );
}
