import 'package:book_golas/domain/models/book.dart';

class BookLimitCalculator {
  static int countConcurrentReadingBooks(
    Iterable<Book> books, {
    String? excludeBookId,
  }) {
    return books.where((book) {
      if (excludeBookId != null && book.id == excludeBookId) return false;
      return book.status == BookStatus.reading.value;
    }).length;
  }
}
