import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationSettings {
  final bool notificationEnabled;

  final bool dailyReminderEnabled;
  final int dailyReminderHour;
  final int dailyReminderMinute;

  final bool goalAlarmEnabled;
  final int goalAlarmHour;
  final int goalAlarmMinute;

  final bool eventNudgeEnabled;

  final bool announcementsEnabled;

  NotificationSettings({
    required this.notificationEnabled,
    this.dailyReminderEnabled = true,
    this.dailyReminderHour = 9,
    this.dailyReminderMinute = 0,
    this.goalAlarmEnabled = true,
    this.goalAlarmHour = 20,
    this.goalAlarmMinute = 0,
    this.eventNudgeEnabled = true,
    this.announcementsEnabled = true,
  });

  factory NotificationSettings.fromJson(Map<String, dynamic> json) {
    return NotificationSettings(
      notificationEnabled: json['notification_enabled'] ?? true,
      dailyReminderEnabled: json['daily_reminder_enabled'] ?? true,
      dailyReminderHour: json['daily_reminder_hour'] ?? 9,
      dailyReminderMinute: json['daily_reminder_minute'] ?? 0,
      goalAlarmEnabled: json['goal_alarm_enabled'] ?? true,
      goalAlarmHour: json['goal_alarm_hour'] ?? 20,
      goalAlarmMinute: json['goal_alarm_minute'] ?? 0,
      eventNudgeEnabled: json['event_nudge_enabled'] ?? true,
      announcementsEnabled: true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'notification_enabled': notificationEnabled,
      'daily_reminder_enabled': dailyReminderEnabled,
      'daily_reminder_hour': dailyReminderHour,
      'daily_reminder_minute': dailyReminderMinute,
      'goal_alarm_enabled': goalAlarmEnabled,
      'goal_alarm_hour': goalAlarmHour,
      'goal_alarm_minute': goalAlarmMinute,
      'event_nudge_enabled': eventNudgeEnabled,
    };
  }

  NotificationSettings copyWith({
    bool? notificationEnabled,
    bool? dailyReminderEnabled,
    int? dailyReminderHour,
    int? dailyReminderMinute,
    bool? goalAlarmEnabled,
    int? goalAlarmHour,
    int? goalAlarmMinute,
    bool? eventNudgeEnabled,
    bool? announcementsEnabled,
  }) {
    return NotificationSettings(
      notificationEnabled: notificationEnabled ?? this.notificationEnabled,
      dailyReminderEnabled: dailyReminderEnabled ?? this.dailyReminderEnabled,
      dailyReminderHour: dailyReminderHour ?? this.dailyReminderHour,
      dailyReminderMinute: dailyReminderMinute ?? this.dailyReminderMinute,
      goalAlarmEnabled: goalAlarmEnabled ?? this.goalAlarmEnabled,
      goalAlarmHour: goalAlarmHour ?? this.goalAlarmHour,
      goalAlarmMinute: goalAlarmMinute ?? this.goalAlarmMinute,
      eventNudgeEnabled: eventNudgeEnabled ?? this.eventNudgeEnabled,
      announcementsEnabled: announcementsEnabled ?? this.announcementsEnabled,
    );
  }
}

class NotificationSettingsService {
  final SupabaseClient _supabase = Supabase.instance.client;

  NotificationSettings _settings = NotificationSettings(
    notificationEnabled: true,
  );

  NotificationSettings get settings => _settings;

  Future<NotificationSettings?> loadSettings() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) {
      debugPrint('🔔 [NotificationSettings] User not logged in');
      return null;
    }

    try {
      final response = await _supabase
          .from('fcm_tokens')
          .select(
              'notification_enabled, daily_reminder_enabled, daily_reminder_hour, daily_reminder_minute, goal_alarm_enabled, goal_alarm_hour, goal_alarm_minute, event_nudge_enabled')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

      if (response != null) {
        _settings = NotificationSettings.fromJson(response);
        debugPrint('🔔 [NotificationSettings] Loaded');
        return _settings;
      } else {
        debugPrint(
            '🔔 [NotificationSettings] No settings found, using defaults');
        return _settings;
      }
    } catch (e) {
      debugPrint('🔔 [NotificationSettings] Error loading: $e');
      rethrow;
    }
  }

  Future<bool> updateNotificationEnabled(bool enabled) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) {
      throw StateError('User not logged in');
    }

    try {
      await _supabase
          .from('fcm_tokens')
          .update({'notification_enabled': enabled}).eq('user_id', userId);

      _settings = _settings.copyWith(notificationEnabled: enabled);
      debugPrint(
          '🔔 [NotificationSettings] Updated notification_enabled to $enabled');
      return true;
    } catch (e) {
      debugPrint('🔔 [NotificationSettings] Error updating enabled: $e');
      rethrow;
    }
  }

  Future<bool> updateDailyReminderEnabled(bool enabled) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw StateError('User not logged in');

    try {
      await _supabase
          .from('fcm_tokens')
          .update({'daily_reminder_enabled': enabled}).eq('user_id', userId);

      _settings = _settings.copyWith(dailyReminderEnabled: enabled);
      debugPrint('🔔 [NotificationSettings] daily_reminder_enabled=$enabled');
      return true;
    } catch (e) {
      debugPrint('🔔 [NotificationSettings] Error: $e');
      rethrow;
    }
  }

  Future<bool> updateDailyReminderTime(int hour, int minute) async {
    if (hour < 0 || hour > 23) {
      throw ArgumentError('Invalid hour: must be 0-23');
    }
    if (minute != 0 && minute != 30) {
      throw ArgumentError('Invalid minute: must be 0 or 30');
    }

    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw StateError('User not logged in');

    try {
      await _supabase.from('fcm_tokens').update({
        'daily_reminder_hour': hour,
        'daily_reminder_minute': minute,
      }).eq('user_id', userId);

      _settings = _settings.copyWith(
          dailyReminderHour: hour, dailyReminderMinute: minute);
      debugPrint('🔔 [NotificationSettings] daily_reminder time=$hour:$minute');
      return true;
    } catch (e) {
      debugPrint('🔔 [NotificationSettings] Error: $e');
      rethrow;
    }
  }

  Future<bool> updateGoalAlarmEnabled(bool enabled) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw StateError('User not logged in');

    try {
      await _supabase
          .from('fcm_tokens')
          .update({'goal_alarm_enabled': enabled}).eq('user_id', userId);

      _settings = _settings.copyWith(goalAlarmEnabled: enabled);
      debugPrint('🔔 [NotificationSettings] goal_alarm_enabled=$enabled');
      return true;
    } catch (e) {
      debugPrint('🔔 [NotificationSettings] Error: $e');
      rethrow;
    }
  }

  Future<bool> updateGoalAlarmTime(int hour, int minute) async {
    if (hour < 0 || hour > 23) {
      throw ArgumentError('Invalid hour: must be 0-23');
    }
    if (minute != 0 && minute != 30) {
      throw ArgumentError('Invalid minute: must be 0 or 30');
    }

    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw StateError('User not logged in');

    try {
      await _supabase.from('fcm_tokens').update({
        'goal_alarm_hour': hour,
        'goal_alarm_minute': minute,
      }).eq('user_id', userId);

      _settings =
          _settings.copyWith(goalAlarmHour: hour, goalAlarmMinute: minute);
      debugPrint('🔔 [NotificationSettings] goal_alarm time=$hour:$minute');
      return true;
    } catch (e) {
      debugPrint('🔔 [NotificationSettings] Error: $e');
      rethrow;
    }
  }

  Future<bool> updateEventNudgeEnabled(bool enabled) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw StateError('User not logged in');

    try {
      await _supabase
          .from('fcm_tokens')
          .update({'event_nudge_enabled': enabled}).eq('user_id', userId);

      _settings = _settings.copyWith(eventNudgeEnabled: enabled);
      debugPrint('🔔 [NotificationSettings] event_nudge_enabled=$enabled');
      return true;
    } catch (e) {
      debugPrint('🔔 [NotificationSettings] Error: $e');
      rethrow;
    }
  }

  static List<Map<String, dynamic>> getAvailableTimeSlots() {
    final slots = <Map<String, dynamic>>[];
    for (int h = 0; h < 24; h++) {
      for (int m = 0; m < 60; m += 30) {
        String label;
        if (h == 0) {
          label = m == 0 ? '오전 12시' : '오전 12시 30분';
        } else if (h < 12) {
          label = m == 0 ? '오전 $h시' : '오전 $h시 30분';
        } else if (h == 12) {
          label = m == 0 ? '오후 12시' : '오후 12시 30분';
        } else {
          label = m == 0 ? '오후 ${h - 12}시' : '오후 ${h - 12}시 30분';
        }
        slots.add({'hour': h, 'minute': m, 'label': label});
      }
    }
    return slots;
  }
}
