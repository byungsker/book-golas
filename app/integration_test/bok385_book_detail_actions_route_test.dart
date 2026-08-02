import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/view_model/ad_view_model.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const captureLocale = String.fromEnvironment('BOK385_CAPTURE_LOCALE');
  const captureBrightness = String.fromEnvironment('BOK385_CAPTURE_THEME');
  const evidenceHoldMilliseconds = int.fromEnvironment(
    'BOK385_EVIDENCE_HOLD_MILLISECONDS',
  );

  setUpAll(() async {
    await Supabase.initialize(
      url: 'http://127.0.0.1:65535',
      anonKey: 'test-anon-key',
    );
  });

  for (final testCase in const [
    (locale: Locale('ko'), brightness: Brightness.light),
    (locale: Locale('en'), brightness: Brightness.dark),
  ]) {
    if (captureLocale.isNotEmpty &&
        captureLocale != testCase.locale.languageCode) {
      continue;
    }
    if (captureBrightness.isNotEmpty &&
        captureBrightness != testCase.brightness.name) {
      continue;
    }
    testWidgets(
      'BOK-385 shows complete actions above the home indicator at 393px and 200 percent in ${testCase.locale.languageCode} ${testCase.brightness.name}',
      (tester) async {
        await binding.setSurfaceSize(const Size(393, 852));
        addTearDown(() => binding.setSurfaceSize(null));

        await tester.pumpWidget(
          _BookDetailActionsRouteFixture(
            locale: testCase.locale,
            brightness: testCase.brightness,
          ),
        );
        await tester.pump(const Duration(milliseconds: 300));

        final labels = testCase.locale.languageCode == 'ko'
            ? const (record: '기록', startReading: '독서 시작')
            : const (record: 'Record', startReading: 'Start Reading');
        expect(find.semantics.byLabel(labels.record), findsOneWidget);
        expect(find.semantics.byLabel(labels.startReading), findsOneWidget);
        expect(find.text(labels.record), findsOneWidget);
        expect(find.text(labels.startReading), findsOneWidget);

        final record = find.ancestor(
          of: find.text(labels.record),
          matching: find.byType(GestureDetector),
        );
        final startReading = find.ancestor(
          of: find.text(labels.startReading),
          matching: find.byType(GestureDetector),
        );
        final recordRect = tester.getRect(record);
        final startReadingRect = tester.getRect(startReading);
        expect(recordRect.height, greaterThanOrEqualTo(48));
        expect(startReadingRect.height, greaterThanOrEqualTo(48));
        expect(recordRect.bottom, lessThan(startReadingRect.top));
        expect(startReadingRect.bottom, lessThanOrEqualTo(796));
        expect(tester.takeException(), isNull);

        await binding.takeScreenshot(
          'BOK-385-${testCase.locale.languageCode}-${testCase.brightness.name}-393-200-actions',
        );
        if (evidenceHoldMilliseconds > 0) {
          await tester.pump(
            const Duration(milliseconds: evidenceHoldMilliseconds),
          );
        }
      },
    );
  }
}

class _BookDetailActionsRouteFixture extends StatelessWidget {
  const _BookDetailActionsRouteFixture({
    required this.locale,
    required this.brightness,
  });

  final Locale locale;
  final Brightness brightness;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      locale: locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      theme: BLabTheme.light,
      darkTheme: BLabTheme.dark,
      themeMode:
          brightness == Brightness.dark ? ThemeMode.dark : ThemeMode.light,
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
            id: 'bok-385-safe-fixture',
            title: 'The Little Prince',
            author: 'Antoine de Saint-Exupery',
            startDate: DateTime(2026, 8, 1),
            targetDate: DateTime(2026, 8, 31),
            currentPage: 42,
            totalPages: 320,
            status: BookStatus.reading.value,
          ),
        ),
      ),
    );
  }
}
