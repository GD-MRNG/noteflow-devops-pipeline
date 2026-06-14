# ADR 002: Fly.io over AWS EKS

**Status:** Accepted  
**Date:** 2026-06-14  
**Phase:** 5–6 (IaC + Deployment)

## Context

The pipeline needs a deployment target that supports Docker containers, health checks, rolling deploys, TLS, autoscaling, private networking, and infrastructure-as-code management — the same operational concerns that production Kubernetes clusters address.

## Decision

Deploy to Fly.io instead of AWS EKS.

## Reasoning

**Cost.** EKS has a $0.10/hour control plane charge (~$73/month) before adding EC2 node groups, NAT Gateway (~$32/month), and an Application Load Balancer (~$16/month). The floor for a minimal EKS cluster is approximately $150/month. Fly.io's hobby plan is free for the resources this project needs.

**Same operational concepts, different API surface:**

| Concept | EKS | Fly.io |
|---|---|---|
| Container runtime | Docker (containerd) | Docker |
| Health checks | Liveness/readiness probes | `[checks]` in fly.toml |
| Rolling deploys | Deployment rollout strategy | `fly deploy` default behaviour |
| Autoscaling | HorizontalPodAutoscaler | `min_machines_running` / `auto_start_machines` |
| TLS | cert-manager + Ingress | Built-in, automatic via Let's Encrypt |
| Private networking | VPC + Service ClusterIP | Fly.io private network (6PN) |
| IaC config | Helm values.yaml | fly.toml |
| Terraform | `hashicorp/aws` provider | `fly-apps/fly` community provider |

**The honest portfolio answer:**
> "I used Fly.io deliberately to demonstrate cost awareness. The same operational patterns (health checks, rolling deploys, autoscaling, IaC-managed config) apply to EKS. Spinning up a $150/month cluster for a portfolio project before landing the job is the wrong engineering call."

## Migration path to AWS EKS

The Helm chart in `kubernetes/helm/noteflow/` is written for any standard Kubernetes cluster. To deploy to EKS:

1. Replace `fly-apps/fly` provider with `hashicorp/aws` in `infrastructure/terraform/main.tf`
2. Add `aws_eks_cluster`, `aws_eks_node_group`, `aws_db_instance` resources
3. Point the container registry at ECR (`aws_ecr_repository`) instead of GHCR
4. Update `DATABASE_URL` in secrets to the RDS endpoint
5. Run `helm upgrade --install noteflow ./kubernetes/helm/noteflow -f values.production.yaml`

Application code, CI pipeline, Helm chart, and observability setup are unchanged.

## Note on Terraform support

Fly.io intentionally does not ship an official Terraform provider — their architecture (Machines API, fast cold starts) doesn't map cleanly to Terraform's resource model. The community provider `fly-apps/fly` is used here to register the app shell (app name reservation) and demonstrate the full Terraform plan/apply workflow. Actual deployment config is in `fly.toml` and applied via `flyctl`, which is Fly.io's recommended IaC approach.

## Consequences

- `fly.toml` is the declarative runtime config for Fly.io (equivalent to `values.yaml` in Helm)
- Helm chart in `kubernetes/helm/noteflow/` documents the EKS migration path and is kept current with the app
- Fly.io provides TLS automatically — no cert-manager setup needed
- Fly.io's free tier has no SLA; this is acceptable for a portfolio/staging workload
