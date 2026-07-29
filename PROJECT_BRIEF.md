# FoodSnap — Project Brief

> **How to use this file:** Drop it in the repo root (as `PROJECT_BRIEF.md`, and optionally copy it to `CLAUDE.md` / `AGENTS.md`). It is the single source of truth for any AI coding agent working on this project. Agent: read this entire file before writing any code, then implement phase by phase. Do not skip the Definition of Done checklists.

---

## 1. What this is and why it exists

**FoodSnap** is a React Native monorepo: point your camera at food, get on-device classification via native modules (Kotlin on Android, Swift on iOS), then fetch nutrition facts from a small Node/TypeScript backend exposed through an API gateway.

It is a **portfolio project built by Alexander Karpenko** (senior mobile engineer, github.com/askarpenko7) to demonstrate a specific production architecture: a TypeScript React Native app backed by native Kotlin and Swift modules, a gateway-fronted backend, containerized services, and CI that distributes signed Android builds **outside official app stores**.

Honesty rule for all generated docs and the README: this is a recent, deliberately-scoped demonstration project. Never present it as a long-running product or imply years of history.

### Architecture keywords this project must genuinely demonstrate
| Capability | Where it lives |
|---|---|
| Monorepo across native mobile code | Yarn workspaces: `apps/`, `packages/`, `services/` |
| React Native + TypeScript | `apps/mobile` (New Architecture) |
| Kotlin native module | `packages/food-classifier` (ML Kit, TurboModule) |
| Swift native module | `packages/food-classifier` (Vision framework, TurboModule) |
| Backend behind an API gateway | `services/gateway` → `services/nutrition-api` |
| Node.js / TypeScript backend | Both services, Fastify |
| Docker | Per-service Dockerfiles + `docker-compose.yml` |
| Out-of-store distribution | GitHub Actions builds a **signed APK → GitHub Releases** |
| CI/CD | Lint + typecheck + tests on every push; release on tag |
| Terraform / GCP (stretch) | `infra/terraform` → Cloud Run |

---

## 2. Repository layout

Repo name: `foodsnap` (public, MIT license). Package manager: **Yarn (Berry) with `nodeLinker: node-modules`** — React Native tooling assumes a physical `node_modules`; do not use PnP or pnpm.

```
foodsnap/
├── apps/
│   └── mobile/                       # React Native app (TypeScript, New Architecture)
│       ├── android/
│       ├── ios/
│       └── src/
│           ├── screens/              # CaptureScreen, ResultsScreen, HistoryScreen
│           ├── api/                  # typed client for the gateway
│           ├── hooks/
│           └── theme/
├── packages/
│   ├── food-classifier/              # TurboModule library (Kotlin + Swift + TS spec)
│   └── shared/                       # shared TS types: API contracts used by app + services
├── services/
│   ├── gateway/                      # Fastify API gateway
│   └── nutrition-api/                # Fastify nutrition lookup service
├── infra/
│   ├── docker-compose.yml
│   └── terraform/                    # Phase 3, optional
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release-android.yml
├── package.json                      # workspaces root
├── tsconfig.base.json                # strict; extended by every workspace
├── LICENSE                           # MIT
├── PROJECT_BRIEF.md                  # this file
└── README.md
```

TypeScript is `strict: true` in every workspace. ESLint + Prettier at the root, shared config.

**Version policy for the agent:** use the latest *stable* versions of React Native, ML Kit, Fastify, and all tooling — verify current versions rather than assuming from training data. New Architecture (TurboModules/Fabric) must be ON; it is the default in current RN releases.

---

## 3. The native module: `packages/food-classifier`

Scaffold with `create-react-native-library` (Kotlin + Swift, TurboModule/"new architecture" template), consumed by `apps/mobile` as a workspace dependency.

### TypeScript spec (codegen)
```ts
export interface Classification {
  label: string;        // e.g. "pizza"
  confidence: number;   // 0..1
}

export interface Spec extends TurboModule {
  classifyImage(uri: string): Promise<Classification[]>;
  isAvailable(): Promise<boolean>;   // model/framework ready on this device
}
```
Return the **top 5** results, sorted by confidence descending, confidence < 0.1 filtered out. Reject the promise with coded errors: `E_FILE_NOT_FOUND`, `E_CLASSIFICATION_FAILED`.

### Android implementation (Kotlin)
- **ML Kit Image Labeling, on-device, default model** (`com.google.mlkit:image-labeling`). No API key, no network.
- `InputImage.fromFilePath(context, uri)` → labeler → map labels to `Classification`.
- Run off the UI thread; resolve/reject on the correct thread per TurboModule conventions.

### iOS implementation (Swift) — Phase 3
- **Vision framework, `VNClassifyImageRequest`** (built-in classifier, no model download, no key).
- Load image from the file URI, run the request on a background queue, map `VNClassificationObservation` to `Classification`.

Note in code comments (interview material): ML Kit's generic labeler and Vision's classifier both return non-food labels too; the app filters/ranks — a deliberate MVP tradeoff vs. bundling a food-specific CoreML/TFLite model, which is listed in the roadmap.

---

## 4. The mobile app: `apps/mobile`

Bare React Native (not Expo), TypeScript, New Architecture enabled, Hermes on.

### Screens (keep UI clean but simple — no design system needed)
1. **CaptureScreen** — big "Snap food" button → `react-native-image-picker` (camera) + a secondary "Pick from gallery" action. On image selected → navigate to Results with the file URI. Handle camera permission denial gracefully.
2. **ResultsScreen** — shows the photo thumbnail; calls `FoodClassifier.classifyImage(uri)`; renders the label list with confidence bars. Tapping a label calls the gateway `GET /api/v1/nutrition/:food` and expands an inline card: calories, protein, carbs, fat per 100 g. Loading + error states required (including "backend unreachable" — the app must still show classifications offline).
3. **HistoryScreen** (Phase 3) — last 20 scans persisted locally (`react-native-mmkv`): thumbnail, top label, timestamp.

Navigation: `@react-navigation/native-stack`. API client: small typed `fetch` wrapper importing request/response types from `packages/shared`; gateway base URL and API key from a `.env` (react-native-config), with `.env.example` committed.

---

## 5. Backend: `services/nutrition-api` and `services/gateway`

Both: Node 20+, Fastify, TypeScript, pino logging, built with `tsup` or `tsc`.

### `nutrition-api` (internal service, never exposed publicly)
- `GET /nutrition/:food` → fuzzy-matches `:food` against a bundled `data/foods.json` the agent generates: **~120 common foods** with `{ name, aliases[], per100g: { kcal, protein, carbs, fat } }`. Use a small fuzzy matcher (normalized Levenshtein or `fuse.js`) so ML labels like "hot dog" or "granny smith" resolve sensibly.
- `404` with a typed error body when no match ≥ threshold. `GET /health` for Docker/Cloud Run probes.

### `gateway` (the only public entry point)
This must be a real gateway, not a passthrough:
- Routes `/api/v1/nutrition/*` → `nutrition-api` (upstream URL from env).
- **Auth:** requires `x-api-key` header, checked against env (`401` otherwise).
- **Rate limiting:** `@fastify/rate-limit`, e.g. 60 req/min per key.
- Request logging with request IDs, CORS, upstream timeout + `502` mapping, `GET /health`.
- Structured so a second upstream service could be added by config — mention this in its README section.

Shared request/response types live in `packages/shared` and are imported by the app and both services — no duplicated contracts.

---

## 6. Docker

- Multi-stage `Dockerfile` per service (`node:20-alpine`, non-root user, prod deps only).
- `infra/docker-compose.yml`: `gateway` on `:8080` (public), `nutrition-api` internal-only on the compose network, env wired between them. `docker compose up` + the documented API key must be all that's needed to serve the app locally.

---

## 7. CI/CD (GitHub Actions)

### `ci.yml` — on every push/PR
Install (with Yarn cache) → typecheck all workspaces → lint → **Jest** unit tests (app logic with the native module mocked; fuzzy matcher; gateway auth/rate-limit/proxy via `fastify.inject`/supertest). No emulator/simulator jobs.

### `release-android.yml` — on tag `v*` (this is the out-of-store distribution story)
1. JDK 17 + Android SDK setup.
2. Decode signing keystore from secret `ANDROID_KEYSTORE_BASE64`; signing config reads `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` from env — **never commit the keystore or passwords**.
3. `./gradlew assembleRelease` → signed APK.
4. Create a GitHub Release for the tag and attach `foodsnap-<version>.apk`.

Document in the README how to generate the keystore (`keytool`), set the four repo secrets, and sideload the APK — explicitly framed as *distributing a signed native app outside official stores*.

---

## 8. Terraform / GCP — Phase 3, optional

`infra/terraform`: Artifact Registry + two Cloud Run services (gateway public, nutrition-api internal ingress), env vars wired, minimal variables + README. It must `terraform validate`; actually applying it is optional and must not block anything else.

---

## 9. README.md requirements

Sections, in order: project name + one-liner + demo GIF placeholder; **"Why this exists"** (2–3 honest sentences: built in 2026 to mirror a production RN + native modules architecture — TurboModules in Kotlin/Swift, gateway-fronted TypeScript services, containerized, with out-of-store distribution); architecture **Mermaid diagram** (app → TurboModule → ML Kit/Vision, app → gateway → nutrition-api); monorepo tour; native modules explained (TurboModules, codegen, threading — written to teach); running locally (app + `docker compose up`); CI/CD and **installing the released APK**; roadmap (food-specific CoreML/TFLite model, vision-camera live frames, History sync, iOS TestFlight lane).

Code comments and README should read like a strong engineer explaining decisions — tradeoffs stated, no marketing fluff, no fake history.

---

## 10. Build phases and Definition of Done

### Phase 1 — one evening: *"it classifies on Android"*
Scaffold monorepo + workspaces; RN app with Capture/Results screens; `food-classifier` TurboModule with the **Kotlin/ML Kit** implementation; app runs on an Android device/emulator and shows real classifications; root lint/typecheck pass; first-draft README.
**DoD:** fresh clone → `yarn install` → documented run command → snap a photo → see labeled results on Android. No backend yet (nutrition card shows a "backend offline" state).

### Phase 2 — one evening: *"gateway, Docker, CI, released APK"*
Both services + shared types; Docker Compose; app wired to gateway (API key, loading/error states); `ci.yml` green; `release-android.yml` producing a signed APK on tag; backend + matcher + app-logic tests written and passing.
**DoD:** `docker compose up` + app → tapping a label shows nutrition; invalid API key → 401; pushing tag `v0.1.0` → GitHub Release with installable APK; CI green.

### Phase 3 — optional polish: *"iOS parity + infra + shine"*
Swift/Vision implementation (iOS simulator OK); HistoryScreen + MMKV; Terraform validating; README Mermaid + demo GIF; broader tests.
**DoD:** same flow works on iOS; history persists across restarts; `terraform validate` passes.

### Agent working rules
1. Work strictly in phase order; within a phase, get a walking skeleton before polishing.
2. Verify current stable versions of RN, ML Kit, and Fastify before pinning anything.
3. Conventional-ish commit messages scoped per package (`mobile:`, `gateway:`, `classifier:`).
4. Never invent nutrition data sources requiring API keys; the bundled JSON is the MVP source.
5. If a step needs a human (keystore, repo secrets, running on a physical device, `terraform apply`), stop and print exact instructions instead of faking it.
6. Keep every explanation in code/docs truthful to what's implemented.

---

## 11. Kickoff prompt (paste this to the agent in the repo root)

> Read `PROJECT_BRIEF.md` in full. Implement **Phase 1** exactly as specified: scaffold the Yarn-workspaces monorepo, the TypeScript React Native app (New Architecture) with Capture and Results screens, and the `food-classifier` TurboModule with the Kotlin ML Kit implementation. Verify current stable versions before pinning dependencies. When you need me (device runs, signing, secrets), stop and give me exact instructions. Finish by telling me how to run it on Android and what Phase 2 will add.

## 12. Human checklist (things only Alexander can do)

- [ ] Create the public GitHub repo `foodsnap` under `askarpenko7`, MIT license.
- [ ] Run Phase 1 result on a real Android device/emulator; commit a screenshot for the README.
- [ ] Generate the release keystore locally (`keytool -genkeypair ...` per README) and add the 4 GitHub secrets.
- [ ] Push tag `v0.1.0` after Phase 2 and confirm the APK installs on a device.
- [ ] Record a 10–15 s demo GIF for the README hero.
- [ ] Add the repo to the CV (Selected Projects) and LinkedIn once Phase 2 is done.