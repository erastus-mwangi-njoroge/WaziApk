import "package:flutter/material.dart";
import "../models/models.dart";
import "../theme.dart";
import "amenity_radar.dart";

class ListingCard extends StatelessWidget {
  final Listing listing;
  final bool isFavorite;
  final VoidCallback onTap;
  final VoidCallback onToggleFavorite;

  const ListingCard({
    super.key,
    required this.listing,
    required this.isFavorite,
    required this.onTap,
    required this.onToggleFavorite,
  });

  @override
  Widget build(BuildContext context) {
    final imgUrl = listing.premiseImage ?? '';
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: WaziColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: WaziColors.line),
          boxShadow: const [BoxShadow(color: Color(0x1A22281F), blurRadius: 14, offset: Offset(0, 6))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 16 / 10,
                  child: imgUrl.isEmpty
                      ? Container(color: WaziColors.paper2, child: const Center(child: Icon(Icons.home_outlined, color: WaziColors.inkSoft)))
                      : Image.network(imgUrl, fit: BoxFit.cover, errorBuilder: (c, e, s) => Container(color: WaziColors.paper2, child: const Icon(Icons.broken_image_outlined, color: WaziColors.inkSoft))),
                ),
                Positioned(
                  top: 8, left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: listing.status == "occupied" ? WaziColors.inkSoft : WaziColors.amber,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      listing.status == "occupied" ? "OCCUPIED" : "VACANT",
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: listing.status == "occupied" ? Colors.white : WaziColors.ink, letterSpacing: 0.3),
                    ),
                  ),
                ),
                Positioned(
                  top: 6, right: 6,
                  child: InkWell(
                    onTap: onToggleFavorite,
                    customBorder: const CircleBorder(),
                    child: Container(
                      width: 30, height: 30,
                      decoration: const BoxDecoration(color: Color(0xE6FFFDF6), shape: BoxShape.circle),
                      child: Icon(isFavorite ? Icons.favorite : Icons.favorite_border, size: 16, color: isFavorite ? WaziColors.rust : WaziColors.inkSoft),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 6, right: 6,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(color: const Color(0xEBFFFDF6), borderRadius: BorderRadius.circular(10)),
                    child: AmenityRadar(amenities: listing.amenities, size: 46),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(listing.type.toUpperCase(), style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: WaziColors.greenDark, letterSpacing: 0.4)),
                  const SizedBox(height: 2),
                  Text(listing.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(listing.town, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: WaziColors.inkSoft)),
                  const SizedBox(height: 8),
                  Text.rich(TextSpan(children: [
                    TextSpan(text: fmtPrice(listing.price), style: const TextStyle(fontFamily: "monospace", fontSize: 15.5, fontWeight: FontWeight.w700)),
                    const TextSpan(text: " / month", style: TextStyle(fontSize: 11.5, color: WaziColors.inkSoft)),
                  ])),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
