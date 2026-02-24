import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/ui/core/view_model/base_view_model.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/exceptions/subscription_exceptions.dart';

class BookDetailViewModel extends BaseViewModel {
  final BookService _bookService;

  Book _currentBook;
  int _todayStartPage = 0;
  int _attemptCount = 1;
  Map<String, bool> _dailyAchievements = {};
  int _todayPagesRead = 0;
  bool _isTodayGoalAchievedLocked = false;
  bool _shouldShowPaywall = false;

  Book get currentBook => _currentBook;
  int get todayStartPage => _todayStartPage;
  int get attemptCount => _attemptCount;
  Map<String, bool> get dailyAchievements => _dailyAchievements;
  int get todayPagesRead => _todayPagesRead;
  bool get shouldShowPaywall => _shouldShowPaywall;

  void clearPaywallState() {
    _shouldShowPaywall = false;
  }

  /// 오늘의 목표 페이지 (오늘 시작 페이지 + 일일 목표)
  int get todayGoalPage {
    final dailyTarget = _currentBook.dailyTargetPages ?? 0;
    return _todayStartPage + dailyTarget;
  }

  /// 오늘 목표까지 남은 페이지
  int get pagesToGoal {
    final goal = todayGoalPage;
    final remaining = goal - _currentBook.currentPage;
    return remaining > 0 ? remaining : 0;
  }

  /// 오늘 목표 달성 여부 (한번 달성하면 오늘은 고정)
  bool get isTodayGoalAchieved {
    final dailyTarget = _currentBook.dailyTargetPages ?? 0;
    if (dailyTarget == 0) return false;
    if (_isTodayGoalAchievedLocked) return true;
    return _currentBook.currentPage >= todayGoalPage;
  }

  int get daysLeft {
    final now = DateTime.now();
    final target = _currentBook.targetDate;
    final days = target.difference(now).inDays;
    return days >= 0 ? days + 1 : days;
  }

  double get progressPercentage {
    if (_currentBook.totalPages == 0) return 0;
    return (_currentBook.currentPage / _currentBook.totalPages * 100)
        .clamp(0, 100);
  }

  int get pagesLeft => (_currentBook.totalPages - _currentBook.currentPage)
      .clamp(0, _currentBook.totalPages);

  String get attemptEncouragement {
    switch (_attemptCount) {
      case 1:
        return '최고!';
      case 2:
        return '잘하고 있다';
      case 3:
        return '화이팅!';
      default:
        return '내가 더 도와줄게...';
    }
  }

  BookDetailViewModel({
    required BookService bookService,
    required Book initialBook,
  })  : _bookService = bookService,
        _currentBook = initialBook,
        _attemptCount = initialBook.attemptCount {
    // 초기 시작 페이지는 현재 페이지로 설정 (loadDailyAchievements에서 정확히 계산)
    _todayStartPage = initialBook.currentPage;
  }

  Future<void> loadDailyAchievements() async {
    try {
      final achievements = <String, bool>{};
      final dailyTarget = _currentBook.dailyTargetPages ?? 0;

      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) {
        debugPrint('📊 [loadDailyAchievements] userId is null, skipping');
        return;
      }

      debugPrint(
          '📊 [loadDailyAchievements] bookId=${_currentBook.id}, dailyTarget=$dailyTarget');

      final response = await Supabase.instance.client
          .from('reading_progress_history')
          .select('page, previous_page, created_at')
          .eq('book_id', _currentBook.id!)
          .eq('user_id', userId)
          .order('created_at', ascending: true);

      debugPrint(
          '📊 [loadDailyAchievements] 히스토리 레코드 수: ${(response as List).length}');

      final dailyPages = <String, int>{};
      for (final record in response) {
        final createdAt = DateTime.parse(record['created_at'] as String);
        final dateKey =
            '${createdAt.year}-${createdAt.month.toString().padLeft(2, '0')}-${createdAt.day.toString().padLeft(2, '0')}';
        final pagesRead =
            (record['page'] as int) - (record['previous_page'] as int? ?? 0);
        dailyPages[dateKey] = (dailyPages[dateKey] ?? 0) + pagesRead;
      }

      debugPrint('📊 [loadDailyAchievements] 날짜별 페이지: $dailyPages');

      // dailyTarget이 0이면 (null 케이스) 달성 불가로 처리
      if (dailyTarget > 0) {
        for (final entry in dailyPages.entries) {
          achievements[entry.key] = entry.value >= dailyTarget;
        }
      }

      final now = DateTime.now();
      final todayKey =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      _todayPagesRead = dailyPages[todayKey] ?? 0;

      // 오늘 시작 페이지 계산 (현재 페이지 - 오늘 읽은 페이지)
      _todayStartPage = _currentBook.currentPage - _todayPagesRead;

      // 이미 목표 달성했는지 확인하고 lock
      if (dailyTarget > 0 && _currentBook.currentPage >= todayGoalPage) {
        _isTodayGoalAchievedLocked = true;
        achievements[todayKey] = true;
      }

      debugPrint(
          '📊 [loadDailyAchievements] todayKey=$todayKey, todayPagesRead=$_todayPagesRead');
      debugPrint(
          '📊 [loadDailyAchievements] todayStartPage=$_todayStartPage, todayGoalPage=$todayGoalPage');
      debugPrint(
          '📊 [loadDailyAchievements] isTodayGoalAchievedLocked=$_isTodayGoalAchievedLocked');
      debugPrint('📊 [loadDailyAchievements] achievements=$achievements');

      _dailyAchievements = achievements;
      notifyListeners();
    } catch (e) {
      debugPrint('📊 [loadDailyAchievements] 실패: $e');
      _dailyAchievements = {};
      notifyListeners();
    }
  }

  Future<bool> updateCurrentPage(int newPage) async {
    try {
      final previousPage = _currentBook.currentPage;
      debugPrint(
          '📖 [ViewModel] 페이지 업데이트 요청: ${_currentBook.title} ($previousPage → $newPage)');
      debugPrint(
          '📖 [ViewModel] bookId=${_currentBook.id}, dailyTargetPages=${_currentBook.dailyTargetPages}');

      final updatedBook = await _bookService.updateCurrentPage(
        _currentBook.id!,
        newPage,
        previousPage: previousPage,
      );

      if (updatedBook != null) {
        debugPrint(
            '📖 [ViewModel] 업데이트 성공: current_page=${updatedBook.currentPage}');
        _currentBook = updatedBook;

        final pagesRead = newPage - previousPage;
        if (pagesRead > 0) {
          _todayPagesRead += pagesRead;

          // 오늘 달성 여부 로컬 업데이트 (DB 쿼리 대신 즉시 반영)
          final dailyTarget = _currentBook.dailyTargetPages ?? 0;
          if (dailyTarget > 0) {
            final now = DateTime.now();
            final todayKey =
                '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

            // 새 로직: currentPage >= todayGoalPage 이면 목표 달성
            final goalAchieved = _currentBook.currentPage >= todayGoalPage;
            _dailyAchievements[todayKey] = goalAchieved;

            // 목표 달성 시 lock (오늘은 고정)
            if (goalAchieved && !_isTodayGoalAchievedLocked) {
              _isTodayGoalAchievedLocked = true;
              debugPrint('📖 [ViewModel] 오늘 목표 달성! Lock 설정');
            }
            debugPrint('📖 [ViewModel] 로컬 달성 업데이트: $todayKey = $goalAchieved');
          }
        }
        debugPrint(
            '📖 [ViewModel] todayPagesRead=$_todayPagesRead, isTodayGoalAchieved=$isTodayGoalAchieved');

        notifyListeners();
        return true;
      }
      debugPrint('📖 [ViewModel] 업데이트 실패: updatedBook is null');
      return false;
    } catch (e) {
      debugPrint('📖 [ViewModel] 예외 발생: $e');
      setError('페이지 업데이트에 실패했습니다: $e');
      return false;
    }
  }

  Future<bool> updateTargetDate(DateTime newDate, int newAttempt) async {
    try {
      final newDailyTarget = calculateDailyTargetPages(
        currentPage: _currentBook.currentPage,
        totalPages: _currentBook.totalPages,
        targetDate: newDate,
      );

      final response = await Supabase.instance.client
          .from('books')
          .update({
            'target_date': newDate.toIso8601String(),
            'attempt_count': newAttempt,
            'daily_target_pages': newDailyTarget,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', _currentBook.id!)
          .select()
          .single();

      if (response['id'] != null) {
        _currentBook = _currentBook.copyWith(
          targetDate: newDate,
          attemptCount: newAttempt,
          dailyTargetPages: newDailyTarget,
        );
        _attemptCount = newAttempt;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      setError('목표일 업데이트에 실패했습니다: $e');
      return false;
    }
  }

  int calculateDailyTargetPages({
    required int currentPage,
    required int totalPages,
    required DateTime targetDate,
  }) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(targetDate.year, targetDate.month, targetDate.day);
    final daysRemaining = target.difference(today).inDays + 1;

    if (daysRemaining <= 0) return 0;

    final pagesRemaining = totalPages - currentPage;
    if (pagesRemaining <= 0) return 0;

    return (pagesRemaining / daysRemaining).ceil();
  }

  void updateBook(Book book) {
    _currentBook = book;
    notifyListeners();
  }

  Future<void> refreshBook() async {
    try {
      final bookId = _currentBook.id;
      if (bookId == null) return;

      final freshBook = await _bookService.getBookById(bookId);
      if (freshBook != null) {
        _currentBook = freshBook;
        debugPrint(
            '📖 [ViewModel] refreshBook 성공: current_page=${freshBook.currentPage}');
        notifyListeners();
      }
    } catch (e) {
      debugPrint('📖 [ViewModel] refreshBook 실패: $e');
    }
  }

  Future<bool> resumeReading(DateTime newTargetDate) async {
    try {
      final updatedBook = await _bookService.resumeReading(
        _currentBook.id!,
        newTargetDate: newTargetDate,
        incrementAttempt: true,
      );

      if (updatedBook != null) {
        _currentBook = updatedBook;
        _attemptCount = updatedBook.attemptCount;
        notifyListeners();
        return true;
      }
      return false;
    } on ConcurrentReadingLimitException {
      _shouldShowPaywall = true;
      notifyListeners();
      return false;
    } catch (e) {
      setError('독서 재개에 실패했습니다: $e');
      return false;
    }
  }

  Future<bool> pauseReading() async {
    try {
      final updatedBook = await _bookService.pauseReading(_currentBook.id!);

      if (updatedBook != null) {
        _currentBook = updatedBook;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      setError('독서 중단에 실패했습니다: $e');
      return false;
    }
  }

  Future<bool> updatePriority(int? priority) async {
    try {
      final updatedBook =
          await _bookService.updatePriority(_currentBook.id!, priority);

      if (updatedBook != null) {
        _currentBook = updatedBook;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      setError('우선순위 업데이트에 실패했습니다: $e');
      return false;
    }
  }

  Future<bool> updatePlannedStartDate(DateTime? date) async {
    try {
      final updatedBook =
          await _bookService.updatePlannedStartDate(_currentBook.id!, date);

      if (updatedBook != null) {
        _currentBook = updatedBook;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      setError('시작 예정일 업데이트에 실패했습니다: $e');
      return false;
    }
  }

  Future<bool> updatePlannedBookInfo(
      int? priority, DateTime? plannedStartDate) async {
    try {
      bool success = true;

      if (priority != _currentBook.priority) {
        final priorityResult =
            await _bookService.updatePriority(_currentBook.id!, priority);
        if (priorityResult == null) success = false;
      }

      if (plannedStartDate != _currentBook.plannedStartDate) {
        final dateResult = await _bookService.updatePlannedStartDate(
            _currentBook.id!, plannedStartDate);
        if (dateResult == null) success = false;
      }

      if (success) {
        await refreshBook();
      }

      return success;
    } catch (e) {
      setError('독서 계획 업데이트에 실패했습니다: $e');
      return false;
    }
  }
}
