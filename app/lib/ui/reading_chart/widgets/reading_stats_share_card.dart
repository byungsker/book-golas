import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/reading_chart/view_model/reading_chart_view_model.dart';

class ReadingStatsShareCard extends StatelessWidget {
  final ReadingChartViewModel vm;

  static const double cardWidth = 400.0;
  static const double cardHeight = 560.0;

  static const Color _bgColor = Color(0xFF121418);
  static const Color _surfaceColor = Color(0xFF1C1F26);
  static const Color _dividerColor = Color(0xFF2A2D35);
  static const Color _textPrimary = Colors.white;
  static const Color _textSecondary = Color(0xFFB0B4C0);
  static const Color _textTertiary = Color(0xFF6B7280);

  const ReadingStatsShareCard({super.key, required this.vm});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return SizedBox(
      width: cardWidth,
      height: cardHeight,
      child: Container(
        decoration: const BoxDecoration(color: _bgColor),
        padding: const EdgeInsets.all(28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(l10n),
            const SizedBox(height: 22),
            _buildDivider(),
            const SizedBox(height: 22),
            _buildMainStats(l10n),
            const SizedBox(height: 20),
            _buildGoalBar(l10n),
            const SizedBox(height: 20),
            _buildGenreRow(l10n),
            const Spacer(),
            _buildDivider(),
            const SizedBox(height: 16),
            _buildFooter(l10n),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(AppLocalizations? l10n) {
    final year = DateTime.now().year;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
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
              Text(
                l10n?.shareReadingRecordTitle ?? '나의 독서 기록',
                style: const TextStyle(
                  color: _textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
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

  Widget _buildMainStats(AppLocalizations? l10n) {
    return Row(
      children: [
        Expanded(
          child: _buildMainStatBox(
            icon: '✅',
            value: '${vm.completedBooks}',
            label: l10n?.shareCompletedBooksLabel ?? '완독한 책',
            color: BLabColors.success,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMainStatBox(
            icon: '💡',
            value: '${vm.totalHighlights + vm.totalNotes}',
            label: l10n?.shareRecordsLabel ?? '기록',
            color: BLabColors.primary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMainStatBox(
            icon: '📸',
            value: '${vm.totalPhotos}',
            label: l10n?.sharePhotosLabel ?? '사진',
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

  Widget _buildGoalBar(AppLocalizations? l10n) {
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
              Row(
                children: [
                  const Text('🎯', style: TextStyle(fontSize: 14)),
                  const SizedBox(width: 6),
                  Text(
                    l10n?.shareGoalAchievement ?? '목표 달성률',
                    style: const TextStyle(
                      color: _textSecondary,
                      fontSize: 13,
                    ),
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

  Widget _buildGenreRow(AppLocalizations? l10n) {
    if (vm.genreDistribution.isEmpty) return const SizedBox.shrink();

    final sorted = vm.genreDistribution.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final topGenres = sorted.take(3).toList();

    return Row(
      children: [
        const Text('🏷️', style: TextStyle(fontSize: 14)),
        const SizedBox(width: 8),
        Text(
          l10n?.shareMostReadGenres ?? '많이 읽은 장르',
          style: const TextStyle(color: _textSecondary, fontSize: 13),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            children: topGenres.asMap().entries.map((entry) {
              final color = BLabColors
                  .chartColors[entry.key % BLabColors.chartColors.length];
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: color.withValues(alpha: 0.3),
                    width: 1,
                  ),
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
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildFooter(AppLocalizations? l10n) {
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
            Text(
              l10n?.shareBrandName ?? '북골라스',
              style: const TextStyle(
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
