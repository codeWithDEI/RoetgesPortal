# Content change monitoring

RötgesPortal can inspect the public Papenteich ALLRIS calendar for changed or
new agenda items. The monitor is a discovery aid, not a publication system.
Its output is stored in `content/review/sitzung-online.yaml`, which is excluded
from the public generator and web application. Human decisions are stored
separately in `content/review/decisions/sitzung-online.yaml`; the scanner never
rewrites that file.

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

## Recording editorial decisions

Do not edit the generated queue to record a decision. Add one entry to the
separate decisions file instead:

```yaml
- candidateId: 1000427/1008064
  decision: create-topic
  topicId: papenteich-town-hall-feasibility-study
  reason: The proposal concerns a durable joint-municipality project.
  reviewedFingerprint: sha256:...
  reviewedAt: "2026-09-04"
```

Copy `candidateId` and `fingerprint` exactly from the generated queue. Four
decisions are available:

- `create-topic` plans a new topic and requires its future topic ID;
- `update-topic` plans a change to an existing topic and requires its ID;
- `no-topic` records that the item does not warrant public portal content;
- `defer` records that a decision should wait for more official information.

The monitor compares `reviewedFingerprint` with the current source fingerprint.
If ALLRIS later changes an item that was marked `no-topic` or `defer`, the
decision becomes stale and the report returns it to editorial review. A
`create-topic` or `update-topic` decision remains actionable until the relevant
ALLRIS agenda or proposal ID appears in the cited sources of a topic.

## Manual GitHub preview

The `Preview content monitor` workflow can be started manually from the
repository's Actions page. It has read-only repository permissions and cannot
push a branch or open a pull request. The run summary shows the number of new,
changed, and removed candidates. A downloadable artifact contains:

- the complete proposed review queue;
- the current human decision ledger;
- a Markdown summary;
- the exact Git diff against the committed queue.

This first stage should be observed for several runs. Scheduled execution and
automatic creation of one rolling review pull request can be added separately
after the parser and candidate quality have proved stable.

## Editorial handoff

For each relevant queue item:

1. Open the linked agenda item and proposal on the official source.
2. Record `create-topic`, `update-topic`, `no-topic`, or `defer` in the separate
   decision ledger.
3. For a planned topic change, summarize the official material in plain German
   without copying long passages.
4. Record the official sources and verification date in the topic YAML.
5. Submit content changes through the normal reviewed pull-request workflow.
6. Run the monitor again after the content change so stable ALLRIS identifiers
   can mark the candidate as tracked.

Items that are procedural, irrelevant to the portal, or lack sourceable facts
can be recorded as `no-topic`. The generated queue and decision ledger are
operational evidence and are never presented as editorial content.
