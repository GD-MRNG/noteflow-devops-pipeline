output "app_name" {
  description = "Fly.io app name"
  value       = fly_app.this.name
}

output "app_hostname" {
  description = "Default Fly.io hostname (app will be reachable here after fly deploy)"
  value       = "${fly_app.this.name}.fly.dev"
}
