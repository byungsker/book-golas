import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class CompactReadingSchedule extends StatelessWidget {
  final DateTime startDate;
  final DateTime targetDate;
  final int attemptCount;
  final VoidCallback onEditTap;
  final bool showEditButton;

  const CompactReadingSchedule({
    super.key,
    required this.startDate,
    required this.targetDate,
    required this.attemptCount,
    required this.onEditTap,
    this.showEditButton = true,
  });

  String _formatDate(DateTime date, BuildContext context) {
    final locale = Localizations.localeOf(context);
    if (locale.languageCode == 'en') {
      return DateFormat('MM/dd/yyyy').format(date);
    } else {
      return DateFormat('yyyy.MM.dd').format(date);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final startDateStr = _formatDate(startDate, context);
    final targetDateStr = _formatDate(targetDate, context);
    final totalDays = targetDate.difference(startDate).inDays + 1;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildDateColumn(l10n.bookDetailStartDate, startDateStr, isDark,
              isBold: false),
          const SizedBox(width: 12),
          Icon(
            CupertinoIcons.arrow_right,
            size: 12,
            color: isDark ? Colors.grey[500] : Colors.grey[400],
          ),
          const SizedBox(width: 12),
          _buildDateColumn(l10n.bookDetailTargetDate, targetDateStr, isDark,
              isBold: true),
          const SizedBox(width: 8),
          Text(
            l10n.totalDaysFormat(totalDays),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.grey[500] : Colors.grey[500],
            ),
          ),
          if (attemptCount > 1) ...[
            const SizedBox(width: 8),
            _buildAttemptBadge(l10n),
          ],
          const Spacer(),
          if (showEditButton) _buildEditButton(isDark),
        ],
      ),
    );
  }

  Widget _buildDateColumn(String label, String value, bool isDark,
      {required bool isBold}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w500,
            color: isDark ? Colors.grey[500] : Colors.grey[500],
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isBold ? FontWeight.w600 : FontWeight.w500,
            color: isBold
                ? (isDark ? Colors.white : Colors.black87)
                : (isDark ? Colors.grey[300] : Colors.grey[700]),
          ),
        ),
      ],
    );
  }

  Widget _buildAttemptBadge(AppLocalizations l10n) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: BLabColors.warning.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        l10n.attemptOrdinal(attemptCount),
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: BLabColors.warning,
        ),
      ),
    );
  }

  Widget _buildEditButton(bool isDark) {
    return GestureDetector(
      onTap: onEditTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: BLabColors.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(
          CupertinoIcons.pencil,
          size: 16,
          color: BLabColors.primary,
        ),
      ),
    );
  }
}
