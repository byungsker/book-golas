import 'package:flutter/material.dart';

class StickyTabBarDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  final Color backgroundColor;
  final double extent;

  const StickyTabBarDelegate({
    required this.child,
    required this.backgroundColor,
    this.extent = 56,
  });

  @override
  double get minExtent => extent;

  @override
  double get maxExtent => extent;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return SizedBox.expand(
      child: Container(
        color: backgroundColor,
        child: child,
      ),
    );
  }

  @override
  bool shouldRebuild(covariant StickyTabBarDelegate oldDelegate) {
    return child != oldDelegate.child ||
        backgroundColor != oldDelegate.backgroundColor ||
        extent != oldDelegate.extent;
  }
}
