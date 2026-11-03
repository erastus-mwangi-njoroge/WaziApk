import "package:flutter/material.dart";
import "data/kenya_towns.dart";

class WaziColors {
  static const ink = Color(0xFF22281F);
  static const inkSoft = Color(0xFF4A5142);
  static const paper = Color(0xFFEDE7DA);
  static const paper2 = Color(0xFFE2DAC5);
  static const card = Color(0xFFF7F3E8);
  static const white = Color(0xFFFFFDF6);
  static const green = Color(0xFF2F6F4E);
  static const greenDark = Color(0xFF1F4E37);
  static const greenTint = Color(0xFFDEE9DF);
  static const rust = Color(0xFFB8631F);
  static const amber = Color(0xFFE3A72E);
  static const line = Color(0x2422281F);
}

ThemeData buildWaziTheme() {
  final base = ThemeData(useMaterial3: true, fontFamily: "Roboto");
  return base.copyWith(
    scaffoldBackgroundColor: WaziColors.paper,
    colorScheme: base.colorScheme.copyWith(
      primary: WaziColors.rust,
      secondary: WaziColors.green,
      surface: WaziColors.card,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: WaziColors.paper,
      foregroundColor: WaziColors.ink,
      elevation: 0,
      centerTitle: false,
    ),
    textTheme: base.textTheme.apply(bodyColor: WaziColors.ink, displayColor: WaziColors.ink),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: WaziColors.rust,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: WaziColors.ink,
        side: const BorderSide(color: WaziColors.ink, width: 1.2),
        padding: const EdgeInsets.symmetric(vertical: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: WaziColors.paper,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(9), borderSide: const BorderSide(color: WaziColors.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(9), borderSide: const BorderSide(color: WaziColors.line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(9), borderSide: const BorderSide(color: WaziColors.rust, width: 1.6)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    ),
    cardTheme: CardThemeData(
      color: WaziColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: WaziColors.line)),
    ),
  );
}

String fmtPrice(num n) {
  final s = n.toStringAsFixed(0);
  final buf = StringBuffer();
  for (int i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(",");
    buf.write(s[i]);
  }
  return "KSh $buf";
}

String timeAgo(DateTime date) {
  final diff = DateTime.now().difference(date);
  if (diff.inMinutes < 1) return "just now";
  if (diff.inMinutes < 60) return "${diff.inMinutes}m ago";
  if (diff.inHours < 24) return "${diff.inHours}h ago";
  return "${diff.inDays}d ago";
}

const List<String> kHouseTypes = [
  "Single Room", "Double Room", "Bedsitter", "Shop", "One Bedroom",
  "Two Bedroom", "Three Bedroom", "Own Compound", "Maisonette",
];

/// Every urban centre in Kenya, flat. Grouped-by-county data is in data/kenya_towns.dart
/// (generated from data/kenya_towns.json by tools/gen_towns.py).
final List<String> kTowns = [for (final g in kTownGroups) ...g.options];

/// Does a listing in [listingTown] satisfy a filter / alert for [wanted]?
/// "Any" (or empty) matches everything. A bare town ("Nairobi") also matches its
/// areas ("Nairobi — Kilimani"); an area filter must match exactly.
bool townMatches(String? wanted, String listingTown) {
  if (wanted == null || wanted.isEmpty || wanted == "Any") return true;
  return listingTown == wanted || listingTown.startsWith("$wanted — ");
}
