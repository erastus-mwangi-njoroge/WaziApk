import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "../models/models.dart";
import "../state/app_state.dart";
import "../theme.dart";
import "../widgets/listing_card.dart";
import "../widgets/town_picker.dart";
import "listing_detail_screen.dart";

class TenantDashboardScreen extends StatefulWidget {
  const TenantDashboardScreen({super.key});
  @override
  State<TenantDashboardScreen> createState() => _TenantDashboardScreenState();
}

class _TenantDashboardScreenState extends State<TenantDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController tabController;

  @override
  void initState() {
    super.initState();
    tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<AppState>().markNotificationsRead());
  }

  @override
  void dispose() {
    tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(
        title: const Text("Saved & alerts"),
        bottom: TabBar(
          controller: tabController,
          labelColor: WaziColors.ink,
          unselectedLabelColor: WaziColors.inkSoft,
          indicatorColor: WaziColors.rust,
          tabs: const [Tab(text: "Saved"), Tab(text: "Preferences"), Tab(text: "Notifications")],
        ),
      ),
      body: TabBarView(
        controller: tabController,
        children: [
          _SavedTab(state: state),
          const _PreferencesTab(),
          _NotificationsTab(state: state),
        ],
      ),
    );
  }
}

class _SavedTab extends StatelessWidget {
  final AppState state;
  const _SavedTab({required this.state});
  @override
  Widget build(BuildContext context) {
    final saved = state.savedListings;
    if (saved.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(30),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text("No saved homes yet", style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
            SizedBox(height: 6),
            Text("Tap the heart on any listing to save it here.", style: TextStyle(color: WaziColors.inkSoft)),
          ]),
        ),
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 0.66),
      itemCount: saved.length,
      itemBuilder: (context, i) {
        final l = saved[i];
        return ListingCard(
          listing: l,
          isFavorite: true,
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ListingDetailScreen(listingId: l.id))),
          onToggleFavorite: () => state.toggleFavorite(l.id),
        );
      },
    );
  }
}

class _PreferencesTab extends StatefulWidget {
  const _PreferencesTab();
  @override
  State<_PreferencesTab> createState() => _PreferencesTabState();
}

class _PreferencesTabState extends State<_PreferencesTab> {
  late String town;
  late String type;
  final minCtrl = TextEditingController();
  final maxCtrl = TextEditingController();
  bool saving = false;
  String? message;

  @override
  void initState() {
    super.initState();
    final p = context.read<AppState>().prefs;
    town = p.town;
    type = p.type;
    minCtrl.text = p.minPrice;
    maxCtrl.text = p.maxPrice;
  }

  @override
  void dispose() {
    minCtrl.dispose();
    maxCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() { saving = true; message = null; });
    final err = await context.read<AppState>().savePreferences(
      TenantPreferences(town: town, type: type, minPrice: minCtrl.text.trim(), maxPrice: maxCtrl.text.trim()),
    );
    if (!mounted) return;
    setState(() { saving = false; message = err ?? "Saved — we'll alert you when a match appears."; });
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text("Alert me when a matching house is vacant", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, fontFamily: "serif")),
              const SizedBox(height: 16),
              if (message != null) Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(message!, style: const TextStyle(color: WaziColors.greenDark, fontSize: 13)),
              ),
              const Text("PREFERRED TOWN/AREA", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: WaziColors.inkSoft)),
              const SizedBox(height: 6),
              TownPicker(value: town, includeAny: true, onChanged: (v) => setState(() => town = v)),
              const SizedBox(height: 14),
              const Text("HOUSE TYPE", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: WaziColors.inkSoft)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(value: type, items: ["Any", ...kHouseTypes].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(), onChanged: (v) => setState(() => type = v!)),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: TextField(controller: minCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: "Min price (KSh)"))),
                const SizedBox(width: 10),
                Expanded(child: TextField(controller: maxCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: "Max price (KSh)"))),
              ]),
              const SizedBox(height: 18),
              ElevatedButton(
                onPressed: saving ? null : _save,
                child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text("Save preferences"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationsTab extends StatelessWidget {
  final AppState state;
  const _NotificationsTab({required this.state});
  @override
  Widget build(BuildContext context) {
    if (state.notifications.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(30),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text("No notifications yet", style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
            SizedBox(height: 6),
            Text("Set your preferences and we'll let you know when a matching house opens up.", textAlign: TextAlign.center, style: TextStyle(color: WaziColors.inkSoft)),
          ]),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: state.notifications.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final n = state.notifications[i];
        return InkWell(
          onTap: n.listingId == null ? null : () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ListingDetailScreen(listingId: n.listingId!))),
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WaziColors.card, border: Border.all(color: WaziColors.line), borderRadius: BorderRadius.circular(10)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                margin: const EdgeInsets.only(top: 6),
                width: 8, height: 8,
                decoration: BoxDecoration(color: n.read ? WaziColors.line : WaziColors.rust, shape: BoxShape.circle),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(n.message, style: const TextStyle(fontSize: 14)),
                  const SizedBox(height: 3),
                  Text(timeAgo(n.date), style: const TextStyle(fontSize: 12, color: WaziColors.inkSoft)),
                ]),
              ),
            ]),
          ),
        );
      },
    );
  }
}
