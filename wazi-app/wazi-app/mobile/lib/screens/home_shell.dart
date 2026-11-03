import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "../models/models.dart";
import "../state/app_state.dart";
import "../theme.dart";
import "auth_screen.dart";
import "browse_screen.dart";
import "owner_dashboard_screen.dart";
import "tenant_dashboard_screen.dart";

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.user;

    final tabs = <Widget>[const BrowseScreen()];
    final items = <BottomNavigationBarItem>[const BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: "Browse")];

    if (user != null && user.role == "owner") {
      tabs.add(const OwnerDashboardScreen());
      items.add(const BottomNavigationBarItem(icon: Icon(Icons.apartment_outlined), activeIcon: Icon(Icons.apartment), label: "My listings"));
    } else if (user != null && user.role == "tenant") {
      tabs.add(const TenantDashboardScreen());
      items.add(BottomNavigationBarItem(
        icon: Badge(
          isLabelVisible: state.unreadCount > 0,
          label: Text("${state.unreadCount}"),
          child: const Icon(Icons.favorite_border),
        ),
        activeIcon: const Icon(Icons.favorite),
        label: "Saved",
      ));
    }

    tabs.add(_AccountTab(user: user));
    items.add(BottomNavigationBarItem(icon: const Icon(Icons.person_outline), activeIcon: const Icon(Icons.person), label: user == null ? "Sign in" : "Account"));

    final safeIndex = index < tabs.length ? index : 0;

    return Scaffold(
      body: IndexedStack(index: safeIndex, children: tabs),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: safeIndex,
        onTap: (i) => setState(() => index = i),
        type: BottomNavigationBarType.fixed,
        backgroundColor: WaziColors.white,
        selectedItemColor: WaziColors.rust,
        unselectedItemColor: WaziColors.inkSoft,
        items: items,
      ),
    );
  }
}

class _AccountTab extends StatelessWidget {
  final WaziUser? user;
  const _AccountTab({required this.user});

  @override
  Widget build(BuildContext context) {
    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: const Text("Account")),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(30),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text("You're browsing as a guest", style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              const Text("Sign in to post houses, save favourites, and get vacancy alerts.", textAlign: TextAlign.center, style: TextStyle(color: WaziColors.inkSoft)),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuthScreen())),
                child: const Text("Sign in / Sign up"),
              ),
            ]),
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text("Account")),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(children: [
            CircleAvatar(radius: 26, backgroundColor: WaziColors.rust, child: Text(user.name.isNotEmpty ? user.name[0].toUpperCase() : "U", style: const TextStyle(color: Colors.white, fontSize: 18))),
            const SizedBox(width: 14),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(user.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
              Text(user.role == "owner" ? "Property owner" : "Tenant", style: const TextStyle(color: WaziColors.inkSoft)),
            ]),
          ]),
          const SizedBox(height: 24),
          _InfoRow(label: "Email", value: user.email),
          _InfoRow(label: "Phone", value: user.phone.isEmpty ? "—" : user.phone),
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () => context.read<AppState>().logout(),
            child: const Text("Log out"),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(children: [
          SizedBox(width: 70, child: Text(label, style: const TextStyle(color: WaziColors.inkSoft, fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ]),
      );
}
