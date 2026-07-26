import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/cupertino.dart';
import 'package:intl/intl.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class BookShareCard extends StatelessWidget {
  final Book book;
  final int highlightCount;
  final String? noteText;
  final bool useBookReviewFallback;

  static const double cardWidth = 400;
  static const double cardHeight = 780;
  static const double _coverWidth = 144;
  static const double _coverHeight = 205;
  static const double _horizontalInset = 28;

  static const Color _backgroundTop = BLabColors.elevatedDark;
  static const Color _backgroundBottom = BLabColors.scaffoldDark;
  static const Color _surface = BLabColors.surfaceDark;
  static const Color _ink = BLabColors.textPrimaryDark;
  static const Color _inkMuted = BLabColors.textSecondaryDark;
  static const Color _inkSoft = BLabColors.textTertiaryDark;
  static const Color _accent = BLabColors.primary;

  const BookShareCard({
    super.key,
    required this.book,
    this.highlightCount = 0,
    this.noteText,
    this.useBookReviewFallback = true,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return SizedBox(
      width: cardWidth,
      height: cardHeight,
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [_backgroundTop, _backgroundBottom],
          ),
        ),
        child: Column(
          children: [
            const SizedBox(height: 28),
            _buildCover(l10n),
            const SizedBox(height: 18),
            _buildStatusBadge(l10n),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: _buildTitleAndAuthor(),
            ),
            if (_hasNoteText) ...[
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: _horizontalInset,
                ),
                child: _buildNote(l10n),
              ),
            ],
            if (book.status == BookStatus.reading.value) ...[
              const SizedBox(height: 15),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: _horizontalInset,
                ),
                child: _buildReadingProgress(l10n),
              ),
            ],
            const Spacer(),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: _horizontalInset,
              ),
              child: _buildMetadata(l10n),
            ),
            const SizedBox(height: 14),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: _horizontalInset),
              child: SizedBox(
                height: 1,
                child: ColoredBox(
                  color: BLabColors.subtleDark,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: _horizontalInset,
              ),
              child: _buildFooter(l10n),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildCover(AppLocalizations l10n) {
    final config = _statusConfig(l10n);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: config.color.withValues(alpha: 0.18),
            blurRadius: 32,
            spreadRadius: 4,
          ),
          BoxShadow(
            color: _backgroundBottom.withValues(alpha: 0.8),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: book.imageUrl?.trim().isNotEmpty == true
            ? CachedNetworkImage(
                imageUrl: book.imageUrl!.trim(),
                width: _coverWidth,
                height: _coverHeight,
                fit: BoxFit.cover,
                fadeInDuration: Duration.zero,
                fadeOutDuration: Duration.zero,
                placeholder: (_, __) => _buildCoverPlaceholder(),
                errorWidget: (_, __, ___) => _buildCoverPlaceholder(),
              )
            : _buildCoverPlaceholder(),
      ),
    );
  }

  Widget _buildCoverPlaceholder() {
    return const ColoredBox(
      color: BLabColors.subtleDark,
      child: SizedBox(
        width: _coverWidth,
        height: _coverHeight,
        child: Icon(
          CupertinoIcons.book_fill,
          color: BLabColors.textTertiaryDark,
          size: 40,
        ),
      ),
    );
  }

  Widget _buildStatusBadge(AppLocalizations l10n) {
    final config = _statusConfig(l10n);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: config.color.withValues(alpha: 0.42),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(config.icon, size: 13, color: config.color),
          const SizedBox(width: 6),
          Text(
            config.label,
            style: BLabTypography.caption.copyWith(
              color: config.color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.25,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTitleAndAuthor() {
    final subtitleParts = <String>[];
    if (book.author?.trim().isNotEmpty == true) {
      subtitleParts.add(book.author!.trim());
    }
    if (book.genre?.trim().isNotEmpty == true) {
      subtitleParts.add(book.genre!.trim());
    }

    return Column(
      children: [
        Text(
          _keepKoreanWordsTogether(book.title),
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: BLabTypography.title.copyWith(
            color: _ink,
            fontSize: 18,
            height: 1.25,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.25,
          ),
        ),
        if (subtitleParts.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            subtitleParts.join(' · '),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: BLabTypography.label.copyWith(
              color: _inkMuted,
              fontSize: 13,
              height: 1.3,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildNote(AppLocalizations l10n) {
    return SizedBox(
      height: 154,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: _surface.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _accent.withValues(alpha: 0.2),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 18, 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 3,
                height: 38,
                decoration: BoxDecoration(
                  color: _accent,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.shareNoteHeading,
                      style: BLabTypography.caption.copyWith(
                        color: _inkSoft,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: Text(
                        _resolvedNoteText!,
                        maxLines: 5,
                        overflow: TextOverflow.ellipsis,
                        style: BLabTypography.label.copyWith(
                          color: _inkMuted,
                          fontSize: 13.5,
                          height: 1.45,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReadingProgress(AppLocalizations l10n) {
    final progress = book.totalPages > 0
        ? (book.currentPage / book.totalPages).clamp(0.0, 1.0)
        : 0.0;
    final percent = (progress * 100).round();
    final remainingPages = math.max(book.totalPages - book.currentPage, 0);
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    final deadlineDate = DateTime(
      book.targetDate.year,
      book.targetDate.month,
      book.targetDate.day,
    );
    final daysUntilDeadline = deadlineDate.difference(todayDate).inDays;

    return SizedBox(
      height: 146,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: _surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 14, 24, 14),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '$percent',
                    style: BLabTypography.title.copyWith(
                      color: _ink,
                      fontSize: 36,
                      height: 1,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1,
                    ),
                  ),
                  Text(
                    '%',
                    style: BLabTypography.title.copyWith(
                      color: _inkMuted,
                      fontSize: 18,
                      height: 1,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildProgressBar(progress),
              const SizedBox(height: 9),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      book.totalPages > 0
                          ? l10n.shareCurrentPages(
                              book.currentPage,
                              book.totalPages,
                            )
                          : l10n.sharePages(book.currentPage),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: BLabTypography.caption.copyWith(
                        color: _inkSoft,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      l10n.shareDeadline(_formatLongDate(book.targetDate)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.end,
                      style: BLabTypography.caption.copyWith(
                        color: daysUntilDeadline >= 0
                            ? _inkMuted
                            : BLabColors.errorLight,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.shareRemainingPages(remainingPages),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: BLabTypography.caption.copyWith(
                        color: _inkMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      daysUntilDeadline >= 0
                          ? l10n.shareDaysLeft(daysUntilDeadline)
                          : l10n.shareDaysOverdue(-daysUntilDeadline),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.end,
                      style: BLabTypography.caption.copyWith(
                        color: daysUntilDeadline >= 0
                            ? _inkMuted
                            : BLabColors.errorLight,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressBar(double progress) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: SizedBox(
        height: 8,
        child: Stack(
          children: [
            const Positioned.fill(
              child: ColoredBox(color: BLabColors.subtleDark),
            ),
            FractionallySizedBox(
              widthFactor: progress,
              child: const SizedBox.expand(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [BLabColors.primary, BLabColors.primaryLight],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetadata(AppLocalizations l10n) {
    final stats = _buildStats(l10n);

    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      runSpacing: 4,
      children: stats.asMap().entries.map((entry) {
        final isLast = entry.key == stats.length - 1;
        final stat = entry.value;

        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(stat.icon, style: const TextStyle(fontSize: 13)),
            const SizedBox(width: 4),
            Text(
              stat.value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: BLabTypography.label.copyWith(
                color: _inkMuted,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (!isLast) ...[
              const SizedBox(width: 8),
              Text(
                '·',
                style: BLabTypography.label.copyWith(
                  color: _inkSoft,
                  fontSize: 12,
                ),
              ),
              const SizedBox(width: 8),
            ],
          ],
        );
      }).toList(),
    );
  }

  Widget _buildFooter(AppLocalizations l10n) {
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(5),
          child: Image.asset(
            'assets/images/logo-bookgolas.png',
            width: 22,
            height: 22,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(width: 7),
        Text(
          l10n.shareBrandName,
          style: BLabTypography.label.copyWith(
            color: _inkMuted,
            fontSize: 13,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
        const Spacer(),
        Text(
          _formatLongDate(DateTime.now()),
          style: BLabTypography.caption.copyWith(
            color: _inkSoft,
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  bool get _hasNoteText => _resolvedNoteText != null;

  String? get _resolvedNoteText {
    final value = noteText?.trim();
    if (value != null && value.isNotEmpty) return value;
    if (!useBookReviewFallback) return null;
    final review = book.review ?? book.longReview;
    return review?.trim().isNotEmpty == true ? review!.trim() : null;
  }

  String _formatLongDate(DateTime date) {
    return DateFormat('yyyy.MM.dd').format(date);
  }

  String _formatShortDate(DateTime date) {
    return DateFormat('MM.dd').format(date);
  }

  String _keepKoreanWordsTogether(String value) {
    return value.replaceAllMapped(
      RegExp(r'[가-힣]{2,}'),
      (match) => match.group(0)!.split('').join('\u2060'),
    );
  }

  List<_StatItem> _buildStats(AppLocalizations l10n) {
    switch (book.status) {
      case 'reading':
        return [
          _StatItem(
            icon: '📅',
            value: l10n.shareStartedOn(_formatShortDate(book.startDate)),
          ),
          _StatItem(
            icon: '💡',
            value: l10n.shareHighlightCount(highlightCount),
          ),
        ];
      case 'completed':
        final readDays = book.updatedAt != null
            ? book.updatedAt!.difference(book.startDate).inDays + 1
            : DateTime.now().difference(book.startDate).inDays + 1;
        return [
          _StatItem(
            icon: '📅',
            value: l10n.shareCompletedInDays(readDays),
          ),
          _StatItem(
            icon: '📄',
            value: book.totalPages > 0 ? l10n.sharePages(book.totalPages) : '-',
          ),
          _StatItem(
            icon: '💡',
            value: l10n.shareHighlightCount(highlightCount),
          ),
        ];
      case 'planned':
        return [
          _StatItem(
            icon: '📅',
            value: l10n.sharePlannedStart(
              _formatShortDate(book.plannedStartDate ?? book.startDate),
            ),
          ),
          _StatItem(icon: '🏷️', value: book.genre ?? '-'),
          _StatItem(
            icon: '📄',
            value: book.totalPages > 0 ? l10n.sharePages(book.totalPages) : '-',
          ),
        ];
      case 'will_retry':
        return [
          _StatItem(
            icon: '🔁',
            value: l10n.shareRetryCount(book.attemptCount),
          ),
          _StatItem(icon: '🏷️', value: book.genre ?? '-'),
          _StatItem(
            icon: '📄',
            value: book.totalPages > 0 ? l10n.sharePages(book.totalPages) : '-',
          ),
        ];
      default:
        return [
          _StatItem(
            icon: '📖',
            value: l10n.sharePages(book.currentPage),
          ),
          _StatItem(
            icon: '📄',
            value: l10n.sharePages(book.totalPages),
          ),
          _StatItem(
            icon: '💡',
            value: l10n.shareHighlightCount(highlightCount),
          ),
        ];
    }
  }

  _StatusConfig _statusConfig(AppLocalizations l10n) {
    switch (book.status) {
      case 'reading':
        return _StatusConfig(
          label: l10n.shareStatusReading,
          icon: CupertinoIcons.book,
          color: _accent,
        );
      case 'completed':
        return _StatusConfig(
          label: l10n.shareStatusCompleted,
          icon: CupertinoIcons.checkmark_circle_fill,
          color: BLabColors.success,
        );
      case 'planned':
        return _StatusConfig(
          label: l10n.shareStatusPlanned,
          icon: CupertinoIcons.bookmark_fill,
          color: BLabColors.warning,
        );
      case 'will_retry':
        return _StatusConfig(
          label: l10n.shareStatusWillRetry,
          icon: CupertinoIcons.arrow_2_circlepath,
          color: BLabColors.purple,
        );
      default:
        return _StatusConfig(
          label: l10n.shareStatusReading,
          icon: CupertinoIcons.book,
          color: _accent,
        );
    }
  }
}

class _StatusConfig {
  final String label;
  final IconData icon;
  final Color color;

  const _StatusConfig({
    required this.label,
    required this.icon,
    required this.color,
  });
}

class _StatItem {
  final String icon;
  final String value;

  const _StatItem({
    required this.icon,
    required this.value,
  });
}
