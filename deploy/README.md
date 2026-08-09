# Self-hosting

This directory contains the production-capable Docker Compose deployment for
RötgesPortal. It runs the stateless web application behind Caddy. Only Caddy
publishes host ports; the application remains isolated on an internal network.

Caddy obtains and renews TLS certificates automatically when `SITE_ADDRESS`
and `REDIRECT_SITE_ADDRESSES` contain public hostnames whose DNS records point
to the server. `CANONICAL_ORIGIN` is the destination for permanent redirects.
Certificate state is retained in named Docker volumes.

## Local smoke test

The defaults expose HTTP on `http://localhost:8080` and HTTPS on port `8443`:

```bash
docker compose -f deploy/compose.yaml up --build -d
curl --fail http://localhost:8080/api/health
docker compose -f deploy/compose.yaml down
```

## Server configuration

Create the untracked environment file once on the server:

```bash
cp deploy/.env.example deploy/.env
```

Review `deploy/.env`, then start the release:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up --build -d
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
