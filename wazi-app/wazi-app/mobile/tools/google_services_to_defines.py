#!/usr/bin/env python3
"""Turn a Firebase google-services.json into a --dart-define-from-file JSON.

    python3 tools/google_services_to_defines.py google-services.json com.wazi.wazi out.json

The Android app registered in Firebase must use the given package name. Nothing
secret is printed; (Firebase API keys identify the project — access is enforced
by your Firestore/Storage security rules — but we still keep them out of logs.)
"""
import json, sys

src, package, out = sys.argv[1:4]
try:
    data = json.load(open(src, encoding="utf-8"))
except Exception as e:
    sys.exit(f"{src} is not valid JSON ({e}). Paste the whole file contents into the GOOGLE_SERVICES_JSON secret.")

clients = data.get("client", [])
found = [c for c in clients if c.get("client_info", {}).get("android_client_info", {}).get("package_name") == package]
if not found:
    have = [c.get("client_info", {}).get("android_client_info", {}).get("package_name") for c in clients]
    sys.exit(f"No Android app with package '{package}' in google-services.json (found: {have}). "
             f"Register an Android app with that package name in the Firebase console and download the file again.")
c = found[0]
info = data.get("project_info", {})
try:
    defines = {
        "FIREBASE_API_KEY": c["api_key"][0]["current_key"],
        "FIREBASE_APP_ID": c["client_info"]["mobilesdk_app_id"],
        "FIREBASE_MESSAGING_SENDER_ID": info["project_number"],
        "FIREBASE_PROJECT_ID": info["project_id"],
        "FIREBASE_STORAGE_BUCKET": info.get("storage_bucket", ""),
    }
except (KeyError, IndexError) as e:
    sys.exit(f"google-services.json is missing an expected field: {e}")

json.dump(defines, open(out, "w"))
print(f"Firebase project '{defines['FIREBASE_PROJECT_ID']}', Android package '{package}' -> {out}")
# hide the key if it ever appears in later log lines
print(f"::add-mask::{defines['FIREBASE_API_KEY']}")
