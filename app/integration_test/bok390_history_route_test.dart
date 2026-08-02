import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';
import 'package:book_golas/ui/book_detail/widgets/floating_action_bar.dart';
import 'package:book_golas/ui/book_detail/widgets/tabs/progress_history_tab.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/view_model/ad_view_model.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const captureLocale = String.fromEnvironment('BOK390_CAPTURE_LOCALE');
  const captureBrightness = String.fromEnvironment('BOK390_CAPTURE_THEME');
  const evidenceHoldMilliseconds = int.fromEnvironment(
    'BOK390_EVIDENCE_HOLD_MILLISECONDS',
  );

  late _HistoryRouteServer server;

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    server = await _HistoryRouteServer.start();
    await Supabase.initialize(url: server.url, anonKey: 'test-anon-key');
  });

  tearDownAll(() => server.close());

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
      'BOK-390 completed History route clears measured action bar at 393px and 200 percent in ${testCase.locale.languageCode} ${testCase.brightness.name}',
      (tester) async {
        await binding.setSurfaceSize(const Size(393, 852));
        addTearDown(() => binding.setSurfaceSize(null));

        await tester.pumpWidget(
          _CompletedHistoryRouteFixture(
            locale: testCase.locale,
            brightness: testCase.brightness,
          ),
        );
        await tester.pump(const Duration(milliseconds: 1000));
        await tester.pump();

        final l10n = AppLocalizations.of(
          tester.element(find.byType(BookDetailScreen)),
        );
        final history = find.byType(ProgressHistoryTab);
        final actionBar = find.byKey(FloatingActionBar.actionBarKey);
        final finalRecord = find.text(l10n.historyTabCumulativeLabel(320));

        expect(history, findsOneWidget);
        expect(actionBar, findsOneWidget);
        expect(find.text(l10n.historyTabCumulativePages), findsWidgets);
        expect(find.text(l10n.historyTabReadingTime), findsWidgets);
        expect(finalRecord, findsOneWidget);
        expect(tester.takeException(), isNull);

        final historyScrollable = find.descendant(
          of: history,
          matching: find.byType(Scrollable),
        );
        final position =
            tester.state<ScrollableState>(historyScrollable.first).position;
        position.jumpTo(position.maxScrollExtent);
        await tester.pump();

        expect(
          tester.getRect(finalRecord).bottom,
          lessThan(tester.getRect(actionBar).top),
        );
        expect(tester.takeException(), isNull);

        await binding.takeScreenshot(
          'BOK-390-${testCase.locale.languageCode}-${testCase.brightness.name}-393-200-history',
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

class _CompletedHistoryRouteFixture extends StatelessWidget {
  const _CompletedHistoryRouteFixture({
    required this.locale,
    required this.brightness,
  });

  final Locale locale;
  final Brightness brightness;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
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
          book: Book(
            id: 'history-route-fixture',
            title: 'A completed history fixture',
            author: 'Bookgolas QA',
            startDate: DateTime(2026, 7, 1),
            targetDate: DateTime(2026, 7, 31),
            currentPage: 320,
            totalPages: 320,
            status: BookStatus.completed.value,
            attemptCount: 2,
          ),
        ),
      ),
    );
  }
}

class _HistoryRouteServer {
  _HistoryRouteServer._(this._server);

  final HttpServer _server;

  String get url =>
      'http://${InternetAddress.loopbackIPv4.address}:${_server.port}';

  static Future<_HistoryRouteServer> start() async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final fixture = _HistoryRouteServer._(server);
    fixture._serve();
    return fixture;
  }

  void _serve() {
    _server.listen((request) async {
      request.response.headers.contentType = ContentType.json;
      request.response.write(jsonEncode(_responseFor(request.uri.path)));
      await request.response.close();
    });
  }

  Object _responseFor(String path) {
    if (path.endsWith('/books')) {
      return const {
        'id': 'history-route-fixture',
        'title': 'A completed history fixture',
        'author': 'Bookgolas QA',
        'start_date': '2026-07-01T00:00:00.000Z',
        'target_date': '2026-07-31T00:00:00.000Z',
        'current_page': 320,
        'total_pages': 320,
        'status': 'completed',
        'attempt_count': 2,
      };
    }
    if (path.endsWith('/reading_progress_history')) {
      return const [
        {
          'page': 96,
          'previous_page': 42,
          'reading_time': 900,
          'created_at': '2026-07-02T09:00:00.000Z',
        },
        {
          'page': 220,
          'previous_page': 96,
          'reading_time': 1800,
          'created_at': '2026-07-10T09:00:00.000Z',
        },
        {
          'page': 320,
          'previous_page': 220,
          'reading_time': 2400,
          'created_at': '2026-07-20T09:00:00.000Z',
        },
      ];
    }
    if (path.endsWith('/reading_sessions')) {
      return const [
        {
          'duration_seconds': 900,
          'created_at': '2026-07-02T09:00:00.000Z',
        },
        {
          'duration_seconds': 1800,
          'created_at': '2026-07-10T09:00:00.000Z',
        },
        {
          'duration_seconds': 2400,
          'created_at': '2026-07-20T09:00:00.000Z',
        },
      ];
    }
    return const [];
  }

  Future<void> close() => _server.close(force: true);
}
