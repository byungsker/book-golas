import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';
import 'package:book_golas/ui/core/widgets/pressable_wrapper.dart';

double contrastRatio(Color foreground, Color background) {
  final first = foreground.computeLuminance();
  final second = background.computeLuminance();
  final lighter = first > second ? first : second;
  final darker = first > second ? second : first;
  return (lighter + 0.05) / (darker + 0.05);
}

void main() {
  testWidgets('activates immediately when reduced motion is enabled',
      (tester) async {
    var tapCount = 0;

    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: child!,
        ),
        home: Scaffold(
          body: Center(
            child: BLabPressableWrapper(
              key: const Key('target'),
              onTap: () => tapCount += 1,
              child: const ColoredBox(
                color: Colors.transparent,
                child: SizedBox(width: 100, height: 48),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('target')));

    expect(tapCount, 1);
  });

  testWidgets('primary recovery action exposes button semantics',
      (tester) async {
    final semantics = tester.ensureSemantics();
    var activationCount = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BLabButton(
            text: 'Review permission',
            onPressed: () => activationCount += 1,
            child: Text(
              'Review permission',
              style: AppTypography.buttonMedium.copyWith(
                color: BLabColors.textPrimaryLight,
              ),
            ),
          ),
        ),
      ),
    );

    final node = tester.getSemantics(find.byType(BLabButton));
    expect(node.flagsCollection.isButton, isTrue);
    expect(node.label, 'Review permission');
    expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    tester.semantics.tap(find.semantics.byLabel('Review permission'));
    await tester.pump();
    expect(activationCount, 1);
    semantics.dispose();
  });

  testWidgets('disabled button omits semantic tap action', (tester) async {
    final semantics = tester.ensureSemantics();

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: BLabButton(
            text: 'Unavailable',
          ),
        ),
      ),
    );

    final node = tester.getSemantics(find.byType(BLabButton));
    expect(node.flagsCollection.isButton, isTrue);
    expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isFalse);
    semantics.dispose();
  });

  testWidgets('full-width button wraps at 200 percent text size',
      (tester) async {
    tester.view.physicalSize = const Size(320, 480);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: const TextScaler.linear(2),
          ),
          child: child!,
        ),
        home: const Scaffold(
          body: Padding(
            padding: EdgeInsets.all(24),
            child: Align(
              alignment: Alignment.topCenter,
              child: BLabButton(
                text: 'Test notification in thirty seconds',
                icon: Icons.notifications_active,
                isFullWidth: true,
              ),
            ),
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('Test notification in thirty seconds'), findsOneWidget);
  });

  test('new light-mode text pairs meet normal-text contrast', () {
    expect(
      contrastRatio(BLabColors.textPrimaryLight, BLabColors.primary),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      contrastRatio(BLabColors.danger, BLabColors.surfaceLight),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      contrastRatio(BLabColors.textPrimaryLight, BLabColors.surfaceLight),
      greaterThanOrEqualTo(4.5),
    );
  });
}
