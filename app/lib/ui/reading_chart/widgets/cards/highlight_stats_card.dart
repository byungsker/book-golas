import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// 하이라이트 통계 카드
///
/// 총 하이라이트/메모/사진 수, 장르별 분포 표시
class HighlightStatsCard extends StatelessWidget {
  final int totalHighlights;
  final int totalNotes;
  final int totalPhotos;
  final Map<String, int> genreDistribution;

  const HighlightStatsCard({
    super.key,
    required this.totalHighlights,
    required this.totalNotes,
    required this.totalPhotos,
    required this.genreDistribution,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final totalContent = totalHighlights + totalNotes + totalPhotos;

    if (totalContent == 0) {
      return _buildEmptyState(context, isDark);
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
            _buildHeader(context, isDark),
            const SizedBox(height: 20),
            _buildTotalStats(context, isDark),
            if (genreDistribution.isNotEmpty) ...[
              const SizedBox(height: 20),
              _buildGenreDistribution(context, isDark),
            ],
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
            color: BLabColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            Icons.highlight_outlined,
            size: 24,
            color: BLabColors.primary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            AppLocalizations.of(context).chartHighlightStatsTitle,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTotalStats(BuildContext context, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatItem(
          context,
          isDark,
          Icons.format_quote,
          totalHighlights.toString(),
          AppLocalizations.of(context).chartHighlightStatsHighlights,
          Colors.amber,
        ),
        _buildStatItem(
          context,
          isDark,
          Icons.edit_note,
          totalNotes.toString(),
          AppLocalizations.of(context).chartHighlightStatsMemos,
          Colors.blue,
        ),
        _buildStatItem(
          context,
          isDark,
          Icons.photo_library_outlined,
          totalPhotos.toString(),
          AppLocalizations.of(context).chartHighlightStatsPhotos,
          Colors.green,
        ),
      ],
    );
  }

  Widget _buildStatItem(
    BuildContext context,
    bool isDark,
    IconData icon,
    String value,
    String label,
    Color color,
  ) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 28, color: color),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.white60 : Colors.black54,
          ),
        ),
      ],
    );
  }

  Widget _buildGenreDistribution(BuildContext context, bool isDark) {
    final sortedGenres = genreDistribution.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final topGenres = sortedGenres.take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          AppLocalizations.of(context).chartHighlightStatsByGenre,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white70 : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        ...topGenres.map((entry) {
          final percentage = totalHighlights > 0 ? (entry.value / totalHighlights * 100).toInt() : 0;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(
                    entry.key == '미분류'
                        ? AppLocalizations.of(context).genreUncategorized
                        : entry.key,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                  ),
                ),
                Expanded(
                  flex: 5,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: percentage / 100,
                      minHeight: 6,
                      backgroundColor:
                          isDark ? Colors.grey[800] : Colors.grey[200],
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        BLabColors.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 50,
                  child: Text(
                    AppLocalizations.of(context).chartHighlightStatsPhotos,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white60 : Colors.black54,
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isDark) {
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
          children: [
            _buildHeader(context, isDark),
            const SizedBox(height: 20),
            Icon(
              Icons.highlight_off_outlined,
              size: 48,
              color: isDark ? Colors.white30 : Colors.black26,
            ),
            const SizedBox(height: 12),
            Text(
              AppLocalizations.of(context).chartHighlightStatsEmptyMessage,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white60 : Colors.black54,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              AppLocalizations.of(context).chartHighlightStatsEmptyHint,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white54 : Colors.black45,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
