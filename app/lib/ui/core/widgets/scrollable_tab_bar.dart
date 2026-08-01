import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';

class ScrollableTabBar extends StatefulWidget {
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
  State<ScrollableTabBar> createState() => _ScrollableTabBarState();
}

class _ScrollableTabBarState extends State<ScrollableTabBar> {
  late ScrollController _scrollController;
  List<double> _tabWidths = const [];

  @override
  void initState() {
    super.initState();
    _scrollController = widget.scrollController ?? ScrollController();
  }

  @override
  void didUpdateWidget(covariant ScrollableTabBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.scrollController != widget.scrollController) {
      if (oldWidget.scrollController == null) {
        _scrollController.dispose();
      }
      _scrollController = widget.scrollController ?? ScrollController();
    }
    if (oldWidget.selectedIndex != widget.selectedIndex ||
        oldWidget.tabs != widget.tabs) {
      _scheduleSelectedTabVisibility();
    }
  }

  @override
  void dispose() {
    if (widget.scrollController == null) {
      _scrollController.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textScaler = MediaQuery.textScalerOf(context);
    final textDirection = Directionality.of(context);
    final bgColor =
        widget.backgroundColor ??
        (isDark ? BLabColors.scaffoldDark : Colors.white);
    final indicator =
        widget.indicatorColor ?? (isDark ? Colors.white : Colors.black);
    final selectedColor =
        widget.selectedTextColor ?? (isDark ? Colors.white : Colors.black);
    final unselectedColor =
        widget.unselectedTextColor ??
        (isDark ? Colors.grey[400]! : Colors.grey[600]!);
    final selectedStyle = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: selectedColor,
    );
    final unselectedStyle = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: unselectedColor,
    );
    final metrics = widget.tabs.map((title) {
      final painter = TextPainter(
        text: TextSpan(text: title, style: selectedStyle),
        textDirection: textDirection,
        textScaler: textScaler,
        maxLines: 1,
      )..layout();
      return (width: painter.width, height: painter.height);
    }).toList();
    final tabWidths = metrics
        .map((metric) => math.max(widget.tabWidth, metric.width + 32))
        .toList();
    final contentHeight = metrics.fold<double>(
      0,
      (height, metric) => math.max(height, metric.height),
    );
    final tabBarHeight = math.max(widget.height, contentHeight + 24 + 2);
    final totalWidth = tabWidths.fold<double>(0, (sum, width) => sum + width);
    _tabWidths = tabWidths;
    _scheduleSelectedTabVisibility();

    return Container(
      color: bgColor,
      child: SizedBox(
        height: tabBarHeight,
        child: SingleChildScrollView(
          key: const ValueKey('scrollable-tab-bar-scroll-view'),
          controller: _scrollController,
          scrollDirection: Axis.horizontal,
          child: SizedBox(
            width: totalWidth,
            height: tabBarHeight,
            child: Stack(
              children: [
                Row(
                  children: List.generate(widget.tabs.length, (index) {
                    return _buildTabItem(
                      title: widget.tabs[index],
                      index: index,
                      width: tabWidths[index],
                      height: tabBarHeight - 2,
                      style: widget.selectedIndex == index
                          ? selectedStyle
                          : unselectedStyle,
                    );
                  }),
                ),
                AnimatedBuilder(
                  animation: widget.controller.animation!,
                  builder: (context, child) {
                    final geometry = _indicatorGeometry(
                      widget.controller.animation!.value,
                      tabWidths,
                    );
                    return Positioned(
                      left: geometry.left,
                      bottom: 0,
                      width: geometry.width,
                      height: 2,
                      child: ColoredBox(color: indicator),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabItem({
    required String title,
    required int index,
    required double width,
    required double height,
    required TextStyle style,
  }) {
    final isSelected = widget.selectedIndex == index;

    void selectTab() {
      widget.controller.animateTo(index);
      widget.onTabSelected?.call(index);
      _ensureTabVisible(index);
    }

    return Semantics(
      key: ValueKey('scrollable-tab-$index'),
      button: true,
      selected: isSelected,
      label: title,
      onTap: selectTab,
      child: ExcludeSemantics(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: selectTab,
          child: SizedBox(
            width: width,
            height: height,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  title,
                  key: ValueKey('scrollable-tab-label-$index'),
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.visible,
                  textAlign: TextAlign.center,
                  style: style,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  ({double left, double width}) _indicatorGeometry(
    double animationValue,
    List<double> widths,
  ) {
    if (widths.isEmpty) {
      return (left: 0, width: 0);
    }
    final value = animationValue.clamp(0.0, widths.length - 1.0);
    final lowerIndex = value.floor();
    final upperIndex = value.ceil();
    final progress = value - lowerIndex;
    final lowerLeft = _offsetForIndex(lowerIndex, widths);
    final upperLeft = _offsetForIndex(upperIndex, widths);
    return (
      left: lowerLeft + ((upperLeft - lowerLeft) * progress),
      width:
          widths[lowerIndex] +
          ((widths[upperIndex] - widths[lowerIndex]) * progress),
    );
  }

  double _offsetForIndex(int index, List<double> widths) {
    return widths.take(index).fold<double>(0, (sum, width) => sum + width);
  }

  void _scheduleSelectedTabVisibility() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _ensureTabVisible(widget.selectedIndex);
      }
    });
  }

  void _ensureTabVisible(int index) {
    if (!_scrollController.hasClients ||
        index < 0 ||
        index >= _tabWidths.length) {
      return;
    }
    final viewportWidth = _scrollController.position.viewportDimension;
    final tabStart = _offsetForIndex(index, _tabWidths);
    final tabEnd = tabStart + _tabWidths[index];
    final currentOffset = _scrollController.offset;
    var targetOffset = currentOffset;
    if (tabStart < currentOffset) {
      targetOffset = tabStart;
    } else if (tabEnd > currentOffset + viewportWidth) {
      targetOffset = tabEnd - viewportWidth;
    }
    targetOffset = targetOffset.clamp(
      0.0,
      _scrollController.position.maxScrollExtent,
    );
    if ((targetOffset - currentOffset).abs() < 0.5) {
      return;
    }
    _scrollController.animateTo(
      targetOffset,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }
}
