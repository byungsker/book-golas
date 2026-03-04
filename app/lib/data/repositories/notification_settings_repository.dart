import 'package:book_golas/data/services/notification_settings_service.dart';

abstract class NotificationSettingsRepository {
  NotificationSettings get settings;

  Future<NotificationSettings?> loadSettings();

  Future<bool> updateNotificationEnabled(bool enabled);

  Future<bool> updateDailyReminderEnabled(bool enabled);

  Future<bool> updateDailyReminderTime(int hour, int minute);

  Future<bool> updateGoalAlarmEnabled(bool enabled);

  Future<bool> updateGoalAlarmTime(int hour, int minute);

  Future<bool> updateEventNudgeEnabled(bool enabled);
}

class NotificationSettingsRepositoryImpl
    implements NotificationSettingsRepository {
  final NotificationSettingsService _service;

  NotificationSettingsRepositoryImpl(this._service);

  @override
  NotificationSettings get settings => _service.settings;

  @override
  Future<NotificationSettings?> loadSettings() => _service.loadSettings();

  @override
  Future<bool> updateNotificationEnabled(bool enabled) =>
      _service.updateNotificationEnabled(enabled);

  @override
  Future<bool> updateDailyReminderEnabled(bool enabled) =>
      _service.updateDailyReminderEnabled(enabled);

  @override
  Future<bool> updateDailyReminderTime(int hour, int minute) =>
      _service.updateDailyReminderTime(hour, minute);

  @override
  Future<bool> updateGoalAlarmEnabled(bool enabled) =>
      _service.updateGoalAlarmEnabled(enabled);

  @override
  Future<bool> updateGoalAlarmTime(int hour, int minute) =>
      _service.updateGoalAlarmTime(hour, minute);

  @override
  Future<bool> updateEventNudgeEnabled(bool enabled) =>
      _service.updateEventNudgeEnabled(enabled);
}
