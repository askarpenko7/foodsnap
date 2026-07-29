# FoodSnap — Implementation Plan & Progress Tracker

> Companion to [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) (the source of truth for *what* to build). This file tracks *what has been done*. Any AI agent working on this repo picks its next task here and updates this file as it works. Honesty rule applies to this file too: a task is only `[x]` if its **Verify** line actually passed — never "should work".

---

## How to use this file (tracking protocol)

**Status markers** (edit the checkbox in place):

| Marker | Meaning |
|---|---|
| `[ ]` | todo |
| `[~]` | in progress (claimed by an agent this session) |
| `[x]` | done — the task's **Verify** line passed |
| `[!]` | blocked — reason noted next to the task |
| `H*` task IDs | human-only: Alexander must do these; agents print exact instructions and move on |

**Agent loop for every task:**

1. Pick the first available task in the current phase (respect *Depends on*). Flip `[ ]` → `[~]`.
2. Implement. Run the task's **Verify** line for real.
3. Flip to `[x]`, update the [Status dashboard](#status-dashboard) counts, append a row to the [Work Log](#work-log-append-only).
4. Commit with the brief's scope prefixes (`mobile:`, `gateway:`, `classifier:`, `chore:` …). The git history of this file is the audit trail.

**Rules** (binding, from the brief §10):

- Strict phase order. A phase's **Definition of Done** checklist must be fully `[x]` before the next phase starts (Phase 3 is optional). Within a phase: walking skeleton first, polish second.
- Never pin a dependency version from memory — fill the [Verified Versions](#verified-versions) table first (task P1.4).
- Blocked on a human step? Mark `[!]`, write the exact instructions for Alexander in the Work Log, and continue with any unblocked task.
- If you discover a genuinely missing task, add it with the next free ID in its phase and note the addition in the Work Log. Never delete or rewrite completed entries.

---

## Status dashboard

*Update the counts and the "now" line as part of ticking any box.*

| Phase | Agent tasks | Human tasks | DoD | Status |
|---|---|---|---|---|
| Phase 1 — "it classifies on Android" | 0/14 | 0/1 | 0/2 | not started |
| Phase 2 — "gateway, Docker, CI, released APK" | 0/14 | 0/3 | 0/4 | not started |
| Phase 3 — "iOS parity + infra + shine" (optional) | 0/6 | 0/2 | 0/3 | not started |

**Now:** nothing in progress · **Next up:** P1.1 · **Blocked on human:** nothing

---

## Verified Versions

*Filled by P1.4 (mobile/tooling rows) and refreshed for backend rows when Phase 2 starts. Brief rule: use latest **stable**, verified today — not training-data guesses. The brief mentions `node:20-alpine`; if current Node LTS is newer, record the decision here and use it consistently.*

| Component | Version pinned | Verified on | Source / notes |
|---|---|---|---|
| React Native | — | — | New Architecture + Hermes must be ON |
| Node.js LTS (services + Docker base image) | — | — | decide `node:XX-alpine` here |
| Yarn (Berry) | — | — | `nodeLinker: node-modules` mandatory |
| create-react-native-library | — | — | Kotlin+Swift TurboModule template |
| ML Kit image labeling (`com.google.mlkit:image-labeling`) | — | — | on-device default model, no key |
| Fastify | — | — | |
| `@fastify/rate-limit` | — | — | |
| Gateway proxy approach | — | — | `@fastify/http-proxy` vs manual — record choice |
| `@react-navigation/native` + `native-stack` | — | — | |
| react-native-image-picker | — | — | |
| react-native-config | — | — | |
| react-native-mmkv | — | — | Phase 3 |
| fuse.js (or Levenshtein impl) | — | — | record matcher choice |
| Jest + RN preset / ts-jest | — | — | |
| tsup vs tsc (service builds) | — | — | record choice |

---

## Phase 1 — "it classifies on Android"

**Goal:** fresh clone → `yarn install` → documented run command → snap a photo → real labeled results on an Android device/emulator. No backend yet.

### A. Monorepo skeleton

- [ ] **P1.1 — Repo hygiene**
  `.gitignore` covering Node, Metro, Android (`build/`, `.gradle/`, `local.properties`, `*.keystore`), iOS (`Pods/`, `DerivedData/`), and `.env*` (except `.env.example`). MIT `LICENSE` (Alexander Karpenko).
  **Verify:** `LICENSE` at root; after later builds `git status` stays free of generated files.

- [ ] **P1.2 — Yarn workspaces root**
  Yarn Berry with `.yarnrc.yml` → `nodeLinker: node-modules` (RN tooling needs physical `node_modules`; no PnP, no pnpm). Root `package.json` (private) with workspaces `apps/*`, `packages/*`, `services/*`.
  **Verify:** `yarn install` succeeds; `node_modules/` is a real directory.

- [ ] **P1.3 — Root TS/lint config**
  `tsconfig.base.json` with `strict: true`, extended by every workspace. Shared ESLint + Prettier at root. Root scripts: `lint`, `typecheck` (run across all workspaces).
  **Verify:** `yarn lint` and `yarn typecheck` run green (trivially, pre-code).

- [ ] **P1.4 — Version research → fill Verified Versions table**
  Check current stable versions of every row above (npm/official docs), record version + date + source. Decide Node base image, proxy approach, matcher lib, build tool.
  **Verify:** no `—` left in mobile/tooling rows; each row has a source.

### B. React Native app scaffold

- [ ] **P1.5 — Scaffold `apps/mobile`** *(depends: P1.2–P1.4)*
  Bare React Native (not Expo), TypeScript, New Architecture ON, Hermes ON, wired into the workspace.
  **Verify:** `cd apps/mobile/android && ./gradlew assembleDebug` succeeds.

- [ ] **P1.6 — Navigation + app structure**
  `@react-navigation/native-stack`; folders `src/screens`, `src/api`, `src/hooks`, `src/theme`. Stub Capture and Results screens registered.
  **Verify:** app boots to CaptureScreen stub on emulator.

- [ ] **P1.7 — CaptureScreen**
  Big "Snap food" button → camera via `react-native-image-picker`; secondary "Pick from gallery". Camera-permission denial handled gracefully (explanatory UI, gallery still works). On selection → navigate to Results with the file URI.
  **Verify:** typecheck green + manual emulator flow (camera and gallery paths, denial path).

### C. `packages/food-classifier` TurboModule

- [ ] **P1.8 — Scaffold the library** *(depends: P1.5)*
  `create-react-native-library`, Kotlin + Swift TurboModule ("new architecture") template. Consumed by `apps/mobile` as a workspace dependency.
  **Verify:** codegen runs; app still builds with the library linked.

- [ ] **P1.9 — TS spec (codegen) exactly per brief §3**
  `Classification { label: string; confidence: number }`; `classifyImage(uri: string): Promise<Classification[]>`; `isAvailable(): Promise<boolean>`.
  **Verify:** codegen output contains the spec; typecheck green.

- [ ] **P1.10 — Kotlin / ML Kit implementation** *(depends: P1.9)*
  ML Kit Image Labeling, on-device default model — no API key, no network. `InputImage.fromFilePath(context, uri)` → labeler → top **5** by confidence desc, filter `< 0.1`. Coded rejections: `E_FILE_NOT_FOUND`, `E_CLASSIFICATION_FAILED`. Work off the UI thread; resolve/reject per TurboModule threading conventions. Code comment on the generic-labeler-vs-food-model MVP tradeoff (interview material, brief §3).
  **Verify:** exercised end-to-end via P1.12 on emulator with a real photo.

- [ ] **P1.11 — iOS stub (keep iOS compiling)**
  Swift side: `isAvailable()` → `false`; `classifyImage` rejects `E_CLASSIFICATION_FAILED` ("iOS implementation lands in Phase 3"). Real Vision impl is P3.1.
  **Verify:** iOS target still builds (`pod install` + build check); no Android regression.

### D. Results + wrap-up

- [ ] **P1.12 — ResultsScreen** *(depends: P1.7, P1.10)*
  Photo thumbnail; calls `FoodClassifier.classifyImage(uri)`; label list with confidence bars; loading + error states. Nutrition card area present but in **"backend offline"** state (backend arrives in Phase 2).
  **Verify:** emulator flow shows real ML Kit labels for a food photo.

- [ ] **P1.13 — Lint/typecheck green across workspaces**
  **Verify:** `yarn lint` + `yarn typecheck` at root, zero errors.

- [ ] **P1.14 — First-draft README**
  Section order per brief §9: name + one-liner + demo GIF placeholder; "Why this exists" (honest, 2–3 sentences); architecture diagram placeholder; monorepo tour; native-modules explainer; running locally; CI/CD + APK install (placeholder until Phase 2); roadmap.
  **Verify:** all §9 sections present in order; honesty rule respected.

- [ ] **H1 — *(human)* Device run + screenshot**
  Run Phase 1 result on a real Android device/emulator; commit a screenshot for the README.

### Phase 1 — Definition of Done *(brief §10, verbatim)*

- [ ] Fresh clone → `yarn install` → documented run command → snap a photo → see labeled results on Android.
- [ ] No backend yet (nutrition card shows a "backend offline" state).

---

## Phase 2 — "gateway, Docker, CI, released APK"

**Goal:** `docker compose up` + app → tapping a label shows nutrition; invalid API key → 401; tag `v0.1.0` → GitHub Release with installable APK; CI green.

### A. Shared contracts + services

- [ ] **P2.1 — `packages/shared`**
  Request/response types for the nutrition API (success body, typed error body), imported by the app and both services — no duplicated contracts anywhere.
  **Verify:** typecheck green with app + both services importing from it.

- [ ] **P2.2 — `services/nutrition-api` scaffold**
  Fastify + TypeScript + pino, built with the tool chosen in Verified Versions. `GET /health` for probes.
  **Verify:** service starts locally; `/health` → 200.

- [ ] **P2.3 — `data/foods.json` (~120 foods)**
  Generate ~120 common foods: `{ name, aliases[], per100g: { kcal, protein, carbs, fat } }` with plausible values. Bundled JSON is the MVP source — never an external API needing keys (brief rule 4).
  **Verify:** valid against the shared type; count ≥ 120; spot-check a few entries for sane numbers.

- [ ] **P2.4 — Fuzzy matcher + `GET /nutrition/:food`** *(depends: P2.3)*
  Matcher per Verified Versions choice (fuse.js or normalized Levenshtein) so ML labels like "hot dog" / "granny smith" resolve sensibly. Below threshold → `404` with the typed error body.
  **Verify:** "hot dog" and "granny smith" resolve; gibberish → 404 typed body.

- [ ] **P2.5 — `services/gateway` scaffold + proxy**
  Fastify gateway routing `/api/v1/nutrition/*` → nutrition-api (upstream URL from env). Structured so a second upstream is a config addition — say so in its README section.
  **Verify:** request through gateway → nutrition-api answers locally.

- [ ] **P2.6 — Gateway auth + rate limiting**
  `x-api-key` header checked against env → `401` otherwise. `@fastify/rate-limit` at 60 req/min per key.
  **Verify:** curl matrix — no key → 401, wrong key → 401, good key → 200, 61st request in a minute → 429.

- [ ] **P2.7 — Gateway hardening**
  Request logging with request IDs, CORS, upstream timeout with `502` mapping, `GET /health`.
  **Verify:** with nutrition-api down, gateway returns 502 promptly (no hang).

### B. Docker

- [ ] **P2.8 — Dockerfiles (both services)**
  Multi-stage, `node:<LTS>-alpine` per Verified Versions, non-root user, prod deps only.
  **Verify:** `docker build` succeeds for both; containers run and pass `/health`.

- [ ] **P2.9 — `infra/docker-compose.yml`** *(depends: P2.8)*
  `gateway` on `:8080` (public); `nutrition-api` internal-only on the compose network; env wired between them. `docker compose up` + documented API key = everything needed locally.
  **Verify:** compose up → gateway serves nutrition through the documented key; nutrition-api port not reachable from host.

### C. App wiring

- [ ] **P2.10 — Typed API client + env** *(depends: P2.1, P2.9)*
  Small typed `fetch` wrapper in `apps/mobile/src/api` importing `packages/shared` types. Base URL + API key via `react-native-config` `.env`; `.env.example` committed. ResultsScreen: tapping a label → `GET /api/v1/nutrition/:food` → inline card (kcal, protein, carbs, fat per 100 g) with loading + error states; **classifications still render when the backend is unreachable**.
  **Verify:** emulator against the compose stack — nutrition card fills; stop compose → offline state, labels intact.

### D. Tests + CI/CD

- [ ] **P2.11 — Jest tests**
  Fuzzy matcher unit tests; gateway auth/rate-limit/proxy via `fastify.inject`; app logic with the native module mocked. No emulator/simulator tests.
  **Verify:** `yarn test` green in all workspaces.

- [ ] **P2.12 — `ci.yml`** *(depends: P2.11)*
  On every push/PR: install with Yarn cache → typecheck all workspaces → lint → Jest.
  **Verify:** workflow YAML valid; green run on GitHub once H2 is done.

- [ ] **P2.13 — `release-android.yml`**
  On tag `v*`: JDK 17 + Android SDK; decode keystore from secret `ANDROID_KEYSTORE_BASE64`; signing config reads `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` from env — keystore/passwords never committed; `./gradlew assembleRelease`; GitHub Release for the tag with `foodsnap-<version>.apk` attached.
  **Verify:** confirmed by H4 (tag push produces installable APK).

- [ ] **P2.14 — README: out-of-store distribution**
  How to generate the keystore (`keytool -genkeypair …`), set the 4 repo secrets, and sideload the APK — explicitly framed as *distributing a signed native app outside official stores*.
  **Verify:** a reader could produce the keystore + secrets from the doc alone.

- [ ] **H2 — *(human)* Create GitHub repo**
  Public repo `askarpenko7/foodsnap`, MIT; push this repo there.

- [ ] **H3 — *(human)* Keystore + secrets**
  Generate the release keystore locally per README; add the 4 GitHub secrets.

- [ ] **H4 — *(human)* Tag `v0.1.0`**
  Push the tag after Phase 2; confirm the GitHub Release appears and the APK installs on a device.

### Phase 2 — Definition of Done *(brief §10, verbatim)*

- [ ] `docker compose up` + app → tapping a label shows nutrition.
- [ ] Invalid API key → 401.
- [ ] Pushing tag `v0.1.0` → GitHub Release with installable APK.
- [ ] CI green.

---

## Phase 3 — "iOS parity + infra + shine" *(optional)*

- [ ] **P3.1 — Swift / Vision implementation**
  Replace the P1.11 stub: `VNClassifyImageRequest` (built-in classifier — no model download, no key). Load image from file URI, run on a background queue, map `VNClassificationObservation` → `Classification`. Same contract: top 5, filter < 0.1, coded errors. Same MVP-tradeoff comment.
  **Verify:** classification works in the iOS simulator.

- [ ] **P3.2 — Full flow on iOS** *(depends: P3.1)*
  Capture (or gallery) → Results → labels → nutrition card, on the iOS simulator.
  **Verify:** manual simulator flow end-to-end.

- [ ] **P3.3 — HistoryScreen + MMKV**
  Last 20 scans persisted locally with `react-native-mmkv`: thumbnail, top label, timestamp. Registered in navigation.
  **Verify:** scans appear; kill + relaunch app → history intact.

- [ ] **P3.4 — Terraform (validate-only)**
  `infra/terraform`: Artifact Registry + two Cloud Run services (gateway public, nutrition-api internal ingress), env vars wired, minimal variables + README. Applying is optional and must not block anything (brief §8).
  **Verify:** `terraform validate` passes.

- [ ] **P3.5 — README polish**
  Mermaid architecture diagram (app → TurboModule → ML Kit/Vision; app → gateway → nutrition-api); final monorepo tour; native-modules section that teaches (TurboModules, codegen, threading); roadmap (food-specific CoreML/TFLite model, vision-camera live frames, History sync, iOS TestFlight lane).
  **Verify:** Mermaid renders on GitHub; sections match brief §9.

- [ ] **P3.6 — Broader tests**
  Extend coverage where thin (history persistence logic, iOS-path app logic with module mocked, matcher edge cases).
  **Verify:** `yarn test` green.

- [ ] **H5 — *(human)* Demo GIF**
  Record a 10–15 s demo GIF for the README hero.

- [ ] **H6 — *(human)* CV / LinkedIn**
  Add the repo to the CV (Selected Projects) and LinkedIn once Phase 2 is done.

### Phase 3 — Definition of Done *(brief §10, verbatim)*

- [ ] Same flow works on iOS.
- [ ] History persists across restarts.
- [ ] `terraform validate` passes.

---

## Work Log *(append-only)*

*One row per completed (or blocked) task. Newest at the bottom. Never edit or delete existing rows.*

| Date | Session / agent | Task(s) | What was done | Verification evidence |
|---|---|---|---|---|
| 2026-07-29 | Claude Code (bootstrap) | — | Repo bootstrapped: brief copied in, this tracker + `CLAUDE.md` created, git initialized | Files present; initial commit |
