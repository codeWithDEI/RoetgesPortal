# Monitoring and recovery

## Minimum monitoring

- Check `GET /api/health` from outside the hosting provider every five minutes.
- Alert on repeated non-200 responses, TLS expiry, and domain expiry.
- Monitor build and deployment failures through the repository checks.
- Review server and edge error rates without introducing user tracking.
- Review the private daily/hourly pageview dashboard and its coverage/freshness
  warnings; use the linked GoAccess details for routes and HTTP status codes.
  Visitor counts are unavailable, and unknown automated traffic can remain.
- Check public source links periodically; a broken source is a content-quality
  issue even when the portal itself is available.

The self-hosted deployment removes client addresses, request headers, remote
ports, and query values before access logs are written. Reduced logs rotate
daily or at 10 MiB, keeping at most six backups with a six-day age limit checked
on rotation. Identifier-free numeric daily/hourly counters persist for 400 days
in `analytics_state`, separately from the regenerable report volume. Both the
overview and GoAccess details are reachable only through an SSH tunnel to the
server loopback interface; its port must not be exposed publicly. See the
[statistics runbook](statistics.md) for definitions, gaps and checkpoint recovery.

Initial operational targets are 24 hours to restore the public service and one
merged release as the maximum content rollback. They are planning targets, not a
service-level guarantee.

## Backups

Git is the primary history for source content and code. Once self-hosting is
used, back up the following outside the server:

- repository release references and deployment configuration;
- DNS and hosting configuration exports;
- encrypted operational secrets through an approved secret-management system;
- monitoring configuration and incident contacts.
- Caddy certificate state and the private `analytics_state` counter volume,
  copied while the report job is stopped; the report volume is regenerable.

Keep at least one backup in a separate account or provider. Do not treat a
running server or a single GitHub repository as a backup.

## Restore test

Quarterly, provision a clean environment, check out a recorded release, build
the portal, deploy it behind a temporary hostname, and verify the health endpoint
and representative topic pages. Record the duration and any undocumented step.
Restore the private aggregate state with empty Caddy logs on a fresh server,
check retained daily totals and report regeneration, and confirm loopback-only
access. Do not reimport already counted log copies with different inodes.

## Security maintenance

Apply critical platform and dependency updates promptly and review other updates
monthly. Restrict administrative access, require multi-factor authentication,
and use individual accounts. See `SECURITY.md` for vulnerability reporting.
