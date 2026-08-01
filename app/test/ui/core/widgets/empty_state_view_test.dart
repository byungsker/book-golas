import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/empty_state_view.dart';

void main() {
  for (final testCase in [
    (
      brightness: Brightness.light,
      foreground: BLabColors.textTertiaryLight,
      background: BLabColors.scaffoldLight,
    ),
    (
      brightness: Brightness.dark,
      foreground: BLabColors.textTertiaryDark,
      background: BLabColors.scaffoldDark,
    ),
  ]) {
    testWidgets(
      'empty state message preserves contrast in ${testCase.brightness.name} mode',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: ThemeData(
              brightness: testCase.brightness,
              scaffoldBackgroundColor: testCase.background,
            ),
            home: const Scaffold(
              body: EmptyStateView(message: 'Empty state'),
            ),
          ),
        );

        final text = tester.widget<Text>(
          find.byKey(const ValueKey('empty-state-message')),
        );
        expect(text.style?.color, testCase.foreground);
        expect(
          _contrastRatio(testCase.foreground, testCase.background),
          greaterThanOrEqualTo(4.5),
        );
      },
    );
  }
}

double _contrastRatio(Color foreground, Color background) {
  final lighter = math.max(
    foreground.computeLuminance(),
    background.computeLuminance(),
  );
  final darker = math.min(
    foreground.computeLuminance(),
    background.computeLuminance(),
  );
  return (lighter + 0.05) / (darker + 0.05);
}
