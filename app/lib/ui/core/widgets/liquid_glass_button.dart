import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';
import 'pressable_wrapper.dart';

enum BLabButtonVariant {
  primary,
  secondary,
  destructive,
}

class BLabButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final BLabButtonVariant variant;
  final bool isFullWidth;
  final Widget? child;

  const BLabButton({
    super.key,
    required this.text,
    this.onPressed,
    this.icon,
    this.variant = BLabButtonVariant.primary,
    this.isFullWidth = false,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color backgroundColor;
    Color textColor;

    switch (variant) {
      case BLabButtonVariant.primary:
        backgroundColor = BLabColors.primary;
        textColor = Colors.white;
        break;
      case BLabButtonVariant.destructive:
        backgroundColor = BLabColors.error;
        textColor = Colors.white;
        break;
      case BLabButtonVariant.secondary:
        backgroundColor = isDark
            ? Colors.white.withValues(alpha: 0.12)
            : Colors.black.withValues(alpha: 0.08);
        textColor = isDark ? Colors.white : Colors.black;
        break;
    }

    final content = ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Container(
          width: isFullWidth ? double.infinity : null,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: variant == BLabButtonVariant.secondary
                  ? (isDark
                      ? Colors.white.withValues(alpha: 0.15)
                      : Colors.black.withValues(alpha: 0.08))
                  : Colors.transparent,
              width: 0.5,
            ),
          ),
          child: child ??
              Row(
                mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, color: textColor, size: 20),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    text,
                    style: TextStyle(
                      color: textColor,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
        ),
      ),
    );

    if (onPressed == null) {
      return Opacity(
        opacity: 0.5,
        child: content,
      );
    }

    return BLabPressableWrapper(
      onTap: () {
        HapticFeedback.selectionClick();
        onPressed!();
      },
      child: content,
    );
  }
}
