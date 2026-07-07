---
name: ns-doctor
description: Install and verify every developer tool NowStack Mobile needs on this machine (Node, eas, vercel, convex, asc, gpc, fastlane, bun, gcloud, + Xcode/Android Studio). Cross-platform — Homebrew/npm on macOS, apt/curl on Linux, winget/scoop on Windows. Use for "install the CLIs", "set up my machine", "ns doctor", missing-tool errors, or right before /ns accounts. Proposes to install everything missing in one pass.
---

# ns-doctor — Machine setup

<objective>
Get a fresh machine from "just cloned the repo" to "every tool the lifecycle needs is installed and on PATH". This is the **install** counterpart to `check-setup --accounts` (which only **detects**). It does NOT log you into anything — that's `/ns accounts`. Run `doctor` first, then `accounts`.

**Propose to install everything.** Detect what's missing, then present ONE plan that installs all of it — CLIs *and* the GUI build tools (Xcode, Android Studio) — and install the whole accepted batch in a single pass. The user accepts the plan once; don't drip-feed per tool. (GUI apps are big — call out the download size in the plan so the consent is informed — but include them in the "everything" proposal rather than treating them as an afterthought.)
</objective>

<os_aware>
Detect the OS first and pick the matching install column — never assume macOS:

```bash
uname -s   # Darwin = macOS, Linux = Linux; Windows = use PowerShell / winget
```

| OS | Package managers used | Bootstrap if missing |
| --- | --- | --- |
| **macOS** | Homebrew + npm | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| **Linux** | system pkg mgr (apt/dnf/pacman) + npm + official installers | use the distro's manager or each tool's curl installer |
| **Windows** | winget (or scoop) + npm | winget ships with Windows 10+; scoop: `iwr -useb get.scoop.sh \| iex` |

npm-based tools install identically on all three. Only the native tools (bun, asc, fastlane, gcloud, Android Studio) differ per OS — use the row below.
</os_aware>

<workflow>
1. **Detect.** Probe every tool with its check command + run `node scripts/check-setup.mjs --accounts`. Build the missing list.
2. **Propose everything.** Show one plan: every missing tool, its exact install command for *this* OS, and the GUI download sizes. Get **one** confirmation for the whole batch.
3. **Install.** Run all accepted installs in one pass — idempotent, skip anything already on PATH. Never reinstall/upgrade a present tool unless asked.
4. **Re-verify.** Re-run the probes + `check-setup --accounts`; report installed-now / already-present / skipped / still-missing. Recommend `/ns accounts` next.
</workflow>

<prerequisites>
- **Node + npm** — runtime for the JS CLIs. Check `node -v`. Install via [nvm](https://github.com/nvm-sh/nvm) (mac/Linux), [fnm](https://github.com/Schniz/fnm), or `winget install OpenJS.NodeJS` (Windows). Don't silently switch a user's Node version.
- The OS package manager from the table above (Homebrew / winget / apt…).
</prerequisites>

<tool_manifest>
Check is `command -v <tool>` unless noted. Install per OS:

| Tool | Role | macOS | Linux | Windows |
| --- | --- | --- | --- | --- |
| `convex` | backend (no global install) | `npx convex …` | same | same |
| `eas` | Expo / mobile builds | `npm i -g eas-cli` | same | same |
| `vercel` | web deploy | `npm i -g vercel` | same | same |
| `gpc` | Google Play Console (Android) | `npm i -g @gpc-cli/cli` | same | same |
| `asc` | App Store Connect (iOS) | `brew install asc` | download from [asccli.sh](https://asccli.sh) | iOS release is macOS-only — skip |
| `fastlane` | Android publish fallback | `brew install fastlane` | `gem install fastlane` | `gem install fastlane` |
| `bun` | repo tooling | `brew install bun` | `curl -fsSL https://bun.sh/install \| bash` | `powershell -c "irm bun.sh/install.ps1\|iex"` or `scoop install bun` |
| `gcloud` | create the Play service account (optional) | `brew install --cask google-cloud-sdk` | [apt/dnf repo](https://cloud.google.com/sdk/docs/install) | `winget install Google.CloudSDK` |

Skip per-platform tools the user won't use: no iOS → skip `asc`; no Android → skip `gpc`/`fastlane`/`gcloud`.
</tool_manifest>

<gui_apps>
Included in the "install everything" proposal, with size called out:

| App | Role | Check | macOS | Windows | Linux |
| --- | --- | --- | --- | --- | --- |
| Xcode | iOS build + Simulator (~7 GB) | `xcodebuild -version` | App Store, or `brew install xcodes && xcodes install --latest` | n/a (no iOS on Windows) | n/a |
| Android Studio | Android emulator + SDK (~1 GB + SDK) | `command -v adb` | `brew install --cask android-studio` | `winget install Google.AndroidStudio` | `sudo snap install android-studio --classic` or [download](https://developer.android.com/studio) |

After Android Studio: create an AVD and ensure `ANDROID_HOME` is exported. Xcode needs an Apple ID + a one-time license accept (`sudo xcodebuild -license accept`).
</gui_apps>

<rules>
- One confirmation for the whole batch; propose everything missing (CLIs + GUI) together, then install without re-prompting per tool.
- Idempotent: never touch a tool already on PATH.
- OS-aware: detect with `uname`/PowerShell and use the matching install command — never run `brew` on Linux/Windows.
- Don't manage the user's Node version or shell config beyond what an install strictly requires.
- Installs tools only — it never logs in or writes credentials. Authentication is `/ns accounts`.
- Report skipped/missing honestly; re-check `command -v` before claiming a tool is ready.
</rules>

<verification>
```bash
node scripts/check-setup.mjs --accounts   # CLI presence + auth view
for c in node bun eas vercel asc gpc fastlane gcloud; do command -v $c >/dev/null && echo "ok $c" || echo "MISSING $c"; done
xcodebuild -version >/dev/null 2>&1 && echo "ok xcode" || echo "MISSING xcode"
command -v adb >/dev/null && echo "ok android" || echo "MISSING android-studio"
```
End by recommending `/ns accounts` to log in and wire credentials.
</verification>
