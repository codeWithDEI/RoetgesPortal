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

Files under `content/views/` define public map experiences. A view owns:

- a stable route;
- the initial map position and zoom range;
- one or more ordered layers;
- optional topic filters;
- semantic presentation presets.

A layer references exactly one dataset. Multiple views may reuse the same
dataset, and a view may combine multiple datasets.

Presentation presets are semantic IDs rather than raw CSS or library-specific
configuration. The future web application will resolve presets such as
`council-topic` or `flea-market-stand` to concrete visual styles.

## Reference rules

The future content validator must enforce rules that JSON Schema cannot check
across files:

1. File names and `id` values must match.
2. IDs must be unique within their collection.
3. Every layer must reference an existing dataset.
4. Layer IDs must be unique within a view.
5. Published view routes must be unique.
6. Referenced files must exist and remain inside the repository.
7. `minZoom` must not be greater than `zoom` or `maxZoom`.
8. Topic filters may only be used with a `topics` dataset.
9. Published topics and documented positions must have verifiable citations.

## Geographic conventions

- All coordinates use WGS 84.
- GeoJSON always stores coordinates as longitude, latitude.
- View centers use named `longitude` and `latitude` fields to avoid ambiguity.
- Geographic data belongs in datasets; view files only select and present it.

## Generated output contract

The portal generator will treat files below `content/` as inputs and write
runtime artifacts below `generated/`:

```text
generated/
├── datasets/
│   ├── topics.json
│   └── roetgesmarkt-stands.geojson
├── views/
│   ├── index.json
│   ├── council/
│   │   ├── manifest.json
│   │   └── active-topics.geojson
│   └── flea-market/
│       ├── manifest.json
│       └── stands.geojson
└── search-index.json
```

The browser consumes generated artifacts only. It does not parse editorial
YAML or raw GeoJSON.
