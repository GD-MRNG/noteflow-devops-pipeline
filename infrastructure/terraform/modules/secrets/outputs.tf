output "project_name" {
  description = "Doppler project name"
  value       = local.project_name
}

output "environment_slug" {
  description = "Doppler environment slug created by this workspace"
  value       = doppler_environment.app.slug
}
