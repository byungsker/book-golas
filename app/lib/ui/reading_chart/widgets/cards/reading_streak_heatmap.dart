import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/utils/number_format_utils.dart';

/// 독서 스트릭 히트맵
///
/// GitHub 스타일의 히트맵으로 일별 독서량을 시각화
class ReadingStreakHeatmap extends StatelessWidget {
  final Map<DateTime, int> dailyPages;
  final int year;
  final int currentStreak;

  const ReadingStreakHeatmap({
    super.key,
    required this.dailyPages,
    required this.year,
    required this.currentStreak,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final now = DateTime.now();
    final isCurrentYear = year == now.year;

    final totalDays = dailyPages.values.where((v) => v > 0).length;
    final totalPages = dailyPages.values.fold(0, (a, b) => a + b);

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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: BLabColors.destructive.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.local_fire_department_rounded,
                          size: 24,
                          color: BLabColors.destructive,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Flexible(
                        child: Text(
                          AppLocalizations.of(context)
                              .chartReadingStreakTitle(year),
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isCurrentYear && currentStreak > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: BLabColors.destructive.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          '🔥',
                          style: TextStyle(fontSize: 14),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          AppLocalizations.of(context)
                              .chartReadingStreakDaysRead,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: BLabColors.destructive,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  label:
                      AppLocalizations.of(context).chartReadingStreakDaysRead,
                  value: '$totalDays${AppLocalizations.of(context).unitDay}',
                  isDark: isDark,
                ),
                Container(
                  width: 1,
                  height: 30,
                  color: isDark ? Colors.grey[700] : Colors.grey[300],
                ),
                _buildStatItem(
                  label: AppLocalizations.of(context)
                      .chartReadingStreakTotalPages,
                  value: _formatNumber(context, totalPages),
                  isDark: isDark,
                ),
                Container(
                  width: 1,
                  height: 30,
                  color: isDark ? Colors.grey[700] : Colors.grey[300],
                ),
                _buildStatItem(
                  label: AppLocalizations.of(context)
                      .chartReadingStreakDailyAverage,
                  value: totalDays > 0
                      ? '${(totalPages / totalDays).toStringAsFixed(1)}p'
                      : '0p',
                  isDark: isDark,
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildHeatmapGrid(context, isDark),
            const SizedBox(height: 12),
            _buildLegend(context, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildHeatmapGrid(BuildContext context, bool isDark) {
    final firstDay = DateTime(year, 1, 1);
    final lastDay = DateTime(year, 12, 31);
    final now = DateTime.now();

    final startOffset = firstDay.weekday % 7;
    final totalWeeks =
        ((lastDay.difference(firstDay).inDays + startOffset) / 7).ceil() + 1;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppLocalizations.of(context).weekdaySun,
              AppLocalizations.of(context).weekdayMon,
              AppLocalizations.of(context).weekdayTue,
              AppLocalizations.of(context).weekdayWed,
              AppLocalizations.of(context).weekdayThu,
              AppLocalizations.of(context).weekdayFri,
              AppLocalizations.of(context).weekdaySat,
            ]
                .map(
                  (day) => SizedBox(
                    width: 14,
                    height: 14,
                    child: Text(
                      day,
                      style: TextStyle(
                        fontSize: 8,
                        color: isDark ? Colors.grey[600] : Colors.grey[500],
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 4),
          SizedBox(
            height: 7 * 14.0 + 6 * 2.0,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: List.generate(totalWeeks, (weekIndex) {
                return Padding(
                  padding: const EdgeInsets.only(right: 2),
                  child: Column(
                    children: List.generate(7, (dayIndex) {
                      final daysFromStart =
                          weekIndex * 7 + dayIndex - startOffset;
                      final date = firstDay.add(Duration(days: daysFromStart));

                      if (date.year != year) {
                        return _buildEmptyCell();
                      }

                      if (year == now.year && date.isAfter(now)) {
                        return _buildEmptyCell();
                      }

                      final dateKey = DateTime(date.year, date.month, date.day);
                      final pages = dailyPages[dateKey] ?? 0;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 2),
                        child: Tooltip(
                          message: AppLocalizations.of(context)
                              .chartReadingStreakTooltip(
                                  date.month, date.day, pages),
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: _getColorForPages(pages, isDark),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: _getMonthLabels(context)
                .map(
                  (month) => SizedBox(
                    width: month.isEmpty ? 28 : 42,
                    child: Text(
                      month,
                      style: TextStyle(
                        fontSize: 10,
                        color: isDark ? Colors.grey[500] : Colors.grey[600],
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyCell() {
    return const Padding(
      padding: EdgeInsets.only(bottom: 2),
      child: SizedBox(width: 12, height: 12),
    );
  }

  List<String> _getMonthLabels(BuildContext context) {
    return [
      AppLocalizations.of(context).chartReadingStreakMonthJan,
      '',
      AppLocalizations.of(context).chartReadingStreakMonthMar,
      '',
      AppLocalizations.of(context).chartReadingStreakMonthMay,
      '',
      AppLocalizations.of(context).chartReadingStreakMonthJul,
      '',
      AppLocalizations.of(context).chartReadingStreakMonthSep,
      '',
      AppLocalizations.of(context).chartReadingStreakMonthNov,
      ''
    ];
  }

  Color _getColorForPages(int pages, bool isDark) {
    if (pages == 0) {
      return isDark ? Colors.grey[850]! : Colors.grey[200]!;
    }
    if (pages <= 10) {
      return BLabColors.info.withOpacity(0.3);
    }
    if (pages <= 30) {
      return BLabColors.info.withOpacity(0.5);
    }
    if (pages <= 50) {
      return BLabColors.info.withOpacity(0.7);
    }
    return BLabColors.info;
  }

  Widget _buildLegend(BuildContext context, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          AppLocalizations.of(context).chartReadingStreakLess,
          style: TextStyle(
            fontSize: 10,
            color: isDark ? Colors.grey[500] : Colors.grey[600],
          ),
        ),
        const SizedBox(width: 4),
        _buildLegendBox(_getColorForPages(0, isDark)),
        _buildLegendBox(_getColorForPages(5, isDark)),
        _buildLegendBox(_getColorForPages(20, isDark)),
        _buildLegendBox(_getColorForPages(40, isDark)),
        _buildLegendBox(_getColorForPages(60, isDark)),
        const SizedBox(width: 4),
        Text(
          AppLocalizations.of(context).chartReadingStreakMore,
          style: TextStyle(
            fontSize: 10,
            color: isDark ? Colors.grey[500] : Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildLegendBox(Color color) {
    return Container(
      width: 12,
      height: 12,
      margin: const EdgeInsets.symmetric(horizontal: 2),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  Widget _buildStatItem({
    required String label,
    required String value,
    required bool isDark,
  }) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
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

  String _formatNumber(BuildContext context, int number) {
    return formatCompactNumber(number, Localizations.localeOf(context));
  }
}
