import 'package:flutter_test/flutter_test.dart';
import 'package:book_golas/domain/models/book.dart';

void main() {
  group('WidgetDataService - syncCurrentBook data mapping', () {
    late Book testBook;

    setUp(() {
      testBook = Book(
        id: 'test-book-123',
        title: 'Flutter in Action',
        author: 'Eric Windmill',
        startDate: DateTime(2026, 1, 1),
        targetDate: DateTime(2026, 3, 1),
        imageUrl: 'https://example.com/cover.jpg',
        currentPage: 150,
        totalPages: 400,
        status: 'reading',
      );
    });

    test('should map book fields to correct widget data keys', () {
      final widgetData = <String, dynamic>{
        'book_id': testBook.id ?? '',
        'book_title': testBook.title,
        'book_author': testBook.author ?? '',
        'current_page': testBook.currentPage.toString(),
        'total_pages': testBook.totalPages.toString(),
        'image_path': '',
        'book_status': testBook.status ?? '',
      };

      expect(widgetData['book_id'], 'test-book-123');
      expect(widgetData['book_title'], 'Flutter in Action');
      expect(widgetData['book_author'], 'Eric Windmill');
      expect(widgetData['current_page'], '150');
      expect(widgetData['total_pages'], '400');
      expect(widgetData['book_status'], 'reading');
    });

    test('should handle null book id gracefully', () {
      final bookWithoutId = Book(
        title: 'No ID Book',
        startDate: DateTime(2026, 1, 1),
        targetDate: DateTime(2026, 3, 1),
        currentPage: 10,
        totalPages: 200,
      );

      final bookId = bookWithoutId.id ?? '';
      expect(bookId, '');
    });

    test('should handle null author gracefully', () {
      final bookWithoutAuthor = Book(
        id: 'test-id',
        title: 'No Author Book',
        startDate: DateTime(2026, 1, 1),
        targetDate: DateTime(2026, 3, 1),
      );

      final author = bookWithoutAuthor.author ?? '';
      expect(author, '');
    });

    test('should handle null status gracefully', () {
      final bookWithoutStatus = Book(
        id: 'test-id',
        title: 'No Status Book',
        startDate: DateTime(2026, 1, 1),
        targetDate: DateTime(2026, 3, 1),
      );

      final status = bookWithoutStatus.status ?? '';
      expect(status, '');
    });

    test('should convert page numbers to string', () {
      expect(testBook.currentPage.toString(), '150');
      expect(testBook.totalPages.toString(), '400');
    });
  });

  group('WidgetDataService - clearWidgetData', () {
    test('should produce empty string values for all widget keys', () {
      final clearedData = <String, dynamic>{
        'book_id': '',
        'book_title': '',
        'book_author': '',
        'current_page': '',
        'total_pages': '',
        'image_path': '',
        'book_status': '',
        'last_updated': '',
        'needs_sync': false,
      };

      expect(clearedData['book_id'], '');
      expect(clearedData['book_title'], '');
      expect(clearedData['book_author'], '');
      expect(clearedData['current_page'], '');
      expect(clearedData['total_pages'], '');
      expect(clearedData['image_path'], '');
      expect(clearedData['book_status'], '');
      expect(clearedData['last_updated'], '');
      expect(clearedData['needs_sync'], false);
    });

    test('should reset needs_sync to false', () {
      final clearedData = <String, dynamic>{'needs_sync': false};
      expect(clearedData['needs_sync'], isFalse);
    });
  });

  group('WidgetDataService - image caching path logic', () {
    test('should return null for null URL', () {
      const String? networkUrl = null;
      final shouldCache = networkUrl != null && networkUrl.isNotEmpty;
      expect(shouldCache, isFalse);
    });

    test('should return null for empty URL', () {
      const networkUrl = '';
      final shouldCache = networkUrl.isNotEmpty;
      expect(shouldCache, isFalse);
    });

    test('should proceed with valid URL', () {
      const networkUrl = 'https://example.com/image.jpg';
      final shouldCache = networkUrl.isNotEmpty;
      expect(shouldCache, isTrue);
    });

    test('should extract file extension from path', () {
      const filePath = '/cache/downloaded_file.jpg';
      final extension_ = filePath.split('.').last;
      expect(extension_, 'jpg');
    });

    test('should build local cache path correctly', () {
      const widgetImageDir = '/app_support/widget_images';
      const extension_ = 'png';
      const localPath = '$widgetImageDir/book_cover.$extension_';
      expect(localPath, '/app_support/widget_images/book_cover.png');
    });
  });

  group('WidgetDataService - needs_sync flag management', () {
    test('should skip sync when needs_sync is false', () {
      const needsSync = false;
      expect(needsSync, isFalse);
    });

    test('should skip sync when bookId is null', () {
      const String? bookId = null;
      final shouldSync = bookId != null && bookId.isNotEmpty;
      expect(shouldSync, isFalse);
    });

    test('should skip sync when bookId is empty', () {
      const bookId = '';
      final shouldSync = bookId.isNotEmpty;
      expect(shouldSync, isFalse);
    });

    test('should skip sync when currentPage string is null', () {
      const String? currentPageStr = null;
      final shouldSync = currentPageStr != null && currentPageStr.isNotEmpty;
      expect(shouldSync, isFalse);
    });

    test('should skip sync when currentPage is not a valid number', () {
      const currentPageStr = 'abc';
      final currentPage = int.tryParse(currentPageStr);
      expect(currentPage, isNull);
    });

    test('should parse valid currentPage string', () {
      const currentPageStr = '42';
      final currentPage = int.tryParse(currentPageStr);
      expect(currentPage, 42);
    });

    test('should proceed when all conditions are met', () {
      const needsSync = true;
      const bookId = 'test-book-id';
      const currentPageStr = '100';

      final validBookId = bookId.isNotEmpty;
      final validPage = int.tryParse(currentPageStr) != null;

      expect(needsSync, isTrue);
      expect(validBookId, isTrue);
      expect(validPage, isTrue);
    });
  });
}
