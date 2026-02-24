import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:book_golas/data/services/reading_timer_service.dart';
import 'package:book_golas/domain/models/reading_session.dart';

void main() {
  group('ReadingTimerService', () {
    late ReadingTimerService service;

    setUp(() {
      service = ReadingTimerService();
      SharedPreferences.setMockInitialValues({});
    });

    group('Timer State Persistence', () {
      test('persistTimerState saves all fields correctly', () async {
        const bookId = 'test-book-123';
        final startTime = DateTime(2026, 1, 31, 10, 0, 0);
        const isRunning = true;
        const accumulatedMs = 5000;

        await service.persistTimerState(
          bookId,
          startTime,
          isRunning,
          accumulatedMs,
        );

        final state = await service.restoreTimerState();

        expect(state, isNotNull);
        expect(state!['timer_book_id'], bookId);
        expect(state['timer_start_time'], startTime);
        expect(state['timer_is_running'], isRunning);
        expect(state['timer_accumulated_ms'], accumulatedMs);
      });

      test('restoreTimerState returns null when no state exists', () async {
        final state = await service.restoreTimerState();
        expect(state, isNull);
      });

      test('clearTimerState removes all persisted data', () async {
        await service.persistTimerState(
          'test-book',
          DateTime.now(),
          true,
          1000,
        );

        await service.clearTimerState();

        final state = await service.restoreTimerState();
        expect(state, isNull);
      });
    });

    group('ReadingSession Model', () {
      test('ReadingSession.fromJson creates valid instance', () {
        final json = {
          'id': 'session-123',
          'user_id': 'user-456',
          'book_id': 'book-789',
          'started_at': '2026-01-31T10:00:00.000Z',
          'ended_at': '2026-01-31T10:30:00.000Z',
          'duration_seconds': 1800,
          'created_at': '2026-01-31T10:30:00.000Z',
        };

        final session = ReadingSession.fromJson(json);

        expect(session.id, 'session-123');
        expect(session.userId, 'user-456');
        expect(session.bookId, 'book-789');
        expect(session.durationSeconds, 1800);
        expect(session.duration.inMinutes, 30);
      });

      test('ReadingSession.toJson creates valid JSON', () {
        final session = ReadingSession(
          userId: 'user-123',
          bookId: 'book-456',
          startedAt: DateTime(2026, 1, 31, 10, 0, 0),
          endedAt: DateTime(2026, 1, 31, 10, 30, 0),
          durationSeconds: 1800,
        );

        final json = session.toJson();

        expect(json['user_id'], 'user-123');
        expect(json['book_id'], 'book-456');
        expect(json['duration_seconds'], 1800);
        expect(json['started_at'], isNotNull);
        expect(json['ended_at'], isNotNull);
      });

      test('ReadingSession.duration calculates correctly', () {
        final session = ReadingSession(
          userId: 'user-123',
          bookId: 'book-456',
          startedAt: DateTime(2026, 1, 31, 10, 0, 0),
          endedAt: DateTime(2026, 1, 31, 10, 45, 30),
          durationSeconds: 2730,
        );

        expect(session.duration.inMinutes, 45);
        expect(session.duration.inSeconds, 2730);
      });
    });
  });
}
