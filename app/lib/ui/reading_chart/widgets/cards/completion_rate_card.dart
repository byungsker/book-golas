import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// 완독률 카드
///
/// 완독률, 중단률, 재시도 성공률을 표시
class CompletionRateCard extends StatelessWidget {
  final int totalStarted;
  final int completed;
  final int abandoned;
  final int inProgress;
  final double completionRate;
  final double abandonRate;
  final double retrySuccessRate;

  const CompletionRateCard({
    super.key,
    required this.totalStarted,
    required this.completed,
    required this.abandoned,
    required this.inProgress,
    required this.completionRate,
    required this.abandonRate,
    required this.retrySuccessRate,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (totalStarted == 0) {
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
            _buildRateItem(
              context,
              isDark,
              AppLocalizations.of(context).chartCompletionRateLabel,
              completionRate,
              Icons.check_circle_outline,
              BLabColors.primary,
              AppLocalizations.of(context).chartCompletionRateBooks(completed),
            ),
            const SizedBox(height: 16),
            _buildRateItem(
              context,
              isDark,
              AppLocalizations.of(context).chartAbandonRateLabel,
              abandonRate,
              Icons.cancel_outlined,
              Colors.orange,
              AppLocalizations.of(context).chartAbandonRateBooks(abandoned),
            ),
            const SizedBox(height: 16),
            _buildRateItem(
              context,
              isDark,
              AppLocalizations.of(context).chartRetrySuccessRateLabel,
              retrySuccessRate,
              Icons.refresh,
              Colors.green,
              AppLocalizations.of(context).chartRetrySuccessRateBooks,
            ),
            const SizedBox(height: 16),
            _buildSummary(context, isDark),
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
            Icons.analytics_outlined,
            size: 24,
            color: BLabColors.primary,
          ),
        ),
        const SizedBox(width: 12),
        Text(
          AppLocalizations.of(context).chartCompletionRateTitle,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
      ],
    );
  }

  Widget _buildRateItem(
    BuildContext context,
    bool isDark,
    String label,
    double rate,
    IconData icon,
    Color color,
    String subtitle,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.white70 : Colors.black87,
              ),
            ),
            const Spacer(),
            Text(
              '${rate.toStringAsFixed(1)}%',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: rate / 100,
            minHeight: 8,
            backgroundColor: isDark ? Colors.grey[800] : Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.white54 : Colors.black54,
          ),
        ),
      ],
    );
  }

  Widget _buildSummary(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[800]?.withOpacity(0.3) : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildSummaryItem(
            context,
            isDark,
            AppLocalizations.of(context).chartCompletionRateSummaryStarted,
            totalStarted.toString(),
            Icons.play_arrow,
          ),
          _buildSummaryItem(
            context,
            isDark,
            AppLocalizations.of(context).chartCompletionRateSummaryCompleted,
            completed.toString(),
            Icons.check,
          ),
          _buildSummaryItem(
            context,
            isDark,
            AppLocalizations.of(context).chartCompletionRateSummaryInProgress,
            inProgress.toString(),
            Icons.hourglass_empty,
          ),
          _buildSummaryItem(
            context,
            isDark,
            AppLocalizations.of(context).chartCompletionRateSummaryAbandoned,
            abandoned.toString(),
            Icons.close,
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(
    BuildContext context,
    bool isDark,
    String label,
    String value,
    IconData icon,
  ) {
    return Column(
      children: [
        Icon(
          icon,
          size: 16,
          color: isDark ? Colors.white60 : Colors.black54,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isDark ? Colors.white54 : Colors.black54,
          ),
        ),
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
              Icons.menu_book_outlined,
              size: 48,
              color: isDark ? Colors.white30 : Colors.black26,
            ),
            const SizedBox(height: 12),
            Text(
              AppLocalizations.of(context).chartCompletionRateEmptyMessage,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white60 : Colors.black54,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              AppLocalizations.of(context).chartCompletionRateEmptyHint,
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
