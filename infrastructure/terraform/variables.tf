variable "environment" {
  description = "staging"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Must be 'staging' or 'production'."
  }
}

variable "app_name" {
  description = "Base application name used for all resource naming"
  type        = string
  default     = "noteflow"
}

variable "fly_org" {
  description = "personal"
  type        = string
}

variable "fly_region" {
  description = "Primary Fly.io region"
  type        = string
  default     = "lax"
}

variable "neon_region" {
  description = "Neon database region (see: https://neon.tech/docs/introduction/regions)"
  type        = string
  default     = "aws-us-west-2"
}

variable "neon_pg_version" {
  description = "PostgreSQL major version to use for the Neon project"
  type        = number
  default     = 16
}

variable "neon_org_id" {
  description = "Neon organisation ID — find it at console.neon.tech → Account Settings → Organisation"
  type        = string
}

variable "create_doppler_project" {
  description = "Create the Doppler project (true for staging workspace; set false in production workspace once staging has applied)"
  type        = bool
  default     = true
}

variable "enable_dns" {
  description = "Create Cloudflare DNS records for a custom domain"
  type        = bool
  default     = false
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID (required when enable_dns = true)"
  type        = string
  default     = ""
}

variable "custom_domain" {
  description = "Custom domain hostname (e.g. noteflow.example.com)"
  type        = string
  default     = ""
}
