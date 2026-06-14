# Cloudflare DNS — optional, disabled by default (enable_dns = false in root variables).
# Creates a CNAME record pointing your custom domain at the Fly.io app hostname.
# Proxy is disabled so TLS is handled by Fly.io's built-in cert manager, not Cloudflare.

resource "cloudflare_record" "app" {
  zone_id = var.zone_id
  name    = var.custom_domain
  value   = var.fly_hostname
  type    = "CNAME"
  proxied = false
  comment = "Managed by Terraform — ${var.app_name}"
}
