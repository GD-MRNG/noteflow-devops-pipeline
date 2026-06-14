# Container Registry

Images are published to GitHub Container Registry (GHCR) on every merge to `main`.

## Image location

```
ghcr.io/gd-mrng/noteflow-devops-pipeline
```

## Pulling an image

```bash
# Latest build from main
docker pull ghcr.io/gd-mrng/noteflow-devops-pipeline:latest

# Specific commit (immutable)
docker pull ghcr.io/gd-mrng/noteflow-devops-pipeline:sha-abc1234
```

## Tagging strategy

| Tag | Example | Meaning |
|-----|---------|---------|
| `sha-<short-sha>` | `sha-3f8a21c` | Immutable reference to a specific commit. Used by the CD pipeline to deploy an exact version. |
| `latest` | `latest` | Points to the most recent successful build from `main`. Convenience alias — do not use in production deploys. |

## Security scanning

Every image is scanned with [Trivy](https://github.com/aquasecurity/trivy-action) after push. The workflow fails on CRITICAL severity CVEs that have a fix available (`ignore-unfixed: true`). Scan output is visible in the workflow logs under the "Trivy image scan" step.

## Retention policy

GHCR does not automatically delete old image versions. To avoid unbounded growth, periodically clean up old `sha-*` tags:

```bash
# List all versions
gh api /user/packages/container/noteflow-devops-pipeline/versions --paginate | jq '.[].metadata.container.tags'

# Delete a specific version by ID
gh api -X DELETE /user/packages/container/noteflow-devops-pipeline/versions/<version-id>
```

Alternatively, use the GitHub UI: repo → Packages → noteflow-devops-pipeline → manage versions.

A retention rule (keep last 10 versions) can be added via GitHub's package settings when the project moves to a paid plan.
