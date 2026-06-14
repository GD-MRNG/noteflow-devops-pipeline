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
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Provider credentials are injected as workspace variables in Terraform Cloud.
# FLY_API_TOKEN, NEON_API_KEY, DOPPLER_TOKEN, CLOUDFLARE_API_TOKEN
# are all sensitive workspace variables — never stored in this file or GitHub Secrets.

module "database" {
  source      = "./modules/database"
  app_name    = var.app_name
  environment = var.environment
  region      = var.neon_region
  pg_version  = var.neon_pg_version
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

module "dns" {
  source        = "./modules/dns"
  count         = var.enable_dns ? 1 : 0
  app_name      = var.app_name
  fly_hostname  = module.fly.app_hostname
  zone_id       = var.cloudflare_zone_id
  custom_domain = var.custom_domain
}
