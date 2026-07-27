import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/book_image_storage_service.dart';

void main() {
  group('BookImageStorageService.storagePathFromValue', () {
    test('returns a stored object path unchanged', () {
      expect(
        BookImageStorageService.storagePathFromValue(
          'user-id/book-id/image.jpg',
        ),
        'user-id/book-id/image.jpg',
      );
    });

    test('extracts a path from a legacy public URL', () {
      expect(
        BookImageStorageService.storagePathFromValue(
          'https://example.supabase.co/storage/v1/object/public/book-images/'
          'user-id/book-id/image%201.jpg',
        ),
        'user-id/book-id/image 1.jpg',
      );
    });

    test('extracts a path from a signed URL without retaining its query', () {
      expect(
        BookImageStorageService.storagePathFromValue(
          'https://example.supabase.co/storage/v1/object/sign/book-images/'
          'user-id/book-id/image.jpg?token=secret',
        ),
        'user-id/book-id/image.jpg',
      );
    });

    test('rejects URLs for a different bucket', () {
      expect(
        BookImageStorageService.storagePathFromValue(
          'https://example.supabase.co/storage/v1/object/public/avatars/'
          'user-id/avatar.jpg',
        ),
        isNull,
      );
    });

    test('returns null for malformed encoded URLs', () {
      expect(
        BookImageStorageService.storagePathFromValue(
          'https://example.supabase.co/storage/v1/object/public/book-images/'
          'user-id/%E0%A4%A.jpg',
        ),
        isNull,
      );
    });

    test('returns null for empty values', () {
      expect(BookImageStorageService.storagePathFromValue(null), isNull);
      expect(BookImageStorageService.storagePathFromValue('  '), isNull);
    });
  });
}
