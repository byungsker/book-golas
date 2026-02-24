import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/book_image_widget.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class CompletedBookCard extends StatefulWidget {
  final Book book;
  final VoidCallback onTap;

  const CompletedBookCard({
    super.key,
    required this.book,
    required this.onTap,
  });

  @override
  State<CompletedBookCard> createState() => _CompletedBookCardState();
}

class _CompletedBookCardState extends State<CompletedBookCard> {
  int? _achievementRate;

  @override
  void initState() {
    super.initState();
    _loadAchievementRate();
  }

  Future<void> _loadAchievementRate() async {
    final bookId = widget.book.id;
    final dailyTarget = widget.book.dailyTargetPages;

    debugPrint(
        '[CompletedBookCard] Loading achievement for ${widget.book.title}, dailyTarget: $dailyTarget');

    if (bookId == null || dailyTarget == null || dailyTarget <= 0) {
      debugPrint(
          '[CompletedBookCard] Skipped - bookId: $bookId, dailyTarget: $dailyTarget');
      return;
    }

    try {
      final response = await Supabase.instance.client
          .from('reading_progress_history')
          .select('page, previous_page, created_at')
          .eq('book_id', bookId)
          .order('created_at', ascending: true);

      final records = response as List;
      if (records.isEmpty) return;

      final Map<String, int> dailyPages = {};
      for (final record in records) {
        final createdAt = DateTime.parse(record['created_at'] as String);
        final dateKey =
            '${createdAt.year}-${createdAt.month.toString().padLeft(2, '0')}-${createdAt.day.toString().padLeft(2, '0')}';
        final pagesRead =
            (record['page'] as int) - (record['previous_page'] as int? ?? 0);
        dailyPages[dateKey] = (dailyPages[dateKey] ?? 0) + pagesRead;
      }

      if (dailyPages.isEmpty) {
        debugPrint('[CompletedBookCard] No daily pages data');
        return;
      }

      int achievedDays = 0;
      for (final entry in dailyPages.entries) {
        debugPrint(
            '[CompletedBookCard] ${entry.key}: ${entry.value} pages (target: $dailyTarget)');
        if (entry.value >= dailyTarget) {
          achievedDays++;
        }
      }

      final rate = (achievedDays / dailyPages.length * 100).round();
      debugPrint(
          '[CompletedBookCard] Achievement: $achievedDays/${dailyPages.length} days = $rate%');

      if (mounted) {
        setState(() {
          _achievementRate = rate;
        });
      }
    } catch (e) {
      debugPrint('[CompletedBookCard] Failed to load achievement rate: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);

    final completedDate = widget.book.updatedAt ?? DateTime.now();
    final daysToComplete =
        completedDate.difference(widget.book.startDate).inDays;

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
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
                child: BookImageWidget(
                    imageUrl: widget.book.imageUrl, iconSize: 30),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.book.title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: BLabColors.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              CupertinoIcons.checkmark_seal_fill,
                              size: 14,
                              color: BLabColors.success,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              daysToComplete > 0
                                  ? l10n.bookListCompletedIn(daysToComplete)
                                  : l10n.bookListCompletedSameDay,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: BLabColors.success,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (_achievementRate != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: _achievementRate! >= 80
                                ? BLabColors.successBg
                                : _achievementRate! >= 50
                                    ? BLabColors.amber
                                    : BLabColors.errorBg,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _achievementRate! >= 80
                                    ? CupertinoIcons.star_fill
                                    : _achievementRate! >= 50
                                        ? CupertinoIcons.hand_thumbsup_fill
                                        : CupertinoIcons.flame_fill,
                                size: 12,
                                color: _achievementRate! >= 80
                                    ? BLabColors.success
                                    : _achievementRate! >= 50
                                        ? BLabColors.dangerAlt
                                        : BLabColors.danger,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                l10n.bookListAchievementRate(_achievementRate!),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: _achievementRate! >= 80
                                      ? BLabColors.success
                                      : _achievementRate! >= 50
                                          ? BLabColors.dangerAlt
                                          : BLabColors.danger,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        CupertinoIcons.book_fill,
                        size: 12,
                        color: isDark ? Colors.grey[500] : Colors.grey[400],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${widget.book.totalPages} ${l10n.unitPages}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Icon(
                        CupertinoIcons.checkmark_circle_fill,
                        size: 12,
                        color: isDark ? Colors.grey[500] : Colors.grey[400],
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          l10n.bookListCompletedDate(
                              '${completedDate.year}.${completedDate.month.toString().padLeft(2, '0')}.${completedDate.day.toString().padLeft(2, '0')}'),
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
              size: 18,
            ),
          ],
        ),
      ),
    );
  }
}
