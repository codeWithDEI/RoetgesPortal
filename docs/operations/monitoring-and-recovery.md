# Monitoring and recovery

## Minimum monitoring

- Check `GET /api/health` from outside the hosting provider every five minutes.
- Alert on repeated non-200 responses, TLS expiry, and domain expiry.
- Monitor build and deployment failures through the repository checks.
- Review server and edge error rates without introducing user tracking.
- Review the private page-view dashboard for frequently requested routes and
  unexpected HTTP status codes. Treat hits as requests, never as exact people.
- Check public source links periodically; a broken source is a content-quality
  issue even when the portal itself is available.

The self-hosted deployment removes client addresses, request headers, remote
ports, and query values before access logs are written. Raw access logs are
retained for no more than seven days. The derived GoAccess report is reachable
only through an SSH tunnel to the server loopback interface; its port must not
be exposed publicly.

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

Keep at least one backup in a separate account or provider. Do not treat a
running server or a single GitHub repository as a backup.

## Restore test

Quarterly, provision a clean environment, check out a recorded release, build
the portal, deploy it behind a temporary hostname, and verify the health endpoint
and representative topic pages. Record the duration and any undocumented step.

## Security maintenance

Apply critical platform and dependency updates promptly and review other updates
monthly. Restrict administrative access, require multi-factor authentication,
and use individual accounts. See `SECURITY.md` for vulnerability reporting.
