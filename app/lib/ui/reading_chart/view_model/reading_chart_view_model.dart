import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/reading_progress_service.dart';
import 'package:book_golas/data/services/reading_goal_service.dart';
import 'package:book_golas/data/services/book_service.dart';

class ReadingChartViewModel extends ChangeNotifier {
  static const _chartDataCacheKey = 'reading_chart_data_cache';

  final ReadingProgressService _progressService = ReadingProgressService();
  final ReadingGoalService _goalService = ReadingGoalService();
  final BookService _bookService = BookService();

  Map<String, int> _genreDistribution = {};
  Map<int, int> _monthlyBookCount = {};
  Map<String, dynamic> _goalProgress = {};
  Map<DateTime, int> _heatmapData = {};
  Map<DateTime, int> _dailyReadingSeconds = {};

  int _totalStarted = 0;
  int _completedBooks = 0;
  int _abandonedBooks = 0;
  int _inProgressBooks = 0;
  double _completionRate = 0.0;
  double _abandonRate = 0.0;
  double _retrySuccessRate = 0.0;

  int _totalHighlights = 0;
  int _totalNotes = 0;
  int _totalPhotos = 0;
  Map<String, int> _highlightGenreDistribution = {};

  double _goalRate = 0.0;
  int _selectedChartYear = DateTime.now().year;
  DateTime? _customRangeStart;
  DateTime? _customRangeEnd;

  List<Map<String, dynamic>>? _cachedRawData;

  bool _isLoading = false;
  String? _errorMessage;

  Map<String, int> get genreDistribution => _genreDistribution;
  Map<int, int> get monthlyBookCount => _monthlyBookCount;
  Map<String, dynamic> get goalProgress => _goalProgress;
  Map<DateTime, int> get heatmapData => _heatmapData;
  Map<DateTime, int> get dailyReadingSeconds => _dailyReadingSeconds;

  int get totalStarted => _totalStarted;
  int get completedBooks => _completedBooks;
  int get abandonedBooks => _abandonedBooks;
  int get inProgressBooks => _inProgressBooks;
  double get completionRate => _completionRate;
  double get abandonRate => _abandonRate;
  double get retrySuccessRate => _retrySuccessRate;

  int get totalHighlights => _totalHighlights;
  int get totalNotes => _totalNotes;
  int get totalPhotos => _totalPhotos;
  Map<String, int> get highlightGenreDistribution =>
      _highlightGenreDistribution;

  double get goalRate => _goalRate;
  int get selectedChartYear => _selectedChartYear;
  DateTime? get customRangeStart => _customRangeStart;
  DateTime? get customRangeEnd => _customRangeEnd;

  List<Map<String, dynamic>>? get cachedRawData => _cachedRawData;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get hasData =>
      _genreDistribution.isNotEmpty ||
      _monthlyBookCount.isNotEmpty ||
      _heatmapData.isNotEmpty ||
      _completedBooks > 0 ||
      _totalHighlights > 0;

  Future<void> loadData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final readPrefs = await SharedPreferences.getInstance();
      final cachedData = readPrefs.getString(_chartDataCacheKey);
      if (cachedData != null) {
        try {
          final Map<String, dynamic> json = jsonDecode(cachedData);
          _deserializeFromJson(json);
          notifyListeners();
        } catch (e) {
          // Cache parse failed, will use fresh data from server
        }
      }

      final currentYear = DateTime.now().year;
      final results = await Future.wait([
        _fetchUserProgressHistory(),
        _progressService.getGenreDistribution(year: currentYear),
        _progressService.getMonthlyBookCount(year: _selectedChartYear),
        _goalService.getYearlyProgress(year: currentYear),
        _progressService.getDailyReadingHeatmap(weeksToShow: 26),
        _calculateCompletionStats(),
        _calculateHighlightStats(),
        _progressService.calculateGoalAchievementRate(),
        _progressService.getDailyReadingSeconds(),
      ]);

      _cachedRawData = results[0] as List<Map<String, dynamic>>;
      _genreDistribution = results[1] as Map<String, int>;
      _monthlyBookCount = results[2] as Map<int, int>;
      _goalProgress = results[3] as Map<String, dynamic>;
      _heatmapData = results[4] as Map<DateTime, int>;
      _goalRate = results[7] as double;
      _dailyReadingSeconds = results[8] as Map<DateTime, int>;
      _errorMessage = null;

      final writePrefs = await SharedPreferences.getInstance();
      await writePrefs.setString(
        _chartDataCacheKey,
        jsonEncode(_serializeToJson()),
      );
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _calculateCompletionStats() async {
    final books = await _bookService.fetchBooks();

    final startedBooks = books.where((b) => b.status != 'planned').toList();
    final completed = books.where((b) => b.status == 'completed').length;
    final reading = books.where((b) => b.status == 'reading').length;
    final willRetry = books.where((b) => b.status == 'will_retry').length;

    final totalStarted = startedBooks.length;

    _totalStarted = totalStarted;
    _completedBooks = completed;
    _abandonedBooks = willRetry;
    _inProgressBooks = reading;
    _completionRate = totalStarted > 0 ? (completed / totalStarted * 100) : 0.0;
    _abandonRate = totalStarted > 0 ? (willRetry / totalStarted * 100) : 0.0;

    final retriedBooks = books
        .where((b) => b.status == 'completed' && b.attemptCount > 1)
        .length;
    _retrySuccessRate = willRetry > 0 ? (retriedBooks / willRetry * 100) : 0.0;
  }

  Future<void> _calculateHighlightStats() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    final response = await Supabase.instance.client
        .from('book_images')
        .select('id, extracted_text, highlights, book_id, books!inner(deleted_at)')
        .eq('user_id', user.id)
        .isFilter('books.deleted_at', null);

    final images = response;

    _totalPhotos = images.length;

    int highlightCount = 0;
    int noteCount = 0;
    final Map<String, int> genreCount = {};

    for (final image in images) {
      final highlights = image['highlights'] as List?;
      if (highlights != null && highlights.isNotEmpty) {
        highlightCount += highlights.length;
      }

      final extractedText = image['extracted_text'] as String?;
      if (extractedText != null && extractedText.trim().isNotEmpty) {
        noteCount++;
      }
    }

    final books = await _bookService.fetchBooks();
    final bookGenreMap = {for (var b in books) b.id: b.genre};

    for (final image in images) {
      final bookId = image['book_id'] as String?;
      if (bookId != null) {
        final genre = bookGenreMap[bookId];
        if (genre != null && genre.isNotEmpty) {
          genreCount[genre] = (genreCount[genre] ?? 0) + 1;
        }
      }
    }

    _totalHighlights = highlightCount;
    _totalNotes = noteCount;
    _highlightGenreDistribution = genreCount;
  }

  Future<List<Map<String, dynamic>>> _fetchUserProgressHistory() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return [];

    final response = await Supabase.instance.client
        .from('reading_progress_history')
        .select('page, book_id, created_at, books!inner(deleted_at)')
        .eq('user_id', user.id)
        .isFilter('books.deleted_at', null)
        .order('created_at', ascending: true);

    return (response as List)
        .map(
          (e) => {
            'page': e['page'] as int,
            'book_id': e['book_id'] as String?,
            'created_at': DateTime.parse(e['created_at'] as String),
          },
        )
        .toList();
  }

  Map<String, dynamic> _serializeToJson() {
    return {
      'genreDistribution': _genreDistribution.map((k, v) => MapEntry(k, v)),
      'monthlyBookCount':
          _monthlyBookCount.map((k, v) => MapEntry(k.toString(), v)),
      'goalProgress': _goalProgress,
      'heatmapData':
          _heatmapData.map((k, v) => MapEntry(k.toIso8601String(), v)),
      'totalStarted': _totalStarted,
      'completedBooks': _completedBooks,
      'abandonedBooks': _abandonedBooks,
      'inProgressBooks': _inProgressBooks,
      'completionRate': _completionRate,
      'abandonRate': _abandonRate,
      'retrySuccessRate': _retrySuccessRate,
      'totalHighlights': _totalHighlights,
      'totalNotes': _totalNotes,
      'totalPhotos': _totalPhotos,
      'highlightGenreDistribution':
          _highlightGenreDistribution.map((k, v) => MapEntry(k, v)),
      'goalRate': _goalRate,
    };
  }

  void _deserializeFromJson(Map<String, dynamic> json) {
    if (json.containsKey('genreDistribution')) {
      _genreDistribution = (json['genreDistribution'] as Map<String, dynamic>)
          .map((k, v) => MapEntry(k, v as int));
    }
    if (json.containsKey('monthlyBookCount')) {
      _monthlyBookCount = (json['monthlyBookCount'] as Map<String, dynamic>)
          .map((k, v) => MapEntry(int.parse(k), v as int));
    }
    if (json.containsKey('goalProgress')) {
      _goalProgress = json['goalProgress'] as Map<String, dynamic>;
    }
    if (json.containsKey('heatmapData')) {
      _heatmapData = (json['heatmapData'] as Map<String, dynamic>)
          .map((k, v) => MapEntry(DateTime.parse(k), v as int));
    }
    if (json.containsKey('totalStarted')) {
      _totalStarted = json['totalStarted'] as int;
    }
    if (json.containsKey('completedBooks')) {
      _completedBooks = json['completedBooks'] as int;
    }
    if (json.containsKey('abandonedBooks')) {
      _abandonedBooks = json['abandonedBooks'] as int;
    }
    if (json.containsKey('inProgressBooks')) {
      _inProgressBooks = json['inProgressBooks'] as int;
    }
    if (json.containsKey('completionRate')) {
      _completionRate = (json['completionRate'] as num).toDouble();
    }
    if (json.containsKey('abandonRate')) {
      _abandonRate = (json['abandonRate'] as num).toDouble();
    }
    if (json.containsKey('retrySuccessRate')) {
      _retrySuccessRate = (json['retrySuccessRate'] as num).toDouble();
    }
    if (json.containsKey('totalHighlights')) {
      _totalHighlights = json['totalHighlights'] as int;
    }
    if (json.containsKey('totalNotes')) {
      _totalNotes = json['totalNotes'] as int;
    }
    if (json.containsKey('totalPhotos')) {
      _totalPhotos = json['totalPhotos'] as int;
    }
    if (json.containsKey('highlightGenreDistribution')) {
      _highlightGenreDistribution =
          (json['highlightGenreDistribution'] as Map<String, dynamic>)
              .map((k, v) => MapEntry(k, v as int));
    }
    if (json.containsKey('goalRate')) {
      _goalRate = (json['goalRate'] as num).toDouble();
    }
  }

  Future<void> invalidateCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_chartDataCacheKey);
  }

  static Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_chartDataCacheKey);
  }

  Future<void> forceRefresh() async {
    await invalidateCache();
    await loadData();
  }

  Future<void> setChartYear(int year) async {
    _selectedChartYear = year;
    _customRangeStart = null;
    _customRangeEnd = null;
    notifyListeners();
    _monthlyBookCount =
        await _progressService.getMonthlyBookCount(year: year);
    notifyListeners();
  }

  Future<void> setCustomRange(DateTime start, DateTime end) async {
    _customRangeStart = start;
    _customRangeEnd = end;
    notifyListeners();
    final startYear = start.year;
    final endYear = end.year;
    if (startYear == endYear) {
      _selectedChartYear = startYear;
      _monthlyBookCount =
          await _progressService.getMonthlyBookCount(year: startYear);
    } else {
      final Map<int, int> merged = {};
      for (int y = startYear; y <= endYear; y++) {
        final yearData =
            await _progressService.getMonthlyBookCount(year: y);
        for (final entry in yearData.entries) {
          final key = (y - startYear) * 12 + entry.key;
          merged[key] = entry.value;
        }
      }
      _monthlyBookCount = merged;
    }
    notifyListeners();
  }

  void clearCustomRange() {
    _customRangeStart = null;
    _customRangeEnd = null;
    _selectedChartYear = DateTime.now().year;
    notifyListeners();
  }
}
