#!/usr/bin/env python3
"""Patch the `flutter create`-generated android/ folder for WAZI.

    python3 tools/patch_android.py android 23

  * minSdk -> 23 (Android 6.0). Firebase's Android SDKs need 23+ anyway.
  * adds INTERNET / camera / gallery permissions (see android_manifest_snippet/)
  * names the app "WAZI"

Idempotent, and fails loudly if the generated files don't look as expected,
so a Flutter template change can't silently produce a wrong APK.
"""
import pathlib, re, sys

android = pathlib.Path(sys.argv[1])
min_sdk = sys.argv[2] if len(sys.argv) > 2 else "23"

# ---- AndroidManifest.xml -------------------------------------------------------------
manifest = android / "app" / "src" / "main" / "AndroidManifest.xml"
m = manifest.read_text(encoding="utf-8")

wanted = [
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.CAMERA" />',
    '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '<uses-feature android:name="android.hardware.camera" android:required="false" />',
]
missing = [w for w in wanted if re.search(r'android:name="%s"' % re.escape(re.search(r'android:name="([^"]+)"', w).group(1)), m) is None]
if missing:
    if "<application" not in m:
        sys.exit("AndroidManifest.xml has no <application> element — template changed?")
    block = "".join(f"    {w}\n" for w in missing)
    m = re.sub(r"^[ \t]*<application", lambda _: block + "    <application", m, count=1, flags=re.M)

m, n = re.subn(r'(<application[^>]*?android:label=")[^"]*(")', r"\1WAZI\2", m, count=1, flags=re.S)
if n != 1:
    sys.exit("Could not find android:label on <application> — template changed?")
manifest.write_text(m, encoding="utf-8")

# ---- app/build.gradle(.kts): minSdk ----------------------------------------------------
gradle = next((p for p in (android / "app" / "build.gradle.kts", android / "app" / "build.gradle") if p.exists()), None)
if gradle is None:
    sys.exit("android/app/build.gradle(.kts) not found")
g = gradle.read_text(encoding="utf-8")
# minSdk = flutter.minSdkVersion   |   minSdkVersion flutter.minSdkVersion   |   minSdk = 21 ...
g2, n = re.subn(r"(minSdk(?:Version)?\s*=?\s*)(?:flutter\.minSdkVersion|\d+)", r"\g<1>" + min_sdk, g, count=1)
if n != 1:
    sys.exit(f"Could not find a minSdk setting in {gradle} — template changed?")
# Firebase/image_picker/url_launcher plugins need NDK 27; Flutter 3.32's default is 26.
NDK = "27.0.12077973"
g2, n = re.subn(r"ndkVersion\s*=\s*(?:flutter\.ndkVersion|\"[^\"]*\")", f'ndkVersion = "{NDK}"', g2, count=1)
if n != 1:
    sys.exit(f"Could not find ndkVersion in {gradle} — template changed?")
gradle.write_text(g2, encoding="utf-8")

print(f"patched {manifest} and {gradle} (minSdk {min_sdk}, NDK {NDK})")
