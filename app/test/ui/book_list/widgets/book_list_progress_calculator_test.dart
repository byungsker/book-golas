import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/book_list/widgets/book_list_progress_calculator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('calculateTodayGoalProgress', () {
    test('returns 0 percent when no page update was recorded today', () {
      final book = Book(
        id: 'book-1',
        title: 'Test Book',
        startDate: DateTime(2026, 6, 1),
        targetDate: DateTime(2026, 6, 20),
        currentPage: 100,
        totalPages: 130,
        status: BookStatus.reading.value,
      );

      final progress = calculateTodayGoalProgress(
        book: book,
        todayPagesRead: 0,
        today: DateTime(2026, 6, 20),
      );

      expect(progress.todayStartPage, 100);
      expect(progress.dailyTargetPages, 30);
      expect(progress.progress, 0);
      expect(progress.percentLabel, '0%');
    });

    test('uses pages read today divided by today target pages', () {
      final book = Book(
        id: 'book-1',
        title: 'Test Book',
        startDate: DateTime(2026, 6, 1),
        targetDate: DateTime(2026, 6, 20),
        currentPage: 110,
        totalPages: 130,
        status: BookStatus.reading.value,
      );

      final progress = calculateTodayGoalProgress(
        book: book,
        todayPagesRead: 10,
        today: DateTime(2026, 6, 20),
      );

      expect(progress.todayStartPage, 100);
      expect(progress.dailyTargetPages, 30);
      expect(progress.progress, closeTo(1 / 3, 0.001));
      expect(progress.percentLabel, '33%');
    });

    test('includes today and target date when computing catch-up target', () {
      final book = Book(
        id: 'book-1',
        title: 'Moral Ambition',
        startDate: DateTime(2026, 6, 1),
        targetDate: DateTime(2026, 6, 21),
        currentPage: 124,
        totalPages: 404,
        status: BookStatus.reading.value,
      );

      final progress = calculateTodayGoalProgress(
        book: book,
        todayPagesRead: 52,
        today: DateTime(2026, 6, 20),
      );

      expect(progress.todayStartPage, 72);
      expect(progress.dailyTargetPages, 166);
      expect(progress.progress, closeTo(52 / 166, 0.001));
      expect(progress.percentLabel, '31%');
    });
  });
}
