import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/notification_permission_coordinator.dart';

void main() {
  test(
    'authorized request registers the token without requesting again',
    () async {
      var permissionRequests = 0;
      var tokenRegistrations = 0;

      final result = await NotificationPermissionCoordinator.request(
        isAuthorized: () async => true,
        requestPermission: () async {
          permissionRequests++;
          return true;
        },
        registerToken: () async {
          tokenRegistrations++;
          return true;
        },
      );

      expect(result, NotificationPermissionRequestResult.granted);
      expect(permissionRequests, 0);
      expect(tokenRegistrations, 1);
    },
  );

  test('denial does not register a token', () async {
    var tokenRegistrations = 0;

    final result = await NotificationPermissionCoordinator.request(
      isAuthorized: () async => false,
      requestPermission: () async => false,
      registerToken: () async {
        tokenRegistrations++;
        return true;
      },
    );

    expect(result, NotificationPermissionRequestResult.denied);
    expect(tokenRegistrations, 0);
  });

  test('permission plugin failure returns a distinct failed result', () async {
    final result = await NotificationPermissionCoordinator.request(
      isAuthorized: () async => throw StateError('plugin unavailable'),
      requestPermission: () async => true,
      registerToken: () async => true,
    );

    expect(result, NotificationPermissionRequestResult.failed);
  });

  test('token persistence failure returns a distinct failed result', () async {
    final result = await NotificationPermissionCoordinator.request(
      isAuthorized: () async => true,
      requestPermission: () async => true,
      registerToken: () async => false,
    );

    expect(result, NotificationPermissionRequestResult.failed);
  });

  test('token registration failure returns a distinct failed result', () async {
    final result = await NotificationPermissionCoordinator.request(
      isAuthorized: () async => true,
      requestPermission: () async => true,
      registerToken: () async => throw StateError('token unavailable'),
    );

    expect(result, NotificationPermissionRequestResult.failed);
  });

  test('token refresh failures do not escape the listener', () async {
    var saves = 0;

    await NotificationPermissionCoordinator.refreshToken(
      isAuthorized: () async => throw StateError('settings unavailable'),
      saveToken: () async => saves++,
    );
    await NotificationPermissionCoordinator.refreshToken(
      isAuthorized: () async => true,
      saveToken: () async {
        saves++;
        throw StateError('storage unavailable');
      },
    );

    expect(saves, 1);
  });
}
