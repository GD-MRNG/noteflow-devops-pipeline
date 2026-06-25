# Threat Model

## Assets

| Asset | Sensitivity | Where it lives |
|---|---|---|
| User credentials (email + password hash) | High | Neon PostgreSQL — `user` table |
| Note content | Medium | Neon PostgreSQL — `notes` table |
| Auth sessions | High | Neon PostgreSQL — `session` table; browser cookie |
| Database connection string (`DATABASE_URL`) | Critical | Doppler → Fly.io vault (never in code or git) |
| Fly.io deploy token (`FLY_API_TOKEN`) | High | Doppler → GitHub Actions environment |
| Doppler service tokens | High | GitHub Secrets only — not in code |
| OTEL/Grafana credentials | Medium | Doppler → Fly.io vault |

---

## Threats and Mitigations

### Cross-Site Scripting (XSS)

**Threat:** Attacker injects malicious script into a note; victim's browser executes it when the note is rendered.

**Mitigations:**
- `sanitizeContent()` in `lib/sanitize.ts` strips all HTML from note content before DB write (server action layer)
- `Content-Security-Policy` header restricts script execution origins — inline scripts from injected content are blocked by `frame-ancestors 'none'`
- TipTap renderer outputs structured JSON, not raw HTML; the React renderer escapes output by default

**Residual risk:** CSP uses `unsafe-inline` (required by Next.js App Router hydration). A nonce-based CSP would be stronger but requires Next.js 15+ configuration changes. Accepted for now; documented for future hardening.

---

### SQL Injection

**Threat:** Attacker crafts input that modifies the SQL query executed against PostgreSQL.

**Mitigations:**
- All queries use `$1`, `$2`, ... parameterized values — no string interpolation in SQL
- No ORM or query builder — the raw parameterized pattern is consistently applied across all query sites in `lib/db.ts` and server actions
- Input is sanitized before reaching the DB layer

**Residual risk:** None identified — parameterization is applied uniformly.

---

### Cross-Site Request Forgery (CSRF)

**Threat:** Attacker tricks an authenticated user into submitting a forged request.

**Mitigations:**
- better-auth validates the `Origin` header on all `/api/auth/*` requests (`BETTER_AUTH_URL` check — the root cause of the production auth incident in Phase 9)
- `form-action 'self'` in CSP restricts where forms can submit
- Server actions require a valid session token; unauthenticated requests are rejected at the action layer

---

### Session Hijacking / Fixation

**Threat:** Attacker obtains or fixes a valid session token.

**Mitigations:**
- Session tokens are managed by better-auth (httpOnly cookies — not accessible from JS)
- `Strict-Transport-Security` (HSTS, 1 year) enforces HTTPS, preventing token interception over plaintext HTTP
- Session rotation on login is handled by better-auth

---

### Supply Chain Attack

**Threat:** A malicious or compromised npm package or GitHub Action is introduced into the build.

**Mitigations:**
- Dependabot creates weekly PRs for npm and GitHub Actions updates — CVEs are surfaced automatically
- CodeQL SAST scans every PR for known vulnerability patterns in first-party code
- Trivy container image scan fails the build on fixable CRITICAL CVEs
- Trivy IaC scan checks Terraform configs for misconfigurations on every PR
- SBOM (SPDX JSON) is generated and retained per build — full inventory of dependencies in the shipped image
- `bun.lockb` pins exact versions; `--frozen-lockfile` in CI prevents silent upgrades

---

### Secrets Leakage

**Threat:** Secrets committed to git, logged, or exposed via an API endpoint.

**Mitigations:**
- All secrets live in Doppler; only two GitHub Secrets exist (`DOPPLER_TOKEN_STAGING`, `DOPPLER_TOKEN_PRODUCTION`)
- `.gitignore` excludes `.env`, `.env.local`, and `*.env`
- No secrets are written to application logs (pino structured logging — only app events)
- `/api/metrics` is excluded from the middleware matcher to avoid leaking headers, but serves no sensitive data
- Terraform outputs marked `sensitive = true` are masked in Terraform Cloud UI

---

### Clickjacking

**Threat:** Attacker embeds the app in an iframe to trick users into clicking UI elements.

**Mitigations:**
- `X-Frame-Options: DENY` — legacy browser protection
- `Content-Security-Policy: frame-ancestors 'none'` — modern equivalent; takes precedence where supported

---

### Denial of Service (DoS)

**Threat:** Attacker floods auth or note endpoints to exhaust resources.

**Mitigations:**
- Fly.io machine limits provide a natural ceiling on concurrent connections
- better-auth has built-in rate limiting on auth endpoints (email sign-in attempts)

**Known gap:** No application-level rate limiting on note CRUD endpoints. No WAF. Accepted for this portfolio scale — would add `@upstash/ratelimit` or a Fly.io Firewall rule for production hardening.

---

## Least-Privilege Inventory

| Credential | Scope | Where it's used |
|---|---|---|
| `GITHUB_TOKEN` | Read packages + write packages (this repo only) | GHCR push in `build-push.yml` |
| `DOPPLER_TOKEN_STAGING` | Read-only, `noteflow/staging` config | CI deploy + Terraform jobs |
| `DOPPLER_TOKEN_PRODUCTION` | Read-only, `noteflow/production` config | CI deploy job |
| `FLY_API_TOKEN` (in Doppler) | Deploy-only, personal org scope | flyctl deploy in CI |
| `TF_API_TOKEN` (in Doppler) | Workspace `noteflow-staging` CLI | Terraform plan/apply |

---

## Known Gaps and Accepted Risks

| Gap | Risk | Mitigation path |
|---|---|---|
| `unsafe-inline` in CSP | Reduces XSS protection | Migrate to nonce-based CSP (Next.js 15 `experimental.csp`) |
| Shared Neon DB for staging + production | Staging writes could affect production | Separate Neon branches per environment (Terraform module supports this) |
| No WAF | App-layer DoS, scraping | Add Cloudflare proxy or Fly.io Firewall rules |
| No auth rate limiting on note endpoints | Resource exhaustion | Add `@upstash/ratelimit` middleware per route |
| ZAP scan against live staging | Passive only — active scan would find more | Add ZAP full scan with authenticated session in a future pass |
