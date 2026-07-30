# Content model

RötgesPortal separates facts, reusable datasets, and map presentation. This
keeps editorial content independent from any individual page or map.

Repository code and technical documentation are written in English.
Public-facing editorial content is written in German for the local audience.

## Collections

### Topics

Files under `content/topics/` describe municipal matters, their current state,
citations, milestones, and geographic impact. A topic must never contain
view-specific colors, marker icons, routes, or zoom levels.

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

The initial portal uses a list presentation for council topics. Map
presentation remains part of the contract as a draft for the flea market and
future geographic topic views, but it does not constrain list-based routes.

Presentation presets are semantic IDs rather than raw CSS or
library-specific configuration. The future web application will resolve
presets such as `council-topic-list` or `flea-market-stand` to concrete visual
styles.

## Reference rules

The future content validator must enforce rules that JSON Schema cannot check
across files:

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

## Geographic conventions

- All coordinates use WGS 84.
- GeoJSON always stores coordinates as longitude, latitude.
- View centers use named `longitude` and `latitude` fields to avoid ambiguity.
- Geographic data belongs in datasets; map presentations only select and
  present it.

## Generated output contract

The portal generator will treat files below `content/` as inputs and write
runtime artifacts below `generated/`:

```text
generated/
├── datasets/
│   └── topics.json
├── topics/
│   └── <topic-id>.json
├── views/
│   ├── index.json
│   ├── council/
│   │   ├── manifest.json
│   │   └── items.json
└── search-index.json
```

The browser consumes generated artifacts only. It does not parse editorial
YAML or raw GeoJSON. Only published topics and views are included. Builds are
deterministic and do not include build timestamps. Dataset artifacts are
created only when a published view references them; publishing a future map
view therefore adds its normalized GeoJSON dataset and manifest automatically.
