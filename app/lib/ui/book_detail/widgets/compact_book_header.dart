import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/book_image_widget.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class CompactBookHeader extends StatelessWidget {
  final String? imageUrl;
  final String bookId;
  final String title;
  final String? author;
  final int currentPage;
  final int totalPages;
  final String? status;
  final void Function(String heroTag, String imageUrl) onImageTap;
  final VoidCallback? onTitleTap;
  final VoidCallback? onBookInfoTap;

  const CompactBookHeader({
    super.key,
    required this.imageUrl,
    required this.bookId,
    required this.title,
    this.author,
    required this.currentPage,
    required this.totalPages,
    this.status,
    required this.onImageTap,
    this.onTitleTap,
    this.onBookInfoTap,
  });

  bool get isCompleted =>
      status == BookStatus.completed.value ||
      (currentPage >= totalPages && totalPages > 0);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildBookCover(isDark),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildTitle(isDark),
                const SizedBox(height: 4),
                _buildAuthorAndStatus(context, isDark),
                if (onBookInfoTap != null) ...[
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: onBookInfoTap,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          CupertinoIcons.info_circle,
                          size: 14,
                          color: BLabColors.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          AppLocalizations.of(context).bookInfoViewButton,
                          style: const TextStyle(
                            fontSize: 12,
                            color: BLabColors.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookCover(bool isDark) {
    final heroTag = 'book_cover_compact_$bookId';

    return GestureDetector(
      onTap: () {
        if (imageUrl != null && imageUrl!.isNotEmpty) {
          onImageTap(heroTag, imageUrl!);
        }
      },
      child: Hero(
        tag: heroTag,
        child: Container(
          width: 60,
          height: 85,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: BookImageWidget(
              imageUrl: imageUrl,
              iconSize: 30,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTitle(bool isDark) {
    return GestureDetector(
      onTap: title.length > 20 ? onTitleTap : null,
      child: Text(
        title,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          height: 1.3,
          color: isDark ? Colors.white : Colors.black,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  Widget _buildAuthorAndStatus(BuildContext context, bool isDark) {
    return Row(
      children: [
        if (author != null) ...[
          Flexible(
            child: GestureDetector(
              onTap: onBookInfoTap,
              child: Text(
                author!,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          Text(
            ' · ',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.grey[500] : Colors.grey[400],
            ),
          ),
        ],
        _buildStatusBadge(context),
      ],
    );
  }

  Widget _buildStatusBadge(BuildContext context) {
    final statusInfo = _getStatusInfo(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: statusInfo.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: statusInfo.color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            statusInfo.label,
            style: TextStyle(
              color: statusInfo.color,
              fontWeight: FontWeight.w600,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  ({String label, Color color}) _getStatusInfo(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    if (isCompleted) {
      return (label: l10n.statusCompleted, color: BLabColors.success);
    }

    switch (status) {
      case 'planned':
        return (label: l10n.statusPlanned, color: BLabColors.purple);
      case 'will_retry':
        return (label: l10n.statusReread, color: BLabColors.warning);
      case 'reading':
      default:
        return (label: l10n.statusReading, color: BLabColors.primary);
    }
  }
}
