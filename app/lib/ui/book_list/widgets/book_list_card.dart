import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/book_image_widget.dart';
import 'package:book_golas/ui/core/widgets/pressable_wrapper.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/book_list/widgets/book_list_progress_calculator.dart';

class BookListCard extends StatefulWidget {
  final Book book;
  final VoidCallback onTap;
  final int todayPagesRead;
  final Future<bool> Function(BookStatus status)? onStatusChanged;

  const BookListCard({
    super.key,
    required this.book,
    required this.onTap,
    this.todayPagesRead = 0,
    this.onStatusChanged,
  });

  @override
  State<BookListCard> createState() => _BookListCardState();
}

class _BookListCardState extends State<BookListCard> {
  static const _edgeSwipeWidth = 32.0;
  static const _statusActionWidth = 72.0;
  static const _statusAnimationDuration = Duration(milliseconds: 180);

  double _reveal = 0;
  bool _isDragging = false;
  bool _isChangingStatus = false;

  Book get book => widget.book;
  int get todayPagesRead => widget.todayPagesRead;

  @override
  void didUpdateWidget(covariant BookListCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.book.id != widget.book.id ||
        oldWidget.book.status != widget.book.status) {
      _reveal = 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(
      book.targetDate.year,
      book.targetDate.month,
      book.targetDate.day,
    );
    final daysLeft = target.difference(today).inDays;
    final pageProgress = book.totalPages > 0
        ? (book.currentPage / book.totalPages).clamp(0.0, 1.0)
        : 0.0;
    final isCompleted =
        book.currentPage >= book.totalPages && book.totalPages > 0;

    final card = BLabPressableWrapper(
      onTap: _handleCardTap,
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.3)
                  : Colors.grey.withValues(alpha: 0.1),
              spreadRadius: 1,
              blurRadius: 3,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              _buildBookCover(isDark),
              const SizedBox(width: 16),
              Expanded(
                child: _buildBookInfo(
                  isDark,
                  daysLeft,
                  pageProgress,
                  isCompleted,
                  l10n,
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                color: isDark ? Colors.grey[400] : Colors.grey,
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: _buildSwipeableCard(context, card),
    );
  }

  void _handleCardTap() {
    if (_reveal > 0) {
      setState(() => _reveal = 0);
      return;
    }
    widget.onTap();
  }

  List<BookStatus> get _availableStatuses {
    final currentStatus = BookStatus.fromString(widget.book.status);
    return BookStatus.values
        .where((status) => status != currentStatus)
        .toList(growable: false);
  }

  Widget _buildSwipeableCard(BuildContext context, Widget card) {
    final statuses = _availableStatuses;
    if (widget.onStatusChanged == null || statuses.isEmpty) return card;

    return LayoutBuilder(
      builder: (context, constraints) {
        final screenWidth = MediaQuery.sizeOf(context).width;
        final revealWidth = statuses.length * _statusActionWidth + 8;
        final slideOffset = constraints.maxWidth == 0
            ? 0.0
            : -_reveal / constraints.maxWidth;

        return RawGestureDetector(
          behavior: HitTestBehavior.opaque,
          gestures: {
            _EdgeAwareHorizontalDragRecognizer:
                GestureRecognizerFactoryWithHandlers<
                    _EdgeAwareHorizontalDragRecognizer>(
              () => _EdgeAwareHorizontalDragRecognizer(
                screenWidth: screenWidth,
                edgeSwipeWidth: _edgeSwipeWidth,
              ),
              (recognizer) {
                recognizer
                  ..onStart = _handleDragStart
                  ..onUpdate = (details) {
                    _handleDragUpdate(details, revealWidth);
                  }
                  ..onEnd = (details) {
                    _handleDragEnd(details, revealWidth);
                  };
              },
            ),
          },
          child: Stack(
            clipBehavior: Clip.hardEdge,
            children: [
              Positioned.fill(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: SizedBox(
                    width: revealWidth,
                    child: _buildStatusActionRail(
                      context,
                      statuses,
                    ),
                  ),
                ),
              ),
              AnimatedSlide(
                offset: Offset(slideOffset, 0),
                duration: _isDragging
                    ? Duration.zero
                    : _statusAnimationDuration,
                child: card,
              ),
            ],
          ),
        );
      },
    );
  }

  void _handleDragStart(DragStartDetails _) {
    if (_isChangingStatus) return;
    setState(() => _isDragging = true);
  }

  void _handleDragUpdate(DragUpdateDetails details, double revealWidth) {
    if (_isChangingStatus) return;
    setState(() {
      _reveal = (_reveal - details.delta.dx).clamp(0.0, revealWidth);
    });
  }

  void _handleDragEnd(DragEndDetails details, double revealWidth) {
    if (_isChangingStatus) return;
    final velocity = details.primaryVelocity ?? 0;
    final shouldReveal = _reveal >= revealWidth / 2 || velocity < -300;
    setState(() {
      _isDragging = false;
      _reveal = shouldReveal ? revealWidth : 0;
    });
  }

  Widget _buildStatusActionRail(
    BuildContext context,
    List<BookStatus> statuses,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      color: isDark ? BLabColors.elevatedDark : BLabColors.surfaceLight,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: statuses
            .map(
              (status) => SizedBox(
                width: _statusActionWidth,
                child: BLabButton(
                  key: ValueKey('book-status-action-${status.value}'),
                  text: _statusLabel(context, status),
                  variant: status == BookStatus.completed
                      ? BLabButtonVariant.primary
                      : BLabButtonVariant.secondary,
                  onPressed: _isChangingStatus
                      ? null
                      : () => _handleStatusChange(status),
                  child: Icon(
                    _statusIcon(status),
                    color: status == BookStatus.completed
                        ? Colors.white
                        : (isDark ? Colors.white : Colors.black),
                    size: 20,
                  ),
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Future<void> _handleStatusChange(BookStatus status) async {
    final onStatusChanged = widget.onStatusChanged;
    if (_isChangingStatus || onStatusChanged == null) return;

    setState(() => _isChangingStatus = true);
    final succeeded = await onStatusChanged(status);
    if (!mounted) return;
    setState(() {
      _isChangingStatus = false;
      if (succeeded) _reveal = 0;
    });
  }

  String _statusLabel(BuildContext context, BookStatus status) {
    final l10n = AppLocalizations.of(context);
    switch (status) {
      case BookStatus.planned:
        return l10n.statusPlanned;
      case BookStatus.reading:
        return l10n.statusReading;
      case BookStatus.completed:
        return l10n.statusCompleted;
      case BookStatus.willRetry:
        return l10n.statusReread;
    }
  }

  IconData _statusIcon(BookStatus status) {
    switch (status) {
      case BookStatus.planned:
        return Icons.bookmark_border;
      case BookStatus.reading:
        return Icons.menu_book;
      case BookStatus.completed:
        return Icons.check_circle_outline;
      case BookStatus.willRetry:
        return Icons.replay;
    }
  }

  Widget _buildBookCover(bool isDark) {
    return Container(
      width: 60,
      height: 80,
      decoration: BoxDecoration(
        border: Border.all(
          color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
        ),
        borderRadius: BorderRadius.circular(4),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: BookImageWidget(imageUrl: book.imageUrl, iconSize: 30),
      ),
    );
  }

  Widget _buildBookInfo(
    bool isDark,
    int daysLeft,
    double pageProgress,
    bool isCompleted,
    AppLocalizations l10n,
  ) {
    final isReading = book.status == BookStatus.reading.value && !isCompleted;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          book.title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 6),
        _buildDdayAndPages(isDark, daysLeft, isCompleted, l10n),
        const SizedBox(height: 8),
        if (isReading)
          _buildDualProgressBars(isDark, pageProgress, l10n)
        else
          _buildProgressBar(isDark, pageProgress, isCompleted),
      ],
    );
  }

  Widget _buildDualProgressBars(
    bool isDark,
    double pageProgress,
    AppLocalizations l10n,
  ) {
    final todayGoalProgress = calculateTodayGoalProgress(
      book: book,
      todayPagesRead: todayPagesRead,
    );
    final scheduleProgress = todayGoalProgress.progress;
    final schedulePercent = todayGoalProgress.percentLabel;
    final overallPercent = (pageProgress * 100).toStringAsFixed(0);

    return Column(
      children: [
        _buildLabeledProgressRow(
          label: l10n.chartTodayGoal,
          percent: schedulePercent,
          progress: scheduleProgress,
          color: BLabColors.success,
          isDark: isDark,
        ),
        const SizedBox(height: 6),
        _buildLabeledProgressRow(
          label: l10n.bookListCardOverallProgress,
          percent: '$overallPercent%',
          progress: pageProgress,
          color: BLabColors.primary,
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _buildLabeledProgressRow({
    required String label,
    required String percent,
    required double progress,
    required Color color,
    required bool isDark,
  }) {
    return Row(
      children: [
        SizedBox(
          width: 62,
          child: Text(
            label,
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.grey[500] : Colors.grey[500],
            ),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: isDark ? Colors.grey[800] : Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 5,
            ),
          ),
        ),
        const SizedBox(width: 6),
        SizedBox(
          width: 32,
          child: Text(
            percent,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDdayAndPages(
    bool isDark,
    int daysLeft,
    bool isCompleted,
    AppLocalizations l10n,
  ) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _getDdayBackgroundColor(daysLeft, isCompleted),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            daysLeft >= 0 ? 'D-$daysLeft' : 'D+${daysLeft.abs()}',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: _getDdayTextColor(daysLeft, isCompleted),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${book.currentPage}/${book.totalPages} ${l10n.unitPages}',
          style: TextStyle(
            fontSize: 13,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Color _getDdayBackgroundColor(int daysLeft, bool isCompleted) {
    if (daysLeft < 0) {
      return BLabColors.errorAlt.withValues(alpha: 0.12);
    }
    if (isCompleted) {
      return BLabColors.success.withValues(alpha: 0.12);
    }
    return BLabColors.primary.withValues(alpha: 0.12);
  }

  Color _getDdayTextColor(int daysLeft, bool isCompleted) {
    if (daysLeft < 0) {
      return BLabColors.errorAlt;
    }
    if (isCompleted) {
      return BLabColors.success;
    }
    return BLabColors.primary;
  }

  Widget _buildProgressBar(bool isDark, double pageProgress, bool isCompleted) {
    final progressColor = isCompleted ? BLabColors.success : BLabColors.primary;

    return Row(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pageProgress,
              backgroundColor: isDark ? Colors.grey[700] : Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(progressColor),
              minHeight: 6,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${(pageProgress * 100).toStringAsFixed(0)}%',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: progressColor,
          ),
        ),
      ],
    );
  }
}

class _EdgeAwareHorizontalDragRecognizer
    extends HorizontalDragGestureRecognizer {
  final double screenWidth;
  final double edgeSwipeWidth;

  _EdgeAwareHorizontalDragRecognizer({
    required this.screenWidth,
    required this.edgeSwipeWidth,
  });

  @override
  void addAllowedPointer(PointerDownEvent event) {
    final startedAtScreenEdge =
        event.position.dx <= edgeSwipeWidth ||
        event.position.dx >= screenWidth - edgeSwipeWidth;
    if (startedAtScreenEdge) return;
    super.addAllowedPointer(event);
  }
}
