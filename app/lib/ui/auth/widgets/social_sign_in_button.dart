import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum SocialSignInType { google, apple }

class SocialSignInButton extends StatelessWidget {
  final SocialSignInType type;
  final VoidCallback? onPressed;

  const SocialSignInButton({super.key, required this.type, this.onPressed});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final (Widget icon, String label, Color bgColor, Color textColor) =
        switch (type) {
      SocialSignInType.google => (
          const _GoogleIcon() as Widget,
          'Google로 계속하기',
          isDark ? Colors.white.withValues(alpha: 0.12) : Colors.white,
          isDark ? Colors.white : Colors.black87,
        ),
      SocialSignInType.apple => (
          Icon(Icons.apple,
              color: isDark ? Colors.white : Colors.black, size: 24) as Widget,
          'Apple로 계속하기',
          isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black,
          isDark ? Colors.white : Colors.white,
        ),
    };

    final content = ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.15)
                  : Colors.black.withValues(alpha: 0.1),
              width: 0.5,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              icon,
              const SizedBox(width: 12),
              Text(label,
                  style: TextStyle(
                      color: textColor,
                      fontSize: 16,
                      fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );

    if (onPressed == null) {
      return Opacity(opacity: 0.5, child: content);
    }

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onPressed!();
      },
      child: content,
    );
  }
}

class _GoogleIcon extends StatelessWidget {
  const _GoogleIcon();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 20,
      child: CustomPaint(
        painter: _GoogleLogoPainter(),
      ),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    final Paint bluePaint = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.fill;

    final Paint greenPaint = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.fill;

    final Paint yellowPaint = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.fill;

    final Paint redPaint = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.fill;

    final center = Offset(w / 2, h / 2);
    final radius = w / 2;

    final Path bluePath = Path()
      ..moveTo(center.dx + radius * 0.95, center.dy + radius * 0.1)
      ..arcToPoint(
        Offset(center.dx + radius * 0.1, center.dy - radius * 0.95),
        radius: Radius.circular(radius),
        clockwise: false,
      )
      ..lineTo(center.dx, center.dy)
      ..close();

    final Path redPath = Path()
      ..moveTo(center.dx + radius * 0.1, center.dy - radius * 0.95)
      ..arcToPoint(
        Offset(center.dx - radius * 0.95, center.dy - radius * 0.1),
        radius: Radius.circular(radius),
        clockwise: false,
      )
      ..lineTo(center.dx, center.dy)
      ..close();

    final Path yellowPath = Path()
      ..moveTo(center.dx - radius * 0.95, center.dy - radius * 0.1)
      ..arcToPoint(
        Offset(center.dx - radius * 0.1, center.dy + radius * 0.95),
        radius: Radius.circular(radius),
        clockwise: false,
      )
      ..lineTo(center.dx, center.dy)
      ..close();

    final Path greenPath = Path()
      ..moveTo(center.dx - radius * 0.1, center.dy + radius * 0.95)
      ..arcToPoint(
        Offset(center.dx + radius * 0.95, center.dy + radius * 0.1),
        radius: Radius.circular(radius),
        clockwise: false,
      )
      ..lineTo(center.dx, center.dy)
      ..close();

    canvas.drawPath(bluePath, bluePaint);
    canvas.drawPath(redPath, redPaint);
    canvas.drawPath(yellowPath, yellowPaint);
    canvas.drawPath(greenPath, greenPaint);

    final Paint whitePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, radius * 0.55, whitePaint);

    final rightBarRect = Rect.fromLTWH(
      center.dx - radius * 0.05,
      center.dy - radius * 0.2,
      radius * 1.0,
      radius * 0.4,
    );
    canvas.drawRect(rightBarRect, bluePaint);

    final whiteBarRect = Rect.fromLTWH(
      center.dx - radius * 0.05,
      center.dy - radius * 0.15,
      radius * 0.6,
      radius * 0.3,
    );
    canvas.drawRect(whiteBarRect, whitePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
