---
name: pr-documentation
description: "Use this skill when writing or reviewing pull request documentation. Provides a proven structure for clearly communicating changes, problems faced, and solutions. Useful for technical PRs involving infrastructure, migrations, refactoring, or multi-system changes where context and rationale matter. Triggers: 'write a PR description', 'document this change', 'explain what changed in this PR', or when a PR involves coupled changes (like DB migration + containerization)."
---

# PR Documentation Structure

## Overview

A well-structured PR communicates three things:
1. **What changed and why** (the narrative)
2. **How it was implemented** (the mechanics)
3. **What went wrong and how we fixed it** (the learning)

This structure works best for PRs that bundle multiple coupled changes or significant architectural shifts.

---

## Template Structure

### 1. **What this PR does** (opening section)

- **Purpose:** Answer "Why should I care about this PR?" in 2-3 sentences
- **Include:** The high-level outcome and how it changes the system
- **If coupled changes:** Explicitly state why they're connected
- **Format:** Narrative prose, not bullets

**Example triggers:**
- "This PR packages the app into Docker and migrates SQLite → PostgreSQL"
- "These two changes are coupled — SQLite doesn't work in containers"
- "After this PR, the full stack starts with one command"

---

### 2. **Context/Rationale section** (optional but powerful)

- **Purpose:** Explain *why* you chose this approach
- **Structure:** Problem statement → why existing solution breaks → industry standard solution
- **Depth:** 2-3 paragraphs explaining decision logic
- **Audience:** Future maintainers, reviewers who might not know the domain

**Example triggers:**
- "Why PostgreSQL?" — explains ephemeral filesystems, concurrent access problems
- "Why Docker?" — explains deployment simplicity, reproducibility
- Keep it brief but complete

---

### 3. **Changes** section (the bulk)

**Subsections by layer/component:**

Each subsection should follow this pattern:

```
### Component name (e.g., "Database layer (`lib/db.ts`)")

**Before:** [code + brief description]

[code block]

**After:** [code + brief description]

[code block]

Key differences:
- Point 1
- Point 2

Files updated: [list of affected files]
```

#### Use comparison tables for API/interface changes

When the change is systematic (like SQLite → PostgreSQL):

```
| Concern | Before | After |
|---|---|---|
| Parameters | `?` | `$1`, `$2` |
| Single row | `.query().get(p)` | `await pool.query()` |
```

This pattern:
- Shows before/after side-by-side
- Highlights systematic changes
- Makes scanning easier

#### Schema/type changes get their own subsection

```
### Schema changes (`scripts/migrate.sql`)

[type conversion table or key changes]

Notes on naming conventions used.
```

---

### 4. **Problems faced and how we solved them**

- **Purpose:** Document unexpected blocking issues and workarounds
- **Format:** Each problem is a subsection with this structure:

```
### Problem N: [Brief title]

**What happened:** [Symptom, error message, what failed]

**Root cause:** [Why it happened — the actual technical reason]

**How we solved it:** [The fix or workaround]

**What we learned:** [Insight for future work, or note about the system]
```

**Key elements:**
- Include error messages verbatim (helps with searchability)
- Distinguish symptom from root cause (often different)
- Workarounds vs. proper fixes (note which you used)
- "What we learned" section turns problems into team knowledge

**Example triggers:**
- CLI failed on Windows → read source snapshots instead
- Database schema assumptions → trace back to adapter behavior
- Port conflicts → simple but worth documenting

---

### 5. **Verification** section

- **Purpose:** Show that it actually works
- **Format:** Shell commands + expected output

```bash
docker compose up
# App at http://localhost:3000

curl http://localhost:3000/api/health
# → {"status":"ok","db":"ok","timestamp":"..."}

# Test results
42 passed (42)
```

Include:
- Manual testing commands
- Automated test results
- Type-check / lint status
- Environment/setup notes if non-obvious

---

### 6. **What's next** (optional)

- **Purpose:** Signal direction and dependency for future work
- **Format:** Brief bullets or paragraph
- **Audience:** Planning/stakeholders, future developers
- **Example:** "Phase 3 — CI pipeline: GitHub Actions for lint → tests → integration tests"

---

## When to Use This Structure

✅ **Use this structure for:**
- Infrastructure changes (Docker, Kubernetes, databases)
- Major migrations (SQLite → PostgreSQL, REST → GraphQL, etc.)
- Coupled changes across multiple systems
- Changes affecting deployment or local dev setup
- Anything where "why" matters as much as "how"

❌ **Don't need full structure for:**
- Simple bug fixes (one-liner changes)
- Minor UI tweaks
- Small refactors in isolation

---

## Writing Tips

1. **Lead with narrative, not bullet points** — explain the story of why this PR exists
2. **Use code diffs, not descriptions** — "before/after" code blocks beat "we refactored X"
3. **Tables for systematic changes** — SQLite→Postgres, old API→new API, etc.
4. **Problem sections are gold** — error messages + root causes = searchable team knowledge
5. **Link to files, not line numbers** — line numbers change; file paths don't
6. **Verification is proof** — show it works, include test output

---

## Common Mistakes to Avoid

- ❌ Only listing files changed (no explanation of why)
- ❌ Burying the rationale in a wall of "Changes" text
- ❌ Omitting problems faced (makes future devs repeat mistakes)
- ❌ Using vague before/after ("refactored" instead of showing the code)
- ❌ Not explaining coupled changes (why does this PR do two things?)
- ❌ Verification section as an afterthought (it's proof the work is done)

---

## Example Sections

### Good "What this PR does"
```
This PR packages the Next.js app into a Docker container and migrates the database 
from SQLite to PostgreSQL. These two changes are coupled — SQLite is a single file 
that lives inside the container's ephemeral filesystem and gets destroyed on every 
restart. PostgreSQL is an external service with a persistent volume, which is the 
correct architecture for any containerised app.

After this PR, the full development stack can be started with a single command:
```bash
docker compose up
```
```

### Good "Why PostgreSQL?"
```
SQLite works fine for local development but breaks in containers for two reasons:

1. **Ephemeral filesystem** — a container's writable layer is destroyed when the 
   container stops. Any data written to the SQLite file is lost.
2. **No concurrent access** — SQLite uses file locking. Multiple container replicas 
   would contend on the same file, causing write failures.

PostgreSQL is the industry standard for containerised apps.
```

### Good Problem section
```
### Problem 2: better-auth's `pg` adapter uses camelCase column names, not snake_case

**What happened:** The Drizzle ORM snapshots showed column mappings like 
`emailVerified: boolean("email_verified")` — which we misread as the DB column 
being `email_verified`. At runtime, better-auth issued:

```sql
INSERT INTO "user" ("emailVerified", "createdAt", ...) VALUES (...)
```

PostgreSQL returned: `column "emailVerified" of relation "user" does not exist`.

**Root cause:** The Drizzle schema's `boolean("email_verified")` means "the JS field 
is `emailVerified` but map it to DB column `email_verified`". The `pg.Pool` adapter 
(used without Drizzle) skips that mapping and uses the JS field name directly.

**How we solved it:** Updated `migrate.sql` to use quoted camelCase identifiers for 
auth tables: `"emailVerified"`, `"createdAt"`, etc.

**What we learned:** better-auth has two modes for PostgreSQL:
- With Drizzle/Prisma ORM: the ORM handles the camelCase→snake_case mapping
- With `pg.Pool` directly: better-auth uses field names verbatim as DB columns
```

---

## Sections at a Glance

| Section | Purpose | Length | Audience |
|---------|---------|--------|----------|
| What this PR does | Hook + outcome | 2–3 sentences | Everyone |
| Why (rationale) | Decision logic | 2–3 paragraphs | Reviewers, future devs |
| Changes | Implementation details | Bulk (organized by component) | Code reviewers |
| Problems faced | Blocking issues + solutions | Varies (1+ subsections) | Future devs (searchable) |
| Verification | Proof it works | Shell commands + output | QA, reviewers |
| What's next | Direction signal | 1–2 bullets | Planning, stakeholders |