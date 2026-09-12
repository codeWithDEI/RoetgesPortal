# Editorial policy

RötgesPortal explains municipal topics without presenting itself as an official
municipal publication. Editorial work must make facts verifiable, distinguish
interpretation from evidence, and make corrections visible through Git.

## Content layers

Every topic separates three layers:

1. **Factual state** describes what was announced, discussed, or decided.
2. **Impact** describes where and whom the topic may affect, without predicting
   an outcome that is not supported by a source.
3. **Positions** reproduce publicly documented positions and always identify
   both the organization and the supporting source.

Editorial opinion is not part of the factual state. If commentary is introduced
later, it must use a separate content type and a visible label.

## Source hierarchy

Prefer sources in this order:

1. resolutions, minutes, proposals, agendas, and planning documents from the
   responsible public body;
2. official websites and public notices from the municipality, joint
   municipality, district, or responsible authority;
3. attributable public statements from affected organizations;
4. reputable secondary reporting when no primary source is available.

Each published topic needs at least one source. Dates, amounts, quotations,
formal status, and attributed positions must be traceable to a source. Avoid
copying long passages; summarize them in plain language and link to the
original document.

## Topic phase and decision outcomes

The topic `status` always describes the lifecycle of the exact subject named in
the title. It must not be inferred directly from the outcome of one proposal or
from technical workflow labels in ALLRIS. Formal decisions are recorded
separately in `latestDecision`.

- `decided` requires an adopted resolution about the titled subject. Taking a
  report or plan into account without a vote is recorded as `noted`.
- `implementation` requires evidence that execution, procurement, or a
  commissioned review has started. A budget allocation alone is not execution.
- `completed` requires completion of the titled subject. The end of a council
  consultation does not mean that a broadly titled project was completed.
- `paused` requires an explicit source for suspension or deferral. A missing
  update or the ALLRIS label `Gestoppt` is not sufficient evidence.
- `rejected` is only suitable when the topic title itself is scoped to the
  rejected proposal. A rejected alternative does not reject the broader topic.
- A withdrawn motion uses the `withdrawn` decision outcome and is never
  described as rejected.

New or materially updated topics should include a `statusBasis` that summarizes
the evidence and references a source already listed on the topic. If a formal
decision is known, `latestDecision` should be included as well.

## Publication workflow

1. The optional content monitor records public agenda changes in a non-public
   review queue. It does not create or update a topic.
2. An editor verifies the official source and records a disposition in the
   separate decision ledger. A stored source fingerprint makes later changes
   visible and reopens stale decisions.
3. For a planned content change, the editor creates or updates a YAML topic and
   records the access date of all sources.
4. The validator checks the content contract and source requirements.
5. A reviewer checks relevance, neutrality, wording, dates, links, and the
   selected topic status.
6. The change is merged through a pull request and generated public data is
   rebuilt.
7. The published page shows its update and verification dates.

Authors should not be the only reviewer for topics in which they have a direct
political, financial, or personal interest. Any unavoidable conflict should be
noted in the pull request.

## Verification and corrections

- Active topics should be checked after each relevant public meeting and at
  least every four weeks.
- Completed and rejected topics should be checked when new official information
  becomes available.
- Broken source links should be replaced with stable official links or archived
  references where legally and technically appropriate.
- Material corrections use a dedicated commit whose message identifies the
  affected topic. The Git history remains the public correction log.
- Urgent inaccuracies may be unpublished immediately by setting the topic to
  `draft`; the correction still requires review before republication.

## Language and accessibility

Summaries use plain German, explain administrative terminology, and avoid party
language. Titles and summaries must remain understandable without opening the
source document. Images, maps, and diagrams require a textual equivalent.
