import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';
import 'package:book_golas/ui/book_detail/widgets/compact_book_header.dart';
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

  for (final locale in const [Locale('ko'), Locale('en')]) {
    for (final brightness in Brightness.values) {
      for (final width in const [320.0, 393.0]) {
        testWidgets(
          'detail header reflows without overflow at 200 percent in '
          '${locale.languageCode} ${brightness.name} ${width.toInt()}px',
          (tester) async {
            final semantics = tester.ensureSemantics();
            try {
              await _pumpDetailScreen(
                tester,
                locale: locale,
                brightness: brightness,
                width: width,
              );

              final headerFinder = find.byType(CompactBookHeader);
              expect(headerFinder, findsOneWidget);
              expect(tester.takeException(), isNull);

              final titleFinder = find.text(_title);
              final authorFinder = find.text(_author);
              final l10n = AppLocalizations.of(
                tester.element(find.byType(BookDetailScreen)),
              );
              final statusFinder = find.text(l10n.statusReading);
              final bookInfoLabel = l10n.bookInfoViewButton;
              final bookInfoFinder = find.byKey(
                const ValueKey('compact-book-header-book-info'),
              );
              expect(titleFinder, findsOneWidget);
              expect(authorFinder, findsOneWidget);
              expect(statusFinder, findsOneWidget);
              expect(bookInfoFinder, findsOneWidget);

              final headerRect = tester.getRect(headerFinder);
              for (final finder in [titleFinder, authorFinder, statusFinder]) {
                final rect = tester.getRect(finder);
                expect(rect.left, greaterThanOrEqualTo(headerRect.left));
                expect(rect.right, lessThanOrEqualTo(headerRect.right));
                expect(rect.top, greaterThanOrEqualTo(headerRect.top));
                expect(rect.bottom, lessThanOrEqualTo(headerRect.bottom));
              }

              final titleNode = tester.getSemantics(
                find.bySemanticsLabel(_title),
              );
              final authorNode = tester.getSemantics(
                find.bySemanticsLabel(_author),
              );
              expect(
                titleNode.getSemanticsData().flagsCollection.isButton,
                isTrue,
              );
              expect(
                authorNode.getSemanticsData().flagsCollection.isButton,
                isTrue,
              );
              final statusNode = tester.getSemantics(
                find.byKey(const ValueKey('compact-book-header-status')),
              );
              expect(
                statusNode.label,
                l10n.statusReading,
              );
              final bookInfoNode = tester.getSemantics(bookInfoFinder);
              expect(bookInfoNode.label, bookInfoLabel);
              expect(
                bookInfoNode.getSemanticsData().flagsCollection.isButton,
                isTrue,
              );
              expect(
                tester.getRect(bookInfoFinder).height,
                greaterThanOrEqualTo(48),
              );
            } finally {
              semantics.dispose();
            }
          },
        );
      }
    }
  }
}

const _title =
    'The Little Prince: An Illustrated Anniversary Edition with a Long Subtitle';
const _author =
    'Antoine de Saint-Exupéry and the International Translation Team';

Future<void> _pumpDetailScreen(
  WidgetTester tester, {
  required Locale locale,
  required Brightness brightness,
  required double width,
}) async {
  tester.view.physicalSize = Size(width, 852);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
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
            id: 'compact-header-test-book',
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
    ),
  );
  await tester.pump(const Duration(milliseconds: 300));
}
