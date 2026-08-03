FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./web/
WORKDIR /app/web
RUN pnpm install --frozen-lockfile --ignore-scripts

WORKDIR /app
COPY generated ./generated
COPY web ./web

WORKDIR /app/web
RUN pnpm build

EXPOSE 3000

USER node

CMD ["pnpm", "start", "--", "--hostname", "0.0.0.0"]
