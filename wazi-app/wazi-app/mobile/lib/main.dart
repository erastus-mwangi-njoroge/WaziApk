import "package:firebase_core/firebase_core.dart";
import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "firebase_config.dart";
import "state/app_state.dart";
import "theme.dart";
import "screens/splash_screen.dart";

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Release builds from CI pass the Firebase config with --dart-define (see
  // firebase_config.dart). For local development, `flutterfire configure` /
  // google-services.json (mobile/README.md) still works via the no-args call.
  final options = WaziFirebaseOptions.currentPlatform;
  if (options != null) {
    await Firebase.initializeApp(options: options);
  } else {
    await Firebase.initializeApp();
  }
  runApp(const WaziApp());
}

class WaziApp extends StatelessWidget {
  const WaziApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(),
      child: MaterialApp(
        title: "WAZI",
        debugShowCheckedModeBanner: false,
        theme: buildWaziTheme(),
        home: const SplashScreen(),
      ),
    );
  }
}
