# MEMORY.md — read this before you touch anything

Hard-won facts about this repo and this machine. They are here because each one cost a previous agent real time, and none of them are discoverable by reading the code. Update this file when you learn something that would have saved you an hour.

**Document map:** [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) = what to build (source of truth) · [`docs/DESIGN.md`](docs/DESIGN.md) = how it looks · [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) = task tracker + Work Log (claim a task, verify it for real, tick it, append a row) · [`CLAUDE.md`](CLAUDE.md) = the agent loop.

## Where the project stands

Phase 1 is complete and verified on an emulator. Phase 2 is done except Docker: both services, the app wiring, 71 tests, and both CI workflows are built and verified. **Next task is P3.1** (Swift/Vision), or P2.8–P2.9 if Docker becomes available.

**Docker is not installed on this machine** — no `docker`, Docker Desktop, colima, podman or nerdctl. The Dockerfiles and `infra/docker-compose.yml` are therefore *written but never built*. Treat them as untested. Everything else in Phase 2 was verified by running it.

Human-only items still open: **H1** (real-device run + screenshot), **H2** (create the public GitHub repo — CI cannot go green without a remote), **H3/H4** (keystore + 4 secrets, then tag `v0.1.0`).

## Running the backend without Docker

This is how Phase 2 was actually verified, and it is the fastest loop:

```bash
yarn workspace @foodsnap/nutrition-api build && \
  (cd services/nutrition-api && PORT=3001 node dist/index.js &)
yarn workspace @foodsnap/gateway build && \
  (cd services/gateway && API_KEYS=dev-local-key-change-me \
     NUTRITION_API_URL=http://127.0.0.1:3001 PORT=8080 node dist/index.js &)
```

The gateway **refuses to start without `API_KEYS`** — that is deliberate, not a bug. `RATE_LIMIT_MAX=3` makes the rate limit testable in seconds.

**Killing these needs care.** `lsof -ti tcp:3001 | xargs kill` also kills the *gateway*, because it holds a keep-alive connection to that port. Always add `-sTCP:LISTEN` to target only the listener.

## This machine (macOS)

- **`yarn` is not on PATH in non-interactive shells.** Use `corepack yarn …` for every command. Version comes from the `packageManager` field (4.9.2) — never install Yarn globally.
- **The system JDK is 11, which AGP rejects.** Gradle only works because `~/.gradle/gradle.properties` (user-level, not committed) points at Android Studio's bundled JDK 21:
  `org.gradle.java.home=/Applications/Android Studio.app/Contents/jbr/Contents/Home`.
  The README documents this as a prerequisite. If a build suddenly fails on Java version, check that file first.
- **Android tooling needs the SDK env exported** in each shell: `export ANDROID_HOME=~/Library/Android/sdk; export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator`.
- **The app's package id is `com.foodsnap`**, not `com.foodsnapmobile` (the workspace is named `foodsnap-mobile`, which misleads). `adb` commands need `com.foodsnap`.
- **AVDs available:** `Pixel_8_API_35`, `Pixel_6_Pro_API_35`. One is often already booted — check `adb devices` before starting another.
- **Metro is often already running on 8081** from a previous session; starting another fails with `EADDRINUSE`. Check `curl -s http://localhost:8081/status` first and reuse it.
- **System CocoaPods is broken** (Homebrew Ruby 4.0 missing `ffi`). For iOS, use the template Gemfile with a project-local bundle: `bundle config path vendor/bundle` (already gitignored), then `bundle exec pod install`.
- **TypeScript is pinned to 5.9.3 deliberately.** npm `latest` is 7.x (native preview) and it breaks Yarn's builtin patch plus typescript-eslint peers. Do not bump it casually.

## Verifying app changes on the emulator

The `Verify` lines demand real runs, and driving the emulator has two traps:

1. **Wait for JS, not just the activity.** After launching, poll logcat for `Running "FoodSnap"` before injecting taps — waiting on `MainActivity` alone is not enough, and taps sent during startup land nowhere. A wasted verification cycle looks exactly like a blank white screen.
2. **Fast Refresh cannot add hooks to a mounted component.** Editing a component to add a `useState`/`useMemo` throws `Rendered more hooks than during the previous render`. That is a hot-reload artifact, *not* a bug in your code — force-stop and relaunch before concluding anything.

The working recipe (photo already pushed to `/sdcard/Pictures/`, tap coordinates are for the 1080×2400 Pixel 8):

```bash
adb shell am force-stop com.foodsnap && adb logcat -c
adb shell monkey -p com.foodsnap -c android.intent.category.LAUNCHER 1
until adb logcat -d | grep -q 'Running "FoodSnap"'; do sleep 2; done
sleep 4
adb shell input tap 149 2159   # "Library" chip
sleep 6
adb shell input tap 539 1586   # first photo in the picker grid
adb exec-out screencap -p > shot.png
```

Two food photos (pizza, salad) are already in the emulator's gallery. The pizza is the better test — it is what the design concept uses.

## Library traps already paid for

Each of these cost a debugging cycle. None is discoverable by reading our code.

- **Fastify plugins that reject by throwing.** `@fastify/rate-limit` *throws* whatever `errorResponseBuilder` returns, so it must be an `Error` carrying `statusCode`. Return a plain body and you get a 429-shaped payload sent as a **500**.
- **`await app.register()` freezes the error handler.** Awaiting a register loads that plugin immediately, and the child context it creates captures `setErrorHandler` as it stands at that moment. Install error and not-found handlers **before** any awaited register, or proxied routes silently answer in Fastify's default error shape instead of the shared contract's.
- **`requestIdLogLabel` is deprecated** in Fastify 5 and renaming that log field in 6 needs a custom `logController` class. Both services just use the default `reqId`.
- **hermesc under workspace hoisting.** RN 0.86 ships hermesc in its own `hermes-compiler` package, which the Gradle plugin resolves under `<react.root>/node_modules` — that is `apps/mobile`, while node_modules is hoisted. `app/build.gradle` sets `hermesCommand` explicitly, keeping `%OS-BIN%` so macOS and CI's linux64 both work. **Only release builds compile bytecode**, so `assembleDebug` passes while `assembleRelease` fails — always run a release build before trusting the release workflow.
- **`react-native-config`**: `dotenv.gradle` is at `react-native-config/android/dotenv.gradle`, not the package root, and it resolves the env file as `$rootDir/../.env` (so `apps/mobile/.env`). Values are baked in at **build** time — changing `.env` needs a rebuild, not a reload.
- **`apksigner` globs.** `"$ANDROID_HOME"/build-tools/*/apksigner` expands to *every* installed version, passing the extras as arguments; it then verifies nothing and still exits 0. Pick one: `find "$ANDROID_HOME/build-tools" -name apksigner -type f | sort -V | tail -1`.
- **Jest + React Native ESM.** The RN preset does not transform `node_modules`, but react-navigation ships ESM, so `transformIgnorePatterns` must allow-list it (see `apps/mobile/jest.config.js`). Service suites are ESM too and need `NODE_OPTIONS=--experimental-vm-modules` plus a `moduleNameMapper` stripping `.js` from relative imports.

## Things about the product you cannot infer from the code

- **ML Kit's labeler is generic, and this shapes the UX.** A margherita pizza returns `Food 96%`, `Pizza 95%`, `Cuisine 90%`, `Cake 78%`. The category words rank *above* the dish, so `ResultsScreen`'s `GENERIC_LABELS` stop list demotes them out of the default selection and dims them. Without it, Phase 2 would look up nutrition for `"food"`. Wrong-but-specific guesses like "Cake" are deliberately left bright — the user corrects those, not a heuristic.
- **Classification must never require the network.** It is the architectural point of the project: only the nutrition lookup crosses the wire. Any change that makes labels depend on the backend is wrong.
- **The app is dark-only** and RN has no `backdrop-filter`, so the design's glass surfaces use the documented "graceful degrade" (solid fills at ~92% alpha with the same borders/shadows). Revisit a native BlurView at P4.1, not before.
- **Accent colors are generated, not hand-picked.** `tokens.generated.ts` comes from OKLCH sources via `scripts/generate-tokens.mjs` (culori). Edit the script, re-run `yarn workspace foodsnap-mobile tokens:generate`, and commit the output — never hand-tune the hex.
- **`create-react-native-library` 0.63 dropped the Swift TurboModule template** (`kotlin-objc` only), so the iOS side is currently an ObjC stub. The Swift/Vision implementation in P3.1 arrives via standard ObjC interop.

## Honesty rules that are actually enforced

The brief forbids inventing history or overstating what exists, and it applies to the tracker and README as much as to code. Concretely: tick a task only after its own `Verify` line passed; when a check was partial, say which part (the Phase 1 DoD rows carry exactly such a caveat about not testing a literally fresh clone); never invent a nutrition data source needing an API key — bundled `foods.json` is the MVP source; and stop and print instructions rather than faking anything that needs Alexander (keystore, secrets, device runs, `terraform apply`).
