import 'package:book_golas/ui/core/view_model/base_view_model.dart';
import 'package:book_golas/data/repositories/notification_settings_repository.dart';
import 'package:book_golas/data/services/notification_settings_service.dart';

class NotificationSettingsViewModel extends BaseViewModel {
  final NotificationSettingsRepository _repository;

  NotificationSettings _settings = NotificationSettings(
    notificationEnabled: true,
  );

  NotificationSettings get settings => _settings;

  NotificationSettingsViewModel(this._repository);

  Future<void> loadSettings() async {
    setLoading(true);
    clearError();
    try {
      final loadedSettings = await _repository.loadSettings();
      if (loadedSettings != null) {
        _settings = loadedSettings;
      }
    } catch (e) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }

  Future<bool> updateNotificationEnabled(bool enabled) async {
    setLoading(true);
    clearError();
    try {
      final success = await _repository.updateNotificationEnabled(enabled);
      if (success) {
        _settings = _settings.copyWith(notificationEnabled: enabled);
        notifyListeners();
      }
      return success;
    } catch (e) {
      setError(e.toString());
      return false;
    } finally {
      setLoading(false);
    }
  }

  Future<bool> updateDailyReminderEnabled(bool enabled) async {
    setLoading(true);
    clearError();
    try {
      final success = await _repository.updateDailyReminderEnabled(enabled);
      if (success) {
        _settings = _settings.copyWith(dailyReminderEnabled: enabled);
        notifyListeners();
      }
      return success;
    } catch (e) {
      setError(e.toString());
      return false;
    } finally {
      setLoading(false);
    }
  }

  Future<bool> updateDailyReminderTime(int hour, int minute) async {
    if (hour < 0 || hour > 23) {
      setError('Invalid hour: must be 0-23');
      return false;
    }
    if (minute != 0 && minute != 30) {
      setError('Invalid minute: must be 0 or 30');
      return false;
    }

    setLoading(true);
    clearError();
    try {
      final success = await _repository.updateDailyReminderTime(hour, minute);
      if (success) {
        _settings = _settings.copyWith(
            dailyReminderHour: hour, dailyReminderMinute: minute);
        notifyListeners();
      }
      return success;
    } catch (e) {
      setError(e.toString());
      return false;
    } finally {
      setLoading(false);
    }
  }

  Future<bool> updateGoalAlarmEnabled(bool enabled) async {
    setLoading(true);
    clearError();
    try {
      final success = await _repository.updateGoalAlarmEnabled(enabled);
      if (success) {
        _settings = _settings.copyWith(goalAlarmEnabled: enabled);
        notifyListeners();
      }
      return success;
    } catch (e) {
      setError(e.toString());
      return false;
    } finally {
      setLoading(false);
    }
  }

  Future<bool> updateGoalAlarmTime(int hour, int minute) async {
    if (hour < 0 || hour > 23) {
      setError('Invalid hour: must be 0-23');
      return false;
    }
    if (minute != 0 && minute != 30) {
      setError('Invalid minute: must be 0 or 30');
      return false;
    }

    setLoading(true);
    clearError();
    try {
      final success = await _repository.updateGoalAlarmTime(hour, minute);
      if (success) {
        _settings =
            _settings.copyWith(goalAlarmHour: hour, goalAlarmMinute: minute);
        notifyListeners();
      }
      return success;
    } catch (e) {
      setError(e.toString());
      return false;
    } finally {
      setLoading(false);
    }
  }

  Future<bool> updateEventNudgeEnabled(bool enabled) async {
    setLoading(true);
    clearError();
    try {
      final success = await _repository.updateEventNudgeEnabled(enabled);
      if (success) {
        _settings = _settings.copyWith(eventNudgeEnabled: enabled);
        notifyListeners();
      }
      return success;
    } catch (e) {
      setError(e.toString());
      return false;
    } finally {
      setLoading(false);
    }
  }

  String getFormattedDailyReminderTime() {
    return _formatTime(
        _settings.dailyReminderHour, _settings.dailyReminderMinute);
  }

  String getFormattedGoalAlarmTime() {
    return _formatTime(_settings.goalAlarmHour, _settings.goalAlarmMinute);
  }

  String _formatTime(int hour, int minute) {
    String hourStr;
    if (hour == 0) {
      hourStr = '오전 12시';
    } else if (hour < 12) {
      hourStr = '오전 $hour시';
    } else if (hour == 12) {
      hourStr = '오후 12시';
    } else {
      hourStr = '오후 ${hour - 12}시';
    }

    if (minute == 0) {
      return hourStr;
    }
    return '$hourStr $minute분';
  }
}
