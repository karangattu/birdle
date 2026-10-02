# Birdle 🐦

A fast-paced backyard bird-spotting game. Birds appear in the trees and play their calls - tap the matching button before they fly off. Build combos for big multipliers; misidentify and lose points (and your streak).

## How to play

1. **Start** the game from the title screen.
2. Choose a difficulty:
   - **Regular** – slower birds, fewer at once.
   - **Expert** – faster birds, crowded trees, bigger rewards.
3. When a bird appears, listen for its call and tap its name from the bottom panel.
4. Correct ID = points + combo multiplier. Wrong ID = points off + combo reset.
5. You have 60 seconds. Best score per difficulty is saved locally, and the global top 5 leaderboard.

## Birds you'll spot

American Crow · American Robin · Black Phoebe · California Towhee · Cedar Waxwing · Dark-eyed Junco · Hermit Thrush · House Finch · Scrub Jay · Spotted Towhee

![Birdle Reference Sheet](assets/reference_sheet.png)

## Run locally

It's a static site — no build step.

```bash
# any static server works, for example:
python3 -m http.server 8000
# then open http://localhost:8000
```

## Android APK

`android/` is a minimal native wrapper that hosts the PWA in a fullscreen
landscape WebView, fully offline. Launcher icons are generated from the same
file the PWA manifest uses (`assets/pwa-icon-512.png`).

### Download the latest build

Grab the current release APK (always the newest tagged release):

<https://github.com/karangattu/birdle/releases/latest/download/birdle.apk>

Copy it to the tablet, tap it, and allow installs from your file manager when
Android asks. To upgrade later, install the newer APK over the old one — the
signing key never changes, so no uninstall is needed.

### Cut a release

Push a version tag. CI builds the release APK with `versionName`/`versionCode`
derived from the tag, verifies the signature, and attaches `birdle.apk` to a
new GitHub Release.

```bash
git tag v1.1.0
git push origin v1.1.0
```

Tag must be exactly `vMAJOR.MINOR.PATCH`; `versionCode` is
`MAJOR*10000 + MINOR*100 + PATCH`. Every other push to `main` still builds a
debug APK in CI as a compile check (`.github/workflows/android.yml`), and it is
never published.

### Build locally

Gradle needs a JDK 17 `JAVA_HOME` (AGP 8.6 rejects newer JDKs).

```bash
export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
npm run apk:icons           # regenerate launcher icons from the PWA icon
npm run apk:build           # sync web assets + build the debug APK
npm run apk:build:release   # sync web assets + build the signed release APK
```

Debug lands at `android/app/build/outputs/apk/debug/app-debug.apk` (debug-signed,
`.debug` app id so it installs alongside a release). Release lands at
`android/app/build/outputs/apk/release/app-release.apk`:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Signing

`android/birdle-release.keystore` and `android/keystore.properties` are both
committed on purpose. Birdle is sideloaded, never on the Play Store, so the
self-signed key has nothing behind it to protect — its only job is to stay
identical forever so installs can be upgraded in place. **Do not regenerate
it.** Sign with a different key instead by passing
`-PBIRDLE_STORE_FILE=... -PBIRDLE_STORE_PASSWORD=... -PBIRDLE_KEY_ALIAS=...
-PBIRDLE_KEY_PASSWORD=...` to Gradle, which overrides `keystore.properties`.
