import 'package:flutter/material.dart';

class BLabColors {
  BLabColors._();

  static const Color primary = Color(0xFF5B7FFF);
  static const Color primaryLight = Color(0xFF6B8AFF);

  static const Color success = Color(0xFF10B981);
  static const Color successAlt = Color(0xFF34C759);
  static const Color successBg = Color(0xFFD1FAE5);
  static const Color error = Color(0xFFFF3B30);
  static const Color errorAlt = Color(0xFFEF4444);
  static const Color errorBg = Color(0xFFFEE2E2);
  static const Color errorLight = Color(0xFFFCA5A5);
  static const Color warning = Color(0xFFFF9500);
  static const Color warningAlt = Color(0xFFFFBE0B);
  static const Color info = Color(0xFF4ECDC4);
  static const Color infoAlt = Color(0xFF3498DB);
  static const Color destructive = Color(0xFFFF6B6B);
  static const Color purple = Color(0xFF9B59B6);

  static const List<Color> chartColors = [
    Color(0xFF5B7FFF),
    Color(0xFFFF6B6B),
    Color(0xFF4ECDC4),
    Color(0xFFFFBE0B),
    Color(0xFF9B59B6),
    Color(0xFF3498DB),
    Color(0xFFE74C3C),
    Color(0xFF1ABC9C),
    Color(0xFFF39C12),
    Color(0xFF8E44AD),
  ];

  static const Color gold = Color(0xFFFFD700);
  static const Color amber = Color(0xFFFEF3C7);
  static const Color danger = Color(0xFFDC2626);
  static const Color dangerAlt = Color(0xFFD97706);

  static const Color scaffoldLight = Color(0xFFFAFAFA);
  static const Color surfaceLight = Colors.white;
  static const Color cardLight = Colors.white;
  static const Color elevatedLight = Color(0xFFF8F9FA);
  static const Color subtleBlueLight = Color(0xFFF5F7FF);
  static const Color grey50Light = Color(0xFFF5F5F5);
  static const Color grey100Light = Color(0xFFF3F4F6);
  static const Color grey200Light = Color(0xFFE5E7EB);

  static const Color scaffoldDark = Color(0xFF121212);
  static const Color surfaceDark = Color(0xFF1E1E1E);
  static const Color cardDark = Color(0xFF1E1E1E);
  static const Color elevatedDark = Color(0xFF2C2C2E);
  static const Color subtleDark = Color(0xFF2A2A2A);

  static const Color textPrimaryLight = Colors.black;
  static const Color textSecondaryLight = Color(0xDD000000);
  static const Color textTertiaryLight = Color(0x99000000);

  static const Color textPrimaryDark = Colors.white;
  static const Color textSecondaryDark = Color(0xDDFFFFFF);
  static const Color textTertiaryDark = Color(0x99FFFFFF);

  static Color scaffold(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? scaffoldDark
        : scaffoldLight;
  }

  static Color surface(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? surfaceDark
        : surfaceLight;
  }

  static Color card(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? cardDark
        : cardLight;
  }

  static Color textPrimary(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? textPrimaryDark
        : textPrimaryLight;
  }

  static Color textSecondary(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? textSecondaryDark
        : textSecondaryLight;
  }

  static Color textTertiary(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? textTertiaryDark
        : textTertiaryLight;
  }

  static Color grey(int shade, BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    switch (shade) {
      case 50:
        return isDark ? const Color(0xFF303030) : Colors.grey[50]!;
      case 100:
        return isDark ? const Color(0xFF424242) : Colors.grey[100]!;
      case 200:
        return isDark ? const Color(0xFF616161) : Colors.grey[200]!;
      case 300:
        return isDark ? const Color(0xFF757575) : Colors.grey[300]!;
      case 400:
        return isDark ? const Color(0xFF9E9E9E) : Colors.grey[400]!;
      case 500:
        return isDark ? const Color(0xFFBDBDBD) : Colors.grey[500]!;
      case 600:
        return isDark ? const Color(0xFFE0E0E0) : Colors.grey[600]!;
      case 700:
        return isDark ? const Color(0xFFEEEEEE) : Colors.grey[700]!;
      case 800:
        return isDark ? const Color(0xFFF5F5F5) : Colors.grey[800]!;
      case 850:
        return isDark
            ? const Color(0xFFFAFAFA)
            : Colors.grey[850] ?? Colors.grey[800]!;
      case 900:
        return isDark ? Colors.white : Colors.grey[900]!;
      default:
        return isDark ? Colors.grey[shade]! : Colors.grey[shade]!;
    }
  }
}
