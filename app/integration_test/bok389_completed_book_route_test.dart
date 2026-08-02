import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';
import 'package:book_golas/ui/book_detail/widgets/compact_book_header.dart';
import 'package:book_golas/ui/book_detail/widgets/floating_action_bar.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/view_model/ad_view_model.dart';
import 'package:book_golas/ui/reading_start/widgets/reading_start_screen.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const captureLocale = String.fromEnvironment('BOK389_CAPTURE_LOCALE');
  const captureBrightness = String.fromEnvironment('BOK389_CAPTURE_THEME');
  const evidenceHoldMilliseconds = int.fromEnvironment(
    'BOK389_EVIDENCE_HOLD_MILLISECONDS',
  );

  setUpAll(() async {
    await Supabase.initialize(
      url: 'http://127.0.0.1:65535',
      anonKey: 'test-anon-key',
    );
  });

  for (final locale in const [Locale('ko'), Locale('en')]) {
    for (final brightness in Brightness.values) {
      if (captureLocale.isNotEmpty && captureLocale != locale.languageCode) {
        continue;
      }
      if (captureBrightness.isNotEmpty &&
          captureBrightness != brightness.name) {
        continue;
      }
      testWidgets(
        'BOK-389 completed detail route preserves CTA copy, safe area, and restart flow at 393px and 200 percent in ${locale.languageCode} ${brightness.name}',
        (tester) async {
          final originalHitTestWarningShouldBeFatal =
              WidgetController.hitTestWarningShouldBeFatal;
          WidgetController.hitTestWarningShouldBeFatal = true;
          addTearDown(() {
            WidgetController.hitTestWarningShouldBeFatal =
                originalHitTestWarningShouldBeFatal;
          });
          await binding.setSurfaceSize(const Size(393, 852));
          addTearDown(() => binding.setSurfaceSize(null));

          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
          expect(find.byType(ReadingStartScreen), findsNothing);
          expect(
            find.byKey(FloatingActionBar.actionBarKey),
            findsNothing,
          );

          await tester.pumpWidget(
            _CompletedBookRouteFixture(
              locale: locale,
              brightness: brightness,
            ),
          );
          await tester.pump(const Duration(milliseconds: 300));

          expect(find.byType(BookDetailScreen), findsOneWidget);
          expect(find.byType(CompactBookHeader), findsOneWidget);

          final l10n = AppLocalizations.of(
            tester.element(find.byType(BookDetailScreen)),
          );
          final reviewCard = find.byKey(
            const ValueKey('completed-book-review-action'),
          );
          final restartCard = find.byKey(
            const ValueKey('completed-book-restart-action'),
          );

          final floatingActionBar = find.byKey(FloatingActionBar.actionBarKey);
          expect(floatingActionBar, findsOneWidget);
          final actionBarRect = tester.getRect(floatingActionBar);
          final overlayFreeViewportBottom =
              actionBarRect.top - FloatingActionBar.contentSeparation;
          final overlayFreeViewportTop =
              tester.getRect(find.byType(AppBar)).bottom + 12;
          final viewportBottom = tester.getRect(find.byType(Scaffold)).bottom;
          expect(
            actionBarRect.bottom,
            lessThanOrEqualTo(
              viewportBottom -
                  FloatingActionBar.bottomOffset -
                  _CompletedBookRouteFixture.bottomSafeArea,
            ),
          );
          await _positionActionAboveFloatingBar(
            tester,
            card: reviewCard,
            overlayFreeViewportBottom: overlayFreeViewportBottom,
          );
          _expectActionAboveFloatingBar(
            tester,
            card: reviewCard,
            texts: [
              l10n.bookDetailWriteReview,
              l10n.bookDetailRecordThoughts,
            ],
            overlayFreeViewportTop: overlayFreeViewportTop,
            overlayFreeViewportBottom: overlayFreeViewportBottom,
          );
          await _positionActionAboveFloatingBar(
            tester,
            card: restartCard,
            overlayFreeViewportBottom: overlayFreeViewportBottom,
          );
          _expectActionAboveFloatingBar(
            tester,
            card: restartCard,
            texts: [
              l10n.bookDetailContinueReading,
              l10n.bookDetailAchieveGoal,
            ],
            overlayFreeViewportTop: overlayFreeViewportTop,
            overlayFreeViewportBottom: overlayFreeViewportBottom,
          );
          expect(
            find.semantics.byLabel(
              '${l10n.bookDetailContinueReading}. ${l10n.bookDetailAchieveGoal}',
            ),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
          await binding.takeScreenshot(
            'BOK-389-${locale.languageCode}-${brightness.name}-393-200-both-ctas',
          );

          if (evidenceHoldMilliseconds > 0) {
            await tester.pump(
              const Duration(milliseconds: evidenceHoldMilliseconds),
            );
          }

          await tester.tap(restartCard);
          await tester.pump(const Duration(milliseconds: 250));
          await tester.pump();
          expect(find.byType(ReadingStartScreen), findsOneWidget);
          expect(tester.takeException(), isNull);

          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
          expect(find.byType(ReadingStartScreen), findsNothing);
          expect(
            find.byKey(FloatingActionBar.actionBarKey),
            findsNothing,
          );
        },
      );
    }
  }
}

Future<void> _positionActionAboveFloatingBar(
  WidgetTester tester, {
  required Finder card,
  required double overlayFreeViewportBottom,
}) async {
  await tester.pump();
  final position = Scrollable.maybeOf(tester.element(card))!.position;
  final cardRect = tester.getRect(card);
  final targetOffset =
      (position.pixels + cardRect.bottom - (overlayFreeViewportBottom - 12))
          .clamp(
            position.minScrollExtent,
            position.maxScrollExtent,
          )
          .toDouble();
  position.jumpTo(targetOffset);
  await tester.pump();
}

void _expectActionAboveFloatingBar(
  WidgetTester tester, {
  required Finder card,
  required List<String> texts,
  required double overlayFreeViewportTop,
  required double overlayFreeViewportBottom,
}) {
  final cardRect = tester.getRect(card);
  expect(tester.getSize(card).shortestSide, greaterThanOrEqualTo(48));
  expect(cardRect.top, greaterThanOrEqualTo(overlayFreeViewportTop));
  expect(cardRect.bottom, lessThanOrEqualTo(overlayFreeViewportBottom));

  for (final text in texts) {
    final textFinder = find.text(text);
    expect(textFinder, findsOneWidget);
    final textRect = tester.getRect(textFinder);
    expect(textRect.top, greaterThanOrEqualTo(overlayFreeViewportTop));
    expect(textRect.bottom, lessThanOrEqualTo(overlayFreeViewportBottom));
  }
}

class _CompletedBookRouteFixture extends StatelessWidget {
  static const bottomSafeArea = 34.0;

  const _CompletedBookRouteFixture({
    required this.locale,
    required this.brightness,
  });

  final Locale locale;
  final Brightness brightness;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<BookService>(create: (_) => BookService()),
        ChangeNotifierProvider(create: (_) => ReadingTimerViewModel()),
        ChangeNotifierProvider(
          create: (_) => AdViewModel(SubscriptionService()),
        ),
      ],
      child: MaterialApp(
        key: ValueKey(
          'bok389-material-app-${locale.languageCode}-${brightness.name}',
        ),
        locale: locale,
        theme: BLabTheme.light,
        darkTheme: BLabTheme.dark,
        themeMode:
            brightness == Brightness.dark ? ThemeMode.dark : ThemeMode.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: const TextScaler.linear(2),
            viewPadding: const EdgeInsets.only(top: 59, bottom: bottomSafeArea),
          ),
          child: child!,
        ),
        home: BookDetailScreen(
          key: ValueKey(
            'bok389-book-detail-${locale.languageCode}-${brightness.name}',
          ),
          loadRemoteData: false,
          book: Book(
              id: 'bok-389-completed-route-fixture',
              title: 'A completed-book route fixture with a long title',
              author: 'Bookgolas QA',
              startDate: DateTime(2026, 8, 1),
              targetDate: DateTime(2026, 8, 2),
              currentPage: 320,
              totalPages: 320,
              status: BookStatus.completed.value),
        ),
      ),
    );
  }
}
