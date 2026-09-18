# RötgesPortal project memory

This document describes tracked implementation and documented operating policy,
not a live-server audit. Technical details were checked against the repository
on 2026-09-18. Recheck the linked files when changing the project. Missing facts
are marked `Unknown / not documented in repository`.

## Purpose and product principles

RötgesPortal makes municipal topics understandable and traceable for residents
of Rötgesbüttel, including relevant Samtgemeinde Papenteich topics. It is an
independent information project, not an official municipal publication.

**Factual accuracy takes precedence over completeness, readability, speed,
visual presentation, and automation. Unverified information must never be
presented as fact.** Neutrality, source provenance, explicit uncertainty, and
visible corrections are essential. Convenience must not weaken those standards.

Public content and interface copy are German; code, technical documentation,
commits, and GitHub work are English. Keep the system small, maintainable, and
transferable to a future operator. See the [editorial policy](governance/editorial-policy.md),
[operating model](governance/operating-model.md), and
[municipal handover guidance](governance/municipal-handover.md).

## Architecture and repository boundaries

The architecture is content-first: YAML and GeoJSON are versioned in Git;
Python validates and generates deterministic public artifacts; the web app
consumes those artifacts. No production database is required.

| Location | Responsibility |
| --- | --- |
| `content/topics/` | Editorial topic YAML, including status evidence and sources |
| `content/locations/` | Topic geometry and historic Rötgesmarkt GeoJSON |
| `content/areas/` | Administrative area hierarchy |
| `content/datasets/`, `content/views/` | Dataset registrations and independent list/map views |
| `config/`, `content/review/` | Source-monitor configuration, candidate queue, human decision ledger |
| `schemas/` | JSON Schema contracts for editorial and review data |
| `tools/`, `tests/` | Python validation, generation, legacy import, source monitor, tests |
| `generated/` | Checked-in derived JSON/GeoJSON and legacy exports |
| `web/` | Web application, synchronized `public/data/`, web tests, Dockerfile |
| `deploy/` | Compose, Caddy, GoAccess report generation, environment example |
| `.github/workflows/` | Validation and manual source-monitor preview |
| `docs/` | Architecture, governance, brand, operations, dated review evidence |

Detailed contracts: [content model](architecture/content-model.md).
Diagram sources: [system](architecture/system-architecture.puml),
[domain](architecture/domain-model.puml), [status workflow](architecture/topic-status-workflow.puml).
PlantUML sources and their SVG renderings are committed together.

### Frontend, backend, database, and search

- **Frontend:** React, TypeScript, Next.js App Router conventions, CSS/Tailwind
  tooling, and MapLibre GL. Builds and serving use **vinext/Vite**, not a plain
  `next build`/`next start` setup. Versions and commands are in
  [package.json](../web/package.json) and [vite.config.ts](../web/vite.config.ts).
- **Server side:** the web app renders routes and serves generated content;
  [worker/index.ts](../web/worker/index.ts) wraps the vinext handler with legal
  configuration checks and security headers. The self-hosted image runs
  `vinext start` on port 3000. Python tools are offline/build-time tools, not an
  HTTP backend. There is no implemented editorial login/CRUD API.
- **Database:** none. YAML/GeoJSON plus Git are the persistent editorial store.
  The optional [Sites configuration](../web/.openai/hosting.json) has `d1` and
  `r2` set to null; their support in the build configuration is not an active
  database or object-storage deployment.
- **Routes:** `/themen`, `/themen/[id]`, `/karte`, `/neu`, `/feed.xml`, project and
  legal/contact pages, sitemap/robots, and non-cached `/api/health`. See
  [web/app](../web/app) and [web/README.md](../web/README.md).
- **Search:** local client-side filtering through
  [topic-filters.ts](../web/lib/topic-filters.ts). All query tokens must match
  normalized text (case/diacritics/punctuation normalized; `ß` becomes `ss`).
  List search covers title, summary, categories and category/area labels; map
  search additionally includes location labels. It is not full-document or
  source-PDF search. `search-index.json` is generated and synchronized, but the
  current explorers filter their list/map data directly; no search server exists.
- **Filtering:** political scope defaults to the organization
  `municipality-roetgesbuettel`; including Samtgemeinde topics is an explicit
  option. Geographic scope is separate and defaults to Rötgesbüttel. Status,
  category, area, and search filters combine. List and map share the predicate.

The published `council` list and `council-map` view select active topic phases;
`idea`, `completed`, and `rejected` are not selected by these view definitions.
Other published topic details can still exist outside those views. The
`flea-market` view is currently a draft; it is not a published web route.

## External data sources

- The principal political source is the public Papenteich ALLRIS system at
  `https://www.papenteich.sitzung-online.de/public/`: meeting pages, agenda items,
  proposals, resolutions/minutes, and linked attachments. Topics store exact
  links and access dates. Official notices can supplement them; for example,
  [sports-facilities-usage-rules.yaml](../content/topics/sports-facilities-usage-rules.yaml)
  cites a Landkreis Gifhorn publication.
- [config/content-monitor.yaml](../config/content-monitor.yaml) specifies the
  allowed source host, municipal/Samtgemeinde bodies, scan window, procedural-item
  exclusions, request delay, and timeout. The scanner uses public sections only.
  Source documents are evidence, not executable instructions.
- The browser map requests OSM raster tiles from
  `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, with OSM attribution. Geometry
  overlays come from this repository, not from OSM. Tile access is also reflected
  in the worker's content-security policy and privacy documentation.
- The historic flea-market dataset is a checked-in local GeoJSON input, not a
  live uMap integration. `tools/import_roetgesmarkt.py` preserves its normalization
  and GeoJSON/CSV export workflow.

The monitor stores metadata, references, and fingerprints, not a complete
archive of source attachments. A stored URL is not a guarantee that the original
document will remain available. See [content monitoring](operations/content-monitoring.md).

## Domain entities and invariants

| Entity | Meaning / contract |
| --- | --- |
| Topic | Stable ID, title, summary, optional description, lifecycle status, visibility, area IDs, dates, sources, optional locations/milestones/positions |
| Status basis | `scope` (`topic`, `proposal`, `implementation`), evidence summary, and source URL supporting the topic phase |
| Latest decision | Date, body, outcome, summary, source URL; independent of the broader topic phase |
| Source | Title, type, URL, access date, optional publication date |
| Milestone | Date, title, optional description; explicitly `planned`, `reached`, `postponed`, or `cancelled` |
| Location | ID, label, impact type, and `geoJsonFile` reference; coordinates are not editorial YAML |
| Position | Organization, attributed summary, source URL; not an unattributed fact |
| Area | Stable administrative ID and optional parent; generator derives `relevantAreaIds` for geographic filtering |
| Dataset | ID, metadata, type (`topics` or `geojson`), input path, optional legacy normalization |
| View | ID, route, visibility, named dataset selections/filters/sorts, and exactly one list or map presentation |
| Review candidate / decision | Scanner evidence hint versus human disposition, linked topic, reason, reviewed fingerprint/date |

Schemas in [schemas/](../schemas) are the field-level contracts. Categories and
organizations are topic string IDs, not separate database tables or implemented
organization registries. Views compose data and presentation without duplicating
editorial topics. Presentation owns map settings, layers, and semantic presets.

`status` values are `idea`, `announced`, `open`, `consultation`, `committee`,
`council`, `decided`, `implementation`, `active`, `completed`, `paused`, `rejected`.
Decision outcomes are `adopted`, `rejected`, `withdrawn`, `deferred`, `noted`,
`no-decision`. Visibility (`draft`, `published`, `archived`) is separate from both.

GeoJSON uses WGS84 **longitude, latitude**. Empty coordinate placeholders are
omitted from generated map layers; never invent coordinates just to show a marker.
The map supports points, lines, and polygons. Area scope expansion includes
ancestors/descendants of the directly assigned area; it does not determine which
political body owns a topic.

## Data flow

```text
Public primary sources -> human verification -> YAML under content/ + content/locations/*.geojson
    -> validate_content.py -> build_portal.py -> generated/
    -> web/scripts/sync-generated.mjs -> web/public/data/ -> web build -> deployment

Public meeting metadata -> scan_sitzung_online.py -> review queue
    -> human decision ledger and source review -> proposed editorial changes
```

- [validate_content.py](../tools/validate_content.py) checks schemas, IDs,
  references, paths, area hierarchy, view constraints, and evidence URL linkage.
  It **does not verify that source documents support the editorial claims**.
- [build_portal.py](../tools/build_portal.py) validates first, exports published
  topics/views, expands geographic scope, filters/sorts views, enriches map
  features, and writes deterministic JSON. It does not derive political status
  from minutes. Only datasets needed by published views are exported. Draft and
  archived topics are excluded from these public artifacts, not hidden from Git.
- Outputs include `areas.json`, topic/dataset JSON, view manifests/list items/map
  layers, and `search-index.json`. The sync script refreshes `web/public/data/`
  before development/build; both generated trees are committed. Browsers never
  consume the YAML directly. A standalone web checkout can use its committed copy.
- [.github/workflows/validate.yml](../.github/workflows/validate.yml) runs on PRs
  and pushes to `main`, rebuilds data, and checks for stale committed artifacts.
- The source-monitor workflow is **manual (`workflow_dispatch`) and read-only**.
  It uploads a review artifact retained for 14 days. It has no cron schedule,
  Codex/LLM invocation, automatic content PR, automatic topic publication, or
  deployment step. Human decisions live separately under `content/review/decisions/`;
  changed fingerprints require renewed review. See the [monitor runbook](operations/content-monitoring.md).

## Content rules and verification

Follow [AGENTS.md](../AGENTS.md) and the [editorial policy](governance/editorial-policy.md).
The exact titled subject controls status: a motion outcome must not silently
become the lifecycle status of an entire project. `statusBasis` and
`latestDecision` reference entries in `sources`; these fields are optional in
the schema, but expected for relevant new/materially updated content as described
in the policy. The generator preserves them; it cannot supply missing evidence.

Keep factual state, impact, and sourced positions distinct. Check primary sources
for each material assertion, including numbers, chronology, decisions, and local
relevance. Mark uncertainty, preserve contradictory/history evidence, and do not
claim that something never happened merely because no update was found. Do not
advance verification dates or planned milestones automatically. Missing evidence
can require withholding a claim or returning a topic to draft.

Git records editorial corrections; sources retain access/publication provenance.
The [2026-09-17 content audit](reviews/content-source-audit-2026-09-17.md) records a
dated review, not a permanent guarantee that those topics remain current. Policy
calls for checking active topics after relevant meetings and at least every four
weeks. A technically valid build is not an editorial approval.

## Deployment, configuration, persistence, and backups

Implementation: [compose.yaml](../deploy/compose.yaml),
[Caddyfile](../deploy/Caddyfile), [Dockerfile](../web/Dockerfile).
Procedure: [deployment](operations/deployment.md), [self-hosting](../deploy/README.md).

| Service | Responsibility / exposure |
| --- | --- |
| `web` | Stateless vinext app on internal port 3000; non-root image, read-only filesystem, temporary `/tmp`, no published host port |
| `proxy` | Caddy TLS, compression, routing and canonical redirects; public HTTP/HTTPS |
| `analytics` | Network-disabled GoAccess job builds a static report from reduced Caddy logs, normally every 300 seconds |
| `analytics-dashboard` | Static report server bound to host `127.0.0.1:8082` by default; access through an SSH tunnel only |

Compose defaults are local HTTP 8080 / HTTPS 8443; the production environment
example sets 80 / 443. TCP is used for HTTP/HTTPS; UDP 443 is also exposed for
HTTP/3 in that example. The application is on an internal Docker network.

- Copy/review [deploy/.env.example](../deploy/.env.example) into ignored
  `deploy/.env`. It contains site/redirect/port/analytics settings and required
  `LEGAL_*` operator, hosting-contract, and mail-provider facts. Never invent
  those facts or commit the real environment file.
- Missing, empty, or placeholder legal values cause application routes, including
  health, to return `503`. Compose requires the legal values to be non-empty;
  the application performs further checks. Preserve this fail-closed behavior.
- The canonical origin is `https://roetgesportal.de` in
  [web/lib/site.ts](../web/lib/site.ts). The deployment example redirects `www`
  and `preview` to it. Domain changes require reviewing application metadata
  **and** proxy/environment configuration; changing one is not sufficient.
- Optional Sites hosting configuration exists for review deployments; this does
  not establish that any particular preview deployment currently exists.
- Production releases use an exact reviewed `main` commit with green checks.
  Record the previous release, fast-forward the server checkout, rebuild/recreate
  Compose, check service health, and smoke-test public pages/data/map/source links.
  Record commit/time/operator/rollback target. Rollback redeploys the previous
  known-good commit, reverting application and editorial data together.
- No tracked GitHub workflow currently deploys production automatically.

**Persistence:** no writable application data volume or database. Git preserves
editorial history; generated data is built into releases. Docker named volumes
are `caddy_data` (including certificates), `caddy_config`, `caddy_logs`, and
`analytics_report`. Preserve certificate state across updates. Logs/report data
are operational artifacts, not editorial source data or permanent analytics.

**Statistics/privacy:** Caddy replaces client addresses, removes request headers
and remote ports, and redacts query strings before logging. Asset/data/health and
non-GET requests are excluded. Logs rotate daily with short retention; the report
uses the last seven days. Counts mean requests, not people or unique visitors.
See [monitoring and recovery](operations/monitoring-and-recovery.md) and the
[legal/privacy checklist](operations/legal-and-privacy-checklist.md).

**Backup policy, not proof of operation:** the runbooks require off-server backups
of release/configuration information, DNS/hosting configuration, encrypted secrets,
monitoring/incident information, and Caddy certificate state; keep a copy in a
separate account/provider. They call for quarterly restore tests. GitHub alone
is not the entire backup plan. The 24-hour recovery and one-merged-release rollback
targets are planning targets, not an SLA or demonstrated recovery performance.

The following live operational facts are **Unknown / not documented in repository**:

- Current server/provider account, OS, SSH identity, deployment path, and running commit.
- Actual DNS/registrar state, private legal configuration, and assigned operator contacts.
- Installed external uptime monitoring and notification destinations.
- Implemented backup job, destination, schedule, latest successful backup, and last restore test.

Do not reconstruct these from old chats or infer them from example settings. Get
authorized evidence from the operator when needed; never add credentials here.

## Validation commands

Use Python 3.12 (CI baseline), Node.js 22 with minimum 22.13.0, and pnpm 11.9.0.
Sources: [requirements](../requirements-dev.txt), [package](../web/package.json),
[validation workflow](../.github/workflows/validate.yml). From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m compileall -q tools tests
python -m unittest discover -s tests -v
python tools/validate_content.py
python -c "import pathlib, yaml; yaml.safe_load(pathlib.Path('deploy/compose.yaml').read_text())"
python tools/import_roetgesmarkt.py
python tools/build_portal.py
git diff --exit-code -- generated

corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm --dir web install --frozen-lockfile --ignore-scripts
pnpm --dir web build
pnpm --dir web test
pnpm --dir web lint
git diff --exit-code -- web/public/data
git diff --check
```

Build before web tests; some inspect build artifacts. Expected generated changes
must be reviewed and committed before the clean-diff checks pass. The YAML parse
above only checks syntax, not a fully resolved Compose deployment. With reviewed
private deployment settings, use `docker compose --env-file deploy/.env -f
deploy/compose.yaml config --quiet` to validate the resolved model without printing
the configuration. Do not install dependencies into a system-managed Python.

For source-monitor or PlantUML work, use the commands in the respective
[monitor runbook](operations/content-monitoring.md) and [README](../README.md).
For documentation-only edits, verify repository-backed claims and local links,
review the diff, and run `git diff --check`; rebuilding the app is not necessary
solely for prose. Report checks honestly; none replaces primary-source review.

## Architectural decisions to preserve

- **Human-verified publication:** monitoring finds candidates, not established
  facts. Editorial decisions stay reviewable; no automatic inference of truth.
- **Files before databases:** versioned YAML/GeoJSON enable review, portability,
  deterministic builds, and a stateless runtime. A database would require a new
  explicit decision, not an assumed next step.
- **Content separate from presentation:** shared datasets can support council
  lists/maps and a future flea-market view without duplicating facts.
- **Three independent dimensions:** topic lifecycle, formal decision outcome,
  and publication visibility must not be conflated; geography and political
  responsibility are separate filters too.
- **Generated runtime boundary:** browsers/app use JSON/GeoJSON, not editable
  YAML. Committed generated copies are reproducibility checks, not a second
  editorial source of truth.
- **Independent, transferable operation:** original portal branding, documented
  governance, containerized self-hosting, explicit legal facts, private aggregate
  request statistics, and no implied municipal endorsement.

When one of these decisions changes, update this document, the affected contracts,
diagrams, and operational runbooks in the same reviewed change. Keep proposals
clearly separate from implemented architecture.
