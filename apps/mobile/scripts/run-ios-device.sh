#!/usr/bin/env bash
#
# Build, install and launch FoodSnap on a physically connected iPhone.
#
#   yarn workspace foodsnap-mobile ios:device
#
# Release rather than Debug on purpose: the JS is bundled into the app, so it
# runs standalone with no Metro server and no dev banner — which is what you
# want when recording, or when walking away from the Mac.
set -euo pipefail

# CocoaPods needs a UTF-8 locale or it dies on a unicode normalisation error.
export LANG=${LANG:-en_US.UTF-8}

BUNDLE_ID="dev.askarpenko7.foodsnap"
IOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../ios" && pwd)"
cd "$IOS_DIR"

# First connected physical device. devicectl's "identifier" is a CoreDevice
# UUID, which xcodebuild rejects — the hardware UDID is what both tools want.
UDID=$(xcrun devicectl list devices --json-output /tmp/foodsnap-devices.json >/dev/null 2>&1 && node -e '
const d = require("/tmp/foodsnap-devices.json");
const hit = (d.result.devices || []).find(
  (x) => (x.connectionProperties || {}).tunnelState === "connected" &&
         (x.deviceProperties || {}).osVersionNumber,
);
process.stdout.write(hit ? hit.hardwareProperties.udid : "");
')

if [ -z "$UDID" ]; then
  echo "No connected iPhone found. Plug one in, unlock it, and trust this Mac." >&2
  exit 1
fi
echo "→ device $UDID"

echo "→ building (Release)…"
xcodebuild -workspace FoodSnap.xcworkspace -scheme FoodSnap -configuration Release \
  -destination "id=$UDID" -derivedDataPath build/device -allowProvisioningUpdates build \
  | grep -E "^\*\* BUILD|error:" || true

APP="build/device/Build/Products/Release-iphoneos/FoodSnap.app"
[ -d "$APP" ] || { echo "Build produced no app bundle." >&2; exit 1; }

echo "→ installing…"
xcrun devicectl device install app --device "$UDID" "$APP" >/dev/null

# The first launch right after an install fails intermittently while the device
# finishes registering the bundle; retrying is enough.
echo "→ launching…"
for attempt in 1 2 3; do
  if xcrun devicectl device process launch --device "$UDID" "$BUNDLE_ID" >/dev/null 2>&1; then
    echo "✓ running on device"
    exit 0
  fi
  sleep 3
done

echo "Installed, but the launch request kept being refused." >&2
echo "Open FoodSnap from the home screen; if iOS complains about the developer," >&2
echo "trust it under Settings → General → VPN & Device Management." >&2
exit 1
