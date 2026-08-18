# Self-hosting

This directory contains the production-capable Docker Compose deployment for
RötgesPortal. It runs the stateless web application behind Caddy and generates
a private, server-side page-view report with GoAccess. Only Caddy publishes
public host ports; the application remains isolated on an internal network.

Caddy obtains and renews TLS certificates automatically when `SITE_ADDRESS`
and `REDIRECT_SITE_ADDRESSES` contain public hostnames whose DNS records point
to the server. `CANONICAL_ORIGIN` is the destination for permanent redirects.
Certificate state is retained in named Docker volumes.

## Server configuration

Create the untracked environment file once on the server:

```bash
cp deploy/.env.example deploy/.env
```

Review `deploy/.env` and replace every neutral legal placeholder with the exact
operator, hosting-contract, and mail-account facts. The private deployment
file remains ignored by Git. In addition to each provider's contracting name,
record the contractual processing locations, hosting retention information,
and any third-country transfer information. Do not infer these values from a
server IP or email domain.

The application returns `503` on every route, including `/api/health`, when a
required value is missing or still looks like a placeholder. Docker Compose
also refuses to create the web service when a value is empty. Hosted Sites
deployments must configure the same `LEGAL_*` values as runtime settings.

Then start the release:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up --build -d
```

For a local smoke test, use the same reviewed environment file; the defaults
expose HTTP on `http://localhost:8080` and HTTPS on port `8443`:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up --build -d
curl --fail http://localhost:8080/api/health
docker compose --env-file deploy/.env -f deploy/compose.yaml down
```

The production values expose ports 80 and 443. The firewall and provider must
allow both TCP ports; UDP 443 enables HTTP/3. Do not switch DNS until the
containers pass their health checks and the server is ready to answer publicly.
The example configuration serves `roetgesportal.de` and permanently redirects
`www.roetgesportal.de` and `preview.roetgesportal.de` to the canonical origin
while preserving the request path and query string.

## Operations

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=200
docker compose --env-file deploy/.env -f deploy/compose.yaml pull
docker compose --env-file deploy/.env -f deploy/compose.yaml up --build -d
```

Deploy an exact reviewed commit and record the previous commit before updating.
Rollback consists of checking out that known-good commit and recreating the
containers. Application and editorial content are built into the same image.

The `caddy_data` volume contains Caddy's certificate state and must survive
updates. It should be included in server backups. Never commit `.env`, private
keys, access tokens, or exported certificate data.

## Privacy-friendly page-view statistics

Caddy writes a deliberately reduced access log for the canonical site. Client
IP addresses are replaced with `0.0.0.0` before a line is written, request
headers and remote ports are removed, and query strings are replaced. Requests
other than `GET`, health checks, generated data, images, and built assets are
not logged.

Logs roll daily, remain uncompressed so the report can consume them, and are
deleted after at most seven days. GoAccess rebuilds a static report every five
minutes from those files. Panels that would imply visitor identification,
geolocation, referrers, operating systems, or browsers are disabled. The report
therefore measures page requests, not people or unique visitors.

The dashboard is bound to `127.0.0.1` on the server and must not be opened in
UFW or the provider firewall. View it through an SSH tunnel:

```bash
ssh -L 8082:127.0.0.1:8082 <server-user>@<server-host>
```

Keep that session open and visit `http://localhost:8082` in a local browser.
Change both occurrences of `8082` when `ANALYTICS_PORT` uses a different port.

The dashboard's overall visitor value is intentionally meaningless because all
addresses are replaced before storage. Use the **Requested Files (URLs)** and
**HTTP Status Codes** panels for operational statistics. The public privacy
notice must describe this processing before the configuration is deployed.
