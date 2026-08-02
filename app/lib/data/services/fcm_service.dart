import 'dart:convert';
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

  Map<String, dynamic>? _pendingTapPayload;
  bool _hasPendingTap = false;
  void Function(Map<String, dynamic>? payload)? _onNotificationTap;

  set onNotificationTap(
    void Function(Map<String, dynamic>? payload)? handler,
  ) {
    _onNotificationTap = handler;
    if (handler != null && _hasPendingTap) {
      final payload = _pendingTapPayload;
      _pendingTapPayload = null;
      _hasPendingTap = false;
      handler(payload);
    }
  }

  Future<void> initialize() async {
    tz.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Seoul'));

    await _initializeLocalNotifications();

    _firebaseMessaging.onTokenRefresh.listen((newToken) async {
      final settings = await _firebaseMessaging.getNotificationSettings();
      if (!_isAuthorized(settings)) return;

      _fcmToken = newToken;
      debugPrint('FCM token refreshed');
      saveTokenToSupabase();
    });

    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _dispatchNotificationTap(message.data);
    });

    final initialMessage = await _firebaseMessaging.getInitialMessage();
    if (initialMessage != null) {
      _dispatchNotificationTap(initialMessage.data);
    }
  }

  Future<void> _initializeLocalNotifications() async {
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
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

  Future<bool> requestPermissionAndRegister() async {
    final currentSettings = await _firebaseMessaging.getNotificationSettings();
    if (_isAuthorized(currentSettings)) {
      await _registerToken();
      return true;
    }

    final settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    debugPrint('User granted permission: ${settings.authorizationStatus}');
    if (!_isAuthorized(settings)) {
      return false;
    }

    await _registerToken();
    return true;
  }

  bool _isAuthorized(NotificationSettings settings) {
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  Future<void> _registerToken() async {
    _fcmToken = await _firebaseMessaging.getToken();
    debugPrint('FCM token registered');
    await saveTokenToSupabase();
  }

  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('📨 포그라운드 메시지 수신: ${message.notification?.title}');
    debugPrint('📦 데이터 페이로드: ${message.data}');

    if (message.notification != null) {
      _showLocalNotification(
        title: message.notification!.title ?? '',
        body: message.notification!.body ?? '',
        payload: jsonEncode(message.data),
      );
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
    _dispatchNotificationTap(payload);
  }

  void _dispatchNotificationTap(Map<String, dynamic>? payload) {
    if (_onNotificationTap != null) {
      _onNotificationTap!(payload);
    } else {
      _pendingTapPayload = payload;
      _hasPendingTap = true;
    }
  }

  Map<String, dynamic> _parsePayloadString(String payloadStr) {
    final decoded = jsonDecode(payloadStr);
    if (decoded is! Map<String, dynamic>) {
      return {};
    }
    return decoded;
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
    debugPrint('Server-managed daily reminder selected: $hour:$minute');
    await _localNotifications.cancel(_dailyReminderNotifId);
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
    debugPrint('Server-managed goal reminder selected: $hour:$minute');
    await _localNotifications.cancel(_goalAlarmNotifId);
  }

  Future<void> cancelGoalAlarm() async {
    await _localNotifications.cancel(_goalAlarmNotifId);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('goal_alarm_enabled', false);
  }

  Future<void> cancelLegacyScheduledReminders() async {
    await _localNotifications.cancel(_dailyReminderNotifId);
    await _localNotifications.cancel(_goalAlarmNotifId);
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
        await supabase.from('fcm_tokens').insert(
              buildFcmTokenInsertPayload(
                userId: userId,
                token: _fcmToken!,
                deviceType: deviceType,
                locale: locale,
              ),
            );
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

String? extractNotificationBookId(Map<String, dynamic>? payload) {
  final value = payload?['bookId'];
  if (value is! String) return null;
  final normalized = value.trim();
  return normalized.isEmpty ? null : normalized;
}

Map<String, dynamic> buildFcmTokenInsertPayload({
  required String userId,
  required String token,
  required String deviceType,
  required String locale,
}) {
  return {
    'user_id': userId,
    'token': token,
    'device_type': deviceType,
    'locale': locale,
    'daily_reminder_enabled': true,
    'goal_alarm_enabled': true,
    'goal_alarm_hour': 20,
    'goal_alarm_minute': 0,
    'event_nudge_enabled': true,
    'notification_enabled': true,
  };
}
