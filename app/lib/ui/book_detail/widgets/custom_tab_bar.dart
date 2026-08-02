import 'package:flutter/material.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/scrollable_tab_bar.dart';

class CustomTabBar extends StatelessWidget {
  final TabController tabController;
  final List<String> tabLabels;

  const CustomTabBar({
    super.key,
    required this.tabController,
    this.tabLabels = const ['기록', '히스토리', '상세'],
  });

  static double extentFor(BuildContext context, List<String> tabLabels) {
    const textStyle = AppTypography.labelLarge;
    var maxTextHeight = 0.0;

    for (final label in tabLabels) {
      final textPainter = TextPainter(
        text: TextSpan(text: label, style: textStyle),
        textAlign: TextAlign.center,
        textDirection: Directionality.of(context),
        textScaler: MediaQuery.textScalerOf(context),
        maxLines: 1,
      )..layout();
      if (textPainter.height > maxTextHeight) {
        maxTextHeight = textPainter.height;
      }
    }

    final contentHeight = maxTextHeight + 26;
    return contentHeight < 56 ? 56 : contentHeight;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final backgroundColor =
        isDark ? BLabColors.surfaceDark : BLabColors.surfaceLight;

    return AnimatedBuilder(
      animation: tabController,
      builder: (context, child) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 20),
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(8),
            border: Border(
              bottom: BorderSide(
                color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
                width: 1,
              ),
            ),
          ),
          child: ScrollableTabBar(
            controller: tabController,
            tabs: tabLabels,
            selectedIndex: tabController.index,
            tabWidth: 44,
            height: extentFor(context, tabLabels),
            backgroundColor: backgroundColor,
            indicatorColor: BLabColors.textPrimary(context),
            selectedTextColor: BLabColors.textPrimary(context),
            unselectedTextColor: BLabColors.textSecondary(context),
          ),
        );
      },
    );
  }
}
