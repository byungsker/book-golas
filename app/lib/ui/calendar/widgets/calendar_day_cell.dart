import 'package:flutter/material.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/domain/models/calendar_reading_data.dart';
import 'package:book_golas/ui/calendar/widgets/calendar_book_thumbnail.dart';

class CalendarDayCell extends StatelessWidget {
  final DateTime day;
  final bool isToday;
  final bool isOutside;
  final DailyReadingData? readingData;
  final VoidCallback? onTap;

  const CalendarDayCell({
    super.key,
    required this.day,
    required this.isToday,
    required this.isOutside,
    this.readingData,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasBooks = readingData != null && readingData!.bookCount > 0;

    return GestureDetector(
      onTap: hasBooks ? onTap : null,
      child: Container(
        width: double.infinity,
        height: double.infinity,
        margin: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: isToday
              ? BLabColors.primary.withValues(alpha: 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (hasBooks) ...[
              CalendarBookThumbnail(
                imageUrl: readingData!.representativeBook?.imageUrl,
                bookCount: readingData!.bookCount,
                isCompletedToday: readingData!.isRepresentativeBookCompleted,
              ),
              const SizedBox(height: 4),
              Text(
                '${day.day}',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                  color: isOutside
                      ? (isDark ? Colors.grey[700] : Colors.grey[400])
                      : (isDark ? Colors.white : Colors.black87),
                ),
              ),
            ] else ...[
              Text(
                '${day.day}',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                  color: isOutside
                      ? (isDark ? Colors.grey[700] : Colors.grey[400])
                      : (isDark ? Colors.white : Colors.black87),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
