terraform {
  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.0.23"
    }
  }
}

# Fly.io app shell — registers the app and reserves the name.
# No machines are created here; fly deploy (Phase 6) provisions machines from fly.toml.
#
# Note: Fly.io does not officially support Terraform. This uses the community provider
# fly-apps/fly to register the app resource. The actual deployment config lives in
# fly.toml (committed to the repo) and is applied via flyctl in the CD pipeline.
# See docs/adr/002-fly-vs-eks.md for the full rationale.

resource "fly_app" "this" {
  name = "${var.app_name}-${var.environment}"
  org  = var.org
}
