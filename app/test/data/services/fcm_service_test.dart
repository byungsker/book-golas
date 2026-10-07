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

  group('extractNotificationBookId', () {
    test('returns a normalized book id', () {
      expect(
        extractNotificationBookId({
          'bookId': '  book-123  ',
          'destination': 'reading',
        }),
        'book-123',
      );
    });

    test('returns null for missing or invalid book ids', () {
      expect(extractNotificationBookId(null), isNull);
      expect(extractNotificationBookId({'bookId': '  '}), isNull);
      expect(extractNotificationBookId({'bookId': 123}), isNull);
    });
  });
}
