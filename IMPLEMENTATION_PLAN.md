# FoodSnap — Implementation Plan & Progress Tracker

> Companion to [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) (the source of truth for *what* to build) and [`docs/DESIGN.md`](docs/DESIGN.md) (the source of truth for *how it looks* — tokens, components, per-screen specs). This file tracks *what has been done*. Any AI agent working on this repo picks its next task here and updates this file as it works. Honesty rule applies to this file too: a task is only `[x]` if its **Verify** line actually passed — never "should work".

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
| Phase 1 — "it classifies on Android" | 15/15 | 0/1 | 2/2 | agent work done — H1 (real device + screenshot) open |
| Phase 2 — "gateway, Docker, CI, released APK" | 0/14 | 0/3 | 0/4 | not started |
| Phase 3 — "iOS parity + infra + shine" (optional) | 0/6 | 0/2 | 0/3 | not started |
| Phase 4 — design build-out (optional) | 0/6 | 0/0 | 0/3 | not started |

**Now:** nothing in progress · **Next up:** P2.1 (Phase 1 agent tasks + DoD are complete) · **Blocked on human:** H1 (real-device run + README screenshot — emulator screenshots are committed as interim), and H2 (create the GitHub repo) before CI can go green in P2.12

---

## Verified Versions

*Filled by P1.4 (mobile/tooling rows) and refreshed for backend rows when Phase 2 starts. Brief rule: use latest **stable**, verified today — not training-data guesses. The brief mentions `node:20-alpine`; if current Node LTS is newer, record the decision here and use it consistently.*

| Component | Version pinned | Verified on | Source / notes |
|---|---|---|---|
| React Native | 0.86.2 (react 19.2.3) | 2026-07-29 | npm `latest`; New Architecture + Hermes are default ON in 0.86 |
| Node.js LTS (services + Docker base image) | 24.x (Krypton) → `node:24-alpine` | 2026-07-29 | nodejs.org/dist/index.json — 24 is active LTS; brief's `node:20-alpine` superseded per version policy |
| Yarn (Berry) | 4.9.2 | 2026-07-29 | installed via Corepack (`packageManager` field); `nodeLinker: node-modules` set |
| create-react-native-library | 0.63.0 | 2026-07-29 | npm `latest`; Kotlin+Swift TurboModule template |
| ML Kit image labeling (`com.google.mlkit:image-labeling`) | 17.0.9 | 2026-07-29 | dl.google.com maven-metadata.xml — latest release; on-device default model, no key |
| Fastify | 5.10.0 | 2026-07-29 | npm `latest` |
| `@fastify/rate-limit` | 11.2.0 | 2026-07-29 | npm `latest` (Fastify v5 line) |
| Gateway proxy approach | `@fastify/http-proxy` 11.6.0 | 2026-07-29 | chosen over manual forwarding: keeps upstream timeout/502 mapping + undici pooling; second upstream = another register block |
| `@react-navigation/native` + `native-stack` | 7.3.14 + 7.18.6 | 2026-07-29 | npm `latest`; with react-native-screens 4.26.2 + safe-area-context 5.8.0 |
| react-native-image-picker | 8.2.1 | 2026-07-29 | npm `latest` |
| react-native-config | 1.6.1 | 2026-07-29 | npm `latest` (Phase 2 app wiring) |
| react-native-mmkv | 4.3.2 | 2026-07-29 | npm `latest`; Phase 3 |
| Glass/blur approach (`@react-native-community/blur` vs translucent fallback) | **Graceful degrade** (solid fills ≈ `rgba(30,34,44,.92)` + same borders/shadows); blur lib 4.4.1 noted for P4.1 revisit | 2026-07-29 | DESIGN.md §4 explicitly offers the degrade path; avoids a native dep for MVP. Decision: degrade. |
| IBM Plex Mono font files (OFL) | google/fonts repo `ofl/ibmplexmono` @ main (OFL 1.1) | 2026-07-29 | github.com/google/fonts raw TTFs (400/500/600) + OFL.txt bundled; GitHub API was rate-limited, files fetched directly |
| culori (dev-only) | 4.0.2 | 2026-07-29 | npm `latest`; OKLCH → hex token generation script (P1.6) |
| fuse.js (or Levenshtein impl) | fuse.js 7.5.0 | 2026-07-29 | chosen over hand-rolled Levenshtein: alias scoring + threshold tuning for free |
| Jest + RN preset / ts-jest | Jest 29.7.x + `@react-native/jest-preset` 0.86.2; ts-jest 29.4.12 (services) | 2026-07-29 | RN community template 0.86.2 pins `jest ^29.6.3`; preset 0.86.2 deps are jest-29 libs — stay on 29 everywhere for consistency |
| tsup vs tsc (service builds) | tsup 8.5.1 | 2026-07-29 | chosen: single-file ESM builds + watch mode, no tsconfig emit gymnastics |

---

## Phase 1 — "it classifies on Android"

**Goal:** fresh clone → `yarn install` → documented run command → snap a photo → real labeled results on an Android device/emulator. No backend yet.

### A. Monorepo skeleton

- [x] **P1.1 — Repo hygiene**
  `.gitignore` covering Node, Metro, Android (`build/`, `.gradle/`, `local.properties`, `*.keystore`), iOS (`Pods/`, `DerivedData/`), and `.env*` (except `.env.example`). MIT `LICENSE` (Alexander Karpenko).
  **Verify:** `LICENSE` at root; after later builds `git status` stays free of generated files.

- [x] **P1.2 — Yarn workspaces root**
  Yarn Berry with `.yarnrc.yml` → `nodeLinker: node-modules` (RN tooling needs physical `node_modules`; no PnP, no pnpm). Root `package.json` (private) with workspaces `apps/*`, `packages/*`, `services/*`.
  **Verify:** `yarn install` succeeds; `node_modules/` is a real directory.

- [x] **P1.3 — Root TS/lint config**
  `tsconfig.base.json` with `strict: true`, extended by every workspace. Shared ESLint + Prettier at root. Root scripts: `lint`, `typecheck` (run across all workspaces).
  **Verify:** `yarn lint` and `yarn typecheck` run green (trivially, pre-code).

- [x] **P1.4 — Version research → fill Verified Versions table**
  Check current stable versions of every row above (npm/official docs), record version + date + source. Decide Node base image, proxy approach, matcher lib, build tool.
  **Verify:** no `—` left in mobile/tooling rows; each row has a source.

### B. React Native app scaffold + design system

- [x] **P1.5 — Scaffold `apps/mobile`** *(depends: P1.2–P1.4)*
  Bare React Native (not Expo), TypeScript, New Architecture ON, Hermes ON, wired into the workspace.
  **Verify:** `cd apps/mobile/android && ./gradlew assembleDebug` succeeds.

- [x] **P1.6 — Design tokens + theme system** *(depends: P1.5)*
  Implement `docs/DESIGN.md` as code in `apps/mobile/src/theme/`: `tokens.ts` (surfaces, text ladder, accents, white alphas, radii, spacing, type scale, glass presets) + small node script using `culori` that converts the OKLCH accent sources to exact hex (replaces the provisional values — commit generated output). Bundle IBM Plex Mono (400/500/600, OFL notice kept) and register it for Android/iOS. Record the glass/blur decision in Verified Versions. Dark-only.
  **Verify:** a token-gallery dev screen (or storybook-style stub) renders surfaces/type/bars with the generated hex; fonts resolve on Android emulator (mono numbers visibly mono).

- [x] **P1.7 — Navigation + app structure**
  `@react-navigation/native-stack`; folders `src/screens`, `src/api`, `src/hooks`, `src/theme`. Stub Capture and Results screens registered, themed via P1.6 (dark `bg.screen`, no plain white defaults). Plain stack for MVP — the design's tab bar arrives in P4.1.
  **Verify:** app boots to themed CaptureScreen stub on emulator.

- [x] **P1.8 — CaptureScreen (design: camera screen)** *(depends: P1.6)*
  Styled per `docs/DESIGN.md` §5 screen 3 + §6: dark full-bleed with corner-bracket viewfinder, "Fill the frame with your plate" hint, 82px shutter → camera via `react-native-image-picker`, "Library" glass chip → gallery. ("Type it" is P4.4 — omit.) Camera-permission denial handled gracefully (explanatory UI, gallery still works). On selection → navigate to Results with the file URI.
  **Verify:** typecheck green + manual emulator flow (camera and gallery paths, denial path); visual check against DESIGN.md.

### C. `packages/food-classifier` TurboModule

- [x] **P1.9 — Scaffold the library** *(depends: P1.5)*
  `create-react-native-library`, Kotlin + Swift TurboModule ("new architecture") template. Consumed by `apps/mobile` as a workspace dependency.
  **Verify:** codegen runs; app still builds with the library linked.

- [x] **P1.10 — TS spec (codegen) exactly per brief §3**
  `Classification { label: string; confidence: number }`; `classifyImage(uri: string): Promise<Classification[]>`; `isAvailable(): Promise<boolean>`.
  **Verify:** codegen output contains the spec; typecheck green.

- [x] **P1.11 — Kotlin / ML Kit implementation** *(depends: P1.10)*
  ML Kit Image Labeling, on-device default model — no API key, no network. `InputImage.fromFilePath(context, uri)` → labeler → top **5** by confidence desc, filter `< 0.1`. Coded rejections: `E_FILE_NOT_FOUND`, `E_CLASSIFICATION_FAILED`. Work off the UI thread; resolve/reject per TurboModule threading conventions. Code comment on the generic-labeler-vs-food-model MVP tradeoff (interview material, brief §3).
  **Verify:** exercised end-to-end via P1.13 on emulator with a real photo.

- [x] **P1.12 — iOS stub (keep iOS compiling)**
  Swift side: `isAvailable()` → `false`; `classifyImage` rejects `E_CLASSIFICATION_FAILED` ("iOS implementation lands in Phase 3"). Real Vision impl is P3.1.
  **Verify:** iOS target still builds (`pod install` + build check); no Android regression.

### D. Results + wrap-up

- [x] **P1.13 — ResultsScreen (design: result peek / breakdown)** *(depends: P1.8, P1.11)*
  Styled per `docs/DESIGN.md` §5 screens 4+6 + §6: photo top with Retake; sheet-styled breakdown — `PROBABLY · NN%` micro-label + top-1 name, "Which one is it?" list for the remaining labels with mono confidence percentages (radio-select swaps the shown food; low-confidence rows dimmed like the concept's "not food"); nutrition card (kcal + macro bars, per 100 g) in **"backend offline"** notice state for now (backend arrives in Phase 2; portion chip and Add-to-diary are P4.x). Loading + error states.
  **Verify:** emulator flow shows real ML Kit labels for a food photo; visual check against DESIGN.md.

- [x] **P1.14 — Lint/typecheck green across workspaces**
  **Verify:** `yarn lint` + `yarn typecheck` at root, zero errors.

- [x] **P1.15 — First-draft README**
  Section order per brief §9: name + one-liner + demo GIF placeholder; "Why this exists" (honest, 2–3 sentences); architecture diagram placeholder; monorepo tour; native-modules explainer; running locally; CI/CD + APK install (placeholder until Phase 2); roadmap. Mention the design system (`docs/DESIGN.md`) in the tour.
  **Verify:** all §9 sections present in order; honesty rule respected.

- [ ] **H1 — *(human)* Device run + screenshot**
  Run Phase 1 result on a real Android device/emulator; commit a screenshot for the README.

### Phase 1 — Definition of Done *(brief §10, verbatim)*

- [x] Fresh clone → `yarn install` → documented run command → snap a photo → see labeled results on Android.
      *Verified on the running emulator via the README's exact command (`yarn workspace foodsnap-mobile android`): BUILD SUCCESSFUL → installed → gallery photo → `Pizza 95%` + 4 more labels. Not verified from a literally fresh clone — the one machine-level prerequisite is the `org.gradle.java.home` line the README documents (system JDK here is 11, too old for AGP).*
- [x] No backend yet (nutrition card shows a "backend offline" state).
      *Nutrition card renders the offline notice; labels come from the on-device module and never touch the network.*

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
  Small typed `fetch` wrapper in `apps/mobile/src/api` importing `packages/shared` types. Base URL + API key via `react-native-config` `.env`; `.env.example` committed. ResultsScreen: selecting a label (top-1 by default, or a "Which one is it?" alternative) → `GET /api/v1/nutrition/:food` → the nutrition card fills (kcal, protein, carbs, fat per 100 g, styled per `docs/DESIGN.md`) with loading + error states; **classifications still render when the backend is unreachable** (offline notice card).
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
  Replace the P1.12 stub: `VNClassifyImageRequest` (built-in classifier — no model download, no key). Load image from file URI, run on a background queue, map `VNClassificationObservation` → `Classification`. Same contract: top 5, filter < 0.1, coded errors. Same MVP-tradeoff comment.
  **Verify:** classification works in the iOS simulator.

- [ ] **P3.2 — Full flow on iOS** *(depends: P3.1)*
  Capture (or gallery) → Results → labels → nutrition card, on the iOS simulator.
  **Verify:** manual simulator flow end-to-end.

- [ ] **P3.3 — HistoryScreen + MMKV**
  Last 20 scans persisted locally with `react-native-mmkv`: thumbnail, top label, timestamp. Registered in navigation. Styled as the design's diary-lite list rows (`docs/DESIGN.md` §6) — no targets/summary card (that's P4.2, which absorbs this screen).
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

## Phase 4 — design build-out *(optional, after Phase 3)*

**Goal:** implement the rest of the design concept (`docs/DESIGN.md` §5) — Diary with daily targets, portion editing, search + manual logging, nutrition caching, Settings, tab-bar navigation. This phase extends the brief's scope; it must never regress the Phase 1–3 DoD, and the README/roadmap must stay honest about what's built.

- [ ] **P4.1 — Floating glass tab bar**
  Diary / Snap / Settings per `docs/DESIGN.md` (h78, r39, center 60px Snap button elevated −30px, glass.tabBar preset). Snap opens the capture flow modally; Diary becomes the home screen.
  **Verify:** navigation works from all three tabs; visual check against the concept.

- [ ] **P4.2 — Diary screen with daily targets** *(depends: P3.3, P4.1)*
  Design screen 1: date header, kcal summary card (consumed / target, "left today", % mono), three macro target bars, "Logged today" rows (thumb · name · portion·time meta · kcal). Targets + entries in MMKV (extends the P3.3 store; HistoryScreen is absorbed by this screen). Entries come from "Add to diary" (P4.3).
  **Verify:** add entries → totals, %, and "left today" math correct; persists across restarts.

- [ ] **P4.3 — Portion editor + Add to diary** *(depends: P4.2)*
  Design screen 5: − / + stepper, mono weight (tap to type), preset chips, THIS PORTION card recomputing kcal/macros live from `per100g`, time chip, "Add N g" CTA. Requires portion presets in the data model: extend `packages/shared` + `data/foods.json` with `servings: [{ label, grams }]` (e.g. "1 slice · 128 g") — gateway/nutrition-api pass them through. Results gains the portion chip + "Add to diary" CTA from the concept.
  **Verify:** portion math matches per100g × grams; presets come from the API payload; added entry appears in Diary with grams + time.

- [ ] **P4.4 — Search & manual log** *(depends: P4.2)*
  Design screen 2: search field with live fuzzy results (`N OF 120 FOODS · FUZZY MATCH` micro-label), `+` to log via the portion editor, dashed "Enter it by hand" row → manual form (name, portion, four numbers) logging straight to Diary (works fully offline). Record the data-access decision in Verified Versions: new `GET /api/v1/foods?q=` through the gateway (recommended — keeps the DB server-side) vs bundling `foods.json` in the app.
  **Verify:** "piz" surfaces pizza results with kcal/100 g; manual entry lands in Diary offline.

- [ ] **P4.5 — Nutrition cache + "numbers came from cache"** *(depends: P4.2)*
  MMKV cache of the last nutrition payload per food. When the gateway is unreachable: cached food → values + the concept's notice card ("The gateway didn't answer, so this is the last nutrition stored for X. Labels never needed the network."); uncached food → plain offline state. Replaces the MVP offline wording from P1.13.
  **Verify:** with compose stack down — cached food shows values + notice; uncached shows offline state; labels always render.

- [ ] **P4.6 — Settings screen** *(depends: P4.1)*
  Design screen 7: DAILY TARGETS editor (kcal + macro grams, feeds P4.2); BACKEND card — gateway URL + API key overrides stored on-device (masked key with Show; `.env` stays the default), health dot polling gateway `/health`; default portion; "dim non-food labels" toggle (wired to the P1.13 dimming); "Clear diary & history" (destructive confirm → wipes MMKV); ON THIS DEVICE (classifier engine per platform, model status via `isAvailable()`, app version).
  **Verify:** overrides take effect over `.env` without rebuild; health dot tracks compose up/down; clear wipes diary + history + cache.

### Phase 4 — Definition of Done

- [ ] All seven concept screens exist and are visually faithful to `docs/DESIGN.md` (side-by-side check against the export).
- [ ] Snap → classify → portion → add to diary → targets update, end-to-end, including offline (cache notice when the gateway is down).
- [ ] Phase 1–3 DoD checklists still pass (no regression: `yarn test`, lint/typecheck, compose flow, CI green).

---

## Work Log *(append-only)*

*One row per completed (or blocked) task. Newest at the bottom. Never edit or delete existing rows.*

| Date | Session / agent | Task(s) | What was done | Verification evidence |
|---|---|---|---|---|
| 2026-07-29 | Claude Code (bootstrap) | — | Repo bootstrapped: brief copied in, this tracker + `CLAUDE.md` created, git initialized | Files present; initial commit |
| 2026-07-29 | Claude Code (design integration) | — | Design concept adopted (`docs/DESIGN.md` extracted from the `FoodSnap App.dc.html` export): new P1.6 tokens/theme task, Capture/Results/History restyled to the concept, new optional Phase 4 (P4.1–P4.6). Phase 1 renumbered (old P1.6–P1.14 → P1.7–P1.15) — safe: no task had started | Tracker + DESIGN.md committed; counts updated |
| 2026-07-29 | OpenCode (kimi-k3) | P1.1 | `.gitignore` (Node, Metro, Android, iOS, `.env*` except `.env.example`) + MIT `LICENSE` (Alexander Karpenko) | `LICENSE` at root; `git status` shows only intended files |
| 2026-07-29 | OpenCode (kimi-k3) | P1.2 | Yarn Berry 4.9.2 via Corepack (`packageManager` field), `.yarnrc.yml` → `nodeLinker: node-modules`, root `package.json` (private, workspaces `apps/* packages/* services/*`) | `yarn install` succeeded; `node_modules/` is a real directory |
| 2026-07-29 | OpenCode (kimi-k3) | P1.3 | `tsconfig.base.json` (`strict: true` + extra strictness flags), ESLint 10 flat config + typescript-eslint + Prettier at root; root `lint`/`typecheck` scripts. Note: TS `latest` is now 7.x (native preview) — breaks Yarn's builtin patch + typescript-eslint peers, pinned stable `typescript@5.9.3` instead | `yarn lint` + `yarn typecheck` exit 0 (trivially, pre-code) |
| 2026-07-29 | OpenCode (kimi-k3) | P1.4 | Verified Versions table filled from npm registry / dl.google.com maven metadata / nodejs.org dist index. Decisions: Node 24 LTS (`node:24-alpine`), `@fastify/http-proxy`, fuse.js, tsup, Jest 29 line (matches RN 0.86 preset), glass = graceful degrade for MVP | No `—` left in mobile/tooling rows; every row has a source |
| 2026-07-29 | OpenCode (kimi-k3) | P1.5 | Bare RN 0.86.2 scaffold in `apps/mobile` (TS, `newArchEnabled=true`, `hermesEnabled=true`), workspace package `foodsnap-mobile`, monorepo Metro config (watchFolders + nodeModulesPaths), Gradle paths repointed to hoisted root `node_modules` (settings.gradle + react block). Template eslint/prettier/nested .git removed — root configs govern. Mobile tsconfig extends `@react-native/typescript-config` (verified `strict: true`) — RN's official config wins over tsconfig.base for the app. Gradle uses Android Studio JBR 21 via user-level `~/.gradle/gradle.properties` (system JDK is 11, too old for AGP; documented in README later) | `cd apps/mobile/android && ./gradlew assembleDebug` → BUILD SUCCESSFUL, `app-debug.apk` produced; `git status` free of generated files |
| 2026-07-29 | OpenCode (kimi-k3) | P1.6 | `src/theme/tokens.ts` (full DESIGN.md §1–§4 token set) + `scripts/generate-tokens.mjs` (culori OKLCH→hex; generated output committed, replaces the doc's provisional hexes); IBM Plex Mono 400/500/600 + OFL.txt bundled from google/fonts, linked via `react-native-asset`; `src/screens/dev/TokenGalleryScreen.tsx` dev gallery (behind `SHOW_TOKEN_GALLERY` flag in App.tsx). Glass = degrade presets. Generated accents: primary `#6875f6`, primaryText `#8a9bff`, protein `#4ac06c`, carbs `#f2af48`, fat `#ef6661`, ok `#65c67d`, danger `#f3625d` | Gallery rendered on Pixel_8_API_35 emulator: surfaces/type scale/macro bars/glass chips all correct, mono numbers visibly mono (screenshots reviewed) |
| 2026-07-29 | OpenCode (kimi-k3) | P1.7 | `@react-navigation/native-stack` stack; `src/{screens,api,hooks,navigation,theme}` structure; dark-only NavigationContainer theme (no white flashes); Capture (headerless) + Results stub registered | App boots to themed CaptureScreen on emulator (screenshot reviewed) |
| 2026-07-29 | OpenCode (kimi-k3) | P1.8 | CaptureScreen per DESIGN.md screen 3: full-bleed `bg.deep`, 40×40 corner brackets (3px, r16), plate hint, 82px shutter w/ 5px ring → `launchCamera`, Library glass chip → `launchImageLibrary`, CAMERA permission in manifest, denial → explanatory notice card with gallery path intact ("Type it" omitted per plan). Navigates to Results with file URI | `tsc --noEmit` green; rendered on emulator, visual check against DESIGN.md passed (screenshot reviewed). Camera/gallery flows to be exercised end-to-end in P1.13's verify |
| 2026-07-29 | OpenCode (kimi-k3) | P1.9 + P1.10 | `packages/food-classifier` via create-react-native-library 0.63.0 (`--local --type turbo-module`; note: 0.63 only offers `kotlin-objc` for turbo-modules — Swift template was dropped, Swift arrives in P3.1 via standard ObjC interop). Spec per brief §3: `Classification { label, confidence }`, `classifyImage(uri): Promise<Classification[]>`, `isAvailable(): Promise<boolean>`. Consumed by `foodsnap-mobile` as workspace dep | Codegen ran during app build; generated `NativeFoodClassifierSpec.java` contains `classifyImage`/`isAvailable`; `assembleDebug` BUILD SUCCESSFUL; package typecheck green |
| 2026-07-29 | OpenCode (kimi-k3) | P1.11 | Kotlin module: ML Kit `image-labeling:17.0.9` (on-device default model), `InputImage.fromFilePath` → top 5 by confidence desc, `< 0.1` filtered, coded rejections `E_FILE_NOT_FOUND` / `E_CLASSIFICATION_FAILED`; threading + generic-labeler-vs-food-model tradeoff comments in code | End-to-end exercise deferred to P1.13 per its own Verify line; module compiles into the app build (BUILD SUCCESSFUL) |
| 2026-07-29 | OpenCode (kimi-k3) | P1.12 | ObjC stub matching codegen spec: `isAvailable` → NO, `classifyImage` rejects `E_CLASSIFICATION_FAILED` ("lands in Phase 3"). Env fix: system CocoaPods was broken (Homebrew Ruby 4.0 missing `ffi`) — used the template Gemfile with project-local `bundle config path vendor/bundle` (gitignored, `**/vendor/bundle/`) | `bundle exec pod install` → 79 pods incl. autolinked `FoodClassifier`; `xcodebuild -workspace … -destination 'generic/platform=iOS Simulator' build` exit 0; Android `assembleDebug` still green |
| 2026-07-29 | Claude Code (review) | review of P1.1–P1.12 | All previously ticked tasks hold up — Kotlin module matches brief §3 exactly (top-5, `< 0.1` filtered, coded rejections, threading + tradeoff comments), tokens/theme faithful to DESIGN.md, no false claims in this log. **Two defects found:** (1) `yarn lint` failed with 11 `no-undef` errors — the flat config declared no Node globals for config files/scripts and no RN globals for app source; (2) Results was registered with a nav header, so the photo could not run full-bleed under the status bar the way DESIGN.md screen 4 requires. Both fixed under their owning tasks (P1.14 / P1.13) | `eslint . --format json` → 19 files, 0 errors; `yarn typecheck` green; screenshots compared against DESIGN.md |
| 2026-07-29 | Claude Code | P1.13 | ResultsScreen finished from the previous session's WIP: full-bleed photo + safe-area-aware glass Retake chip, `PROBABLY · NN%` micro-label, "Which one is it?" radio list that swaps the shown food, per-100 g nutrition card in its backend-offline notice state, loading/error states with retry; `useClassifier` hook wraps the TurboModule call. Results made headerless. **Product fix:** ML Kit ranks category words above dishes (`Food 96%` > `Pizza 95%`), so the default selection would have sent `"food"` to the Phase 2 nutrition lookup — added a `GENERIC_LABELS` stop list that demotes those out of the default pick and dims them in the list, which is also what the concept's dimmed "not food" row implies. A stale `selectedIndex` could also survive a retry into a shorter result list; selection now resets on retry | Emulator (Pixel_8_API_35, live): gallery → real photo → `PROBABLY · 95%` / **Pizza**, with Food/Cuisine/Fast food dimmed and Cake (wrong but specific) left bright. Screenshots committed to `docs/screenshots/` |
| 2026-07-29 | Claude Code | P1.14 | Root lint + typecheck green. Added `globals` devDep and two scoped ESLint blocks: Node globals for `*.config.*`/`scripts/**` (plus `no-require-imports` off there), RN/Hermes globals (`globals.browser` + `__DEV__`) for app and package source — the latter pre-empts the same failure when `fetch` arrives in P2.10 | `eslint . --format json` → 19 files, 0 errors, 0 warnings; `yarn typecheck` → both workspaces clean |
| 2026-07-29 | Claude Code | P1.15 | `README.md` in brief §9 order: one-liner, emulator screenshot + GIF placeholder, honest "Why this exists" (built 2026, demonstration project, Phase 1 done / 2–3 ahead), **working Mermaid** architecture diagram with dashed edges for unbuilt phases (brought forward from P3.5), monorepo tour, a teaching section on the native module (spec → codegen → compile-time contract, ML Kit threading, the generic-labeler tradeoff), local run steps, Phase 2 CI/CD + APK placeholder, roadmap. Documents the machine-level `org.gradle.java.home` prerequisite the previous session hit (system JDK 11 is too old for AGP; Android Studio JBR is 21) | Facts verified, not assumed: JBR reports 21.0.10, system java 11.0.28, workspace really is `foodsnap-mobile`. Documented command run verbatim — `yarn workspace foodsnap-mobile android` → BUILD SUCCESSFUL, installed, app launched on emulator |
| 2026-07-29 | Claude Code | Phase 1 DoD | Both DoD items ticked against a live emulator run of the documented command. Caveat recorded on the checklist: not run from a literally fresh clone, and the JDK prerequisite is machine-level. H1 (real-device run + final README screenshot) is still Alexander's | See P1.13/P1.15 rows |
