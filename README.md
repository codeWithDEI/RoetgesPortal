# RötgesPortal

RötgesPortal aims to present municipal topics in Rötgesbüttel neutrally,
transparently, and with their geographic impact. The project deliberately
starts as a statically generated portal: editorial content is maintained as
YAML and geographic data as GeoJSON. The MVP does not require a database.

## Architecture principle

> YAML is the editorial source of truth. The build produces optimized JSON,
> GeoJSON, and search data for the web application.

This approach keeps changes reviewable through Git, hosting simple, and the
attack surface small. A database can be added later behind a clear data access
layer if an editorial interface, roles, citizen contributions, or automated
imports require one.

## Architecture

### System architecture

[PlantUML source](docs/architecture/system-architecture.puml)

![System architecture](docs/architecture/system-architecture.svg)

### Domain model

[PlantUML source](docs/architecture/domain-model.puml)

![Domain model](docs/architecture/domain-model.svg)

The committed SVG files are initial placeholders. After installing
[PlantUML](https://plantuml.com/starting), regenerate them from their sources:

```bash
plantuml -tsvg docs/architecture/*.puml
```

## Repository structure

```text
.
├── content/
│   ├── locations/       # manually maintained GeoJSON sources
│   └── topics/          # one municipal topic per YAML file
├── docs/architecture/   # PlantUML sources and rendered SVG files
├── generated/           # generated runtime and import data
├── schemas/             # machine-readable content contracts
├── tools/               # validation, build, and historic imports
└── web/                 # future static web application
```

## Importing Rötgesmarkt data

The existing GeoJSON transformation remains available as an import tool. It
corrects swapped latitude and longitude values, removes generated IDs, and
creates an additional CSV file for Google My Maps.

```bash
python3 tools/import_roetgesmarkt.py
```

Input:

```text
content/locations/roetgesmarkt_input.geojson
```

Outputs:

```text
generated/roetgesmarkt_upload.geojson
generated/roetgesmarkt_upload_google_maps.csv
```

The tool requires Python 3.9 or newer and has no external dependencies.

## Maintaining topics

Each topic file follows the contract in
[`schemas/topic.schema.json`](schemas/topic.schema.json). The initial example
at [`content/topics/example.yaml`](content/topics/example.yaml) remains an
unpublished draft.

Facts, geographic impact, and publicly documented positions are modeled
separately. Every published topic and position must cite at least one
verifiable source.

## Status

This is the initial project structure. The web application, content validator,
and build generator will follow in separate, focused increments.
