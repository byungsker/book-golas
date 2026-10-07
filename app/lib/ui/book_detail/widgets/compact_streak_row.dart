import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class CompactStreakRow extends StatelessWidget {
  final Map<String, bool> dailyAchievements;

  const CompactStreakRow({
    super.key,
    required this.dailyAchievements,
  });

  List<String> _getDayLabels(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return [
      l10n.weekdaySun,
      l10n.weekdayMon,
      l10n.weekdayTue,
      l10n.weekdayWed,
      l10n.weekdayThu,
      l10n.weekdayFri,
      l10n.weekdaySat,
    ];
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dayLabels = _getDayLabels(context);

    final now = DateTime.now();
    final recentDays = <Map<String, dynamic>>[];

    for (int i = 6; i >= 0; i--) {
      final date = now.subtract(Duration(days: i));
      final dateKey =
          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final isAchieved = dailyAchievements[dateKey] == true;
      final isToday = i == 0;
      recentDays.add({
        'achieved': isAchieved,
        'dayLabel': dayLabels[date.weekday % 7],
        'isToday': isToday,
      });
    }

    int streak = 0;
    for (int i = recentDays.length - 1; i >= 0; i--) {
      if (recentDays[i]['achieved'] == true) {
        streak++;
      } else {
        break;
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildDaysRow(context, recentDays, isDark),
          const SizedBox(height: 10),
          _buildStreakInfo(context, streak, isDark),
        ],
      ),
    );
  }

  Widget _buildDaysRow(
    BuildContext context,
    List<Map<String, dynamic>> recentDays,
    bool isDark,
  ) {
    final useWrappedLayout = MediaQuery.textScalerOf(context).scale(11) > 18;
    final dayItems = List.generate(
      7,
      (index) => _buildDayItem(recentDays[index], isDark, index),
    );

    if (useWrappedLayout) {
      return Wrap(
        key: const ValueKey('compact-streak-days-wrapped'),
        alignment: WrapAlignment.center,
        spacing: 12,
        runSpacing: 12,
        children:
            dayItems.map((item) => SizedBox(width: 64, child: item)).toList(),
      );
    }

    return Row(
      children: dayItems.map((item) => Expanded(child: item)).toList(),
    );
  }

  Widget _buildDayItem(
    Map<String, dynamic> dayInfo,
    bool isDark,
    int index,
  ) {
    final isAchieved = dayInfo['achieved'] as bool;
    final dayLabel = dayInfo['dayLabel'] as String;
    final isToday = dayInfo['isToday'] as bool;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          dayLabel,
          key: ValueKey('compact-streak-day-label-$index'),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
            color: isToday
                ? BLabColors.primary
                : (isDark
                    ? BLabColors.textSecondaryDark
                    : BLabColors.textSecondaryLight),
          ),
        ),
        const SizedBox(height: 6),
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: isAchieved
                ? BLabColors.success
                : (isDark
                    ? Colors.white.withValues(alpha: 0.12)
                    : Colors.grey[200]),
            shape: BoxShape.circle,
            border: isToday
                ? Border.all(
                    color: BLabColors.primary,
                    width: 2,
                  )
                : null,
          ),
          child: isAchieved
              ? const Icon(
                  CupertinoIcons.checkmark,
                  size: 12,
                  color: Colors.white,
                )
              : null,
        ),
      ],
    );
  }

  Widget _buildStreakInfo(BuildContext context, int streak, bool isDark) {
    final l10n = AppLocalizations.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          CupertinoIcons.flame_fill,
          size: 16,
          color: streak > 0
              ? BLabColors.warning
              : (isDark ? Colors.grey[500] : Colors.grey[400]),
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            streak > 0
                ? l10n.streakDaysAchieved(streak)
                : l10n.streakFirstRecord,
            key: const ValueKey('compact-streak-message'),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: streak > 0
                  ? (isDark
                      ? BLabColors.textPrimaryDark
                      : BLabColors.textPrimaryLight)
                  : (isDark
                      ? BLabColors.textSecondaryDark
                      : BLabColors.textSecondaryLight),
            ),
          ),
        ),
      ],
    );
  }
}
