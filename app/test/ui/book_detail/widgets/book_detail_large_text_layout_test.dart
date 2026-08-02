import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/utils/sticky_tab_bar_delegate.dart';
import 'package:book_golas/ui/book_detail/widgets/compact_reading_schedule.dart';
import 'package:book_golas/ui/book_detail/widgets/compact_streak_row.dart';
import 'package:book_golas/ui/book_detail/widgets/custom_tab_bar.dart';
import 'package:book_golas/ui/book_detail/widgets/dashboard_progress_widget.dart';
import 'package:book_golas/ui/book_detail/widgets/floating_action_bar.dart'
    as book_detail;
import 'package:book_golas/ui/book_detail/widgets/tabs/detail_tab.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/scrollable_tab_bar.dart';

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

    testWidgets(
      'completed-book tab bar fits at 200 percent text scale in $label',
      (tester) async {
        final semantics = tester.ensureSemantics();
        await _pumpStickyTabBarAtLargeText(
          tester,
          testCase: testCase,
          completed: true,
        );

        expect(tester.takeException(), isNull);
        final tabBarRect = tester.getRect(find.byType(CustomTabBar));
        expect(tabBarRect.height, greaterThanOrEqualTo(56));
        expect(find.byType(ScrollableTabBar), findsOneWidget);

        final labels = testCase.locale.languageCode == 'ko'
            ? const ['기록', '히스토리', '독후감', '상세']
            : const ['Record', 'History', 'Review', 'Details'];
        for (final tabLabel in labels) {
          expect(find.semantics.byLabel(tabLabel), findsOneWidget);
          final labelText = tester.widget<Text>(find.text(tabLabel));
          expect(labelText.maxLines, 1);
          expect(labelText.softWrap, isFalse);
        }

        final scrollView = tester.widget<SingleChildScrollView>(
          find.byKey(const ValueKey('scrollable-tab-bar-scroll-view')),
        );
        expect(scrollView.controller, isNotNull);
        expect(scrollView.controller!.position.maxScrollExtent, greaterThan(0));

        tester.semantics.tap(find.semantics.byLabel(labels.last));
        await tester.pumpAndSettle();
        expect(scrollView.controller!.offset, greaterThan(0));
        final lastLabelRect = tester.getRect(find.text(labels.last));
        expect(lastLabelRect.left, greaterThanOrEqualTo(tabBarRect.left));
        expect(lastLabelRect.right, lessThanOrEqualTo(tabBarRect.right));
        expect(lastLabelRect.top, greaterThanOrEqualTo(tabBarRect.top));
        expect(lastLabelRect.bottom, lessThanOrEqualTo(tabBarRect.bottom));
        semantics.dispose();
      },
    );

    testWidgets('streak card fits at 200 percent text scale in $label', (
      tester,
    ) async {
      await _pumpAtLargeText(
        tester,
        testCase: testCase,
        child: const CompactStreakRow(dailyAchievements: {}),
      );

      expect(tester.takeException(), isNull);
      expect(
        find.byKey(const ValueKey('compact-streak-days-wrapped')),
        findsOneWidget,
      );
      _expectTextContrast(
        tester,
        const ValueKey('compact-streak-day-label-0'),
        testCase.themeMode,
      );
      _expectTextContrast(
        tester,
        const ValueKey('compact-streak-message'),
        testCase.themeMode,
      );
    });

    testWidgets('completed detail tab fits at 200 percent text scale in $label',
        (
      tester,
    ) async {
      await _pumpDetailTabAtLargeText(tester, testCase: testCase);

      expect(tester.takeException(), isNull);
      expect(
        find.byKey(const ValueKey('detail-tab-schedule-row-stacked')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('detail-tab-target-date-stacked')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('detail-tab-goal-header-stacked')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('detail-tab-legend-wrap')),
        findsOneWidget,
      );

      final scheduleTitle =
          testCase.locale.languageCode == 'ko' ? '독서 일정' : 'Reading Schedule';
      final reviewTitle =
          testCase.locale.languageCode == 'ko' ? '독후감' : 'Review';
      final changeLabel =
          testCase.locale.languageCode == 'ko' ? '변경' : 'Change';
      final attemptLabel = testCase.locale.languageCode == 'ko'
          ? '12번째 · 끝까지 함께해요!'
          : 'Attempt 12 · Keep going!';
      expect(find.text(scheduleTitle), findsOneWidget);
      expect(find.text(reviewTitle), findsOneWidget);
      expect(find.text(changeLabel), findsOneWidget);
      expect(find.text(attemptLabel), findsOneWidget);
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

Future<void> _pumpDetailTabAtLargeText(
  WidgetTester tester, {
  required ({Locale locale, ThemeMode themeMode, double width}) testCase,
}) async {
  tester.view.physicalSize = Size(testCase.width, 852);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final today = DateTime(2026, 8, 2);
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
        body: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: DetailTab(
            book: Book(
              title: 'The Little Prince',
              author: 'Antoine de Saint-Exupéry',
              startDate: today,
              targetDate: today.add(const Duration(days: 13)),
              currentPage: 144,
              totalPages: 144,
              status: BookStatus.completed.value,
            ),
            attemptCount: 12,
            dailyAchievements: const {},
            onTargetDateChange: () {},
            onDelete: () {},
            onReviewTap: () {},
          ),
        ),
      ),
    ),
  );
  await tester.pump();
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
  bool completed = false,
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
      home: Builder(
        builder: (context) {
          final l10n = AppLocalizations.of(context);
          final tabLabels = completed
              ? [
                  l10n.bookDetailTabRecord,
                  l10n.bookDetailTabHistory,
                  l10n.bookDetailTabReview,
                  l10n.bookDetailTabDetail,
                ]
              : [
                  l10n.bookDetailTabRecord,
                  l10n.bookDetailTabHistory,
                  l10n.bookDetailTabDetail,
                ];
          return DefaultTabController(
            length: tabLabels.length,
            child: Builder(
              builder: (context) {
                final tabController = DefaultTabController.of(context);
                return CustomScrollView(
                  slivers: [
                    SliverPersistentHeader(
                      pinned: true,
                      delegate: StickyTabBarDelegate(
                        extent: CustomTabBar.extentFor(context, tabLabels),
                        backgroundColor: testCase.themeMode == ThemeMode.dark
                            ? BLabColors.scaffoldDark
                            : BLabColors.elevatedLight,
                        child: CustomTabBar(
                          tabController: tabController,
                          tabLabels: tabLabels,
                        ),
                      ),
                    ),
                    const SliverFillRemaining(child: SizedBox.expand()),
                  ],
                );
              },
            ),
          );
        },
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
