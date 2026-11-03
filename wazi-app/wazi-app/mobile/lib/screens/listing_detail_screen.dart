import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "package:url_launcher/url_launcher.dart";
import "../models/models.dart";
import "../state/app_state.dart";
import "../theme.dart";
import "auth_screen.dart";

class ListingDetailScreen extends StatefulWidget {
  final String listingId;
  const ListingDetailScreen({super.key, required this.listingId});

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  Listing? listing;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final state = context.read<AppState>();
    try {
      final cached = state.listings.where((l) => l.id == widget.listingId);
      if (cached.isNotEmpty) setState(() { listing = cached.first; loading = false; });
      final fresh = await state.api.listingDetail(widget.listingId);
      if (mounted) setState(() { listing = fresh; loading = false; });
    } catch (_) {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _call(String phone) async {
    final uri = Uri(scheme: "tel", path: phone.replaceAll(RegExp(r"\s+"), ""));
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    if (loading && listing == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: WaziColors.rust)));
    }
    if (listing == null) {
      return const Scaffold(body: Center(child: Text("Listing not found")));
    }
    final l = listing!;
    final isOwner = state.user != null && state.user!.id == l.ownerId;
    final isFav = state.isFavorite(l.id);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 260,
            backgroundColor: WaziColors.paper,
            foregroundColor: WaziColors.ink,
            flexibleSpace: FlexibleSpaceBar(background: _Gallery(listing: l)),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(l.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, fontFamily: "serif")),
                            const SizedBox(height: 4),
                            Text("${l.town} · ${l.type}", style: const TextStyle(color: WaziColors.inkSoft)),
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: l.status == "vacant" ? WaziColors.greenTint : WaziColors.paper2,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                l.status == "vacant" ? "● VACANT NOW" : "CURRENTLY OCCUPIED",
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: l.status == "vacant" ? WaziColors.greenDark : WaziColors.inkSoft),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          if (state.user == null) {
                            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuthScreen(initialRole: "tenant")));
                            return;
                          }
                          state.toggleFavorite(l.id);
                        },
                        icon: Icon(isFav ? Icons.favorite : Icons.favorite_border, color: isFav ? WaziColors.rust : WaziColors.inkSoft),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(l.desc, style: const TextStyle(fontSize: 15, height: 1.55)),
                  const SizedBox(height: 20),
                  const Divider(color: WaziColors.line),
                  const SizedBox(height: 12),
                  const Text("What's nearby", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, fontFamily: "serif")),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: WaziColors.card, border: Border.all(color: WaziColors.line), borderRadius: BorderRadius.circular(14)),
                    child: Column(
                      children: [
                        ...l.amenities.axes.map((a) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 5),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text("${a.$2}  ${a.$1}"),
                                  Text("${a.$3} km", style: const TextStyle(fontFamily: "monospace", fontWeight: FontWeight.w700, color: WaziColors.greenDark)),
                                ],
                              ),
                            )),
                        const SizedBox(height: 8),
                        Wrap(spacing: 8, runSpacing: 8, children: [
                          _UtilPill("💧 ${l.amenities.water} water"),
                          _UtilPill(l.amenities.electricity ? "⚡ Electricity connected" : "⚡ No electricity"),
                          _UtilPill("🛣 ${l.amenities.roadType} access road"),
                        ]),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: WaziColors.white, border: Border.all(color: WaziColors.line), borderRadius: BorderRadius.circular(14)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text.rich(TextSpan(children: [
                          TextSpan(text: fmtPrice(l.price), style: const TextStyle(fontFamily: "monospace", fontSize: 22, fontWeight: FontWeight.w700)),
                          const TextSpan(text: " / month", style: TextStyle(fontSize: 12.5, color: WaziColors.inkSoft)),
                        ])),
                        Text("Deposit: ${fmtPrice(l.deposit)}", style: const TextStyle(fontSize: 12.5, color: WaziColors.inkSoft)),
                        const SizedBox(height: 12),
                        Row(children: [
                          CircleAvatar(backgroundColor: WaziColors.rust, radius: 17, child: Text(l.ownerName.isNotEmpty ? l.ownerName[0].toUpperCase() : "O", style: const TextStyle(color: Colors.white))),
                          const SizedBox(width: 10),
                          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(l.ownerName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                            const Text("Property owner", style: TextStyle(fontSize: 11.5, color: WaziColors.inkSoft)),
                          ]),
                        ]),
                        const SizedBox(height: 14),
                        if (isOwner) ...[
                          SizedBox(width: double.infinity, child: OutlinedButton(
                            onPressed: () => state.toggleListingStatus(l).then((_) => _load()),
                            child: Text("Mark as ${l.status == 'vacant' ? 'occupied' : 'vacant'}"),
                          )),
                          const SizedBox(height: 8),
                          SizedBox(width: double.infinity, child: OutlinedButton(
                            style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF9C3A2B), side: const BorderSide(color: Color(0xFFE0B6A9))),
                            onPressed: () async {
                              final confirmed = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text("Delete this listing?"),
                                  content: const Text("This can't be undone."),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
                                    TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text("Delete")),
                                  ],
                                ),
                              );
                              if (confirmed == true) {
                                await state.deleteListing(l.id);
                                if (context.mounted) Navigator.of(context).pop();
                              }
                            },
                            child: const Text("Delete listing"),
                          )),
                        ] else ...[
                          SizedBox(width: double.infinity, child: ElevatedButton(
                            onPressed: () => _call(l.ownerPhone),
                            child: Text("Contact owner — ${l.ownerPhone}"),
                          )),
                          const SizedBox(height: 8),
                          SizedBox(width: double.infinity, child: OutlinedButton(
                            onPressed: () {
                              if (state.user == null) {
                                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuthScreen(initialRole: "tenant")));
                                return;
                              }
                              state.toggleFavorite(l.id);
                            },
                            child: Text(isFav ? "Saved to your list" : "Save this house"),
                          )),
                        ],
                        const SizedBox(height: 10),
                        Text("Posted ${timeAgo(l.datePosted)}.", style: const TextStyle(fontSize: 11.5, color: WaziColors.inkSoft)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _UtilPill extends StatelessWidget {
  final String text;
  const _UtilPill(this.text);
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(color: WaziColors.paper2, borderRadius: BorderRadius.circular(999)),
        child: Text(text, style: const TextStyle(fontSize: 11.5, color: WaziColors.inkSoft)),
      );
}

class _Gallery extends StatelessWidget {
  final Listing listing;
  const _Gallery({required this.listing});

  @override
  Widget build(BuildContext context) {
    final images = [
      if (listing.premiseImage != null) listing.premiseImage!,
      ...listing.interiorImages,
    ];
    if (images.isEmpty) {
      return Container(color: WaziColors.paper2, child: const Center(child: Icon(Icons.home_outlined, size: 40, color: WaziColors.inkSoft)));
    }
    return PageView.builder(
      itemCount: images.length,
      itemBuilder: (context, i) => Stack(
        fit: StackFit.expand,
        children: [
          Image.network(images[i], fit: BoxFit.cover, errorBuilder: (c, e, s) => Container(color: WaziColors.paper2)),
          if (i == 0)
            Positioned(
              bottom: 10, left: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(color: Colors.black.withOpacity(0.6), borderRadius: BorderRadius.circular(999)),
                child: const Text("🏠 Whole premise", style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ),
        ],
      ),
    );
  }
}
