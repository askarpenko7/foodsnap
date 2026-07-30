# MEMORY.md — read this before you touch anything

Hard-won facts about this repo and this machine. They are here because each one cost a previous agent real time, and none of them are discoverable by reading the code. Update this file when you learn something that would have saved you an hour.

**Document map:** [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) = what to build (source of truth) · [`docs/DESIGN.md`](docs/DESIGN.md) = how it looks · [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) = task tracker + Work Log (claim a task, verify it for real, tick it, append a row) · [`CLAUDE.md`](CLAUDE.md) = the agent loop.

## Where the project stands

Phases 1, 2 and 3 are complete. **Phase 4 is 6/6** — all seven concept screens exist (tab bar, Diary, camera, results, portion editor, search + manual entry, Settings). Nothing is queued; H5 (demo GIF) is the highest-value remaining item.

Two Phase 4 deviations are deliberate and documented in P4.6: Settings shows the gateway URL and api key **read-only** (react-native-config bakes them in at build time), and the "dim non-food labels" switch is local state that does not persist or drive the dimming.

**The one trap in this area:** P4.2 deleted `lib/history.ts` and HistoryScreen and deferred logging to P4.3, which left a window where *nothing* called `addEntry` and the Diary could never fill. If you split a store from its only writer again, either land both together or mark the dependent DoD row as superseded — a green tracker for a screen that no longer exists is exactly the failure this file guards against.

The repo is live at https://github.com/askarpenko7/foodsnap with CI green and [v0.1.0](https://github.com/askarpenko7/foodsnap/releases/tag/v0.1.0) released as a signed APK. Docker, Terraform and the iOS simulator all work on this machine.

Human-only items still open: **H1** (real Android device run + swap the emulator screenshots), **H5** (demo GIF), **H6** (CV/LinkedIn). A real iPhone would also settle iOS label quality, which the Simulator cannot.

**`apps/mobile/.env` is platform-specific and gitignored.** `GATEWAY_URL` must be `http://10.0.2.2:8080` for the Android emulator but `http://localhost:8080` for the iOS simulator — `10.0.2.2` is an Android-only host alias. It is currently set for **Android**; switch it before testing iOS, and remember react-native-config bakes it in at build time, so a rebuild is required either way.

## Running the stack in Docker

```bash
cd infra && cp .env.example .env   # set API_KEYS to match apps/mobile/.env
docker compose up --build
```

Only the gateway is published (`:8080`); nutrition-api is internal, and curling `localhost:3001` from the host should be **refused** — if it succeeds, someone added a `ports:` entry and broke the whole point of the gateway.

**Never make a runtime stage `FROM deps`.** Docker layers are additive, so a later `yarn workspaces focus --production` prunes nothing already baked in — that mistake shipped 552 MB images instead of 253 MB. Runtime stages start from a clean `node:24-alpine` and reinstall prod-only deps.

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
- **The two platforms have different bundle ids, on purpose.** Android is `com.foodsnap` (what v0.1.0 shipped as; changing it would orphan that release). iOS is **`com.askarpenko7.foodsnap`** because Apple's identifier namespace is global and `com.foodsnap` is already registered to somebody else — a device build fails with "cannot be registered to your development team". `adb` commands need `com.foodsnap`; `xcrun simctl` needs `com.askarpenko7.foodsnap`. Note the workspace is named `foodsnap-mobile`, which misleads on both.
- **iOS signing uses team `5PZDUPSM9U` = askarpenko7@gmail.com.** This machine has five signing identities and **two personal teams both displayed as "Alexander Karpenko"** — matching on TeamName picked `MZJS78V7NA`, which is actually *alexander.karpenko@firstlinesoftware.com*. Always resolve the team from the certificate's OU, not its display name:
  `security find-certificate -c "<identity name>" -p | openssl x509 -noout -subject`
- **iOS bundle id is `dev.askarpenko7.foodsnap`.** It has been burned through twice: `com.foodsnap` is registered to an unrelated team, and `com.askarpenko7.foodsnap` got registered to the *firstlinesoftware* account by the mis-signed build before the team was corrected. An App ID cannot move between teams, hence the third name. Android is unaffected and stays `com.foodsnap`.
- Device builds need `-allowProvisioningUpdates`; the iPhone 13 Pro Max UDID is `00008110-001818A21EA1801E` (get it from `xcrun devicectl list devices --json-output`, *not* the CoreDevice identifier, which xcodebuild rejects).
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
- **Jest + React Native ESM.** The RN preset does not transform `node_modules`, but react-navigation ships ESM, so `transformIgnorePatterns` must cover it — the pattern now matches the whole `react-native*` / `@react-native*` / `@react-navigation*` family, so a new native dep does not silently break the suite. Service suites are ESM too and need `NODE_OPTIONS=--experimental-vm-modules` plus a `moduleNameMapper` stripping `.js` from relative imports.
- **MMKV 4 is not MMKV 2/3.** Instances come from `createMMKV()`, `MMKV` is a type only, `delete()` is `remove()`, and it needs `react-native-nitro-modules` as a peer. Under Jest it substitutes an in-memory store by itself — but Nitro calls `TurboModuleRegistry.getEnforcing` at *import* time and throws first, so `jest.setup.js` stubs `react-native-nitro-modules`. **And the instance must not be created at module scope:** `createMMKV()` during bundle evaluation races Nitro's runtime install and SIGSEGVs the JS thread (`Nitro.Dispatcher` installs, then `signal 11` on `mqt_v_js` — the app white-screens and dies with no JS error). Stores are lazy singletons touched only after mount (`lib/diary.ts` is the pattern).
- **CocoaPods needs a UTF-8 locale.** In a non-interactive shell `pod install` dies with `Unicode Normalization not appropriate for ASCII-8BIT`. Prefix with `export LANG=en_US.UTF-8`.
- **Adding a native dep means `pod install` again.** `yarn ios` on its own failed after MMKV/Nitro landed; `bundle exec pod install` then building works. The README documents both steps for that reason.
- **Terraform is not in homebrew-core** (licence change). Install from the HashiCorp tap: `brew install hashicorp/tap/terraform`.

## Verifying iOS

The Claude simulator tooling needs `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` — **already run on this machine**, so taps and the live panel work. If it regresses, that command needs a password and an agent cannot run it; say so rather than silently falling back.

**The Simulator's Vision classifier is not trustworthy.** It first fails with "Failed to create espresso context" (hence the `#if targetEnvironment(simulator)` CPU pin in `FoodClassifierImpl.swift`), and even pinned it returns labels unrelated to the image — a pizza comes back as `outdoor / night sky / moon`. The identical binary on the identical file returns `pizza 85.3%` natively. **Never judge iOS label quality from the Simulator**; use the harness below, or a real device.

Everything except tapping can still be verified headlessly with `xcrun simctl` (`boot`, `install`, `launch`, `io … screenshot`, `addmedia`). Two gotchas: there are several devices literally named "iPhone 16" across runtimes, so `-destination` must use a **UDID**, not a name; and screenshots come back at 3x, so divide pixel coordinates by 3 to get logical points.

**The best trick for the Swift side:** compile the shipped source into a throwaway harness and run it on real photos —

```bash
xcrun swiftc -O packages/food-classifier/ios/FoodClassifierImpl.swift main.swift -o vision-check
```

That exercises the real classifier with no simulator, no bridge and no UI, and it is what caught the `utensil` ranking bug. Top-level code only works in a file named `main.swift`.

## Things about the product you cannot infer from the code

- **Both classifiers are generic, and this shapes the UX.** ML Kit sees a margherita pizza as `Food 96%`, `Pizza 95%`, `Cuisine 90%`, `Cake 78%`. Vision is worse: on a salad it returns `tableware 49%`, `utensil 49%`, `bowl 49%` *above* `food` and `salad` — it ranks the objects over the meal. The `GENERIC_LABELS` stop list in `src/lib/labels.ts` demotes both kinds out of the default selection and dims them; without it the app looks up the nutrition of "food" or of a utensil. **Add to that list from observed output, not imagination**, and pin the real output as a test fixture. Wrong-but-specific guesses like "Cake" stay bright — the user corrects those, not a heuristic.
- **An `adb install -r` that prints only "Performing Streamed Install" has failed.** A debug APK will not install over the release-signed build from a tag (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`); uninstall first. The symptom is the app running stale JS and ignoring Metro, which looks exactly like a bundler cache problem and is not one.
- **Classification must never require the network.** It is the architectural point of the project: only the nutrition lookup crosses the wire. Any change that makes labels depend on the backend is wrong.
- **The app is dark-only** and RN has no `backdrop-filter`, so the design's glass surfaces use the documented "graceful degrade" (solid fills at ~92% alpha with the same borders/shadows). Revisit a native BlurView at P4.1, not before.
- **Accent colors are generated, not hand-picked.** `tokens.generated.ts` comes from OKLCH sources via `scripts/generate-tokens.mjs` (culori). Edit the script, re-run `yarn workspace foodsnap-mobile tokens:generate`, and commit the output — never hand-tune the hex.
- **`create-react-native-library` 0.63 dropped the Swift TurboModule template** (`kotlin-objc` only), so the iOS side is currently an ObjC stub. The Swift/Vision implementation in P3.1 arrives via standard ObjC interop.

## Honesty rules that are actually enforced

The brief forbids inventing history or overstating what exists, and it applies to the tracker and README as much as to code. Concretely: tick a task only after its own `Verify` line passed; when a check was partial, say which part (the Phase 1 DoD rows carry exactly such a caveat about not testing a literally fresh clone); never invent a nutrition data source needing an API key — bundled `foods.json` is the MVP source; and stop and print instructions rather than faking anything that needs Alexander (keystore, secrets, device runs, `terraform apply`).
