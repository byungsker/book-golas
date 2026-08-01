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
  static const _minimumAffordanceWidth = 32.0;
  static const _affordanceFadeWidth = 8.0;

  late ScrollController _scrollController;
  List<double> _tabWidths = const [];
  List<double> _labelWidths = const [];
  bool _canScrollBackward = false;
  bool _canScrollForward = false;
  double _leadingAffordanceWidth = 0;
  double _trailingAffordanceWidth = 0;
  bool _disableAnimations = false;

  @override
  void initState() {
    super.initState();
    _scrollController = widget.scrollController ?? ScrollController();
    _scrollController.addListener(_updateScrollAffordances);
  }

  @override
  void didUpdateWidget(covariant ScrollableTabBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.scrollController != widget.scrollController) {
      _scrollController.removeListener(_updateScrollAffordances);
      if (oldWidget.scrollController == null) {
        _scrollController.dispose();
      }
      _scrollController = widget.scrollController ?? ScrollController();
      _scrollController.addListener(_updateScrollAffordances);
    }
    if (oldWidget.selectedIndex != widget.selectedIndex ||
        oldWidget.tabs != widget.tabs) {
      _scheduleSelectedTabVisibility();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_updateScrollAffordances);
    if (widget.scrollController == null) {
      _scrollController.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    _disableAnimations =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    final textScaler = MediaQuery.textScalerOf(context);
    final textDirection = Directionality.of(context);
    final bgColor = widget.backgroundColor ??
        (isDark ? BLabColors.scaffoldDark : Colors.white);
    final indicator =
        widget.indicatorColor ?? (isDark ? Colors.white : Colors.black);
    final selectedColor =
        widget.selectedTextColor ?? (isDark ? Colors.white : Colors.black);
    final unselectedColor = widget.unselectedTextColor ??
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
    _labelWidths = metrics.map((metric) => metric.width).toList();
    _scheduleSelectedTabVisibility();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _updateScrollAffordances();
      }
    });

    return Container(
      color: bgColor,
      child: SizedBox(
        height: tabBarHeight,
        child: Stack(
          children: [
            SingleChildScrollView(
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
            if (_canScrollBackward && _leadingAffordanceWidth > 0)
              Align(
                alignment: Alignment.centerLeft,
                child: _buildScrollAffordance(
                  key: const ValueKey('scrollable-tab-bar-leading-affordance'),
                  backgroundColor: bgColor,
                  foregroundColor: unselectedColor,
                  isLeading: true,
                  width: _leadingAffordanceWidth,
                ),
              ),
            if (_canScrollForward && _trailingAffordanceWidth > 0)
              Align(
                alignment: Alignment.centerRight,
                child: _buildScrollAffordance(
                  key: const ValueKey('scrollable-tab-bar-trailing-affordance'),
                  backgroundColor: bgColor,
                  foregroundColor: unselectedColor,
                  isLeading: false,
                  width: _trailingAffordanceWidth,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildScrollAffordance({
    required Key key,
    required Color backgroundColor,
    required Color foregroundColor,
    required bool isLeading,
    required double width,
  }) {
    return ExcludeSemantics(
      child: IgnorePointer(
        child: Container(
          key: key,
          width: width,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: isLeading ? Alignment.centerLeft : Alignment.centerRight,
              end: isLeading ? Alignment.centerRight : Alignment.centerLeft,
              colors: [backgroundColor, backgroundColor.withValues(alpha: 0)],
              stops: [
                ((width - _affordanceFadeWidth) / width).clamp(0.0, 1.0),
                1,
              ],
            ),
          ),
          alignment: isLeading ? Alignment.centerLeft : Alignment.centerRight,
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Icon(
            isLeading ? Icons.chevron_left : Icons.chevron_right,
            color: foregroundColor,
            size: 24,
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
      widget.controller.animateTo(
        index,
        duration: _disableAnimations
            ? Duration.zero
            : const Duration(milliseconds: 300),
      );
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
      width: widths[lowerIndex] +
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
    final tabCenter = tabStart + (_tabWidths[index] / 2);
    final currentOffset = _scrollController.offset;
    final targetOffset = (tabCenter - (viewportWidth / 2)).clamp(
      0.0,
      _scrollController.position.maxScrollExtent,
    );
    if ((targetOffset - currentOffset).abs() < 0.5) {
      return;
    }
    if (_disableAnimations) {
      _scrollController.jumpTo(targetOffset);
      return;
    }
    _scrollController.animateTo(
      targetOffset,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  void _updateScrollAffordances() {
    if (!_scrollController.hasClients || !mounted) {
      return;
    }
    final position = _scrollController.position;
    final canScrollBackward = position.pixels > 0.5;
    final canScrollForward = position.pixels < position.maxScrollExtent - 0.5;
    final leadingWidth = canScrollBackward
        ? _partialLabelAffordanceWidth(
            viewportStart: position.pixels,
            viewportEnd: position.pixels + position.viewportDimension,
            isLeading: true,
          )
        : 0.0;
    final trailingWidth = canScrollForward
        ? _partialLabelAffordanceWidth(
            viewportStart: position.pixels,
            viewportEnd: position.pixels + position.viewportDimension,
            isLeading: false,
          )
        : 0.0;
    if (canScrollBackward == _canScrollBackward &&
        canScrollForward == _canScrollForward &&
        (leadingWidth - _leadingAffordanceWidth).abs() < 0.5 &&
        (trailingWidth - _trailingAffordanceWidth).abs() < 0.5) {
      return;
    }
    setState(() {
      _canScrollBackward = canScrollBackward;
      _canScrollForward = canScrollForward;
      _leadingAffordanceWidth = leadingWidth;
      _trailingAffordanceWidth = trailingWidth;
    });
  }

  double _partialLabelAffordanceWidth({
    required double viewportStart,
    required double viewportEnd,
    required bool isLeading,
  }) {
    for (var index = 0; index < _tabWidths.length; index += 1) {
      final tabStart = _offsetForIndex(index, _tabWidths);
      final labelInset = (_tabWidths[index] - _labelWidths[index]) / 2;
      final labelStart = tabStart + labelInset;
      final labelEnd = labelStart + _labelWidths[index];
      if (isLeading &&
          labelStart < viewportStart - 0.5 &&
          labelEnd > viewportStart + 0.5) {
        return math.max(
          _minimumAffordanceWidth,
          (labelEnd - viewportStart) + _affordanceFadeWidth,
        );
      }
      if (!isLeading &&
          labelStart < viewportEnd - 0.5 &&
          labelEnd > viewportEnd + 0.5) {
        return math.max(
          _minimumAffordanceWidth,
          (viewportEnd - labelStart) + _affordanceFadeWidth,
        );
      }
    }
    return 0;
  }
}
