import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

class BookImageStorageService {
  BookImageStorageService({SupabaseClient? client})
    : _client = client ?? Supabase.instance.client;

  static const bucketName = 'book-images';
  static const signedUrlExpiresInSeconds = 3600;

  final SupabaseClient _client;

  static String? storagePathFromValue(String? value) {
    final trimmed = value?.trim();
    if (trimmed == null || trimmed.isEmpty) return null;

    final uri = Uri.tryParse(trimmed);
    if (uri == null || !uri.hasScheme) {
      return trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
    }

    const markers = [
      '/storage/v1/object/public/$bucketName/',
      '/storage/v1/object/sign/$bucketName/',
      '/storage/v1/object/authenticated/$bucketName/',
    ];

    for (final marker in markers) {
      final markerIndex = uri.path.indexOf(marker);
      if (markerIndex < 0) continue;

      try {
        return Uri.decodeComponent(
          uri.path.substring(markerIndex + marker.length),
        );
      } on FormatException {
        return null;
      }
    }

    return null;
  }

  Future<String> upload({
    required Uint8List imageBytes,
    required String userId,
    required String bookId,
  }) async {
    final storagePath =
        '$userId/$bookId/${DateTime.now().microsecondsSinceEpoch}.jpg';
    await _client.storage
        .from(bucketName)
        .uploadBinary(
          storagePath,
          imageBytes,
          fileOptions: const FileOptions(upsert: false),
        );
    return storagePath;
  }

  Future<String?> createSignedUrl(String? storedValue) async {
    final storagePath = storagePathFromValue(storedValue);
    if (storagePath == null) return null;

    return _client.storage
        .from(bucketName)
        .createSignedUrl(storagePath, signedUrlExpiresInSeconds);
  }

  Future<void> remove(String? storedValue) async {
    final storagePath = storagePathFromValue(storedValue);
    if (storagePath == null) return;

    await _client.storage.from(bucketName).remove([storagePath]);
  }
}
