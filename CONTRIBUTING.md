# Contributing

Contributions are welcome through focused pull requests.

## Editorial changes

1. Add or update one YAML file in `content/topics/`.
2. Cite primary public sources and record their access dates.
3. Keep factual state, impact, and attributed positions separate.
4. Follow `docs/governance/editorial-policy.md`.
5. Run validation and regenerate runtime data.

## Technical changes

Keep the portal database-free unless an accepted architecture decision changes
that constraint. Preserve the separation between editorial source data,
generated runtime data, and presentation. User-facing copy is German; code,
documentation, commit messages, and GitHub discussions are English.

## Checks

```bash
python3 -m unittest discover -s tests -v
python3 tools/validate_content.py
python3 tools/build_portal.py
cd web
pnpm build
pnpm test
pnpm lint
```

Generated files must be committed and match their sources. Explain editorial
judgment, visual changes, and operational impact in the pull request.
