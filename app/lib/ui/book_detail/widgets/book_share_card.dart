import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class BookShareCard extends StatelessWidget {
  final Book book;
  final int highlightCount;

  static const double cardWidth = 400.0;
  static const double cardHeight = 620.0;

  static const Color _bgTop = Color(0xFF1A1D24);
  static const Color _bgBottom = Color(0xFF0D0F13);
  static const Color _surfaceColor = Color(0xFF1E2128);
  static const Color _textPrimary = Colors.white;
  static const Color _textSecondary = Color(0xFFB0B4C0);
  static const Color _textTertiary = Color(0xFF6B7280);
  static const Color _dividerColor = Color(0xFF2A2D35);

  const BookShareCard({
    super.key,
    required this.book,
    this.highlightCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return SizedBox(
      width: cardWidth,
      height: cardHeight,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [_bgTop, _bgBottom],
          ),
        ),
        child: Column(
          children: [
            const SizedBox(height: 28),
            _buildCoverWithGlow(),
            const SizedBox(height: 18),
            _buildStatusBadge(l10n),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: _buildTitleAuthor(),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: _buildMainContent(l10n),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: _buildMiniStats(l10n),
            ),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Container(height: 1, color: _dividerColor),
            ),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: _buildFooter(l10n),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildCoverWithGlow() {
    final config = _statusConfig(null);
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: config.color.withValues(alpha: 0.15),
            blurRadius: 32,
            spreadRadius: 4,
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: book.imageUrl != null
            ? CachedNetworkImage(
                imageUrl: book.imageUrl!,
                width: 140,
                height: 200,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => _buildCoverPlaceholder(),
              )
            : _buildCoverPlaceholder(),
      ),
    );
  }

  Widget _buildCoverPlaceholder() {
    return Container(
      width: 140,
      height: 200,
      color: _surfaceColor,
      child: const Icon(
        CupertinoIcons.book_fill,
        color: Color(0xFF4A4D55),
        size: 40,
      ),
    );
  }

  Widget _buildStatusBadge(AppLocalizations? l10n) {
    final config = _statusConfig(l10n);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: config.color.withValues(alpha: 0.35),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(config.icon, size: 12, color: config.color),
          const SizedBox(width: 5),
          Text(
            config.label,
            style: TextStyle(
              color: config.color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTitleAuthor() {
    final subtitleParts = <String>[];
    if (book.author != null) subtitleParts.add(book.author!);
    if (book.genre != null) subtitleParts.add(book.genre!);

    return Column(
      children: [
        Text(
          book.title,
          style: const TextStyle(
            color: _textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            height: 1.3,
          ),
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        if (subtitleParts.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            subtitleParts.join(' · '),
            style: const TextStyle(color: _textSecondary, fontSize: 13),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ],
    );
  }

  Widget _buildMainContent(AppLocalizations? l10n) {
    switch (book.status) {
      case 'reading':
        return _buildReadingProgress();
      case 'completed':
        return _buildCompletedContent();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildReadingProgress() {
    if (book.totalPages <= 0) return const SizedBox.shrink();

    final progress = (book.currentPage / book.totalPages).clamp(0.0, 1.0);
    final percent = (progress * 100).toStringAsFixed(0);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                percent,
                style: const TextStyle(
                  color: _textPrimary,
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                  height: 1.0,
                ),
              ),
              const Text(
                '%',
                style: TextStyle(
                  color: _textSecondary,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildGradientProgressBar(progress),
          const SizedBox(height: 8),
          Text(
            '${book.currentPage} / ${book.totalPages}p',
            style: const TextStyle(color: _textTertiary, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildGradientProgressBar(double progress) {
    return SizedBox(
      height: 8,
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              color: _dividerColor,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          FractionallySizedBox(
            widthFactor: progress,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                gradient: const LinearGradient(
                  colors: [BLabColors.primary, Color(0xFF818CF8)],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompletedContent() {
    final review = book.review ?? book.longReview;
    return Column(
      children: [
        if (book.rating != null) ...[
          _buildLargeStarRating(book.rating!),
          const SizedBox(height: 12),
        ],
        if (review != null && review.trim().isNotEmpty)
          _buildReviewSnippet(review.trim()),
      ],
    );
  }

  Widget _buildLargeStarRating(int rating) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(5, (i) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Icon(
            i < rating ? CupertinoIcons.star_fill : CupertinoIcons.star,
            size: 22,
            color: i < rating ? BLabColors.gold : _textTertiary,
          ),
        );
      }),
    );
  }

  Widget _buildReviewSnippet(String review) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: BLabColors.primary.withValues(alpha: 0.15),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 3,
            height: 32,
            decoration: BoxDecoration(
              color: BLabColors.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              review,
              style: const TextStyle(
                color: _textSecondary,
                fontSize: 13,
                height: 1.5,
                fontStyle: FontStyle.italic,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStats(AppLocalizations? l10n) {
    final stats = _buildStats(l10n);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: stats.asMap().entries.map((entry) {
        final isLast = entry.key == stats.length - 1;
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(entry.value.icon, style: const TextStyle(fontSize: 13)),
            const SizedBox(width: 3),
            Text(
              entry.value.value,
              style: const TextStyle(
                color: _textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (!isLast) ...[
              const SizedBox(width: 8),
              const Text(
                '·',
                style: TextStyle(color: _textTertiary, fontSize: 12),
              ),
              const SizedBox(width: 8),
            ],
          ],
        );
      }).toList(),
    );
  }

  Widget _buildFooter(AppLocalizations? l10n) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
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
              l10n?.shareBrandName ?? '북골라스',
              style: const TextStyle(
                color: _textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
        Text(
          DateFormat('yyyy.MM.dd').format(DateTime.now()),
          style: const TextStyle(color: _textTertiary, fontSize: 11),
        ),
      ],
    );
  }

  List<_StatItem> _buildStats(AppLocalizations? l10n) {
    switch (book.status) {
      case 'reading':
        return [
          _StatItem(
            icon: '📅',
            value: l10n?.shareStartedOn(
                    DateFormat('MM.dd').format(book.startDate)) ??
                '${DateFormat('MM.dd').format(book.startDate)} 시작',
          ),
          _StatItem(
            icon: '💡',
            value: l10n?.shareHighlightCount(highlightCount) ??
                '$highlightCount 기록',
          ),
        ];
      case 'completed':
        final readDays = book.updatedAt != null
            ? book.updatedAt!.difference(book.startDate).inDays + 1
            : DateTime.now().difference(book.startDate).inDays + 1;
        return [
          _StatItem(
            icon: '📅',
            value: l10n?.shareCompletedInDays(readDays) ?? '$readDays일 완독',
          ),
          _StatItem(
            icon: '📄',
            value: book.totalPages > 0 ? '${book.totalPages}p' : '-',
          ),
          _StatItem(
            icon: '💡',
            value: l10n?.shareHighlightCount(highlightCount) ??
                '$highlightCount 기록',
          ),
        ];
      case 'planned':
        return [
          _StatItem(
            icon: '📅',
            value: DateFormat(
              'MM.dd',
            ).format(book.plannedStartDate ?? book.startDate),
          ),
          _StatItem(icon: '🏷️', value: book.genre ?? '-'),
          _StatItem(
            icon: '📄',
            value: book.totalPages > 0 ? '${book.totalPages}p' : '-',
          ),
        ];
      case 'will_retry':
        return [
          _StatItem(icon: '🔁', value: '${book.attemptCount}번째 도전'),
          _StatItem(icon: '🏷️', value: book.genre ?? '-'),
          _StatItem(
            icon: '📄',
            value: book.totalPages > 0 ? '${book.totalPages}p' : '-',
          ),
        ];
      default:
        return [
          _StatItem(icon: '📖', value: '${book.currentPage}p'),
          _StatItem(icon: '📄', value: '${book.totalPages}p'),
          _StatItem(icon: '💡', value: '$highlightCount 기록'),
        ];
    }
  }

  _StatusConfig _statusConfig(AppLocalizations? l10n) {
    switch (book.status) {
      case 'reading':
        return _StatusConfig(
          label: l10n?.shareStatusReading ?? '독서 중',
          icon: CupertinoIcons.book,
          color: BLabColors.primary,
        );
      case 'completed':
        return _StatusConfig(
          label: l10n?.shareStatusCompleted ?? '완독',
          icon: CupertinoIcons.checkmark_circle_fill,
          color: BLabColors.success,
        );
      case 'planned':
        return _StatusConfig(
          label: l10n?.shareStatusPlanned ?? '읽을 예정',
          icon: CupertinoIcons.bookmark_fill,
          color: BLabColors.warning,
        );
      case 'will_retry':
        return _StatusConfig(
          label: l10n?.shareStatusWillRetry ?? '다시 도전',
          icon: CupertinoIcons.arrow_2_circlepath,
          color: BLabColors.purple,
        );
      default:
        return _StatusConfig(
          label: l10n?.shareStatusReading ?? '독서 중',
          icon: CupertinoIcons.book,
          color: BLabColors.primary,
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
  const _StatItem({required this.icon, required this.value});
}
