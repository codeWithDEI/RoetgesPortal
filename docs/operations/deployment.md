# Deployment

The web application is stateless. YAML and GeoJSON are validated and converted
to static runtime artifacts during the build; no database or writable production
volume is required.

## Build contract

An exact release commit must pass:

```bash
python3 tools/validate_content.py
python3 tools/build_portal.py
cd web
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm test
pnpm lint
```

The current public preview uses the Sites deployment configuration in
`web/.openai/hosting.json`. A future server can use the baseline in `deploy/`
and `web/Dockerfile`:

```bash
docker compose -f deploy/compose.yaml up --build -d
```

The baseline exposes HTTP on `PORT` (default `8080`). Production TLS and DNS
should be configured only after a hostname is assigned. Secrets, access tokens,
and private keys must be supplied by the deployment platform and never committed.

## Release procedure

1. Merge a reviewed pull request with green checks.
2. Tag or otherwise record the exact release commit.
3. Build an immutable application image from that commit.
4. Deploy to staging and check `/api/health`, core pages, and source links.
5. Promote the same image to production.
6. Record the version, time, operator, and rollback target.

Rollback means deploying the previous known-good immutable image. Editorial data
is part of the release, so application and content roll back together.
