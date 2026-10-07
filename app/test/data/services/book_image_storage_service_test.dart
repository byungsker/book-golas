import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/book_image_storage_service.dart';

void main() {
  group('BookImageStorageService.storagePathFromValue', () {
    test('keeps a plain storage path', () {
      expect(
        BookImageStorageService.storagePathFromValue('user/book/image.jpg'),
        'user/book/image.jpg',
      );
    });

    test('extracts a legacy public object path', () {
      expect(
        BookImageStorageService.storagePathFromValue(
          'https://example.supabase.co/storage/v1/object/public/book-images/'
          'user/book/image.jpg',
        ),
        'user/book/image.jpg',
      );
    });

    test('extracts and decodes a signed object path', () {
      expect(
        BookImageStorageService.storagePathFromValue(
          'https://example.supabase.co/storage/v1/object/sign/book-images/'
          'user/book/image%201.jpg?token=secret',
        ),
        'user/book/image 1.jpg',
      );
    });

    test('rejects another bucket URL', () {
      expect(
        BookImageStorageService.storagePathFromValue(
          'https://example.supabase.co/storage/v1/object/public/avatars/'
          'user/avatar.jpg',
        ),
        isNull,
      );
    });

    test('rejects malformed percent encoding', () {
      expect(
        BookImageStorageService.storagePathFromValue(
          'https://example.supabase.co/storage/v1/object/public/book-images/'
          'user/book/image%GG.jpg',
        ),
        isNull,
      );
    });

    test('returns null for empty values', () {
      expect(BookImageStorageService.storagePathFromValue(null), isNull);
      expect(BookImageStorageService.storagePathFromValue('  '), isNull);
    });
  });

  group('BookImageStorageService.isOwnedPath', () {
    test('accepts only the matching first path segment', () {
      expect(
        BookImageStorageService.isOwnedPath('user-a/book/image.jpg', 'user-a'),
        isTrue,
      );
      expect(
        BookImageStorageService.isOwnedPath('user-ab/book/image.jpg', 'user-a'),
        isFalse,
      );
    });

    test('accepts a matching legacy public URL', () {
      expect(
        BookImageStorageService.isOwnedPath(
          'https://example.supabase.co/storage/v1/object/public/book-images/'
              'user-a/book/image.jpg',
          'user-a',
        ),
        isTrue,
      );
    });
  });
}
