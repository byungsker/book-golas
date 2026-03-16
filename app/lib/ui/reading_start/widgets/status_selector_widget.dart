import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// 독서 상태 선택 위젯 (읽을 예정 / 바로 시작)
class StatusSelectorWidget extends StatelessWidget {
  final BookStatus selectedStatus;
  final ValueChanged<BookStatus> onStatusChanged;
  final bool isDark;

  const StatusSelectorWidget({
    super.key,
    required this.selectedStatus,
    required this.onStatusChanged,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.readingStatusLabel,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white70 : Colors.black54,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: isDark ? BLabColors.subtleDark : BLabColors.elevatedLight,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(4),
          child: Row(
            children: [
              _buildOption(
                label: l10n.readingStatusPlanned,
                status: BookStatus.planned,
                icon: Icons.bookmark_outline,
              ),
              const SizedBox(width: 4),
              _buildOption(
                label: l10n.readingStatusStartNow,
                status: BookStatus.reading,
                icon: Icons.menu_book_outlined,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOption({
    required String label,
    required BookStatus status,
    required IconData icon,
  }) {
    final isSelected = selectedStatus == status;

    return Expanded(
      child: GestureDetector(
        onTap: () => onStatusChanged(status),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? BLabColors.primary : BLabColors.primary)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: BLabColors.primary.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: isSelected
                    ? Colors.white
                    : (isDark ? Colors.white54 : Colors.black45),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  color: isSelected
                      ? Colors.white
                      : (isDark ? Colors.white70 : Colors.black54),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
