import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

enum ReadingManagementAction { pause, delete, cancel }

Future<ReadingManagementAction?> showReadingManagementSheet({
  required BuildContext context,
  required int currentPage,
  required int totalPages,
}) async {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  final progress =
      totalPages > 0 ? (currentPage / totalPages * 100).toInt() : 0;

  return showModalBottomSheet<ReadingManagementAction>(
    context: context,
    backgroundColor: isDark ? BLabColors.surfaceDark : Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: BLabColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                CupertinoIcons.book_fill,
                size: 32,
                color: BLabColors.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '독서 관리',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '현재 $progress% 진행 중이에요 ($currentPage / $totalPages 페이지)',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 24),
            _buildActionButton(
              context: sheetContext,
              icon: CupertinoIcons.pause_circle,
              label: '잠시 쉬어가기',
              description: '나중에 다시 읽을 수 있어요',
              color: BLabColors.warning,
              isDark: isDark,
              onTap: () =>
                  Navigator.pop(sheetContext, ReadingManagementAction.pause),
            ),
            const SizedBox(height: 12),
            _buildActionButton(
              context: sheetContext,
              icon: CupertinoIcons.trash,
              label: '삭제하기',
              description: '독서 기록이 삭제됩니다',
              color: BLabColors.errorAlt,
              isDark: isDark,
              onTap: () =>
                  Navigator.pop(sheetContext, ReadingManagementAction.delete),
            ),
            const SizedBox(height: 12),
            _buildCancelButton(
              context: sheetContext,
              isDark: isDark,
            ),
          ],
        ),
      ),
    ),
  );
}

Widget _buildActionButton({
  required BuildContext context,
  required IconData icon,
  required String label,
  required String description,
  required Color color,
  required bool isDark,
  required VoidCallback onTap,
}) {
  return GestureDetector(
    onTap: onTap,
    child: Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              size: 20,
              color: color,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[500] : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          Icon(
            CupertinoIcons.chevron_right,
            size: 16,
            color: color.withValues(alpha: 0.6),
          ),
        ],
      ),
    ),
  );
}

Widget _buildCancelButton({
  required BuildContext context,
  required bool isDark,
}) {
  return GestureDetector(
    onTap: () => Navigator.pop(context, ReadingManagementAction.cancel),
    child: Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.elevatedDark : BLabColors.grey100Light,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          '고민해볼게요',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w500,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
          ),
        ),
      ),
    ),
  );
}
