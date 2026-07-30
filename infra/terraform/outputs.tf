output "gateway_url" {
  description = "Public base URL of the gateway — this is what apps/mobile/.env points at."
  value       = google_cloud_run_v2_service.gateway.uri
}

output "nutrition_api_url" {
  description = "Internal URL of the nutrition service. Not reachable from the internet."
  value       = google_cloud_run_v2_service.nutrition_api.uri
}

output "artifact_registry_repository" {
  description = "Docker repository to push the two service images to."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.foodsnap.repository_id}"
}
