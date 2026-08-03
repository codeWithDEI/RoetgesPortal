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

## Publication workflow

1. An editor creates or updates a YAML topic and records the access date of all
   sources.
2. The validator checks the content contract and source requirements.
3. A reviewer checks neutrality, wording, dates, links, and the selected topic
   status.
4. The change is merged through a pull request and generated public data is
   rebuilt.
5. The published page shows its update and verification dates.

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
