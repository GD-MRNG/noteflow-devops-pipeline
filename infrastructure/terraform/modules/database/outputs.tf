output "project_id" {
  description = "Neon project ID"
  value       = neon_project.this.id
}

output "default_branch_id" {
  description = "Neon default branch ID"
  value       = neon_project.this.default_branch_id
}

output "database_name" {
  description = "Database name"
  value       = neon_database.app.name
}

output "connection_string" {
  description = "Full PostgreSQL connection URI (copy to Doppler as DATABASE_URL in Phase 8)"
  value       = neon_project.this.connection_uri
  sensitive   = true
}
