import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class PrioritySelectorWidget extends StatelessWidget {
  final int? selectedPriority;
  final ValueChanged<int?> onPriorityChanged;
  final bool isDark;

  const PrioritySelectorWidget({
    super.key,
    required this.selectedPriority,
    required this.onPriorityChanged,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.readingStartPriority,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white70 : Colors.black54,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _buildPriorityButton(1, l10n.priorityUrgent, BLabColors.error),
            const SizedBox(width: 8),
            _buildPriorityButton(2, l10n.priorityHigh, BLabColors.warning),
            const SizedBox(width: 8),
            _buildPriorityButton(3, l10n.priorityMedium, BLabColors.primary),
            const SizedBox(width: 8),
            _buildPriorityButton(4, l10n.priorityLow, BLabColors.successAlt),
          ],
        ),
      ],
    );
  }

  Widget _buildPriorityButton(int priority, String label, Color color) {
    final isSelected = selectedPriority == priority;

    return Expanded(
      child: GestureDetector(
        onTap: () => onPriorityChanged(isSelected ? null : priority),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? color : color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: color.withValues(alpha: isSelected ? 1.0 : 0.3),
              width: 1.5,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              color: isSelected ? Colors.white : color,
            ),
          ),
        ),
      ),
    );
  }
}
