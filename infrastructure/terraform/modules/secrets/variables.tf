variable "app_name" {
  type = string
}

variable "environment" {
  description = "Environment slug to create in Doppler (staging or production)"
  type        = string
}

variable "create_doppler_project" {
  description = "Create the Doppler project resource. Set true for staging (first apply), false for production (project already exists)"
  type        = bool
  default     = true
}
