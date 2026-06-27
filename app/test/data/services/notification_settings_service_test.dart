import 'package:flutter_test/flutter_test.dart';
import 'package:book_golas/data/services/notification_settings_service.dart';

void main() {
  group('NotificationSettings', () {
    test('uses 18:00 as the default daily reminder time', () {
      final settings = NotificationSettings(notificationEnabled: true);

      expect(settings.dailyReminderHour, 18);
      expect(settings.dailyReminderMinute, 0);
    });

    test('uses 18:00 when persisted daily reminder time is missing', () {
      final settings = NotificationSettings.fromJson({
        'notification_enabled': true,
        'daily_reminder_enabled': true,
      });

      expect(settings.dailyReminderHour, 18);
      expect(settings.dailyReminderMinute, 0);
    });

    test('preserves a persisted custom daily reminder time', () {
      final settings = NotificationSettings.fromJson({
        'notification_enabled': true,
        'daily_reminder_enabled': true,
        'daily_reminder_hour': 20,
        'daily_reminder_minute': 30,
      });

      expect(settings.dailyReminderHour, 20);
      expect(settings.dailyReminderMinute, 30);
    });
  });
}
