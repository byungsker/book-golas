import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';
import 'package:book_golas/domain/models/reading_insight.dart';

class ReadingInsightsService {
  static final ReadingInsightsService _instance =
      ReadingInsightsService._internal();
  factory ReadingInsightsService() => _instance;
  ReadingInsightsService._internal();

  final SupabaseClient _supabase = Supabase.instance.client;
  static const String _memoryTableName = 'reading_insights_memory';
  static const String _rateLimitTableName = 'reading_insights_rate_limit';
  static const String _edgeFunctionName = 'reading-insights';
  static const int _timeoutSeconds = 30;

  /// Edge Function을 호출하여 새로운 인사이트 생성
  Future<List<ReadingInsight>> generateInsight(String userId) async {
    try {
      final consent = await ThirdPartyAiConsentService()
          .hasConsent(ThirdPartyAiProvider.openAi);
      if (!consent) {
        debugPrint(
            'Reading insight request blocked because consent is missing');
        return [];
      }

      final response = await _supabase.functions.invoke(
        _edgeFunctionName,
        body: {'userId': userId},
      ).timeout(const Duration(seconds: _timeoutSeconds));

      if (response.status != 200) {
        throw Exception('Failed to generate insight: ${response.data}');
      }

      final data = response.data as Map<String, dynamic>;
      if (data['success'] != true) {
        throw Exception(data['error'] ?? 'Unknown error');
      }

      final insights = (data['insights'] as List)
          .map((json) => ReadingInsight.fromJson(json as Map<String, dynamic>))
          .toList();

      return insights;
    } on TimeoutException {
      throw Exception(
          'Insight generation timed out after $_timeoutSeconds seconds');
    } catch (e) {
      debugPrint('Failed to generate insight: $e');
      throw Exception('Failed to generate insight: $e');
    }
  }

  /// DB에서 최신 인사이트 조회
  Future<List<ReadingInsight>?> getLatestInsight(String userId) async {
    try {
      final response = await _supabase
          .from(_memoryTableName)
          .select('insight_content, created_at')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (response == null) return null;

      final insightContent = response['insight_content'] as String;
      final insights = (jsonDecode(insightContent) as List)
          .map((json) => ReadingInsight.fromJson(json as Map<String, dynamic>))
          .toList();

      return insights;
    } catch (e) {
      debugPrint('Failed to load latest insight: $e');
      return null;
    }
  }

  /// 사용자의 메모리 삭제
  Future<void> clearMemory(String userId) async {
    try {
      await _supabase.from(_memoryTableName).delete().eq('user_id', userId);
    } catch (e) {
      debugPrint('Failed to clear memory: $e');
      throw Exception('Failed to clear memory: $e');
    }
  }

  /// 오늘 인사이트 생성 가능 여부 확인 (24시간 제한)
  Future<bool> canGenerateToday(String userId) async {
    try {
      final response = await _supabase
          .from(_rateLimitTableName)
          .select('last_generated_at')
          .eq('user_id', userId)
          .maybeSingle();

      if (response == null) return true;

      final lastGenerated =
          DateTime.parse(response['last_generated_at'] as String);
      final now = DateTime.now();
      final hoursSince = now.difference(lastGenerated).inHours;

      return hoursSince >= 24;
    } catch (e) {
      debugPrint('Failed to check rate limit: $e');
      return false;
    }
  }
}
