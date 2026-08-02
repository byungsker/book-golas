import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/utils/sticky_tab_bar_delegate.dart';
import 'package:book_golas/ui/book_detail/widgets/compact_reading_schedule.dart';
import 'package:book_golas/ui/book_detail/widgets/custom_tab_bar.dart';
import 'package:book_golas/ui/book_detail/widgets/dashboard_progress_widget.dart';
import 'package:book_golas/ui/book_detail/widgets/floating_action_bar.dart'
    as book_detail;
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
      _expectTextContrast(
        tester,
        const ValueKey('reading-schedule-date-label-start'),
        testCase.themeMode,
      );
      _expectTextContrast(
        tester,
        const ValueKey('reading-schedule-date-label-target'),
        testCase.themeMode,
      );
      _expectTextContrast(
        tester,
        const ValueKey('reading-schedule-total-days'),
        testCase.themeMode,
      );
      _expectStatusTextContrast(
        tester,
        const ValueKey('reading-schedule-attempt-badge'),
        testCase.themeMode,
        BLabColors.warning.withValues(alpha: 0.12),
      );
      semantics.dispose();
    });

    testWidgets('progress dashboard fits at 200 percent text scale in $label', (
      tester,
    ) async {
      final semantics = tester.ensureSemantics();
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
      final targetTextFinder = find.byKey(
        const ValueKey('dashboard-progress-daily-target'),
      );
      final targetText = tester.widget<Text>(targetTextFinder);
      final targetSemantics = find.semantics.byLabel(targetText.data!);
      expect(targetSemantics, findsOneWidget);
      final targetGesture = find.ancestor(
        of: targetTextFinder,
        matching: find.byType(GestureDetector),
      );
      expect(
          tester.getSize(targetGesture).shortestSide, greaterThanOrEqualTo(44));
      _expectStatusTextContrast(
        tester,
        const ValueKey('dashboard-progress-daily-target'),
        testCase.themeMode,
        BLabColors.success.withValues(alpha: 0.1),
      );
      _expectStatusTextContrast(
        tester,
        const ValueKey('dashboard-progress-goal-achieved'),
        testCase.themeMode,
        BLabColors.gold.withValues(alpha: 0.15),
      );
      tester.semantics.tap(targetSemantics);
      await tester.pump();
      expect(targetCount, 1);
      semantics.dispose();
    });

    testWidgets('floating action bar fits at 200 percent text scale in $label',
        (
      tester,
    ) async {
      await _pumpFloatingActionBarAtLargeText(tester, testCase: testCase);

      expect(tester.takeException(), isNull);
    });

    testWidgets('sticky tab bar fits at 200 percent text scale in $label', (
      tester,
    ) async {
      await _pumpStickyTabBarAtLargeText(tester, testCase: testCase);

      expect(tester.takeException(), isNull);
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

  for (final locale in const [Locale('ko'), Locale('en')]) {
    for (final textScale in const [1.0, 2.0]) {
      testWidgets(
        'reading schedule stacks at 440px boundary in ${locale.languageCode} ${textScale}x',
        (tester) async {
          await _pumpAtTextScale(
            tester,
            locale: locale,
            themeMode: ThemeMode.light,
            width: 440,
            textScale: textScale,
            child: CompactReadingSchedule(
              startDate: DateTime(2026, 1, 1),
              targetDate: DateTime(2026, 12, 31),
              attemptCount: 12,
              onEditTap: () {},
            ),
          );

          expect(tester.takeException(), isNull);
          expect(
            find.byKey(const ValueKey('compact-reading-schedule-stacked')),
            findsOneWidget,
          );
        },
      );
    }
  }

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

void _expectTextContrast(
  WidgetTester tester,
  Key key,
  ThemeMode themeMode,
) {
  final text = tester.widget<Text>(find.byKey(key));
  final background = themeMode == ThemeMode.dark
      ? BLabColors.surfaceDark
      : BLabColors.surfaceLight;
  expect(_contrastRatio(text.style!.color!, background),
      greaterThanOrEqualTo(4.5));
}

void _expectStatusTextContrast(
  WidgetTester tester,
  Key key,
  ThemeMode themeMode,
  Color overlay,
) {
  final text = tester.widget<Text>(find.byKey(key));
  final surface = themeMode == ThemeMode.dark
      ? BLabColors.surfaceDark
      : BLabColors.surfaceLight;
  final background = Color.alphaBlend(overlay, surface);
  expect(_contrastRatio(text.style!.color!, background),
      greaterThanOrEqualTo(4.5));
}

double _contrastRatio(Color foreground, Color background) {
  final opaqueForeground = Color.alphaBlend(foreground, background);
  final lighter =
      opaqueForeground.computeLuminance() > background.computeLuminance()
          ? opaqueForeground
          : background;
  final darker =
      identical(lighter, opaqueForeground) ? background : opaqueForeground;
  return (lighter.computeLuminance() + 0.05) /
      (darker.computeLuminance() + 0.05);
}

Future<void> _pumpStickyTabBarAtLargeText(
  WidgetTester tester, {
  required ({Locale locale, ThemeMode themeMode, double width}) testCase,
}) async {
  tester.view.physicalSize = Size(testCase.width, 852);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
      locale: testCase.locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      theme: BLabTheme.light,
      darkTheme: BLabTheme.dark,
      themeMode: testCase.themeMode,
      builder: (context, appChild) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: const TextScaler.linear(2)),
        child: appChild!,
      ),
      home: DefaultTabController(
        length: 3,
        child: Builder(
          builder: (context) {
            final tabController = DefaultTabController.of(context);
            return CustomScrollView(
              slivers: [
                SliverPersistentHeader(
                  pinned: true,
                  delegate: StickyTabBarDelegate(
                    extent: CustomTabBar.extentFor(context),
                    backgroundColor: testCase.themeMode == ThemeMode.dark
                        ? BLabColors.scaffoldDark
                        : BLabColors.elevatedLight,
                    child: CustomTabBar(
                      tabController: tabController,
                      tabLabels: const ['Record', 'History', 'Detail'],
                    ),
                  ),
                ),
                const SliverFillRemaining(child: SizedBox.expand()),
              ],
            );
          },
        ),
      ),
    ),
  );
  await tester.pump();
}

Future<void> _pumpFloatingActionBarAtLargeText(
  WidgetTester tester, {
  required ({Locale locale, ThemeMode themeMode, double width}) testCase,
}) async {
  tester.view.physicalSize = Size(testCase.width, 852);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
      locale: testCase.locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      theme: BLabTheme.light,
      darkTheme: BLabTheme.dark,
      themeMode: testCase.themeMode,
      builder: (context, appChild) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: const TextScaler.linear(2)),
        child: appChild!,
      ),
      home: Scaffold(
        body: Stack(
          children: [
            book_detail.FloatingActionBar(
              onUpdatePageTap: () {},
              onAddMemorablePageTap: () {},
            ),
          ],
        ),
      ),
    ),
  );
  await tester.pump();
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
