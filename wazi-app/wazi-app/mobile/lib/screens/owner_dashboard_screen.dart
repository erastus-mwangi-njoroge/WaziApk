import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "../models/models.dart";
import "../state/app_state.dart";
import "../theme.dart";
import "add_listing_screen.dart";
import "listing_detail_screen.dart";

class OwnerDashboardScreen extends StatelessWidget {
  const OwnerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final mine = state.myListings;
    return Scaffold(
      appBar: AppBar(
        title: const Text("My listings"),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: "Add a listing",
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AddListingScreen())),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AddListingScreen())),
        backgroundColor: WaziColors.rust,
        icon: const Icon(Icons.add),
        label: const Text("Add listing"),
      ),
      body: mine.isEmpty
          ? const _EmptyState(title: "No listings yet", subtitle: "Add your first vacant house so tenants nearby can find it.")
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: mine.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) => _OwnerListingRow(listing: mine[i]),
            ),
    );
  }
}

class _OwnerListingRow extends StatelessWidget {
  final Listing listing;
  const _OwnerListingRow({required this.listing});

  @override
  Widget build(BuildContext context) {
    final state = context.read<AppState>();
    final imgUrl = listing.premiseImage ?? '';
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: WaziColors.card, border: Border.all(color: WaziColors.line), borderRadius: BorderRadius.circular(12)),
      child: Row(children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: imgUrl.isEmpty
              ? Container(width: 70, height: 56, color: WaziColors.paper2)
              : Image.network(imgUrl, width: 70, height: 56, fit: BoxFit.cover),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(listing.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5)),
              const SizedBox(height: 2),
              Text("${listing.town} · ${fmtPrice(listing.price)}/mo", style: const TextStyle(fontSize: 12, color: WaziColors.inkSoft)),
              const SizedBox(height: 8),
              Wrap(spacing: 6, runSpacing: 6, children: [
                _PillButton(label: "View", onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ListingDetailScreen(listingId: listing.id)))),
                _PillButton(
                  label: listing.status == "vacant" ? "Vacant" : "Mark vacant",
                  highlighted: listing.status == "vacant",
                  onTap: () => state.toggleListingStatus(listing),
                ),
                _PillButton(label: "Delete", danger: true, onTap: () => state.deleteListing(listing.id)),
              ]),
            ],
          ),
        ),
      ]),
    );
  }
}

class _PillButton extends StatelessWidget {
  final String label;
  final bool highlighted;
  final bool danger;
  final VoidCallback onTap;
  const _PillButton({required this.label, required this.onTap, this.highlighted = false, this.danger = false});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: highlighted ? WaziColors.green : WaziColors.white,
          border: Border.all(color: highlighted ? WaziColors.green : WaziColors.line),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: highlighted ? Colors.white : (danger ? const Color(0xFF9C3A2B) : WaziColors.ink))),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String title;
  final String subtitle;
  const _EmptyState({required this.title, required this.subtitle});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(30),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: WaziColors.inkSoft)),
          ]),
        ),
      );
}
