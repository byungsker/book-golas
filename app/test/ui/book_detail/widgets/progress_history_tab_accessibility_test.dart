import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/tabs/progress_history_tab.dart';
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

    testWidgets('history chart fits at 200 percent text scale in $label', (
      tester,
    ) async {
      final semantics = tester.ensureSemantics();

      await _pumpHistoryTab(tester, testCase: testCase);

      expect(tester.takeException(), isNull);

      final cumulativeLabel =
          testCase.locale.languageCode == 'ko' ? '누적 페이지' : 'Cumulative Pages';
      final readingTimeLabel =
          testCase.locale.languageCode == 'ko' ? '독서 시간' : 'Reading Time';
      final attemptBadge = testCase.locale.languageCode == 'ko'
          ? '2번째 · 잘하고 있다'
          : "Attempt 2 · You're doing well";
      final cumulativeToggle = find.byKey(
        const ValueKey('history-chart-mode-cumulative'),
      );
      final readingTimeToggle = find.byKey(
        const ValueKey('history-chart-mode-reading-time'),
      );
      expect(tester.getSize(cumulativeToggle).height, greaterThanOrEqualTo(44));
      expect(find.text(attemptBadge), findsWidgets);
      expect(
          tester.getSize(readingTimeToggle).height, greaterThanOrEqualTo(44));
      expect(
        tester
            .widget<Semantics>(
              find
                  .ancestor(
                    of: cumulativeToggle,
                    matching: find.byType(Semantics),
                  )
                  .first,
            )
            .properties
            .label,
        cumulativeLabel,
      );
      expect(
        tester
            .widget<Semantics>(
              find
                  .ancestor(
                    of: readingTimeToggle,
                    matching: find.byType(Semantics),
                  )
                  .first,
            )
            .properties
            .label,
        readingTimeLabel,
      );

      await tester.tap(readingTimeToggle);
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text(readingTimeLabel), findsAtLeastNWidgets(2));
      semantics.dispose();
    });
  }
}

Future<void> _pumpHistoryTab(
  WidgetTester tester, {
  required ({Locale locale, ThemeMode themeMode, double width}) testCase,
}) async {
  tester.view.physicalSize = Size(testCase.width, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
      locale: testCase.locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      theme: BLabTheme.light,
      darkTheme: BLabTheme.dark,
      themeMode: testCase.themeMode,
      home: MediaQuery(
        data: const MediaQueryData(textScaler: TextScaler.linear(2)),
        child: Scaffold(
          body: ProgressHistoryTab(
            progressFuture: Future.value(_progressRecords),
            attemptCount: 2,
            progressPercentage: 42,
            daysLeft: 16,
            startDate: DateTime(2026, 7, 1),
            targetDate: DateTime(2026, 8, 31),
            bookId: 'history-test-book',
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

final _progressRecords = <Map<String, dynamic>>[
  {
    'page': 42,
    'reading_time': 300,
    'created_at': DateTime(2026, 7, 1, 9),
  },
  {
    'page': 96,
    'reading_time': 900,
    'created_at': DateTime(2026, 7, 2, 9),
  },
  {
    'page': 153,
    'reading_time': 4200,
    'created_at': DateTime(2026, 7, 3, 9),
  },
];
