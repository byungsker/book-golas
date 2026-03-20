import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/book_share_card.dart';

void main() {
  group('BookShareCard', () {
    testWidgets('renders localized english share content', (
      WidgetTester tester,
    ) async {
      final book = Book(
        id: 'book-1',
        title: 'Atomic Habits',
        author: 'James Clear',
        startDate: DateTime(2026, 3, 1),
        targetDate: DateTime(2026, 3, 31),
        currentPage: 120,
        totalPages: 240,
        status: BookStatus.reading.value,
      );

      await tester.pumpWidget(
        _buildTestApp(
          locale: const Locale('en'),
          child: BookShareCard(book: book, highlightCount: 7),
        ),
      );

      expect(find.text('Reading'), findsOneWidget);
      expect(find.text('Started 03.01'), findsOneWidget);
      expect(find.text('7 records'), findsOneWidget);
      expect(find.text('Bookgolas'), findsOneWidget);
    });

    testWidgets('renders localized korean completion content', (
      WidgetTester tester,
    ) async {
      final book = Book(
        id: 'book-2',
        title: '아주 작은 습관의 힘',
        author: '제임스 클리어',
        startDate: DateTime(2026, 3, 1),
        targetDate: DateTime(2026, 3, 31),
        updatedAt: DateTime(2026, 3, 5),
        totalPages: 352,
        status: BookStatus.completed.value,
        rating: 5,
        review: '작은 습관이 큰 변화를 만든다는 점이 인상적이었다.',
      );

      await tester.pumpWidget(
        _buildTestApp(
          locale: const Locale('ko'),
          child: BookShareCard(book: book, highlightCount: 12),
        ),
      );

      expect(find.text('완독'), findsOneWidget);
      expect(find.text('5일 완독'), findsOneWidget);
      expect(find.text('12 기록'), findsOneWidget);
      expect(find.text('북골라스'), findsOneWidget);
    });
  });
}

Widget _buildTestApp({required Locale locale, required Widget child}) {
  return MaterialApp(
    locale: locale,
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: Scaffold(body: Center(child: child)),
  );
}
