variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "org" {
  description = "Fly.io organisation slug"
  type        = string
}

variable "region" {
  description = "Primary Fly.io region"
  type        = string
  default     = "lax"
}
