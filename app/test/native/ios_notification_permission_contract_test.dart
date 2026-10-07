import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

String _read(String path) => File(path).readAsStringSync();

String _methodBody(String source, String signature, String nextSignature) {
  final start = source.indexOf(signature);
  final end = source.indexOf(nextSignature, start);
  return source.substring(start, end);
}

void main() {
  test('iOS startup registers remote notifications without requesting consent',
      () {
    final appDelegate = _read('ios/Runner/AppDelegate.swift');

    expect(
        appDelegate, contains('application.registerForRemoteNotifications()'));
    expect(
      appDelegate,
      contains('UNUserNotificationCenter.current().delegate = self'),
    );
    expect(appDelegate, isNot(contains('requestAuthorization(')));
    expect(appDelegate, isNot(contains('registerUserNotificationSettings(')));
  });

  test('Flutter startup initializes notifications without requesting consent',
      () {
    final fcmService = _read('lib/data/services/fcm_service.dart');
    final initialize = _methodBody(
      fcmService,
      'Future<void> initialize() async {',
      'Future<void> _initializeLocalNotifications() async {',
    );

    expect(initialize, isNot(contains('requestPermission(')));
    expect(initialize, isNot(contains('getToken(')));
    expect(
      fcmService,
      contains('requestAlertPermission: false'),
    );
    expect(
      fcmService,
      contains('requestBadgePermission: false'),
    );
    expect(
      fcmService,
      contains('requestSoundPermission: false'),
    );
    expect(
      fcmService,
      contains('NotificationPermissionCoordinator.refreshToken('),
    );
    expect(fcmService, contains('return saveTokenToSupabase();'));
    expect(fcmService, contains('Future<bool> saveTokenToSupabase() async'));
    expect(
        fcmService,
        contains(
            "debugPrint('Error saving FCM token: \$e');\n      return false;"));
  });

  test('My Page delegates notification changes to the guarded controller', () {
    final myPage = _read('lib/ui/auth/widgets/my_page_screen.dart');
    final permissionDialog =
        _read('lib/ui/auth/widgets/notification_permission_dialog.dart');
    final controllerIndex = myPage.indexOf('NotificationToggleController(');
    final requestIndex = myPage.indexOf('requestPermissionAndRegister');
    final persistIndex = myPage.indexOf('updateNotificationEnabled');

    expect(controllerIndex, greaterThanOrEqualTo(0));
    expect(requestIndex, greaterThanOrEqualTo(0));
    expect(persistIndex, greaterThan(requestIndex));
    expect(myPage, contains('NotificationToggleResult.permissionDenied'));
    expect(myPage, contains('NotificationPermissionDialog'));
    expect(myPage, contains('openAppSettings()'));
    expect(permissionDialog, contains('myPageNotificationPermissionDenied'));
    expect(permissionDialog, contains('myPageOpenSettings'));
  });

  test('permission request remains available for a retry', () {
    final fcmService = _read('lib/data/services/fcm_service.dart');
    final request = _methodBody(
      fcmService,
      'requestPermissionAndRegister() {',
      'bool _isAuthorized(NotificationSettings settings) {',
    );

    expect(request, contains('_firebaseMessaging.requestPermission('));
    expect(request, contains('NotificationPermissionCoordinator.request('));
    expect(request, contains('registerToken: _registerToken'));
  });
}
