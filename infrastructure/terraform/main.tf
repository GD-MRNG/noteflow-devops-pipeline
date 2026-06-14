terraform {
  required_version = ">= 1.6"

  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.0.23"
    }
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.2"
    }
    doppler = {
      source  = "DopplerHQ/doppler"
      version = "~> 1.3"
    }
  }
}

# Provider credentials are injected as workspace variables in Terraform Cloud.
# FLY_API_TOKEN, NEON_API_KEY, DOPPLER_TOKEN are sensitive environment variables.
# Cloudflare (DNS) is wired in when enable_dns = true — add cloudflare provider then.

module "database" {
  source      = "./modules/database"
  app_name    = var.app_name
  environment = var.environment
  region      = var.neon_region
  pg_version  = var.neon_pg_version
  org_id      = var.neon_org_id
}

module "fly" {
  source      = "./modules/fly"
  app_name    = var.app_name
  environment = var.environment
  org         = var.fly_org
  region      = var.fly_region
}

module "secrets" {
  source                 = "./modules/secrets"
  app_name               = var.app_name
  environment            = var.environment
  create_doppler_project = var.create_doppler_project
}

# DNS module (Cloudflare) is not wired up until enable_dns = true.
# To activate: add cloudflare provider to required_providers, add CLOUDFLARE_API_TOKEN
# to TF Cloud env vars, then uncomment the block below.
#
# module "dns" {
#   source        = "./modules/dns"
#   count         = var.enable_dns ? 1 : 0
#   app_name      = var.app_name
#   fly_hostname  = module.fly.app_hostname
#   zone_id       = var.cloudflare_zone_id
#   custom_domain = var.custom_domain
# }
