# MEMORY.md — read this before you touch anything

Hard-won facts about this repo and this machine. They are here because each one cost a previous agent real time, and none of them are discoverable by reading the code. Update this file when you learn something that would have saved you an hour.

**Document map:** [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) = what to build (source of truth) · [`docs/DESIGN.md`](docs/DESIGN.md) = how it looks · [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) = task tracker + Work Log (claim a task, verify it for real, tick it, append a row) · [`CLAUDE.md`](CLAUDE.md) = the agent loop.

## Where the project stands

Phase 1 is complete and verified on an Android emulator: the app classifies real photos on-device. All 15 Phase 1 agent tasks and both DoD items are ticked. **Next task is P2.1** (`packages/shared`).

Two human-only items are open and block specific things: **H1** (real-device run + README screenshot — emulator shots are committed as interim) and **H2** (create the public GitHub repo), which must happen before CI can actually go green in P2.12.

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

## Things about the product you cannot infer from the code

- **ML Kit's labeler is generic, and this shapes the UX.** A margherita pizza returns `Food 96%`, `Pizza 95%`, `Cuisine 90%`, `Cake 78%`. The category words rank *above* the dish, so `ResultsScreen`'s `GENERIC_LABELS` stop list demotes them out of the default selection and dims them. Without it, Phase 2 would look up nutrition for `"food"`. Wrong-but-specific guesses like "Cake" are deliberately left bright — the user corrects those, not a heuristic.
- **Classification must never require the network.** It is the architectural point of the project: only the nutrition lookup crosses the wire. Any change that makes labels depend on the backend is wrong.
- **The app is dark-only** and RN has no `backdrop-filter`, so the design's glass surfaces use the documented "graceful degrade" (solid fills at ~92% alpha with the same borders/shadows). Revisit a native BlurView at P4.1, not before.
- **Accent colors are generated, not hand-picked.** `tokens.generated.ts` comes from OKLCH sources via `scripts/generate-tokens.mjs` (culori). Edit the script, re-run `yarn workspace foodsnap-mobile tokens:generate`, and commit the output — never hand-tune the hex.
- **`create-react-native-library` 0.63 dropped the Swift TurboModule template** (`kotlin-objc` only), so the iOS side is currently an ObjC stub. The Swift/Vision implementation in P3.1 arrives via standard ObjC interop.

## Honesty rules that are actually enforced

The brief forbids inventing history or overstating what exists, and it applies to the tracker and README as much as to code. Concretely: tick a task only after its own `Verify` line passed; when a check was partial, say which part (the Phase 1 DoD rows carry exactly such a caveat about not testing a literally fresh clone); never invent a nutrition data source needing an API key — bundled `foods.json` is the MVP source; and stop and print instructions rather than faking anything that needs Alexander (keystore, secrets, device runs, `terraform apply`).
