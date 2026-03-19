import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class FloatingContextDropdownItem<T> {
  final IconData icon;
  final String label;
  final T value;

  const FloatingContextDropdownItem({
    required this.icon,
    required this.label,
    required this.value,
  });
}

void showFloatingContextDropdown<T>(
  BuildContext context, {
  required Offset buttonPosition,
  required double buttonWidth,
  required double buttonHeight,
  required List<FloatingContextDropdownItem<T>> items,
  required ValueChanged<T> onSelected,
  Alignment alignment = Alignment.bottomLeft,
}) {
  HapticFeedback.selectionClick();

  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (context) => _FloatingContextDropdownOverlay<T>(
      buttonPosition: buttonPosition,
      buttonWidth: buttonWidth,
      buttonHeight: buttonHeight,
      items: items,
      alignment: alignment,
      onSelected: (value) {
        entry.remove();
        onSelected(value);
      },
      onDismiss: () => entry.remove(),
    ),
  );

  Overlay.of(context).insert(entry);
}

class _FloatingContextDropdownOverlay<T> extends StatefulWidget {
  final Offset buttonPosition;
  final double buttonWidth;
  final double buttonHeight;
  final List<FloatingContextDropdownItem<T>> items;
  final Alignment alignment;
  final ValueChanged<T> onSelected;
  final VoidCallback onDismiss;

  const _FloatingContextDropdownOverlay({
    required this.buttonPosition,
    required this.buttonWidth,
    required this.buttonHeight,
    required this.items,
    required this.alignment,
    required this.onSelected,
    required this.onDismiss,
  });

  @override
  State<_FloatingContextDropdownOverlay<T>> createState() =>
      _FloatingContextDropdownOverlayState<T>();
}

class _FloatingContextDropdownOverlayState<T>
    extends State<_FloatingContextDropdownOverlay<T>>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() {
    _controller.reverse().then((_) => widget.onDismiss());
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const dropdownWidth = 200.0;

    final dropdownBottom =
        MediaQuery.of(context).size.height - widget.buttonPosition.dy + 8;

    final isRightAligned = widget.alignment == Alignment.bottomRight;

    return Stack(
      children: [
        GestureDetector(
          onTap: _dismiss,
          behavior: HitTestBehavior.opaque,
          child: AnimatedBuilder(
            animation: _fadeAnimation,
            builder: (context, _) => Container(
              color:
                  Colors.black.withValues(alpha: _fadeAnimation.value * 0.15),
            ),
          ),
        ),
        Positioned(
          left: isRightAligned ? null : widget.buttonPosition.dx,
          right: isRightAligned
              ? MediaQuery.of(context).size.width -
                  widget.buttonPosition.dx -
                  widget.buttonWidth
              : null,
          bottom: dropdownBottom,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Transform.scale(
                scale: _scaleAnimation.value,
                alignment: isRightAligned
                    ? Alignment.bottomRight
                    : Alignment.bottomLeft,
                child: Opacity(
                  opacity: _fadeAnimation.value,
                  child: child,
                ),
              );
            },
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
                child: Container(
                  width: dropdownWidth,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.14)
                        : Colors.white.withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.15)
                          : Colors.black.withValues(alpha: 0.08),
                      width: 0.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Material(
                    type: MaterialType.transparency,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: _buildItems(isDark),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _buildItems(bool isDark) {
    final widgets = <Widget>[];
    for (var i = 0; i < widget.items.length; i++) {
      final item = widget.items[i];
      widgets.add(
        _buildItem(
          icon: item.icon,
          label: item.label,
          isDark: isDark,
          onTap: () {
            HapticFeedback.selectionClick();
            widget.onSelected(item.value);
          },
        ),
      );
      if (i < widget.items.length - 1) {
        widgets.add(
          Divider(
            height: 0.5,
            thickness: 0.5,
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.black.withValues(alpha: 0.08),
          ),
        );
      }
    }
    return widgets;
  }

  Widget _buildItem({
    required IconData icon,
    required String label,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    final textColor = isDark ? Colors.white : Colors.black;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Icon(icon, size: 18, color: textColor),
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
