---
name: ns-ios-setup
description: Set up local iOS dev/build tooling for NowStack Mobile: Xcode, Simulator, CocoaPods, Watchman, mobile deps, and first `expo run:ios`. Use for `/ns ios local-setup`, legacy `/ns setup-ios`, simulator preview, or local TestFlight prerequisites. macOS only; signing is `/ns ios setup`.
---

# ns-ios-setup — Local iOS dev environment

<objective>
Take a Mac from "cloned the repo" to "`npm run ios` compiles and launches the dev build in the iOS Simulator". This is the **local preview** path (`expo run:ios`), the one you need to see native modules (Stripe, IAP, Apple Sign In) that do **not** exist in Expo Go.

It is NOT `/ns ios setup` — that wires EAS + Apple **signing** for TestFlight builds. This skill never touches an Apple account, never signs, never uploads. Everything here runs on this machine against the Simulator.

Detect what's missing, propose the whole batch in **one** confirmation, install, then run the first build.
</objective>

<platform_guard>
iOS development requires macOS — Xcode and the Simulator do not exist on Linux/Windows.

```bash
uname -s   # must be "Darwin"
```

If not Darwin: stop. Explain that local iOS builds need a Mac, and the alternatives are (a) an EAS **cloud** iOS build (`/ns ios testflight`, builds on Apple-hosted macOS) or (b) developing the Android/web surfaces locally. Do not attempt any install.
</platform_guard>

<components>
Detect each, then install only what's missing. Heavy GUI install (Xcode) is delegated to `/ns doctor`; this skill owns the iOS-specific configuration that `doctor` does not do.

| Component | Check | Fix (macOS) |
| --- | --- | --- |
| **Xcode.app** (~7 GB, the full IDE — not just CLT) | `xcodebuild -version` succeeds | Install via App Store, or `brew install xcodes && xcodes install --latest`. If absent, offer to run **`/ns doctor`** (it owns the big GUI install). |
| **Active developer dir → Xcode** (not the CLT shim) | `xcode-select -p` ends in `/Xcode.app/Contents/Developer` | `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |
| **Xcode license accepted** | `xcodebuild -version` doesn't error about a license | `sudo xcodebuild -license accept` |
| **First-launch components** | n/a (idempotent) | `xcodebuild -runFirstLaunch` |
| **iOS Simulator runtime** (an iPhone device available) | `xcrun simctl list devices available \| grep -i iphone` returns a row | `xcodebuild -downloadPlatform iOS` (Xcode 15+), or Xcode ▸ Settings ▸ Components |
| **CocoaPods** (prebuild runs `pod install`) | `pod --version` | `brew install cocoapods` |
| **Watchman** (Metro file watching) | `command -v watchman` | `brew install watchman` |
| **Mobile node_modules** (provides the `expo` binary) | `ls mobile-app/node_modules/.bin/expo` | `cd mobile-app && npm install` — see note ↓ |

**Mobile deps note:** `mobile-app/.npmrc` pins `legacy-peer-deps=true` (Expo + React 19 pull `react-dom` at a newer patch than the pinned `react`, which trips npm's strict peer resolver → empty `node_modules` → `expo: command not found`). Keep that file; verify the tree actually landed, don't trust a bare "exit 0". This overlaps `/ns onboard` step 2 — skip if already populated.
</components>

<workflow>
1. **Guard.** `uname -s` must be Darwin, else stop with the alternatives above.
2. **Detect.** Run every check in the table; build the missing list.
3. **Propose once.** Show the plan — each missing component + its exact command, and call out Xcode's ~7 GB download if absent. One confirmation for the batch. (`sudo` steps for license/select are part of the plan; the user will be prompted for their password by the OS.)
4. **Install + configure.** Run the accepted steps in order, idempotent — skip anything already present. Never reinstall a present tool or re-accept a license.
5. **First build.** From `mobile-app/`:
   ```bash
   npm run ios            # = expo run:ios → prebuild → pod install → Xcode compile → launch Simulator
   ```
   - The **first** build is slow (prebuild → CocoaPods → full Xcode compile, several minutes). Run it in the background and watch the log; report progress, don't declare success until the Simulator shows the app.
   - This generates `mobile-app/ios/` — **gitignored** (Continuous Native Generation), don't commit it.
   - Target a specific simulator if asked: `npm run ios -- --device "iPhone 17 Pro"`.
   - Another Expo app already running on 8081? Start Metro on an explicit port: `npx expo start --port 8082` (two apps on 8081 serve each other the wrong bundle).
6. **Report.** Installed-now / already-present / skipped, the Simulator device used, and the Metro port. Point at `/ns dev` (`npm run start-all`) for the everyday Convex + web + mobile loop.
</workflow>

<rules>
- macOS only — never run Xcode/Simulator/CocoaPods steps on Linux/Windows; offer `/ns ios testflight --expo` if the user needs a cloud build instead.
- One confirmation for the whole batch; idempotent — never touch a component already present.
- Local dev only: no Apple ID, no signing, no uploads. Cloud signing/TestFlight is `/ns ios setup` → `/ns ios testflight`.
- Verify the dev build is the goal — payments / Apple Sign In / IAP require it; Expo Go cannot load these native modules. Never verify those flows in Expo Go.
- `mobile-app/ios/` is generated and gitignored — regenerated by `expo prebuild`; never commit it.
- Prefer `trash` over `rm -rf` if a corrupt `ios/`/`Pods/` needs clearing.
- Don't manage the user's global Node/Ruby version beyond what an install strictly requires.
</rules>

<verification>
```bash
uname -s                                              # Darwin
xcodebuild -version                                   # Xcode present + license ok
xcode-select -p                                       # …/Xcode.app/Contents/Developer
xcrun simctl list devices available | grep -i iphone  # at least one iPhone runtime
pod --version && command -v watchman                  # CocoaPods + Watchman
ls mobile-app/node_modules/.bin/expo                  # expo binary resolves
```
Green path ends with `npm run ios` showing the app in the Simulator. If the build fails, read the real `expo run:ios` log (pod install vs Xcode compile vs Metro) before guessing; see `docs/troubleshooting.md`.
</verification>
