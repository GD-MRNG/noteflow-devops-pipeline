# Runbook: Secret Rotation

All secrets live in Doppler (project `noteflow`). GitHub Secrets holds only two values: `DOPPLER_TOKEN_STAGING` and `DOPPLER_TOKEN_PRODUCTION`. This runbook covers how to rotate each secret type.

---

## App secrets (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL)

1. Open [app.doppler.com](https://app.doppler.com) → project `noteflow` → target config (`staging` or `production`)
2. Update the secret value
3. Doppler → Fly.io sync fires automatically (check **Integrations** tab for sync status)
4. Redeploy the app to pick up the new value at runtime:
   ```bash
   # Get current image tag
   fly releases list --app noteflow-staging
   # Redeploy with same image — Fly pulls fresh secrets on restart
   fly deploy --config fly.toml --image ghcr.io/gd-mrng/noteflow-devops-pipeline:<sha-tag>
   ```
5. Verify health: `curl https://noteflow-staging.fly.dev/api/health`

---

## FLY_API_TOKEN

Used by CI to authenticate flyctl. Stored in Doppler (both `staging` and `production` configs). Not stored in GitHub Secrets.

1. Generate a new org-scoped token: `fly tokens create org -o personal`
2. Update `FLY_API_TOKEN` in Doppler `staging` config
3. Update `FLY_API_TOKEN` in Doppler `production` config
4. Revoke the old token in [fly.io/user/personal_access_tokens](https://fly.io/user/personal_access_tokens)
5. Verify: trigger a deploy workflow run and confirm it completes successfully

---

## TF_API_TOKEN

Used by CI to authenticate to Terraform Cloud. Stored in Doppler `staging` config (shared between plan and apply jobs).

1. Open [app.terraform.io](https://app.terraform.io) → User Settings → Tokens → Create an API token
2. Update `TF_API_TOKEN` in Doppler `staging` config
3. Revoke the old token in Terraform Cloud
4. Verify: open a PR touching `infrastructure/terraform/**` and confirm the plan step authenticates

---

## DOPPLER_TOKEN_STAGING / DOPPLER_TOKEN_PRODUCTION

These are the only two GitHub Secrets. They are Doppler service tokens scoped to their respective configs.

1. Open Doppler → project `noteflow` → **Access** tab → **Service Tokens**
2. Generate a new service token for the target config (`staging` or `production`)
3. Update the corresponding GitHub Secret (`DOPPLER_TOKEN_STAGING` or `DOPPLER_TOKEN_PRODUCTION`):
   - Repo → Settings → Secrets and variables → Actions → update the secret value
4. Revoke the old token in Doppler (Access tab → find the old token → Delete)
5. Verify: trigger a workflow that uses the rotated token and confirm it injects secrets correctly

---

## Doppler → Fly.io sync setup (reference)

If the sync integration needs to be reconfigured:

1. Doppler → project `noteflow` → config `staging` → **Integrations** → Add → **Fly.io**
   - Authenticate with `FLY_API_TOKEN`
   - Select app `noteflow-staging`
   - Select secrets to sync: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
2. Repeat for `production` config → app `noteflow-production`

Once configured, any secret change in Doppler automatically propagates to Fly.io's vault. A redeploy is still required for the running app to pick up the new values.
