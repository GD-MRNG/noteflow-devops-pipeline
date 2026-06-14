output "record_hostname" {
  description = "The full custom domain hostname"
  value       = cloudflare_record.app.hostname
}
