import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "../state/app_state.dart";
import "../theme.dart";
import "../widgets/listing_card.dart";
import "../widgets/town_picker.dart";
import "auth_screen.dart";
import "listing_detail_screen.dart";

class BrowseScreen extends StatefulWidget {
  const BrowseScreen({super.key});
  @override
  State<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends State<BrowseScreen> {
  final maxPriceCtrl = TextEditingController();

  @override
  void dispose() {
    maxPriceCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return RefreshIndicator(
      onRefresh: state.loadListings,
      color: WaziColors.rust,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _Header(state: state, maxPriceCtrl: maxPriceCtrl)),
          SliverToBoxAdapter(child: _TypeChips(state: state)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Available now", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, fontFamily: "serif")),
                  Text("${state.listings.length} listings", style: const TextStyle(fontSize: 12.5, color: WaziColors.inkSoft, fontFamily: "monospace")),
                ],
              ),
            ),
          ),
          if (state.listingsLoading && state.listings.isEmpty)
            const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.all(60), child: Center(child: CircularProgressIndicator(color: WaziColors.rust))))
          else if (state.listings.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 60, horizontal: 24),
                child: Center(
                  child: Column(children: [
                    Text("No listings match yet", style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
                    SizedBox(height: 6),
                    Text("Try widening your filters.", style: TextStyle(color: WaziColors.inkSoft)),
                  ]),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 0.66),
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    final l = state.listings[i];
                    return ListingCard(
                      listing: l,
                      isFavorite: state.isFavorite(l.id),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ListingDetailScreen(listingId: l.id))),
                      onToggleFavorite: () {
                        if (state.user == null) {
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuthScreen(initialRole: "tenant")));
                          return;
                        }
                        state.toggleFavorite(l.id);
                      },
                    );
                  },
                  childCount: state.listings.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final AppState state;
  final TextEditingController maxPriceCtrl;
  const _Header({required this.state, required this.maxPriceCtrl});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 20),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: WaziColors.line))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: WaziColors.greenTint, borderRadius: BorderRadius.circular(999)),
            child: const Text("VACANT HOUSES ACROSS KENYA", style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: WaziColors.greenDark, letterSpacing: 0.4)),
          ),
          const SizedBox(height: 12),
          RichText(
            text: const TextSpan(
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: WaziColors.ink, fontFamily: "serif", height: 1.1),
              children: [
                TextSpan(text: "Find a "),
                TextSpan(text: "vacant", style: TextStyle(fontStyle: FontStyle.italic, color: WaziColors.rust)),
                TextSpan(text: " house near what matters to you."),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(children: [
                TownPicker(
                  label: "Town / area",
                  value: state.filterTown,
                  includeAny: true,
                  onChanged: (v) { state.filterTown = v; },
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: state.filterType,
                  decoration: const InputDecoration(labelText: "House type", isDense: true),
                  items: ["Any", ...kHouseTypes].map((t) => DropdownMenuItem(value: t, child: Text(t, overflow: TextOverflow.ellipsis))).toList(),
                  onChanged: (v) { state.filterType = v ?? "Any"; },
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: maxPriceCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: "Max price (KSh)", isDense: true),
                  onChanged: (v) => state.filterMaxPrice = v,
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(onPressed: () => state.loadListings(), child: const Text("Search")),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypeChips extends StatelessWidget {
  final AppState state;
  const _TypeChips({required this.state});

  @override
  Widget build(BuildContext context) {
    final types = ["Any", ...kHouseTypes];
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        itemCount: types.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final t = types[i];
          final selected = state.filterType == t;
          return ChoiceChip(
            label: Text(t, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: selected ? Colors.white : WaziColors.inkSoft)),
            selected: selected,
            selectedColor: WaziColors.ink,
            backgroundColor: WaziColors.card,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999), side: const BorderSide(color: WaziColors.line)),
            onSelected: (_) { state.filterType = t; state.loadListings(); },
          );
        },
      ),
    );
  }
}
