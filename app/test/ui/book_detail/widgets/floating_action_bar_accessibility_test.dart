import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/floating_action_bar.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

void main() {
  final testCases = <({Locale locale, ThemeMode themeMode, double width})>[
    for (final locale in const [Locale('ko'), Locale('en')])
      for (final themeMode in const [ThemeMode.light, ThemeMode.dark])
        for (final width in const [320.0, 393.0])
          (locale: locale, themeMode: themeMode, width: width),
  ];

  for (final testCase in testCases) {
    final label =
        '${testCase.locale.languageCode} ${testCase.themeMode.name} ${testCase.width.toInt()}px';

    testWidgets(
        'keeps fixed reading actions fully labeled and tappable at large text in $label',
        (tester) async {
      final semantics = tester.ensureSemantics();
      var recordTapCount = 0;
      var startReadingTapCount = 0;

      await _pumpFloatingActionBar(
        tester,
        locale: testCase.locale,
        themeMode: testCase.themeMode,
        width: testCase.width,
        onRecordTap: () => recordTapCount += 1,
        onStartReadingTap: () => startReadingTapCount += 1,
      );

      final labels = testCase.locale.languageCode == 'ko'
          ? const (record: '기록', startReading: '독서 시작')
          : const (record: 'Record', startReading: 'Start Reading');
      final stackedBar =
          find.byKey(const ValueKey('reading-action-bar-stacked'));
      expect(stackedBar, findsOneWidget);
      expect(tester.takeException(), isNull);

      for (final actionLabel in [labels.record, labels.startReading]) {
        final textFinder = find.text(actionLabel);
        final renderParagraph =
            tester.renderObject<RenderParagraph>(textFinder);
        final buttonFinder = find.ancestor(
          of: textFinder,
          matching: find.byType(GestureDetector),
        );
        final textRect = tester.getRect(textFinder);
        final buttonRect = tester.getRect(buttonFinder);

        expect(renderParagraph.didExceedMaxLines, isFalse);
        expect(textRect.left, greaterThanOrEqualTo(buttonRect.left));
        expect(textRect.right, lessThanOrEqualTo(buttonRect.right));
        expect(buttonRect.height, greaterThanOrEqualTo(48));
        expect(buttonRect.bottom, lessThanOrEqualTo(796));
        expect(find.semantics.byLabel(actionLabel), findsOneWidget);
      }

      final recordButton = find.ancestor(
        of: find.text(labels.record),
        matching: find.byType(GestureDetector),
      );
      final startReadingButton = find.ancestor(
        of: find.text(labels.startReading),
        matching: find.byType(GestureDetector),
      );
      expect(
        tester.getRect(recordButton).bottom,
        lessThan(tester.getRect(startReadingButton).top),
      );

      tester.semantics.tap(find.semantics.byLabel(labels.record));
      await tester.pump();
      tester.semantics.tap(find.semantics.byLabel(labels.startReading));
      await tester.pump();

      expect(recordTapCount, 1);
      expect(startReadingTapCount, 1);
      semantics.dispose();
    });
  }

  testWidgets('keeps compact inline actions at standard text scale',
      (tester) async {
    await _pumpFloatingActionBar(
      tester,
      locale: const Locale('en'),
      themeMode: ThemeMode.light,
      width: 393,
      textScale: 1,
      onRecordTap: () {},
      onStartReadingTap: () {},
    );

    expect(find.byKey(const ValueKey('reading-action-bar-inline')),
        findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pumpFloatingActionBar(
  WidgetTester tester, {
  required Locale locale,
  required ThemeMode themeMode,
  required double width,
  required VoidCallback onRecordTap,
  required VoidCallback onStartReadingTap,
  double textScale = 2,
}) async {
  tester.view.physicalSize = Size(width, 852);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      theme: BLabTheme.light,
      darkTheme: BLabTheme.dark,
      themeMode: themeMode,
      builder: (context, appChild) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: TextScaler.linear(textScale),
          viewPadding: const EdgeInsets.only(bottom: 34),
        ),
        child: appChild!,
      ),
      home: Scaffold(
        body: Stack(
          children: [
            FloatingActionBar(
              onUpdatePageTap: onStartReadingTap,
              onAddMemorablePageTap: onRecordTap,
            ),
          ],
        ),
      ),
    ),
  );
  await tester.pump();
}
