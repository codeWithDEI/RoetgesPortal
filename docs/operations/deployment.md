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

The production service uses the Docker Compose deployment in `deploy/` and
`web/Dockerfile`. The Sites configuration in `web/.openai/hosting.json` remains
available for optional short-lived review deployments:

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

## Optional protected BasarKasse evaluation

The canonical Caddy site imports `/data/basarkasse-demo/*.caddy`. No matching
files is a valid configuration. The private route can expose `/basarkasse` and
`/basarkasse/*` to a separate `basarkasse-demo:3000` service on the existing
internal backend network. Preserve the prefix; the application is built with
that Next.js base path and uses a configured public HTTPS origin.

Keep the real route and its authentication hash in the existing private Caddy
data volume. Require HTTPS Basic Authentication for every demo page, asset and
API request, exclude these requests with `log_skip`, and send `X-Robots-Tag:
noindex, nofollow, noarchive`. Never commit the actual password or hash. The
separate BasarKasse repository owns its Compose profile, release and SQLite
volume; it does not replace portal services or share editorial data.

Before activation, back up the Caddyfile, start the separate service, confirm its
health and internal route, then validate the complete Caddy configuration and
reload Caddy without recreating the portal services. Verify external 401
responses without credentials, authorized access, the demo login and the portal
health endpoint. Record the exact demo release and rollback location privately.
To remove access, move the private route outside the imported glob and validate
and reload Caddy before stopping the demo service. Preserve portal, analytics,
certificate and demo data volumes.

## Production release procedure

1. Merge a reviewed pull request with green checks.
2. Record the currently deployed commit as the rollback target.
3. Fast-forward the server checkout of `main` to the reviewed merge commit.
4. Rebuild and recreate the Compose services from that exact checkout.
5. Wait for the web, analytics, and private dashboard health checks to pass.
   Preserve `analytics_state`; rebuilding the analytics image updates its report
   code without resetting counters. Verify report freshness, history/coverage
   and loopback-only access as described in [statistics](statistics.md).
6. Verify `/api/health`, core pages, generated data, map assets, and a sample of
   source links through the public canonical domain.
7. Record the deployed commit, time, operator, and rollback target.

Rollback means checking out the previous known-good commit and recreating the
services from it. Editorial data is part of the release, so application and
content roll back together.
