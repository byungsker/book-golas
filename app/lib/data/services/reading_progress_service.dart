import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/domain/models/reading_progress_record.dart';
import 'package:book_golas/l10n/app_localizations.dart';

class ReadingProgressService {
  static final ReadingProgressService _instance =
      ReadingProgressService._internal();
  factory ReadingProgressService() => _instance;
  ReadingProgressService._internal();

  final SupabaseClient _supabase = Supabase.instance.client;
  static const String _tableName = 'reading_progress_history';

  /// 새 진행 기록 추가
  Future<ReadingProgressRecord?> addProgressRecord({
    required String bookId,
    required int currentPage,
    required int previousPage,
  }) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        debugPrint('사용자가 로그인되어 있지 않습니다.');
        return null;
      }

      final response = await _supabase
          .from(_tableName)
          .insert({
            'user_id': userId,
            'book_id': bookId,
            'page': currentPage,
            'previous_page': previousPage,
          })
          .select()
          .single();

      return ReadingProgressRecord.fromJson(response);
    } catch (e) {
      debugPrint('진행 기록 추가 실패: $e');
      return null;
    }
  }

  /// 특정 책의 진행 히스토리 조회
  Future<List<ReadingProgressRecord>> fetchBookProgressHistory(
      String bookId) async {
    try {
      final response = await _supabase
          .from(_tableName)
          .select()
          .eq('book_id', bookId)
          .order('created_at', ascending: true);

      return (response as List)
          .map((json) => ReadingProgressRecord.fromJson(json))
          .toList();
    } catch (e) {
      debugPrint('책 진행 히스토리 조회 실패: $e');
      return [];
    }
  }

  /// 현재 사용자의 전체 진행 히스토리 조회
  Future<List<ReadingProgressRecord>> fetchUserProgressHistory() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return [];

      final response = await _supabase
          .from(_tableName)
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: true);

      return (response as List)
          .map((json) => ReadingProgressRecord.fromJson(json))
          .toList();
    } catch (e) {
      debugPrint('사용자 진행 히스토리 조회 실패: $e');
      return [];
    }
  }

  /// 연속 독서일(스트릭) 계산
  Future<int> calculateReadingStreak() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return 0;

      final response = await _supabase
          .from(_tableName)
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      if ((response as List).isEmpty) return 0;

      // 날짜별로 그룹화 (중복 제거)
      final Set<String> readingDates = {};
      for (final record in response) {
        final date = DateTime.parse(record['created_at'] as String);
        final dateKey = '${date.year}-${date.month}-${date.day}';
        readingDates.add(dateKey);
      }

      // 오늘부터 역순으로 연속된 날짜 세기
      int streak = 0;
      final today = DateTime.now();
      DateTime checkDate = DateTime(today.year, today.month, today.day);

      // 오늘 기록이 없으면 어제부터 시작
      final todayKey = '${checkDate.year}-${checkDate.month}-${checkDate.day}';
      if (!readingDates.contains(todayKey)) {
        checkDate = checkDate.subtract(const Duration(days: 1));
      }

      while (true) {
        final dateKey = '${checkDate.year}-${checkDate.month}-${checkDate.day}';
        if (readingDates.contains(dateKey)) {
          streak++;
          checkDate = checkDate.subtract(const Duration(days: 1));
        } else {
          break;
        }
      }

      return streak;
    } catch (e) {
      debugPrint('스트릭 계산 실패: $e');
      return 0;
    }
  }

  /// 목표 달성률 계산 (일별 목표 대비 실제 읽은 페이지)
  Future<double> calculateGoalAchievementRate() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return 0.0;

      final today = DateTime.now();
      final startOfToday = DateTime(today.year, today.month, today.day);

      // 활성 책들 가져오기 (완독하지 않은 책)
      final booksResponse = await _supabase
          .from('books')
          .select('id, total_pages, current_page, target_date')
          .eq('user_id', userId);

      if ((booksResponse as List).isEmpty) return 0.0;

      // 일별 목표 합계 계산 (남은 페이지 / 남은 일수)
      int totalDailyTarget = 0;
      for (final book in booksResponse) {
        final totalPages = book['total_pages'] as int? ?? 0;
        final currentPage = book['current_page'] as int? ?? 0;
        final targetDateStr = book['target_date'] as String?;

        if (targetDateStr == null || currentPage >= totalPages) continue;

        final targetDate = DateTime.parse(targetDateStr);
        final targetDay =
            DateTime(targetDate.year, targetDate.month, targetDate.day);
        final daysLeft = targetDay.difference(startOfToday).inDays;

        if (daysLeft <= 0) continue;

        final pagesLeft = totalPages - currentPage;
        final dailyTarget = (pagesLeft / daysLeft).ceil();
        totalDailyTarget += dailyTarget;
      }

      if (totalDailyTarget == 0) return 0.0;

      // 오늘 읽은 페이지 합계
      final progressResponse = await _supabase
          .from(_tableName)
          .select('page, previous_page')
          .eq('user_id', userId)
          .gte('created_at', startOfToday.toIso8601String());

      int todayPagesRead = 0;
      for (final record in progressResponse as List) {
        final page = record['page'] as int;
        final previousPage = record['previous_page'] as int? ?? 0;
        todayPagesRead += (page - previousPage);
      }

      // 달성률 계산 (최대 100%)
      final rate = todayPagesRead / totalDailyTarget;
      return rate > 1.0 ? 1.0 : rate;
    } catch (e) {
      debugPrint('목표 달성률 계산 실패: $e');
      return 0.0;
    }
  }

  /// 읽기 통계 가져오기
  Future<Map<String, dynamic>> getReadingStatistics() async {
    try {
      final history = await fetchUserProgressHistory();

      if (history.isEmpty) {
        return {
          'totalPages': 0,
          'averageDaily': 0.0,
          'maxDaily': 0,
          'minDaily': 0,
          'streak': 0,
          'goalRate': 0.0,
        };
      }

      // 일별로 그룹화
      final Map<String, int> dailyPages = {};
      for (final record in history) {
        final dateKey =
            '${record.createdAt.year}-${record.createdAt.month}-${record.createdAt.day}';
        dailyPages[dateKey] = (dailyPages[dateKey] ?? 0) + record.pagesRead;
      }

      final dailyValues = dailyPages.values.toList();
      final totalPages = dailyValues.fold(0, (sum, v) => sum + v);
      final averageDaily =
          dailyValues.isNotEmpty ? totalPages / dailyValues.length : 0.0;
      final maxDaily = dailyValues.isNotEmpty
          ? dailyValues.reduce((a, b) => a > b ? a : b)
          : 0;
      final minDaily = dailyValues.isNotEmpty
          ? dailyValues.reduce((a, b) => a < b ? a : b)
          : 0;

      final streak = await calculateReadingStreak();
      final goalRate = await calculateGoalAchievementRate();

      return {
        'totalPages': totalPages,
        'averageDaily': averageDaily,
        'maxDaily': maxDaily,
        'minDaily': minDaily,
        'streak': streak,
        'goalRate': goalRate,
      };
    } catch (e) {
      debugPrint('통계 계산 실패: $e');
      return {
        'totalPages': 0,
        'averageDaily': 0.0,
        'maxDaily': 0,
        'minDaily': 0,
        'streak': 0,
        'goalRate': 0.0,
      };
    }
  }

  Future<Map<DateTime, List<Map<String, dynamic>>>> fetchReadingDataForPeriod({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return {};

      final response = await _supabase
          .from(_tableName)
          .select('''
            id,
            book_id,
            page,
            previous_page,
            created_at,
            books!inner (
              id,
              title,
              author,
              image_url,
              status,
              start_date,
              target_date,
              updated_at,
              deleted_at
            )
          ''')
          .eq('user_id', userId)
          .gte('created_at', startDate.toIso8601String())
          .lte('created_at', endDate.toIso8601String())
          .isFilter('books.deleted_at', null)
          .order('created_at', ascending: false);

      final Map<DateTime, List<Map<String, dynamic>>> result = {};

      for (final record in response as List) {
        final createdAt = DateTime.parse(record['created_at'] as String);
        final dateKey =
            DateTime(createdAt.year, createdAt.month, createdAt.day);

        result.putIfAbsent(dateKey, () => []);
        result[dateKey]!.add(record);
      }

      return result;
    } catch (e) {
      debugPrint('기간별 독서 데이터 조회 실패: $e');
      return {};
    }
  }

  Future<Map<String, int>> getGenreDistribution({int? year}) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return {};

      var query = _supabase
          .from('books')
          .select('genre')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .isFilter('deleted_at', null);

      if (year != null) {
        final startOfYear = DateTime(year, 1, 1);
        final endOfYear = DateTime(year, 12, 31, 23, 59, 59);
        query = query
            .gte('updated_at', startOfYear.toIso8601String())
            .lte('updated_at', endOfYear.toIso8601String());
      }

      final response = await query;

      final Map<String, int> genreCount = {};
      for (final book in response as List) {
        final genre = book['genre'] as String?;
        if (genre != null && genre.isNotEmpty) {
          final mainGenre = _extractMainGenre(genre);
          genreCount[mainGenre] = (genreCount[mainGenre] ?? 0) + 1;
        } else {
          genreCount['미분류'] = (genreCount['미분류'] ?? 0) + 1;
        }
      }

      return genreCount;
    } catch (e) {
      debugPrint('장르 분포 조회 실패: $e');
      return {};
    }
  }

  String _extractMainGenre(String genre) {
    if (genre.contains('>')) {
      return genre.split('>').first.trim();
    }
    return genre.trim();
  }

  String getTopGenreMessage(
      Map<String, int> genreDistribution, AppLocalizations l10n) {
    if (genreDistribution.isEmpty) {
      return 'No completed books yet. Complete your first book!';
    }

    if (genreDistribution.length == 1 &&
        genreDistribution.containsKey('Uncategorized')) {
      return 'You are reading diverse books! More accurate analysis will be possible when genres are registered.';
    }

    final sortedGenres = genreDistribution.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final topGenre = sortedGenres.first.key;
    final topCount = sortedGenres.first.value;

    final messages = _getGenreMessages(topGenre, l10n);
    final messageIndex = topCount % messages.length;

    return messages[messageIndex];
  }

  List<String> _getGenreMessages(String genre, AppLocalizations l10n) {
    final genreMessages = {
      'Novel': [
        'You are a literary enthusiast!',
        'Living in the world of stories',
        'A devoted reader immersed in novels',
      ],
      'Literature': [
        'You are a literary enthusiast!',
        'A reader who understands the depth of literature',
        'Someone who enjoys the beauty of words',
      ],
      'Self-Help': [
        'You are constantly growing!',
        'A reader who never stops developing',
        'Preparing for a better tomorrow',
      ],
      'Business': [
        'You have a great business mind!',
        'Running towards success',
        'You have the makings of a future CEO',
      ],
      'Humanities': [
        'You enjoy deep contemplation',
        'A reader who enjoys philosophical thinking',
        'Someone exploring humanity and the world',
      ],
      'Science': [
        'You are a curious explorer!',
        'Uncovering the principles of the world',
        'A person with scientific thinking',
      ],
      'History': [
        'You find wisdom in history',
        'Eyes that see the future through the past',
        'You have the qualities of a history enthusiast',
      ],
      'Essay': [
        'You empathize with life stories',
        'A reader who finds meaning in everyday life',
        'Someone with warm sensibility',
      ],
      'Poetry': [
        'A poetic soul with rich sensibility',
        'Someone who knows the beauty of language',
        'You have excellent poetic sensitivity',
      ],
      'Comic': [
        'Someone who enjoys both fun and emotion',
        'A reader who reads stories through pictures',
        'Someone who appreciates the charm of comics',
      ],
      'Uncategorized': [
        'You are exploring diverse fields!',
        'A reader who is not picky about genres',
        'Someone who loves all kinds of books',
      ],
    };

    return genreMessages[genre] ??
        [
          'You are an expert in $genre!',
          'Someone with deep interest in $genre',
          'You have the qualities of a $genre enthusiast',
        ];
  }

  Future<Map<int, int>> getMonthlyBookCount({int? year}) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return {};

      final targetYear = year ?? DateTime.now().year;
      final startOfYear = DateTime(targetYear, 1, 1);
      final endOfYear = DateTime(targetYear, 12, 31, 23, 59, 59);

      final response = await _supabase
          .from('books')
          .select('updated_at')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .isFilter('deleted_at', null)
          .gte('updated_at', startOfYear.toIso8601String())
          .lte('updated_at', endOfYear.toIso8601String());

      final Map<int, int> monthlyCount = {};
      for (int i = 1; i <= 12; i++) {
        monthlyCount[i] = 0;
      }

      for (final book in response as List) {
        final updatedAt = DateTime.parse(book['updated_at'] as String);
        final month = updatedAt.month;
        monthlyCount[month] = (monthlyCount[month] ?? 0) + 1;
      }

      return monthlyCount;
    } catch (e) {
      debugPrint('월별 독서량 조회 실패: $e');
      return {};
    }
  }

  Future<Map<DateTime, int>> getDailyBookCompletionCount({
    required DateTime start,
    required DateTime end,
  }) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return {};

      final response = await _supabase
          .from('books')
          .select('updated_at')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .isFilter('deleted_at', null)
          .gte('updated_at', start.toIso8601String())
          .lte('updated_at', end.toIso8601String());

      final Map<DateTime, int> dailyCount = {};
      for (final book in response as List) {
        final updatedAt = DateTime.parse(book['updated_at'] as String);
        final dateKey =
            DateTime(updatedAt.year, updatedAt.month, updatedAt.day);
        dailyCount[dateKey] = (dailyCount[dateKey] ?? 0) + 1;
      }

      return dailyCount;
    } catch (e) {
      debugPrint('일별 완독 수 조회 실패: $e');
      return {};
    }
  }

  Future<Map<DateTime, int>> getDailyReadingHeatmap({
    int? year,
    int weeksToShow = 52,
  }) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return {};

      final now = DateTime.now();
      final targetYear = year ?? now.year;

      DateTime startDate;
      DateTime endDate;

      if (year != null) {
        startDate = DateTime(targetYear, 1, 1);
        endDate = DateTime(targetYear, 12, 31);
      } else {
        endDate = DateTime(now.year, now.month, now.day);
        startDate = endDate.subtract(Duration(days: weeksToShow * 7));
      }

      final response = await _supabase
          .from(_tableName)
          .select('created_at, page, previous_page, books!inner(deleted_at)')
          .eq('user_id', userId)
          .isFilter('books.deleted_at', null)
          .gte('created_at', startDate.toIso8601String())
          .lte('created_at', endDate.toIso8601String());

      final Map<DateTime, int> heatmapData = {};

      for (final record in response as List) {
        final createdAt = DateTime.parse(record['created_at'] as String);
        final dateKey =
            DateTime(createdAt.year, createdAt.month, createdAt.day);
        final pagesRead =
            (record['page'] as int) - (record['previous_page'] as int? ?? 0);

        heatmapData[dateKey] = (heatmapData[dateKey] ?? 0) + pagesRead;
      }

      return heatmapData;
    } catch (e) {
      debugPrint('히트맵 데이터 조회 실패: $e');
      return {};
    }
  }

  /// 일별 독서 시간 집계 (reading_sessions 기반)
  Future<Map<DateTime, int>> getDailyReadingSeconds() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return {};

      final response = await _supabase
          .from('reading_sessions')
          .select('started_at, duration_seconds')
          .eq('user_id', userId)
          .order('started_at', ascending: true);

      final Map<DateTime, int> dailySeconds = {};

      for (final record in response as List) {
        final startedAt = DateTime.parse(record['started_at'] as String);
        final dateKey =
            DateTime(startedAt.year, startedAt.month, startedAt.day);
        final duration = record['duration_seconds'] as int? ?? 0;

        dailySeconds[dateKey] = (dailySeconds[dateKey] ?? 0) + duration;
      }

      return dailySeconds;
    } catch (e) {
      debugPrint('일별 독서 시간 조회 실패: $e');
      return {};
    }
  }

  int getHeatmapIntensity(int pagesRead) {
    if (pagesRead == 0) return 0;
    if (pagesRead < 10) return 1;
    if (pagesRead < 30) return 2;
    if (pagesRead < 50) return 3;
    return 4;
  }
}
