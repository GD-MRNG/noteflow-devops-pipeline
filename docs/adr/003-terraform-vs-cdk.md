# ADR 003: Terraform over AWS CDK / Pulumi

**Status:** Accepted  
**Date:** 2026-06-14  
**Phase:** 5 (IaC)

## Context

Several IaC tools are widely used in the industry. The project needed one to define Neon, Fly.io, Doppler, and optionally Cloudflare resources declaratively.

## Decision

Use Terraform (OpenTofu-compatible HCL).

## Options considered

| Tool | Language | Provider support | Notes |
|---|---|---|---|
| **Terraform** | HCL | All major cloud + SaaS providers | Industry standard; provider-agnostic |
| **AWS CDK** | TypeScript/Python | AWS only | Requires AWS account; poor support for non-AWS providers |
| **Pulumi** | TypeScript/Python/Go | Good multi-cloud | Smaller community; paid tiers for advanced state management |
| **Ansible** | YAML | Procedural, not declarative | Better for config management than resource provisioning |

## Reasoning

**Provider-agnostic.** Terraform supports Fly.io (`fly-apps/fly`), Neon (`kislerdm/neon`), Doppler (`DopplerHQ/doppler`), and Cloudflare (`cloudflare/cloudflare`) via the community registry. AWS CDK only targets AWS services natively.

**The workflow is what matters for the portfolio.** Plan/apply, remote state, state locking, and PR diff comments are the transferable skills. These concepts are identical whether the provider block targets Fly.io or AWS. Replacing `fly-apps/fly` with `hashicorp/aws` and updating resource types is the only change needed to target EKS + RDS.

**Remote state without AWS.** Terraform Cloud free tier provides remote state storage, state locking, and run history — the same concepts as S3 + DynamoDB backend, at $0.

**HCL readability.** HCL's declarative style maps directly to "here is the desired state of my infrastructure." General-purpose languages (CDK, Pulumi) introduce imperative patterns and dependency management that add complexity without benefit at this project scale.

## AWS migration

To migrate the Terraform configuration to AWS:

```hcl
# Replace in main.tf:
required_providers {
  aws = {
    source  = "hashicorp/aws"
    version = "~> 5.0"
  }
}

# Replace module resources:
# neon_project → aws_db_instance (RDS PostgreSQL)
# fly_app      → aws_eks_cluster + aws_eks_node_group + aws_lb
# doppler_*    → aws_secretsmanager_secret (or keep Doppler — it works with AWS too)
```

The `backend.tf` S3 configuration:
```hcl
backend "s3" {
  bucket         = "noteflow-tfstate"
  key            = "staging/terraform.tfstate"
  region         = "us-west-2"
  dynamodb_table = "noteflow-tfstate-lock"
}
```

Everything else — module structure, variable files, output structure, CI workflow, ADRs — is unchanged.

## Consequences

- HCL requires learning the Terraform-specific syntax; not reusable as application code
- State is stored in Terraform Cloud (remote, locked, versioned)
- `terraform plan` output is posted as a PR comment on every infrastructure change — reviewable before apply
- OpenTofu is a drop-in open-source alternative if HashiCorp licensing is a concern
