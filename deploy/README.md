# Self-hosting baseline

This directory provides a minimal, reproducible HTTP deployment for a future
server. It is not the current public hosting configuration.

```bash
docker compose -f deploy/compose.yaml up --build -d
```

The service listens on port `8080` by default. Set `PORT` in the shell or a
deployment-specific environment file to change the host port. Configure the
production hostname, TLS, firewall, backups, and external monitoring before
exposing a server directly to the internet.

The application container is stateless and embeds the generated content from
the reviewed source commit. Deployments should build once and promote the same
image rather than rebuilding separately for each environment.
