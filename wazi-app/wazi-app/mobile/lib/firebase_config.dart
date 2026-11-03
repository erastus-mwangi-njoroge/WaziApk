import "package:firebase_core/firebase_core.dart";

/// Firebase config for Android, supplied at build time with --dart-define
/// (the CI workflow generates these from the GOOGLE_SERVICES_JSON secret):
///
///   flutter build apk --dart-define-from-file=firebase-defines.json
///
/// If no defines are given, [currentPlatform] is null and main.dart falls back to
/// the no-argument Firebase.initializeApp(), which reads android/app/google-services.json
/// (the setup described in mobile/README.md for local development).
class WaziFirebaseOptions {
  static const _apiKey = String.fromEnvironment("FIREBASE_API_KEY");
  static const _appId = String.fromEnvironment("FIREBASE_APP_ID");
  static const _messagingSenderId = String.fromEnvironment("FIREBASE_MESSAGING_SENDER_ID");
  static const _projectId = String.fromEnvironment("FIREBASE_PROJECT_ID");
  static const _storageBucket = String.fromEnvironment("FIREBASE_STORAGE_BUCKET");

  static FirebaseOptions? get currentPlatform {
    if (_apiKey.isEmpty || _appId.isEmpty || _projectId.isEmpty) return null;
    return const FirebaseOptions(
      apiKey: _apiKey,
      appId: _appId,
      messagingSenderId: _messagingSenderId,
      projectId: _projectId,
      storageBucket: _storageBucket,
    );
  }
}
