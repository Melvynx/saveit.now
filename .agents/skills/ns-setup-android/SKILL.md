---
name: ns-setup-android
description: Set up the local Android Studio, Android SDK, and Pixel emulator workflow for NowStack Mobile, then build and run the Expo Android development app. Use for `/ns setup-android`, `/ns android setup`, Android Studio setup, creating a Pixel AVD, or opening NowStack on Android locally. This is not the Google Play beta or production release flow.
---

# NowStack Android Local Setup

Use this skill when the goal is local Android development: install Android Studio and SDK tools, create a recent Pixel emulator, build the Expo development app, launch NowStack on the emulator, and verify the visible app. Do not use this for Play Console upload, internal track beta, production rollout, store listing, or signing release tasks; route those to `ns-android-beta` / `ns-android-distribute`.

## Required Reading

Before changing repo files or running install/build commands, read:

- `AGENTS.md`
- `.agents/rules/development-commands.md`
- `.agents/rules/mobile-app.md`
- `.agents/rules/verification.md`

Keep the repo rules active:

- Never use `rm -rf`; use `trash` for deletions.
- Do not revert unrelated worktree changes.
- Keep generated `mobile-app/android/` ignored and uncommitted unless the user explicitly asks for native Android project edits.
- Use Node 22 and UTF-8 for Expo/Gradle commands:

```bash
export PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH"
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

## Scope

This workflow should leave the user with:

- Android Studio installed.
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` / `JAVA_HOME` available in the shell.
- Android SDK command-line tools, platform tools, emulator, latest stable platform, build tools, and an Apple Silicon Play Store system image installed.
- A recent Pixel AVD, preferably the newest Pixel profile available from `avdmanager list device`.
- The NowStack Android development build installed and open on the emulator.
- A screenshot and command output proving the emulator and app are correct.

## Detect Current State

Run checks first and skip work that is already done:

```bash
uname -s
command -v brew || true
command -v java || true
java -version
command -v adb || true
command -v sdkmanager || true
command -v avdmanager || true
command -v emulator || true
echo "$ANDROID_HOME"
ls "$HOME/Library/Android/sdk" 2>/dev/null || true
mdfind "kMDItemCFBundleIdentifier == 'com.google.android.studio'" || true
npm run check-setup -- --accounts
```

If `sdkmanager`, `avdmanager`, or `emulator` are installed but not on `PATH`, prefer exporting the SDK paths for the current shell and adding missing exports to the user shell profile only when absent.

## Install On macOS

On macOS with Homebrew, use:

```bash
brew install --cask android-studio
brew install android-commandlinetools android-platform-tools
brew install openjdk@17
```

Use an existing JDK 17 if already installed. Add these exports to `~/.zprofile` only if equivalent lines are not already present:

```bash
# Android SDK
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Then use the same exports in the current shell before continuing.

## SDK Packages

Install SDK packages with `sdkmanager --sdk_root="$ANDROID_HOME"`. Prefer the latest complete stable Android platform and matching ARM64 Google Play system image. Avoid canary-only system images unless the user explicitly asks for them.

Apple Silicon package pattern:

```bash
yes | sdkmanager --licenses
sdkmanager --sdk_root="$ANDROID_HOME" \
  "cmdline-tools;latest" \
  "platform-tools" \
  "emulator" \
  "platforms;android-36" \
  "build-tools;36.0.0" \
  "system-images;android-36;google_apis_playstore;arm64-v8a"
```

If `sdkmanager --list` shows a newer stable API with a complete Play Store ARM64 image, use that platform/image and also keep the Expo compile SDK platform available. For Expo SDK 54, Android 36 / build-tools 36.0.0 are expected. Gradle may install additional missing pieces such as build-tools 35.0.0, CMake, or NDK; let it do that rather than hand-editing Gradle.

## Create A Pixel AVD

List device profiles and choose the newest Google Pixel profile:

```bash
avdmanager list device
```

Create the AVD with a stable, descriptive name:

```bash
printf 'no\n' | avdmanager create avd \
  --force \
  -n nowstack_pixel_api_36 \
  -d pixel_9_pro_xl \
  -k "system-images;android-36;google_apis_playstore;arm64-v8a"
```

If the latest installed target is API 37 and a matching Play Store ARM64 image exists, use `nowstack_pixel_9_pro_xl_api_37` and the API 37 package instead. Verify:

```bash
avdmanager list avd
```

## Boot The Emulator

Use `tmux` so the emulator survives after the agent command exits:

```bash
tmux new-session -d -s nowstack-emulator -c "$PWD" \
  'export ANDROID_HOME="$HOME/Library/Android/sdk"; export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"; emulator -avd nowstack_pixel_9_pro_xl_api_37 -gpu swiftshader_indirect -netdelay none -netspeed full'
```

Adjust the AVD name if you created a different one. In this environment `-gpu swiftshader_indirect` is the reliable detached mode. Wait for boot:

```bash
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
adb devices -l
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk
```

## Build And Run NowStack

Android debug builds commonly attach to Metro on port 8081. Before launching, make sure 8081 is either free or owned by this repo. If another Expo app is serving 8081, the emulator may open the wrong bundle even when the NowStack APK is installed.

Start Metro in a durable tmux session from `mobile-app/`:

```bash
tmux new-session -d -s nowstack-android -c "$PWD/mobile-app" \
  'export PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH"; export LANG=en_US.UTF-8; export LC_ALL=en_US.UTF-8; export EXPO_NO_TELEMETRY=1; npx expo start --port 8081 --dev-client --host lan'
```

Build and install the Android development app:

```bash
cd mobile-app
export PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH"
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
ANDROID_SERIAL=emulator-5554 npm run android
```

Do not pass `--device emulator-5554` to Expo; Expo may treat it as a display name and fail to find the emulator. Use `ANDROID_SERIAL=emulator-5554` when you need to pin the device.

If the app opens stale JavaScript, reset the local debug state:

```bash
PACKAGE_NAME=$(cd mobile-app && npx expo config --json | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).android.package')
adb reverse tcp:8081 tcp:8081
adb shell am force-stop "$PACKAGE_NAME"
adb shell pm clear "$PACKAGE_NAME"
adb shell am start -W -n "$PACKAGE_NAME/.MainActivity"
```

Only clear app data when stale bundle state is suspected, because it signs the user out.

## Verify

Collect proof that the latest Pixel emulator and the NowStack app are actually running:

```bash
adb devices -l
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk
tmux capture-pane -pt nowstack-android -S -120
adb logcat -d | rg -i 'ReactNativeJS|Running "main"|baseURL|loadJSBundle|PostHog' || true
adb exec-out screencap -p > /tmp/nowstack-android-pixel-final.png
```

Inspect the screenshot. A successful local setup should show the NowStack app, normally with the welcome screen or the current app shell, not another Expo project's UI.

## Common Fixes

- `java -version` shows Java 8 or Gradle complains about Java: export the JDK 17 `JAVA_HOME`.
- `sdkmanager` not found after Homebrew install: use `$ANDROID_HOME/cmdline-tools/latest/bin` and verify `cmdline-tools;latest` is installed.
- Detached emulator exits immediately: run it in tmux and use `-gpu swiftshader_indirect`.
- The emulator shows another Expo app: free port 8081, start NowStack Metro on 8081, run `adb reverse tcp:8081 tcp:8081`, then force-stop or clear the app.
- First Android build takes several minutes: this is expected while Gradle downloads native dependencies, NDK, CMake, and missing build tools.
- `npm run android -- --device emulator-5554` cannot find the emulator: use `ANDROID_SERIAL=emulator-5554 npm run android`.

## Report

Keep the final report concise:

- Android Studio / SDK status.
- AVD name, Android release, and SDK API level.
- Installed package and launch state.
- Metro/emulator tmux session names.
- Screenshot path.
- Any remaining manual step, such as opening Android Studio once for UI preferences.
