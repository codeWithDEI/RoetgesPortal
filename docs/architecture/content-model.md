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
views.

Presentation presets are semantic IDs rather than raw CSS or library-specific
configuration. The web application resolves presets such as
`council-topic-list` or `council-topic-status` to concrete visual styles.

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

## Geographic conventions

- All coordinates use WGS 84.
- GeoJSON always stores coordinates as longitude, latitude.
- View centers use named `longitude` and `latitude` fields to avoid ambiguity.
- Reusable standalone geography belongs in a GeoJSON dataset.
- Topic-specific geography is stored as a GeoJSON file referenced by the
  topic's `locations` collection.
- Map presentations only select and present geographic data; they never embed
  coordinates or rendering-library configuration.

## Generated output contract

The portal generator will treat files below `content/` as inputs and write
runtime artifacts below `generated/`:

```text
generated/
├── areas.json
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

The administrative structure is based on the official Samtgemeinde Papenteich
member-municipality listing:
<https://www.papenteich.de/Rathaus-Politik/Informationen-%C3%BCber-den-Papenteich/Geschichte-und-Entwicklung/>.
