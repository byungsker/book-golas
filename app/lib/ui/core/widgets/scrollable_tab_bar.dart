import 'package:flutter/material.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';

class ScrollableTabBar extends StatelessWidget {
  final TabController controller;
  final List<String> tabs;
  final ScrollController? scrollController;
  final int selectedIndex;
  final double tabWidth;
  final double height;
  final Color? indicatorColor;
  final Color? selectedTextColor;
  final Color? unselectedTextColor;
  final Color? backgroundColor;
  final ValueChanged<int>? onTabSelected;

  const ScrollableTabBar({
    super.key,
    required this.controller,
    required this.tabs,
    required this.selectedIndex,
    this.scrollController,
    this.tabWidth = 100.0,
    this.height = 50.0,
    this.indicatorColor,
    this.selectedTextColor,
    this.unselectedTextColor,
    this.backgroundColor,
    this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor =
        backgroundColor ?? (isDark ? BLabColors.scaffoldDark : Colors.white);
    final indicator = indicatorColor ?? (isDark ? Colors.white : Colors.black);

    return Container(
      color: bgColor,
      child: SizedBox(
        height: height,
        child: SingleChildScrollView(
          controller: scrollController,
          scrollDirection: Axis.horizontal,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: height - 2,
                child: Row(
                  children: tabs.asMap().entries.map((entry) {
                    return _buildTabItem(
                      context,
                      entry.value,
                      entry.key,
                      isDark,
                    );
                  }).toList(),
                ),
              ),
              AnimatedBuilder(
                animation: controller.animation!,
                builder: (context, child) {
                  final animationValue = controller.animation!.value;
                  return Transform.translate(
                    offset: Offset(tabWidth * animationValue, 0),
                    child: Container(
                      width: tabWidth,
                      height: 2,
                      color: indicator,
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabItem(
    BuildContext context,
    String title,
    int index,
    bool isDark,
  ) {
    final isSelected = selectedIndex == index;
    final selectedColor =
        selectedTextColor ?? (isDark ? Colors.white : Colors.black);
    final unselectedColor =
        unselectedTextColor ?? (isDark ? Colors.grey[400] : Colors.grey[600]);

    return GestureDetector(
      onTap: () {
        controller.animateTo(index);
        onTabSelected?.call(index);
      },
      child: SizedBox(
        width: tabWidth,
        height: height - 2,
        child: Center(
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              color: isSelected ? selectedColor : unselectedColor,
            ),
          ),
        ),
      ),
    );
  }
}
