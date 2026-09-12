# RötgesPortal

RötgesPortal presents municipal topics in Rötgesbüttel neutrally,
transparently, and with their geographic impact. The project deliberately uses
a content-first, stateless architecture: editorial content is maintained as
YAML and geographic data as GeoJSON. The production service does not require a
database.

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

### Topic status workflow

[PlantUML source](docs/architecture/topic-status-workflow.puml)

![Typical topic status workflow](docs/architecture/topic-status-workflow.svg)

The [content model](docs/architecture/content-model.md) defines collection,
reference, coordinate, and generated-output conventions.

The PlantUML sources are authoritative and the rendered SVG files are committed
for direct display on GitHub. After installing
[PlantUML](https://plantuml.com/starting), regenerate them with:

```bash
plantuml -tsvg docs/architecture/*.puml
```

## Repository structure

```text
.
├── config/              # source registries for operational tools
├── content/
│   ├── areas/           # administrative areas and their hierarchy
│   ├── datasets/        # reusable inputs with stable IDs
│   ├── locations/       # manually maintained GeoJSON sources
│   ├── review/          # non-public machine-assisted review queues
│   ├── topics/          # one municipal topic per YAML file
│   └── views/           # routes, data selection, and presentation
├── deploy/              # reproducible self-hosting baseline
├── docs/
│   ├── architecture/    # PlantUML sources and rendered SVG files
│   ├── brand/           # visual provenance and usage constraints
│   ├── governance/      # editorial, operating, and handover policies
│   └── operations/      # deployment, monitoring, and recovery
├── generated/           # generated runtime and import data
├── schemas/             # machine-readable content contracts
├── tools/               # validation, build, and historic imports
└── web/                 # public topic portal, map, and trust pages
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
at [`content/topics/example-topic.yaml`](content/topics/example-topic.yaml)
remains an unpublished draft.

Facts, geographic impact, and publicly documented positions are modeled
separately. Every published topic and position must cite at least one
verifiable source.

The top-level `status` describes the lifecycle of the exact subject named by
the topic. It is independent from the result of an individual motion and from
technical workflow labels in the council information system. New or materially
updated topics record the evidence for that phase in `statusBasis`. A formal
decision is represented separately as `latestDecision`, including its outcome
and a source already listed on the topic.

```yaml
status: implementation
statusBasis:
  scope: topic
  summary: The commissioned review is still in progress.
  sourceUrl: https://example.org/resolution

latestDecision:
  date: "2026-06-18"
  body: Rat der Gemeinde Rötgesbüttel
  outcome: adopted
  summary: Der Rat beauftragte die Verwaltung mit der Prüfung.
  sourceUrl: https://example.org/resolution
```

## Monitoring official agenda changes

The content monitor discovers new and changed public agenda items from the
Papenteich ALLRIS calendar. It writes only to a non-public review queue and
never creates or publishes topic content automatically. Human dispositions are
kept separately in `content/review/decisions/sitzung-online.yaml`, so scanner
runs cannot overwrite them:

```bash
python3 tools/scan_sitzung_online.py
```

The manually triggered `Preview content monitor` GitHub workflow has read-only
repository permissions and provides the proposed queue, summary, and diff as a
downloadable artifact. See the
[content monitoring procedure](docs/operations/content-monitoring.md) for its
safety boundaries and editorial handoff.

## Defining portal views

Datasets decouple physical inputs from their presentation:

```text
content/datasets/topics.yaml
content/datasets/roetgesmarkt-stands.yaml
```

Views select data independently from the way it is presented:

```text
content/views/council.yaml
content/views/council-map.yaml
content/views/flea-market.yaml
```

The published council views filter and sort the same topic data for a list and
a map route. The generator resolves topic location references into an enriched
GeoJSON layer for the map. The draft flea market view retains the normalized
historic Rötgesmarkt dataset for a future map route. Named view sources
separate filtering and sorting from list or map presentation, so the same
dataset can support multiple experiences without duplicating editorial
content.

Administrative areas, datasets, topics, and views follow their corresponding
machine-readable contracts under [`schemas/`](schemas/).

## Validating content

Install the development dependencies and run the content validator:

```bash
python3 -m pip install -r requirements-dev.txt
python3 tools/validate_content.py
```

In addition to the JSON Schemas, the validator checks IDs, file references,
area hierarchies and topic-area references, review-queue and monitor-registry
references, status and decision evidence, dataset and source references, unique
routes, source and layer IDs, zoom ranges, and compatible filters. CI runs the
same validation for every pull request.

## Generating runtime data

The portal generator validates the complete content model before writing
public runtime artifacts:

```bash
python3 tools/build_portal.py
```

The deterministic build creates:

```text
generated/
├── areas.json           # administrative areas available to public filters
├── datasets/            # datasets required by published views
├── topics/              # one JSON detail document per published topic
├── views/               # view index, manifests, and list data
└── search-index.json    # compact public topic search records
```

Draft and archived topics are excluded from public runtime data. Generated
list data includes administrative-area, status, and category facets, stable
sorting, links to topic details, and the next planned milestone when one
exists.

Run the complete CI-equivalent check sequence with Python 3.12 or newer,
Node.js 22.13 or newer, and pnpm 11.9:

```bash
python3 -m compileall -q tools tests
python3 -m unittest discover -s tests -v
python3 tools/validate_content.py
python3 -c "import pathlib, yaml; yaml.safe_load(pathlib.Path('deploy/compose.yaml').read_text())"
python3 tools/import_roetgesmarkt.py
python3 tools/build_portal.py
git diff --exit-code -- generated

corepack enable
corepack prepare pnpm@11.9.0 --activate
cd web
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm test
pnpm lint
cd ..
git diff --exit-code -- web/public/data
```

## Web application

The public web application presents generated council topics as a
German-language list, a chronological update stream, an RSS feed, and an
OpenStreetMap-based MapLibre view. The topic and map views default to
Rötgesbüttel and provide administrative-area, status, and category filters with
links to source-backed detail pages. The map renders Point, LineString, and
Polygon features, supports feature popups, and fits the viewport to the selected
spatial reference:

```bash
cd web
pnpm install
pnpm dev
```

The application synchronizes the generated public artifacts into its static
asset directory before development and production builds. It remains
independent from the editorial YAML and does not require a database.

## Public stewardship

The portal is prepared for transparent independent operation and a possible
future municipal handover:

- [Editorial policy](docs/governance/editorial-policy.md)
- [Operating model](docs/governance/operating-model.md)
- [Municipal handover checklist](docs/governance/municipal-handover.md)
- [Deployment procedure](docs/operations/deployment.md)
- [Content change monitoring](docs/operations/content-monitoring.md)
- [Legal and privacy operations checklist](docs/operations/legal-and-privacy-checklist.md)
- [Monitoring and recovery](docs/operations/monitoring-and-recovery.md)
- [Search discovery and Search Console](docs/operations/search-discovery.md)
- [Visual identity](docs/brand/visual-identity.md)
- [Contribution guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

The current UI uses an independent portal identity: a folded map becomes the
letter R and a gold location marker establishes local context. Official
municipal symbols are intentionally not used. Until an official operating
agreement exists, the portal remains visibly labeled as independent and must
not imply municipal endorsement.

## Production hosting

The public service runs at [roetgesportal.de](https://roetgesportal.de) on a
self-managed VPS. Docker Compose builds the stateless web application and runs
it behind Caddy, which terminates TLS and redirects the `www` and `preview`
hostnames to the canonical domain:

```bash
cp deploy/.env.example deploy/.env
docker compose --env-file deploy/.env -f deploy/compose.yaml up --build -d
```

See [the deployment documentation](docs/operations/deployment.md) before using
it in production. The deployment also creates a privacy-reduced GoAccess
page-request report that is available only through an SSH tunnel; it does not
attempt to identify unique visitors. Optional short-lived review deployments
can use the Sites configuration in `web/.openai/hosting.json`.

The public health endpoint is available at
[`/api/health`](https://roetgesportal.de/api/health). Operational details are
documented in [`deploy/README.md`](deploy/README.md).
