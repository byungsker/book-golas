import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/book_detail/widgets/floating_action_bar.dart';
import 'package:book_golas/ui/book_detail/widgets/tabs/book_review_tab.dart';
import 'package:book_golas/ui/book_detail/widgets/tabs/detail_tab.dart';
import 'package:book_golas/ui/book_detail/widgets/tabs/memorable_pages_tab.dart';
import 'package:book_golas/ui/book_detail/widgets/tabs/progress_history_tab.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/view_model/ad_view_model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:65535',
      anonKey: 'test-anon-key',
    );
  });

  for (final testCase in const [
    (width: 320.0, locale: Locale('ko'), status: BookStatus.reading),
    (width: 393.0, locale: Locale('en'), status: BookStatus.reading),
    (width: 320.0, locale: Locale('en'), status: BookStatus.completed),
    (width: 393.0, locale: Locale('ko'), status: BookStatus.completed),
  ]) {
    testWidgets(
      'every ${testCase.status.name} BookDetailScreen tab clears actions at '
      '${testCase.width.toInt()}px in ${testCase.locale.languageCode} at 200 percent',
      (tester) async {
        await _pumpDetailRoute(
          tester,
          width: testCase.width,
          locale: testCase.locale,
          status: testCase.status,
        );
        await _scrollHeaderOutOfTheWay(tester);

        final context = tester.element(find.byType(BookDetailScreen));
        final l10n = AppLocalizations.of(context);
        final tabCases = testCase.status == BookStatus.completed
            ? [
                (label: l10n.bookDetailTabRecord, tab: MemorablePagesTab),
                (label: l10n.bookDetailTabHistory, tab: ProgressHistoryTab),
                (label: l10n.bookDetailTabReview, tab: BookReviewTab),
                (label: l10n.bookDetailTabDetail, tab: DetailTab),
              ]
            : [
                (label: l10n.bookDetailTabRecord, tab: MemorablePagesTab),
                (label: l10n.bookDetailTabHistory, tab: ProgressHistoryTab),
                (label: l10n.bookDetailTabDetail, tab: DetailTab),
              ];

        for (var index = 0; index < tabCases.length; index++) {
          final tabCase = tabCases[index];
          final tabAction = find.byKey(
            ValueKey('scrollable-tab-action-$index'),
            skipOffstage: false,
          );
          expect(tabAction, findsOneWidget);
          final action = tester.widget<InkWell>(tabAction);
          expect(action.onTap, isNotNull);
          action.onTap!();
          await tester.pumpAndSettle();

          final tabFinder = find.byType(tabCase.tab, skipOffstage: false);
          expect(tabFinder, findsOneWidget);
          await _expectTabContentClearsActions(
            tester,
            tabFinder,
            l10n: l10n,
            isEmptyState: tabCase.tab == MemorablePagesTab ||
                tabCase.tab == ProgressHistoryTab,
          );
        }
      },
    );
  }
}

Future<void> _scrollHeaderOutOfTheWay(WidgetTester tester) async {
  final nestedScrollables = find.descendant(
    of: find.byType(NestedScrollView),
    matching: find.byType(Scrollable),
  );
  expect(nestedScrollables, findsAtLeastNWidgets(1));
  final outerScrollState =
      tester.state<ScrollableState>(nestedScrollables.first);
  outerScrollState.position.jumpTo(outerScrollState.position.maxScrollExtent);
  await tester.pumpAndSettle();
}

Future<void> _pumpDetailRoute(
  WidgetTester tester, {
  required double width,
  required Locale locale,
  required BookStatus status,
}) async {
  tester.view.physicalSize = Size(width, 852);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final isCompleted = status == BookStatus.completed;
  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: BLabTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: const TextScaler.linear(2),
          viewPadding: const EdgeInsets.only(bottom: 34),
        ),
        child: child!,
      ),
      home: MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ReadingTimerViewModel()),
          ChangeNotifierProvider(
            create: (_) => AdViewModel(SubscriptionService()),
          ),
        ],
        child: BookDetailScreen(
          loadRemoteData: false,
          book: Book(
            id: 'bok-385-route-${status.name}-${locale.languageCode}-$width',
            title: 'The Little Prince',
            author: 'Antoine de Saint-Exupéry',
            startDate: DateTime(2026, 8, 1),
            targetDate: DateTime(2026, 8, 31),
            currentPage: isCompleted ? 320 : 42,
            totalPages: 320,
            status: status.value,
            longReview: isCompleted
                ? List.filled(
                        24, 'A reflective review of this reading journey.')
                    .join('\n')
                : null,
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _expectTabContentClearsActions(
  WidgetTester tester,
  Finder tabFinder, {
  required AppLocalizations l10n,
  required bool isEmptyState,
}) async {
  final actionBarRect = tester.getRect(
    find.byKey(FloatingActionBar.actionBarKey),
  );
  final scrollViewFinder = find.descendant(
    of: tabFinder,
    matching: find.byType(SingleChildScrollView),
  );

  if (isEmptyState) {
    final emptyStateFinder =
        tabFinder.evaluate().single.widget is MemorablePagesTab
            ? find.text(l10n.bookDetailNoPhotos)
            : find.text(l10n.noProgressRecords);
    expect(emptyStateFinder, findsOneWidget);
    final emptyScrollable = find.descendant(
      of: tabFinder,
      matching: find.byType(Scrollable),
    );
    final emptyScrollState = tester.state<ScrollableState>(emptyScrollable);
    emptyScrollState.position.jumpTo(emptyScrollState.position.maxScrollExtent);
    await tester.pumpAndSettle();
    expect(
      tester.getRect(emptyStateFinder).bottom,
      lessThanOrEqualTo(actionBarRect.top - 16),
    );
    return;
  }

  final scrollableFinder = find.descendant(
    of: scrollViewFinder,
    matching: find.byType(Scrollable),
  );
  final scrollable = tester.state<ScrollableState>(scrollableFinder);
  scrollable.position.jumpTo(scrollable.position.maxScrollExtent);
  await tester.pumpAndSettle();

  expect(scrollable.position.pixels, scrollable.position.maxScrollExtent);
  final contentFinder = find
      .descendant(
        of: scrollViewFinder,
        matching: find.byType(Column),
      )
      .last;
  expect(
    tester.getRect(contentFinder).bottom,
    lessThanOrEqualTo(actionBarRect.top - 16),
  );
}
