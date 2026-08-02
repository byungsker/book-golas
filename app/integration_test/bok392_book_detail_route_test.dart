import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/book_detail/widgets/compact_book_header.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/view_model/ad_view_model.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const captureLocale = String.fromEnvironment('BOK392_CAPTURE_LOCALE');
  const captureBrightness = String.fromEnvironment('BOK392_CAPTURE_THEME');
  const evidenceHoldMilliseconds = int.fromEnvironment(
    'BOK392_EVIDENCE_HOLD_MILLISECONDS',
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
        'BOK-392 detail route is readable at 393px and 200 percent in '
        '${locale.languageCode} ${brightness.name}',
        (tester) async {
          await binding.setSurfaceSize(const Size(393, 852));
          addTearDown(() => binding.setSurfaceSize(null));

          await tester.pumpWidget(
            _BookDetailRouteFixture(
              locale: locale,
              brightness: brightness,
            ),
          );
          await tester.pump(const Duration(milliseconds: 300));

          expect(find.byType(BookDetailScreen), findsOneWidget);
          expect(find.byType(CompactBookHeader), findsOneWidget);
          expect(find.text(_title), findsOneWidget);
          expect(find.text(_author), findsOneWidget);
          final l10n = AppLocalizations.of(
            tester.element(find.byType(BookDetailScreen)),
          );
          expect(find.text(l10n.statusReading), findsOneWidget);
          expect(tester.takeException(), isNull);

          await binding.takeScreenshot(
            'BOK-392-${locale.languageCode}-${brightness.name}-393-200',
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
}

const _title =
    'The Little Prince: An Illustrated Anniversary Edition with a Long Subtitle';
const _author =
    'Antoine de Saint-Exupéry and the International Translation Team';

class _BookDetailRouteFixture extends StatelessWidget {
  const _BookDetailRouteFixture({
    required this.locale,
    required this.brightness,
  });

  final Locale locale;
  final Brightness brightness;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
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
          isEmbedded: true,
          loadRemoteData: false,
          book: Book(
            id: 'bok-392-safe-fixture',
            title: _title,
            author: _author,
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
