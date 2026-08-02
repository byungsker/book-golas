import 'package:book_golas/ui/core/theme/system_ui_overlay_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

    testWidgets('updates the active overlay when the theme changes', (
      tester,
    ) async {
      final brightness = ValueNotifier(Brightness.dark);
      final platformCalls = <MethodCall>[];
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

      messenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        platformCalls.add(call);
        return null;
      });
      addTearDown(
        () => messenger.setMockMethodCallHandler(SystemChannels.platform, null),
      );

      await tester.pumpWidget(
        ValueListenableBuilder<Brightness>(
          valueListenable: brightness,
          builder: (context, value, child) {
            return ThemeAwareSystemUiOverlay(
              brightness: value,
              child: const SizedBox(),
            );
          },
        ),
      );

      expect(_activeOverlay(tester).statusBarIconBrightness, Brightness.light);

      brightness.value = Brightness.light;
      await tester.pump();
      await tester.pump();

      expect(_activeOverlay(tester).statusBarIconBrightness, Brightness.dark);
      expect(platformCalls.last.method, 'SystemChrome.setSystemUIOverlayStyle');
      expect(
        platformCalls.last.arguments['statusBarIconBrightness'],
        'Brightness.dark',
      );
    });
  });
}

SystemUiOverlayStyle _activeOverlay(WidgetTester tester) {
  return tester
      .widget<AnnotatedRegion<SystemUiOverlayStyle>>(
        find.byWidgetPredicate(
          (widget) => widget is AnnotatedRegion<SystemUiOverlayStyle>,
        ),
      )
      .value;
}
