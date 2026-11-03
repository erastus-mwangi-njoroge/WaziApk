import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "../state/app_state.dart";
import "../theme.dart";
import "home_shell.dart";

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await context.read<AppState>().bootstrap();
      if (mounted) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeShell()));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: WaziColors.paper,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _BrandMark(),
            SizedBox(height: 14),
            Text("wazi", style: TextStyle(fontSize: 30, fontWeight: FontWeight.w700, fontStyle: FontStyle.italic, color: WaziColors.greenDark)),
            SizedBox(height: 6),
            Text("nyumba wazi, karibu nyumbani", style: TextStyle(fontSize: 12.5, color: WaziColors.inkSoft)),
            SizedBox(height: 26),
            SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: WaziColors.rust)),
          ],
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();
  @override
  Widget build(BuildContext context) {
    // The WAZI mark: a house with its door open, inside the amenity radar.
    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: Image.asset("assets/icon/wazi_logo_512.png", width: 96, height: 96, semanticLabel: "WAZI logo"),
    );
  }
}
