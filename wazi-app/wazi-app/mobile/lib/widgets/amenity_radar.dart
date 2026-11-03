import "dart:math" as math;
import "package:flutter/material.dart";
import "../models/models.dart";
import "../theme.dart";

class AmenityRadar extends StatelessWidget {
  final Amenities amenities;
  final double size;
  const AmenityRadar({super.key, required this.amenities, this.size = 56});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _RadarPainter(amenities)),
    );
  }
}

class _RadarPainter extends CustomPainter {
  final Amenities amenities;
  _RadarPainter(this.amenities);

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = size.width / 2 - 10;
    final axes = amenities.axes; // 5 entries: (label, icon, km)
    final n = axes.length;

    final axisPaint = Paint()
      ..color = WaziColors.ink.withOpacity(0.10)
      ..strokeWidth = 1;
    final ringPaint = Paint()
      ..color = WaziColors.ink.withOpacity(0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final fillPaint = Paint()
      ..color = WaziColors.green.withOpacity(0.35)
      ..style = PaintingStyle.fill;
    final strokePaint = Paint()
      ..color = WaziColors.green
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6;

    canvas.drawCircle(Offset(cx, cy), r, ringPaint);

    final points = <Offset>[];
    for (int i = 0; i < n; i++) {
      final angle = (2 * math.pi * i / n) - math.pi / 2;
      final axisEnd = Offset(cx + r * math.cos(angle), cy + r * math.sin(angle));
      canvas.drawLine(Offset(cx, cy), axisEnd, axisPaint);

      final km = axes[i].$3;
      final score = (1 - km / 6).clamp(0.08, 1.0);
      final rad = r * (0.22 + 0.78 * score);
      points.add(Offset(cx + rad * math.cos(angle), cy + rad * math.sin(angle)));
    }

    final path = Path()..addPolygon(points, true);
    canvas.drawPath(path, fillPaint);
    canvas.drawPath(path, strokePaint);
  }

  @override
  bool shouldRepaint(covariant _RadarPainter oldDelegate) => oldDelegate.amenities != amenities;
}
