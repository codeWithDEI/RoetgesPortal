# RötgesPortal web application

The web application presents generated municipal topic data as an accessible,
responsive information portal. It never reads editorial YAML directly.

## Local development

From the repository root, generate the runtime data first:

```bash
python3 tools/build_portal.py
```

Then start the application:

```bash
cd web
pnpm install
pnpm dev
```

The `predev` and `prebuild` scripts synchronize the repository's generated
runtime artifacts into `public/data`. The committed copy keeps standalone
deployments reproducible when the parent repository is unavailable.

## Validation

```bash
pnpm build
pnpm test
pnpm lint
```

The rendered HTML tests cover the topic overview, a source-backed detail page,
and the not-found response.
