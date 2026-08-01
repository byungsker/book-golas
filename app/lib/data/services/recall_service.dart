import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/book_image_storage_service.dart';
import 'package:book_golas/data/services/third_party_ai_consent_service.dart';
import 'package:book_golas/domain/models/recall_models.dart';
import 'package:book_golas/utils/subscription_utils.dart';
import 'package:book_golas/exceptions/subscription_exceptions.dart';

class RecallService {
  static final RecallService _instance = RecallService._internal();
  factory RecallService() => _instance;
  RecallService._internal();

  final SupabaseClient _supabase = Supabase.instance.client;
  final BookImageStorageService _bookImageStorageService =
      BookImageStorageService();

  Future<void> generateEmbeddingForHighlight({
    required String userId,
    required String bookId,
    required String highlightId,
    required String text,
    int? pageNumber,
  }) async {
    try {
      final consent = await ThirdPartyAiConsentService()
          .hasConsent(ThirdPartyAiProvider.openAi);
      if (!consent) {
        debugPrint('Embedding request blocked because consent is missing');
        return;
      }

      await _supabase.functions.invoke(
        'generate-embedding',
        body: {
          'userId': userId,
          'bookId': bookId,
          'contentType': 'highlight',
          'contentText': text,
          'pageNumber': pageNumber,
          'sourceId': highlightId,
        },
      );
      debugPrint('Embedding generated for highlight: $highlightId');
    } catch (e) {
      debugPrint('Failed to generate embedding for highlight: $e');
    }
  }

  Future<void> generateEmbeddingForNote({
    required String userId,
    required String bookId,
    required String noteId,
    required String content,
    int? pageNumber,
  }) async {
    try {
      final consent = await ThirdPartyAiConsentService()
          .hasConsent(ThirdPartyAiProvider.openAi);
      if (!consent) {
        debugPrint('Embedding request blocked because consent is missing');
        return;
      }

      await _supabase.functions.invoke(
        'generate-embedding',
        body: {
          'userId': userId,
          'bookId': bookId,
          'contentType': 'note',
          'contentText': content,
          'pageNumber': pageNumber,
          'sourceId': noteId,
        },
      );
      debugPrint('Embedding generated for note: $noteId');
    } catch (e) {
      debugPrint('Failed to generate embedding for note: $e');
    }
  }

  Future<void> generateEmbeddingForPhotoOcr({
    required String userId,
    required String bookId,
    required String photoId,
    required String ocrText,
    int? pageNumber,
  }) async {
    try {
      final consent = await ThirdPartyAiConsentService()
          .hasConsent(ThirdPartyAiProvider.openAi);
      if (!consent) {
        debugPrint('Embedding request blocked because consent is missing');
        return;
      }

      await _supabase.functions.invoke(
        'generate-embedding',
        body: {
          'userId': userId,
          'bookId': bookId,
          'contentType': 'photo_ocr',
          'contentText': ocrText,
          'pageNumber': pageNumber,
          'sourceId': photoId,
        },
      );
      debugPrint('Embedding generated for photo OCR: $photoId');
    } catch (e) {
      debugPrint('Failed to generate embedding for photo OCR: $e');
    }
  }

  Future<RecallSearchResult?> search({
    String? bookId,
    required String query,
  }) async {
    final consent = await ThirdPartyAiConsentService()
        .hasConsent(ThirdPartyAiProvider.openAi);
    if (!consent) {
      debugPrint('Recall request blocked because consent is missing');
      return null;
    }

    // Check AI Recall usage limit for free users
    if (!await SubscriptionUtils.canUseAiRecall()) {
      final remaining = await SubscriptionUtils.getRemainingAiRecallUses();
      throw AiRecallLimitException(
        '이번 달 AI Recall 사용 횟수를 모두 소진했습니다.',
        remainingUses: remaining,
      );
    }

    try {
      debugPrint('🔍 Recall search: bookId=$bookId, query=$query');
      final response = await _supabase.functions.invoke(
        'recall-search',
        body: {
          if (bookId != null) 'bookId': bookId,
          'query': query,
        },
      );

      debugPrint('🔍 Recall search response: status=${response.status}');
      debugPrint('🔍 Recall search response data: ${response.data}');

      if (response.status != 200) {
        debugPrint(
            '🔴 Recall search failed: ${response.status} - ${response.data}');
        return null;
      }

      // Increment usage counter after successful search
      await SubscriptionUtils.incrementAiRecallUsage();

      final data = response.data as Map<String, dynamic>;
      return RecallSearchResult.fromJson(data);
    } catch (e, stackTrace) {
      debugPrint('🔴 Recall search error: $e');
      debugPrint('🔴 Stack trace: $stackTrace');
      return null;
    }
  }

  Future<List<RecallSearchHistory>> getRecentSearches({
    required String bookId,
    int limit = 10,
  }) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return [];

      final response = await _supabase
          .from('recall_search_history')
          .select()
          .eq('user_id', userId)
          .eq('book_id', bookId)
          .order('created_at', ascending: false)
          .limit(limit);

      return (response as List)
          .map((json) =>
              RecallSearchHistory.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('🔴 Failed to get recent searches: $e');
      return [];
    }
  }

  Future<List<RecallSearchHistory>> getGlobalRecentSearches({
    int limit = 10,
  }) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return [];

      final response = await _supabase
          .from('recall_search_history')
          .select()
          .eq('user_id', userId)
          .isFilter('book_id', null)
          .order('created_at', ascending: false)
          .limit(limit);

      return (response as List)
          .map((json) =>
              RecallSearchHistory.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('🔴 Failed to get global recent searches: $e');
      return [];
    }
  }

  Future<bool> deleteSearchHistory(String historyId) async {
    try {
      await _supabase
          .from('recall_search_history')
          .delete()
          .eq('id', historyId);
      return true;
    } catch (e) {
      debugPrint('🔴 Failed to delete search history: $e');
      return false;
    }
  }

  Future<List<String>> getKeywordSuggestions({
    required String bookId,
    int limit = 8,
  }) async {
    try {
      final consent = await ThirdPartyAiConsentService()
          .hasConsent(ThirdPartyAiProvider.openAi);
      if (!consent) {
        debugPrint('Keyword request blocked because consent is missing');
        return [];
      }

      final response = await _supabase.functions.invoke(
        'extract-keywords',
        body: {
          'bookId': bookId,
          'limit': limit,
        },
      );

      if (response.status != 200) {
        debugPrint('🔴 Extract keywords failed: ${response.status}');
        return [];
      }

      final data = response.data as Map<String, dynamic>;
      final keywords = data['keywords'] as List<dynamic>?;

      if (keywords == null) return [];
      return keywords.map((k) => k.toString()).toList();
    } catch (e) {
      debugPrint('🔴 Failed to get keyword suggestions: $e');
      return [];
    }
  }

  Future<String?> getImageUrlBySourceId(String sourceId) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return null;

      final response = await _supabase
          .from('book_images')
          .select('image_url')
          .eq('id', sourceId)
          .eq('user_id', userId)
          .maybeSingle();

      return _bookImageStorageService.createSignedUrl(
        response?['image_url'] as String?,
      );
    } catch (e) {
      debugPrint('🔴 Failed to get image URL: $e');
      return null;
    }
  }
}
