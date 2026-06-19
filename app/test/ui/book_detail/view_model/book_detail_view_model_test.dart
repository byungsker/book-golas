import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/book_detail/view_model/book_detail_view_model.dart';

class MockBookService extends Mock implements BookService {}

void main() {
  group('BookDetailViewModel daily target', () {
    test(
        'recalculates catch-up target from remaining pages instead of stale stored target',
        () {
      final now = DateTime.now();
      final book = Book(
        id: 'book-1',
        title: 'Moral Ambition',
        startDate: now.subtract(const Duration(days: 15)),
        targetDate: now.add(const Duration(days: 1)),
        currentPage: 80,
        totalPages: 404,
        dailyTargetPages: 22,
      );

      final viewModel = BookDetailViewModel(
        bookService: MockBookService(),
        initialBook: book,
      );

      expect(viewModel.effectiveDailyTarget, 162);
      expect(viewModel.todayGoalPage, 242);
      expect(viewModel.pagesToGoal, 162);
      expect(viewModel.isTodayGoalAchieved, isFalse);
    });

    test('uses all remaining pages as target after deadline has passed', () {
      final now = DateTime.now();
      final book = Book(
        id: 'book-1',
        title: 'Overdue Book',
        startDate: now.subtract(const Duration(days: 20)),
        targetDate: now.subtract(const Duration(days: 1)),
        currentPage: 80,
        totalPages: 404,
        dailyTargetPages: 22,
      );

      final viewModel = BookDetailViewModel(
        bookService: MockBookService(),
        initialBook: book,
      );

      expect(viewModel.effectiveDailyTarget, 324);
      expect(viewModel.todayGoalPage, 404);
      expect(viewModel.pagesToGoal, 324);
    });
  });
}
