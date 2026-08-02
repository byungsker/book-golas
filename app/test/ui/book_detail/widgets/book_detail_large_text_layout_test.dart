import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/compact_reading_schedule.dart';
import 'package:book_golas/ui/book_detail/widgets/dashboard_progress_widget.dart';
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

    testWidgets('reading schedule fits at 200 percent text scale in $label', (
      tester,
    ) async {
      final semantics = tester.ensureSemantics();
      var editCount = 0;

      await _pumpAtLargeText(
        tester,
        testCase: testCase,
        child: CompactReadingSchedule(
          startDate: DateTime(2026, 1, 1),
          targetDate: DateTime(2026, 12, 31),
          attemptCount: 12,
          onEditTap: () => editCount += 1,
        ),
      );

      expect(tester.takeException(), isNull);
      final editLabel =
          testCase.locale.languageCode == 'ko' ? '목표일 수정' : 'Edit target date';
      final editFinder = find.semantics.byLabel(editLabel);
      expect(editFinder, findsOneWidget);
      expect(
          tester.getSize(find.byType(GestureDetector).last).shortestSide, 44);
      tester.semantics.tap(editFinder);
      await tester.pump();
      expect(editCount, 1);
      semantics.dispose();
    });

    testWidgets('progress dashboard fits at 200 percent text scale in $label', (
      tester,
    ) async {
      var targetCount = 0;

      await _pumpAtLargeText(
        tester,
        testCase: testCase,
        child: DashboardProgressWidget(
          animatedProgress: 0.42,
          currentPage: 123,
          totalPages: 1234,
          daysLeft: 128,
          pagesLeft: 1111,
          dailyTargetPages: 123,
          isTodayGoalAchieved: true,
          onDailyTargetTap: () => targetCount += 1,
        ),
      );

      expect(tester.takeException(), isNull);
      await tester.tap(find.textContaining('123p').last);
      await tester.pump();
      expect(targetCount, 1);
    });
  }

  testWidgets('reading schedule stacks at phone width and standard text size', (
    tester,
  ) async {
    await _pumpAtTextScale(
      tester,
      locale: const Locale('ko'),
      themeMode: ThemeMode.light,
      width: 393,
      textScale: 1,
      child: CompactReadingSchedule(
        startDate: DateTime(2026, 1, 1),
        targetDate: DateTime(2026, 12, 31),
        attemptCount: 2,
        onEditTap: () {},
      ),
    );

    expect(tester.takeException(), isNull);
    expect(
      find.byKey(const ValueKey('compact-reading-schedule-stacked')),
      findsOneWidget,
    );
  });

  testWidgets('reading schedule keeps the inline layout on a wide screen', (
    tester,
  ) async {
    await _pumpAtTextScale(
      tester,
      locale: const Locale('ko'),
      themeMode: ThemeMode.light,
      width: 600,
      textScale: 1,
      child: CompactReadingSchedule(
        startDate: DateTime(2026, 1, 1),
        targetDate: DateTime(2026, 12, 31),
        attemptCount: 2,
        onEditTap: () {},
      ),
    );

    expect(tester.takeException(), isNull);
    expect(
      find.byKey(const ValueKey('compact-reading-schedule-stacked')),
      findsNothing,
    );
  });

  testWidgets(
      'progress dashboard keeps the inline layout at standard text size', (
    tester,
  ) async {
    await _pumpAtTextScale(
      tester,
      locale: const Locale('ko'),
      themeMode: ThemeMode.light,
      width: 393,
      textScale: 1,
      child: DashboardProgressWidget(
        animatedProgress: 0.42,
        currentPage: 123,
        totalPages: 1234,
        daysLeft: 128,
        pagesLeft: 1111,
        dailyTargetPages: 123,
        isTodayGoalAchieved: true,
        onDailyTargetTap: () {},
      ),
    );

    expect(tester.takeException(), isNull);
    expect(
      find.byKey(const ValueKey('dashboard-progress-stacked')),
      findsNothing,
    );
  });
}

Future<void> _pumpAtLargeText(
  WidgetTester tester, {
  required ({Locale locale, ThemeMode themeMode, double width}) testCase,
  required Widget child,
}) async {
  await _pumpAtTextScale(
    tester,
    locale: testCase.locale,
    themeMode: testCase.themeMode,
    width: testCase.width,
    textScale: 2,
    child: child,
  );
}

Future<void> _pumpAtTextScale(
  WidgetTester tester, {
  required Locale locale,
  required ThemeMode themeMode,
  required double width,
  required double textScale,
  required Widget child,
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
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(textScale)),
        child: appChild!,
      ),
      home: Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: child,
        ),
      ),
    ),
  );
  await tester.pump();
}
