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
    final isLargeText = MediaQuery.textScalerOf(context).scale(1) >= 1.5;
    final completionBackgroundColor = isDark
        ? BLabColors.success.withValues(alpha: 0.18)
        : BLabColors.successBg;
    final completionForegroundColor =
        isDark ? BLabColors.success : BLabColors.textPrimaryLight;

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
          crossAxisAlignment: isLargeText
              ? CrossAxisAlignment.start
              : CrossAxisAlignment.center,
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
                        key: const Key('completedBookCompletionBadge'),
                        width: isLargeText ? double.infinity : null,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: completionBackgroundColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: _buildBadgeContent(
                          icon: CupertinoIcons.checkmark_seal_fill,
                          label: daysToComplete > 0
                              ? l10n.bookListCompletedIn(daysToComplete)
                              : l10n.bookListCompletedSameDay,
                          color: completionForegroundColor,
                          isLargeText: isLargeText,
                          iconSize: 14,
                          fontSize: 12,
                          spacing: 6,
                        ),
                      ),
                      if (_achievementRate != null)
                        CompletedBookAchievementBadge(
                          rate: _achievementRate!,
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (isLargeText)
                    Column(
                      children: [
                        _buildMetadataItem(
                          icon: CupertinoIcons.book_fill,
                          label: '${widget.book.totalPages} ${l10n.unitPages}',
                          isDark: isDark,
                          isExpanded: true,
                        ),
                        const SizedBox(height: 6),
                        _buildMetadataItem(
                          icon: CupertinoIcons.checkmark_circle_fill,
                          label: l10n.bookListCompletedDate(
                              '${completedDate.year}.${completedDate.month.toString().padLeft(2, '0')}.${completedDate.day.toString().padLeft(2, '0')}'),
                          isDark: isDark,
                          isExpanded: true,
                        ),
                      ],
                    )
                  else
                    Row(
                      children: [
                        _buildMetadataItem(
                          icon: CupertinoIcons.book_fill,
                          label: '${widget.book.totalPages} ${l10n.unitPages}',
                          isDark: isDark,
                        ),
                        const SizedBox(width: 12),
                        Flexible(
                          child: _buildMetadataItem(
                            icon: CupertinoIcons.checkmark_circle_fill,
                            label: l10n.bookListCompletedDate(
                                '${completedDate.year}.${completedDate.month.toString().padLeft(2, '0')}.${completedDate.day.toString().padLeft(2, '0')}'),
                            isDark: isDark,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.only(top: isLargeText ? 4 : 0),
              child: Icon(
                CupertinoIcons.chevron_right,
                color: isDark ? Colors.grey[600] : Colors.grey[400],
                size: 18,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetadataItem({
    required IconData icon,
    required String label,
    required bool isDark,
    bool isExpanded = false,
    TextOverflow? overflow,
  }) {
    final text = Text(
      label,
      style: TextStyle(
        fontSize: 12,
        color: isDark ? Colors.grey[400] : Colors.grey[600],
      ),
      overflow: overflow,
    );

    return Row(
      mainAxisSize: isExpanded ? MainAxisSize.max : MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(
            icon,
            size: 12,
            color: isDark ? Colors.grey[500] : Colors.grey[400],
          ),
        ),
        const SizedBox(width: 4),
        if (isExpanded)
          Expanded(child: text)
        else if (overflow != null)
          Flexible(child: text)
        else
          text,
      ],
    );
  }
}

class CompletedBookAchievementBadge extends StatelessWidget {
  final int rate;

  const CompletedBookAchievementBadge({
    super.key,
    required this.rate,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final isLargeText = MediaQuery.textScalerOf(context).scale(1) >= 1.5;
    final backgroundColor = rate >= 80
        ? BLabColors.successBg
        : rate >= 50
            ? BLabColors.amber
            : BLabColors.errorBg;
    final icon = rate >= 80
        ? CupertinoIcons.star_fill
        : rate >= 50
            ? CupertinoIcons.hand_thumbsup_fill
            : CupertinoIcons.flame_fill;

    return Container(
      key: const Key('completedBookAchievementBadge'),
      width: isLargeText ? double.infinity : null,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: _buildBadgeContent(
        icon: icon,
        label: l10n.bookListAchievementRate(rate),
        color: BLabColors.textPrimaryLight,
        isLargeText: isLargeText,
        iconSize: 12,
        fontSize: 11,
        spacing: 4,
      ),
    );
  }
}

Widget _buildBadgeContent({
  required IconData icon,
  required String label,
  required Color color,
  required bool isLargeText,
  required double iconSize,
  required double fontSize,
  required double spacing,
}) {
  final text = Text(
    label,
    style: TextStyle(
      fontSize: fontSize,
      fontWeight: FontWeight.w600,
      color: color,
    ),
  );

  return Row(
    mainAxisSize: isLargeText ? MainAxisSize.max : MainAxisSize.min,
    children: [
      Icon(icon, size: iconSize, color: color),
      SizedBox(width: spacing),
      if (isLargeText) Expanded(child: text) else Flexible(child: text),
    ],
  );
}
