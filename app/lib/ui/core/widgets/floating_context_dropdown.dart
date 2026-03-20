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

class FloatingContextDropdownController<T> {
  _FloatingContextDropdownOverlayState<T>? _state;

  void _attach(_FloatingContextDropdownOverlayState<T>? state) {
    _state = state;
  }

  void _detach(_FloatingContextDropdownOverlayState<T>? state) {
    if (identical(_state, state)) {
      _state = null;
    }
  }

  void updateDragPosition(Offset globalPosition) {
    _state?._updateDragPosition(globalPosition);
  }

  void completeDragSelection() {
    _state?._completeDragSelection();
  }

  void dismiss() {
    _state?._dismiss();
  }
}

FloatingContextDropdownController<T> showFloatingContextDropdown<T>(
  BuildContext context, {
  required Offset buttonPosition,
  required double buttonWidth,
  required double buttonHeight,
  required List<FloatingContextDropdownItem<T>> items,
  required ValueChanged<T> onSelected,
  Alignment alignment = Alignment.bottomLeft,
  VoidCallback? onDismissed,
}) {
  HapticFeedback.selectionClick();

  final controller = FloatingContextDropdownController<T>();

  late OverlayEntry entry;
  var isRemoved = false;

  void removeEntry() {
    if (isRemoved) return;
    isRemoved = true;
    controller._detach(null);
    if (entry.mounted) {
      entry.remove();
    }
    onDismissed?.call();
  }

  entry = OverlayEntry(
    builder: (context) => _FloatingContextDropdownOverlay<T>(
      buttonPosition: buttonPosition,
      buttonWidth: buttonWidth,
      buttonHeight: buttonHeight,
      items: items,
      alignment: alignment,
      controller: controller,
      onSelected: (value) {
        removeEntry();
        onSelected(value);
      },
      onDismiss: removeEntry,
    ),
  );

  Overlay.of(context).insert(entry);
  return controller;
}

class _FloatingContextDropdownOverlay<T> extends StatefulWidget {
  final Offset buttonPosition;
  final double buttonWidth;
  final double buttonHeight;
  final List<FloatingContextDropdownItem<T>> items;
  final Alignment alignment;
  final FloatingContextDropdownController<T> controller;
  final ValueChanged<T> onSelected;
  final VoidCallback onDismiss;

  const _FloatingContextDropdownOverlay({
    super.key,
    required this.buttonPosition,
    required this.buttonWidth,
    required this.buttonHeight,
    required this.items,
    required this.alignment,
    required this.controller,
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
  late final List<GlobalKey> _itemKeys;
  int? _highlightedIndex;

  @override
  void initState() {
    super.initState();
    widget.controller._attach(this);
    _itemKeys = List.generate(widget.items.length, (_) => GlobalKey());
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
    widget.controller._detach(this);
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() {
    _controller.reverse().then((_) => widget.onDismiss());
  }

  void _updateDragPosition(Offset globalPosition) {
    final nextIndex = _indexForGlobalPosition(globalPosition);
    if (nextIndex != _highlightedIndex) {
      if (nextIndex != null) {
        HapticFeedback.selectionClick();
      }
      setState(() {
        _highlightedIndex = nextIndex;
      });
    }
  }

  void _completeDragSelection() {
    final index = _highlightedIndex;
    if (index == null) {
      _dismiss();
      return;
    }

    HapticFeedback.selectionClick();
    widget.onSelected(widget.items[index].value);
  }

  int? _indexForGlobalPosition(Offset globalPosition) {
    for (var i = 0; i < _itemKeys.length; i++) {
      final itemContext = _itemKeys[i].currentContext;
      if (itemContext == null) continue;
      final renderBox = itemContext.findRenderObject() as RenderBox?;
      if (renderBox == null || !renderBox.hasSize) continue;

      final origin = renderBox.localToGlobal(Offset.zero);
      final rect = origin & renderBox.size;
      if (rect.contains(globalPosition)) {
        return i;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dropdownWidth = widget.buttonWidth;

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
            child: ConstrainedBox(
              constraints: BoxConstraints(minWidth: dropdownWidth),
              child: IntrinsicWidth(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
                    child: Container(
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
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: _buildItems(isDark),
                        ),
                      ),
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
          key: _itemKeys[i],
          icon: item.icon,
          label: item.label,
          isDark: isDark,
          isHighlighted: _highlightedIndex == i,
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
    required GlobalKey key,
    required IconData icon,
    required String label,
    required bool isDark,
    required bool isHighlighted,
    required VoidCallback onTap,
  }) {
    final textColor = isDark ? Colors.white : Colors.black;
    final highlightColor = isDark
        ? Colors.white.withValues(alpha: 0.10)
        : Colors.black.withValues(alpha: 0.06);

    return GestureDetector(
      key: key,
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 100),
        color: isHighlighted ? highlightColor : Colors.transparent,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Icon(icon, size: 18, color: textColor),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: textColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
