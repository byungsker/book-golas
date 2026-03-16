import 'package:flutter/widgets.dart';

import 'package:book_golas/data/services/reading_progress_service.dart';
import 'package:book_golas/domain/models/calendar_reading_data.dart';
import 'package:book_golas/l10n/app_localizations.dart';

enum CalendarFilter {
  all,
  reading,
  completed,
}

extension CalendarFilterExtension on CalendarFilter {
  String getLabel(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    switch (this) {
      case CalendarFilter.all:
        return l10n.calendarFilterAll;
      case CalendarFilter.reading:
        return l10n.calendarFilterReading;
      case CalendarFilter.completed:
        return l10n.calendarFilterCompleted;
    }
  }
}

class CalendarViewModel extends ChangeNotifier {
  final ReadingProgressService _progressService;

  CalendarViewModel(this._progressService);

  DateTime _focusedMonth = DateTime.now();
  DateTime? _selectedDay;
  CalendarFilter _filter = CalendarFilter.all;
  Map<DateTime, DailyReadingData> _monthlyData = {};
  bool _isLoading = false;
  String? _errorMessage;

  DateTime get focusedMonth => _focusedMonth;
  DateTime? get selectedDay => _selectedDay;
  CalendarFilter get filter => _filter;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  int get monthlyBookCount {
    final uniqueBookIds = <String>{};
    for (final data in _monthlyData.values) {
      for (final book in data.books) {
        if (_shouldIncludeBook(book)) {
          uniqueBookIds.add(book.bookId);
        }
      }
    }
    return uniqueBookIds.length;
  }

  DailyReadingData? getDataForDay(DateTime day) {
    final normalized = _normalizeDate(day);
    final data = _monthlyData[normalized];
    if (data == null) return null;

    final filteredBooks = data.books.where(_shouldIncludeBook).toList();

    if (filteredBooks.isEmpty) return null;

    return DailyReadingData(
      date: data.date,
      books: filteredBooks,
    );
  }

  bool _shouldIncludeBook(BookReadingInfo book) {
    switch (_filter) {
      case CalendarFilter.all:
        return true;
      case CalendarFilter.reading:
        return !book.isCompleted;
      case CalendarFilter.completed:
        return book.isCompleted;
    }
  }

  Future<void> loadMonthData(DateTime month) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final startOfMonth = DateTime(month.year, month.month, 1);
      final endOfMonth = DateTime(month.year, month.month + 1, 0, 23, 59, 59);

      final rawData = await _progressService.fetchReadingDataForPeriod(
        startDate: startOfMonth,
        endDate: endOfMonth,
      );

      _monthlyData = _processRawData(rawData);
      _focusedMonth = month;
    } catch (e) {
      _errorMessage = '데이터를 불러오는데 실패했습니다';
      debugPrint('캘린더 데이터 로드 실패: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setFilter(CalendarFilter newFilter) {
    if (_filter != newFilter) {
      _filter = newFilter;
      notifyListeners();
    }
  }

  void selectDay(DateTime day) {
    _selectedDay = day;
    notifyListeners();
  }

  void changeMonth(DateTime newMonth) {
    if (_focusedMonth.year != newMonth.year ||
        _focusedMonth.month != newMonth.month) {
      loadMonthData(newMonth);
    }
  }

  void goToPreviousMonth() {
    changeMonth(DateTime(_focusedMonth.year, _focusedMonth.month - 1));
  }

  void goToNextMonth() {
    changeMonth(DateTime(_focusedMonth.year, _focusedMonth.month + 1));
  }

  DateTime _normalizeDate(DateTime date) {
    return DateTime(date.year, date.month, date.day);
  }

  Map<DateTime, DailyReadingData> _processRawData(
    Map<DateTime, List<Map<String, dynamic>>> rawData,
  ) {
    final result = <DateTime, DailyReadingData>{};

    for (final entry in rawData.entries) {
      final date = entry.key;
      final records = entry.value;

      final bookMap = <String, BookReadingInfo>{};

      for (final record in records) {
        final bookId = record['book_id'] as String;
        final bookInfo = BookReadingInfo.fromJson(record, date);

        if (bookMap.containsKey(bookId)) {
          final existing = bookMap[bookId]!;
          bookMap[bookId] = existing.copyWith(
            pagesReadOnThisDay:
                existing.pagesReadOnThisDay + bookInfo.pagesReadOnThisDay,
            completedAt: bookInfo.completedAt ?? existing.completedAt,
            lastUpdatedAt:
                bookInfo.lastUpdatedAt.isAfter(existing.lastUpdatedAt)
                    ? bookInfo.lastUpdatedAt
                    : existing.lastUpdatedAt,
          );
        } else {
          bookMap[bookId] = bookInfo;
        }
      }

      final sortedBooks = bookMap.values.toList()
        ..sort((a, b) => b.lastUpdatedAt.compareTo(a.lastUpdatedAt));

      result[date] = DailyReadingData(
        date: date,
        books: sortedBooks,
      );
    }

    return result;
  }
}
