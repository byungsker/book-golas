import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Constants for subscription tiers and limits
class SubscriptionConstants {
  /// Maximum number of concurrent books for free users
  static const int maxConcurrentBooksFree = 3;

  /// Maximum AI Recall uses per month for free users
  static const int maxAiRecallPerMonthFree = 10;

  /// Maximum OCR uses per day for free users
  static const int maxOcrPerDayFree = 10;

  /// Super admin email (unlimited access)
  static const String superAdminEmail = 'bookgolas@admin.com';
}

/// Utility class for checking subscription status and limits
class SubscriptionUtils {
  static final SupabaseClient _supabase = Supabase.instance.client;

  /// Checks if the current user is a super admin
  ///
  /// Super admins have unlimited access to all features
  static bool isSuperAdmin() {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;
    return user.email?.toLowerCase() ==
        SubscriptionConstants.superAdminEmail.toLowerCase();
  }

  /// Checks if the user has Pro subscription
  ///
  /// Returns true if user is super admin or has active Pro subscription
  static Future<bool> isProUser() async {
    if (isSuperAdmin()) return true;

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return false;

      final response = await _supabase
          .from('users')
          .select('subscription_status')
          .eq('id', userId)
          .single();

      final status = response['subscription_status'] as String?;
      return status == 'pro_monthly' ||
          status == 'pro_yearly' ||
          status == 'pro_lifetime';
    } catch (e) {
      return false;
    }
  }

  /// Gets the current subscription status
  ///
  /// Returns: 'free', 'pro_monthly', 'pro_yearly', 'pro_lifetime', or null if not found
  static Future<String?> getSubscriptionStatus() async {
    if (isSuperAdmin()) return 'pro_lifetime';

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return null;

      final response = await _supabase
          .from('users')
          .select('subscription_status')
          .eq('id', userId)
          .single();

      return response['subscription_status'] as String?;
    } catch (e) {
      return null;
    }
  }

  /// Checks if the user can add more concurrent books
  ///
  /// Free users are limited to [SubscriptionConstants.maxConcurrentBooksFree] books
  /// Pro users and super admins have unlimited access
  ///
  /// Returns [true] if user can add more books, [false] if limit reached
  static Future<bool> canAddMoreConcurrentBooks(int currentActiveCount) async {
    if (isSuperAdmin()) return true;
    final isPro = await isProUser();
    if (isPro) return true;

    return currentActiveCount < SubscriptionConstants.maxConcurrentBooksFree;
  }

  /// Gets the maximum number of concurrent books allowed for the current user
  static int getMaxConcurrentBooks() {
    if (isSuperAdmin()) return 999; // Unlimited
    return SubscriptionConstants.maxConcurrentBooksFree;
  }

  /// Checks if the user can use AI Recall
  ///
  /// Free users are limited to [SubscriptionConstants.maxAiRecallPerMonthFree] uses
  /// Pro users and super admins have unlimited access
  ///
  /// Returns [true] if user can use AI Recall, [false] if limit reached
  static Future<bool> canUseAiRecall() async {
    if (isSuperAdmin()) return true;
    final isPro = await isProUser();
    if (isPro) return true;

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return false;

      final response = await _supabase
          .from('users')
          .select('ai_recall_usage_count')
          .eq('id', userId)
          .single();

      final usageCount = response['ai_recall_usage_count'] as int? ?? 0;
      return usageCount < SubscriptionConstants.maxAiRecallPerMonthFree;
    } catch (e) {
      return true; // If error, allow (fail open for better UX)
    }
  }

  /// Gets the remaining AI Recall uses for the current month
  static Future<int> getRemainingAiRecallUses() async {
    if (isSuperAdmin()) return 999; // Unlimited

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return 0;

      final response = await _supabase
          .from('users')
          .select('ai_recall_usage_count')
          .eq('id', userId)
          .single();

      final usageCount = response['ai_recall_usage_count'] as int? ?? 0;
      return SubscriptionConstants.maxAiRecallPerMonthFree - usageCount;
    } catch (e) {
      return SubscriptionConstants.maxAiRecallPerMonthFree;
    }
  }

  /// Increments AI Recall usage count
  ///
  /// Should be called after each AI Recall usage
  static Future<void> incrementAiRecallUsage() async {
    if (isSuperAdmin()) return;

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      await _supabase
          .rpc('increment_ai_recall_usage', params: {'user_id': userId});
    } catch (e) {
      debugPrint('Failed to increment AI Recall usage: $e');
    }
  }

  static Future<bool> canUseOcr() async {
    debugPrint('[canUseOcr] isSuperAdmin=${isSuperAdmin()}');
    if (isSuperAdmin()) return true;
    final isPro = await isProUser();
    debugPrint('[canUseOcr] isPro=$isPro');
    if (isPro) return true;

    try {
      final userId = _supabase.auth.currentUser?.id;
      debugPrint('[canUseOcr] userId=$userId');
      if (userId == null) return false;
      final response = await _supabase
          .rpc('get_ocr_daily_usage', params: {'p_user_id': userId});
      debugPrint('[canUseOcr] response=$response (type=${response.runtimeType})');
      if (response is List && response.isNotEmpty) {
        final usageCount = response[0]['usage_count'] as int? ?? 0;
        debugPrint('[canUseOcr] usageCount=$usageCount, max=${SubscriptionConstants.maxOcrPerDayFree}, result=${usageCount < SubscriptionConstants.maxOcrPerDayFree}');
        return usageCount < SubscriptionConstants.maxOcrPerDayFree;
      }
      debugPrint('[canUseOcr] response not List or empty → returning true');
      return true;
    } catch (e) {
      debugPrint('[canUseOcr] exception=$e → returning true');
      return true;
    }
  }

  static Future<int> getRemainingOcrUses() async {
    if (isSuperAdmin()) return 999;

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return 0;
      final response = await _supabase
          .rpc('get_ocr_daily_usage', params: {'p_user_id': userId});
      if (response is List && response.isNotEmpty) {
        final usageCount = response[0]['usage_count'] as int? ?? 0;
        return SubscriptionConstants.maxOcrPerDayFree - usageCount;
      }
      return SubscriptionConstants.maxOcrPerDayFree;
    } catch (e) {
      return SubscriptionConstants.maxOcrPerDayFree;
    }
  }

  static Future<void> incrementOcrUsage() async {
    if (isSuperAdmin()) return;
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;
      await _supabase
          .rpc('increment_ocr_daily_usage', params: {'p_user_id': userId});
    } catch (e) {
      debugPrint('Failed to increment OCR usage: $e');
    }
  }
}
