import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/book_image_widget.dart';
import 'package:book_golas/ui/core/widgets/pressable_wrapper.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class BookListCard extends StatelessWidget {
  final Book book;
  final VoidCallback onTap;

  const BookListCard({
    super.key,
    required this.book,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(
        book.targetDate.year, book.targetDate.month, book.targetDate.day);
    final daysLeft = target.difference(today).inDays;
    final pageProgress = book.totalPages > 0
        ? (book.currentPage / book.totalPages).clamp(0.0, 1.0)
        : 0.0;
    final isCompleted =
        book.currentPage >= book.totalPages && book.totalPages > 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: BLabPressableWrapper(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? BLabColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? Colors.black.withValues(alpha: 0.3)
                    : Colors.grey.withValues(alpha: 0.1),
                spreadRadius: 1,
                blurRadius: 3,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _buildBookCover(isDark),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildBookInfo(
                      isDark, daysLeft, pageProgress, isCompleted, l10n),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  color: isDark ? Colors.grey[400] : Colors.grey,
                  size: 16,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBookCover(bool isDark) {
    return Container(
      width: 60,
      height: 80,
      decoration: BoxDecoration(
        border: Border.all(
          color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
        ),
        borderRadius: BorderRadius.circular(4),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: BookImageWidget(
          imageUrl: book.imageUrl,
          iconSize: 30,
        ),
      ),
    );
  }

  Widget _buildBookInfo(bool isDark, int daysLeft, double pageProgress,
      bool isCompleted, AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          book.title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 6),
        _buildDdayAndPages(isDark, daysLeft, isCompleted, l10n),
        const SizedBox(height: 8),
        _buildProgressBar(isDark, pageProgress, isCompleted),
      ],
    );
  }

  Widget _buildDdayAndPages(
      bool isDark, int daysLeft, bool isCompleted, AppLocalizations l10n) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _getDdayBackgroundColor(daysLeft, isCompleted),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            daysLeft >= 0 ? 'D-$daysLeft' : 'D+${daysLeft.abs()}',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: _getDdayTextColor(daysLeft, isCompleted),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${book.currentPage}/${book.totalPages} ${l10n.unitPages}',
          style: TextStyle(
            fontSize: 13,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Color _getDdayBackgroundColor(int daysLeft, bool isCompleted) {
    if (daysLeft < 0) {
      return BLabColors.errorAlt.withValues(alpha: 0.12);
    }
    if (isCompleted) {
      return BLabColors.success.withValues(alpha: 0.12);
    }
    return BLabColors.primary.withValues(alpha: 0.12);
  }

  Color _getDdayTextColor(int daysLeft, bool isCompleted) {
    if (daysLeft < 0) {
      return BLabColors.errorAlt;
    }
    if (isCompleted) {
      return BLabColors.success;
    }
    return BLabColors.primary;
  }

  Widget _buildProgressBar(bool isDark, double pageProgress, bool isCompleted) {
    final progressColor = isCompleted ? BLabColors.success : BLabColors.primary;

    return Row(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pageProgress,
              backgroundColor: isDark ? Colors.grey[700] : Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(progressColor),
              minHeight: 6,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${(pageProgress * 100).toStringAsFixed(0)}%',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: progressColor,
          ),
        ),
      ],
    );
  }
}
