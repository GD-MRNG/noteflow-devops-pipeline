# Cost breakdown

This project runs entirely on free tiers. This document records the current cost, the AWS equivalent, and the configuration changes needed to migrate.

---

## Current monthly cost: ~$0

| Service | Tier | Cost |
|---|---|---|
| [Fly.io](https://fly.io/docs/about/pricing/) | Free — 3 shared-CPU VMs, 256 MB RAM each | $0 |
| [Neon](https://neon.tech/pricing) | Free — 0.5 GB storage, 1 project | $0 |
| [Doppler](https://www.doppler.com/pricing) | Free — unlimited projects and configs | $0 |
| [GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions) | Free — 2,000 minutes/month on public repos | $0 |
| [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) | Free — unlimited on public repos | $0 |
| [Grafana Cloud](https://grafana.com/pricing/) | Free — 14-day retention, 10k metrics series, 50 GB logs | $0 |

**Total: $0/month**

---

## AWS equivalent: ~$170/month

This is the cost of running an equivalent stack on AWS using managed services. These are approximate us-east-1 on-demand prices; actual cost varies with traffic and data transfer.

| Service | AWS equivalent | Approximate monthly cost |
|---|---|---|
| Application hosting | EKS (1 × t3.small worker node) | $15 |
| Load balancer | ALB (1 LB + 1 LCU) | $20 |
| Database | RDS PostgreSQL db.t3.micro, 20 GB gp2 | $25 |
| Container registry | ECR — 1 GB storage + 5 GB data transfer | $2 |
| Secrets | AWS Secrets Manager — 5 secrets + API calls | $3 |
| Observability | CloudWatch Logs + Container Insights | $30 |
| Data transfer | ~10 GB/month outbound | $1 |
| CI/CD | GitHub Actions (unchanged) | $0 |
| DNS | Route 53 — 1 hosted zone + queries | $1 |
| **Subtotal** | | **~$97** |
| 30% overhead (inter-AZ traffic, snapshots, CloudTrail) | | ~$30 |
| Support plan (Developer, minimum) | | ~$43 |
| **Total** | | **~$170/month** |

---

## Migration delta — what changes to move from Fly.io to EKS

The Helm chart in `kubernetes/helm/noteflow/` is EKS-ready. The changes required are configuration, not code.

| Area | Current | Change needed |
|---|---|---|
| Container registry | GHCR | Add ECR push step to `build-push.yml`; update image reference in `values.yaml` |
| Deployment target | `flyctl deploy` in `deploy.yml` | Replace with `kubectl apply` or `helm upgrade --install` against EKS cluster |
| Secrets | Doppler → Fly.io vault sync | Install External Secrets Operator; configure `ExternalSecret` resources pointing at AWS Secrets Manager (stub in `kubernetes/helm/noteflow/templates/`) |
| Database | Neon (serverless Postgres) | Provision RDS instance via Terraform `database` module (swap provider from `neon` to `aws_db_instance`) |
| TLS | Fly.io managed | Install cert-manager; configure `Ingress` with `cert-manager.io/cluster-issuer` annotation |
| DNS | Manual | Enable `module "dns"` in `infrastructure/terraform/main.tf` (currently commented out pending Cloudflare config), or use Route 53 |
| Observability | Grafana Cloud (push) | No change required — Alloy pushes metrics/logs/traces to Grafana Cloud regardless of host |

Estimated migration effort: 1–2 days for a single-environment bring-up; the architectural decisions (ADR 002) document the full migration path.

---

## When Reserved Instances make sense

On-demand pricing (used above) is appropriate for low-traffic or variable workloads. Reserved Instances (1-year, no upfront) reduce EC2 and RDS costs by ~30–40%.

Break-even point: if the application runs continuously for more than ~6 months on the same instance type, a 1-year Reserved Instance pays for itself. For this project at current traffic levels, the free tier is the correct choice indefinitely. Reserved Instances become relevant when:

- Traffic is predictable enough that you won't resize within 12 months
- The monthly EC2 + RDS bill exceeds ~$50 (the administrative overhead of managing reservations is not worth it below that threshold)
- The environment is production (not staging — use on-demand for staging to preserve the ability to downsize or terminate freely)
