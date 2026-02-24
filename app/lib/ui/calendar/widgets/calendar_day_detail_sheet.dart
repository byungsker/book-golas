import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/domain/models/calendar_reading_data.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/core/widgets/book_image_widget.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';

class CalendarDayDetailSheet extends StatelessWidget {
  final DateTime date;
  final List<BookReadingInfo> books;

  const CalendarDayDetailSheet({
    super.key,
    required this.date,
    required this.books,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenHeight = MediaQuery.of(context).size.height;

    return Container(
      constraints: BoxConstraints(maxHeight: screenHeight * 0.6),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : BLabColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildDragHandle(isDark),
          _buildHeader(isDark),
          const Divider(height: 1),
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.all(16),
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemCount: books.length,
              itemBuilder: (context, index) => _buildBookListItem(
                context,
                books[index],
                isDark,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDragHandle(bool isDark) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      width: 40,
      height: 4,
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[700] : Colors.grey[300],
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    final formattedDate = DateFormat('MMMM d, yyyy').format(date);

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            formattedDate,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          Builder(
            builder: (context) => IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: Icon(
                CupertinoIcons.xmark,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookListItem(
    BuildContext context,
    BookReadingInfo bookInfo,
    bool isDark,
  ) {
    return GestureDetector(
      onTap: () => _navigateToBookDetail(context, bookInfo),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.elevatedDark : BLabColors.scaffoldLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: BookImageWidget(
                imageUrl: bookInfo.imageUrl,
                width: 50,
                height: 70,
                iconSize: 24,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (bookInfo.isCompletedOnThisDay) ...[
                    _buildCompletedBadge(context, isDark),
                    const SizedBox(height: 4),
                  ],
                  Text(
                    bookInfo.title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  if (bookInfo.author != null && bookInfo.author!.isNotEmpty)
                    Text(
                      bookInfo.author!,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  const SizedBox(height: 4),
                  Text(
                    AppLocalizations.of(context)
                        .calendarPagesRead(bookInfo.pagesReadOnThisDay),
                    style: const TextStyle(
                      fontSize: 12,
                      color: BLabColors.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              size: 16,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompletedBadge(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: BLabColors.successAlt.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            CupertinoIcons.checkmark,
            size: 12,
            color: BLabColors.successAlt,
          ),
          const SizedBox(width: 4),
          Text(
            AppLocalizations.of(context).calendarCompleted,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: BLabColors.successAlt,
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToBookDetail(BuildContext context, BookReadingInfo bookInfo) {
    Navigator.of(context).pop();

    final book = Book(
      id: bookInfo.bookId,
      title: bookInfo.title,
      author: bookInfo.author,
      imageUrl: bookInfo.imageUrl,
      startDate: bookInfo.startDate,
      targetDate: bookInfo.targetDate ?? DateTime.now(),
      status: bookInfo.bookStatus,
    );

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => BookDetailScreen(book: book),
      ),
    );
  }
}
