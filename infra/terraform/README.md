# FoodSnap on Cloud Run

The compose stack's shape, expressed for GCP: an Artifact Registry repository and two Cloud Run services — the gateway public, the nutrition API reachable only from inside the project.

**This is written to be read and validated, not necessarily applied.** Applying it costs money and needs a billing-enabled project, so nothing in CI runs it. What is guaranteed is that it is valid:

```bash
terraform init -backend=false && terraform validate
```

## What it creates

| Resource | Why |
|---|---|
| `google_artifact_registry_repository.foodsnap` | Somewhere for CI to push the two service images |
| `google_cloud_run_v2_service.nutrition_api` | `INGRESS_TRAFFIC_INTERNAL_ONLY` — unreachable from the internet |
| `google_cloud_run_v2_service.gateway` | Public, and the only way in |
| Two service accounts | So "the gateway may call the nutrition API" is grantable to exactly one identity |
| Two IAM members | `allUsers` may invoke the gateway; only the gateway's identity may invoke the nutrition API |

That last row is the whole point. In compose, the internal service is protected by not publishing a port. Here the equivalent is internal ingress plus a `run.invoker` binding scoped to one service account — the gateway's api-key check is the second layer, not the only one.

## Before applying

The gateway's API keys come from Secret Manager, not a variable, because a secret's value has no business sitting in a state file. Create it out of band:

```bash
gcloud secrets create foodsnap-api-keys --replication-policy=automatic
```

```bash
printf 'key1,key2' | gcloud secrets versions add foodsnap-api-keys --data-file=-
```

Then grant the gateway's service account `roles/secretmanager.secretAccessor` on it — deliberately not in this config, since the binding depends on a secret this config does not own.

## Variables

Only `project_id` is required. The rest default to something sensible: `region` is `europe-west1`, `image_tag` is `latest`, and the tuning knobs (`rate_limit_max`, `match_threshold`, `log_level`) mirror the values the services use locally.

```bash
terraform apply -var project_id=my-project -var image_tag=0.1.0
```

Outputs give you the gateway URL to put in `apps/mobile/.env` and the registry path to push images to.

## What is missing for production

Honest list, since this is a demonstration: no custom domain or TLS beyond Cloud Run's default, no Cloud Armor in front of the gateway, no remote state backend (add a GCS bucket before more than one person runs this), no budget alerts, and no CI wiring to build and push images — that job stops at the GitHub Release today.
