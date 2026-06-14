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

Provider credentials are **Terraform Cloud environment variables** (sensitive): `FLY_API_TOKEN`, `NEON_API_KEY`, `DOPPLER_TOKEN`. Input variables are **Terraform variables**: `environment`, `fly_org`. Never mix categories — TF Cloud category is immutable after creation.

The Cloudflare provider and `module "dns"` are commented out in `main.tf` until a Cloudflare account is configured (`enable_dns = true`).

Every child module must declare its own `terraform { required_providers { ... } }` — the root's `required_providers` does not propagate to children.

## Key constraints

- **Bun only** — use `bun` and `bunx`, not `npm`, `npx`, or `node`. Exception: the Docker runner stage uses `node server.js` (Next.js standalone output targets Node).
- **Raw SQL** — no ORM. All queries use `$1`, `$2`, ... parameterised values (PostgreSQL style).
- **All DB calls are async** — `await pool.query(...)`. Never call `pool.query()` synchronously.
- **No DOMPurify on the server** — server actions must use `stripHtml()` from `lib/sanitize.ts`, not `isomorphic-dompurify`.
- **`@/` path alias** — maps to the project root. Use it for all internal imports.
- **Schema in `scripts/migrate.sql`** — never create tables in application code. Apply the schema separately before starting the app.
