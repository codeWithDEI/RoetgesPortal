# Municipal handover

RötgesPortal deliberately uses portable content, open formats, and reproducible
builds so that a future move to an official municipal domain does not require a
rewrite.

## Preconditions for official adoption

- The municipality assigns an accountable operator and editorial owner.
- Logo, coat-of-arms, name, and domain usage receive written approval.
- Legal notice, privacy information, accessibility statement, and contact paths
  are completed for the official operator.
- Editorial independence, review rules, correction handling, and retention are
  agreed in writing.
- At least two people receive documented repository, hosting, DNS, and recovery
  access.

## Transfer package

The handover should include:

- the Git repository and complete history;
- YAML, GeoJSON, schemas, and generated artifacts;
- domain, DNS, hosting, deployment, monitoring, and backup ownership;
- environment and secret inventory without storing secrets in Git;
- a successful clean build and restore test;
- outstanding risks, maintenance work, and content requiring verification;
- an export of open issues and editorial decisions.

## Acceptance checklist

1. Build the repository from a clean checkout.
2. Validate and generate all content without local-only files.
3. Deploy the exact reviewed commit to a staging hostname.
4. Confirm accessibility, mobile behavior, security headers, and external links.
5. Restore the service and content from documented backups.
6. Transfer DNS only after legal and operational sign-off.
7. Replace the independent-service notice only when the municipality confirms
   official operation.

The portal can also remain independently operated while being linked from the
municipal website. That model should retain the independent-service notice and
clearly assign responsibility for content and availability.
