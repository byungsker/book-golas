import 'package:book_golas/data/services/notification_permission_coordinator.dart';
import 'package:book_golas/ui/auth/controllers/notification_toggle_controller.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late int permissionRequests;
  late List<bool> persistedValues;
  late int dailySchedules;
  late int goalSchedules;
  late int dailyCancels;
  late int goalCancels;

  NotificationToggleController buildController({
    required Future<NotificationPermissionRequestResult> Function()
        requestPermission,
    Future<bool> Function(bool enabled)? persistEnabled,
  }) {
    return NotificationToggleController(
      requestPermission: requestPermission,
      persistEnabled: persistEnabled ??
          (enabled) async {
            persistedValues.add(enabled);
            return true;
          },
      scheduleDailyReminder: () async => dailySchedules++,
      scheduleGoalAlarm: () async => goalSchedules++,
      cancelDailyReminder: () async => dailyCancels++,
      cancelGoalAlarm: () async => goalCancels++,
    );
  }

  setUp(() {
    permissionRequests = 0;
    persistedValues = [];
    dailySchedules = 0;
    goalSchedules = 0;
    dailyCancels = 0;
    goalCancels = 0;
  });

  test('granted permission persists enabled state and schedules reminders',
      () async {
    final controller = buildController(
      requestPermission: () async {
        permissionRequests++;
        return NotificationPermissionRequestResult.granted;
      },
    );

    final result = await controller.setEnabled(true);

    expect(result, NotificationToggleResult.enabled);
    expect(permissionRequests, 1);
    expect(persistedValues, [true]);
    expect(dailySchedules, 1);
    expect(goalSchedules, 1);
    expect(dailyCancels, 0);
    expect(goalCancels, 0);
  });

  test('denied permission does not persist or schedule', () async {
    final controller = buildController(
      requestPermission: () async {
        permissionRequests++;
        return NotificationPermissionRequestResult.denied;
      },
    );

    final result = await controller.setEnabled(true);

    expect(result, NotificationToggleResult.permissionDenied);
    expect(permissionRequests, 1);
    expect(persistedValues, isEmpty);
    expect(dailySchedules, 0);
    expect(goalSchedules, 0);
    expect(dailyCancels, 0);
    expect(goalCancels, 0);
  });

  test('retry after a system settings change requests status again', () async {
    var granted = false;
    final controller = buildController(
      requestPermission: () async {
        permissionRequests++;
        return granted
            ? NotificationPermissionRequestResult.granted
            : NotificationPermissionRequestResult.denied;
      },
    );

    expect(
      await controller.setEnabled(true),
      NotificationToggleResult.permissionDenied,
    );

    granted = true;

    expect(
      await controller.setEnabled(true),
      NotificationToggleResult.enabled,
    );
    expect(permissionRequests, 2);
    expect(persistedValues, [true]);
    expect(dailySchedules, 1);
    expect(goalSchedules, 1);
  });

  test('failed persistence does not schedule or cancel reminders', () async {
    final controller = buildController(
      requestPermission: () async =>
          NotificationPermissionRequestResult.granted,
      persistEnabled: (enabled) async {
        persistedValues.add(enabled);
        return false;
      },
    );

    final result = await controller.setEnabled(false);

    expect(result, NotificationToggleResult.updateFailed);
    expect(permissionRequests, 0);
    expect(persistedValues, [false]);
    expect(dailySchedules, 0);
    expect(goalSchedules, 0);
    expect(dailyCancels, 0);
    expect(goalCancels, 0);
  });

  test('disabling skips permission and cancels both reminders', () async {
    final controller = buildController(
      requestPermission: () async {
        permissionRequests++;
        return NotificationPermissionRequestResult.granted;
      },
    );

    final result = await controller.setEnabled(false);

    expect(result, NotificationToggleResult.disabled);
    expect(permissionRequests, 0);
    expect(persistedValues, [false]);
    expect(dailyCancels, 1);
    expect(goalCancels, 1);
  });

  test('technical permission failure remains distinct from denial', () async {
    final controller = buildController(
      requestPermission: () async {
        permissionRequests++;
        return NotificationPermissionRequestResult.failed;
      },
    );

    final result = await controller.setEnabled(true);

    expect(result, NotificationToggleResult.permissionRequestFailed);
    expect(permissionRequests, 1);
    expect(persistedValues, isEmpty);
    expect(dailySchedules, 0);
    expect(goalSchedules, 0);
  });
}
