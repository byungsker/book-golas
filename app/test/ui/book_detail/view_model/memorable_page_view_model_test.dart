import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/book_image_storage_service.dart';
import 'package:book_golas/ui/book_detail/view_model/memorable_page_view_model.dart';

class MockSupabaseClient extends Mock implements SupabaseClient {}

class MockBookImageStorageService extends Mock
    implements BookImageStorageService {}

void main() {
  late MockBookImageStorageService storageService;
  late MemorablePageViewModel viewModel;

  setUp(() {
    storageService = MockBookImageStorageService();
    viewModel = MemorablePageViewModel(
      bookId: 'book-id',
      client: MockSupabaseClient(),
      bookImageStorageService: storageService,
    );
  });

  test('quarantines an image URL from another storage bucket', () async {
    final result = await viewModel.resolveImageUrlForTesting({
      'id': 'image-id',
      'image_url':
          'https://example.supabase.co/storage/v1/object/public/avatars/a.jpg',
    });

    expect(result['image_url'], isNull);
    verifyNever(() => storageService.createSignedUrl(any()));
  });

  test('quarantines an image when signed URL creation fails', () async {
    when(() => storageService.createSignedUrl('user/book/image.jpg'))
        .thenThrow(StateError('temporary failure'));

    final result = await viewModel.resolveImageUrlForTesting({
      'id': 'image-id',
      'image_url': 'user/book/image.jpg',
    });

    expect(result['image_url'], isNull);
    expect(result['_storage_path'], 'user/book/image.jpg');
    expect(result['_image_load_failed'], isTrue);
  });

  test('marks a record without an image source as unavailable', () async {
    final result = await viewModel.resolveImageUrlForTesting({
      'id': 'image-id',
      'image_url': null,
    });

    expect(result['image_url'], isNull);
    expect(result['_image_load_failed'], isTrue);
    expect(result['_image_source_missing'], isTrue);
    verifyNever(() => storageService.createSignedUrl(any()));
  });

  test('marks a successful signed URL as available', () async {
    when(() => storageService.createSignedUrl('user/book/image.jpg'))
        .thenAnswer((_) async => 'https://example.com/signed-image');

    final result = await viewModel.resolveImageUrlForTesting({
      'id': 'image-id',
      'image_url': 'user/book/image.jpg',
    });

    expect(result['image_url'], 'https://example.com/signed-image');
    expect(result['_image_load_failed'], isFalse);
  });

  test('keeps replacement success after non-critical cleanup failures',
      () async {
    final events = <String>[];

    final result = await viewModel.replaceStoredImage(
      existingStoragePath: 'old.jpg',
      upload: () async {
        events.add('upload');
        return 'new.jpg';
      },
      updateRecord: (path) async {
        events.add('update:$path');
        return true;
      },
      removeOld: (path) async {
        events.add('remove-old:$path');
        throw StateError('temporary cleanup failure');
      },
      removeNew: (path) async {
        events.add('remove-new:$path');
      },
      refresh: () async {
        events.add('refresh');
        throw StateError('temporary signed URL failure');
      },
    );

    expect(result, isTrue);
    expect(events, [
      'upload',
      'update:new.jpg',
      'remove-old:old.jpg',
      'refresh',
    ]);
  });

  test('cleans uploaded object when record update fails', () async {
    final events = <String>[];

    final result = await viewModel.replaceStoredImage(
      existingStoragePath: 'old.jpg',
      upload: () async {
        events.add('upload');
        return 'new.jpg';
      },
      updateRecord: (path) async {
        events.add('update:$path');
        return false;
      },
      removeOld: (path) async {
        events.add('remove-old:$path');
      },
      removeNew: (path) async {
        events.add('remove-new:$path');
      },
      refresh: () async {
        events.add('refresh');
      },
    );

    expect(result, isFalse);
    expect(events, [
      'upload',
      'update:new.jpg',
      'remove-new:new.jpg',
    ]);
    expect(viewModel.failure, MemorablePageFailure.replace);
    expect(viewModel.errorMessage, MemorablePageFailure.replace.name);
    expect(viewModel.errorMessage, isNot(contains('Image record')));
  });
}
