import 'package:flutter/foundation.dart';

enum NotificationPermissionRequestResult {
  granted,
  denied,
  failed,
}

class NotificationPermissionCoordinator {
  const NotificationPermissionCoordinator._();

  static Future<NotificationPermissionRequestResult> request({
    required Future<bool> Function() isAuthorized,
    required Future<bool> Function() requestPermission,
    required Future<bool> Function() registerToken,
  }) async {
    try {
      if (await isAuthorized()) {
        return await registerToken()
            ? NotificationPermissionRequestResult.granted
            : NotificationPermissionRequestResult.failed;
      }

      if (!await requestPermission()) {
        return NotificationPermissionRequestResult.denied;
      }

      return await registerToken()
          ? NotificationPermissionRequestResult.granted
          : NotificationPermissionRequestResult.failed;
    } catch (error) {
      debugPrint('Notification permission request failed: $error');
      return NotificationPermissionRequestResult.failed;
    }
  }

  static Future<void> refreshToken({
    required Future<bool> Function() isAuthorized,
    required Future<void> Function() saveToken,
  }) async {
    try {
      if (!await isAuthorized()) return;
      await saveToken();
    } catch (error) {
      debugPrint('Notification token refresh failed: $error');
    }
  }
}
