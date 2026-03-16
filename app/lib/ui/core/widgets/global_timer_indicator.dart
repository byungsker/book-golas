import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// Global timer indicator that shows in app bar when timer is running
class GlobalTimerIndicator extends StatelessWidget {
  final VoidCallback? onTap;

  const GlobalTimerIndicator({
    super.key,
    this.onTap,
  });

  String _formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Consumer<ReadingTimerViewModel>(
      builder: (context, timerVm, child) {
        if (!timerVm.isRunning && !timerVm.isPaused) {
          return const SizedBox.shrink();
        }

        return GestureDetector(
          onTap: onTap,
          child: Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: timerVm.isRunning
                  ? BLabColors.primary.withValues(alpha: isDark ? 0.3 : 0.15)
                  : Colors.orange.withValues(alpha: isDark ? 0.3 : 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: timerVm.isRunning
                    ? BLabColors.primary.withValues(alpha: 0.5)
                    : Colors.orange.withValues(alpha: 0.5),
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  timerVm.isRunning
                      ? CupertinoIcons.timer_fill
                      : CupertinoIcons.pause_fill,
                  size: 14,
                  color: timerVm.isRunning ? BLabColors.primary : Colors.orange,
                ),
                const SizedBox(width: 6),
                Text(
                  _formatDuration(timerVm.elapsed),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
