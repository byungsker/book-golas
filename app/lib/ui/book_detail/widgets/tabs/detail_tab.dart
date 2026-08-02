import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/sheets/reading_management_sheet.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class DetailTab extends StatelessWidget {
  final Book book;
  final int attemptCount;
  final Map<String, bool> dailyAchievements;
  final VoidCallback onTargetDateChange;
  final VoidCallback? onPauseReading;
  final VoidCallback? onDelete;
  final VoidCallback? onReviewTap;

  const DetailTab({
    super.key,
    required this.book,
    required this.attemptCount,
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
            _buildReviewPreviewCard(context, isDark),
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
    final l10n = AppLocalizations.of(context);
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
                    l10n.detailTabManagement,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    l10n.detailTabManagementDesc,
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
    final useStackedLayout = MediaQuery.textScalerOf(context).scale(14) > 20;
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
        child: Flex(
          key: ValueKey(
            useStackedLayout
                ? 'detail-tab-delete-stacked'
                : 'detail-tab-delete-inline',
          ),
          direction: useStackedLayout ? Axis.vertical : Axis.horizontal,
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              CupertinoIcons.trash,
              color: BLabColors.errorAlt,
              size: 18,
            ),
            SizedBox(
              width: useStackedLayout ? 0 : 8,
              height: useStackedLayout ? 8 : 0,
            ),
            if (useStackedLayout)
              Text(
                l10n.detailTabDeleteReading,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: BLabColors.errorAlt,
                ),
              )
            else
              Flexible(
                child: Text(
                  l10n.detailTabDeleteReading,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: BLabColors.errorAlt,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewPreviewCard(BuildContext context, bool isDark) {
    final l10n = AppLocalizations.of(context);
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
                        l10n.detailTabReview,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color:
                              isDark ? Colors.white : BLabColors.scaffoldDark,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        hasReview
                            ? l10n.detailTabReviewWritten
                            : l10n.detailTabReviewNotWritten,
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
                l10n.detailTabReviewDescription,
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
              Expanded(
                child: Text(
                  l10n.detailTabSchedule,
                  key: const ValueKey('detail-tab-schedule-title'),
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildScheduleRow(
            context,
            l10n.detailTabScheduleStartDate,
            book.startDate.toString().substring(0, 10).replaceAll('-', '.'),
            CupertinoIcons.play_circle,
            isDark: isDark,
          ),
          const SizedBox(height: 12),
          _buildTargetScheduleRow(context, l10n, isDark),
        ],
      ),
    );
  }

  Widget _buildTargetScheduleRow(
    BuildContext context,
    AppLocalizations l10n,
    bool isDark,
  ) {
    final targetDate =
        book.targetDate.toString().substring(0, 10).replaceAll('-', '.');
    final attempt = attemptCount > 1
        ? l10n.detailTabAttempt(
            attemptCount,
            l10n.detailTabAttemptEncouragement,
          )
        : null;
    final useStackedLayout = MediaQuery.textScalerOf(context).scale(14) > 20;

    final details = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.detailTabScheduleTargetDate,
          style: TextStyle(
            fontSize: 14,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          targetDate,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        if (attempt != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: BLabColors.warning.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              attempt,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: BLabColors.warning,
              ),
            ),
          ),
        ],
      ],
    );

    final changeButton = TextButton(
      onPressed: onTargetDateChange,
      style: TextButton.styleFrom(
        minimumSize: const Size(44, 44),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Text(
        l10n.detailTabChangeButton,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      ),
    );

    return Row(
      key: ValueKey(
        useStackedLayout
            ? 'detail-tab-target-date-stacked'
            : 'detail-tab-target-date-inline',
      ),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          CupertinoIcons.flag_fill,
          size: 16,
          color: isDark ? Colors.grey[400] : Colors.grey[600],
        ),
        const SizedBox(width: 8),
        Expanded(
          child: useStackedLayout
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    details,
                    const SizedBox(height: 8),
                    changeButton,
                  ],
                )
              : Row(
                  children: [
                    Expanded(child: details),
                    const SizedBox(width: 8),
                    changeButton,
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildScheduleRow(
    BuildContext context,
    String label,
    String value,
    IconData icon, {
    Widget? trailing,
    bool isDark = false,
  }) {
    final useStackedLayout = MediaQuery.textScalerOf(context).scale(14) > 20;
    return Row(
      key: ValueKey(
        useStackedLayout
            ? 'detail-tab-schedule-row-stacked'
            : 'detail-tab-schedule-row-inline',
      ),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 16,
          color: isDark ? Colors.grey[400] : Colors.grey[600],
        ),
        const SizedBox(width: 8),
        Expanded(
          child: useStackedLayout
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                  ],
                )
              : Row(
                  children: [
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
                  ],
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
    final useStackedLayout = MediaQuery.textScalerOf(context).scale(14) > 20;
    final title = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.detailTabGoalAchievement,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : BLabColors.scaffoldDark,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          l10n.detailTabAchievementStats(passedDays, achievedCount),
          style: TextStyle(
            fontSize: 12,
            color: isDark
                ? Colors.white.withValues(alpha: 0.6)
                : Colors.grey[500]!,
          ),
        ),
      ],
    );
    final icon = Container(
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
    );

    if (useStackedLayout) {
      return Column(
        key: const ValueKey('detail-tab-goal-header-stacked'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              icon,
              const SizedBox(width: 12),
              Expanded(child: title),
            ],
          ),
          const SizedBox(height: 12),
          _buildAchievementBadge(achievementRate),
        ],
      );
    }

    return Row(
      key: const ValueKey('detail-tab-goal-header-inline'),
      children: [
        icon,
        const SizedBox(width: 12),
        Expanded(child: title),
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
            final dateOnly = DateTime(date.year, date.month, date.day);
            final isFuture =
                dateOnly.isAfter(DateTime(now.year, now.month, now.day));
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
    final useStackedLayout = MediaQuery.textScalerOf(context).scale(12) > 18;
    final items = [
      _buildLegendItem(
        l10n.detailTabLegendAchieved,
        BLabColors.success,
        isDark,
        expandLabel: useStackedLayout,
      ),
      _buildLegendItem(
        l10n.detailTabLegendMissed,
        BLabColors.errorLight,
        isDark,
        expandLabel: useStackedLayout,
      ),
      _buildLegendItem(
        l10n.detailTabLegendScheduled,
        isDark ? Colors.white.withValues(alpha: 0.1) : BLabColors.grey100Light,
        isDark,
        expandLabel: useStackedLayout,
      ),
    ];

    if (useStackedLayout) {
      return Column(
        key: const ValueKey('detail-tab-legend-stacked'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var index = 0; index < items.length; index++) ...[
            if (index > 0) const SizedBox(height: 8),
            items[index],
          ],
        ],
      );
    }

    return Wrap(
      key: const ValueKey('detail-tab-legend-wrap'),
      alignment: WrapAlignment.center,
      spacing: 16,
      runSpacing: 8,
      children: items,
    );
  }

  Widget _buildLegendItem(
    String label,
    Color color,
    bool isDark, {
    bool expandLabel = false,
  }) {
    final labelText = Text(
      label,
      style: TextStyle(
        fontSize: 12,
        color: isDark ? Colors.grey[400] : Colors.grey[600],
        fontWeight: FontWeight.w500,
      ),
    );
    return Row(
      mainAxisSize: expandLabel ? MainAxisSize.max : MainAxisSize.min,
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
        if (expandLabel) Expanded(child: labelText) else labelText,
      ],
    );
  }
}
