# Phase 2: Containerisation + PostgreSQL Migration

## What this PR does

This PR packages the Next.js app into a Docker container and migrates the database from SQLite to PostgreSQL. These two changes are coupled — SQLite is a single file that lives inside the container's ephemeral filesystem and gets destroyed on every restart. PostgreSQL is an external service with a persistent volume, which is the correct architecture for any containerised app.

After this PR, the full development stack can be started with a single command:

```bash
docker compose up
```

---

## Why PostgreSQL?

SQLite works fine for local development but breaks in containers for two reasons:

1. **Ephemeral filesystem** — a container's writable layer is destroyed when the container stops. Any data written to the SQLite file is lost.
2. **No concurrent access** — SQLite uses file locking. Multiple container replicas (pods in Kubernetes) would contend on the same file, causing write failures.

PostgreSQL is the industry standard for containerised apps. Neon (the managed PostgreSQL used in Phase 5) is free-tier and is the same engine. The migration was the right call regardless of cost.

---

## Changes

### Database layer (`lib/db.ts`)

**Before:** Bun's native SQLite driver. Synchronous API. Single-file database.

```ts
import { Database } from 'bun:sqlite';
const db = new Database(process.env.DB_PATH || 'data/app.db');
db.run('PRAGMA journal_mode = WAL;');
// schema creation inline...
export { db };
```

**After:** `pg` Pool. Async API. Schema lives in `scripts/migrate.sql`.

```ts
import { Pool } from 'pg';
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

The schema is no longer created at startup — it lives in `scripts/migrate.sql` and is run once by the PostgreSQL container's `initdb.d` mechanism on first boot.

### Query API migration

Every query file changed from SQLite's synchronous API to `pg`'s async API. The key differences:

| Concern | SQLite (before) | PostgreSQL (after) |
|---|---|---|
| Parameters | `?` placeholders | `$1`, `$2`, ... |
| Single row | `.query().get(p)` | `const { rows } = await pool.query(); rows[0]` |
| All rows | `.query().all(p)` | `const { rows } = await pool.query()` |
| Affected rows | `result.changes` | `result.rowCount` |
| Execution | Synchronous | `async/await` throughout |

**Files updated:** `app/notes/new/actions.ts`, `app/notes/[id]/actions.ts`, `app/notes/[id]/edit/actions.ts`, `app/notes/[id]/page.tsx`, `app/notes/[id]/edit/page.tsx`, `app/dashboard/page.tsx`, `app/p/[slug]/page.tsx`

### Schema changes (`scripts/migrate.sql`)

SQLite to PostgreSQL type conversions:

| SQLite | PostgreSQL |
|---|---|
| `INTEGER NOT NULL DEFAULT 0` (boolean) | `BOOLEAN NOT NULL DEFAULT FALSE` |
| `TEXT NOT NULL DEFAULT (datetime('now'))` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| Trigger (SQLite syntax) | PL/pgSQL function + `CREATE OR REPLACE TRIGGER` |

The `notes` table uses snake_case column names (`user_id`, `is_public`, etc.) as usual.

The `user`, `session`, `account`, `verification` auth tables use camelCase column names (`emailVerified`, `createdAt`, `userId`, etc.) — this is how better-auth's `pg` adapter issues its INSERT/UPDATE/SELECT queries. Using snake_case here caused a production error (see Problems section below).

### TypeScript type changes

- `is_public: number` → `is_public: boolean` (pg returns native JS booleans for BOOLEAN columns)
- `updated_at: string` → `updated_at: Date` (pg returns native JS Dates for TIMESTAMPTZ columns)
- `note.is_public === 1` → `note.is_public` (boolean truthy — simpler)
- `new Date(note.updated_at).toLocaleDateString()` → `note.updated_at.toLocaleDateString()` (already a Date)

### Authentication (`lib/auth.ts`)

better-auth accepts a `pg.Pool` directly as its `database` config:

```ts
import { Pool } from 'pg';
import { pool } from './db';

export const auth = betterAuth({
  database: pool,
  ...
});
```

### Dockerfile

Three-stage build:

```
Stage 1 (deps)    oven/bun:1-alpine   bun install --frozen-lockfile
Stage 2 (builder) oven/bun:1-alpine   bun run build  →  .next/standalone/
Stage 3 (runner)  node:22-alpine      node server.js (non-root user)
```

The key is `output: 'standalone'` in `next.config.ts` — this tells Next.js to produce a self-contained `server.js` with only the Node modules it actually needs, keeping the final image small. The runner stage uses Node (not Bun) because the standalone output is a standard Node.js server.

The runner stage uses a non-root user (`nextjs`, uid 1001) — standard security practice for containers. Running as root in a container is a security risk because a container escape would give root access on the host.

Base image digest pinning is noted as a comment (`# Pin digest in production: docker pull ... && docker inspect --format=...`). In production you would pin `FROM oven/bun:1-alpine@sha256:<digest>` to guarantee a reproducible, auditable build. Tags like `1-alpine` are mutable and can be updated to include a breaking change or CVE without warning.

### Docker Compose (`docker-compose.yml`)

Two services:

- **`db`** — `postgres:16-alpine`. Mounts `scripts/migrate.sql` into `/docker-entrypoint-initdb.d/` so schema is applied automatically on first boot. Has a healthcheck (`pg_isready`) so the `app` service won't start until the database is actually ready to accept connections.
- **`app`** — built from the local Dockerfile. `depends_on: db: condition: service_healthy` ensures startup order.

The postgres data is stored in a named volume (`postgres_data`) so it persists across `docker compose down` restarts. The volume is only lost if you explicitly run `docker compose down -v`.

### Health endpoint (`app/api/health/route.ts`)

```
GET /api/health → { "status": "ok", "db": "ok", "timestamp": "..." }
```

Runs `SELECT 1` against the pool. Returns 503 if the database is unreachable. Used by load balancers and Kubernetes liveness probes to route traffic away from unhealthy instances.

### Lint fix (`components/share-toggle.tsx`)

Replaced an ESLint-flagged `useEffect` + `setState` pattern:

```ts
// Before (flagged by react-hooks/set-state-in-effect)
const [origin, setOrigin] = useState('');
useEffect(() => { setOrigin(window.location.origin); }, []);

// After (lazy initializer — SSR-safe, no effect needed)
const [origin] = useState(() => typeof window !== 'undefined' ? window.location.origin : '');
```

The lazy initializer runs once on mount. The `typeof window !== 'undefined'` guard is required because this component might be rendered on the server during static generation, where `window` doesn't exist.

---

## Problems faced and how we solved them

### Problem 1: better-auth CLI can't run on Windows (node-gyp / Python)

**What happened:** The better-auth CLI (`bunx @better-auth/cli generate`) downloads `better-sqlite3` as a transitive dependency. That package requires a native C++ compilation step via `node-gyp`, which needs Python. The Windows machine's Python installs were all failing the version check (`version is "" — should be >=3.6.0`), so the CLI crashed before generating anything.

**How we solved it:** Instead of running the CLI, we read the better-auth source repository's test snapshot files via the Context7 MCP documentation tool. These snapshots show the exact Drizzle ORM schema that better-auth generates for PostgreSQL — giving us the column names without needing to run the CLI.

**What we learned:** The better-auth CLI is only needed to generate the initial schema file. In CI (Linux), it would run fine. For local Windows dev, the workaround is to read the generated snapshots directly.

### Problem 2: better-auth's `pg` adapter uses camelCase column names, not snake_case

**What happened:** The Drizzle ORM snapshots (from the docs) showed column mappings like `emailVerified: boolean("email_verified")` — which we misread as meaning the actual DB column name is `email_verified`. We wrote `migrate.sql` with snake_case columns (`email_verified`, `created_at`, `user_id`, etc.) for the auth tables.

At runtime, better-auth issued:
```sql
INSERT INTO "user" ("emailVerified", "createdAt", "updatedAt", ...) VALUES (...)
```

PostgreSQL returned: `column "emailVerified" of relation "user" does not exist`.

**Root cause:** The Drizzle schema's `boolean("email_verified")` syntax means "the JS field is `emailVerified` but map it to DB column `email_verified`". The `pg.Pool` adapter (used without Drizzle) skips that mapping entirely and uses the JS field name directly as the column name.

**How we solved it:** Updated `migrate.sql` to use quoted camelCase identifiers for auth table columns: `"emailVerified"`, `"createdAt"`, `"userId"`, etc. PostgreSQL preserves the case when identifiers are quoted. The `notes` table (our own schema) keeps snake_case as before.

**What we learned:** better-auth has two modes for PostgreSQL:
- With Drizzle/Prisma ORM: the ORM handles the camelCase→snake_case mapping
- With `pg.Pool` directly: better-auth uses the field names it knows (camelCase) as DB column names verbatim

Checking the actual SQL in the error log is always faster than reading the docs.

### Problem 3: Port 3000 already in use

**What happened:** First `docker compose up` failed with `bind: Only one usage of each socket address`. The local `bun dev` server was running on port 3000.

**How we solved it:** Stopped the dev server, re-ran `docker compose up`. (Alternatively: `docker compose run --rm -p 3001:3000 app` to map to a different port.)

---

## Verification

```bash
docker compose up
# App at http://localhost:3000 — register, create, edit, share, delete notes

curl http://localhost:3000/api/health
# → {"status":"ok","db":"ok","timestamp":"2026-06-14T..."}
```

Test suite (unit tests — no DB dependency):
```
42 passed (42)
```

TypeScript type-check: clean. ESLint: 0 errors.

---

## What's next

**Phase 3 — CI pipeline:** GitHub Actions workflow running lint → type-check → unit tests → integration tests (against a real `postgres:16` service container) → build on every PR. Branch protection will require all checks to pass before merge.
