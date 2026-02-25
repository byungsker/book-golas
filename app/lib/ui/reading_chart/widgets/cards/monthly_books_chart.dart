import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/reading_chart/view_model/reading_chart_view_model.dart';
import 'package:book_golas/utils/number_format_utils.dart';

class MonthlyBooksChart extends StatelessWidget {
  final BookChartFilter filter;
  final Map<int, int> monthlyData;
  final Map<DateTime, int> dailyData;
  final int year;
  final int month;
  final DateTime weekStart;
  final DateTime? customRangeStart;
  final DateTime? customRangeEnd;
  final ValueChanged<BookChartFilter>? onFilterChanged;
  final ValueChanged<int>? onNavigate;
  final VoidCallback? onCustomRangePressed;

  const MonthlyBooksChart({
    super.key,
    required this.filter,
    required this.monthlyData,
    required this.dailyData,
    required this.year,
    required this.month,
    required this.weekStart,
    this.customRangeStart,
    this.customRangeEnd,
    this.onFilterChanged,
    this.onNavigate,
    this.onCustomRangePressed,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : BLabColors.surfaceLight,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context, isDark),
            const SizedBox(height: 12),
            _buildFilterChips(context, isDark),
            const SizedBox(height: 12),
            _buildPeriodNavigator(context, isDark),
            const SizedBox(height: 16),
            _buildStatsRow(context, isDark),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: _buildChart(context, isDark),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: BLabColors.info.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            Icons.bar_chart_rounded,
            size: 24,
            color: BLabColors.info,
          ),
        ),
        const SizedBox(width: 12),
        Text(
          AppLocalizations.of(context).chartBookStatusTitle,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChips(BuildContext context, bool isDark) {
    final l10n = AppLocalizations.of(context);
    final labels = {
      BookChartFilter.annual: l10n.chartBookStatusAnnual,
      BookChartFilter.monthly: l10n.chartBookStatusMonthly,
      BookChartFilter.weekly: l10n.chartBookStatusWeekly,
      BookChartFilter.custom: l10n.chartBookStatusCustom,
    };

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: BookChartFilter.values.map((f) {
          final isSelected = f == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                if (f == BookChartFilter.custom) {
                  onCustomRangePressed?.call();
                } else {
                  onFilterChanged?.call(f);
                }
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected
                      ? BLabColors.primary.withOpacity(0.15)
                      : (isDark
                          ? Colors.grey[800]!.withOpacity(0.5)
                          : Colors.grey[200]!.withOpacity(0.7)),
                  borderRadius: BorderRadius.circular(20),
                  border: isSelected
                      ? Border.all(
                          color: BLabColors.primary.withOpacity(0.4), width: 1)
                      : null,
                ),
                child: Text(
                  labels[f]!,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight:
                        isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected
                        ? BLabColors.primary
                        : (isDark ? Colors.grey[400] : Colors.grey[600]),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPeriodNavigator(BuildContext context, bool isDark) {
    final now = DateTime.now();
    String periodLabel;
    bool canGoForward;

    switch (filter) {
      case BookChartFilter.annual:
        periodLabel = '$year';
        canGoForward = year < now.year;
      case BookChartFilter.monthly:
        periodLabel = '$year.${month.toString().padLeft(2, '0')}';
        canGoForward =
            year < now.year || (year == now.year && month < now.month);
      case BookChartFilter.weekly:
        final weekEnd = weekStart.add(const Duration(days: 6));
        periodLabel =
            '${weekStart.month}/${weekStart.day} ~ ${weekEnd.month}/${weekEnd.day}';
        final currentMonday =
            now.subtract(Duration(days: now.weekday - DateTime.monday));
        canGoForward = weekStart.isBefore(DateTime(
            currentMonday.year, currentMonday.month, currentMonday.day));
      case BookChartFilter.custom:
        if (customRangeStart != null && customRangeEnd != null) {
          periodLabel =
              '${_formatShortDate(customRangeStart!)} ~ ${_formatShortDate(customRangeEnd!)}';
        } else {
          periodLabel = '';
        }
        canGoForward = false;
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (filter != BookChartFilter.custom)
          _buildNavButton(
            icon: Icons.chevron_left_rounded,
            onTap: () => onNavigate?.call(-1),
            isDark: isDark,
          ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            periodLabel,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
        ),
        if (filter != BookChartFilter.custom)
          _buildNavButton(
            icon: Icons.chevron_right_rounded,
            onTap: canGoForward ? () => onNavigate?.call(1) : null,
            isDark: isDark,
          ),
      ],
    );
  }

  Widget _buildNavButton({
    required IconData icon,
    VoidCallback? onTap,
    required bool isDark,
  }) {
    final isDisabled = onTap == null;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 22,
          color: isDisabled
              ? (isDark ? Colors.grey[700] : Colors.grey[300])
              : (isDark ? Colors.grey[400] : Colors.grey[600]),
        ),
      ),
    );
  }

  Widget _buildStatsRow(BuildContext context, bool isDark) {
    final l10n = AppLocalizations.of(context);

    if (filter == BookChartFilter.annual) {
      final now = DateTime.now();
      final currentMonth = now.year == year ? now.month : 12;
      final thisMonth = monthlyData[currentMonth] ?? 0;
      final lastMonth =
          currentMonth > 1 ? (monthlyData[currentMonth - 1] ?? 0) : 0;
      final diff = thisMonth - lastMonth;
      final diffPercent = lastMonth > 0
          ? ((diff / lastMonth) * 100).round()
          : (thisMonth > 0 ? 100 : 0);

      return Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatColumn(
            label: l10n.chartMonthlyBooksThisMonth,
            value: formatBooksCount(thisMonth, context),
            isDark: isDark,
          ),
          _buildStatColumn(
            label: l10n.chartMonthlyBooksLastMonth,
            value: formatBooksCount(lastMonth, context),
            isDark: isDark,
          ),
          _buildStatColumn(
            label: l10n.chartMonthlyBooksChange,
            value: diff >= 0 ? '+$diffPercent%' : '$diffPercent%',
            isDark: isDark,
            valueColor:
                diff > 0 ? Colors.green : (diff < 0 ? Colors.red : null),
          ),
        ],
      );
    }

    final total = dailyData.values.fold<int>(0, (sum, v) => sum + v);
    final days = dailyData.length;
    final maxDay = dailyData.values.isEmpty
        ? 0
        : dailyData.values.reduce((a, b) => a > b ? a : b);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatColumn(
          label: l10n.chartBookStatusTotal,
          value: formatBooksCount(total, context),
          isDark: isDark,
        ),
        _buildStatColumn(
          label: l10n.chartBookStatusDays,
          value: '$days',
          isDark: isDark,
        ),
        _buildStatColumn(
          label: l10n.chartBookStatusMaxDay,
          value: formatBooksCount(maxDay, context),
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _buildChart(BuildContext context, bool isDark) {
    if (filter == BookChartFilter.annual) {
      return _buildAnnualChart(context, isDark);
    }
    return _buildDailyChart(context, isDark);
  }

  Widget _buildAnnualChart(BuildContext context, bool isDark) {
    final now = DateTime.now();
    final currentMonth = now.year == year ? now.month : 12;
    final maxY = monthlyData.values.isEmpty
        ? 5.0
        : (monthlyData.values.reduce((a, b) => a > b ? a : b) + 2).toDouble();

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxY < 1 ? 1 : maxY,
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            tooltipBgColor: isDark ? Colors.grey[800]! : Colors.grey[200]!,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              return BarTooltipItem(
                AppLocalizations.of(context)
                    .chartMonthlyBooksTooltip(groupIndex + 1, rod.toY.toInt()),
                TextStyle(
                  color: isDark ? Colors.white : Colors.black87,
                  fontWeight: FontWeight.bold,
                ),
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                if (value.isNaN || value.isInfinite) {
                  return const SizedBox.shrink();
                }
                final m = value.toInt() + 1;
                final isCurrent = m == currentMonth;
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    '$m',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight:
                          isCurrent ? FontWeight.bold : FontWeight.normal,
                      color: isCurrent
                          ? BLabColors.primary
                          : (isDark ? Colors.grey[500] : Colors.grey[600]),
                    ),
                  ),
                );
              },
              reservedSize: 28,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (value, meta) {
                if (value.isNaN || value.isInfinite || value == 0) {
                  return const SizedBox.shrink();
                }
                return Text(
                  value.toInt().toString(),
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? Colors.grey[500] : Colors.grey[600],
                  ),
                );
              },
            ),
          ),
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxY > 10 ? 5 : (maxY > 5 ? 2 : 1),
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
              strokeWidth: 1,
            );
          },
        ),
        barGroups: List.generate(12, (index) {
          final m = index + 1;
          final count = monthlyData[m] ?? 0;
          final isCurrent = m == currentMonth;
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: count.toDouble(),
                color: isCurrent
                    ? BLabColors.primary
                    : (isDark
                        ? BLabColors.info.withOpacity(0.7)
                        : BLabColors.info),
                width: 16,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(6)),
                backDrawRodData: BackgroundBarChartRodData(
                  show: true,
                  color: isDark ? Colors.grey[850] : Colors.grey[100],
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildDailyChart(BuildContext context, bool isDark) {
    final List<DateTime> dateRange = _getDateRange();
    if (dateRange.isEmpty) {
      return Center(
        child: Text(
          AppLocalizations.of(context).chartNoData,
          style: TextStyle(
            color: isDark ? Colors.grey[500] : Colors.grey[600],
          ),
        ),
      );
    }

    final maxVal = dailyData.values.isEmpty
        ? 0
        : dailyData.values.reduce((a, b) => a > b ? a : b);
    final maxY = (maxVal + 2).toDouble();
    final barWidth =
        dateRange.length <= 7 ? 20.0 : (dateRange.length <= 14 ? 14.0 : 8.0);

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxY < 1 ? 1 : maxY,
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            tooltipBgColor: isDark ? Colors.grey[800]! : Colors.grey[200]!,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              if (groupIndex >= dateRange.length) return null;
              final d = dateRange[groupIndex];
              return BarTooltipItem(
                '${d.month}/${d.day}: ${rod.toY.toInt()}',
                TextStyle(
                  color: isDark ? Colors.white : Colors.black87,
                  fontWeight: FontWeight.bold,
                ),
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                if (value.isNaN || value.isInfinite) {
                  return const SizedBox.shrink();
                }
                final idx = value.toInt();
                if (idx < 0 || idx >= dateRange.length) {
                  return const SizedBox.shrink();
                }
                final d = dateRange[idx];
                final isToday = _isToday(d);
                final showLabel = dateRange.length <= 14 ||
                    idx % (dateRange.length ~/ 7 + 1) == 0 ||
                    idx == dateRange.length - 1;
                if (!showLabel) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    '${d.day}',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                      color: isToday
                          ? BLabColors.primary
                          : (isDark ? Colors.grey[500] : Colors.grey[600]),
                    ),
                  ),
                );
              },
              reservedSize: 28,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (value, meta) {
                if (value.isNaN || value.isInfinite || value == 0) {
                  return const SizedBox.shrink();
                }
                return Text(
                  value.toInt().toString(),
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? Colors.grey[500] : Colors.grey[600],
                  ),
                );
              },
            ),
          ),
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxY > 10 ? 5 : (maxY > 5 ? 2 : 1),
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
              strokeWidth: 1,
            );
          },
        ),
        barGroups: List.generate(dateRange.length, (index) {
          final d = dateRange[index];
          final dateKey = DateTime(d.year, d.month, d.day);
          final count = dailyData[dateKey] ?? 0;
          final isToday = _isToday(d);
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: count.toDouble(),
                color: isToday
                    ? BLabColors.primary
                    : (isDark
                        ? BLabColors.info.withOpacity(0.7)
                        : BLabColors.info),
                width: barWidth,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(6)),
                backDrawRodData: BackgroundBarChartRodData(
                  show: true,
                  color: isDark ? Colors.grey[850] : Colors.grey[100],
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  List<DateTime> _getDateRange() {
    switch (filter) {
      case BookChartFilter.annual:
        return [];
      case BookChartFilter.monthly:
        final daysInMonth = DateTime(year, month + 1, 0).day;
        return List.generate(daysInMonth, (i) => DateTime(year, month, i + 1));
      case BookChartFilter.weekly:
        return List.generate(7, (i) => weekStart.add(Duration(days: i)));
      case BookChartFilter.custom:
        if (customRangeStart == null || customRangeEnd == null) return [];
        final days = customRangeEnd!.difference(customRangeStart!).inDays + 1;
        return List.generate(
            days, (i) => customRangeStart!.add(Duration(days: i)));
    }
  }

  bool _isToday(DateTime d) {
    final now = DateTime.now();
    return d.year == now.year && d.month == now.month && d.day == now.day;
  }

  String _formatShortDate(DateTime date) {
    return '${date.year}.${date.month.toString().padLeft(2, '0')}.${date.day.toString().padLeft(2, '0')}';
  }

  Widget _buildStatColumn({
    required String label,
    required String value,
    required bool isDark,
    Color? valueColor,
  }) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: valueColor ?? (isDark ? Colors.white : Colors.black87),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.grey[500] : Colors.grey[600],
          ),
        ),
      ],
    );
  }
}
