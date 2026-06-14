# How This Codebase Works — A Plain-English Guide

This document explains the technology stack for someone coming from outside the JavaScript ecosystem. It avoids brand names where possible and focuses on what things _do_ rather than what they're called.

---

## The Big Picture

This is a **web application** — it has a server that responds to HTTP requests and a browser UI that runs in the user's tab. What makes this stack unusual is that **a single codebase handles both**. The same files contain code that runs on the server (to fetch data, check authentication, write to the database) and code that runs in the browser (to render the editor, handle button clicks, update the UI).

The runtime that executes everything is **Bun** — think of it as Node.js but faster and with a built-in SQLite driver, test runner, and package manager. You use `bun` the same way you'd use `python` or `ruby` to run a script.

---

## Language: TypeScript

The source files are written in **TypeScript**, which is JavaScript with type annotations added on top.

JavaScript on its own lets you write:

```js
function add(a, b) {
  return a + b;
}
```

TypeScript adds the ability to declare what types the inputs and outputs must be:

```ts
function add(a: number, b: number): number {
  return a + b;
}
```

This catches whole categories of bugs at edit time rather than at runtime. TypeScript is compiled away before the code runs — the browser and server never see the type annotations, only plain JavaScript.

**File extensions:**

- `.ts` — TypeScript file (logic, utilities, no UI)
- `.tsx` — TypeScript file that also contains **JSX** (UI markup — explained below)
- `.mts` — TypeScript module using ES module syntax (used for config files)

---

## UI Representation: JSX

Browsers understand HTML. Developers want to write UI in their code files. JSX is a syntax extension that lets you write HTML-like markup inside a `.tsx` file:

```tsx
function Button({ label }: { label: string }) {
  return <button className='btn'>{label}</button>;
}
```

This is not HTML — it's TypeScript code that describes what to render. The build process converts it to function calls that produce the actual DOM elements. The mental model is: **JSX is a template that lives inside code**, not markup that lives in a separate file.

---

## Component Model: React

**React** is the library that makes JSX useful. Its central concept is the **component** — a function that accepts inputs (called `props`) and returns a description of what to display.

```tsx
function NoteCard({ title, updatedAt }: { title: string; updatedAt: string }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>Last updated: {updatedAt}</p>
    </div>
  );
}
```

Components are composable — you nest them like HTML elements. The entire UI of this app is a tree of components, from the root layout down to individual buttons.

**State** is data that, when changed, causes a component to re-render. React manages this automatically — you declare what the UI should look like for a given state, and React handles updating the DOM efficiently when state changes.

---

## Framework: Next.js

React is a UI library. **Next.js** is the framework that adds everything else: routing, server-side rendering, API endpoints, build tooling, and deployment conventions.

### Routing by filesystem

There are no route definition files. Instead, **the directory structure is the routing table**:

```
app/
├── page.tsx              → renders at /
├── dashboard/
│   └── page.tsx          → renders at /dashboard
├── notes/
│   ├── new/
│   │   └── page.tsx      → renders at /notes/new
│   └── [id]/
│       └── page.tsx      → renders at /notes/abc123 (dynamic segment)
└── p/
    └── [slug]/
        └── page.tsx      → renders at /p/some-slug
```

Square brackets (`[id]`, `[slug]`) are dynamic segments — the value in the URL is captured and passed to the page component as a parameter.

### Special filenames

Inside any route directory, certain filenames have reserved meanings:

| Filename     | Purpose                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| `page.tsx`   | The visible UI for that route                                             |
| `layout.tsx` | A persistent wrapper that surrounds child pages (used for the header/nav) |
| `actions.ts` | Server-side functions callable directly from UI components                |
| `route.ts`   | A raw HTTP endpoint (used in `app/api/`)                                  |

### Server components vs client components

This is the most important concept to grasp. Every component in this app is either a **server component** or a **client component**, and the distinction determines where its code executes.

**Server components** (the default):

- Run on the server, once, at request time
- Can directly query the database, read environment variables, check authentication
- Their output (HTML) is sent to the browser
- Cannot handle browser events (clicks, typing), cannot use browser APIs

**Client components** (opt-in, declared with `'use client'` at the top of the file):

- The code is sent to the browser and executed there
- Can respond to events, manage state, use browser APIs
- Cannot directly access the database or server secrets

In this codebase, the TipTap editor (`components/rich-text-editor.tsx`) is a client component because it needs to respond to keystrokes in real time. The dashboard page (`app/dashboard/page.tsx`) is a server component because it just fetches notes and renders a list.

```
Request from browser
        │
        ▼
  Server Component          ← runs here, has DB access
  fetches notes from DB
  renders HTML + sends it
        │
        ▼
  Browser receives HTML
  Client Components hydrate  ← JS runs here, handles interactions
```

### Server actions

Server actions (the `actions.ts` files) are an unusual pattern worth understanding explicitly. They are **async functions that run on the server but are called from client-side code**.

When a form is submitted or a button is clicked in the browser, Next.js automatically makes an HTTP request to execute the server action. The developer never writes this HTTP plumbing — they just call the function.

```tsx
// This runs ON THE SERVER even though it's called from a browser event
async function createNote(formData: FormData) {
  'use server';
  const title = formData.get('title');
  db.run('INSERT INTO notes ...', [title]);
}

// This renders in the BROWSER
function NewNoteForm() {
  return (
    <form action={createNote}>
      <input name='title' />
    </form>
  );
}
```

The `'use server'` directive at the top of an `actions.ts` file marks all exported functions as server actions.

### API routes

Files named `route.ts` inside `app/api/` are plain HTTP handlers. They export named functions corresponding to HTTP methods:

```ts
// app/api/auth/[...all]/route.ts
export { GET, POST } = auth.handler;
```

This handles all `GET` and `POST` requests to `/api/auth/*`. The `...all` is a catch-all segment — it matches any path after `/api/auth/`.

---

## Project File Map

Here is every significant file in this project and what it does:

### Configuration files (root level)

| File                 | What it does                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`       | Declares all dependencies and the scripts you can run (`bun dev`, `bun run lint`, etc.)                                                                                                                                            |
| `bun.lock`           | Records the exact version of every package installed. Never edit this by hand — Bun manages it.                                                                                                                                    |
| `tsconfig.json`      | TypeScript compiler settings. The important one here: `"strict": true` means TypeScript enforces its type rules as strictly as possible. Also defines the `@/` path alias (so `import x from '@/lib/db'` resolves to `lib/db.ts`). |
| `next.config.ts`     | Next.js framework configuration. Currently minimal — just the default settings.                                                                                                                                                    |
| `postcss.config.mjs` | Configuration for PostCSS, the tool that processes CSS. Here it's used to activate Tailwind.                                                                                                                                       |
| `eslint.config.mjs`  | Rules for ESLint, the static analysis tool that catches code quality issues.                                                                                                                                                       |
| `vitest.config.mts`  | Configuration for the test runner (Vitest). Tells it to use a simulated browser environment (jsdom) for component tests.                                                                                                           |
| `vitest.setup.ts`    | Code that runs once before every test suite — here it sets up the extended matchers from `@testing-library/jest-dom`.                                                                                                              |
| `.env.local`         | Local environment variables. **Never committed to git.** Contains secrets like `BETTER_AUTH_SECRET` and configuration like `DB_PATH`.                                                                                              |
| `.gitignore`         | Tells git which files to ignore. `node_modules/`, `.next/`, `data/`, and `.env*` files are all excluded.                                                                                                                           |

### `lib/` — shared server-side logic

| File                 | What it does                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/db.ts`          | Opens the SQLite database and runs all the `CREATE TABLE IF NOT EXISTS` statements on startup. Exports a `db` object used everywhere else to run queries. |
| `lib/auth.ts`        | Configures the authentication library (better-auth). Connects it to the database so it can store users and sessions.                                      |
| `lib/auth-client.ts` | A browser-side version of the auth configuration. Used by client components that need to know the current user or trigger sign-out.                       |
| `lib/sanitize.ts`    | Functions that strip HTML from user input before it reaches the database. Prevents stored XSS.                                                            |
| `lib/content.ts`     | Utilities for working with TipTap's JSON content format (e.g. extracting plain text from a rich-text document).                                           |
| `lib/validation.ts`  | Zod schemas that define the shape of valid form inputs. Used in server actions to validate data before touching the database.                             |

### `app/` — pages and API routes

| File                                     | What it does                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `app/layout.tsx`                         | Root layout — wraps every page. Contains the `<html>` and `<body>` tags, imports global CSS, and renders the header.               |
| `app/globals.css`                        | Global stylesheet. Imports Tailwind and sets CSS custom properties (colours, spacing tokens).                                      |
| `app/page.tsx`                           | The landing page at `/`. Marketing copy and sign-in/sign-up calls to action.                                                       |
| `app/authenticate/page.tsx`              | Login and registration form.                                                                                                       |
| `app/dashboard/page.tsx`                 | The note list page at `/dashboard`. Server component — fetches all notes for the current user from the database and renders them.  |
| `app/notes/new/page.tsx`                 | The "create a note" page.                                                                                                          |
| `app/notes/new/new-note-form.tsx`        | Client component — the form with the TipTap editor for new notes.                                                                  |
| `app/notes/new/actions.ts`               | Server action for creating a note: validates input, sanitizes it, inserts into the database.                                       |
| `app/notes/[id]/page.tsx`                | Displays a single note (read view).                                                                                                |
| `app/notes/[id]/edit/page.tsx`           | The note editing page.                                                                                                             |
| `app/notes/[id]/edit/edit-note-form.tsx` | Client component — the edit form with the TipTap editor.                                                                           |
| `app/notes/[id]/edit/actions.ts`         | Server action for updating a note.                                                                                                 |
| `app/notes/[id]/actions.ts`              | Server action for toggling a note's public sharing state.                                                                          |
| `app/notes/[id]/note-actions.tsx`        | Client component — the delete button and share toggle controls shown on a note page.                                               |
| `app/p/[slug]/page.tsx`                  | Public note viewer at `/p/<slug>`. Reads the note by its public slug and renders it in read-only mode. No authentication required. |
| `app/api/auth/[...all]/route.ts`         | Hands all authentication HTTP requests (`/api/auth/*`) to the better-auth library to handle.                                       |

### `components/` — reusable UI pieces

| File                              | What it does                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/header.tsx`           | The site header — app name, navigation links, sign-out button.                                                                                                   |
| `components/rich-text-editor.tsx` | The TipTap rich text editor. A client component — manages editor state, renders the toolbar, handles all formatting commands (bold, heading, bullet list, etc.). |
| `components/share-toggle.tsx`     | The toggle switch that enables/disables public sharing of a note. Shows the public URL when enabled.                                                             |
| `components/tiptap-renderer.tsx`  | Renders TipTap JSON content in read-only mode. Used on the public note page and the note view page.                                                              |

### `__tests__/` — automated tests

| File                                            | What it tests                                                                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `__tests__/lib/sanitize.test.ts`                | Every branch of the HTML sanitization logic — dangerous tags removed, safe URLs kept, malicious protocols blocked.      |
| `__tests__/lib/content.test.ts`                 | The utility functions for extracting plain text from TipTap JSON documents.                                             |
| `__tests__/lib/validation.test.ts`              | The Zod schemas — valid inputs accepted, invalid inputs rejected with correct error messages.                           |
| `__tests__/components/tiptap-renderer.test.tsx` | The read-only renderer component — renders various TipTap content types (headings, bold, code blocks, lists) correctly. |

---

## Styling: Tailwind

Rather than writing CSS in separate `.css` files with class names you invent, **Tailwind** provides a large set of pre-defined utility classes that map directly to CSS properties:

```tsx
// Instead of writing CSS:
// .card { padding: 16px; border-radius: 8px; background: white; }

// You apply utility classes directly:
<div className='p-4 rounded-lg bg-white'>...</div>
```

Classes like `p-4` (padding: 1rem), `rounded-lg` (border-radius: 0.5rem), `bg-white` (background: white) are atomic — each does one thing. You compose them in the markup.

Tailwind is processed at build time. Classes you don't use are not included in the final CSS file.

---

## Database

The database is **SQLite** — a single file (`data/app.db`) that lives on disk. There is no separate database server process. Bun has a built-in SQLite driver so the app reads and writes to this file directly.

Queries are written in raw SQL (no ORM). The schema is created by `lib/db.ts` on startup using `CREATE TABLE IF NOT EXISTS` statements, so the first time the app runs it creates all the tables automatically.

Tables:

- `user` — accounts (managed by better-auth)
- `session` — active login sessions (managed by better-auth)
- `account` — linked authentication providers (managed by better-auth)
- `verification` — email verification tokens (managed by better-auth)
- `notes` — user notes: title, content (TipTap JSON), public sharing state, slug

---

## Authentication

**better-auth** is the authentication library. It handles:

- Password hashing and verification
- Session creation and expiry
- Storing everything in the existing SQLite database (no separate auth service)

It exposes an HTTP handler that is wired into Next.js at `/api/auth/*`. On the server side, `auth.api.getSession({ headers })` lets any server component or server action check who the current user is. On the client side, `lib/auth-client.ts` exposes the same information for browser components.

---

## How Data Flows: A Worked Example

**User creates a note:**

1. User types a title and content in the TipTap editor (`app/notes/new/new-note-form.tsx` — runs in browser)
2. User clicks "Create" — the form submits to the `createNote` server action
3. Next.js sends an HTTP POST to its own server, carrying the form data
4. The server action (`app/notes/new/actions.ts`) runs on the server:
   - Calls `auth.api.getSession()` to verify the user is logged in
   - Runs the input through the Zod schema to validate title and content
   - Strips HTML from the title and content via `stripHtml()`
   - Inserts a row into the `notes` table in SQLite
5. Next.js redirects the browser to `/notes/<new-id>`
6. The note view page (`app/notes/[id]/page.tsx`) renders on the server, queries the database for that note, and sends HTML back to the browser

---

## Testing

The test runner is **Vitest** — it finds files matching `**/*.test.ts` or `**/*.test.tsx` and executes them.

### Test environment

Tests that involve React components (`.test.tsx`) run in **jsdom** — a JavaScript implementation of a browser's DOM. This means you can render components and make assertions about what they display without opening a real browser. The Vitest config (`vitest.config.mts`) sets this up.

Tests that only test pure logic (`.test.ts`) don't need a browser environment at all.

### What's being tested

```
__tests__/
├── lib/
│   ├── sanitize.test.ts      # Pure logic — no React, no browser
│   ├── content.test.ts       # Pure logic
│   └── validation.test.ts    # Pure logic
└── components/
    └── tiptap-renderer.test.tsx   # React component — uses jsdom
```

### Running tests

```bash
bun run test:run       # run all tests once, print results, exit
bun run test           # watch mode — re-runs tests on file change
bun run test:run --coverage   # include a coverage report
```

### Coverage report

The coverage report shows what percentage of your code is exercised by tests:

- **Statements** — individual lines/expressions executed
- **Branches** — both sides of every `if`/`else`/ternary reached
- **Functions** — every function called at least once
- **Lines** — similar to statements but counted by line number

Current coverage: **92.6% statements, 87.7% branches, 100% functions.**

The uncovered lines are mostly defensive error paths in `lib/sanitize.ts` (the catch blocks for malformed attribute values) and one edge case in the TipTap renderer.

### What is NOT tested (yet)

- **Database layer** — no tests that actually write to SQLite and read back
- **Server actions** — `createNote`, `updateNote`, `toggleSharing` are not tested
- **Authentication flows** — login, registration, session expiry
- **API routes** — no HTTP-level integration tests

These gaps are addressed in Phase 3 of the DevOps plan, where integration tests are added against a real database.

---

## Build Pipeline

```
Source files (.tsx, .ts)
        │
        ▼ TypeScript compiler
Plain JavaScript (type annotations stripped)
        │
        ▼ Next.js / Turbopack bundler
Optimised bundles:
  - Server bundle  (runs in Bun/Node)
  - Client bundle  (sent to browser, minified)
  - Static assets  (CSS, images, fonts)
        │
        ▼
dist/.next/   ← production output
```

**In development** (`bun dev`): No full build. Turbopack compiles files on demand as they're requested. Changes are reflected immediately without a restart.

**In production** (`bun run build` then `bun start`): A full optimised build is produced once. The server serves the pre-built output.

---

## Dependency Categories

Dependencies are split into two groups in `package.json`:

**`dependencies`** — code that runs in production (on the server or in the browser):

- `next`, `react`, `react-dom` — the framework
- `@tiptap/*` — the rich text editor
- `better-auth` — authentication
- `nanoid` — generates random IDs (for public note slugs)
- `zod` — runtime schema validation

**`devDependencies`** — tools used during development and testing only, not included in the production build:

- `typescript`, `eslint`, `oxfmt` — code quality tools
- `vitest`, `@testing-library/*`, `jsdom` — testing
- `tailwindcss`, `@tailwindcss/postcss` — CSS build tooling (outputs a `.css` file; the library itself is not needed at runtime)

---

## Glossary

| Term                 | Plain-English meaning                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Component**        | A function that accepts data and returns a description of what to display                                                          |
| **Props**            | The inputs passed to a component (like function arguments)                                                                         |
| **State**            | Data managed inside a component that, when changed, triggers a re-render                                                           |
| **Hook**             | A special React function (starts with `use`) that lets components opt into features like state or side effects                     |
| **Server component** | A component that runs on the server; can access the DB; produces HTML                                                              |
| **Client component** | A component that runs in the browser; can handle events and use browser APIs                                                       |
| **Server action**    | A server-side function callable from client code via an automatic HTTP request                                                     |
| **Route handler**    | A file that handles raw HTTP requests at a specific URL path                                                                       |
| **JSX**              | HTML-like syntax embedded in TypeScript files; compiled to function calls                                                          |
| **Hydration**        | The process of attaching JavaScript event handlers to server-rendered HTML after it arrives in the browser                         |
| **Bundle**           | A single JavaScript file produced by the build tool, containing multiple source files merged together                              |
| **Schema**           | A description of the expected shape and type of data, used for validation                                                          |
| **Middleware**       | Code that runs on every request before it reaches a route handler                                                                  |
| **ORM**              | Object-Relational Mapper — a library that wraps a database in an object model. This project does _not_ use one; it writes raw SQL. |
