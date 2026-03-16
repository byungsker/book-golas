import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// 스케줄 요약 위젯
/// 목표일수, 하루 목표 페이지를 표시합니다.
class SchedulePreviewWidget extends StatefulWidget {
  final int totalPages;
  final DateTime startDate;
  final DateTime targetDate;
  final int? dailyTargetPages;
  final bool isDark;
  final VoidCallback? onChangeSchedule;

  const SchedulePreviewWidget({
    super.key,
    required this.totalPages,
    required this.startDate,
    required this.targetDate,
    this.dailyTargetPages,
    required this.isDark,
    this.onChangeSchedule,
  });

  @override
  State<SchedulePreviewWidget> createState() => _SchedulePreviewWidgetState();
}

class _SchedulePreviewWidgetState extends State<SchedulePreviewWidget> {
  int get targetDays {
    final days = widget.targetDate.difference(widget.startDate).inDays;
    return days > 0 ? days : 1;
  }

  int get calculatedDailyTarget {
    if (widget.dailyTargetPages != null) return widget.dailyTargetPages!;
    return (widget.totalPages / targetDays).ceil();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: widget.isDark ? BLabColors.surfaceDark : BLabColors.elevatedLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: widget.isDark
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.black.withValues(alpha: 0.05),
        ),
      ),
      child: _buildSummary(),
    );
  }

  Widget _buildSummary() {
    final l10n = AppLocalizations.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          _buildSummaryItem(
            icon: Icons.calendar_today_outlined,
            label: l10n.scheduleTargetDays,
            value: l10n.scheduleTargetDaysValue(targetDays),
          ),
          const SizedBox(width: 24),
          _buildSummaryItemWithAction(
            icon: Icons.auto_stories_outlined,
            label: l10n.scheduleDailyGoal,
            value: '${calculatedDailyTarget}p',
            actionLabel: l10n.commonChange,
            onTap: widget.onChangeSchedule,
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Expanded(
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: BLabColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 18,
              color: BLabColors.primary,
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: widget.isDark ? Colors.white54 : Colors.black45,
                ),
              ),
              Text(
                value,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: widget.isDark ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItemWithAction({
    required IconData icon,
    required String label,
    required String value,
    required String actionLabel,
    VoidCallback? onTap,
  }) {
    return Expanded(
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: BLabColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 18,
              color: BLabColors.primary,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: widget.isDark ? Colors.white54 : Colors.black45,
                  ),
                ),
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        value,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: widget.isDark ? Colors.white : Colors.black87,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (onTap != null) ...[
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: onTap,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: BLabColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            actionLabel,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: BLabColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
