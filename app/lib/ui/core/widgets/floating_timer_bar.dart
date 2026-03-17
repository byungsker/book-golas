import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/core/theme/app_colors.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/page_update_modal.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/ui/core/view_model/ad_view_model.dart';

/// Floating Timer Bar with smooth animation
///
/// Layout: [Book Info] <-Spacer-> [Timer] <-Spacer-> [Buttons]
class FloatingTimerBar extends StatefulWidget {
  final bool hasBottomNav;
  final String? currentViewingBookId;

  const FloatingTimerBar({
    super.key,
    this.hasBottomNav = true,
    this.currentViewingBookId,
  });

  @override
  State<FloatingTimerBar> createState() => _FloatingTimerBarState();
}

class _FloatingTimerBarState extends State<FloatingTimerBar>
    with TickerProviderStateMixin {
  bool _isMinimized = false; // Start expanded by default
  late AnimationController _expandController;
  late Animation<double> _widthAnimation;

  // Dynamic minimized width calculated based on content
  double _minimizedWidth = 180.0; // Initial default, will be updated

  // Colors
  static const Color _coral = Color(0xFFE85A5A);
  static const Color _darkBg = Color(0xFF2C2C2E);
  static const Color _surface = Color(0xFF3A3A3C);

  @override
  void initState() {
    super.initState();
    _expandController = AnimationController(
      duration: const Duration(milliseconds: 350),
      vsync: this,
    );
    _widthAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _expandController,
        curve: Curves.easeInOutCubic,
      ),
    );

    // Start expanded (value = 0 means expanded, 1 means minimized)
    _expandController.value = 0.0;
  }

  @override
  void dispose() {
    _expandController.dispose();
    super.dispose();
  }

  void _toggleExpand() {
    setState(() {
      _isMinimized = !_isMinimized;
      if (_isMinimized) {
        _expandController.forward();
      } else {
        _expandController.reverse();
      }
    });
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  // Calculate minimized width based on actual content
  double _calculateMinimizedWidth(String timeText, bool hasBook) {
    // Calculate text width using TextPainter
    final textPainter = TextPainter(
      text: TextSpan(
        text: timeText,
        style: const TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          fontFeatures: [FontFeature.tabularFigures()],
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    final textWidth = textPainter.width;

    // Component widths
    final thumbnailWidth =
        hasBook ? 32.0 : 18.0; // 32 for book, 18 for timer icon
    const thumbnailSpacing = 8.0; // Always 8
    const iconWidth = 16.0; // expand icon
    const iconSpacing = 8.0;
    const horizontalPadding = 24.0; // 16 + 8 = 24

    // Total width
    return textWidth +
        thumbnailWidth +
        thumbnailSpacing +
        iconWidth +
        iconSpacing +
        horizontalPadding;
  }

  String _formatDurationShort(Duration duration, BuildContext context) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    final seconds = duration.inSeconds % 60;
    final l10n = AppLocalizations.of(context);

    final parts = <String>[];

    if (hours > 0) {
      parts.add('$hours${l10n.unitHour}');
    }
    if (minutes > 0) {
      parts.add('$minutes${l10n.unitMinute}');
    }
    if (seconds > 0 || parts.isEmpty) {
      parts.add('$seconds${l10n.unitSecond}');
    }

    return parts.join(' ');
  }

  Future<void> _navigateToBookDetail(String? bookId) async {
    if (bookId == null) return;

    try {
      final bookService = BookService();
      final book = await bookService.getBookById(bookId);
      if (book != null && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => BookDetailScreen(book: book),
          ),
        );
      }
    } catch (e) {
      debugPrint('책 상세 이동 실패: $e');
    }
  }

  void _showStopConfirmation(
      BuildContext context, ReadingTimerViewModel timerVm,
      {bool isInBookDetailScreen = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final durationText = _formatDurationShort(timerVm.elapsed, context);
    final l10n = AppLocalizations.of(context);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      useRootNavigator: true,
      builder: (sheetContext) => Container(
        padding: EdgeInsets.fromLTRB(
          24,
          24,
          24,
          24 + MediaQuery.of(context).viewPadding.bottom,
        ),
        decoration: BoxDecoration(
          color: isDark ? _darkBg : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[700] : Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            const Icon(
              CupertinoIcons.stop_circle_fill,
              size: 48,
              color: _coral,
            ),
            const SizedBox(height: 16),
            Text(
              l10n.timerStopConfirmTitle,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.timerStopConfirmMessage(durationText),
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(sheetContext),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.black.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        l10n.timerContinueButton,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () async {
                      // Save book info before stop() resets them
                      final bookId = timerVm.currentBookId;
                      final savedDuration = timerVm.elapsed;

                      if (sheetContext.mounted) {
                        Navigator.pop(sheetContext);
                      }
                      await timerVm.stop();
                      if (mounted && bookId != null) {
                        await _showPageUpdateModal(context, bookId,
                            savedDuration, isInBookDetailScreen);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: _coral,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        l10n.timerStopButton,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showPageUpdateModal(BuildContext context, String bookId,
      Duration duration, bool isInBookDetailScreen) async {
    final l10n = AppLocalizations.of(context);

    final bookService = BookService();
    final book = await bookService.getBookById(bookId);

    if (book == null || !mounted) return;

    final currentPage = book.currentPage;

    await PageUpdateModal.show(
      context: context,
      currentPage: currentPage,
      totalPages: book.totalPages,
      readingDuration: duration,
      onUpdate: (newPage) async {
        await bookService.updateCurrentPage(bookId, newPage);

        if (mounted) {
          if (!isInBookDetailScreen) {
            await _navigateToBookDetail(bookId);
          }

          if (mounted) {
            CustomSnackbar.show(
              context,
              message: l10n.pageUpdateSuccess(newPage),
              type: BLabSnackbarType.success,
              rootOverlay: true,
              bottomOffset: 100,
            );
          }
        }
      },
      onSkip: () {
        bookService.recordReadingTime(
          bookId: bookId,
          currentPage: currentPage,
          readingTimeSeconds: duration.inSeconds,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shouldShowAds = context.watch<AdViewModel>().shouldShowAds;

    return Consumer<ReadingTimerViewModel>(
      builder: (context, timerVm, child) {
        if (!timerVm.isRunning && !timerVm.isPaused) {
          return const SizedBox.shrink();
        }

        // Get book info from timer ViewModel
        // Hide book info if viewing the same book's detail screen
        final isViewingSameBook = widget.currentViewingBookId != null &&
            widget.currentViewingBookId == timerVm.currentBookId;
        final hasBookInfo =
            timerVm.currentBookTitle != null && !isViewingSameBook;

        // When viewing the same book, show in-context timer bar above action buttons
        if (isViewingSameBook) {
          return _buildInContextTimerBar(isDark, timerVm);
        }

        // Calculate dynamic minimized width based on current time
        final timeText = _formatDuration(timerVm.elapsed);
        final calculatedWidth = _calculateMinimizedWidth(
          timeText,
          hasBookInfo,
        );
        // Update minimized width if changed (with small threshold to avoid jitter)
        if ((calculatedWidth - _minimizedWidth).abs() > 5.0) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _minimizedWidth = calculatedWidth;
              });
            }
          });
        }

        return AnimatedBuilder(
          animation: _expandController,
          builder: (context, child) {
            final screenWidth = MediaQuery.of(context).size.width;
            final expandedWidth = screenWidth - 32;

            // Calculate width: when animation is 0 = expanded, 1 = minimized
            final currentWidth = expandedWidth -
                ((expandedWidth - _minimizedWidth) * _widthAnimation.value);

            return Align(
              alignment: Alignment.bottomLeft,
              child: Padding(
                padding: EdgeInsets.only(
                  left: 16,
                  bottom: widget.hasBottomNav ? (shouldShowAds ? 140 : 90) : 16,
                ),
                child: GestureDetector(
                  onTap: _isMinimized ? _toggleExpand : null,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 350),
                    curve: Curves.easeInOutCubic,
                    width: currentWidth,
                    height: 64,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(32),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                        child: Container(
                          decoration: BoxDecoration(
                            color: isDark
                                ? _surface.withValues(alpha: 0.95)
                                : Colors.white.withValues(alpha: 0.95),
                            borderRadius: BorderRadius.circular(32),
                            border: Border.all(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.1)
                                  : Colors.black.withValues(alpha: 0.05),
                              width: 1,
                            ),
                          ),
                          child: _isMinimized
                              ? _buildMinimizedView(
                                  isDark, timerVm, hasBookInfo)
                              : _buildExpandedView(
                                  isDark, timerVm, hasBookInfo),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  /// In-context timer bar shown when viewing the same book's detail screen
  /// Positioned above the FloatingActionBar with left-aligned larger timer text
  Widget _buildInContextTimerBar(bool isDark, ReadingTimerViewModel timerVm) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: Padding(
        padding: const EdgeInsets.only(left: 16, right: 16, bottom: 96),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              height: 64,
              decoration: BoxDecoration(
                color: isDark
                    ? _surface.withValues(alpha: 0.95)
                    : Colors.white.withValues(alpha: 0.95),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : Colors.black.withValues(alpha: 0.05),
                  width: 1,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.only(left: 16, right: 16),
                child: Row(
                  children: [
                    // Book icon
                    const Icon(
                      CupertinoIcons.book_fill,
                      color: BLabColors.primary,
                      size: 22,
                    ),
                    const SizedBox(width: 12),
                    // Timer display (left-aligned, larger text)
                    Expanded(
                      child: Text(
                        _formatDuration(timerVm.elapsed),
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                    // Buttons (right side)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Pause/Resume button
                        GestureDetector(
                          onTap: () {
                            if (timerVm.isRunning) {
                              timerVm.pause();
                            } else {
                              timerVm.resume();
                            }
                          },
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.15)
                                  : Colors.black.withValues(alpha: 0.08),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              timerVm.isRunning
                                  ? CupertinoIcons.pause_fill
                                  : CupertinoIcons.play_fill,
                              color: isDark ? Colors.white : Colors.black,
                              size: 18,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Stop button
                        GestureDetector(
                          onTap: () => _showStopConfirmation(context, timerVm,
                              isInBookDetailScreen: true),
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: const BoxDecoration(
                              color: _coral,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              CupertinoIcons.stop_fill,
                              color: Colors.white,
                              size: 18,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMinimizedView(
      bool isDark, ReadingTimerViewModel timerVm, bool hasBookInfo) {
    final imageUrl = timerVm.currentBookImageUrl;

    return Padding(
      padding: const EdgeInsets.only(left: 16, right: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Book thumbnail (left side) - same size as expanded view
          if (hasBookInfo)
            Container(
              width: 32,
              height: 40,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                image: imageUrl != null
                    ? DecorationImage(
                        image: NetworkImage(imageUrl),
                        fit: BoxFit.cover,
                      )
                    : null,
                color: isDark ? Colors.grey[800] : Colors.grey[300],
              ),
              child: imageUrl == null
                  ? Icon(
                      CupertinoIcons.book,
                      color: isDark ? Colors.grey[600] : Colors.grey[500],
                      size: 16,
                    )
                  : null,
            ),
          if (!hasBookInfo)
            Icon(
              CupertinoIcons.timer,
              color: isDark ? Colors.white70 : Colors.black54,
              size: 18,
            ),
          const SizedBox(width: 8),
          // Time
          Text(
            _formatDuration(timerVm.elapsed),
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(width: 8),
          // Expand icon (right side)
          GestureDetector(
            onTap: _toggleExpand,
            child: Icon(
              CupertinoIcons.arrow_up_left_arrow_down_right,
              color: isDark ? Colors.white54 : Colors.black45,
              size: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpandedView(
      bool isDark, ReadingTimerViewModel timerVm, bool hasBookInfo) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          // Book thumbnail + title (left side, tappable to navigate)
          if (hasBookInfo)
            _BookInfoButton(
              title: timerVm.currentBookTitle!,
              imageUrl: timerVm.currentBookImageUrl,
              isDark: isDark,
              onTap: () => _navigateToBookDetail(timerVm.currentBookId),
            ),
          // No spacer when no book info - timer starts from left
          if (!hasBookInfo) const SizedBox(width: 8),

          // Spacer to push timer to center
          const Spacer(),

          // Timer display (center)
          Text(
            _formatDuration(timerVm.elapsed),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),

          // Spacer to push buttons to right
          const Spacer(),

          // Buttons (right side)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Pause button
              GestureDetector(
                onTap: () {
                  if (timerVm.isRunning) {
                    timerVm.pause();
                  } else {
                    timerVm.resume();
                  }
                },
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.15)
                        : Colors.black.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    timerVm.isRunning
                        ? CupertinoIcons.pause_fill
                        : CupertinoIcons.play_fill,
                    color: isDark ? Colors.white : Colors.black,
                    size: 18,
                  ),
                ),
              ),

              const SizedBox(width: 4),

              // Stop button
              GestureDetector(
                onTap: () => _showStopConfirmation(context, timerVm),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: _coral,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    CupertinoIcons.stop_fill,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
              ),

              const SizedBox(width: 4),

              // Collapse button (minimize icon)
              GestureDetector(
                onTap: _toggleExpand,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.1)
                        : Colors.black.withValues(alpha: 0.05),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    CupertinoIcons.arrow_down_right_arrow_up_left,
                    color: isDark ? Colors.white70 : Colors.black54,
                    size: 16,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Book info display widget with thumbnail and title
class _BookInfoButton extends StatelessWidget {
  final String title;
  final String? imageUrl;
  final bool isDark;
  final VoidCallback? onTap;

  const _BookInfoButton({
    required this.title,
    this.imageUrl,
    required this.isDark,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 32,
              height: 40,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                image: imageUrl != null
                    ? DecorationImage(
                        image: NetworkImage(imageUrl!),
                        fit: BoxFit.cover,
                      )
                    : null,
                color: isDark ? Colors.grey[800] : Colors.grey[300],
              ),
              child: imageUrl == null
                  ? Icon(
                      CupertinoIcons.book,
                      color: isDark ? Colors.grey[600] : Colors.grey[500],
                      size: 16,
                    )
                  : null,
            ),
            const SizedBox(width: 8),
            // Book title (4 chars max with ellipsis)
            Text(
              title.length > 4 ? '${title.substring(0, 4)}...' : title,
              maxLines: 1,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.white : Colors.black,
                decoration: TextDecoration.none,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
