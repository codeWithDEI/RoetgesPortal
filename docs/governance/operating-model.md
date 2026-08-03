# Operating model

The portal is designed to remain maintainable by a small civic team and to be
transferable to the municipality if an official adoption becomes possible.

## Responsibilities

| Role | Minimum responsibility |
| --- | --- |
| Product owner | Defines scope, resolves policy questions, and represents the portal externally. |
| Editor | Researches sources and maintains YAML topics. |
| Reviewer | Checks neutrality, evidence, accessibility, and publication readiness. |
| Technical maintainer | Maintains schemas, generator, web application, CI, hosting, and recovery procedures. |

One person may initially hold several roles, but published content should receive
a second-person review. Repository and hosting access should eventually be held
by at least two trusted maintainers.

## Regular cadence

- Review meeting agendas and minutes after publication.
- Verify active topics at least every four weeks.
- Review dependency and platform security updates monthly.
- Test the health endpoint continuously and a restore procedure quarterly once
  self-hosting is introduced.
- Review legal, privacy, accessibility, and contact information every six months
  and whenever the operator or hosting model changes.

## Decisions and incidents

Editorial policy changes require a pull request and review. A factual correction
may be expedited, but must remain traceable. Security incidents take precedence
over normal publication work: contain the issue, preserve evidence, communicate
the impact, restore from a known-good version, and document follow-up actions.

## Independence

Until the municipality formally adopts the portal, every public surface must
state that RötgesPortal is an independent information service and link to the
official municipal website. The municipal visual reference must not be described
as endorsement or official status.
