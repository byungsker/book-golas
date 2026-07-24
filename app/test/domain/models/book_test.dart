import 'package:flutter_test/flutter_test.dart';
import 'package:book_golas/domain/models/book.dart';

void main() {
  group('Book', () {
    group('fromJson', () {
      test('should parse all required fields correctly', () {
        final json = {
          'id': 'test-id',
          'title': 'Test Book',
          'author': 'Test Author',
          'start_date': '2026-01-01T00:00:00.000Z',
          'target_date': '2026-02-01T00:00:00.000Z',
          'current_page': 50,
          'total_pages': 200,
          'status': 'reading',
        };

        final book = Book.fromJson(json);

        expect(book.id, 'test-id');
        expect(book.title, 'Test Book');
        expect(book.author, 'Test Author');
        expect(book.startDate, DateTime.parse('2026-01-01T00:00:00.000Z'));
        expect(book.targetDate, DateTime.parse('2026-02-01T00:00:00.000Z'));
        expect(book.currentPage, 50);
        expect(book.totalPages, 200);
        expect(book.status, 'reading');
      });

      test('should use default values for optional nullable fields', () {
        final json = {
          'title': 'Minimal Book',
          'start_date': '2026-01-01T00:00:00.000Z',
          'target_date': '2026-02-01T00:00:00.000Z',
        };

        final book = Book.fromJson(json);

        expect(book.id, isNull);
        expect(book.author, isNull);
        expect(book.imageUrl, isNull);
        expect(book.currentPage, 0);
        expect(book.totalPages, 0);
        expect(book.attemptCount, 1);
        expect(book.rating, isNull);
        expect(book.review, isNull);
      });

      test('should parse all optional fields when provided', () {
        final json = {
          'id': 'test-id',
          'title': 'Full Book',
          'author': 'Author Name',
          'start_date': '2026-01-01T00:00:00.000Z',
          'target_date': '2026-02-01T00:00:00.000Z',
          'image_url': 'https://example.com/image.jpg',
          'current_page': 100,
          'total_pages': 300,
          'created_at': '2026-01-01T10:00:00.000Z',
          'updated_at': '2026-01-15T10:00:00.000Z',
          'status': 'completed',
          'attempt_count': 2,
          'daily_target_pages': 10,
          'priority': 1,
          'paused_at': '2026-01-10T00:00:00.000Z',
          'planned_start_date': '2026-01-05T00:00:00.000Z',
          'deleted_at': null,
          'genre': 'Fiction',
          'publisher': 'Test Publisher',
          'isbn': '978-1234567890',
          'rating': 5,
          'review': 'Great book!',
          'review_link': 'https://blog.example.com/review',
          'aladin_url': 'https://aladin.co.kr/book/123',
          'price': 18000,
        };

        final book = Book.fromJson(json);

        expect(book.imageUrl, 'https://example.com/image.jpg');
        expect(book.createdAt, DateTime.parse('2026-01-01T10:00:00.000Z'));
        expect(book.updatedAt, DateTime.parse('2026-01-15T10:00:00.000Z'));
        expect(book.status, 'completed');
        expect(book.attemptCount, 2);
        expect(book.dailyTargetPages, 10);
        expect(book.priority, 1);
        expect(book.pausedAt, DateTime.parse('2026-01-10T00:00:00.000Z'));
        expect(
            book.plannedStartDate, DateTime.parse('2026-01-05T00:00:00.000Z'));
        expect(book.deletedAt, isNull);
        expect(book.genre, 'Fiction');
        expect(book.publisher, 'Test Publisher');
        expect(book.isbn, '978-1234567890');
        expect(book.rating, 5);
        expect(book.review, 'Great book!');
        expect(book.reviewLink, 'https://blog.example.com/review');
        expect(book.aladinUrl, 'https://aladin.co.kr/book/123');
        expect(book.price, 18000);
      });

      test('should parse longReview field from JSON', () {
        final json = {
          'title': 'Test Book',
          'start_date': '2026-01-01T00:00:00.000Z',
          'target_date': '2026-02-01T00:00:00.000Z',
          'long_review': 'This is a comprehensive review of the book.',
        };

        final book = Book.fromJson(json);

        expect(book.longReview, 'This is a comprehensive review of the book.');
      });

      test('should handle null longReview field', () {
        final json = {
          'title': 'Test Book',
          'start_date': '2026-01-01T00:00:00.000Z',
          'target_date': '2026-02-01T00:00:00.000Z',
        };

        final book = Book.fromJson(json);

        expect(book.longReview, isNull);
      });
    });

    group('toJson', () {
      test('should serialize all fields correctly', () {
        final book = Book(
          id: 'test-id',
          title: 'Test Book',
          author: 'Test Author',
          startDate: DateTime.parse('2026-01-01T00:00:00.000Z'),
          targetDate: DateTime.parse('2026-02-01T00:00:00.000Z'),
          currentPage: 50,
          totalPages: 200,
          status: 'reading',
          rating: 4,
          review: 'Good read',
          price: 22000,
        );

        final json = book.toJson();

        expect(json['id'], 'test-id');
        expect(json['title'], 'Test Book');
        expect(json['author'], 'Test Author');
        expect(json['start_date'], '2026-01-01T00:00:00.000Z');
        expect(json['target_date'], '2026-02-01T00:00:00.000Z');
        expect(json['current_page'], 50);
        expect(json['total_pages'], 200);
        expect(json['status'], 'reading');
        expect(json['rating'], 4);
        expect(json['review'], 'Good read');
        expect(json['price'], 22000);
      });

      test('should include longReview when present', () {
        final book = Book(
          title: 'Test Book',
          startDate: DateTime.parse('2026-01-01T00:00:00.000Z'),
          targetDate: DateTime.parse('2026-02-01T00:00:00.000Z'),
          longReview: 'This is a detailed review with multiple paragraphs.',
        );

        final json = book.toJson();

        expect(json['long_review'],
            'This is a detailed review with multiple paragraphs.');
      });

      test('should exclude null optional fields', () {
        final book = Book(
          title: 'Minimal Book',
          startDate: DateTime.parse('2026-01-01T00:00:00.000Z'),
          targetDate: DateTime.parse('2026-02-01T00:00:00.000Z'),
        );

        final json = book.toJson();

        expect(json.containsKey('id'), false);
        expect(json.containsKey('rating'), false);
        expect(json.containsKey('review'), false);
        expect(json.containsKey('review_link'), false);
        expect(json.containsKey('genre'), false);
        expect(json.containsKey('publisher'), false);
        expect(json.containsKey('isbn'), false);
        expect(json.containsKey('price'), false);
      });

      test('should be reversible with fromJson', () {
        final original = Book(
          id: 'test-id',
          title: 'Roundtrip Book',
          author: 'Roundtrip Author',
          startDate: DateTime.parse('2026-01-01T00:00:00.000Z'),
          targetDate: DateTime.parse('2026-02-01T00:00:00.000Z'),
          currentPage: 75,
          totalPages: 150,
          status: 'reading',
          attemptCount: 1,
        );

        final json = original.toJson();
        final restored = Book.fromJson(json);

        expect(restored.id, original.id);
        expect(restored.title, original.title);
        expect(restored.author, original.author);
        expect(restored.currentPage, original.currentPage);
        expect(restored.totalPages, original.totalPages);
        expect(restored.status, original.status);
      });
    });

    group('copyWith', () {
      late Book originalBook;

      setUp(() {
        originalBook = Book(
          id: 'original-id',
          title: 'Original Title',
          author: 'Original Author',
          startDate: DateTime.parse('2026-01-01T00:00:00.000Z'),
          targetDate: DateTime.parse('2026-02-01T00:00:00.000Z'),
          currentPage: 50,
          totalPages: 200,
          status: 'reading',
        );
      });

      test('should return same values when no changes', () {
        final copied = originalBook.copyWith();

        expect(copied.id, originalBook.id);
        expect(copied.title, originalBook.title);
        expect(copied.author, originalBook.author);
        expect(copied.currentPage, originalBook.currentPage);
        expect(copied.totalPages, originalBook.totalPages);
        expect(copied.status, originalBook.status);
      });

      test('should update only specified fields', () {
        final updated = originalBook.copyWith(
          currentPage: 100,
          status: 'completed',
        );

        expect(updated.id, originalBook.id);
        expect(updated.title, originalBook.title);
        expect(updated.author, originalBook.author);
        expect(updated.currentPage, 100);
        expect(updated.totalPages, originalBook.totalPages);
        expect(updated.status, 'completed');
      });

      test('should update rating and review', () {
        final updated = originalBook.copyWith(
          rating: 5,
          review: 'Excellent book!',
        );

        expect(updated.rating, 5);
        expect(updated.review, 'Excellent book!');
        expect(updated.title, originalBook.title);
      });

      test('should update longReview field', () {
        final updated = originalBook.copyWith(
          longReview: 'This is a comprehensive review of the book.',
        );

        expect(
            updated.longReview, 'This is a comprehensive review of the book.');
        expect(updated.title, originalBook.title);
        expect(updated.id, originalBook.id);
      });

      test('should not mutate original book', () {
        final _ = originalBook.copyWith(
          currentPage: 150,
          status: 'completed',
        );

        expect(originalBook.currentPage, 50);
        expect(originalBook.status, 'reading');
      });
    });
  });

  group('BookStatus', () {
    test('should have correct string values', () {
      expect(BookStatus.planned.value, 'planned');
      expect(BookStatus.reading.value, 'reading');
      expect(BookStatus.completed.value, 'completed');
      expect(BookStatus.willRetry.value, 'will_retry');
    });

    test('fromString should return correct enum', () {
      expect(BookStatus.fromString('planned'), BookStatus.planned);
      expect(BookStatus.fromString('reading'), BookStatus.reading);
      expect(BookStatus.fromString('completed'), BookStatus.completed);
      expect(BookStatus.fromString('will_retry'), BookStatus.willRetry);
    });

    test('fromString should default to reading for unknown values', () {
      expect(BookStatus.fromString('unknown'), BookStatus.reading);
      expect(BookStatus.fromString(null), BookStatus.reading);
      expect(BookStatus.fromString(''), BookStatus.reading);
    });
  });

  group('BookSearchResult', () {
    test('fromJson should parse aladin API response correctly', () {
      final json = {
        'title': 'Test Book Title',
        'author': 'Test Author',
        'cover': 'https://example.com/cover.jpg',
        'subInfo': {'itemPage': 300},
        'isbn13': '978-1234567890',
        'categoryName': 'Books>Fiction>Novel',
        'publisher': 'Test Publisher',
        'link': 'https://aladin.co.kr/shop/wproduct.aspx?ItemId=123',
      };

      final result = BookSearchResult.fromJson(json);

      expect(result.title, 'Test Book Title');
      expect(result.author, 'Test Author');
      expect(result.imageUrl, 'https://example.com/cover.jpg');
      expect(result.totalPages, 300);
      expect(result.isbn, '978-1234567890');
      expect(result.genre, 'Fiction');
      expect(result.publisher, 'Test Publisher');
      expect(result.aladinUrl,
          'https://aladin.co.kr/shop/wproduct.aspx?ItemId=123');
    });

    test('fromJson should handle missing optional fields', () {
      final json = {
        'title': 'Minimal Book',
        'author': 'Author',
      };

      final result = BookSearchResult.fromJson(json);

      expect(result.title, 'Minimal Book');
      expect(result.author, 'Author');
      expect(result.imageUrl, isNull);
      expect(result.totalPages, isNull);
      expect(result.isbn, isNull);
      expect(result.genre, isNull);
      expect(result.publisher, isNull);
      expect(result.aladinUrl, isNull);
    });

    test('fromJson should parse itemPage as string', () {
      final json = {
        'title': 'Test Book',
        'author': 'Author',
        'subInfo': {'itemPage': '250'},
      };

      final result = BookSearchResult.fromJson(json);

      expect(result.totalPages, 250);
    });

    test('fromJson should extract genre from categoryName', () {
      final jsonWithMultipleParts = {
        'title': 'Test',
        'author': 'Author',
        'categoryName': 'Books>Self-Help>Psychology',
      };

      final result1 = BookSearchResult.fromJson(jsonWithMultipleParts);
      expect(result1.genre, 'Self-Help');

      final jsonWithSinglePart = {
        'title': 'Test',
        'author': 'Author',
        'categoryName': 'Fiction',
      };

      final result2 = BookSearchResult.fromJson(jsonWithSinglePart);
      expect(result2.genre, 'Fiction');
    });

    test('fromJson should fallback to isbn when isbn13 is missing', () {
      final json = {
        'title': 'Old Book',
        'author': 'Author',
        'isbn': '1234567890',
      };

      final result = BookSearchResult.fromJson(json);

      expect(result.isbn, '1234567890');
    });
  });
}
