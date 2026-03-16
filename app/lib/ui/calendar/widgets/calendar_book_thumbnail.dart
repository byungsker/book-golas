import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/book_image_widget.dart';

class CalendarBookThumbnail extends StatelessWidget {
  final String? imageUrl;
  final int bookCount;
  final bool isCompletedToday;

  const CalendarBookThumbnail({
    super.key,
    required this.imageUrl,
    required this.bookCount,
    required this.isCompletedToday,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final scaffoldBg =
        isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight;

    const thumbnailWidth = 36.0;
    const thumbnailHeight = 48.0;

    final hasMultipleBooks = bookCount > 1;

    return SizedBox(
      width: thumbnailWidth,
      height: thumbnailHeight,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: BookImageWidget(
              imageUrl: imageUrl,
              width: thumbnailWidth,
              height: thumbnailHeight,
              iconSize: 18,
            ),
          ),
          if (hasMultipleBooks)
            Positioned(
              top: -6,
              right: -6,
              child: Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: BLabColors.primary,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: scaffoldBg,
                    width: 1.5,
                  ),
                ),
                child: Center(
                  child: Text(
                    '$bookCount',
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          if (isCompletedToday)
            Positioned(
              bottom: -4,
              right: -4,
              child: Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: BLabColors.successAlt,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: scaffoldBg,
                    width: 1,
                  ),
                ),
                child: const Center(
                  child: Icon(
                    CupertinoIcons.checkmark,
                    size: 8,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
