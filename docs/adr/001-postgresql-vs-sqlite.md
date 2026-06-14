# ADR 001: PostgreSQL over SQLite

**Status:** Accepted  
**Date:** 2026-06-14  
**Phase:** 2 (Containerisation)

## Context

The application was originally built with Bun's built-in SQLite driver and a local `data/app.db` file. When containerising the app, a decision was needed on the database.

## Decision

Migrate from SQLite to PostgreSQL (Neon managed service in production).

## Reasoning

**SQLite is incompatible with containerised deployments:**

1. **Ephemeral filesystem.** The SQLite file lives inside the container's writable layer, which is destroyed on every container restart or redeploy. All data is lost unless a persistent volume is mounted.

2. **Single-writer limitation.** SQLite allows only one writer at a time. Horizontal scaling (multiple container replicas) is impossible without write contention and corruption risk.

3. **No connection pooling.** Cloud-native apps share DB connections via a pool; SQLite's file-based access model has no equivalent.

**PostgreSQL resolves all three:**
- Data persists in a managed service independent of the container lifecycle
- Supports many concurrent readers and writers
- `pg.Pool` provides connection pooling out of the box

**Why Neon specifically:**
- Managed PostgreSQL — no infra to operate (handles backups, HA, patching)
- Free tier: 0.5 GB storage, 1 compute unit (sufficient for this project)
- Branching: each Neon project gets a default branch; additional branches can be used for preview environments
- AWS equivalent: RDS PostgreSQL (same concepts, ~$30/month for db.t3.micro)

## Consequences

- All queries migrated from SQLite syntax (`?` params, `INTEGER` booleans) to PostgreSQL (`$1/$2` params, `BOOLEAN`, `TIMESTAMPTZ`)
- Schema lives in `scripts/migrate.sql`, applied once before first boot
- better-auth uses raw `pg.Pool`; its tables require camelCase column names (no ORM mapping)
- `lib/db.ts` exports a `pg.Pool` singleton connected via `DATABASE_URL`
