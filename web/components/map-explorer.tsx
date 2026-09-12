"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";
import { categoryLabel, statusLabels } from "@/lib/presentation";
import {
  DEFAULT_AREA_ID,
  areaLabel,
  filterAreas,
} from "@/lib/areas";
import type { TopicStatus } from "@/lib/topics";
import {
  DEFAULT_COUNCIL_SCOPE,
  ROETGESBUETTEL_COUNCIL_ORGANIZATION_ID,
  areaForCouncilScope,
  areaIsAvailableForCouncilScope,
  matchesTopicFilters,
  type CouncilScope,
  type TopicFilters,
} from "@/lib/topic-filters";
import { StatusBadge } from "./status-badge";

type PointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

type TopicMapProperties = {
  topicId: string;
  topicTitle: string;
  topicSummary: string;
  topicStatus: TopicStatus;
  categories: string[];
  organizations: string[];
  areas: string[];
  relevantAreaIds: string[];
  locationLabel: string;
  impactType: string;
  detailPath: string;
};

type TopicMapFeature = {
  type: "Feature";
  id?: string;
  geometry: PointGeometry | { type: string; coordinates: unknown };
  properties: TopicMapProperties & Record<string, unknown>;
};

type TopicMapCollection = {
  type: "FeatureCollection";
  features: TopicMapFeature[];
};

type MapExplorerProps = {
  center: [number, number];
  dataUrl: string;
  maxZoom: number;
  minZoom: number;
  zoom: number;
};

const sourceId = "council-topic-locations";
const polygonFillLayerId = "council-topic-polygons-fill";
const polygonOutlineLayerId = "council-topic-polygons-outline";
const lineLayerId = "council-topic-lines";
const pointLayerId = "council-topic-points";
const interactiveLayerIds = [
  polygonFillLayerId,
  lineLayerId,
  pointLayerId,
];

const statusColors: Record<TopicStatus, string> = {
  idea: "#65777d",
  announced: "#65777d",
  open: "#65777d",
  consultation: "#8b6d18",
  committee: "#315e71",
  council: "#006080",
  decided: "#2d6847",
  implementation: "#007da4",
  active: "#2d6847",
  completed: "#2d6847",
  paused: "#a35832",
  rejected: "#8a4b2d",
};

type MapBounds = [[number, number], [number, number]];

function featureBounds(feature: TopicMapFeature): MapBounds | null {
  let minLongitude = Number.POSITIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  function visitCoordinates(value: unknown) {
    if (
      Array.isArray(value) &&
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      minLongitude = Math.min(minLongitude, value[0]);
      minLatitude = Math.min(minLatitude, value[1]);
      maxLongitude = Math.max(maxLongitude, value[0]);
      maxLatitude = Math.max(maxLatitude, value[1]);
      return;
    }
    if (Array.isArray(value)) value.forEach(visitCoordinates);
  }

  visitCoordinates(feature.geometry.coordinates);
  if (!Number.isFinite(minLongitude) || !Number.isFinite(minLatitude)) {
    return null;
  }
  return [
    [minLongitude, minLatitude],
    [maxLongitude, maxLatitude],
  ];
}

function mapFilter(
  geometryType: "Point" | "LineString" | "Polygon",
  councilScope: CouncilScope,
  area: string,
  status: TopicStatus | "all",
  category: string,
): FilterSpecification {
  const expressions: FilterSpecification[] = [
    ["==", ["geometry-type"], geometryType],
    ["in", area, ["get", "relevantAreaIds"]],
  ];
  if (councilScope === "roetgesbuettel") {
    expressions.push([
      "in",
      ROETGESBUETTEL_COUNCIL_ORGANIZATION_ID,
      ["get", "organizations"],
    ]);
  }
  if (status !== "all") {
    expressions.push(["==", ["get", "topicStatus"], status]);
  }
  if (category !== "all") {
    expressions.push(["in", category, ["get", "categories"]]);
  }
  return ["all", ...expressions] as FilterSpecification;
}

function matchesMapFeatureFilters(
  feature: TopicMapFeature,
  filters: TopicFilters,
): boolean {
  return matchesTopicFilters(
    {
      title: feature.properties.topicTitle,
      summary: feature.properties.topicSummary,
      status: feature.properties.topicStatus,
      categories: feature.properties.categories,
      organizations: feature.properties.organizations,
      relevantAreaIds: feature.properties.relevantAreaIds,
      searchTerms: [
        feature.properties.locationLabel,
        ...feature.properties.categories.map(categoryLabel),
        ...feature.properties.areas.map(areaLabel),
      ],
    },
    filters,
  );
}

function filteredMapCollection(
  collection: TopicMapCollection,
  filters: TopicFilters,
): TopicMapCollection {
  return {
    ...collection,
    features: collection.features.filter((feature) =>
      matchesMapFeatureFilters(feature, filters),
    ),
  };
}

export function MapExplorer({
  center,
  dataUrl,
  maxZoom,
  minZoom,
  zoom,
}: MapExplorerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [collection, setCollection] = useState<TopicMapCollection | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [councilScope, setCouncilScope] = useState<CouncilScope>(
    DEFAULT_COUNCIL_SCOPE,
  );
  const [area, setArea] = useState(DEFAULT_AREA_ID);
  const [status, setStatus] = useState<TopicStatus | "all">("all");
  const [category, setCategory] = useState("all");
  const filtersRef = useRef({ query, councilScope, area, status, category });

  useEffect(() => {
    filtersRef.current = { query, councilScope, area, status, category };
  }, [area, category, councilScope, query, status]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(dataUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Map data could not be loaded");
        return response.json() as Promise<TopicMapCollection>;
      })
      .then(setCollection)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLoadError(true);
        }
      });
    return () => controller.abort();
  }, [dataUrl]);

  useEffect(() => {
    if (!collection || !containerRef.current) return;

    let disposed = false;
    let map: MapLibreMap | null = null;

    void import("maplibre-gl").then(
      ({ Map, NavigationControl, Popup, setWorkerUrl }) => {
        if (disposed || !containerRef.current) return;

        // Let Vite bundle the worker and its shared module into a regular
        // JavaScript build asset that custom domains can serve reliably.
        setWorkerUrl(mapLibreWorkerUrl);

        map = new Map({
          container: containerRef.current,
          center,
          zoom,
          minZoom,
          maxZoom,
          cooperativeGestures: true,
          attributionControl: false,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution:
                  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>',
              },
            },
            layers: [
              {
                id: "osm-base",
                type: "raster",
                source: "osm",
              },
            ],
          },
        });
        mapRef.current = map;
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          if (!map) return;
          const activeFilters = filtersRef.current;
          map.addSource(sourceId, {
            type: "geojson",
            data: filteredMapCollection(collection, activeFilters) as never,
          });
          map.addLayer({
            id: polygonFillLayerId,
            type: "fill",
            source: sourceId,
            filter: mapFilter(
              "Polygon",
              activeFilters.councilScope,
              activeFilters.area,
              activeFilters.status,
              activeFilters.category,
            ),
            paint: {
              "fill-color": [
                "match",
                ["get", "topicStatus"],
                ...Object.entries(statusColors).flat(),
                "#006080",
              ] as never,
              "fill-opacity": 0.24,
            },
          });
          map.addLayer({
            id: polygonOutlineLayerId,
            type: "line",
            source: sourceId,
            filter: mapFilter(
              "Polygon",
              activeFilters.councilScope,
              activeFilters.area,
              activeFilters.status,
              activeFilters.category,
            ),
            paint: {
              "line-color": [
                "match",
                ["get", "topicStatus"],
                ...Object.entries(statusColors).flat(),
                "#006080",
              ] as never,
              "line-opacity": 0.95,
              "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 18, 5],
            },
          });
          map.addLayer({
            id: lineLayerId,
            type: "line",
            source: sourceId,
            filter: mapFilter(
              "LineString",
              activeFilters.councilScope,
              activeFilters.area,
              activeFilters.status,
              activeFilters.category,
            ),
            paint: {
              "line-color": [
                "match",
                ["get", "topicStatus"],
                ...Object.entries(statusColors).flat(),
                "#006080",
              ] as never,
              "line-opacity": 0.95,
              "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 18, 7],
            },
          });
          map.addLayer({
            id: pointLayerId,
            type: "circle",
            source: sourceId,
            filter: mapFilter(
              "Point",
              activeFilters.councilScope,
              activeFilters.area,
              activeFilters.status,
              activeFilters.category,
            ),
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 8, 18, 13],
              "circle-color": [
                "match",
                ["get", "topicStatus"],
                ...Object.entries(statusColors).flat(),
                "#006080",
              ] as never,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 3,
              "circle-opacity": 0.96,
            },
          });

          const showPopup = (event: MapLayerMouseEvent) => {
            const feature = event.features?.[0];
            if (!feature) return;
            const properties = feature.properties as unknown as TopicMapProperties;
            const popupContent = document.createElement("article");
            popupContent.className = "map-popup";

            const location = document.createElement("p");
            location.className = "map-popup__location";
            location.textContent = properties.locationLabel;

            const title = document.createElement("strong");
            title.textContent = properties.topicTitle;

            const summary = document.createElement("p");
            summary.textContent = properties.topicSummary;

            const link = document.createElement("a");
            link.href = properties.detailPath;
            link.textContent = "Thema ansehen →";

            popupContent.append(location, title, summary, link);
            new Popup({ offset: 16, closeButton: true })
              .setLngLat(event.lngLat)
              .setDOMContent(popupContent)
              .addTo(map as MapLibreMap);
          };

          map.on("click", interactiveLayerIds, showPopup);
          map.on("mouseenter", interactiveLayerIds, () => {
            if (map) map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", interactiveLayerIds, () => {
            if (map) map.getCanvas().style.cursor = "";
          });
        });
      },
    );

    return () => {
      disposed = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [center, collection, maxZoom, minZoom, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const layers: Array<[
      string,
      "Point" | "LineString" | "Polygon",
    ]> = [
      [polygonFillLayerId, "Polygon"],
      [polygonOutlineLayerId, "Polygon"],
      [lineLayerId, "LineString"],
      [pointLayerId, "Point"],
    ];
    const activeFilters = { query, councilScope, area, status, category };
    const source = map?.getSource(sourceId) as GeoJSONSource | undefined;
    if (source && collection) {
      source.setData(filteredMapCollection(collection, activeFilters) as never);
    }
    for (const [layerId, geometryType] of layers) {
      if (map?.getLayer(layerId)) {
        map.setFilter(
          layerId,
          mapFilter(
            geometryType,
            councilScope,
            area,
            status,
            category,
          ),
        );
      }
    }
  }, [area, category, collection, councilScope, query, status]);

  const areas = useMemo(
    () =>
      filterAreas(
        Array.from(
          new Set(
            collection?.features.flatMap(
              (feature) => feature.properties.relevantAreaIds,
            ) ?? [],
          ),
        ),
      ),
    [collection],
  );

  const availableAreas = useMemo(
    () =>
      areas.filter((itemArea) =>
        areaIsAvailableForCouncilScope(itemArea.id, councilScope),
      ),
    [areas, councilScope],
  );

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          collection?.features.map(
            (feature) => feature.properties.topicStatus,
          ) ?? [],
        ),
      ).sort(),
    [collection],
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          collection?.features.flatMap(
            (feature) => feature.properties.categories,
          ) ?? [],
        ),
      ).sort((left, right) =>
        categoryLabel(left).localeCompare(categoryLabel(right), "de-DE"),
      ),
    [collection],
  );
  const filteredFeatures = useMemo(
    () =>
      collection?.features.filter((feature) =>
        matchesMapFeatureFilters(feature, {
          query,
          councilScope,
          area,
          status,
          category,
        }),
      ) ?? [],
    [area, category, collection, councilScope, query, status],
  );

  const hasFilters =
    query !== "" ||
    councilScope !== DEFAULT_COUNCIL_SCOPE ||
    area !== DEFAULT_AREA_ID ||
    status !== "all" ||
    category !== "all";

  function changeCouncilScope(nextScope: CouncilScope) {
    setCouncilScope(nextScope);
    setArea((currentArea) => areaForCouncilScope(currentArea, nextScope));
  }

  function resetFilters() {
    setQuery("");
    setCouncilScope(DEFAULT_COUNCIL_SCOPE);
    setArea(DEFAULT_AREA_ID);
    setStatus("all");
    setCategory("all");
  }

  function focusFeature(feature: TopicMapFeature) {
    const map = mapRef.current;
    const bounds = featureBounds(feature);
    if (!map || !bounds) return;
    if (feature.geometry.type === "Point") {
      map.flyTo({ center: bounds[0], zoom: 17 });
      return;
    }
    map.fitBounds(bounds, { duration: 900, maxZoom: 17, padding: 64 });
  }

  return (
    <section className="map-explorer" aria-labelledby="map-heading">
      <div className="map-explorer__heading">
        <div>
          <p className="eyebrow">Ortsbezug sichtbar machen</p>
          <h2 id="map-heading">Themen auf der Karte</h2>
        </div>
        <p>
          Gezeigt werden nur Themen, deren räumlicher Bezug aus den
          öffentlichen Unterlagen nachvollziehbar ist.
        </p>
      </div>

      <div className="map-filters" aria-label="Kartenfilter">
        <label className="map-filters__search" htmlFor="map-topic-search">
          <span>Ortsbezüge durchsuchen</span>
          <span className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              id="map-topic-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="z. B. Kita, Festplatz oder Pfänderweg"
              type="search"
              value={query}
            />
          </span>
        </label>
        <label>
          Politische Ebene
          <select
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
        </label>
        <label>
          Räumlicher Bezug
          <select
            onChange={(event) => setArea(event.target.value)}
            value={area}
          >
            {availableAreas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.type === "jointMunicipality"
                  ? "Gesamte Samtgemeinde"
                  : areaLabel(item.id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Themenstand
          <select
            onChange={(event) =>
              setStatus(event.target.value as TopicStatus | "all")
            }
            value={status}
          >
            <option value="all">Alle Status</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Themenbereich
          <select
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="all">Alle Bereiche</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {categoryLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <div className="map-filters__summary">
          <span className="map-filters__count" aria-live="polite">
            {filteredFeatures.length}{" "}
            {filteredFeatures.length === 1 ? "Ortsbezug" : "Ortsbezüge"}
          </span>
          {hasFilters ? (
            <button className="reset-button" onClick={resetFilters} type="button">
              Filter zurücksetzen
            </button>
          ) : null}
        </div>
      </div>

      <div className="map-layout">
        <div className="map-stage">
          {loadError ? (
            <div className="map-stage__message" role="alert">
              Die Kartendaten konnten nicht geladen werden. Die Themenliste
              bleibt weiterhin verfügbar.
            </div>
          ) : null}
          {!collection && !loadError ? (
            <div className="map-stage__message">Karte wird geladen …</div>
          ) : null}
          <div
            aria-label="Interaktive Karte von Rötgesbüttel und dem Papenteich"
            className="map-canvas"
            ref={containerRef}
            role="region"
          />
          <div className="map-stage__attribution">
            <a
              href="https://www.openstreetmap.org/copyright"
              rel="noreferrer"
              target="_blank"
            >
              © OpenStreetMap contributors
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.openstreetmap.org/fixthemap"
              rel="noreferrer"
              target="_blank"
            >
              Kartenfehler bei OpenStreetMap melden
            </a>
          </div>
        </div>

        <div
          aria-label="Gefilterte Ortsbezüge"
          className="mapped-topic-list"
          tabIndex={0}
        >
          <div className="mapped-topic-list__heading">
            <strong>Ortsbezüge in dieser Ansicht</strong>
            <span>Auswahl öffnet den Kartenausschnitt</span>
          </div>
          {filteredFeatures.length > 0 ? (
            <ol>
              {filteredFeatures.map((feature) => (
                <li key={feature.id ?? feature.properties.locationLabel}>
                  <button
                    onClick={() => focusFeature(feature)}
                    type="button"
                  >
                    <span>{feature.properties.locationLabel}</span>
                    <strong>{feature.properties.topicTitle}</strong>
                    <StatusBadge status={feature.properties.topicStatus} />
                  </button>
                  <Link href={feature.properties.detailPath}>
                    Details <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mapped-topic-list__empty">
              Zu dieser Suche und Filterauswahl ist aktuell kein Ortsbezug
              hinterlegt.
            </p>
          )}
        </div>
      </div>

      <div className="map-note">
        <strong>Noch ohne Kartenbezug?</strong>
        <p>
          Ein Thema kann vollständig dokumentiert sein, ohne einen eindeutigen
          Ort zu haben. Die vollständige Übersicht findest du weiterhin unter{" "}
          <Link href="/themen">Themen</Link>.
        </p>
      </div>
    </section>
  );
}
