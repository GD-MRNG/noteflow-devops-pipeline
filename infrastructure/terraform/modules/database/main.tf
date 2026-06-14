terraform {
  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.2"
    }
  }
}

# Neon serverless PostgreSQL — one project per environment.
# Each project gets its own compute, storage, and connection string.
# Staging and production are completely isolated at the project level.

resource "neon_project" "this" {
  name       = "${var.app_name}-${var.environment}"
  region_id  = var.region
  pg_version = var.pg_version
}

resource "neon_role" "app" {
  project_id = neon_project.this.id
  branch_id  = neon_project.this.default_branch_id
  name       = "${var.app_name}_user"
}

resource "neon_database" "app" {
  project_id = neon_project.this.id
  branch_id  = neon_project.this.default_branch_id
  name       = "${var.app_name}_${var.environment}"
  owner_name = neon_role.app.name
}
