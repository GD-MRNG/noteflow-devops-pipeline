# noteflow-devops-pipeline

A note-taking app with a production-grade DevOps pipeline.

The app itself is intentionally simple — a rich-text note editor with authentication and public sharing. The engineering focus is everything around it: containerisation, CI/CD, infrastructure as code, Kubernetes, secrets management, observability, and security scanning. The app is the vehicle; the pipeline is the destination.

---

## What this project demonstrates

| Layer                  | Technology                                       | Purpose                                                                             |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Application            | Next.js 16, Bun, TypeScript, TipTap, better-auth | The thing being delivered                                                           |
| Containerisation       | Docker (multi-stage), Docker Compose             | Reproducible local dev; portable build artifact                                     |
| CI                     | GitHub Actions                                   | Lint → type-check → unit tests → integration tests → build on every PR              |
| Artifact registry      | GitHub Container Registry (GHCR)                 | Versioned images tagged by git SHA                                                  |
| Infrastructure as Code | Terraform                                        | All cloud resources declared, no manual clicking                                    |
| Deployment             | Fly.io + Helm chart                              | Live HTTPS app; Helm chart is the AWS EKS migration path                            |
| CD                     | GitHub Actions + GitHub Environments             | Auto-deploy to staging; manual approval gate for production                         |
| Secrets                | Doppler                                          | Runtime secret injection; zero secrets in code or manifests                         |
| Observability          | Grafana Cloud (Loki, Tempo, Prometheus)          | Structured pino logs → Loki; prom-client metrics → Alloy → Prometheus; OTel traces → Tempo |
| Security               | CodeQL, Trivy, Dependabot, OWASP ZAP, SBOM       | SAST + IaC scan + image scan + DAST + dependency updates + supply chain inventory   |
| Reliability            | Runbooks, SLOs, chaos tests                      | Documented failure playbooks; verified recovery behaviour                           |

**Total ongoing cloud cost: ~$0/month** (all free tiers). The `COST.md` file documents the AWS equivalent (~$170/month) and the exact config changes needed to migrate.

---

## Application features

- Email/password authentication (sign up, log in, log out)
- Create, edit, and delete rich-text notes (TipTap editor: bold, italic, headings, bullet lists, code blocks)
- Toggle public sharing — notes get a unique `/p/<slug>` URL readable by anyone without an account

---

## Run locally

**Prerequisites:** [Docker](https://www.docker.com) (includes PostgreSQL — no separate install needed)

**Option 1 — Docker Compose (recommended, matches production):**

```bash
git clone https://github.com/GD-MRNG/noteflow-devops-pipeline.git
cd noteflow-devops-pipeline
docker compose up
```

Open [http://localhost:3000](http://localhost:3000). The database schema is applied automatically on first boot.

**Option 2 — Bun dev server (requires a local PostgreSQL instance):**

```bash
bun install
cp .env.example .env.local   # fill in BETTER_AUTH_SECRET and DATABASE_URL
# Apply schema to your local postgres:
psql $DATABASE_URL -f scripts/migrate.sql
bun dev
```

---

## Project structure

```
app/                    Next.js App Router pages and API routes
components/             Shared React components
lib/                    Server-side logic: DB, auth, sanitization, validation
__tests__/              Unit and component tests (Vitest)
infrastructure/         Terraform modules (Fly.io, Neon, Doppler, Cloudflare)
kubernetes/helm/        Helm chart — deployable to any standard K8s cluster
.github/workflows/      CI and CD pipelines
docs/
  adr/                  Architecture Decision Records
  runbooks/             Operational playbooks
  nextjs-explainer.md   Codebase guide for those new to Next.js/JavaScript
```

---

## Commands

```bash
bun dev                  # Dev server at http://localhost:3000
bun run build            # Production build
bun run lint             # ESLint
bun run test:run         # Run all tests
bun run test:run --coverage   # With coverage report
```

---

## Pipeline status

[![CI](https://github.com/GD-MRNG/noteflow-devops-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/GD-MRNG/noteflow-devops-pipeline/actions/workflows/ci.yml)
[![Build & Push](https://github.com/GD-MRNG/noteflow-devops-pipeline/actions/workflows/build-push.yml/badge.svg)](https://github.com/GD-MRNG/noteflow-devops-pipeline/actions/workflows/build-push.yml)
[![Deploy](https://github.com/GD-MRNG/noteflow-devops-pipeline/actions/workflows/deploy.yml/badge.svg)](https://github.com/GD-MRNG/noteflow-devops-pipeline/actions/workflows/deploy.yml)
[![Terraform](https://github.com/GD-MRNG/noteflow-devops-pipeline/actions/workflows/terraform.yml/badge.svg)](https://github.com/GD-MRNG/noteflow-devops-pipeline/actions/workflows/terraform.yml)

**Live environments:**
- Staging: https://noteflow-staging.fly.dev
- Production: https://noteflow-production.fly.dev

---

## DevOps plan

The full 13-phase build plan lives in `devops_project_spec/DEVOPS_SPEC.md`. Each phase is a discrete, reviewable increment:

| Phase                                       | Status      |
| ------------------------------------------- | ----------- |
| 0 — Smoke test                              | ✅ Complete |
| 1 — Source control                          | ✅ Complete |
| 2 — Containerisation + PostgreSQL migration | ✅ Complete |
| 3 — CI pipeline                             | ✅ Complete |
| 4 — Artifact registry (GHCR)                | ✅ Complete |
| 5 — Infrastructure as Code (Terraform)      | ✅ Complete |
| 6 — Deployment (Fly.io + Helm)              | ✅ Complete |
| 7 — CD pipeline                             | ✅ Complete |
| 8 — Secrets management (Doppler)            | ✅ Complete |
| 9 — Observability (Grafana Cloud)           | ✅ Complete |
| 10 — Security pipeline                      | ✅ Complete |
| 11 — Reliability & runbooks                 | Pending     |
| 12 — AI summarisation feature               | Pending     |
| 13 — Portfolio documentation                | Pending     |

---

## Architecture decision records

Design decisions are documented in `docs/adr/` as they are made.

- [`001`](docs/adr/001-postgresql-vs-sqlite.md) — PostgreSQL vs SQLite
- [`002`](docs/adr/002-fly-vs-eks.md) — Fly.io vs EKS (and what changes to migrate)
- [`003`](docs/adr/003-terraform-vs-cdk.md) — Terraform vs CDK
- `004` — Trunk-based development vs GitFlow *(Phase 11)*
- `005` — Monolith vs microservices *(Phase 11)*
- `006` — AI feature adoption *(Phase 12)*

---

## Runbooks

Operational playbooks for common scenarios:

- [`emergency-shutdown.md`](docs/runbooks/emergency-shutdown.md) — Kill switch: take staging and/or production offline immediately (DDoS, abuse)
- [`rollback.md`](docs/runbooks/rollback.md) — Revert to a previous image after a bad deploy
- [`secret-rotation.md`](docs/runbooks/secret-rotation.md) — Rotate any secret via Doppler without downtime
