# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

This is a Next.js 16 note-taking app used as a vehicle to demonstrate a production-grade DevOps pipeline. The app itself is intentionally simple — the engineering focus is on what surrounds it (CI/CD, containerisation, IaC, observability, security). See `devops_project_spec/DEVOPS_SPEC.md` for the full 13-phase pipeline plan and `docs/nextjs-explainer.md` for a codebase orientation guide.

## Commands

```bash
bun dev              # Start dev server at http://localhost:3000
bun run build        # Production build
bun start            # Serve production build
bun run lint         # ESLint (must pass before committing)
bun run format       # oxfmt formatter
bun run test:run     # Run unit/component tests once (excludes integration tests)
bun run test         # Watch mode
bun run test:run --coverage          # With coverage report
bun run test:run __tests__/lib/sanitize.test.ts  # Run a single test file
DATABASE_URL=<url> bun run test:integration  # Integration tests (require postgres)
```

TypeScript type-check (no emit):

```bash
bunx tsc --noEmit
```

## Testing

Two separate Vitest configs:

- **`vitest.config.mts`** — unit + component tests, `jsdom` environment, no DB required. Excludes `__tests__/integration/`.
- **`vitest.config.integration.mts`** — integration tests, `node` environment, requires `DATABASE_URL`. Global setup applies `scripts/migrate.sql` via `psql` before the suite runs.

Integration tests live in `__tests__/integration/` and test the DB layer directly via `pool.query()`. They are run separately in CI after the postgres service container is healthy.

## Environment

Requires a `.env.local` file (not committed). Minimum required vars:

```
BETTER_AUTH_SECRET=<any long random string>
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/noteflow
```

For local dev without Docker, start a PostgreSQL instance and run `psql $DATABASE_URL -f scripts/migrate.sql` once to apply the schema. With Docker Compose, this is handled automatically.

## Architecture

### Server / client boundary

Every component is either a **server component** (default — runs at request time on the server, can access DB and env vars directly) or a **client component** (`'use client'` at top — runs in the browser, handles interactivity). Server actions (`'use server'` files named `actions.ts`) are server-side functions callable from client forms via automatic HTTP POST — no fetch/API calls are written by hand.

### Data flow for note mutations

```
Client form submit
  → actions.ts (server action)
    → auth.api.getSession()            validates session
    → zod schema.safeParse()           validates input shape
    → stripHtml() / sanitizeContent()  sanitizes before DB write
    → pool.query() raw SQL             writes to PostgreSQL
  → redirect()
```

### Database

`lib/db.ts` exports a `pg.Pool` singleton (`pool`) connected via `DATABASE_URL`. All queries are raw SQL with `$1`, `$2`, ... parameterised values; there is no ORM. All DB calls are `async`. Schema lives in `scripts/migrate.sql` — it is applied once on first boot (Docker Compose `initdb.d`) or manually via `psql`.

**Query pattern:**
```ts
// Single row
const { rows } = await pool.query<Note>('SELECT * FROM notes WHERE id = $1', [id]);
const note = rows[0]; // undefined if not found

// All rows
const { rows: notes } = await pool.query<Note>('SELECT ... WHERE user_id = $1', [userId]);

// Write (check rowCount for updates/deletes)
const result = await pool.query('UPDATE notes SET ... WHERE id = $1', [id]);
if ((result.rowCount ?? 0) === 0) { /* not found */ }
```

**Type notes:** PostgreSQL BOOLEAN columns return JS `boolean`. TIMESTAMPTZ columns return JS `Date` objects (not strings).

### Authentication

`lib/auth.ts` configures better-auth with the `pg.Pool` instance. Better-auth manages its own tables (`user`, `session`, `account`, `verification`) — these use **camelCase column names** (`emailVerified`, `createdAt`, `userId`, etc.) because better-auth's raw `pg` adapter uses JS field names as DB column names directly (no ORM mapping). All `/api/auth/*` requests are handled by `app/api/auth/[...all]/route.ts`. Server-side session access: `auth.api.getSession({ headers: await headers() })`. Client-side: import from `lib/auth-client.ts`.

### Content sanitization

User input is sanitized in server actions before reaching the database. `lib/sanitize.ts` exports `stripHtml()` (removes all HTML tags — script/style content is removed, other tag text is kept) and `sanitizeContent()` (recursively sanitizes TipTap JSON nodes). These are pure JS with no DOM dependency — deliberately replaced `isomorphic-dompurify` which required jsdom at runtime on the server.

### TipTap content format

Notes are stored as `JSON.stringify(editor.getJSON())` — a TipTap document JSON object. `lib/content.ts` has utilities for working with this format (e.g. extracting plain text). `components/tiptap-renderer.tsx` renders it read-only; `components/rich-text-editor.tsx` renders it as an editable editor. The `parseContent()` helper in `lib/content.ts` safely handles both the stored JSON string and a raw object.

## Testing

Tests live in `__tests__/` mirroring the source structure. Vitest runs with the `jsdom` environment for component tests. The `@/*` path alias works in tests via `vite-tsconfig-paths`.

Current coverage: 92.6% statements, 87.7% branches, 100% functions. Notable gaps: database layer (covered by integration tests in `__tests__/integration/`), server actions, and auth flows. Integration tests run against a real PostgreSQL container via `bun run test:integration`.

## Infrastructure

Terraform lives in `infrastructure/terraform/`. Four child modules: `database` (Neon), `fly` (Fly.io app shell), `secrets` (Doppler), `dns` (Cloudflare, disabled). Remote state is in Terraform Cloud (org: `noteflow`, workspace: `noteflow-staging`).

Provider credentials are **Terraform Cloud environment variables** (sensitive): `FLY_API_TOKEN`, `NEON_API_KEY`, `DOPPLER_TOKEN`. Input variables are **Terraform variables**: `environment`, `fly_org`, `neon_org_id`. Never mix categories — TF Cloud category is immutable after creation.

The Cloudflare provider and `module "dns"` are commented out in `main.tf` until a Cloudflare account is configured (`enable_dns = true`).

Every child module must declare its own `terraform { required_providers { ... } }` — the root's `required_providers` does not propagate to children.

**Neon free tier constraints:** `history_retention_seconds` must be ≤ 21600 (6 hours) — set explicitly, provider default of 86400 exceeds the limit. `org_id` is required on `neon_project` in provider v0.13.0+; find it at Neon console → Account Settings → Organisation.

**Live resource IDs (staging):** Neon project `young-river-02207257`, Fly.io app `noteflow-staging`, Doppler project `noteflow`.

## Deployment (Fly.io)

Staging is live at `https://noteflow-staging.fly.dev`; production at `https://noteflow-production.fly.dev`. Deployment config lives in `fly.toml` (staging) and `fly.production.toml` (production).

**Automated CD (normal path):** Merge to `main` → "Build & Push" workflow pushes a `sha-<short-sha>` image → "Deploy" workflow fires automatically → staging deploys without approval → production job waits for a manual approval click in GitHub UI (Actions → the workflow run → Review deployments).

**Deploy manually (bypass CD):**
```bash
fly deploy --config fly.toml
fly deploy --config fly.production.toml
```

**Secrets** are managed by Doppler (project `noteflow`, configs `staging` and `production`). Doppler syncs automatically to the Fly.io vault — do not use `fly secrets set` directly for app secrets, or the Doppler sync will overwrite the change on the next sync.

To rotate a secret: update the value in the Doppler dashboard → sync fires automatically → redeploy the app to pick up the new value. See `docs/runbooks/secret-rotation.md`.

Required secrets in Doppler (both configs): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FLY_API_TOKEN`, `TF_API_TOKEN`.

**GitHub Secrets required for CD:** `DOPPLER_TOKEN_STAGING` and `DOPPLER_TOKEN_PRODUCTION` — Doppler service tokens scoped to their respective configs. These are the only GitHub Secrets; all other credentials flow from Doppler at runtime.

**GitHub Environments:** `staging` (no protection rules) and `production` (required reviewer = repo admin) — configured in repo Settings → Environments.

**Logs:**
```bash
fly logs --app noteflow-staging
fly logs --app noteflow-production
```

**Rollback:** See `docs/runbooks/rollback.md`.

**Kubernetes (portfolio artifact):** A complete Helm chart lives in `kubernetes/helm/noteflow/`. It is helm-lint valid and deployable to any standard K8s cluster but is not actively run — Fly.io is the live host. See `docs/adr/002-fly-vs-eks.md` for the EKS migration path.

`helm lint kubernetes/helm/noteflow/` — validates the chart locally (requires Helm installed).

## Key constraints

- **Bun only** — use `bun` and `bunx`, not `npm`, `npx`, or `node`. Exception: the Docker runner stage uses `node server.js` (Next.js standalone output targets Node).
- **Raw SQL** — no ORM. All queries use `$1`, `$2`, ... parameterised values (PostgreSQL style).
- **All DB calls are async** — `await pool.query(...)`. Never call `pool.query()` synchronously.
- **No DOMPurify on the server** — server actions must use `stripHtml()` from `lib/sanitize.ts`, not `isomorphic-dompurify`.
- **`@/` path alias** — maps to the project root. Use it for all internal imports.
- **Schema in `scripts/migrate.sql`** — never create tables in application code. Apply the schema separately before starting the app.
