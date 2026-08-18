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

The current public preview can use the Sites deployment configuration in
`web/.openai/hosting.json`. The self-hosted preview uses the Docker Compose
deployment in `deploy/` and `web/Dockerfile`:

```bash
cp deploy/.env.example deploy/.env
docker compose --env-file deploy/.env -f deploy/compose.yaml up --build -d
```

The local defaults expose HTTP on port `8080`. The example server configuration
publishes ports 80 and 443, serves `roetgesportal.de` as the canonical site, and
redirects the `www` and `preview` hostnames to it. Caddy requests public
certificates only after DNS points to the server. Its persistent data and
configuration are stored in named Docker volumes.

The application itself publishes no host port and is reachable only from the
reverse proxy over an internal Docker network. Secrets, access tokens, private
keys, and the deployment `.env` file must never be committed.

The ignored deployment environment must also contain the complete operator,
hosting-contract, and mail-account facts listed in `deploy/.env.example`.
Missing, empty, or placeholder legal values make every application route
return `503`; the health check therefore prevents the reverse proxy from
admitting an incomplete release. Configure the same `LEGAL_*` runtime values
before publishing a Sites version. Follow the
[`legal-and-privacy-checklist.md`](legal-and-privacy-checklist.md) before every
production change.

## Pre-DNS verification

Before changing public DNS:

1. Validate the Compose model with `docker compose config`.
2. Build and start the containers on the target server.
3. Confirm that the application container is healthy and that the public legal
   pages contain the reviewed production values.
4. Confirm that the analytics and local-only dashboard containers are healthy.
5. Verify that the dashboard port listens only on `127.0.0.1` and is reachable
   through an SSH tunnel.
6. Test HTTP routing against the server IP with the intended `Host` header.
7. Point the DNS record to the server.
8. Confirm HTTPS issuance and `/api/health` from outside the server.

## Release procedure

1. Merge a reviewed pull request with green checks.
2. Tag or otherwise record the exact release commit.
3. Build an immutable application image from that commit.
4. Deploy to staging and check `/api/health`, core pages, and source links.
5. Promote the same image to production.
6. Record the version, time, operator, and rollback target.

Rollback means deploying the previous known-good immutable image. Editorial data
is part of the release, so application and content roll back together.
