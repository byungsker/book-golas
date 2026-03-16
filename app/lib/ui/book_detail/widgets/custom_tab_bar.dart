import 'package:flutter/material.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class CustomTabBar extends StatelessWidget {
  final TabController tabController;
  final List<String> tabLabels;

  const CustomTabBar({
    super.key,
    required this.tabController,
    this.tabLabels = const ['기록', '히스토리', '상세'],
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border(
          bottom: BorderSide(
            color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
            width: 1,
          ),
        ),
      ),
      child: Stack(
        children: [
          Row(
            children: List.generate(tabLabels.length, (index) {
              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    tabController.animateTo(index);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Text(
                      tabLabels[index],
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: tabController.index == index
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: tabController.index == index
                            ? (isDark ? Colors.white : Colors.black)
                            : (isDark ? Colors.grey[400] : Colors.grey[600]),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final tabWidth = constraints.maxWidth / tabLabels.length;
                final indicatorWidth = tabWidth * 0.5;
                return AnimatedBuilder(
                  animation: tabController.animation!,
                  builder: (context, child) {
                    final animValue = tabController.animation!.value;
                    final centerPosition =
                        tabWidth * animValue + (tabWidth - indicatorWidth) / 2;
                    return Stack(
                      children: [
                        Positioned(
                          left: centerPosition,
                          child: Container(
                            width: indicatorWidth,
                            height: 2,
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white : Colors.black,
                              borderRadius: BorderRadius.circular(1),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
