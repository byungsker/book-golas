import 'package:book_golas/ui/core/theme/system_ui_overlay_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('systemUiOverlayStyleForBrightness', () {
    test('uses dark status-bar content on light backgrounds', () {
      final style = systemUiOverlayStyleForBrightness(Brightness.light);

      expect(style.statusBarColor, Colors.transparent);
      expect(style.statusBarIconBrightness, Brightness.dark);
      expect(style.statusBarBrightness, Brightness.light);
    });

    test('uses light status-bar content on dark backgrounds', () {
      final style = systemUiOverlayStyleForBrightness(Brightness.dark);

      expect(style.statusBarColor, Colors.transparent);
      expect(style.statusBarIconBrightness, Brightness.light);
      expect(style.statusBarBrightness, Brightness.dark);
    });
  });
}
