import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/calendar/view_model/calendar_view_model.dart';
import 'package:book_golas/ui/calendar/widgets/calendar_header.dart';
import 'package:book_golas/ui/calendar/widgets/calendar_filter_tabs.dart';
import 'package:book_golas/ui/calendar/widgets/calendar_day_cell.dart';
import 'package:book_golas/ui/calendar/widgets/calendar_day_detail_sheet.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  late DateTime _displayedMonth;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _displayedMonth = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CalendarViewModel>().loadMonthData(DateTime.now());
      setState(() {
        _isInitialized = true;
      });
    });
  }

  void _showDayDetailSheet(DateTime day) {
    final viewModel = context.read<CalendarViewModel>();
    final dayData = viewModel.getDataForDay(day);

    if (dayData == null || dayData.books.isEmpty) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CalendarDayDetailSheet(
        date: day,
        books: dayData.books,
      ),
    );
  }

  void _onMonthChanged(DateTime newMonth) {
    setState(() {
      _displayedMonth = DateTime(newMonth.year, newMonth.month, 1);
    });
    context.read<CalendarViewModel>().changeMonth(newMonth);
  }

  void _onPreviousMonth() {
    final newMonth =
        DateTime(_displayedMonth.year, _displayedMonth.month - 1, 1);
    _onMonthChanged(newMonth);
  }

  void _onNextMonth() {
    final newMonth =
        DateTime(_displayedMonth.year, _displayedMonth.month + 1, 1);
    _onMonthChanged(newMonth);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight,
      body: SafeArea(
        child: Consumer<CalendarViewModel>(
          builder: (context, viewModel, child) {
            if (!_isInitialized) {
              return const Center(
                child: CircularProgressIndicator(),
              );
            }

            return Column(
              children: [
                CalendarHeader(
                  focusedMonth: _displayedMonth,
                  monthlyBookCount: viewModel.monthlyBookCount,
                  onPreviousMonth: _onPreviousMonth,
                  onNextMonth: _onNextMonth,
                  onMonthSelected: _onMonthChanged,
                ),
                CalendarFilterTabs(
                  selectedFilter: viewModel.filter,
                  onFilterChanged: viewModel.setFilter,
                ),
                Expanded(
                  child: Stack(
                    children: [
                      _buildCalendar(viewModel, isDark),
                      if (viewModel.isLoading)
                        Positioned.fill(
                          child: Container(
                            color: (isDark ? Colors.black : Colors.white)
                                .withValues(alpha: 0.5),
                            child: const Center(
                              child: CircularProgressIndicator(),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildCalendar(CalendarViewModel viewModel, bool isDark) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final availableHeight = constraints.maxHeight;
        const daysOfWeekHeight = 40.0;
        const maxRows = 6;
        final calculatedRowHeight =
            ((availableHeight - daysOfWeekHeight) / maxRows).clamp(56.0, 80.0);

        return TableCalendar(
          firstDay: DateTime(2020, 1, 1),
          lastDay: DateTime(2100, 12, 31),
          focusedDay: _displayedMonth.isAfter(DateTime(2100, 12, 31))
              ? DateTime(2100, 12, 31)
              : _displayedMonth.isBefore(DateTime(2020, 1, 1))
                  ? DateTime(2020, 1, 1)
                  : _displayedMonth,
          headerVisible: false,
          daysOfWeekHeight: daysOfWeekHeight,
          rowHeight: calculatedRowHeight,
          startingDayOfWeek: StartingDayOfWeek.sunday,
          calendarFormat: CalendarFormat.month,
          availableGestures: AvailableGestures.horizontalSwipe,
          onPageChanged: (focusedDay) {
            _onMonthChanged(focusedDay);
          },
          daysOfWeekStyle: DaysOfWeekStyle(
            weekdayStyle: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
            weekendStyle: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          calendarBuilders: CalendarBuilders(
            defaultBuilder: (context, day, focusedDay) {
              return _buildDayCell(day, viewModel, isDark, isOutside: false);
            },
            todayBuilder: (context, day, focusedDay) {
              return _buildDayCell(day, viewModel, isDark, isToday: true);
            },
            outsideBuilder: (context, day, focusedDay) {
              return _buildDayCell(day, viewModel, isDark, isOutside: true);
            },
          ),
        );
      },
    );
  }

  Widget _buildDayCell(
    DateTime day,
    CalendarViewModel viewModel,
    bool isDark, {
    bool isToday = false,
    bool isOutside = false,
  }) {
    final dayData = viewModel.getDataForDay(day);

    return CalendarDayCell(
      day: day,
      isToday: isToday,
      isOutside: isOutside,
      readingData: dayData,
      onTap: () => _showDayDetailSheet(day),
    );
  }
}
