import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/book_image_widget.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class PlannedBookCard extends StatelessWidget {
  final Book book;
  final VoidCallback onTap;

  const PlannedBookCard({
    super.key,
    required this.book,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);

    final daysUntilStart =
        book.plannedStartDate?.difference(DateTime.now()).inDays;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 85,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 6,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: BookImageWidget(imageUrl: book.imageUrl, iconSize: 30),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    book.title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  if (book.plannedStartDate != null)
                    Text(
                      '${l10n.bookListPlannedStartDate(book.plannedStartDate!.toString().substring(0, 10))}${daysUntilStart != null ? " (D${daysUntilStart >= 0 ? '-' : '+'}${daysUntilStart.abs()})" : ""}',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    )
                  else
                    Text(
                      l10n.bookListUndetermined,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.grey[500] : Colors.grey[500],
                      ),
                    ),
                  const SizedBox(height: 4),
                  if (book.priority != null)
                    Row(
                      children: [
                        Icon(
                          Icons.flag_rounded,
                          size: 14,
                          color: _getPriorityColor(book.priority!),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _getPriorityLabel(book.priority!, l10n),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _getPriorityColor(book.priority!),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }

  Color _getPriorityColor(int priority) {
    switch (priority) {
      case 1:
        return BLabColors.error;
      case 2:
        return BLabColors.warning;
      case 3:
        return BLabColors.primary;
      case 4:
        return BLabColors.successAlt;
      default:
        return Colors.grey;
    }
  }

  String _getPriorityLabel(int priority, AppLocalizations l10n) {
    switch (priority) {
      case 1:
        return l10n.priorityUrgent;
      case 2:
        return l10n.priorityHigh;
      case 3:
        return l10n.priorityMedium;
      case 4:
        return l10n.priorityLow;
      default:
        return '';
    }
  }
}
