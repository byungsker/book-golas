import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/reading_chart/view_model/reading_chart_view_model.dart';

class ReadingStatsShareCard extends StatelessWidget {
  final ReadingChartViewModel vm;

  static const double cardWidth = 400.0;
  static const double cardHeight = 520.0;

  static const Color _bgColor = Color(0xFF121418);
  static const Color _surfaceColor = Color(0xFF1C1F26);
  static const Color _dividerColor = Color(0xFF2A2D35);
  static const Color _textPrimary = Colors.white;
  static const Color _textSecondary = Color(0xFFB0B4C0);
  static const Color _textTertiary = Color(0xFF6B7280);

  const ReadingStatsShareCard({super.key, required this.vm});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: cardWidth,
      height: cardHeight,
      child: Container(
        decoration: const BoxDecoration(color: _bgColor),
        padding: const EdgeInsets.all(28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 22),
            _buildDivider(),
            const SizedBox(height: 22),
            _buildMainStats(),
            const SizedBox(height: 20),
            _buildGoalBar(),
            const SizedBox(height: 20),
            _buildGenreRow(),
            const Spacer(),
            _buildDivider(),
            const SizedBox(height: 16),
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final year = DateTime.now().year;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$year',
              style: const TextStyle(
                color: BLabColors.primary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              '나의 독서 기록',
              style: TextStyle(
                color: _textPrimary,
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: BLabColors.primary.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(
            child: Text(
              '📚',
              style: TextStyle(fontSize: 22),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(height: 1, color: _dividerColor);
  }

  Widget _buildMainStats() {
    return Row(
      children: [
        Expanded(
          child: _buildMainStatBox(
            icon: '✅',
            value: '${vm.completedBooks}',
            label: '완독한 책',
            color: BLabColors.success,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMainStatBox(
            icon: '💡',
            value: '${vm.totalHighlights + vm.totalNotes}',
            label: '기록',
            color: BLabColors.primary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMainStatBox(
            icon: '📸',
            value: '${vm.totalPhotos}',
            label: '사진',
            color: BLabColors.warningAlt,
          ),
        ),
      ],
    );
  }

  Widget _buildMainStatBox({
    required String icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2), width: 1),
      ),
      child: Column(
        children: [
          Text(icon, style: const TextStyle(fontSize: 20)),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              color: _textTertiary,
              fontSize: 10,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildGoalBar() {
    final goalRate = vm.goalRate.clamp(0.0, 1.0);
    final percent = (goalRate * 100).toStringAsFixed(0);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Text('🎯', style: TextStyle(fontSize: 14)),
                  SizedBox(width: 6),
                  Text(
                    '목표 달성률',
                    style: TextStyle(color: _textSecondary, fontSize: 13),
                  ),
                ],
              ),
              Text(
                '$percent%',
                style: const TextStyle(
                  color: BLabColors.success,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: goalRate,
              backgroundColor: _dividerColor,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(BLabColors.success),
              minHeight: 7,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGenreRow() {
    if (vm.genreDistribution.isEmpty) return const SizedBox.shrink();

    final sorted = vm.genreDistribution.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final topGenres = sorted.take(3).toList();

    return Row(
      children: [
        const Text('🏷️', style: TextStyle(fontSize: 14)),
        const SizedBox(width: 8),
        const Text(
          '많이 읽은 장르',
          style: TextStyle(color: _textSecondary, fontSize: 13),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Row(
            children: topGenres.asMap().entries.map((entry) {
              final color = BLabColors
                  .chartColors[entry.key % BLabColors.chartColors.length];
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: color.withValues(alpha: 0.3), width: 1),
                  ),
                  child: Text(
                    entry.value.key,
                    style: TextStyle(
                      color: color,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(5),
              child: Image.asset(
                'assets/images/logo-bookgolas.png',
                width: 22,
                height: 22,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 7),
            const Text(
              '북골라스',
              style: TextStyle(
                color: _textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        Text(
          DateFormat('yyyy.MM.dd').format(DateTime.now()),
          style: const TextStyle(
            color: _textTertiary,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
