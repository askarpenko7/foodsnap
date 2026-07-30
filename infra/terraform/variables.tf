variable "project_id" {
  description = "GCP project to deploy into."
  type        = string
}

variable "region" {
  description = "Region for Artifact Registry and both Cloud Run services."
  type        = string
  default     = "europe-west1"
}

variable "image_tag" {
  description = "Image tag to deploy — the release tag CI pushed, e.g. \"0.1.0\"."
  type        = string
  default     = "latest"
}

variable "api_keys_secret_id" {
  description = <<-EOT
    Secret Manager secret holding the gateway's comma-separated API keys.
    Created out of band, on purpose: a secret's value has no business being in
    a state file. Create it with:
      gcloud secrets create foodsnap-api-keys --replication-policy=automatic
      printf 'key1,key2' | gcloud secrets versions add foodsnap-api-keys --data-file=-
  EOT
  type        = string
  default     = "foodsnap-api-keys"
}

variable "rate_limit_max" {
  description = "Gateway requests allowed per API key per minute."
  type        = number
  default     = 60
}

variable "match_threshold" {
  description = "Minimum fuzzy-match quality (0..1) before a lookup 404s."
  type        = number
  default     = 0.7

  validation {
    condition     = var.match_threshold > 0 && var.match_threshold <= 1
    error_message = "match_threshold must be between 0 and 1."
  }
}

variable "log_level" {
  description = "pino log level for both services."
  type        = string
  default     = "info"

  validation {
    condition     = contains(["debug", "info", "warn", "error"], var.log_level)
    error_message = "log_level must be one of debug, info, warn, error."
  }
}
