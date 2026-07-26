import 'package:flutter/cupertino.dart';
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
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(500, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
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
          child: BookShareCard(
            book: book,
            highlightCount: 7,
            noteText: 'Small habits compound into remarkable results.',
          ),
        ),
      );

      expect(find.text('Reading'), findsOneWidget);
      expect(find.text('50'), findsOneWidget);
      expect(find.text('%'), findsOneWidget);
      expect(find.text('Due 2026.03.31'), findsOneWidget);
      expect(find.text('Notes from this book'), findsOneWidget);
      expect(find.text('120p left'), findsOneWidget);
      expect(find.textContaining('days overdue'), findsOneWidget);
      expect(find.text('Started 03.01'), findsOneWidget);
      expect(find.text('7 records'), findsOneWidget);
      expect(
        find.text('Small habits compound into remarkable results.'),
        findsOneWidget,
      );
      expect(find.text('Bookgolas'), findsOneWidget);
      expect(
        tester.getSize(find.byType(BookShareCard)),
        const Size(BookShareCard.cardWidth, BookShareCard.cardHeight),
      );
    });

    testWidgets('renders localized korean completion content', (
      WidgetTester tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(500, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
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
          child: BookShareCard(
            book: book,
            highlightCount: 12,
            noteText: '작은 습관이 큰 변화를 만든다는 점이 인상적이었다.',
          ),
        ),
      );

      expect(find.text('완독'), findsOneWidget);
      expect(find.text('5일 완독'), findsOneWidget);
      expect(find.text('12 기록'), findsOneWidget);
      expect(find.text('북골라스'), findsOneWidget);
      expect(find.text('이 책에서 남긴 기록'), findsOneWidget);
      expect(find.byIcon(CupertinoIcons.star_fill), findsNothing);
    });

    testWidgets('pluralizes singular english share metadata', (
      WidgetTester tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(500, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final book = Book(
        id: 'book-singular',
        title: 'Deep Work',
        startDate: DateTime(2026, 3, 1),
        targetDate: DateTime(2026, 3, 31),
        updatedAt: DateTime(2026, 3, 1),
        totalPages: 304,
        status: BookStatus.completed.value,
      );

      await tester.pumpWidget(
        _buildTestApp(
          locale: const Locale('en'),
          child: BookShareCard(book: book, highlightCount: 1),
        ),
      );

      expect(find.text('Finished in 1 day'), findsOneWidget);
      expect(find.text('1 record'), findsOneWidget);
    });

    testWidgets('omits the note panel when a reading share has no note', (
      WidgetTester tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(500, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final book = Book(
        id: 'book-no-note',
        title: 'Deep Work',
        startDate: DateTime(2026, 3, 1),
        targetDate: DateTime(2026, 3, 31),
        currentPage: 12,
        totalPages: 320,
        status: BookStatus.reading.value,
      );

      await tester.pumpWidget(
        _buildTestApp(
          locale: const Locale('en'),
          child: BookShareCard(book: book),
        ),
      );

      expect(find.text('Notes from this book'), findsNothing);
      expect(find.text('4'), findsOneWidget);
      expect(find.text('%'), findsOneWidget);
      expect(find.text('12 / 320p'), findsOneWidget);
    });

    testWidgets('honors an explicit empty note instead of restoring a review', (
      WidgetTester tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(500, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final book = Book(
        id: 'book-empty-note',
        title: 'Essentialism',
        startDate: DateTime(2026, 3, 1),
        targetDate: DateTime(2026, 3, 31),
        currentPage: 80,
        totalPages: 240,
        status: BookStatus.reading.value,
        review: 'This review should not be reinserted.',
      );

      await tester.pumpWidget(
        _buildTestApp(
          locale: const Locale('en'),
          child: BookShareCard(
            book: book,
            useBookReviewFallback: false,
          ),
        ),
      );

      expect(find.text('Notes from this book'), findsNothing);
      expect(find.text('This review should not be reinserted.'), findsNothing);
    });

    testWidgets('renders localized planned and retry metadata', (
      WidgetTester tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(500, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final plannedBook = Book(
        id: 'planned-book',
        title: 'The Creative Act',
        author: 'Rick Rubin',
        startDate: DateTime(2026, 4, 1),
        targetDate: DateTime(2026, 5, 1),
        plannedStartDate: DateTime(2026, 4, 1),
        totalPages: 300,
        genre: 'Creativity',
        status: BookStatus.planned.value,
      );

      await tester.pumpWidget(
        _buildTestApp(
          locale: const Locale('en'),
          child: BookShareCard(book: plannedBook),
        ),
      );

      expect(find.text('Starts 04.01'), findsOneWidget);
      expect(find.text('Creativity'), findsOneWidget);
      expect(find.text('300p'), findsOneWidget);
      expect(find.text('📅'), findsOneWidget);
      expect(find.text('🏷️'), findsOneWidget);

      final retryBook = plannedBook.copyWith(
        status: BookStatus.willRetry.value,
        attemptCount: 2,
      );
      await tester.pumpWidget(
        _buildTestApp(
          locale: const Locale('en'),
          child: BookShareCard(book: retryBook),
        ),
      );
      expect(find.text('Attempt 2'), findsOneWidget);
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
