import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ReadingTimerViewModel', () {
    late ReadingTimerViewModel viewModel;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      viewModel = ReadingTimerViewModel();
    });

    tearDown(() {
      viewModel.dispose();
    });

    group('Timer State', () {
      test('initial state is not running and not paused', () {
        expect(viewModel.isRunning, false);
        expect(viewModel.isPaused, false);
        expect(viewModel.elapsed, Duration.zero);
        expect(viewModel.currentBookId, isNull);
      });

      test('start() sets isRunning to true', () async {
        await viewModel.start('test-book-123');

        expect(viewModel.isRunning, true);
        expect(viewModel.isPaused, false);
        expect(viewModel.currentBookId, 'test-book-123');
      });

      test('pause() sets isPaused to true and isRunning to false', () async {
        await viewModel.start('test-book-123');
        await Future.delayed(const Duration(milliseconds: 100));

        viewModel.pause();

        expect(viewModel.isRunning, false);
        expect(viewModel.isPaused, true);
        expect(viewModel.elapsed.inMilliseconds, greaterThan(0));
      });

      test('resume() sets isRunning to true and isPaused to false', () async {
        await viewModel.start('test-book-123');
        viewModel.pause();

        viewModel.resume();

        expect(viewModel.isRunning, true);
        expect(viewModel.isPaused, false);
      });

      test('reset() clears all state', () async {
        await viewModel.start('test-book-123');
        await Future.delayed(const Duration(milliseconds: 100));

        viewModel.reset();

        expect(viewModel.isRunning, false);
        expect(viewModel.isPaused, false);
        expect(viewModel.elapsed, Duration.zero);
        expect(viewModel.currentBookId, isNull);
      });
    });

    group('Elapsed Time Calculation', () {
      test('elapsed increases while timer is running', () async {
        await viewModel.start('test-book-123');

        await Future.delayed(const Duration(milliseconds: 200));
        final elapsed1 = viewModel.elapsed;

        await Future.delayed(const Duration(milliseconds: 200));
        final elapsed2 = viewModel.elapsed;

        expect(elapsed2, greaterThan(elapsed1));
        expect(elapsed2.inMilliseconds, greaterThanOrEqualTo(400));
      });

      test('elapsed persists when paused', () async {
        await viewModel.start('test-book-123');
        await Future.delayed(const Duration(milliseconds: 200));

        viewModel.pause();
        final elapsedAtPause = viewModel.elapsed;

        await Future.delayed(const Duration(milliseconds: 200));
        final elapsedAfterPause = viewModel.elapsed;

        expect(elapsedAfterPause.inMilliseconds,
            closeTo(elapsedAtPause.inMilliseconds, 50));
      });

      test('elapsed accumulates across pause/resume cycles', () async {
        await viewModel.start('test-book-123');
        await Future.delayed(const Duration(milliseconds: 100));

        viewModel.pause();
        await Future.delayed(const Duration(milliseconds: 100));

        viewModel.resume();
        await Future.delayed(const Duration(milliseconds: 100));

        final totalElapsed = viewModel.elapsed;
        expect(totalElapsed.inMilliseconds, greaterThanOrEqualTo(200));
      });
    });

    group('Edge Cases', () {
      test('start() does nothing if already running', () async {
        await viewModel.start('book-1');
        final bookId1 = viewModel.currentBookId;

        await viewModel.start('book-2');
        final bookId2 = viewModel.currentBookId;

        expect(bookId1, bookId2);
        expect(bookId2, 'book-1');
      });

      test('pause() does nothing if not running', () {
        viewModel.pause();
        expect(viewModel.isPaused, false);
      });

      test('resume() does nothing if not paused', () {
        viewModel.resume();
        expect(viewModel.isRunning, false);
      });
    });
  });
}
