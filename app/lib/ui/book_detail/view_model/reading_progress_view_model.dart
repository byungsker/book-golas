import 'package:book_golas/ui/core/view_model/base_view_model.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ReadingProgressViewModel extends BaseViewModel {
  String _bookId;

  List<Map<String, dynamic>>? _progressHistory;
  Map<String, int> _dailySessionDurations = {};

  List<Map<String, dynamic>>? get progressHistory => _progressHistory;
  Map<String, int> get dailySessionDurations => _dailySessionDurations;

  ReadingProgressViewModel({required String bookId}) : _bookId = bookId;

  void updateBookId(String bookId) {
    _bookId = bookId;
  }

  Future<List<Map<String, dynamic>>> fetchProgressHistory() async {
    setLoading(true);
    try {
      final client = Supabase.instance.client;

      final responses = await Future.wait([
        client
            .from('reading_progress_history')
            .select()
            .eq('book_id', _bookId)
            .order('created_at', ascending: true),
        client
            .from('reading_sessions')
            .select('duration_seconds, created_at')
            .eq('book_id', _bookId),
      ]);

      _progressHistory = (responses[0] as List).map((record) {
        final map = Map<String, dynamic>.from(record as Map);
        if (map['created_at'] != null && map['created_at'] is String) {
          map['created_at'] = DateTime.parse(map['created_at'] as String);
        }
        return map;
      }).toList();

      _dailySessionDurations = {};
      for (final session in responses[1] as List) {
        final createdAt =
            DateTime.parse(session['created_at'] as String).toLocal();
        final dateKey =
            '${createdAt.year}-${createdAt.month.toString().padLeft(2, '0')}-${createdAt.day.toString().padLeft(2, '0')}';
        final duration = session['duration_seconds'] as int? ?? 0;
        _dailySessionDurations[dateKey] =
            (_dailySessionDurations[dateKey] ?? 0) + duration;
      }

      notifyListeners();
      return _progressHistory!;
    } catch (e) {
      setError('진행 기록을 불러오는데 실패했습니다: $e');
      return [];
    } finally {
      setLoading(false);
    }
  }

  List<Map<String, dynamic>> getRecentProgress({int limit = 7}) {
    if (_progressHistory == null) return [];
    final count = _progressHistory!.length;
    if (count <= limit) return _progressHistory!;
    return _progressHistory!.sublist(count - limit);
  }

  int getTotalPagesRead() {
    if (_progressHistory == null || _progressHistory!.isEmpty) return 0;
    return _progressHistory!.fold<int>(0, (sum, record) {
      final page = record['page'] as int? ?? 0;
      final previousPage = record['previous_page'] as int? ?? 0;
      return sum + (page - previousPage);
    });
  }

  double getAveragePagesPerDay() {
    if (_progressHistory == null || _progressHistory!.isEmpty) return 0;
    final total = getTotalPagesRead();
    return total / _progressHistory!.length;
  }

  int getReadingStreak() {
    if (_progressHistory == null || _progressHistory!.isEmpty) return 0;

    int streak = 0;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    for (int i = _progressHistory!.length - 1; i >= 0; i--) {
      final record = _progressHistory![i];
      DateTime? createdAt;
      final rawCreatedAt = record['created_at'];
      if (rawCreatedAt is DateTime) {
        createdAt = rawCreatedAt.toLocal();
      } else if (rawCreatedAt is String) {
        createdAt = DateTime.tryParse(rawCreatedAt)?.toLocal();
      }
      if (createdAt == null) continue;
      final recordDate =
          DateTime(createdAt.year, createdAt.month, createdAt.day);
      final expectedDate = today.subtract(Duration(days: streak));

      if (recordDate == expectedDate) {
        streak++;
      } else if (recordDate.isBefore(expectedDate)) {
        break;
      }
    }

    return streak;
  }

  Future<bool> addProgressRecord({
    required int page,
    required int previousPage,
    int? readingTime,
  }) async {
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) {
        setError('로그인이 필요합니다');
        return false;
      }

      await Supabase.instance.client.from('reading_progress_history').insert({
        'book_id': _bookId,
        'user_id': userId,
        'page': page,
        'previous_page': previousPage,
        'reading_time': readingTime ?? 0,
      });

      await fetchProgressHistory();
      return true;
    } catch (e) {
      setError('진행 기록 추가에 실패했습니다: $e');
      return false;
    }
  }
}
