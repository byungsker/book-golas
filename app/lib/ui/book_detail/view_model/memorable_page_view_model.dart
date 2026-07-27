import 'dart:typed_data';

import 'package:book_golas/data/services/book_image_storage_service.dart';
import 'package:book_golas/domain/models/highlight_data.dart';
import 'package:book_golas/ui/core/view_model/base_view_model.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class MemorablePageViewModel extends BaseViewModel {
  static const _storagePathKey = '_storage_path';

  String _bookId;
  final SupabaseClient _supabase;
  final BookImageStorageService _bookImageStorageService;

  List<Map<String, dynamic>>? _cachedImages;
  bool _isSelectionMode = false;
  final Set<String> _selectedImageIds = {};
  String _sortMode = 'page_desc';

  Uint8List? _pendingImageBytes;
  String _pendingExtractedText = '';
  int? _pendingPageNumber;

  final Map<String, String> _editedTexts = {};

  List<Map<String, dynamic>>? get cachedImages => _cachedImages;
  bool get isSelectionMode => _isSelectionMode;
  Set<String> get selectedImageIds => _selectedImageIds;
  String get sortMode => _sortMode;
  Uint8List? get pendingImageBytes => _pendingImageBytes;
  String get pendingExtractedText => _pendingExtractedText;
  int? get pendingPageNumber => _pendingPageNumber;
  Map<String, String> get editedTexts => _editedTexts;

  MemorablePageViewModel({
    required String bookId,
    SupabaseClient? client,
    BookImageStorageService? bookImageStorageService,
  }) : _bookId = bookId,
       _supabase = client ?? Supabase.instance.client,
       _bookImageStorageService =
           bookImageStorageService ?? BookImageStorageService(client: client);

  void updateBookId(String bookId) {
    _bookId = bookId;
  }

  Future<List<Map<String, dynamic>>> fetchBookImages() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return [];

      final response = await _supabase
          .from('book_images')
          .select()
          .eq('book_id', _bookId)
          .eq('user_id', userId)
          .order('page_number', ascending: false);

      final rawImages = (response as List).cast<Map<String, dynamic>>();
      final images = await Future.wait(rawImages.map(_resolveImageUrl));
      _cachedImages = images;
      notifyListeners();
      return images;
    } catch (e) {
      setError('이미지를 불러오는데 실패했습니다: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> _resolveImageUrl(
    Map<String, dynamic> image,
  ) async {
    final storedValue = image['image_url'] as String?;
    final storagePath = BookImageStorageService.storagePathFromValue(
      storedValue,
    );
    if (storagePath == null) return image;

    try {
      final signedUrl = await _bookImageStorageService.createSignedUrl(
        storagePath,
      );
      return {...image, _storagePathKey: storagePath, 'image_url': signedUrl};
    } catch (_) {
      return {...image, _storagePathKey: storagePath, 'image_url': null};
    }
  }

  List<Map<String, dynamic>> getSortedImages() {
    if (_cachedImages == null) return [];

    final sorted = List<Map<String, dynamic>>.from(_cachedImages!);
    switch (_sortMode) {
      case 'page_asc':
        sorted.sort(
          (a, b) => (a['page_number'] ?? 0).compareTo(b['page_number'] ?? 0),
        );
        break;
      case 'page_desc':
        sorted.sort(
          (a, b) => (b['page_number'] ?? 0).compareTo(a['page_number'] ?? 0),
        );
        break;
      case 'date_desc':
        sorted.sort((a, b) {
          final aDate =
              DateTime.tryParse(a['created_at'] ?? '') ?? DateTime(1900);
          final bDate =
              DateTime.tryParse(b['created_at'] ?? '') ?? DateTime(1900);
          return bDate.compareTo(aDate);
        });
        break;
      case 'date_asc':
        sorted.sort((a, b) {
          final aDate =
              DateTime.tryParse(a['created_at'] ?? '') ?? DateTime(1900);
          final bDate =
              DateTime.tryParse(b['created_at'] ?? '') ?? DateTime(1900);
          return aDate.compareTo(bDate);
        });
        break;
    }
    return sorted;
  }

  void setSortMode(String mode) {
    _sortMode = mode;
    notifyListeners();
  }

  void toggleSelectionMode() {
    _isSelectionMode = !_isSelectionMode;
    if (!_isSelectionMode) {
      _selectedImageIds.clear();
    }
    notifyListeners();
  }

  void exitSelectionMode() {
    _isSelectionMode = false;
    _selectedImageIds.clear();
    notifyListeners();
  }

  void toggleImageSelection(String imageId) {
    if (_selectedImageIds.contains(imageId)) {
      _selectedImageIds.remove(imageId);
    } else {
      _selectedImageIds.add(imageId);
    }
    notifyListeners();
  }

  void selectAllImages() {
    if (_cachedImages != null) {
      _selectedImageIds.clear();
      for (final img in _cachedImages!) {
        final id = img['id']?.toString();
        if (id != null) {
          _selectedImageIds.add(id);
        }
      }
      notifyListeners();
    }
  }

  void deselectAllImages() {
    _selectedImageIds.clear();
    notifyListeners();
  }

  void setPendingImage({
    required Uint8List bytes,
    required String extractedText,
    int? pageNumber,
  }) {
    _pendingImageBytes = bytes;
    _pendingExtractedText = extractedText;
    _pendingPageNumber = pageNumber;
    notifyListeners();
  }

  void clearPendingImage() {
    _pendingImageBytes = null;
    _pendingExtractedText = '';
    _pendingPageNumber = null;
    notifyListeners();
  }

  void updatePendingExtractedText(String text) {
    _pendingExtractedText = text;
    notifyListeners();
  }

  void updatePendingPageNumber(int? pageNumber) {
    _pendingPageNumber = pageNumber;
    notifyListeners();
  }

  void setEditedText(String imageId, String text) {
    _editedTexts[imageId] = text;
    notifyListeners();
  }

  Future<bool> uploadAndSaveMemorablePage({
    required Uint8List imageBytes,
    required int pageNumber,
    String? extractedText,
  }) async {
    setLoading(true);

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        setError('로그인이 필요합니다');
        return false;
      }

      final storagePath = await _bookImageStorageService.upload(
        imageBytes: imageBytes,
        userId: userId,
        bookId: _bookId,
      );

      try {
        await _supabase.from('book_images').insert({
          'book_id': _bookId,
          'user_id': userId,
          'image_url': storagePath,
          'page_number': pageNumber,
          'extracted_text': extractedText ?? '',
          'created_at': DateTime.now().toIso8601String(),
        });
      } catch (_) {
        await _bookImageStorageService.remove(storagePath);
        rethrow;
      }

      await fetchBookImages();
      clearPendingImage();
      return true;
    } catch (e) {
      setError('이미지 업로드에 실패했습니다: $e');
      return false;
    } finally {
      setLoading(false);
    }
  }

  Future<bool> deleteBookImage(String imageId) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return false;

      final image = await _findImage(imageId);
      if (image == null) return false;

      await _bookImageStorageService.remove(
        image[_storagePathKey] as String? ?? image['image_url'] as String?,
      );
      await _supabase
          .from('book_images')
          .delete()
          .eq('id', imageId)
          .eq('user_id', userId);

      await fetchBookImages();
      return true;
    } catch (e) {
      setError('이미지 삭제에 실패했습니다: $e');
      return false;
    }
  }

  Future<bool> deleteSelectedImages() async {
    if (_selectedImageIds.isEmpty) return false;

    setLoading(true);
    try {
      final imagesToDelete = _cachedImages
          ?.where((img) => _selectedImageIds.contains(img['id']?.toString()))
          .toList();

      if (imagesToDelete == null || imagesToDelete.isEmpty) return false;

      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return false;
      final ids = imagesToDelete
          .map((image) => image['id']?.toString())
          .whereType<String>()
          .toList();
      if (ids.length != imagesToDelete.length) return false;

      await _bookImageStorageService.removeMany(
        imagesToDelete.map(
          (image) =>
              image[_storagePathKey] as String? ??
              image['image_url'] as String?,
        ),
      );
      await _supabase
          .from('book_images')
          .delete()
          .inFilter('id', ids)
          .eq('user_id', userId);

      _selectedImageIds.clear();
      _isSelectionMode = false;
      await fetchBookImages();
      return true;
    } catch (e) {
      setError('이미지 삭제에 실패했습니다: $e');
      return false;
    } finally {
      setLoading(false);
    }
  }

  Future<bool> updateExtractedText(String imageId, String newText) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return false;

      await _supabase
          .from('book_images')
          .update({'extracted_text': newText})
          .eq('id', imageId)
          .eq('user_id', userId);

      _editedTexts.remove(imageId);
      await fetchBookImages();
      return true;
    } catch (e) {
      setError('텍스트 저장에 실패했습니다: $e');
      return false;
    }
  }

  Future<bool> updateImageRecord({
    required String imageId,
    required String extractedText,
    int? pageNumber,
    List<HighlightData>? highlights,
  }) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return false;

      final updateData = <String, dynamic>{
        'extracted_text': extractedText,
        'page_number': pageNumber,
      };

      if (highlights != null) {
        updateData['highlights'] = HighlightData.toJsonList(highlights);
      }

      await _supabase
          .from('book_images')
          .update(updateData)
          .eq('id', imageId)
          .eq('user_id', userId);

      _editedTexts.remove(imageId);
      _cachedImages = null;
      await fetchBookImages();
      return true;
    } catch (e) {
      setError('저장에 실패했습니다: $e');
      return false;
    }
  }

  Future<String?> replaceImage({
    required String imageId,
    required Uint8List imageBytes,
    required String extractedText,
    int? pageNumber,
  }) async {
    String? newStoragePath;
    var recordPointsToNewImage = false;
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        setError('로그인이 필요합니다');
        return null;
      }
      final existingImage = await _findImage(imageId);
      if (existingImage == null) return null;
      final existingStoragePath =
          existingImage[_storagePathKey] as String? ??
          existingImage['image_url'] as String?;

      newStoragePath = await _bookImageStorageService.upload(
        imageBytes: imageBytes,
        userId: userId,
        bookId: _bookId,
      );

      await _supabase
          .from('book_images')
          .update({
            'image_url': newStoragePath,
            'extracted_text': extractedText,
            'page_number': pageNumber,
          })
          .eq('id', imageId)
          .eq('user_id', userId);
      recordPointsToNewImage = true;

      try {
        await _bookImageStorageService.remove(existingStoragePath);
      } catch (_) {
        await _supabase
            .from('book_images')
            .update({'image_url': existingStoragePath})
            .eq('id', imageId)
            .eq('user_id', userId);
        recordPointsToNewImage = false;
        await _bookImageStorageService.remove(newStoragePath);
        newStoragePath = null;
        rethrow;
      }

      await fetchBookImages();
      return _bookImageStorageService.createSignedUrl(newStoragePath);
    } catch (e) {
      if (newStoragePath != null && !recordPointsToNewImage) {
        try {
          await _bookImageStorageService.remove(newStoragePath);
        } catch (_) {}
      }
      setError('이미지 교체에 실패했습니다: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> _findImage(String imageId) async {
    final cached = _cachedImages?.where(
      (image) => image['id']?.toString() == imageId,
    );
    if (cached != null && cached.isNotEmpty) return cached.first;

    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return null;
    final response = await _supabase
        .from('book_images')
        .select()
        .eq('id', imageId)
        .eq('user_id', userId)
        .maybeSingle();
    if (response == null) return null;

    return _resolveImageUrl(response);
  }

  void onImagesLoaded(List<Map<String, dynamic>> images) {
    _cachedImages = images;
  }
}
