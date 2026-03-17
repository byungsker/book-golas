import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/reading_timer_service.dart';
import 'package:book_golas/domain/models/reading_session.dart';
import 'package:book_golas/ui/core/view_model/base_view_model.dart';

class ReadingTimerViewModel extends BaseViewModel with WidgetsBindingObserver {
  final ReadingTimerService _service = ReadingTimerService();

  DateTime? _startTime;
  DateTime? _sessionStartTime;
  int _accumulatedMs = 0;
  String? _currentBookId;
  String? _currentBookTitle;
  String? _currentBookImageUrl;
  Timer? _displayTimer;

  bool _isRunning = false;
  bool _isPaused = false;

  bool get isRunning => _isRunning;
  bool get isPaused => _isPaused;
  String? get currentBookId => _currentBookId;
  String? get currentBookTitle => _currentBookTitle;
  String? get currentBookImageUrl => _currentBookImageUrl;

  Duration get elapsed {
    if (_startTime == null) {
      return Duration(milliseconds: _accumulatedMs);
    }
    return Duration(milliseconds: _accumulatedMs) +
        DateTime.now().difference(_startTime!);
  }

  static const int _minSessionSeconds = 30;
  static const int _maxSessionHours = 8;

  ReadingTimerViewModel() {
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _saveStateOnBackground();
    } else if (state == AppLifecycleState.resumed) {
      _restoreStateOnForeground();
    }
  }

  Future<void> init() async {
    final state = await _service.restoreTimerState();
    if (state == null) return;

    _currentBookId = state['timer_book_id'] as String?;
    _currentBookTitle = state['timer_book_title'] as String?;
    _currentBookImageUrl = state['timer_book_image_url'] as String?;
    final savedStartTime = state['timer_start_time'] as DateTime?;
    final wasRunning = state['timer_is_running'] as bool? ?? false;
    _accumulatedMs = state['timer_accumulated_ms'] as int? ?? 0;

    if (wasRunning && savedStartTime != null) {
      _isRunning = true;
      _isPaused = false;
      _startTime = savedStartTime;
      _sessionStartTime = savedStartTime;
      _startDisplayTimer();
      _checkMaxDuration();
    } else if (_accumulatedMs > 0 && savedStartTime != null) {
      _isRunning = false;
      _isPaused = true;
      _sessionStartTime = savedStartTime;
    }

    notifyListeners();
    debugPrint(
        '타이머 상태 복원: bookId=$_currentBookId, title=$_currentBookTitle, isRunning=$_isRunning, elapsed=${elapsed.inSeconds}s');
  }

  Future<void> start(String bookId,
      {String? bookTitle, String? imageUrl}) async {
    if (_isRunning) return;

    _currentBookId = bookId;
    _currentBookTitle = bookTitle;
    _currentBookImageUrl = imageUrl;
    _startTime = DateTime.now();
    _sessionStartTime = _startTime;
    _accumulatedMs = 0;
    _isRunning = true;
    _isPaused = false;

    _startDisplayTimer();
    await _persistState();

    notifyListeners();
    debugPrint('타이머 시작: bookId=$bookId, title=$bookTitle');
  }

  void pause() {
    if (!_isRunning || _isPaused) return;

    if (_startTime != null) {
      _accumulatedMs += DateTime.now().difference(_startTime!).inMilliseconds;
    }
    _startTime = null;
    _isPaused = true;
    _isRunning = false;

    _stopDisplayTimer();
    _persistState();

    notifyListeners();
    debugPrint('타이머 일시정지: elapsed=${elapsed.inSeconds}s');
  }

  void resume() {
    if (_isRunning || !_isPaused) return;

    _startTime = DateTime.now();
    _isRunning = true;
    _isPaused = false;

    _startDisplayTimer();
    _persistState();

    notifyListeners();
    debugPrint('타이머 재개: elapsed=${elapsed.inSeconds}s');
  }

  Future<void> stop() async {
    if (!_isRunning && !_isPaused) return;
    if (_currentBookId == null || _sessionStartTime == null) {
      reset();
      return;
    }

    final totalElapsed = elapsed;
    final durationSeconds = totalElapsed.inSeconds;

    _stopDisplayTimer();
    _isRunning = false;
    _isPaused = false;

    if (durationSeconds < _minSessionSeconds) {
      debugPrint('세션 저장 스킵: $durationSeconds초 < 최소 $_minSessionSeconds초');
      reset();
      return;
    }

    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) {
      debugPrint('세션 저장 실패: 사용자 없음');
      reset();
      return;
    }

    final session = ReadingSession(
      userId: userId,
      bookId: _currentBookId!,
      startedAt: _sessionStartTime!,
      endedAt: DateTime.now(),
      durationSeconds: durationSeconds,
    );

    await _service.saveSession(session);

    final totalReadingTime =
        await _service.getTotalReadingTime(_currentBookId!);
    await _service.updateBookTotalTime(_currentBookId!, totalReadingTime);

    debugPrint('세션 저장 완료: $durationSeconds초, 총 $totalReadingTime초');

    reset();
  }

  void reset() {
    _stopDisplayTimer();
    _startTime = null;
    _sessionStartTime = null;
    _accumulatedMs = 0;
    _currentBookId = null;
    _currentBookTitle = null;
    _currentBookImageUrl = null;
    _isRunning = false;
    _isPaused = false;

    _service.clearTimerState();
    notifyListeners();

    debugPrint('타이머 초기화');
  }

  void _startDisplayTimer() {
    _displayTimer?.cancel();
    _displayTimer = Timer.periodic(
      const Duration(milliseconds: 100),
      (_) {
        notifyListeners();
        _checkMaxDuration();
      },
    );
  }

  void _stopDisplayTimer() {
    _displayTimer?.cancel();
    _displayTimer = null;
  }

  void _checkMaxDuration() {
    if (elapsed.inHours >= _maxSessionHours) {
      debugPrint('최대 시간 도달 ($_maxSessionHours시간), 자동 종료');
      stop();
    }
  }

  Future<void> _persistState() async {
    if (_currentBookId == null) return;

    final startTime = _startTime ?? _sessionStartTime ?? DateTime.now();

    await _service.persistTimerState(
      _currentBookId!,
      startTime,
      _isRunning,
      _accumulatedMs,
      bookTitle: _currentBookTitle,
      bookImageUrl: _currentBookImageUrl,
    );
  }

  Future<void> _saveStateOnBackground() async {
    if (!_isRunning && !_isPaused) return;

    _stopDisplayTimer();
    await _persistState();

    debugPrint('백그라운드 진입: 상태 저장 완료 (elapsed=${elapsed.inSeconds}s)');
  }

  Future<void> _restoreStateOnForeground() async {
    if (!_isRunning && !_isPaused) return;

    if (_isRunning) {
      _startDisplayTimer();
      _checkMaxDuration();
    }

    notifyListeners();
    debugPrint(
        '포그라운드 복귀: elapsed=${elapsed.inSeconds}s, title=$_currentBookTitle');
  }

  @override
  void dispose() {
    _displayTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
