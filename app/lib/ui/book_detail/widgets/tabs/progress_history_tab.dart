import 'dart:collection';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/data/services/reading_timer_service.dart';

enum _ChartMode { cumulativePages, readingTime }

class ProgressHistoryTab extends StatefulWidget {
  final Future<List<Map<String, dynamic>>> progressFuture;
  final int attemptCount;
  final String attemptEncouragement;
  final double progressPercentage;
  final int daysLeft;
  final DateTime startDate;
  final DateTime targetDate;
  final String bookId;

  const ProgressHistoryTab({
    super.key,
    required this.progressFuture,
    required this.attemptCount,
    required this.attemptEncouragement,
    required this.progressPercentage,
    required this.daysLeft,
    required this.startDate,
    required this.targetDate,
    required this.bookId,
  });

  @override
  State<ProgressHistoryTab> createState() => _ProgressHistoryTabState();
}

class _ProgressHistoryTabState extends State<ProgressHistoryTab> {
  _ChartMode _chartMode = _ChartMode.cumulativePages;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return FutureBuilder<List<Map<String, dynamic>>>(
      future: widget.progressFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildSkeleton(isDark);
        }

        final rawData = snapshot.data ?? [];

        if (rawData.isEmpty) {
          return _buildEmptyState(context, isDark);
        }

        final aggregatedData = _aggregateByDate(rawData);
        return _buildContent(aggregatedData, isDark);
      },
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isDark) {
    return SizedBox(
      height: 200,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              CupertinoIcons.chart_bar,
              size: 48,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
            ),
            const SizedBox(height: 12),
            Text(
              AppLocalizations.of(context).noProgressRecords,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(List<Map<String, dynamic>> data, bool isDark) {
    final spots = data.asMap().entries.map((entry) {
      final idx = entry.key;
      final page = entry.value['page'] as int;
      return FlSpot(idx.toDouble(), page.toDouble());
    }).toList();

    final maxPage = data.isNotEmpty
        ? (data.map((e) => e['page'] as int).reduce((a, b) => a > b ? a : b))
              .toDouble()
        : 100.0;

    final dailyPagesSpots = data.asMap().entries.map((entry) {
      final idx = entry.key;
      final dailyPage = entry.value['daily_page'] as int;
      return FlSpot(idx.toDouble(), dailyPage.toDouble());
    }).toList();

    final maxDailyPage = dailyPagesSpots.isNotEmpty
        ? dailyPagesSpots.map((spot) => spot.y).reduce((a, b) => a > b ? a : b)
        : 50.0;

    return Builder(
      builder: (context) => SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildChartCard(
              context,
              data,
              spots,
              maxPage,
              dailyPagesSpots,
              maxDailyPage,
              isDark,
            ),
            const SizedBox(height: 16),
            _buildReadingTimeCard(isDark),
            const SizedBox(height: 16),
            _buildReadingStateAnalysis(isDark, data),
            const SizedBox(height: 16),
            _buildDailyRecords(data, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildChartCard(
    BuildContext context,
    List<Map<String, dynamic>> data,
    List<FlSpot> spots,
    double maxPage,
    List<FlSpot> dailyPagesSpots,
    double maxDailyPage,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildChartHeader(context, data.length, isDark),
          const SizedBox(height: 12),
          _buildChartModeToggle(isDark),
          const SizedBox(height: 12),
          if (_chartMode == _ChartMode.cumulativePages)
            _buildLegendRow(context, isDark)
          else
            _buildReadingTimeLegendRow(isDark),
          const SizedBox(height: 20),
          if (_chartMode == _ChartMode.cumulativePages)
            _buildChart(
              data,
              spots,
              maxPage,
              dailyPagesSpots,
              maxDailyPage,
              isDark,
            )
          else
            _buildReadingTimeChart(data, isDark),
        ],
      ),
    );
  }

  Widget _buildChartHeader(BuildContext context, int recordCount, bool isDark) {
    final l10n = AppLocalizations.of(context);
    final headerTitle = _chartMode == _ChartMode.cumulativePages
        ? l10n.historyTabCumulativePages
        : '독서 시간';
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Text(
              headerTitle,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            if (widget.attemptCount > 1) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: BLabColors.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${widget.attemptCount}번째 · ${widget.attemptEncouragement}',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: BLabColors.warning,
                  ),
                ),
              ),
            ],
          ],
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: BLabColors.primary.withOpacity(0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            l10n.daysRecorded(recordCount),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: BLabColors.primary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLegendRow(BuildContext context, bool isDark) {
    final l10n = AppLocalizations.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildLegendItem(
          l10n.historyTabCumulativePages,
          BLabColors.primary,
          isDark,
        ),
        const SizedBox(width: 24),
        _buildLegendItem(l10n.historyTabDailyPages, BLabColors.success, isDark),
      ],
    );
  }

  Widget _buildLegendItem(String label, Color color, bool isDark) {
    return Row(
      children: [
        Container(
          width: 16,
          height: 3,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildChart(
    List<Map<String, dynamic>> data,
    List<FlSpot> spots,
    double maxPage,
    List<FlSpot> dailyPagesSpots,
    double maxDailyPage,
    bool isDark,
  ) {
    return SizedBox(
      height: 250,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final chartWidth = constraints.maxWidth - 40;
          final barWidth = data.length > 1
              ? (chartWidth / data.length * 0.4).clamp(4.0, 16.0)
              : 16.0;

          final scaledMaxY = (maxPage * 1.1).ceilToDouble();
          final barScaleFactor =
              scaledMaxY / (maxDailyPage > 0 ? maxDailyPage * 1.5 : 1);

          return LineChart(
            LineChartData(
              lineTouchData: LineTouchData(
                touchTooltipData: LineTouchTooltipData(
                  tooltipBgColor: isDark
                      ? BLabColors.elevatedDark
                      : Colors.white,
                  tooltipBorder: BorderSide(
                    color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                    width: 1,
                  ),
                  tooltipRoundedRadius: 8,
                  tooltipPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  getTooltipItems: (touchedSpots) {
                    return touchedSpots.map((touchedSpot) {
                      final idx = touchedSpot.x.toInt();
                      if (idx < 0 || idx >= data.length) return null;

                      final entry = data[idx];
                      final date = entry['created_at'] as DateTime;
                      final cumulativePage = entry['page'] as int;
                      final dailyPage = entry['daily_page'] as int;

                      final isCumulativeLine =
                          touchedSpot.barIndex == dailyPagesSpots.length;

                      if (isCumulativeLine) {
                        return LineTooltipItem(
                          '${date.month}/${date.day}\n',
                          TextStyle(
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                            fontSize: 11,
                          ),
                          children: [
                            TextSpan(
                              text: '누적: $cumulativePage p\n',
                              style: const TextStyle(
                                color: BLabColors.primary,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            TextSpan(
                              text: '일일: +$dailyPage p',
                              style: const TextStyle(
                                color: BLabColors.success,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        );
                      }
                      return null;
                    }).toList();
                  },
                ),
                handleBuiltInTouches: true,
              ),
              lineBarsData: [
                ...dailyPagesSpots.map((spot) {
                  final scaledY = spot.y * barScaleFactor * 0.3;
                  return LineChartBarData(
                    spots: [
                      FlSpot(spot.x, 0),
                      FlSpot(spot.x, scaledY.clamp(0, scaledMaxY * 0.35)),
                    ],
                    isCurved: false,
                    color: BLabColors.success,
                    barWidth: barWidth,
                    dotData: const FlDotData(show: false),
                  );
                }),
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  gradient: const LinearGradient(
                    colors: [BLabColors.primary, BLabColors.primary],
                  ),
                  barWidth: 3,
                  dotData: FlDotData(
                    show: true,
                    getDotPainter: (spot, percent, barData, index) {
                      return FlDotCirclePainter(
                        radius: 4,
                        color: isDark ? BLabColors.surfaceDark : Colors.white,
                        strokeWidth: 2,
                        strokeColor: BLabColors.primary,
                      );
                    },
                  ),
                  belowBarData: BarAreaData(
                    show: true,
                    gradient: LinearGradient(
                      colors: [
                        BLabColors.primary.withValues(alpha: 0.15),
                        BLabColors.primary.withValues(alpha: 0.0),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ],
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 40,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        value.toInt().toString(),
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      );
                    },
                  ),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 30,
                    getTitlesWidget: (value, meta) {
                      final idx = value.round();
                      if (idx < 0 ||
                          idx >= data.length ||
                          (value - idx).abs() > 0.01) {
                        return const SizedBox();
                      }
                      final date = data[idx]['created_at'] as DateTime;
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '${date.month}/${date.day}',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      );
                    },
                    interval: data.length > 5
                        ? ((data.length - 1) / 4).ceilToDouble().clamp(
                            1,
                            data.length.toDouble(),
                          )
                        : 1,
                  ),
                ),
              ),
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                getDrawingHorizontalLine: (value) {
                  return FlLine(
                    color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                    strokeWidth: 1,
                  );
                },
              ),
              borderData: FlBorderData(
                show: true,
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                  ),
                  left: BorderSide(
                    color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                  ),
                ),
              ),
              minX: -0.5,
              maxX: data.length - 0.5,
              minY: 0,
              maxY: scaledMaxY,
            ),
          );
        },
      ),
    );
  }

  Widget _buildChartModeToggle(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[800] : Colors.grey[200],
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () =>
                  setState(() => _chartMode = _ChartMode.cumulativePages),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _chartMode == _ChartMode.cumulativePages
                      ? (isDark ? BLabColors.surfaceDark : Colors.white)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _chartMode == _ChartMode.cumulativePages
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Text(
                    '누적 페이지',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: _chartMode == _ChartMode.cumulativePages
                          ? FontWeight.w600
                          : FontWeight.w500,
                      color: _chartMode == _ChartMode.cumulativePages
                          ? BLabColors.primary
                          : (isDark ? Colors.grey[400] : Colors.grey[600]),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _chartMode = _ChartMode.readingTime),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _chartMode == _ChartMode.readingTime
                      ? (isDark ? BLabColors.surfaceDark : Colors.white)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _chartMode == _ChartMode.readingTime
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Text(
                    '독서 시간',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: _chartMode == _ChartMode.readingTime
                          ? FontWeight.w600
                          : FontWeight.w500,
                      color: _chartMode == _ChartMode.readingTime
                          ? BLabColors.warning
                          : (isDark ? Colors.grey[400] : Colors.grey[600]),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReadingTimeLegendRow(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [_buildLegendItem('독서 시간', BLabColors.warning, isDark)],
    );
  }

  Widget _buildReadingTimeChart(List<Map<String, dynamic>> data, bool isDark) {
    final readingTimeMinutes = data.map((e) {
      final seconds = e['reading_time'] as int? ?? 0;
      return seconds / 60.0;
    }).toList();

    final maxMinutes = readingTimeMinutes.isNotEmpty
        ? readingTimeMinutes.reduce((a, b) => a > b ? a : b)
        : 10.0;
    final scaledMaxY = maxMinutes > 0
        ? (maxMinutes * 1.3).ceilToDouble()
        : 10.0;

    return SizedBox(
      height: 250,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final chartWidth = constraints.maxWidth - 40;
          final barWidth = data.length > 1
              ? (chartWidth / data.length * 0.5).clamp(8.0, 24.0)
              : 24.0;

          return BarChart(
            BarChartData(
              barTouchData: BarTouchData(
                touchTooltipData: BarTouchTooltipData(
                  tooltipBgColor: isDark
                      ? BLabColors.elevatedDark
                      : Colors.white,
                  tooltipBorder: BorderSide(
                    color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                    width: 1,
                  ),
                  tooltipRoundedRadius: 8,
                  tooltipPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  getTooltipItem: (group, groupIndex, rod, rodIndex) {
                    final idx = group.x;
                    if (idx < 0 || idx >= data.length) return null;
                    final entry = data[idx];
                    final date = entry['created_at'] as DateTime;
                    final minutes = readingTimeMinutes[idx];
                    return BarTooltipItem(
                      '${date.month}/${date.day}\n',
                      TextStyle(
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                        fontSize: 11,
                      ),
                      children: [
                        TextSpan(
                          text: _formatMinutesLabel(minutes),
                          style: const TextStyle(
                            color: BLabColors.warning,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              barGroups: data.asMap().entries.map((entry) {
                final idx = entry.key;
                final minutes = readingTimeMinutes[idx];
                return BarChartGroupData(
                  x: idx,
                  barRods: [
                    BarChartRodData(
                      toY: minutes,
                      color: BLabColors.warning,
                      width: barWidth,
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(4),
                      ),
                    ),
                  ],
                );
              }).toList(),
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 50,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        _formatMinutesLabel(value),
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      );
                    },
                  ),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 30,
                    getTitlesWidget: (value, meta) {
                      final idx = value.round();
                      if (idx < 0 ||
                          idx >= data.length ||
                          (value - idx).abs() > 0.01) {
                        return const SizedBox();
                      }
                      final date = data[idx]['created_at'] as DateTime;
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '${date.month}/${date.day}',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      );
                    },
                    interval: data.length > 5
                        ? ((data.length - 1) / 4).ceilToDouble().clamp(
                            1,
                            data.length.toDouble(),
                          )
                        : 1,
                  ),
                ),
              ),
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                getDrawingHorizontalLine: (value) {
                  return FlLine(
                    color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                    strokeWidth: 1,
                  );
                },
              ),
              borderData: FlBorderData(
                show: true,
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                  ),
                  left: BorderSide(
                    color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                  ),
                ),
              ),
              maxY: scaledMaxY,
            ),
          );
        },
      ),
    );
  }

  String _formatMinutesLabel(double minutes) {
    if (minutes < 1) {
      return '${(minutes * 60).round()}초';
    }
    if (minutes < 60) {
      return '${minutes.round()}분';
    }
    final hours = (minutes / 60).floor();
    final remainingMinutes = (minutes % 60).round();
    if (remainingMinutes == 0) {
      return '$hours시간';
    }
    return '$hours시간 $remainingMinutes분';
  }

  Widget _buildReadingTimeCard(bool isDark) {
    return FutureBuilder<int>(
      future: ReadingTimerService().getTotalReadingTime(widget.bookId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildReadingTimeCardSkeleton(isDark);
        }

        final totalSeconds = snapshot.data ?? 0;
        final hours = totalSeconds ~/ 3600;
        final minutes = (totalSeconds % 3600) ~/ 60;
        final seconds = totalSeconds % 60;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? BLabColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '⏱️ 독서 시간 통계',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildStatItem(
                      '총 독서 시간',
                      '$hours시간 $minutes분 $seconds초',
                      BLabColors.primary,
                      isDark,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatItem(
                      '총 세션',
                      '${(totalSeconds / 60).toStringAsFixed(0)}분',
                      BLabColors.success,
                      isDark,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildReadingTimeCardSkeleton(bool isDark) {
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
      highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 120,
              height: 20,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 60,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 60,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReadingStateAnalysis(
    bool isDark,
    List<Map<String, dynamic>> progressData,
  ) {
    final analysisResult = _analyzeReadingState(progressData);
    final emoji = analysisResult['emoji'] as String;
    final title = analysisResult['title'] as String;
    final message = analysisResult['message'] as String;
    final color = analysisResult['color'] as Color;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                    if (widget.attemptCount > 1) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: BLabColors.warning.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${widget.attemptCount}번째 · ${widget.attemptEncouragement}',
                          style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: BLabColors.warning,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.grey[300] : Colors.grey[700],
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Map<String, dynamic> _analyzeReadingState(
    List<Map<String, dynamic>> progressData,
  ) {
    final totalDays = widget.targetDate.difference(widget.startDate).inDays + 1;
    final elapsedDays = DateTime.now().difference(widget.startDate).inDays;

    final expectedProgress = elapsedDays > 0
        ? (elapsedDays / totalDays * 100).clamp(0, 100)
        : 0.0;
    final progressDiff = widget.progressPercentage - expectedProgress;

    if (widget.progressPercentage >= 100) {
      if (widget.attemptCount > 1) {
        return {
          'emoji': '🏆',
          'title': '드디어 완독!',
          'message':
              '${widget.attemptCount}번의 도전 끝에 완독에 성공했어요. 포기하지 않은 당신이 멋져요!',
          'color': BLabColors.success,
        };
      }
      return {
        'emoji': '🎉',
        'title': '완독 축하해요!',
        'message': '목표를 달성했어요. 다음 책도 함께 읽어볼까요?',
        'color': BLabColors.success,
      };
    }

    if (widget.daysLeft < 0) {
      if (widget.attemptCount > 1) {
        return {
          'emoji': '💪',
          'title': '이번엔 완주해봐요',
          'message': '${widget.attemptCount}번째 도전이에요. 목표일을 재설정하고 끝까지 읽어볼까요?',
          'color': BLabColors.destructive,
        };
      }
      return {
        'emoji': '⏰',
        'title': '목표일이 지났어요',
        'message': '괜찮아요, 새 목표일을 설정하고 다시 시작해봐요!',
        'color': BLabColors.destructive,
      };
    }

    if (progressDiff > 20) {
      return {
        'emoji': '🚀',
        'title': '놀라운 속도예요!',
        'message': '예상보다 훨씬 빠르게 읽고 있어요. 이 페이스면 일찍 완독할 수 있겠어요!',
        'color': BLabColors.primary,
      };
    }

    if (progressDiff > 5) {
      return {
        'emoji': '✨',
        'title': '순조롭게 진행 중!',
        'message': '계획보다 앞서가고 있어요. 이대로만 하면 목표 달성 확실해요!',
        'color': BLabColors.success,
      };
    }

    if (progressDiff > -5) {
      return {
        'emoji': '📖',
        'title': '계획대로 진행 중',
        'message': '꾸준히 읽고 있어요. 오늘도 조금씩 읽어볼까요?',
        'color': BLabColors.primary,
      };
    }

    if (progressDiff > -15) {
      if (widget.attemptCount > 1) {
        return {
          'emoji': '🔥',
          'title': '조금 더 속도를 내볼까요?',
          'message': '이번에는 꼭 완독해봐요. 매일 조금씩 더 읽으면 따라잡을 수 있어요!',
          'color': BLabColors.warning,
        };
      }
      return {
        'emoji': '📚',
        'title': '조금 더 읽어볼까요?',
        'message': '계획보다 살짝 뒤처졌어요. 오늘 조금 더 읽으면 따라잡을 수 있어요!',
        'color': BLabColors.warning,
      };
    }

    if (widget.attemptCount > 1) {
      return {
        'emoji': '💫',
        'title': '포기하지 마세요!',
        'message': '${widget.attemptCount}번째 도전 중이에요. 목표일을 조정하거나 더 집중해서 읽어봐요!',
        'color': BLabColors.destructive,
      };
    }
    return {
      'emoji': '📅',
      'title': '목표 재설정이 필요할 수도',
      'message': '현재 페이스로는 목표 달성이 어려워요. 목표일을 조정해볼까요?',
      'color': BLabColors.destructive,
    };
  }

  Widget _buildDailyRecords(List<Map<String, dynamic>> data, bool isDark) {
    return Builder(
      builder: (context) {
        final l10n = AppLocalizations.of(context);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.historyTabDailyRecords,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 12),
            ...data.reversed.take(5).map((record) {
              final date = record['created_at'] as DateTime;
              final page = record['page'] as int;
              final index = data.indexOf(record);
              final prevPage = index > 0 ? data[index - 1]['page'] as int : 0;
              final pagesRead = page - prevPage;
              final readingTime = record['reading_time'] as int? ?? 0;

              return _buildDailyRecordItem(
                date,
                page,
                pagesRead,
                readingTime,
                isDark,
              );
            }),
          ],
        );
      },
    );
  }

  Widget _buildDailyRecordItem(
    DateTime date,
    int page,
    int pagesRead,
    int readingTime,
    bool isDark,
  ) {
    return Builder(
      builder: (context) {
        final l10n = AppLocalizations.of(context);
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? BLabColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: BLabColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    '${date.day}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: BLabColors.primary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.historyDateTimeFormat(
                        date.year,
                        date.month,
                        date.day,
                        date.hour,
                        date.minute,
                      ),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      l10n.historyTabCumulativeLabel(page),
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '+$pagesRead',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: BLabColors.success,
                        ),
                      ),
                      Text(
                        ' ${l10n.historyTabPagesUnit}',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  if (readingTime > 0)
                    Text(
                      _formatDuration(readingTime, l10n),
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatDuration(int seconds, AppLocalizations l10n) {
    if (seconds < 60) {
      return l10n.durationSeconds(seconds);
    }
    final minutes = seconds ~/ 60;
    if (minutes < 60) {
      return l10n.durationMinutes(minutes);
    }
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    if (remainingMinutes == 0) {
      return l10n.durationHours(hours);
    }
    return l10n.durationHoursMinutes(hours, remainingMinutes);
  }

  List<Map<String, dynamic>> _aggregateByDate(List<Map<String, dynamic>> data) {
    if (data.isEmpty) return [];

    final SplayTreeMap<String, Map<String, dynamic>> dateMap = SplayTreeMap();

    for (final entry in data) {
      final createdAt = entry['created_at'] as DateTime;
      final dateKey =
          '${createdAt.year}-${createdAt.month.toString().padLeft(2, '0')}-${createdAt.day.toString().padLeft(2, '0')}';
      final page = entry['page'] as int;
      final readingTime = entry['reading_time'] as int? ?? 0;

      if (!dateMap.containsKey(dateKey)) {
        dateMap[dateKey] = {
          'page': page,
          'created_at': DateTime(
            createdAt.year,
            createdAt.month,
            createdAt.day,
          ),
          'reading_time': readingTime,
        };
      } else {
        final existingPage = dateMap[dateKey]!['page'] as int;
        final existingTime = dateMap[dateKey]!['reading_time'] as int;
        if (existingPage < page) {
          dateMap[dateKey]!['page'] = page;
        }
        dateMap[dateKey]!['reading_time'] = existingTime + readingTime;
      }
    }

    final aggregatedList = dateMap.values.toList();

    int prevPage = 0;
    for (int i = 0; i < aggregatedList.length; i++) {
      final currentPage = aggregatedList[i]['page'] as int;
      aggregatedList[i]['daily_page'] = currentPage - prevPage;
      prevPage = currentPage;
    }

    return aggregatedList;
  }

  Widget _buildSkeleton(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 100),
      child: Shimmer.fromColors(
        baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
        highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? BLabColors.surfaceDark : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 120,
                        height: 20,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      Container(
                        width: 60,
                        height: 24,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 80,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(width: 24),
                      Container(
                        width: 80,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    height: 200,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 100,
                          height: 14,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          height: 12,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              width: 100,
              height: 18,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 12),
            ...List.generate(
              3,
              (index) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 100,
                              height: 13,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              width: 60,
                              height: 11,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 50,
                        height: 24,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
