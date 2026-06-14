output "app_name" {
  description = "Fly.io app name"
  value       = module.fly.app_name
}

output "app_hostname" {
  description = "Fly.io app hostname (available after Phase 6 deploy)"
  value       = module.fly.app_hostname
}

output "neon_project_id" {
  description = "Neon project ID (used to look up connection strings in the Neon console)"
  value       = module.database.project_id
}

output "neon_database_name" {
  description = "Neon database name"
  value       = module.database.database_name
}

output "doppler_project" {
  description = "Doppler project name"
  value       = module.secrets.project_name
}

output "doppler_environment" {
  description = "Doppler environment slug created by this workspace"
  value       = module.secrets.environment_slug
}
