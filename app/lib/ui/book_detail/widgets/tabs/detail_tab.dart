import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/sheets/reading_management_sheet.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class DetailTab extends StatelessWidget {
  final Book book;
  final int attemptCount;
  final String attemptEncouragement;
  final Map<String, bool> dailyAchievements;
  final VoidCallback onTargetDateChange;
  final VoidCallback? onPauseReading;
  final VoidCallback? onDelete;
  final VoidCallback? onReviewTap;

  const DetailTab({
    super.key,
    required this.book,
    required this.attemptCount,
    required this.attemptEncouragement,
    required this.dailyAchievements,
    required this.onTargetDateChange,
    this.onPauseReading,
    this.onDelete,
    this.onReviewTap,
  });

  bool get _isReading =>
      book.status == BookStatus.reading.value &&
      book.currentPage < book.totalPages;

  bool get _isCompleted =>
      book.currentPage >= book.totalPages && book.totalPages > 0;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_isCompleted && onReviewTap != null) ...[
            _buildReviewPreviewCard(isDark),
            const SizedBox(height: 16),
          ],
          _buildReadingScheduleCard(context, isDark),
          const SizedBox(height: 16),
          _buildTodayGoalCardWithStamps(context, isDark),
          if (_isReading && (onPauseReading != null || onDelete != null)) ...[
            const SizedBox(height: 16),
            _buildReadingActionsButton(context, isDark),
          ] else if (!_isReading && onDelete != null) ...[
            const SizedBox(height: 16),
            _buildDeleteButton(context, isDark),
          ],
        ],
      ),
    );
  }

  Future<void> _showReadingActionsSheet(BuildContext context) async {
    final result = await showReadingManagementSheet(
      context: context,
      currentPage: book.currentPage,
      totalPages: book.totalPages,
    );

    if (result == null) return;

    switch (result) {
      case ReadingManagementAction.pause:
        onPauseReading?.call();
        break;
      case ReadingManagementAction.delete:
        onDelete?.call();
        break;
      case ReadingManagementAction.cancel:
        break;
    }
  }

  Widget _buildReadingActionsButton(BuildContext context, bool isDark) {
    return GestureDetector(
      onTap: () => _showReadingActionsSheet(context),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: BLabColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                CupertinoIcons.slider_horizontal_3,
                color: BLabColors.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '독서 관리',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '쉬어가기, 삭제 등',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey[500] : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeleteButton(BuildContext context, bool isDark) {
    final l10n = AppLocalizations.of(context);
    return GestureDetector(
      onTap: onDelete,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: BLabColors.errorAlt.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              CupertinoIcons.trash,
              color: BLabColors.errorAlt,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(
              l10n.bookDetailDeleteReading,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: BLabColors.errorAlt,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewPreviewCard(bool isDark) {
    final hasReview = book.longReview != null && book.longReview!.isNotEmpty;

    return GestureDetector(
      onTap: onReviewTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: BLabColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    CupertinoIcons.doc_text_fill,
                    size: 20,
                    color: BLabColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '독후감',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: isDark ? Colors.white : BLabColors.scaffoldDark,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        hasReview ? '작성됨' : '아직 작성되지 않음',
                        style: TextStyle(
                          fontSize: 12,
                          color: hasReview
                              ? BLabColors.success
                              : (isDark ? Colors.grey[500] : Colors.grey[600]),
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  CupertinoIcons.chevron_right,
                  color: isDark ? Colors.grey[600] : Colors.grey[400],
                  size: 16,
                ),
              ],
            ),
            if (hasReview) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.05)
                      : Colors.grey[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  book.longReview!.length > 150
                      ? '${book.longReview!.substring(0, 150)}...'
                      : book.longReview!,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: isDark ? Colors.grey[300] : Colors.grey[700],
                  ),
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ] else ...[
              const SizedBox(height: 12),
              Text(
                '책을 읽고 느낀 점을 기록해보세요',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey[500] : Colors.grey[600],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildReadingScheduleCard(BuildContext context, bool isDark) {
    final l10n = AppLocalizations.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: BLabColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  CupertinoIcons.calendar,
                  size: 20,
                  color: BLabColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                l10n.bookDetailSchedule,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildScheduleRow(
            l10n.bookDetailStartDate,
            book.startDate.toString().substring(0, 10).replaceAll('-', '.'),
            CupertinoIcons.play_circle,
            isDark: isDark,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(
                CupertinoIcons.flag_fill,
                size: 16,
                color: Colors.grey[600],
              ),
              const SizedBox(width: 8),
              Text(
                l10n.bookDetailTargetDate,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Row(
                  children: [
                    Text(
                      book.targetDate
                          .toString()
                          .substring(0, 10)
                          .replaceAll('-', '.'),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    if (attemptCount > 1) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: BLabColors.warning.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '$attemptCount번째 · $attemptEncouragement',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: BLabColors.warning,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              TextButton(
                onPressed: onTargetDateChange,
                style: TextButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text(
                  '변경',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleRow(String label, String value, IconData icon,
      {Widget? trailing, bool isDark = false}) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: isDark ? Colors.grey[400] : Colors.grey[600],
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
        ),
        if (trailing != null) trailing,
      ],
    );
  }

  Widget _buildTodayGoalCardWithStamps(BuildContext context, bool isDark) {
    final totalDays = book.targetDate.difference(book.startDate).inDays + 1;
    final now = DateTime.now();
    final todayIndex = now.difference(book.startDate).inDays;

    int achievedCount = 0;
    int passedDays = 0;
    for (int i = 0; i < totalDays && i <= todayIndex; i++) {
      final date = book.startDate.add(Duration(days: i));
      final dateKey =
          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      if (dailyAchievements[dateKey] == true) achievedCount++;
      passedDays++;
    }
    final achievementRate =
        passedDays > 0 ? (achievedCount / passedDays * 100).round() : 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildGoalHeader(
              context, passedDays, achievedCount, achievementRate, isDark),
          const SizedBox(height: 20),
          _buildStampGrid(totalDays, now, isDark),
          const SizedBox(height: 16),
          _buildLegendRow(context, isDark),
        ],
      ),
    );
  }

  Widget _buildGoalHeader(BuildContext context, int passedDays,
      int achievedCount, int achievementRate, bool isDark) {
    final l10n = AppLocalizations.of(context);
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [BLabColors.success, BLabColors.success],
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            CupertinoIcons.flame_fill,
            size: 20,
            color: Colors.white,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.bookDetailGoalProgress,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : BLabColors.scaffoldDark,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                l10n.bookDetailAchievementStatus(passedDays, achievedCount),
                style: TextStyle(
                  fontSize: 12,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.6)
                      : Colors.grey[500]!,
                ),
              ),
            ],
          ),
        ),
        _buildAchievementBadge(achievementRate),
      ],
    );
  }

  Widget _buildAchievementBadge(int achievementRate) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: achievementRate >= 80
            ? BLabColors.successBg
            : achievementRate >= 50
                ? BLabColors.amber
                : BLabColors.errorBg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            achievementRate >= 80
                ? CupertinoIcons.star_fill
                : achievementRate >= 50
                    ? CupertinoIcons.hand_thumbsup_fill
                    : CupertinoIcons.flame_fill,
            size: 14,
            color: achievementRate >= 80
                ? BLabColors.success
                : achievementRate >= 50
                    ? BLabColors.dangerAlt
                    : BLabColors.danger,
          ),
          const SizedBox(width: 4),
          Text(
            '$achievementRate%',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: achievementRate >= 80
                  ? BLabColors.success
                  : achievementRate >= 50
                      ? BLabColors.dangerAlt
                      : BLabColors.danger,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStampGrid(int totalDays, DateTime now, bool isDark) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const cellSize = 28.0;
        const spacing = 4.0;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: List.generate(totalDays, (index) {
            final date = book.startDate.add(Duration(days: index));
            final dateKey =
                '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
            final isFuture =
                date.isAfter(DateTime(now.year, now.month, now.day));
            final isToday = date.year == now.year &&
                date.month == now.month &&
                date.day == now.day;
            final isAchieved = dailyAchievements[dateKey];

            Color cellColor;
            if (isFuture) {
              cellColor = isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : BLabColors.grey100Light;
            } else if (isAchieved == true) {
              cellColor = BLabColors.success;
            } else if (isAchieved == false) {
              cellColor = BLabColors.errorLight;
            } else {
              cellColor = isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : BLabColors.grey200Light;
            }

            return Tooltip(
              message:
                  '${date.month}/${date.day} (Day ${index + 1})${isAchieved == true ? ' ✓' : isAchieved == false ? ' ✗' : ''}',
              child: Container(
                width: cellSize,
                height: cellSize,
                decoration: BoxDecoration(
                  color: cellColor,
                  borderRadius: BorderRadius.circular(6),
                  border: isToday
                      ? Border.all(
                          color: BLabColors.primary,
                          width: 2,
                        )
                      : null,
                ),
                child: Center(
                  child: isToday
                      ? Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: BLabColors.primary,
                            shape: BoxShape.circle,
                          ),
                        )
                      : null,
                ),
              ),
            );
          }),
        );
      },
    );
  }

  Widget _buildLegendRow(BuildContext context, bool isDark) {
    final l10n = AppLocalizations.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildLegendItem(
            l10n.bookDetailLegendAchieved, BLabColors.success, isDark),
        const SizedBox(width: 16),
        _buildLegendItem(
            l10n.bookDetailLegendMissed, BLabColors.errorLight, isDark),
        const SizedBox(width: 16),
        _buildLegendItem(
            l10n.bookDetailLegendScheduled,
            isDark
                ? Colors.white.withValues(alpha: 0.1)
                : BLabColors.grey100Light,
            isDark),
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
}
