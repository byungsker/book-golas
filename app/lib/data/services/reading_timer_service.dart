import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/domain/models/reading_session.dart';

class ReadingTimerService {
  static final ReadingTimerService _instance = ReadingTimerService._internal();
  factory ReadingTimerService() => _instance;
  ReadingTimerService._internal();

  SupabaseClient get _supabase => Supabase.instance.client;
  static const String _tableName = 'reading_sessions';

  static const String _keyBookId = 'timer_book_id';
  static const String _keyBookTitle = 'timer_book_title';
  static const String _keyBookImageUrl = 'timer_book_image_url';
  static const String _keyStartTime = 'timer_start_time';
  static const String _keyIsRunning = 'timer_is_running';
  static const String _keyAccumulatedMs = 'timer_accumulated_ms';

  Future<void> saveSession(ReadingSession session) async {
    try {
      final sessionData = session.toJson();
      sessionData.remove('id');

      await _supabase.from(_tableName).insert(sessionData);
      debugPrint('독서 세션 저장 성공: ${session.durationSeconds}초');
    } catch (e) {
      debugPrint('독서 세션 저장 실패: $e');
    }
  }

  Future<List<ReadingSession>> getSessions(String bookId) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return [];

      final response = await _supabase
          .from(_tableName)
          .select()
          .eq('user_id', userId)
          .eq('book_id', bookId)
          .order('started_at', ascending: false);

      return (response as List)
          .map((json) => ReadingSession.fromJson(json))
          .toList();
    } catch (e) {
      debugPrint('독서 세션 조회 실패: $e');
      return [];
    }
  }

  Future<int> getTotalReadingTime(String bookId) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return 0;

      final response = await _supabase
          .from(_tableName)
          .select('duration_seconds')
          .eq('user_id', userId)
          .eq('book_id', bookId);

      int totalSeconds = 0;
      for (final record in response as List) {
        totalSeconds += (record['duration_seconds'] as int? ?? 0);
      }

      return totalSeconds;
    } catch (e) {
      debugPrint('총 독서 시간 조회 실패: $e');
      return 0;
    }
  }

  Future<void> updateBookTotalTime(String bookId, int totalSeconds) async {
    try {
      await _supabase.from('books').update({
        'total_reading_seconds': totalSeconds,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', bookId);

      debugPrint('책 총 독서 시간 업데이트 성공: $totalSeconds초');
    } catch (e) {
      debugPrint('책 총 독서 시간 업데이트 실패: $e');
    }
  }

  Future<void> persistTimerState(
    String bookId,
    DateTime startTime,
    bool isRunning,
    int accumulatedMs, {
    String? bookTitle,
    String? bookImageUrl,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyBookId, bookId);
      await prefs.setString(_keyStartTime, startTime.toIso8601String());
      await prefs.setBool(_keyIsRunning, isRunning);
      await prefs.setInt(_keyAccumulatedMs, accumulatedMs);
      if (bookTitle != null) {
        await prefs.setString(_keyBookTitle, bookTitle);
      }
      if (bookImageUrl != null) {
        await prefs.setString(_keyBookImageUrl, bookImageUrl);
      }
      debugPrint(
          '타이머 상태 저장 성공: bookId=$bookId, title=$bookTitle, isRunning=$isRunning');
    } catch (e) {
      debugPrint('타이머 상태 저장 실패: $e');
    }
  }

  Future<Map<String, dynamic>?> restoreTimerState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final bookId = prefs.getString(_keyBookId);

      if (bookId == null) return null;

      final startTimeStr = prefs.getString(_keyStartTime);
      final isRunning = prefs.getBool(_keyIsRunning);
      final accumulatedMs = prefs.getInt(_keyAccumulatedMs);
      final bookTitle = prefs.getString(_keyBookTitle);
      final bookImageUrl = prefs.getString(_keyBookImageUrl);

      if (startTimeStr == null) return null;

      return {
        'timer_book_id': bookId,
        'timer_book_title': bookTitle,
        'timer_book_image_url': bookImageUrl,
        'timer_start_time': DateTime.parse(startTimeStr),
        'timer_is_running': isRunning ?? false,
        'timer_accumulated_ms': accumulatedMs ?? 0,
      };
    } catch (e) {
      debugPrint('타이머 상태 복원 실패: $e');
      return null;
    }
  }

  Future<void> clearTimerState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keyBookId);
      await prefs.remove(_keyBookTitle);
      await prefs.remove(_keyBookImageUrl);
      await prefs.remove(_keyStartTime);
      await prefs.remove(_keyIsRunning);
      await prefs.remove(_keyAccumulatedMs);
      debugPrint('타이머 상태 초기화 성공');
    } catch (e) {
      debugPrint('타이머 상태 초기화 실패: $e');
    }
  }
}
