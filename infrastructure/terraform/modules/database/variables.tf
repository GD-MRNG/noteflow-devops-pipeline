variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "region" {
  type    = string
  default = "aws-us-west-2"
}

variable "pg_version" {
  type    = number
  default = 16
}

variable "org_id" {
  description = "Neon organisation ID (Account Settings → Organisation in the Neon console)"
  type        = string
}
