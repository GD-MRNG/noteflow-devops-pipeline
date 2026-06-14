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
bun run test:run     # Run all tests once
bun run test         # Watch mode
bun run test:run --coverage          # With coverage report
bun run test:run __tests__/lib/sanitize.test.ts  # Run a single test file
```

TypeScript type-check (no emit):

```bash
bunx tsc --noEmit
```

## Environment

Requires a `.env.local` file (not committed). Minimum required vars:

```
BETTER_AUTH_SECRET=<any long random string>
BETTER_AUTH_URL=http://localhost:3000
DB_PATH=data/app.db
```

The `data/` directory must exist before starting the server — SQLite cannot create parent directories. It is gitignored except for a `.gitkeep`.

## Architecture

### Server / client boundary

Every component is either a **server component** (default — runs at request time on the server, can access DB and env vars directly) or a **client component** (`'use client'` at top — runs in the browser, handles interactivity). Server actions (`'use server'` files named `actions.ts`) are server-side functions callable from client forms via automatic HTTP POST — no fetch/API calls are written by hand.

### Data flow for note mutations

```
Client form submit
  → actions.ts (server action)
    → auth.api.getSession()       validates session
    → zod schema.safeParse()      validates input shape
    → stripHtml() / sanitizeContent()  sanitizes before DB write
    → db.run() raw SQL            writes to SQLite
  → redirect()
```

### Database

`lib/db.ts` opens a single SQLite file via Bun's native driver and runs all `CREATE TABLE IF NOT EXISTS` statements on startup — there is no separate migration runner. Schema lives entirely in that file. All queries are raw SQL with parameterised values; there is no ORM. The `db` export is a module-level singleton.

### Authentication

`lib/auth.ts` configures better-auth with the SQLite `db` singleton. Better-auth manages its own tables (`user`, `session`, `account`, `verification`). All `/api/auth/*` requests are handled by `app/api/auth/[...all]/route.ts`. Server-side session access: `auth.api.getSession({ headers: await headers() })`. Client-side: import from `lib/auth-client.ts`.

### Content sanitization

User input is sanitized in server actions before reaching the database. `lib/sanitize.ts` exports `stripHtml()` (removes all HTML tags — script/style content is removed, other tag text is kept) and `sanitizeContent()` (recursively sanitizes TipTap JSON nodes). These are pure JS with no DOM dependency — deliberately replaced `isomorphic-dompurify` which required jsdom at runtime on the server.

### TipTap content format

Notes are stored as `JSON.stringify(editor.getJSON())` — a TipTap document JSON object. `lib/content.ts` has utilities for working with this format (e.g. extracting plain text). `components/tiptap-renderer.tsx` renders it read-only; `components/rich-text-editor.tsx` renders it as an editable editor. The `parseContent()` helper in `lib/content.ts` safely handles both the stored JSON string and a raw object.

## Testing

Tests live in `__tests__/` mirroring the source structure. Vitest runs with the `jsdom` environment for component tests. The `@/*` path alias works in tests via `vite-tsconfig-paths`.

Current coverage: 92.6% statements, 87.7% branches, 100% functions. Notable gaps: database layer, server actions, and auth flows have no tests yet — these are addressed in Phase 3 (integration tests against a real PostgreSQL container).

## Key constraints

- **Bun only** — use `bun` and `bunx`, not `npm`, `npx`, or `node`. Bun's SQLite driver (`bun:sqlite`) is used directly.
- **Raw SQL** — no ORM. All queries use parameterised values (`?` placeholders).
- **No DOMPurify on the server** — server actions must use `stripHtml()` from `lib/sanitize.ts`, not `isomorphic-dompurify`.
- **`@/` path alias** — maps to the project root. Use it for all internal imports.
- **`data/` is gitignored** — only `data/.gitkeep` is committed. Never commit `.db` files.
