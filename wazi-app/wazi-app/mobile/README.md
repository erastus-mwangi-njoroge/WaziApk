# WAZI mobile (Flutter, Android)

This is complete, hand-written Flutter source — **it has not been compiled
or run** (this sandbox has no Flutter SDK), so treat first build as the
first real test and expect to fix small issues, same as any new checkout.
It talks **directly to Firebase** (Auth, Firestore, Storage) — the same
project the Angular web app uses, no custom backend server involved.

## Automatic APK builds (GitHub Actions)

Every push to `main` builds a release APK and attaches it to the workflow run
(`.github/workflows/build-apk.yml` at the repo root). It runs on Android 6.0
(API 23) and newer; the workflow fails if the built APK's minSdk isn't 23.

**One-time setup**

1. In Firebase Console → Project settings → *Your apps*, register an **Android app
   with package name `com.wazi.wazi`** and download its `google-services.json`.
2. In GitHub: *Settings → Secrets and variables → Actions → New repository secret*
   → name `GOOGLE_SERVICES_JSON`, value = the **entire contents** of that file.
   (Alternative: commit the file as `mobile/google-services.json`. Firebase client
   config isn't secret — your Firestore/Storage rules are what protect the data —
   but a secret keeps it out of the repo.)
3. Push to `main` (or run it by hand: *Actions → Build Android APK → Run workflow*).

**Getting the APK:** open the finished run in the *Actions* tab → scroll to
**Artifacts** → download `wazi-android-apk` → unzip → copy the `.apk` to your
phone and open it (allow "install unknown apps" for your browser/file manager).
Artifacts are kept for 30 days.

**How it works:** the repo only stores `lib/` + `pubspec.yaml`, so CI runs
`flutter create` to generate `android/` with a pinned Flutter version, restores
our `lib/` and `pubspec.yaml`, runs `tools/patch_android.py` (minSdk 23,
permissions, app name "WAZI"), generates the launcher icons from the WAZI logo,
and builds. Firebase config is passed to the app at build time
(`tools/google_services_to_defines.py` → `--dart-define-from-file`), so no Gradle
plugin wiring is needed.

**Signing:** builds are signed with `signing/wazi-dev.keystore` — a development
key (the same alias/passwords as Android's standard debug key), so each new APK
installs over the previous one. It is *not* private. For Play Store or any
distribution beyond testing, create your own keystore (alias `androiddebugkey`,
store/key password `android`), base64 it, and add it as the secret
`ANDROID_KEYSTORE_BASE64`; the workflow will use it instead. For a proper Play
upload key you'll also want to set up a dedicated release `signingConfig` in Gradle.

**If the first run fails:** this source was written without a Flutter toolchain, so
the first CI run is its first real compile. The log's "Analyze (informational)" step
lists problems; the usual fixes are small. `FLUTTER_VERSION` in the workflow is pinned
for repeatable builds — bump it deliberately.

## 1. Prerequisites

- Flutter SDK installed (`flutter doctor` should be clean for Android)
- Android Studio or an Android SDK + emulator (or a physical device with
  USB debugging on)
- A Firebase project set up per `../firebase/README.md` (Authentication
  with Email/Password enabled, Firestore, Storage, and the security rules
  + Cloud Function deployed)

## 2. Create the platform scaffolding

This repo only ships the Dart source (`lib/`) and `pubspec.yaml` — not the
generated `android/`, `ios/`, etc. folders, since those are large,
version-specific, and `flutter create` generates them correctly for
whatever Flutter version you have installed.

```
cd mobile
flutter create --org com.wazi --project-name wazi .
```

This will *not* overwrite `lib/` or `pubspec.yaml` if you answer "no" to
any overwrite prompt for those two — if it does prompt to overwrite them,
say no (or just re-copy them back from this repo afterwards).

## 3. Patch the generated project and create the icons

```
python3 tools/patch_android.py android 23      # minSdk 23 (Android 6), permissions, app name
flutter pub get
dart run flutter_launcher_icons -f flutter_launcher_icons.yaml
```

(`tools/patch_android.py` replaces the manual manifest edit; the permissions it
adds are the ones in `android_manifest_snippet/`. The icons come from `assets/icon/`,
which is generated from `../branding/` — see "Logo" below.)

## 4. Connect the app to your Firebase project

The easiest, most reliable path is the FlutterFire CLI, which registers an
Android app in your Firebase project, downloads `google-services.json`
into the right place, adds the Gradle plugin wiring automatically, and
generates `lib/firebase_options.dart`:

```
dart pub global activate flutterfire_cli
flutterfire configure
```

Pick your existing Firebase project (the one from `../firebase/README.md`)
and select Android as the platform. Once it finishes, open `lib/main.dart`
and follow the comment there — add `import "firebase_options.dart";` and
switch the `Firebase.initializeApp()` call to pass
`options: DefaultFirebaseOptions.currentPlatform`.

**Manual alternative**, if you'd rather not use the CLI: register an
Android app in the Firebase Console (package name `com.wazi.wazi`, or
whatever `--org` you used above), download `google-services.json` into
`android/app/`, then add the Google Services Gradle plugin:

- In `android/build.gradle.kts` (or `.gradle`), add to the `plugins` block:
  `id("com.google.gms.google-services") version "4.4.2" apply false`
- In `android/app/build.gradle.kts` (or `.gradle`), add to the `plugins`
  block: `id("com.google.gms.google-services")`

Either way, `lib/main.dart`'s no-args `Firebase.initializeApp()` call works
fine for this Android-only setup once `google-services.json` is in place.

## 5. Install packages and run

```
flutter pub get
flutter run
```

## What's included

- Email/password sign in & sign up (Firebase Auth), choosing owner or tenant
- Browse & filter by town, house type, and max price, with the same
  amenity-radar visual as the web app
- Listing detail with a photo gallery (premise photo first, then interiors),
  full amenity breakdown, "Contact owner" (opens the dialer), and
  save/favorite
- Owner: post a listing with a **required** whole-premise photo plus up to
  8 optional interior photos (camera or gallery) uploaded to Firebase
  Storage, mark vacant/occupied, delete
- Tenant: saved homes, a preferences form (town/type/price) that drives
  vacancy alerts, and a notifications tab (polled every 20s while the app
  is open, populated by the `notifyMatchingTenants` Cloud Function)

## Towns

The town pickers list every urban centre in Kenya, grouped by county, with a search
box. The list lives in `../data/kenya_towns.json`; to add a town (or an area inside
one), edit that file and run `python3 ../tools/gen_towns.py`
then commit the regenerated `lib/data/kenya_towns.dart` and
`frontend/src/app/core/kenya-towns.ts`. Listings store a plain string —
`Kitengela` or `Nairobi — Kilimani` — so older listings keep working. Choosing a
bare town (e.g. `Nairobi`) in a filter or alert matches all of its areas.

## Logo

A house with its door open ("wazi" = open/vacant) inside the five-axis amenity radar.
Edit and re-render with `python3 ../branding/make_icons.py` (needs `pip install cairosvg`).

## Known limitations to fix as you take this further

- Firebase Auth persists the session on-device automatically (no manual
  token storage needed, unlike the old REST version) — nothing to do here,
  just worth knowing why `shared_preferences` is gone from `pubspec.yaml`.
- Notifications are polled, not push — wire up Firebase Cloud Messaging
  (store each device's FCM token on the user's Firestore doc, then call
  the FCM Admin SDK from inside `notifyMatchingTenants` in
  `../firebase/functions/index.js`) for true real-time push instead of the
  20-second poll.
- No image compression beyond `image_picker`'s built-in `imageQuality: 85`
  — fine for typical phone photos, but consider stricter limits if data
  usage is a concern for your users.
- Deleting a listing doesn't delete its Storage images — same caveat as
  the web app, see `../firebase/storage.rules`.
