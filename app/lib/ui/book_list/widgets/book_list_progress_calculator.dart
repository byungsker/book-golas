import 'dart:math' as math;

import 'package:book_golas/domain/models/book.dart';

class TodayGoalProgress {
  final int todayStartPage;
  final int dailyTargetPages;
  final double progress;

  const TodayGoalProgress({
    required this.todayStartPage,
    required this.dailyTargetPages,
    required this.progress,
  });

  String get percentLabel => '${(progress * 100).toStringAsFixed(0)}%';
}

TodayGoalProgress calculateTodayGoalProgress({
  required Book book,
  required int todayPagesRead,
  DateTime? today,
}) {
  final safeTodayPagesRead = math.max(0, todayPagesRead);
  final todayStartPage = math.max(0, book.currentPage - safeTodayPagesRead);
  final remainingFromTodayStart = math.max(0, book.totalPages - todayStartPage);
  final normalizedToday = _dateOnly(today ?? DateTime.now());
  final normalizedTarget = _dateOnly(book.targetDate);
  final daysLeft = normalizedTarget.difference(normalizedToday).inDays;
  final readingDaysLeft = daysLeft >= 0 ? daysLeft + 1 : 1;
  final dailyTargetPages = remainingFromTodayStart > 0
      ? (remainingFromTodayStart / readingDaysLeft).ceil()
      : 0;
  final progress = dailyTargetPages > 0
      ? (safeTodayPagesRead / dailyTargetPages).clamp(0.0, 1.0)
      : 1.0;

  return TodayGoalProgress(
    todayStartPage: todayStartPage,
    dailyTargetPages: dailyTargetPages,
    progress: progress,
  );
}

DateTime _dateOnly(DateTime value) =>
    DateTime(value.year, value.month, value.day);
