# Rollback Runbook

Use this runbook to revert a bad deploy on staging or production.

---

## 1. Identify the previous good image

List recent Fly.io releases to find the image that was running before the bad deploy:

```bash
fly releases list --app noteflow-staging
```

Output example:
```
VERSION  STATUS   DESCRIPTION              USER          DATE
v4       failed   Deploy image             ...           2026-06-15T10:05:00Z
v3       success  Deploy image             ...           2026-06-15T09:50:00Z  ← roll back to this
v2       success  Deploy image             ...           2026-06-14T18:00:00Z
```

Find the `sha-<short-sha>` image tag for the target version. You can also look at the GitHub Actions "Deploy" workflow run for the corresponding commit to see which tag was deployed.

---

## 2. Roll back staging

```bash
fly deploy \
  --config fly.toml \
  --image ghcr.io/gd-mrng/noteflow-devops-pipeline:sha-<previous-sha>
```

Verify recovery:

```bash
curl https://noteflow-staging.fly.dev/api/health
# Expected: {"status":"ok","db":"ok","timestamp":"..."}
```

---

## 3. Roll back production

```bash
fly deploy \
  --config fly.production.toml \
  --image ghcr.io/gd-mrng/noteflow-devops-pipeline:sha-<previous-sha>
```

Verify:

```bash
curl https://noteflow-production.fly.dev/api/health
```

---

## 4. After rollback

- Open a GitHub issue or PR describing the root cause.
- The bad commit should be reverted on `main` (not just bypassed) so the next automated deploy does not re-introduce it.
- Revert pattern: `git revert <bad-sha>` → open PR → merge → automated deploy will pick up the revert.

---

## Finding image tags

All published image tags are visible in the GitHub Container Registry:
- `https://github.com/GD-MRNG/noteflow-devops-pipeline/pkgs/container/noteflow-devops-pipeline`

Each `sha-<short-sha>` tag maps directly to a commit on `main`.
