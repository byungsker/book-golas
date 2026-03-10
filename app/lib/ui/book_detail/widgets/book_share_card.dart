import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class BookShareCard extends StatelessWidget {
  final Book book;
  final int highlightCount;

  static const double cardWidth = 400.0;
  static const double cardHeight = 580.0;

  static const Color _bgColor = Color(0xFF121418);
  static const Color _surfaceColor = Color(0xFF1C1F26);
  static const Color _dividerColor = Color(0xFF2A2D35);
  static const Color _textPrimary = Colors.white;
  static const Color _textSecondary = Color(0xFFB0B4C0);
  static const Color _textTertiary = Color(0xFF6B7280);

  const BookShareCard({super.key, required this.book, this.highlightCount = 0});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: cardWidth,
      height: cardHeight,
      child: Container(
        decoration: const BoxDecoration(color: _bgColor),
        padding: const EdgeInsets.all(28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 24),
            _buildDivider(),
            const SizedBox(height: 20),
            _buildStatsRow(),
            const SizedBox(height: 20),
            _buildContentArea(),
            const Spacer(),
            _buildDivider(),
            const SizedBox(height: 16),
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildBookCover(),
        const SizedBox(width: 16),
        Expanded(child: _buildBookInfo()),
      ],
    );
  }

  Widget _buildBookCover() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: book.imageUrl != null
          ? CachedNetworkImage(
              imageUrl: book.imageUrl!,
              width: 88,
              height: 124,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) => _buildCoverPlaceholder(),
            )
          : _buildCoverPlaceholder(),
    );
  }

  Widget _buildCoverPlaceholder() {
    return Container(
      width: 88,
      height: 124,
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(
        CupertinoIcons.book_fill,
        color: Color(0xFF4A4D55),
        size: 32,
      ),
    );
  }

  Widget _buildBookInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStatusBadge(),
        const SizedBox(height: 10),
        Text(
          book.title,
          style: const TextStyle(
            color: _textPrimary,
            fontSize: 17,
            fontWeight: FontWeight.w700,
            height: 1.3,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        if (book.author != null) ...[
          const SizedBox(height: 6),
          Text(
            book.author!,
            style: const TextStyle(
              color: _textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w400,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
        if (book.genre != null) ...[
          const SizedBox(height: 6),
          Text(
            book.genre!,
            style: const TextStyle(color: _textTertiary, fontSize: 12),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
        if (book.status == 'completed' && book.rating != null) ...[
          const SizedBox(height: 8),
          _buildStarRating(book.rating!),
        ],
      ],
    );
  }

  Widget _buildStatusBadge() {
    final config = _statusConfig;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: config.color.withValues(alpha: 0.4),
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

  Widget _buildStarRating(int rating) {
    return Row(
      children: List.generate(5, (i) {
        return Icon(
          i < rating ? CupertinoIcons.star_fill : CupertinoIcons.star,
          size: 14,
          color: i < rating ? BLabColors.gold : _textTertiary,
        );
      }),
    );
  }

  Widget _buildDivider() {
    return Container(height: 1, color: _dividerColor);
  }

  Widget _buildStatsRow() {
    final stats = _buildStats();
    return Row(
      children: stats.asMap().entries.map((entry) {
        final isLast = entry.key == stats.length - 1;
        return Expanded(
          child: Row(
            children: [
              Expanded(child: _buildStatItem(entry.value)),
              if (!isLast)
                Container(
                  width: 1,
                  height: 32,
                  color: _dividerColor,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildStatItem(_StatItem stat) {
    return Column(
      children: [
        Text(stat.icon, style: const TextStyle(fontSize: 18)),
        const SizedBox(height: 4),
        Text(
          stat.value,
          style: const TextStyle(
            color: _textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 2),
        Text(
          stat.label,
          style: const TextStyle(color: _textTertiary, fontSize: 10),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildContentArea() {
    switch (book.status) {
      case 'reading':
        return _buildProgressBar();
      case 'completed':
        return _buildReviewSnippet();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildProgressBar() {
    if (book.totalPages <= 0) return const SizedBox.shrink();

    final progress = (book.currentPage / book.totalPages).clamp(0.0, 1.0);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '독서 진행률',
                style: TextStyle(color: _textSecondary, fontSize: 12),
              ),
              Text(
                '${book.currentPage} / ${book.totalPages}p',
                style: const TextStyle(color: _textSecondary, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: _dividerColor,
              valueColor: const AlwaysStoppedAnimation<Color>(
                BLabColors.primary,
              ),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewSnippet() {
    final review = book.review ?? book.longReview;
    if (review == null || review.trim().isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: BLabColors.primary.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 3,
            height: 36,
            decoration: BoxDecoration(
              color: BLabColors.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              review.trim(),
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

  Widget _buildFooter() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: BLabColors.primary,
                borderRadius: BorderRadius.circular(5),
              ),
              child: const Center(
                child: Text(
                  'B',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 7),
            const Text(
              'bookgolas',
              style: TextStyle(
                color: _textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.5,
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

  List<_StatItem> _buildStats() {
    switch (book.status) {
      case 'reading':
        return [
          _StatItem(
            icon: '📅',
            value: DateFormat('MM.dd').format(book.startDate),
            label: '시작일',
          ),
          _StatItem(
            icon: '📖',
            value: book.totalPages > 0
                ? '${((book.currentPage / book.totalPages) * 100).toStringAsFixed(0)}%'
                : '${book.currentPage}p',
            label: '진행률',
          ),
          _StatItem(icon: '💡', value: '$highlightCount', label: '기록'),
        ];
      case 'completed':
        final readDays = book.updatedAt != null
            ? book.updatedAt!.difference(book.startDate).inDays + 1
            : DateTime.now().difference(book.startDate).inDays + 1;
        return [
          _StatItem(icon: '📅', value: '${readDays}일', label: '독서 기간'),
          _StatItem(
            icon: '📄',
            value: book.totalPages > 0 ? '${book.totalPages}p' : '-',
            label: '총 페이지',
          ),
          _StatItem(icon: '💡', value: '$highlightCount', label: '기록'),
        ];
      case 'planned':
        return [
          _StatItem(
            icon: '📅',
            value: DateFormat(
              'MM.dd',
            ).format(book.plannedStartDate ?? book.startDate),
            label: '예정일',
          ),
          _StatItem(icon: '🏷️', value: book.genre ?? '-', label: '장르'),
          _StatItem(
            icon: '📄',
            value: book.totalPages > 0 ? '${book.totalPages}p' : '-',
            label: '페이지',
          ),
        ];
      case 'will_retry':
        return [
          _StatItem(icon: '🔁', value: '${book.attemptCount}번째', label: '도전'),
          _StatItem(icon: '🏷️', value: book.genre ?? '-', label: '장르'),
          _StatItem(
            icon: '📄',
            value: book.totalPages > 0 ? '${book.totalPages}p' : '-',
            label: '페이지',
          ),
        ];
      default:
        return [
          _StatItem(icon: '📖', value: '${book.currentPage}p', label: '현재'),
          _StatItem(icon: '📄', value: '${book.totalPages}p', label: '전체'),
          _StatItem(icon: '💡', value: '$highlightCount', label: '기록'),
        ];
    }
  }

  _StatusConfig get _statusConfig {
    switch (book.status) {
      case 'reading':
        return const _StatusConfig(
          label: '독서 중',
          icon: CupertinoIcons.book,
          color: BLabColors.primary,
        );
      case 'completed':
        return const _StatusConfig(
          label: '완독',
          icon: CupertinoIcons.checkmark_circle_fill,
          color: BLabColors.success,
        );
      case 'planned':
        return const _StatusConfig(
          label: '읽을 예정',
          icon: CupertinoIcons.bookmark_fill,
          color: BLabColors.warning,
        );
      case 'will_retry':
        return const _StatusConfig(
          label: '다시 도전',
          icon: CupertinoIcons.arrow_2_circlepath,
          color: BLabColors.purple,
        );
      default:
        return const _StatusConfig(
          label: '독서 중',
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
  final String label;
  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
  });
}
