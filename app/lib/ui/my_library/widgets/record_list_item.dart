import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/reading_record.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class RecordListItem extends StatelessWidget {
  final ReadingRecord record;
  final VoidCallback? onTap;

  const RecordListItem({
    super.key,
    required this.record,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.05)
              : Colors.black.withValues(alpha: 0.02),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color:
                    _getTypeColor(record.contentType).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  record.typeIcon,
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    record.contentText,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        record.typeLabel,
                        style: TextStyle(
                          fontSize: 12,
                          color: _getTypeColor(record.contentType),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (record.pageNumber != null) ...[
                        Text(
                          ' · ',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.4)
                                : Colors.black.withValues(alpha: 0.4),
                          ),
                        ),
                        Text(
                          'p.${record.pageNumber}',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.5)
                                : Colors.black.withValues(alpha: 0.5),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              size: 16,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.3)
                  : Colors.black.withValues(alpha: 0.3),
            ),
          ],
        ),
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'highlight':
        return BLabColors.primary;
      case 'note':
        return Colors.orange;
      case 'photo_ocr':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }
}

class GroupedRecordSection extends StatelessWidget {
  final GroupedRecords group;
  final VoidCallback? onBookTap;
  final void Function(ReadingRecord record)? onRecordTap;
  final bool isExpanded;
  final VoidCallback? onToggleExpand;

  const GroupedRecordSection({
    super.key,
    required this.group,
    this.onBookTap,
    this.onRecordTap,
    this.isExpanded = false,
    this.onToggleExpand,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.03) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.05),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: onToggleExpand,
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  if (group.bookImageUrl != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.network(
                        group.bookImageUrl!,
                        width: 40,
                        height: 56,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 40,
                          height: 56,
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : Colors.grey[200],
                          child: Icon(
                            CupertinoIcons.book,
                            size: 20,
                            color: isDark ? Colors.white54 : Colors.grey,
                          ),
                        ),
                      ),
                    )
                  else
                    Container(
                      width: 40,
                      height: 56,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.grey[200],
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Icon(
                        CupertinoIcons.book,
                        size: 20,
                        color: isDark ? Colors.white54 : Colors.grey,
                      ),
                    ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          group.bookTitle,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _buildCountText(),
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.5)
                                : Colors.black.withValues(alpha: 0.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    isExpanded
                        ? CupertinoIcons.chevron_up
                        : CupertinoIcons.chevron_down,
                    size: 18,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.4)
                        : Colors.black.withValues(alpha: 0.4),
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded) ...[
            Divider(
              height: 1,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.05),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: group.records
                    .take(5)
                    .map(
                      (record) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: RecordListItem(
                          record: record,
                          onTap: () => onRecordTap?.call(record),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            if (group.records.length > 5)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: GestureDetector(
                  onTap: onBookTap,
                  child: Text(
                    '${group.records.length - 5}개 더 보기',
                    style: const TextStyle(
                      fontSize: 13,
                      color: BLabColors.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }

  String _buildCountText() {
    final parts = <String>[];
    if (group.highlightCount > 0) {
      parts.add('하이라이트 ${group.highlightCount}');
    }
    if (group.noteCount > 0) {
      parts.add('메모 ${group.noteCount}');
    }
    if (group.photoCount > 0) {
      parts.add('사진 ${group.photoCount}');
    }
    return parts.isEmpty ? '기록 없음' : parts.join(' · ');
  }
}
