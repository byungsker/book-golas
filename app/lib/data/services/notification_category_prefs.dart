import 'package:flutter/foundation.dart';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum NotificationCategory {
  dailyReminder,
  goalAchievement,
  announcements,
}

extension NotificationCategoryColumn on NotificationCategory {
  String get columnName {
    switch (this) {
      case NotificationCategory.dailyReminder:
        return 'daily_reminder_enabled';
      case NotificationCategory.goalAchievement:
        return 'goal_achievement_enabled';
      case NotificationCategory.announcements:
        return 'announcements_enabled';
    }
  }
}

class NotificationCategoryPrefs {
  static const String _prefix = 'notification_';
  static final SupabaseClient _supabase = Supabase.instance.client;

  static String _key(NotificationCategory category) =>
      '$_prefix${category.name}';

  static Future<bool> isCategoryEnabled(NotificationCategory category) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_key(category)) ?? true;
  }

  static Future<void> setCategoryEnabled(
      NotificationCategory category, bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key(category), enabled);
    await _syncToSupabase(category, enabled);
  }

  static Future<void> loadFromSupabase() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return;

    try {
      final response = await _supabase
          .from('fcm_tokens')
          .select(
              'daily_reminder_enabled, goal_achievement_enabled, announcements_enabled')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

      if (response == null) return;

      final prefs = await SharedPreferences.getInstance();
      for (final category in NotificationCategory.values) {
        final serverValue = response[category.columnName] as bool?;
        if (serverValue != null) {
          await prefs.setBool(_key(category), serverValue);
        }
      }
      debugPrint('🔔 [CategoryPrefs] Loaded from Supabase: $response');
    } catch (e) {
      debugPrint('🔔 [CategoryPrefs] Error loading from Supabase: $e');
    }
  }

  static Future<void> _syncToSupabase(
      NotificationCategory category, bool enabled) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return;

    try {
      await _supabase
          .from('fcm_tokens')
          .update({category.columnName: enabled}).eq('user_id', userId);
      debugPrint(
          '🔔 [CategoryPrefs] Synced ${category.name}=$enabled to Supabase');
    } catch (e) {
      debugPrint('🔔 [CategoryPrefs] Error syncing to Supabase: $e');
    }
  }
}
