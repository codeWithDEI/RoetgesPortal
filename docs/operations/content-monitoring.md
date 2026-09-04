# Content change monitoring

RötgesPortal can inspect the public Papenteich ALLRIS calendar for changed or
new agenda items. The monitor is a discovery aid, not a publication system.
Its output is stored in `content/review/sitzung-online.yaml`, which is excluded
from the public generator and web application.

## Safety boundaries

- Only agenda items below an explicit `Öffentlicher Teil` heading are read.
- Non-public sections are never copied into the review queue.
- Requests are restricted to the configured HTTPS host and use a descriptive
  user agent, timeouts, retries, and a short delay.
- The output contains links and agenda metadata, not downloaded attachments or
  copied document bodies.
- No topic is created, changed, or published automatically.
- A human editor verifies relevance to Rötgesbüttel, factual accuracy,
  neutrality, dates, and source links before changing `content/topics/`.

The versioned source registry at `config/content-monitor.yaml` defines the
eligible municipal and joint-municipality bodies. Faction and group meetings
are intentionally not included.

## Running the monitor locally

Install the development dependencies, then run:

```bash
python3 tools/scan_sitzung_online.py
python3 tools/validate_content.py
```

By default, the current and previous calendar months are refreshed. Older
review records remain in the queue. A different lookback window can be used
for a deliberate review:

```bash
python3 tools/scan_sitzung_online.py --months 3
```

The scanner replaces records inside every scanned calendar month. This means
that additions, wording changes, and removals are visible as an ordinary Git
diff. The generated YAML has no run timestamp, so unchanged source data does
not create noise.

Agenda and proposal identifiers are compared with the source URLs of existing
topics. A queue item is marked `tracked` when that stable identifier is already
cited; otherwise it is marked `new`. This is a technical hint only and does not
replace editorial judgment.

## Manual GitHub preview

The `Preview content monitor` workflow can be started manually from the
repository's Actions page. It has read-only repository permissions and cannot
push a branch or open a pull request. The run summary shows the number of new,
changed, and removed candidates. A downloadable artifact contains:

- the complete proposed review queue;
- a Markdown summary;
- the exact Git diff against the committed queue.

This first stage should be observed for several runs. Scheduled execution and
automatic creation of one rolling review pull request can be added separately
after the parser and candidate quality have proved stable.

## Editorial handoff

For each relevant queue item:

1. Open the linked agenda item and proposal on the official source.
2. Decide whether an existing topic needs an update or a new topic is needed.
3. Summarize the material in plain German without copying long passages.
4. Record the official sources and verification date in the topic YAML.
5. Submit the topic change through the normal reviewed pull-request workflow.

Items that are procedural, irrelevant to the portal, or already sufficiently
covered require no public content change. They can remain in the review queue;
the queue itself is operational evidence and is never presented as editorial
content.
