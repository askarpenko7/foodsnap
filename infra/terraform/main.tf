/**
 * FoodSnap on Cloud Run — the same shape as the compose stack: one public
 * service (the gateway) and one that only the gateway can reach.
 *
 * This is written to be read and to `terraform validate`. Applying it is
 * optional and deliberately not part of any workflow (PROJECT_BRIEF.md §8):
 * it would cost money and needs a billing-enabled GCP project.
 */

terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Somewhere to push the two images CI builds.
resource "google_artifact_registry_repository" "foodsnap" {
  location      = var.region
  repository_id = "foodsnap"
  description   = "Container images for the FoodSnap services"
  format        = "DOCKER"
}

# A dedicated identity per service, so the gateway's permission to call the
# nutrition API is grantable to exactly one caller rather than to allUsers.
resource "google_service_account" "gateway" {
  account_id   = "foodsnap-gateway"
  display_name = "FoodSnap gateway"
}

resource "google_service_account" "nutrition_api" {
  account_id   = "foodsnap-nutrition-api"
  display_name = "FoodSnap nutrition API"
}

# The internal service. `ingress = INTERNAL` means it is unreachable from the
# public internet; only traffic from inside the VPC or from other Cloud Run
# services in the project can arrive.
resource "google_cloud_run_v2_service" "nutrition_api" {
  name     = "foodsnap-nutrition-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  deletion_protection = false

  template {
    service_account = google_service_account.nutrition_api.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.foodsnap.repository_id}/nutrition-api:${var.image_tag}"

      ports {
        container_port = 3001
      }

      env {
        name  = "MATCH_THRESHOLD"
        value = tostring(var.match_threshold)
      }

      env {
        name  = "LOG_LEVEL"
        value = var.log_level
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 3001
        }
        initial_delay_seconds = 3
        period_seconds        = 5
        failure_threshold     = 5
      }
    }

    # The food database is in the image and lookups are CPU-cheap, so a small
    # ceiling is plenty and keeps a runaway client from scaling up a bill.
    scaling {
      min_instance_count = 0
      max_instance_count = 4
    }
  }
}

# Only the gateway's identity may invoke the nutrition API.
resource "google_cloud_run_v2_service_iam_member" "nutrition_api_invoker" {
  project  = google_cloud_run_v2_service.nutrition_api.project
  location = google_cloud_run_v2_service.nutrition_api.location
  name     = google_cloud_run_v2_service.nutrition_api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.gateway.email}"
}

# The public service. API keys come from Secret Manager rather than a plain env
# var, so rotating them does not mean editing this file.
resource "google_cloud_run_v2_service" "gateway" {
  name     = "foodsnap-gateway"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  deletion_protection = false

  template {
    service_account = google_service_account.gateway.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.foodsnap.repository_id}/gateway:${var.image_tag}"

      ports {
        container_port = 8080
      }

      env {
        name  = "NUTRITION_API_URL"
        value = google_cloud_run_v2_service.nutrition_api.uri
      }

      env {
        name  = "RATE_LIMIT_MAX"
        value = tostring(var.rate_limit_max)
      }

      env {
        name  = "LOG_LEVEL"
        value = var.log_level
      }

      env {
        name = "API_KEYS"

        value_source {
          secret_key_ref {
            secret  = var.api_keys_secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 3
        period_seconds        = 5
        failure_threshold     = 5
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 8
    }
  }
}

# The gateway is the public door: anyone may reach it, and the api-key check in
# the service itself is what actually gates access.
resource "google_cloud_run_v2_service_iam_member" "gateway_public" {
  project  = google_cloud_run_v2_service.gateway.project
  location = google_cloud_run_v2_service.gateway.location
  name     = google_cloud_run_v2_service.gateway.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
