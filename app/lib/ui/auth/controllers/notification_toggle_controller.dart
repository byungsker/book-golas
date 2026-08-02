enum NotificationToggleResult {
  enabled,
  disabled,
  permissionDenied,
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

  final Future<bool> Function() requestPermission;
  final Future<bool> Function(bool enabled) persistEnabled;
  final Future<void> Function() scheduleDailyReminder;
  final Future<void> Function() scheduleGoalAlarm;
  final Future<void> Function() cancelDailyReminder;
  final Future<void> Function() cancelGoalAlarm;

  Future<NotificationToggleResult> setEnabled(bool enabled) async {
    if (enabled && !await requestPermission()) {
      return NotificationToggleResult.permissionDenied;
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
