# Emergency Shutdown Runbook

Use this runbook to take the app offline immediately — for example, during a DDoS attack, abuse of the demo environment, or any situation requiring an instant kill switch.

**Both environments can be shut down independently.** Start with the affected environment; escalate to both if needed.

---

## Prerequisites

- `fly` CLI installed and authenticated (`fly auth whoami` should return your account)
- If `fly` is not installed: `curl -L https://fly.io/install.sh | sh`

---

## Step 1 — Identify the scope

| Symptom | Action |
|---|---|
| Abuse only on staging | Shut down staging only |
| Abuse only on production | Shut down production only |
| Both affected, or unsure | Shut down both |

---

## Step 2 — Scale machines to zero

This is the fastest, safest shutdown. All machines stop immediately. The app returns a Fly.io 503. No data is lost. Fully reversible.

**Staging:**
```bash
fly scale count 0 --app noteflow-staging
```

**Production:**
```bash
fly scale count 0 --app noteflow-production
```

**Verify shutdown:**
```bash
curl -o /dev/null -s -w "%{http_code}" https://noteflow-staging.fly.dev/api/health
# Expected: 503 or connection refused
curl -o /dev/null -s -w "%{http_code}" https://noteflow-production.fly.dev/api/health
# Expected: 503 or connection refused
```

---

## Step 3 (optional) — Suspend the app entirely

If scaling to zero isn't sufficient (e.g. Fly.io auto-restart is kicking in), suspend the app:

```bash
fly apps suspend noteflow-staging
fly apps suspend noteflow-production
```

Suspended apps do not restart automatically. This is harder to reverse than scaling — prefer Step 2 unless machines are restarting on their own.

---

## Step 4 (optional) — Block specific IPs via Fly.io firewall

If you want to stay online for legitimate users but block specific abusive IPs:

```bash
# Block a specific IP (replace with the attacker's IP)
fly ips add-restriction --app noteflow-production --ip 1.2.3.4/32
```

View current restrictions:
```bash
fly ips list --app noteflow-production
```

Remove a restriction:
```bash
fly ips remove-restriction --app noteflow-production --ip 1.2.3.4/32
```

---

## Recovery — Bring the app back online

**If you scaled to zero (Step 2):**
```bash
# Staging — minimum 0 machines (auto-sleeps when idle, free tier)
fly scale count 1 --app noteflow-staging

# Production — minimum 1 machine (always-on)
fly scale count 1 --app noteflow-production
```

Verify recovery:
```bash
curl https://noteflow-staging.fly.dev/api/health
curl https://noteflow-production.fly.dev/api/health
# Expected: {"status":"ok","db":"ok","timestamp":"..."}
```

**If you suspended the app (Step 3):**
```bash
fly apps resume noteflow-staging
fly apps resume noteflow-production
```

Then scale back up as above.

---

## CD pipeline behaviour during shutdown

The CD pipeline (GitHub Actions) will still attempt deploys if a merge to `main` happens while the app is scaled to zero. This is safe — `fly deploy` will succeed and machines will come back up to the count specified in `fly.toml` (`min_machines_running`). If you want to stay shut down, re-run the scale command after the deploy completes.

---

## Logs — diagnosing the incident

```bash
fly logs --app noteflow-staging
fly logs --app noteflow-production
```

For historical logs and request patterns, check Grafana Cloud (Loki):
- Logs dashboard: Grafana Cloud → Explore → Loki → `{app="noteflow"}`

---

## Escalation

If Fly.io itself is the attack vector (e.g. the platform is being used to amplify), contact Fly.io support at https://fly.io/support.
