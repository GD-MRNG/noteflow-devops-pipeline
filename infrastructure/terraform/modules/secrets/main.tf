# Doppler project and environment structure.
# The project is shared across environments; each workspace creates its own environment slug.
#
# Apply order:
#   1. staging workspace (create_doppler_project = true)  → creates project + staging env
#   2. production workspace (create_doppler_project = false) → creates production env only
#
# Actual secret values (DATABASE_URL, BETTER_AUTH_SECRET, etc.) are populated manually
# in the Doppler dashboard after initial apply. Phase 8 adds runtime injection via
# the Doppler CLI and integrates it into the CD pipeline.

resource "doppler_project" "this" {
  count       = var.create_doppler_project ? 1 : 0
  name        = var.app_name
  description = "NoteFlow application secrets"
}

locals {
  project_name = var.create_doppler_project ? doppler_project.this[0].name : var.app_name
}

resource "doppler_environment" "app" {
  project = local.project_name
  slug    = var.environment
  name    = title(var.environment)
}
