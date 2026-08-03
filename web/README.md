# RötgesPortal web application

The web application presents generated municipal topic data as an accessible,
responsive information portal. It never reads editorial YAML directly.

Public trust pages explain the project's independence, editorial method,
accessibility, privacy, legal status, and correction process. The visual system
uses the municipal website's blue and neutral palette. The locally served coat
of arms retains a clear independent-service notice until official permission and
operation are agreed.

## Local development

From the repository root, generate the runtime data first:

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

The rendered HTML tests cover the topic overview, a source-backed detail page,
trust pages, security headers, the health endpoint, and the not-found response.

`GET /api/health` provides a non-cached availability response for external
monitoring. Security headers are added by the worker entry point.

For the future container deployment, build from the repository root so the
reviewed generated data is included:

```bash
docker build -f web/Dockerfile -t roetgesportal .
```
