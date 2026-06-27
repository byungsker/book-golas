import 'package:book_golas/data/services/fcm_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('buildFcmTokenInsertPayload', () {
    test('does not override database daily reminder time defaults', () {
      final payload = buildFcmTokenInsertPayload(
        userId: 'user-1',
        token: 'token-1',
        deviceType: 'ios',
        locale: 'ko',
      );

      expect(payload['user_id'], 'user-1');
      expect(payload['token'], 'token-1');
      expect(payload['device_type'], 'ios');
      expect(payload['locale'], 'ko');
      expect(payload['daily_reminder_enabled'], true);
      expect(payload.containsKey('daily_reminder_hour'), false);
      expect(payload.containsKey('daily_reminder_minute'), false);
    });
  });
}
