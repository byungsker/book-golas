import 'package:flutter/material.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';

class ConfirmationBottomSheet extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String confirmText;
  final String cancelText;
  final Color? confirmColor;
  final bool isDestructive;
  final VoidCallback? onConfirm;
  final VoidCallback? onCancel;

  const ConfirmationBottomSheet({
    super.key,
    required this.title,
    this.subtitle,
    this.confirmText = '확인',
    this.cancelText = '취소',
    this.confirmColor,
    this.isDestructive = false,
    this.onConfirm,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveConfirmColor =
        confirmColor ?? (isDestructive ? Colors.red[400]! : BLabColors.primary);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              color: Colors.grey[400],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 8),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    Navigator.pop(context, false);
                    onCancel?.call();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey[800] : Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        cancelText,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.grey[300] : Colors.grey[700],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    Navigator.pop(context, true);
                    onConfirm?.call();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: effectiveConfirmColor,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        confirmText,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(
            height: MediaQuery.of(context).padding.bottom + 8,
          ),
        ],
      ),
    );
  }
}

Future<bool?> showConfirmationBottomSheet({
  required BuildContext context,
  required String title,
  String? subtitle,
  String confirmText = '확인',
  String cancelText = '취소',
  Color? confirmColor,
  bool isDestructive = false,
  VoidCallback? onConfirm,
  VoidCallback? onCancel,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (bottomSheetContext) => ConfirmationBottomSheet(
      title: title,
      subtitle: subtitle,
      confirmText: confirmText,
      cancelText: cancelText,
      confirmColor: confirmColor,
      isDestructive: isDestructive,
      onConfirm: onConfirm,
      onCancel: onCancel,
    ),
  );
}
