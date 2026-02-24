import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/utils/number_format_utils.dart';

/// 장르 분석 카드
///
/// 완독한 책의 장르 분포를 Pie Chart로 시각화
class GenreAnalysisCard extends StatefulWidget {
  final Map<String, int> genreDistribution;
  final String topGenreMessage;

  const GenreAnalysisCard({
    super.key,
    required this.genreDistribution,
    required this.topGenreMessage,
  });

  @override
  State<GenreAnalysisCard> createState() => _GenreAnalysisCardState();
}

class _GenreAnalysisCardState extends State<GenreAnalysisCard> {
  int touchedIndex = -1;

  static const List<Color> _chartColors = BLabColors.chartColors;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final total = widget.genreDistribution.values.fold<int>(0, (a, b) => a + b);
    final sortedEntries = widget.genreDistribution.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    if (widget.genreDistribution.isEmpty) {
      return _buildEmptyState(isDark);
    }

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
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: BLabColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.pie_chart_rounded,
                    size: 24,
                    color: BLabColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  AppLocalizations.of(context).chartGenreAnalysisTitle,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    BLabColors.primary.withOpacity(0.1),
                    BLabColors.primary.withOpacity(0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Text(
                    '💡',
                    style: TextStyle(fontSize: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.topGenreMessage,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 180,
              child: Center(
                child: AspectRatio(
                  aspectRatio: 1,
                  child: PieChart(
                    PieChartData(
                      pieTouchData: PieTouchData(
                        touchCallback: (event, pieTouchResponse) {
                          setState(() {
                            if (!event.isInterestedForInteractions ||
                                pieTouchResponse == null ||
                                pieTouchResponse.touchedSection == null) {
                              touchedIndex = -1;
                              return;
                            }
                            touchedIndex = pieTouchResponse
                                .touchedSection!.touchedSectionIndex;
                          });
                        },
                      ),
                      borderData: FlBorderData(show: false),
                      sectionsSpace: 2,
                      centerSpaceRadius: 35,
                      sections: _generateSections(sortedEntries, total),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: Wrap(
                alignment: WrapAlignment.center,
                spacing: 16,
                runSpacing: 8,
                children:
                    sortedEntries.take(5).toList().asMap().entries.map((entry) {
                  final index = entry.key;
                  final genre = entry.value.key;
                  final count = entry.value.value;
                  final percentage = ((count / total) * 100).toStringAsFixed(0);

                  return Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: _chartColors[index % _chartColors.length],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        genre.length > 6 ? '${genre.substring(0, 6)}..' : genre,
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.grey[400] : Colors.grey[700],
                        ),
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '$percentage%',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.black54,
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  label: AppLocalizations.of(context)
                      .chartGenreAnalysisTotalCompleted,
                  value: formatBooksCount(total, context),
                  isDark: isDark,
                ),
                Container(
                  width: 1,
                  height: 30,
                  color: isDark ? Colors.grey[700] : Colors.grey[300],
                ),
                _buildStatItem(
                  label:
                      AppLocalizations.of(context).chartGenreAnalysisDiversity,
                  value: '${widget.genreDistribution.length}개',
                  isDark: isDark,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<PieChartSectionData> _generateSections(
    List<MapEntry<String, int>> sortedEntries,
    int total,
  ) {
    return sortedEntries.asMap().entries.map((entry) {
      final index = entry.key;
      final genre = entry.value.key;
      final count = entry.value.value;
      final isTouched = index == touchedIndex;
      final fontSize = isTouched ? 16.0 : 12.0;
      final radius = isTouched ? 70.0 : 60.0;
      final percentage = ((count / total) * 100).toStringAsFixed(0);

      return PieChartSectionData(
        color: _chartColors[index % _chartColors.length],
        value: count.toDouble(),
        title: isTouched
            ? '$genre\n${formatBooksCount(count, context)}'
            : '$percentage%',
        radius: radius,
        titleStyle: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.bold,
          color: Colors.white,
          shadows: [
            Shadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 2,
            ),
          ],
        ),
        titlePositionPercentageOffset: 0.55,
      );
    }).toList();
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
            fontSize: 20,
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

  Widget _buildEmptyState(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
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
      child: Column(
        children: [
          Icon(
            Icons.pie_chart_outline_rounded,
            size: 48,
            color: isDark ? Colors.grey[600] : Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            AppLocalizations.of(context).chartGenreAnalysisEmptyMessage,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppLocalizations.of(context).chartGenreAnalysisEmptyHint,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[500] : Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }
}
