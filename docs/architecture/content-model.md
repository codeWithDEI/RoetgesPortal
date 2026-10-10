# Content model

RötgesPortal separates facts, reusable datasets, and map presentation. This
keeps editorial content independent from any individual page or map.

Repository code and technical documentation are written in English.
Public-facing editorial content is written in German for the local audience.

## Collections

### Administrative areas

Files under `content/areas/` describe the member municipalities and their
administrative hierarchy. Topics reference the smallest accurate scope. A
Samtgemeinde-wide topic therefore references `joint-municipality-papenteich`,
while a local matter references one or more member municipalities.

The generator resolves both hierarchy directions for public filters. A
Samtgemeinde-wide topic appears in every member-municipality view; a
municipality-specific topic also appears in the Samtgemeinde overview. The
direct editorial scope remains unchanged and visible on the topic detail.

### Topics

Files under `content/topics/` describe municipal matters, their current state,
administrative scope, citations, milestones, and geographic impact. A topic
must never contain view-specific colors, marker icons, routes, or zoom levels.

The topic `status` is the lifecycle phase of the exact subject named in the
title. It is not the result of an individual motion and must not be copied from
technical ALLRIS labels such as `Erledigt`, `Geplant`, or `Gestoppt`.

`statusBasis` explains why the phase is justified and points to one of the
topic's listed sources. Its `scope` distinguishes a broad municipal matter, a
proposal-scoped topic, and an implementation measure. `latestDecision` records
the most recent formal decision independently, using one of these outcomes:

- `adopted`;
- `rejected`;
- `withdrawn`;
- `deferred`;
- `noted`;
- `no-decision`.

This separation allows a broad topic to remain in implementation even when one
alternative was rejected. Conversely, a proposal-scoped topic can be completed
while its latest decision clearly states that the proposal was withdrawn.

`latestActivity` is an optional object with required `date`, `summary`, and
`sourceUrl`. It records a verified substantive development using the original
event date, independently of `latestDecision` and editorial `dates.updatedAt`.
Late discovery does not make an old event recent. Corrections, text edits, and
retrospective status classification do not advance the activity date. A future
deadline may be announced today: today's evidenced announcement is the activity,
not the future event. See the [editorial policy](../governance/editorial-policy.md#substantive-developments-and-editorial-dates).

Omit the object when the development or its date cannot be established. There
is no fallback to an editorial date, decision, or milestone. Topic detail pages
show an evidenced activity separately from editorial update/verification dates.

Mayor's reports in public minutes use the existing source and text fields:
source titles identify the report, meeting date, agenda item, and section;
report-derived summaries explicitly name the report. Keep the original event
date when stated; otherwise date the activity as a report and say so. There is
no dedicated structured report-provenance field. A reported state remains
distinct from a directly inspected resolution or independently verified
implementation; see the
[report attribution policy](../governance/editorial-policy.md#mayors-reports-in-public-minutes).

### Datasets

Files under `content/datasets/` register reusable inputs. A dataset can point
to the topic collection or to a GeoJSON file. Optional normalization identifies
the preprocessing profile required before a dataset can be consumed.

Datasets provide stable IDs, so views do not depend directly on physical input
paths.

### Views

Files under `content/views/` define public routes. A view owns:

- a stable route;
- one or more named data sources;
- optional topic filters and deterministic sorting on each source;
- exactly one presentation type;
- a semantic presentation preset.

A source references exactly one dataset. The presentation references sources
by their stable IDs. This separates data selection from rendering: a list can
consume a filtered topic source, while a later map presentation can reuse the
same dataset through one or more layers.

The council topic collection is currently presented through both list and map
views. The draft flea market view exercises the same map contract with a
standalone GeoJSON dataset without affecting the council routes.

Presentation presets are semantic IDs rather than raw CSS or library-specific
configuration. The web application resolves presets such as
`council-topic-list`, `council-topic-status`, or `flea-market-stand` to
concrete visual styles.

## Reference rules

The content validator enforces rules that JSON Schema cannot check across
files:

1. File names and `id` values must match.
2. IDs must be unique within their collection.
3. Every source must reference an existing dataset.
4. Source IDs and map layer IDs must be unique within a view.
5. Published view routes must be unique.
6. Referenced files must exist and remain inside the repository.
7. `minZoom` must not be greater than `zoom` or `maxZoom`.
8. Topic filters and sorting may only be used with a `topics` dataset.
9. Published topics and documented positions must have verifiable citations.
10. Every presentation and map layer must reference a source from its view.
11. Every topic area must exist, and the administrative hierarchy must be
    acyclic.
12. `statusBasis.sourceUrl`, `latestDecision.sourceUrl`, and
    `latestActivity.sourceUrl` must match a source listed on the same topic.
13. `latestActivity.date` must not be later than `dates.lastVerifiedAt`.

## Geographic conventions

- All coordinates use WGS 84.
- GeoJSON always stores coordinates as longitude, latitude.
- View centers use named `longitude` and `latitude` fields to avoid ambiguity.
- Reusable standalone geography belongs in a GeoJSON dataset.
- Topic-specific geography is stored as a GeoJSON file referenced by the
  topic's `locations` collection.
- A topic location may keep an empty `coordinates` array while editors are
  still locating it. The generator omits that feature until coordinates are
  added. Editors may change the geometry type from `Point` to another GeoJSON
  geometry when a line or area describes the impact more accurately.
- Map presentations only select and present geographic data; they never embed
  coordinates or rendering-library configuration.

## Generated output contract

The portal generator will treat files below `content/` as inputs and write
runtime artifacts below `generated/`:

```text
generated/
├── areas.json
├── latest-activity.json
├── datasets/
│   └── topics.json
├── topics/
│   └── <topic-id>.json
├── views/
│   ├── index.json
│   ├── council/
│   │   ├── manifest.json
│   │   └── items.json
│   └── council-map/
│       ├── manifest.json
│       └── layers/
│           └── council-topics.geojson
└── search-index.json
```

The browser consumes generated artifacts only. It does not parse editorial
YAML or raw GeoJSON. Only published topics and views are included. Builds are
deterministic and do not include build timestamps. Dataset artifacts are
created only when a published view references them. A topic-backed map layer
combines referenced location files and enriches every feature with stable topic
navigation and filter properties. The `relevantAreaIds` property is generated
from the area hierarchy and is never edited directly. A standalone
GeoJSON-backed layer reuses its normalized dataset artifact directly.

### Latest substantive developments for external consumers

`latestActivity` is preserved in topic details, topic datasets, compact list
items, and search items. This is an additive optional field in schema version 3.
The generated `/data/latest-activity.json` file provides all published topics
with that field, including completed topics outside the active council view.
It contains one item per topic, sorted by `latestActivity.date` descending and
stable topic `id` ascending for ties. It is a current-topic index, not an event
history or a completeness claim about municipal activity.

Each item has the compact list fields plus `path` (portal-relative page path);
`detail` is relative to the index, e.g. `topics/<id>.json`. The `latestActivity`
object contains the event text and its source URL. `coverage.publishedTopics`
and `coverage.topicsWithLatestActivity` expose how much of the published topic
collection has verified activity metadata. Missing items must not be assigned
`updatedAt` as an inferred activity date.

For a consumer such as fair-roetgesbüttel.de, fetch the JSON at build/server time,
filter the desired political/geographic scope **before** taking the first three,
and label the displayed date as an event date. For municipality-owned topics:

```js
const response = await fetch("https://roetgesportal.de/data/latest-activity.json");
if (!response.ok) throw new Error(`Portal data unavailable: ${response.status}`);
const { items, coverage } = await response.json();
const latestThree = items
  .filter((topic) => topic.organizations.includes("municipality-roetgesbuettel"))
  .slice(0, 3);
// Use topic.latestActivity.date/summary/sourceUrl and topic.path.
// Keep coverage visible to the consuming editor; fewer than three is valid.
```

To include relevant Samtgemeinde topics as well, select both organization IDs
(`municipality-roetgesbuettel`, `joint-municipality-papenteich`) and require
`relevantAreaIds` to include `municipality-roetgesbuettel`. Geography alone does
not identify the responsible political body. No external consumer is changed
by this repository update, and no cross-origin browser access is assumed.
The existing `/neu`, RSS, and council-view ordering continue to describe
editorial updates; their dates are not substantive-activity dates.

The administrative structure is based on the official Samtgemeinde Papenteich
member-municipality listing:
<https://www.papenteich.de/Rathaus-Politik/Informationen-%C3%BCber-den-Papenteich/Geschichte-und-Entwicklung/>.
