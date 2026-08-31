# RötgesPortal web application

The web application presents generated municipal topic data as an accessible,
responsive information portal. It never reads editorial YAML directly.

Public trust pages explain the project's independence, editorial method,
accessibility, privacy, legal status, and correction process. Its independent
visual identity uses a folded map that becomes the letter R, combined with a
gold location marker. It intentionally avoids official municipal symbols.

## Local development

Use Node.js 22.13 or newer and pnpm 11.9. From the repository root, generate the
runtime data first:

```bash
python3 tools/build_portal.py
```

Then start the application:

```bash
cd web
pnpm install
pnpm dev
```

The `predev` and `prebuild` scripts synchronize the repository's generated
runtime artifacts into `public/data`. The committed copy keeps standalone
deployments reproducible when the parent repository is unavailable.

## Validation

```bash
pnpm build
pnpm test
pnpm lint
```

The rendered HTML tests cover the topic overview, the generated council map,
a source-backed detail page, trust pages, security headers, the health
endpoint, and the not-found response.

The `/karte` route renders generated topic-location GeoJSON with MapLibre on an
OpenStreetMap base layer. Dedicated layers display Point, LineString, and
Polygon features. All supported geometries share the public filters, popup
details, and list-based viewport focus. The tile endpoint remains isolated in
the map component and CSP so it can be replaced by another OSM-derived or
self-hosted service without changing editorial content or generated artifacts.

`GET /api/health` provides a non-cached availability response for external
monitoring. Security headers are added by the worker entry point.

The production deployment builds from the repository root so the reviewed
generated data is included:

```bash
docker build -f web/Dockerfile -t roetgesportal .
```

The public service runs behind Caddy through the Docker Compose configuration
under `deploy/`. The application container has no public host port. See
[`../deploy/README.md`](../deploy/README.md) for releases, TLS, private
page-request statistics, and rollback guidance.
