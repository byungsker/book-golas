import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/l10n/app_localizations.dart';

enum SearchMode { bookSearch, aiRecordSearch }

void showSearchModeDropdown(
  BuildContext context, {
  required Offset buttonPosition,
  required double buttonSize,
  required void Function(SearchMode mode) onSelected,
}) {
  HapticFeedback.selectionClick();

  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (context) => _SearchModeDropdownOverlay(
      buttonPosition: buttonPosition,
      buttonSize: buttonSize,
      onSelected: (mode) {
        entry.remove();
        onSelected(mode);
      },
      onDismiss: () => entry.remove(),
    ),
  );

  Overlay.of(context).insert(entry);
}

class _SearchModeDropdownOverlay extends StatefulWidget {
  final Offset buttonPosition;
  final double buttonSize;
  final void Function(SearchMode mode) onSelected;
  final VoidCallback onDismiss;

  const _SearchModeDropdownOverlay({
    required this.buttonPosition,
    required this.buttonSize,
    required this.onSelected,
    required this.onDismiss,
  });

  @override
  State<_SearchModeDropdownOverlay> createState() =>
      _SearchModeDropdownOverlayState();
}

class _SearchModeDropdownOverlayState extends State<_SearchModeDropdownOverlay>
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
    final l10n = AppLocalizations.of(context);

    const dropdownWidth = 200.0;
    final dropdownRight = MediaQuery.of(context).size.width -
        widget.buttonPosition.dx -
        widget.buttonSize;
    final dropdownBottom =
        MediaQuery.of(context).size.height - widget.buttonPosition.dy + 8;

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
          right: dropdownRight,
          bottom: dropdownBottom,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Transform.scale(
                scale: _scaleAnimation.value,
                alignment: Alignment.bottomRight,
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
                      children: [
                        _buildItem(
                          icon: CupertinoIcons.search,
                          label: l10n.searchModeBookSearch,
                          isDark: isDark,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            widget.onSelected(SearchMode.bookSearch);
                          },
                        ),
                        Divider(
                          height: 0.5,
                          thickness: 0.5,
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : Colors.black.withValues(alpha: 0.08),
                        ),
                        _buildItem(
                          icon: Icons.auto_awesome,
                          label: l10n.searchModeAiRecordSearch,
                          isDark: isDark,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            widget.onSelected(SearchMode.aiRecordSearch);
                          },
                        ),
                      ],
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
