import 'dart:io' show Platform;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class FCMService {
  static final FCMService _instance = FCMService._internal();
  factory FCMService() => _instance;
  FCMService._internal();

  static const int _dailyReminderNotifId = 0;
  static const int _goalAlarmNotifId = 1;
  static const int _testNotifId = 999;

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  void Function(Map<String, dynamic>? payload)? onNotificationTap;

  Future<void> initialize() async {
    tz.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Seoul'));

    await _initializeLocalNotifications();
    await _requestPermission();

    _fcmToken = await _firebaseMessaging.getToken();
    debugPrint('FCM Token: $_fcmToken');

    _firebaseMessaging.onTokenRefresh.listen((newToken) {
      _fcmToken = newToken;
      debugPrint('FCM Token refreshed: $newToken');
      saveTokenToSupabase();
    });

    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
  }

  Future<void> _initializeLocalNotifications() async {
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _handleNotificationTap,
    );
  }

  Future<void> _requestPermission() async {
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    debugPrint('User granted permission: ${settings.authorizationStatus}');
  }

  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('📨 포그라운드 메시지 수신: ${message.notification?.title}');
    debugPrint('📦 데이터 페이로드: ${message.data}');

    if (message.notification != null) {
      _showLocalNotification(
        title: message.notification!.title ?? '',
        body: message.notification!.body ?? '',
        payload: message.data.toString(),
      );
    }

    if (message.data.isNotEmpty) {
      debugPrint('🔗 딥링크 데이터 처리: ${message.data}');
      onNotificationTap?.call(message.data);
    }
  }

  void _handleNotificationTap(NotificationResponse response) {
    debugPrint('📱 알림 탭: ${response.payload}');
    Map<String, dynamic>? payload;
    if (response.payload != null && response.payload!.isNotEmpty) {
      try {
        payload = _parsePayloadString(response.payload!);
        debugPrint('📦 파싱된 페이로드: $payload');
      } catch (e) {
        debugPrint('페이로드 파싱 실패: $e');
      }
    }
    onNotificationTap?.call(payload);
  }

  Map<String, dynamic> _parsePayloadString(String payloadStr) {
    final cleanStr = payloadStr.substring(1, payloadStr.length - 1);
    final map = <String, dynamic>{};

    final regex = RegExp(r'(\w+):\s*([^,}]+)');
    final matches = regex.allMatches(cleanStr);

    for (final match in matches) {
      final key = match.group(1)?.trim();
      final value = match.group(2)?.trim();
      if (key != null && value != null) {
        map[key] = value;
      }
    }

    return map;
  }

  Future<void> _showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'daily_reminder',
      'Daily Reading Reminder',
      channelDescription: '매일 독서 목표 알림',
      importance: Importance.high,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails();

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      details,
      payload: payload,
    );
  }

  Future<void> scheduleDailyReminder({
    required int hour,
    required int minute,
  }) async {
    final scheduledTime = _nextInstanceOfTime(hour, minute);
    debugPrint('📅 일일 리마인더 스케줄링: $hour시 $minute분');

    await _localNotifications.zonedSchedule(
      _dailyReminderNotifId,
      '오늘의 독서 목표',
      '오늘도 힘차게 독서를 시작해보아요!\n목표 페이지 수를 설정해주세요!',
      scheduledTime,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'daily_reminder',
          'Daily Reading Reminder',
          channelDescription: '매일 독서 목표 알림',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );

    debugPrint('✅ 일일 리마인더 스케줄링 완료');

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('daily_reminder_hour', hour);
    await prefs.setInt('daily_reminder_minute', minute);
    await prefs.setBool('daily_reminder_enabled', true);
  }

  Future<void> cancelDailyReminder() async {
    await _localNotifications.cancel(_dailyReminderNotifId);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('daily_reminder_enabled', false);
  }

  Future<void> scheduleGoalAlarm({
    required int hour,
    required int minute,
  }) async {
    final scheduledTime = _nextInstanceOfTime(hour, minute);
    debugPrint('📅 목표 알람 스케줄링: $hour시 $minute분');

    await _localNotifications.zonedSchedule(
      _goalAlarmNotifId,
      '오늘 독서는 어땠나요?',
      '현황을 업데이트해주세요!',
      scheduledTime,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'goal_alarm',
          'Goal Alarm',
          channelDescription: '독서 목표 달성 알림',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );

    debugPrint('✅ 목표 알람 스케줄링 완료');

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('goal_alarm_hour', hour);
    await prefs.setInt('goal_alarm_minute', minute);
    await prefs.setBool('goal_alarm_enabled', true);
  }

  Future<void> cancelGoalAlarm() async {
    await _localNotifications.cancel(_goalAlarmNotifId);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('goal_alarm_enabled', false);
  }

  tz.TZDateTime _nextInstanceOfTime(int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    tz.TZDateTime scheduledDate = tz.TZDateTime(
      tz.local,
      now.year,
      now.month,
      now.day,
      hour,
      minute,
    );

    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }

    return scheduledDate;
  }

  Future<void> scheduleTestNotification({int seconds = 30}) async {
    final scheduledTime =
        tz.TZDateTime.now(tz.local).add(Duration(seconds: seconds));

    await _localNotifications.zonedSchedule(
      _testNotifId,
      '🔔 테스트 알림',
      '알림이 정상적으로 작동합니다!',
      scheduledTime,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'test_channel',
          'Test Notifications',
          channelDescription: '테스트 알림',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );

    debugPrint('테스트 알림 예약 완료: $seconds초 후 ($scheduledTime)');
  }

  String _getDeviceLocale() {
    final locale = PlatformDispatcher.instance.locale;
    return locale.languageCode;
  }

  Future<void> saveTokenToSupabase() async {
    if (_fcmToken == null) {
      debugPrint('FCM token is null');
      return;
    }

    final supabase = Supabase.instance.client;
    final userId = supabase.auth.currentUser?.id;

    if (userId == null) {
      debugPrint('User not logged in');
      return;
    }

    try {
      String deviceType;
      if (kIsWeb) {
        deviceType = 'web';
      } else if (Platform.isIOS) {
        deviceType = 'ios';
      } else if (Platform.isAndroid) {
        deviceType = 'android';
      } else {
        deviceType = 'unknown';
      }

      final locale = _getDeviceLocale();

      final existing = await supabase
          .from('fcm_tokens')
          .select()
          .eq('user_id', userId)
          .eq('device_type', deviceType)
          .maybeSingle();

      if (existing != null) {
        await supabase.from('fcm_tokens').update({
          'token': _fcmToken,
          'locale': locale,
          'updated_at': DateTime.now().toIso8601String(),
        }).eq('id', existing['id']);
        debugPrint('FCM token updated (locale=$locale)');
      } else {
        await supabase.from('fcm_tokens').insert({
          'user_id': userId,
          'token': _fcmToken,
          'device_type': deviceType,
          'locale': locale,
          'daily_reminder_enabled': true,
          'daily_reminder_hour': 9,
          'daily_reminder_minute': 0,
          'goal_alarm_enabled': true,
          'goal_alarm_hour': 20,
          'goal_alarm_minute': 0,
          'event_nudge_enabled': true,
          'notification_enabled': true,
        });
        debugPrint('FCM token saved with default settings (locale=$locale)');
      }
    } catch (e) {
      debugPrint('Error saving FCM token: $e');
    }
  }

  Future<bool> isNotificationPermissionGranted() async {
    final settings = await _firebaseMessaging.getNotificationSettings();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  Future<void> requestNotificationPermission() async {
    final hasPermission = await isNotificationPermissionGranted();

    if (!hasPermission) {
      debugPrint('Please enable notifications in Settings');
    }
  }

  Future<bool> requestServerPush({
    required String title,
    required String body,
    Map<String, dynamic>? data,
  }) async {
    try {
      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id;

      if (userId == null) {
        debugPrint('❌ 사용자가 로그인되지 않음');
        return false;
      }

      final response = await supabase.functions.invoke(
        'send-fcm-push',
        body: {
          'userId': userId,
          'title': title,
          'body': body,
          'data': data ?? {},
        },
      );

      if (response.status == 200) {
        debugPrint('✅ 서버 푸시 전송 성공');
        return true;
      } else {
        debugPrint('❌ 서버 푸시 전송 실패: ${response.status}');
        return false;
      }
    } catch (e) {
      debugPrint('❌ 서버 푸시 전송 중 에러: $e');
      return false;
    }
  }
}
