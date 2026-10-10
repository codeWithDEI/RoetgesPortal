# Private portal statistics

## Architecture assessment and decision

Before this change, Caddy replaced both client addresses with `0.0.0.0`, deleted
request headers and remote ports, and redacted query values. Selected assets,
data, health checks and non-GET requests were excluded. Daily/10 MiB rotation
kept at most six uncompressed backups, with a six-day age limit checked on
rotation. Size rotations can shorten the available history substantially.
GoAccess 1.11 rebuilt a static report every 300 seconds with `--keep-last=7`.
The daily `VISITORS` panel was disabled. No GoAccess persistence was configured.
There was no implemented seven-day averaging or normalization: the report
counted retained log requests. The actual running server configuration and
available historical files are **Unknown / not documented in repository**.

[GoAccess's manual](https://goaccess.io/man) documents native daily hits/visitors,
an hourly panel, timezone conversion, crawler filtering, and disk persistence.
Its visitor identity combines IP, user agent and date. Neither identifiers nor
agents survive this portal's reduction; enabling the visitor panel or crawler
filter cannot recover them. A date-based visitor count is also not a deduplicated
person count over seven/thirty days. The hourly panel combines the selected log
days, rather than isolating today automatically. Native hits do not apply our
successful HTML-document definition.

The implementation keeps the existing network-disabled `analytics` job and
GoAccess report, adding Python's standard library and a static HTML/JS/CSS
overview. It reads the **same reduced Caddy logs**, not a second tracking stream.
The small counter pass before GoAccess makes response-type/status filtering,
today-only hours, checkpoint semantics, gaps, and identifier-free retention
explicit. GoAccess's aggregate panels alone do not supply these distinctions.
There is no additional service, database, external analytics, cookie, browser
storage, event endpoint, visitor identifier, or individual profile.

The default overview replaces `index.html`; the existing GoAccess details move
to `goaccess.html` with a prominent warning that visitor values are invalid.
GoAccess retains the previous seven-log-day request/URL/status analysis. This
view is operational detail, not a long-term visitor report.

## Metric contract

| Metric | Exact meaning |
| --- | --- |
| Logged request | One valid reduced Caddy log line, regardless of response status; excluded traffic is absent, so this is not all server HTTP traffic |
| Server pageview | Logged GET on `/`, `/themen`, `/themen/<slug>`, `/karte`, `/neu`, `/projekt`, `/impressum`, `/datenschutz`, `/kontakt`, or `/barrierefreiheit` (optional trailing slash), with HTML Content-Type and a 2xx status except 204/205, or status 304 with HTML/absent Content-Type |
| Visitors today/yesterday/day before | `null`, displayed as “Nicht ermittelbar”; no reliable identity exists |
| Visitors over 7/30 days | `null`; daily unique counts are never added or presented as period uniques |
| Pageviews today | Observed server pageviews since Berlin midnight through the report snapshot |
| Pageviews over 7/30 days | Observed sums for today and the previous 6/29 Berlin calendar days, with completeness shown separately |

An HTML server fetch is not proof that a human saw the page. Browser cache,
client navigation through `.rsc` without fetching HTML, and prefetching prevent
an exact count of all actual page impressions. Historical lines lacking MIME
information contribute requests, not speculative pageviews (except an otherwise
eligible 304). Errors, redirects, JSON/component responses, and unknown routes
are not pageviews. Keep the route allowlist in `aggregate.py` aligned with future
page routes. These limits also apply when comparing publication effects.

All event dates derive from Caddy's Unix timestamp through `ZoneInfo` in
`Europe/Berlin`, independently of rotation filenames/server timezone. Hour keys
use UTC. Spring transition days have 23 actual slots; autumn has 25, including
separate `02:00 CEST` and `02:00 CET`. The today chart labels both. Future hours
and unavailable data are `null`, not invented zeroes. Partial counts remain
visible with a warning; zero is established only in an observed interval.

## Filters and attribution limits

`deploy/Caddyfile` matches known crawler/search/social-preview signatures and
recognizable technical clients/monitoring agents **before** deleting headers.
The current list is in `@analyticsAutomation`. Prefetch/RSC headers and `.rsc`
paths are excluded as well. The filtering skips logging, not request serving.
It stores neither agents nor their classification per visitor. `analytics_policy`
is only a constant version marker, `pageviews-v1`.

Internal page checks should send `X-Roetgesportal-Check: 1`; for example:

```bash
curl --fail -H 'X-Roetgesportal-Check: 1' https://roetgesportal.de/themen
```

Browser checks without an explicit marker cannot reliably be excluded. Agents
can be absent, unknown or spoofed. No remaining traffic is labelled human.
Legacy logs cannot be filtered retrospectively because agents were removed;
the overview reports how many imported pageviews lack the new policy marker.

## Rotation, persistence, and coverage

- `caddy_logs`: unchanged short-lived reduced logs, read-only to analytics.
- `analytics_state`: private `state.json` with 400 calendar days of daily/hourly
  numeric totals, legacy counts, observation intervals and live-file checkpoints.
  It contains no IP addresses, headers, paths, query values or request records.
  It is mounted only in the job, **never in the report server**. Directory/file
  permissions are 0700/0600. Only SHA-256 processed-prefix checks and inode/byte offsets
  are retained for live log files; deleted-file checkpoints are removed.
- `analytics_report`: regenerable aggregate-only `stats.json`, static overview,
  and the short-window GoAccess detail report. No state or raw logs are copied
  into this volume. It remains mounted read-only in the loopback dashboard.

Every pass reads only complete newly appended lines. Device/inode identity
follows Caddy's rename rotation, including unprocessed rotated tails. Separate
requests at the same timestamp are counted separately. Checkpoints and counters
are committed in one atomic, fsynced state replacement; publishing afterwards
can be retried without recounting. An exclusive writer lock prevents concurrent
jobs. Symlinks, truncation/rewrites, incompatible/corrupt state and inputs with
unredacted identifiers fail closed. Ordinary restarts and image recreations keep
both volumes and checkpoints. Do not run `docker compose down -v`.

On first start, remaining logs are imported automatically; earlier lost logs
and erased identities cannot be reconstructed. Imported days are conservatively
partial. A fully observed day requires consecutive successful passes spanning
its interval. A gap longer than twice the refresh interval plus 60 seconds starts
a new observation interval even if logs can be reread. A restart within that
allowance can continue observation. Malformed rows are counted as rejected and
make completeness uncertain; contents are never printed. No log lines or no
malformed lines are not evidence that the website was continuously available.
High-volume size rotations or prolonged job outages can delete unread logs;
“Erfasst” describes the observer, not proof of lossless upstream delivery.

Retention removes aggregates older than today minus 399 days on each successful
pass, allowing at least twelve months once enough history has accumulated.
It does not create a year's missing history on deployment. Rolling back to a
release from before this feature leaves `analytics_state` unused but intact;
returning to this release preserves counts, with downtime marked conservatively.

Back up `analytics_state` outside the server while the job is stopped; preserve
volume names through deployments and restore tests. The report volume can be
regenerated. For a fresh-server restore, restore the aggregate state but start
with **empty** Caddy logs; do not copy/reimport previously counted logs with new
inodes. This checkpoint contract does not deduplicate arbitrary imported copies
or `copytruncate` rotation. Use an operator-reviewed migration for such cases,
not deletion of the state file to silence an error. A backup's later missing
aggregates cannot be reconstructed after their source logs expire.

## Deployment and access

Review the privacy notice in the same release. Rebuild the existing services:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up --build -d
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
```

The analytics image extends `allinurl/goaccess:1.11` with Alpine's Python; GoAccess
already supplies timezone data. No new persistent Python dependency is installed
through pip. `ANALYTICS_REFRESH_SECONDS` must be 60–300 (default 300). The browser
checks the private JSON every minute, flags stale snapshots, and never stores
identifiers. The job health check rejects reports older than twice the configured
interval plus 60 seconds. On failure the last report remains visible with its
timestamp. Inspect private job logs; never publish them.

Use the existing tunnel, with the configured port if different:

```bash
ssh -L 8082:127.0.0.1:8082 <server-user>@<server-host>
```

Open `http://localhost:8082`. The first cards show pageviews today, yesterday,
the day before, 7 days and 30 days; corresponding visitor cards show the explicit
measurement limitation. The daily chart defaults to 30 days with 90/365/400-day
choices, absolute values, hover details and tables. The second chart isolates
today's hours. GoAccess details are linked below. This URL works only while the
tunnel is open. No statistics route is added to the public portal.

## Verification

```bash
python -m compileall -q tools tests deploy/analytics
python -m unittest discover -s tests -v
CADDY_BINARY=/path/to/caddy python -m unittest discover -s tests -p 'test_analytics*.py' -v
node --check deploy/analytics/dashboard.js
sh -n deploy/analytics/update-report.sh
docker compose --env-file deploy/.env -f deploy/compose.yaml config --quiet
```

CI downloads Caddy 2.11.1 from its official release, verifies a pinned SHA-512
checksum, and enables the proxy test. Upgrade its version/checksum together with
the Compose image; the test rejects a mismatched binary. Locally the test is
optional without `CADDY_BINARY`.

The proxy test uses a local temporary backend and Caddy 2.11.1, synthetic
traffic and no operator configuration. It checks responses, filters, redaction,
and seven retained requests yielding four HTML pageviews. Unit tests cover DST,
midnight, equal timestamps, repeated passes, rotation/tails, incomplete lines,
deleted logs/report recreation, gaps, 400-day expiry, writer locking, stale
health checks, atomic commit failure,
state corruption, privacy boundaries, and private volume exposure. For a manual
single pass use `docker compose ... run --rm analytics --once` while the regular
job is stopped. Do not run two writers intentionally.

Also build/test/lint the web app because this release updates its privacy notice.
Repository tests and synthetic traffic do not verify live-server history,
firewall state, volume backups or production counts. After an authorized release,
verify the loopback binding, health and a small marked/unmarked request sample
against the private logs, without exporting raw data.
