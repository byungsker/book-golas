import 'package:shared_preferences/shared_preferences.dart';

enum NotificationCategory {
  dailyReminder,
  goalAlarm,
  eventNudge,
  announcements,
}

class NotificationCategoryPrefs {
  static const String _prefix = 'notification_';

  static String _key(NotificationCategory category) =>
      '$_prefix${category.name}';

  static Future<bool> isCategoryEnabled(NotificationCategory category) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_key(category)) ?? true;
  }

  static Future<void> setCategoryEnabled(
      NotificationCategory category, bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key(category), enabled);
  }
}
