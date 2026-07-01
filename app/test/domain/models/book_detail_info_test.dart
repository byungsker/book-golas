import 'package:flutter_test/flutter_test.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/book_detail_info.dart';

void main() {
  group('BookDetailInfo', () {
    test('fromLocal copies price from book', () {
      final book = Book(
        title: 'Test Book',
        startDate: DateTime.parse('2026-01-01T00:00:00.000Z'),
        targetDate: DateTime.parse('2026-02-01T00:00:00.000Z'),
        price: 18000,
      );

      final detail = BookDetailInfo.fromLocal(book);

      expect(detail.price, 18000);
    });

    test('copyWith updates price while preserving existing values', () {
      final detail = BookDetailInfo(
        title: 'Test Book',
        price: 18000,
      );

      final copied = detail.copyWith(price: 22000);

      expect(copied.title, 'Test Book');
      expect(copied.price, 22000);
    });
  });
}
