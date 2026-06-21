import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/book_limit_calculator.dart';
import 'package:book_golas/domain/models/book.dart';

void main() {
  group('BookLimitCalculator', () {
    Book book(String id, BookStatus status) {
      return Book(
        id: id,
        title: 'Book $id',
        startDate: DateTime(2026),
        targetDate: DateTime(2026, 2),
        status: status.value,
      );
    }

    test('counts only currently reading books for concurrent limit', () {
      final books = [
        book('reading-1', BookStatus.reading),
        book('reading-2', BookStatus.reading),
        book('planned', BookStatus.planned),
        book('completed', BookStatus.completed),
        book('retry', BookStatus.willRetry),
      ];

      expect(BookLimitCalculator.countConcurrentReadingBooks(books), 2);
    });

    test('can exclude the book being resumed from the reading count', () {
      final books = [
        book('reading-1', BookStatus.reading),
        book('resume-target', BookStatus.reading),
        book('reading-2', BookStatus.reading),
      ];

      expect(
        BookLimitCalculator.countConcurrentReadingBooks(
          books,
          excludeBookId: 'resume-target',
        ),
        2,
      );
    });
  });
}
