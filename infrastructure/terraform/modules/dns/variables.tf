variable "app_name" {
  type = string
}

variable "fly_hostname" {
  description = "Fly.io app hostname to point the DNS record at"
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID"
  type        = string
}

variable "custom_domain" {
  description = "Custom subdomain to create (e.g. noteflow.example.com)"
  type        = string
}
