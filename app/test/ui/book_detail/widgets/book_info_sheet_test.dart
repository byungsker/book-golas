import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/book_detail_info_cache.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/book_detail_info.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/sheets/book_info_sheet.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

void main() {
  final cache = BookDetailInfoCache.instance;

  setUp(cache.clear);

  testWidgets('reopening the detail sheet reuses one provider-backed result', (
    tester,
  ) async {
    var providerCalls = 0;
    final detail = BookDetailInfo(description: 'Provider-backed description');

    await tester.pumpWidget(
      MaterialApp(
        theme: BLabTheme.light,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: const Scaffold(body: SizedBox.shrink()),
      ),
    );

    final context = tester.element(find.byType(Scaffold));
    Future<BookDetailInfo?> loadFromProvider(Book book) async {
      providerCalls++;
      return detail;
    }

    final first = showBookInfoSheet(
      context,
      _book,
      detailLoader: loadFromProvider,
    );
    await tester.pumpAndSettle();
    expect(find.text('Provider-backed description'), findsOneWidget);

    Navigator.of(context).pop();
    await first;
    await tester.pumpAndSettle();

    final second = showBookInfoSheet(
      context,
      _book,
      detailLoader: loadFromProvider,
    );
    await tester.pumpAndSettle();
    expect(find.text('Provider-backed description'), findsOneWidget);

    Navigator.of(context).pop();
    await second;

    expect(providerCalls, 1);
  });
}

final _book = Book(
  id: 'book-info-sheet-cache-test',
  title: 'Cache Test Book',
  author: 'Test Author',
  startDate: DateTime(2026, 8, 1),
  targetDate: DateTime(2026, 8, 31),
  isbn: '979-1',
);
