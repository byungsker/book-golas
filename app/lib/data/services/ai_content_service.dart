import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';

class AIContentService {
  static final AIContentService _instance = AIContentService._internal();
  factory AIContentService() => _instance;
  AIContentService._internal();

  SupabaseClient get _supabase => Supabase.instance.client;

  Future<String?> generateBookReviewDraft({
    required String bookId,
  }) async {
    try {
      final consent = await ThirdPartyAiConsentService()
          .hasConsent(ThirdPartyAiProvider.openAi);
      if (!consent) {
        debugPrint('AI review request blocked because consent is missing');
        return null;
      }

      final currentUser = _supabase.auth.currentUser;
      final session = _supabase.auth.currentSession;

      debugPrint(
          '[AIContentService] Generating review draft for book: $bookId');
      debugPrint('[AIContentService] Current user: ${currentUser?.id}');
      debugPrint('[AIContentService] Session exists: ${session != null}');
      debugPrint('[AIContentService] Token expires at: ${session?.expiresAt}');

      if (currentUser == null || session == null) {
        debugPrint('[AIContentService] ERROR: User not authenticated');
        return null;
      }

      final response = await _supabase.functions.invoke(
        'generate-book-review',
        body: {
          'bookId': bookId,
        },
      );

      if (response.status != 200) {
        debugPrint('[AIContentService] Error status: ${response.status}');
        final errorData = response.data;
        final errorMessage =
            errorData is Map ? errorData['error'] : 'Unknown error';
        throw Exception(errorMessage);
      }

      final data = response.data;
      if (data == null || data['success'] != true) {
        throw Exception(data?['error'] ?? 'Failed to generate review');
      }

      final draft = data['draft'] as String?;
      final memosUsed = data['memosUsed'] as int? ?? 0;

      debugPrint(
          '[AIContentService] Review draft generated successfully, memos used: $memosUsed');

      return draft;
    } on FunctionException catch (e) {
      debugPrint('[AIContentService] FunctionException: ${e.details}');
      return null;
    } catch (e) {
      debugPrint('[AIContentService] Failed to generate review draft: $e');
      return null;
    }
  }
}
