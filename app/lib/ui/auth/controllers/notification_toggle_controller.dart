import 'package:book_golas/data/services/notification_permission_coordinator.dart';

enum NotificationToggleResult {
  enabled,
  disabled,
  permissionDenied,
  permissionRequestFailed,
  updateFailed,
}

class NotificationToggleController {
  const NotificationToggleController({
    required this.requestPermission,
    required this.persistEnabled,
    required this.scheduleDailyReminder,
    required this.scheduleGoalAlarm,
    required this.cancelDailyReminder,
    required this.cancelGoalAlarm,
  });

  final Future<NotificationPermissionRequestResult> Function()
      requestPermission;
  final Future<bool> Function(bool enabled) persistEnabled;
  final Future<void> Function() scheduleDailyReminder;
  final Future<void> Function() scheduleGoalAlarm;
  final Future<void> Function() cancelDailyReminder;
  final Future<void> Function() cancelGoalAlarm;

  Future<NotificationToggleResult> setEnabled(bool enabled) async {
    if (enabled) {
      final permissionResult = await requestPermission();
      switch (permissionResult) {
        case NotificationPermissionRequestResult.granted:
          break;
        case NotificationPermissionRequestResult.denied:
          return NotificationToggleResult.permissionDenied;
        case NotificationPermissionRequestResult.failed:
          return NotificationToggleResult.permissionRequestFailed;
      }
    }

    if (!await persistEnabled(enabled)) {
      return NotificationToggleResult.updateFailed;
    }

    if (enabled) {
      await scheduleDailyReminder();
      await scheduleGoalAlarm();
      return NotificationToggleResult.enabled;
    }

    await cancelDailyReminder();
    await cancelGoalAlarm();
    return NotificationToggleResult.disabled;
  }
}
