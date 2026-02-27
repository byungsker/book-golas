import 'package:confetti/confetti.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/highlight_data.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/page_update_modal.dart';
import 'package:book_golas/ui/book_detail/view_model/book_detail_view_model.dart';
import 'package:book_golas/ui/book_detail/view_model/memorable_page_view_model.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_progress_view_model.dart';
import 'package:book_golas/ui/reading_chart/view_model/reading_chart_view_model.dart';
import 'package:book_golas/ui/book_detail/utils/ocr_utils.dart';
import 'widgets/dialogs/daily_target_dialog.dart';
import 'widgets/dialogs/update_target_date_dialog.dart';
import 'widgets/draggable_dismiss_image.dart';
import 'utils/sticky_tab_bar_delegate.dart';
import 'widgets/modals/add_memorable_page_modal.dart';
import 'widgets/modals/existing_image_modal.dart';
import 'widgets/tabs/memorable_pages_tab.dart';
import 'widgets/tabs/progress_history_tab.dart';
import 'widgets/tabs/detail_tab.dart';
import 'widgets/dashboard_progress_widget.dart';
import 'widgets/compact_book_header.dart';
import 'widgets/compact_reading_schedule.dart';
import 'widgets/compact_streak_row.dart';
import 'widgets/floating_action_bar.dart';
import 'widgets/custom_tab_bar.dart';
import 'widgets/sheets/daily_target_confirm_sheet.dart';
import 'widgets/sheets/delete_confirmation_sheet.dart';
import 'widgets/sheets/image_source_sheet.dart';
import 'widgets/sheets/book_info_sheet.dart';
// import 'widgets/sheets/full_title_sheet.dart';
import 'widgets/sheets/pause_reading_confirmation_sheet.dart';
import 'widgets/dialogs/edit_planned_book_dialog.dart';
import 'package:book_golas/ui/reading_start/widgets/reading_start_screen.dart';
import 'package:book_golas/ui/recall/widgets/recall_search_sheet.dart';
import 'package:book_golas/ui/recall/view_model/recall_view_model.dart';
import 'package:book_golas/data/services/recall_service.dart';
import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/book_review/book_review_screen.dart';
import 'widgets/tabs/book_review_tab.dart';
import 'package:book_golas/ui/book_detail/view_model/reading_timer_view_model.dart';
import 'package:book_golas/ui/book_detail/widgets/reading_timer_modal.dart';
import 'package:book_golas/ui/core/widgets/floating_timer_bar.dart';

class BookDetailScreen extends StatelessWidget {
  final Book book;
  final bool showCelebration;
  final bool isEmbedded;
  final int? initialTabIndex;
  final bool autoOpenScan;
  final void Function(VoidCallback updatePage, VoidCallback addMemorable)?
      onCallbacksReady;

  const BookDetailScreen({
    super.key,
    required this.book,
    this.showCelebration = false,
    this.isEmbedded = false,
    this.initialTabIndex,
    this.autoOpenScan = false,
    this.onCallbacksReady,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => BookDetailViewModel(
            bookService: BookService(),
            initialBook: book,
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => MemorablePageViewModel(bookId: book.id!),
        ),
        ChangeNotifierProvider(
          create: (_) => ReadingProgressViewModel(bookId: book.id!),
        ),
        ChangeNotifierProvider(
          create: (_) => RecallViewModel()..loadRecentSearches(book.id!),
        ),
      ],
      child: _BookDetailContent(
        showCelebration: showCelebration,
        isEmbedded: isEmbedded,
        initialTabIndex: initialTabIndex,
        autoOpenScan: autoOpenScan,
        onCallbacksReady: onCallbacksReady,
      ),
    );
  }
}

class _BookDetailContent extends StatefulWidget {
  final bool showCelebration;
  final bool isEmbedded;
  final int? initialTabIndex;
  final bool autoOpenScan;
  final void Function(VoidCallback updatePage, VoidCallback addMemorable)?
      onCallbacksReady;

  const _BookDetailContent({
    this.showCelebration = false,
    this.isEmbedded = false,
    this.initialTabIndex,
    this.autoOpenScan = false,
    this.onCallbacksReady,
  });

  @override
  State<_BookDetailContent> createState() => _BookDetailContentState();
}

class _BookDetailContentState extends State<_BookDetailContent>
    with TickerProviderStateMixin {
  TabController? _tabController;
  int _currentTabLength = 3;
  late AnimationController _progressAnimController;
  late Animation<double> _progressAnimation;
  double _animatedProgress = 0.0;
  final ScrollController _scrollController = ScrollController();

  // Confetti 컨트롤러
  ConfettiController? _confettiController;

  void _initTabController(int length) {
    _tabController?.removeListener(_onTabChanged);
    _tabController?.dispose();
    _currentTabLength = length;
    _tabController = TabController(length: length, vsync: this);
    _tabController!.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    if (mounted) setState(() {});
  }

  void _updateTabControllerIfNeeded(Book book) {
    final shouldHaveReviewTab = _isBookCompleted(book);
    final targetLength = shouldHaveReviewTab ? 4 : 3;
    if (_currentTabLength != targetLength) {
      final currentIndex = _tabController?.index ?? 0;
      _initTabController(targetLength);
      if (currentIndex < targetLength) {
        _tabController!.index = currentIndex;
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _initTabController(3);

    _progressAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _progressAnimation = CurvedAnimation(
      parent: _progressAnimController,
      curve: Curves.elasticOut,
    );

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final bookVm = context.read<BookDetailViewModel>();
      final memorableVm = context.read<MemorablePageViewModel>();
      final progressVm = context.read<ReadingProgressViewModel>();

      // 최신 책 데이터 가져오기 (DB에서 fresh data)
      await bookVm.refreshBook();

      // DB eventual consistency를 위한 딜레이 후 achievements 로드
      await Future.delayed(const Duration(milliseconds: 300));
      await bookVm.loadDailyAchievements();

      if (mounted) {
        _animatedProgress =
            bookVm.currentBook.currentPage / bookVm.currentBook.totalPages;
      }

      memorableVm.fetchBookImages();
      progressVm.fetchProgressHistory();

      // 탭 컨트롤러 업데이트 (완독 상태면 4탭)
      _updateTabControllerIfNeeded(bookVm.currentBook);

      // 초기 탭 인덱스 설정
      if (widget.initialTabIndex != null &&
          widget.initialTabIndex! < _currentTabLength) {
        _tabController?.animateTo(widget.initialTabIndex!);
      } else if (_isBookCompleted(bookVm.currentBook)) {
        // 기본값: 완독 상태면 히스토리 탭으로 이동
        _tabController?.animateTo(1);
      }

      // 축하 애니메이션 표시
      if (widget.showCelebration) {
        _showCelebration();
      }

      // 콜백 준비 완료 알림 (embedded 모드에서 외부에서 FloatingActionBar 대신 사용)
      if (widget.onCallbacksReady != null && mounted) {
        widget.onCallbacksReady!(
          () => _showUpdatePageDialog(bookVm),
          _showAddMemorablePageModal,
        );
      }

      if (widget.autoOpenScan && mounted) {
        _tabController?.animateTo(1);
        await Future.delayed(const Duration(milliseconds: 400));
        if (mounted) {
          _showAddMemorablePageModal();
        }
      }
    });
  }

  /// 축하 애니메이션 표시 (컨페티 + 스낵바)
  void _showCelebration() {
    _confettiController = ConfettiController(
      duration: const Duration(seconds: 3),
    );
    _confettiController!.play();

    // 화이팅 메시지 스낵바
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        CustomSnackbar.show(
          context,
          message: 'New reading journey! 📚',
          type: BLabSnackbarType.success,
        );
      }
    });

    setState(() {});
  }

  @override
  void dispose() {
    _tabController?.removeListener(_onTabChanged);
    _tabController?.dispose();
    _progressAnimController.dispose();
    _scrollController.dispose();
    _confettiController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isKeyboardOpen = MediaQuery.of(context).viewInsets.bottom > 0;

    return Consumer<BookDetailViewModel>(
      builder: (context, bookVm, _) {
        final book = bookVm.currentBook;

        // TabController 길이 동기화 (책 완독 상태 변경 시)
        final shouldHaveReviewTab = _isBookCompleted(book);
        final targetLength = shouldHaveReviewTab ? 4 : 3;
        if (_currentTabLength != targetLength) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _updateTabControllerIfNeeded(book);
          });
        }

        return Scaffold(
          backgroundColor:
              isDark ? BLabColors.scaffoldDark : BLabColors.elevatedLight,
          appBar: widget.isEmbedded
              ? null
              : AppBar(
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  surfaceTintColor: Colors.transparent,
                  leading: IconButton(
                    icon: Icon(CupertinoIcons.back,
                        color: isDark ? Colors.white : Colors.black),
                    onPressed: () => Navigator.pop(context),
                  ),
                  title: Text(
                    AppLocalizations.of(context).bookDetailTabDetail,
                    style: TextStyle(
                      color: isDark ? Colors.white : Colors.black,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
          body: Stack(
            children: [
              SafeArea(
                bottom: !widget.isEmbedded,
                child: NestedScrollView(
                  key: ValueKey('nested_scroll_${book.id}'),
                  controller: _scrollController,
                  headerSliverBuilder: (context, innerBoxIsScrolled) {
                    return [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              CompactBookHeader(
                                imageUrl: book.imageUrl,
                                bookId: book.id!,
                                title: book.title,
                                author: book.author,
                                currentPage: book.currentPage,
                                totalPages: book.totalPages,
                                status: book.status,
                                onImageTap: _showFullScreenImage,
                                // onTitleTap: () => showFullTitleSheet(
                                //     context: context, title: book.title),
                                onTitleTap: () =>
                                    showBookInfoSheet(context, book),
                                onBookInfoTap: () =>
                                    showBookInfoSheet(context, book),
                              ),
                              const SizedBox(height: 10),
                              CompactReadingSchedule(
                                startDate: book.startDate,
                                targetDate: book.targetDate,
                                attemptCount: bookVm.attemptCount,
                                onEditTap: () =>
                                    _showUpdateTargetDateDialog(bookVm),
                                showEditButton: !_isBookCompleted(book),
                              ),
                              const SizedBox(height: 12),
                              if (_isBookReading(book)) ...[
                                DashboardProgressWidget(
                                  animatedProgress: _animatedProgress,
                                  currentPage: book.currentPage,
                                  totalPages: book.totalPages,
                                  daysLeft: bookVm.daysLeft,
                                  pagesLeft: bookVm.pagesLeft,
                                  dailyTargetPages: bookVm.effectiveDailyTarget,
                                  isTodayGoalAchieved:
                                      bookVm.isTodayGoalAchieved,
                                  onDailyTargetTap: () =>
                                      _showDailyTargetChangeDialog(bookVm),
                                ),
                                const SizedBox(height: 12),
                                CompactStreakRow(
                                    dailyAchievements:
                                        bookVm.dailyAchievements),
                              ],
                              if (_isBookPlanned(book)) ...[
                                const SizedBox(height: 12),
                                _buildPlannedBookInfo(context, book, bookVm),
                              ],
                              if (_isBookPaused(book)) ...[
                                const SizedBox(height: 12),
                                _buildResumeReadingButton(
                                    context, book, bookVm),
                              ],
                              if (_isBookCompleted(book)) ...[
                                if (book.longReview == null ||
                                    book.longReview!.isEmpty) ...[
                                  const SizedBox(height: 12),
                                  _buildBookReviewButton(context, book),
                                ],
                                const SizedBox(height: 12),
                                _buildRestartReadingButton(context, book),
                              ],
                              const SizedBox(height: 20),
                            ],
                          ),
                        ),
                      ),
                      SliverPersistentHeader(
                        pinned: true,
                        delegate: StickyTabBarDelegate(
                          child: CustomTabBar(
                            tabController: _tabController!,
                            tabLabels: _isBookCompleted(book)
                                ? [
                                    AppLocalizations.of(context)
                                        .bookDetailTabRecord,
                                    AppLocalizations.of(context)
                                        .bookDetailTabHistory,
                                    AppLocalizations.of(context)
                                        .bookDetailTabReview,
                                    AppLocalizations.of(context)
                                        .bookDetailTabDetail,
                                  ]
                                : [
                                    AppLocalizations.of(context)
                                        .bookDetailTabRecord,
                                    AppLocalizations.of(context)
                                        .bookDetailTabHistory,
                                    AppLocalizations.of(context)
                                        .bookDetailTabDetail,
                                  ],
                          ),
                          backgroundColor: isDark
                              ? BLabColors.scaffoldDark
                              : BLabColors.elevatedLight,
                        ),
                      ),
                    ];
                  },
                  body: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: Consumer<MemorablePageViewModel>(
                      builder: (context, memorableVm, _) {
                        // TabController와 children 개수가 맞지 않으면 로딩 표시
                        final expectedChildrenCount =
                            _isBookCompleted(book) ? 4 : 3;
                        if (_currentTabLength != expectedChildrenCount) {
                          return const Center(
                              child: CircularProgressIndicator());
                        }
                        return TabBarView(
                          controller: _tabController,
                          children: [
                            MemorablePagesTab(
                              imagesFuture:
                                  Future.value(memorableVm.cachedImages ?? []),
                              cachedImages: memorableVm.cachedImages,
                              sortMode: memorableVm.sortMode,
                              isSelectionMode: memorableVm.isSelectionMode,
                              selectedImageIds: memorableVm.selectedImageIds,
                              onSortModeChanged: memorableVm.setSortMode,
                              onSelectionModeChanged: (mode) {
                                if (mode) {
                                  memorableVm.toggleSelectionMode();
                                } else {
                                  memorableVm.exitSelectionMode();
                                }
                              },
                              onImageSelected: (id, selected) =>
                                  memorableVm.toggleImageSelection(id),
                              onDeleteSelected: () =>
                                  _deleteSelectedImages(memorableVm),
                              onImageTap: (id, url, text, page) =>
                                  _showExistingImageModal(id, url, text,
                                      pageNumber: page),
                              onImagesLoaded: memorableVm.onImagesLoaded,
                            ),
                            Consumer<ReadingProgressViewModel>(
                              builder: (context, progressVm, _) {
                                return ProgressHistoryTab(
                                  progressFuture: Future.value(
                                      progressVm.progressHistory ?? []),
                                  attemptCount: bookVm.attemptCount,
                                  attemptEncouragement:
                                      bookVm.attemptEncouragement,
                                  progressPercentage: bookVm.progressPercentage,
                                  daysLeft: bookVm.daysLeft,
                                  startDate: book.startDate,
                                  targetDate: book.targetDate,
                                  bookId: book.id ?? '',
                                );
                              },
                            ),
                            if (_isBookCompleted(book))
                              BookReviewTab(
                                book: book,
                                onEditTap: () =>
                                    _navigateToBookReview(context, book),
                              ),
                            DetailTab(
                              book: book,
                              attemptCount: bookVm.attemptCount,
                              attemptEncouragement: bookVm.attemptEncouragement,
                              dailyAchievements: bookVm.dailyAchievements,
                              onTargetDateChange: () =>
                                  _showUpdateTargetDateDialog(bookVm),
                              onPauseReading: () =>
                                  _showPauseReadingConfirmation(bookVm),
                              onDelete: () => _showDeleteConfirmation(bookVm),
                              onReviewTap: () =>
                                  _navigateToBookReview(context, book),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ),
              if (isKeyboardOpen)
                const KeyboardDoneButton()
              else if (!_isBookPlanned(bookVm.currentBook) &&
                  !widget.isEmbedded)
                Consumer<ReadingTimerViewModel>(
                  builder: (context, timerVm, child) {
                    final isTimerActiveForThisBook = timerVm.isRunning &&
                        timerVm.currentBookId == bookVm.currentBook.id;
                    return FloatingActionBar(
                      onUpdatePageTap: _isBookReading(bookVm.currentBook)
                          ? () => _showUpdatePageDialog(bookVm)
                          : null,
                      onAddMemorablePageTap: _showAddMemorablePageModal,
                      onRecallSearchTap: () => _showRecallSearchSheet(bookVm),
                      onTimerTap: _isBookReading(bookVm.currentBook) &&
                              !isTimerActiveForThisBook
                          ? _showReadingTimerModal
                          : null,
                      isReadingMode: _isBookReading(bookVm.currentBook),
                      isTimerRunning: timerVm.isRunning,
                    );
                  },
                ),
              // 컨페티 애니메이션
              if (_confettiController != null)
                Align(
                  alignment: Alignment.topCenter,
                  child: ConfettiWidget(
                    confettiController: _confettiController!,
                    blastDirectionality: BlastDirectionality.explosive,
                    shouldLoop: false,
                    colors: const [
                      BLabColors.primary,
                      BLabColors.success,
                      BLabColors.gold,
                      BLabColors.destructive,
                      BLabColors.purple,
                    ],
                    numberOfParticles: 30,
                    gravity: 0.2,
                  ),
                ),
              // 플로팅 타이머 바
              FloatingTimerBar(
                hasBottomNav: false,
                currentViewingBookId: bookVm.currentBook.id,
              ),
            ],
          ),
        );
      },
    );
  }

  void _animateProgress(double fromProgress, double toProgress) {
    _progressAnimController.reset();
    final progressTween = Tween<double>(begin: fromProgress, end: toProgress)
        .animate(_progressAnimation);

    void listener() {
      setState(() => _animatedProgress = progressTween.value);
    }

    _progressAnimation.addListener(listener);
    _progressAnimController.forward().then((_) {
      _progressAnimation.removeListener(listener);
      setState(() => _animatedProgress = toProgress);
    });
  }

  Future<void> _showUpdatePageDialog(BookDetailViewModel bookVm) async {
    final book = bookVm.currentBook;
    final timerVm = context.read<ReadingTimerViewModel>();

    // Show reading duration badge if timer is running for this book
    final isTimerActiveForThisBook = (timerVm.isRunning || timerVm.isPaused) &&
        timerVm.currentBookId == book.id;

    await PageUpdateModal.show(
      context: context,
      currentPage: book.currentPage,
      totalPages: book.totalPages,
      readingDuration: isTimerActiveForThisBook ? timerVm.elapsed : null,
      onUpdate: (newPage) async => _updateCurrentPage(bookVm, newPage),
    );
  }

  Future<void> _updateCurrentPage(
      BookDetailViewModel bookVm, int newPage) async {
    final oldPage = bookVm.currentBook.currentPage;
    final totalPages = bookVm.currentBook.totalPages;
    final oldProgress = oldPage / totalPages;
    final newProgress = newPage / totalPages;
    final wasGoalAchieved = bookVm.isTodayGoalAchieved;
    final wasCompleted = oldPage >= totalPages;
    final isNowCompleted = newPage >= totalPages;

    final success = await bookVm.updateCurrentPage(newPage);
    if (success && mounted) {
      _animateProgress(oldProgress, newProgress);
      _scrollController.animateTo(0,
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeOutCubic);

      // 완독 달성 시 축하 애니메이션 + 독후감 작성 유도
      if (!wasCompleted && isNowCompleted) {
        _showBookCompletionCelebration(bookVm);
        return;
      }

      final pagesRead = newPage - oldPage;
      if (bookVm.isTodayGoalAchieved) {
        CustomSnackbar.show(context,
            message: '🎉 오늘 목표 달성! +$pagesRead 페이지를 읽었어요',
            type: BLabSnackbarType.success);

        // 이번 업데이트로 목표 달성했으면 컨페티 표시
        if (!wasGoalAchieved) {
          _showGoalAchievedCelebration();
        }
      } else {
        final remaining = bookVm.pagesToGoal;
        if (remaining > 0) {
          CustomSnackbar.show(context,
              message: '📖 +$pagesRead 페이지 읽었어요! 목표까지 ${remaining}p 남았어요', type: BLabSnackbarType.info);
        } else {
          CustomSnackbar.show(context,
              message: '📖 +$pagesRead 페이지 읽었어요! (총 ${newPage}p)', type: BLabSnackbarType.success);
        }
      }

      context.read<ReadingProgressViewModel>().fetchProgressHistory();
    } else if (mounted) {
      CustomSnackbar.show(context, message: '업데이트에 실패했어요. 다시 시도해주세요.', type: BLabSnackbarType.error);
    }
  }

  /// 목표 달성 축하 애니메이션
  void _showGoalAchievedCelebration() {
    _confettiController?.dispose();
    _confettiController = ConfettiController(
      duration: const Duration(seconds: 2),
    );
    _confettiController!.play();
    setState(() {});
  }

  /// 완독 축하 애니메이션 + 독후감 작성 유도
  void _showBookCompletionCelebration(BookDetailViewModel bookVm) {
    _confettiController?.dispose();
    _confettiController = ConfettiController(
      duration: const Duration(seconds: 3),
    );
    _confettiController!.play();
    setState(() {});

    context.read<ReadingProgressViewModel>().fetchProgressHistory();

    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      _showBookReviewPromptSheet(bookVm);
    });
  }

  /// 독후감 작성 유도 바텀시트
  void _showBookReviewPromptSheet(BookDetailViewModel bookVm) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final book = bookVm.currentBook;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isDismissible: true,
      builder: (bottomSheetContext) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Text(
              '🎉',
              style: TextStyle(fontSize: 48),
            ),
            const SizedBox(height: 12),
            Text(
              'Congratulations!',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 22,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              book.title,
              style: TextStyle(
                fontSize: 15,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 20),
            Text(
              'Would you like to write a review?',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: isDark ? Colors.grey[300] : Colors.grey[700],
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(bottomSheetContext),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey[800] : Colors.grey[200],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          AppLocalizations.of(context).bookDetailLater,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.grey[300] : Colors.grey[700],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: GestureDetector(
                    onTap: () {
                      Navigator.pop(bottomSheetContext);
                      _navigateToBookReview(context, book);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: BLabColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          AppLocalizations.of(context).bookDetailTabReview,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(
              height: MediaQuery.of(bottomSheetContext).padding.bottom + 8,
            ),
          ],
        ),
      ),
    );
  }

  void _showDailyTargetChangeDialog(BookDetailViewModel bookVm) async {
    final confirmed = await showDailyTargetConfirmSheet(context: context);
    if (confirmed != true || !mounted) return;

    await DailyTargetDialog.show(
      context: context,
      book: bookVm.currentBook,
      pagesLeft: bookVm.pagesLeft,
      daysLeft: bookVm.daysLeft,
      onSave: (newDailyTarget) => bookVm.updateBook(
          bookVm.currentBook.copyWith(dailyTargetPages: newDailyTarget)),
    );
  }

  void _showUpdateTargetDateDialog(BookDetailViewModel bookVm) async {
    await UpdateTargetDateDialog.show(
      context: context,
      currentTargetDate: bookVm.currentBook.targetDate,
      nextAttemptCount: bookVm.attemptCount + 1,
      onConfirm: (newDate, newAttempt) async {
        final success = await bookVm.updateTargetDate(newDate, newAttempt);
        if (success && mounted) {
          _scrollController.animateTo(0,
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeOutCubic);
          CustomSnackbar.show(context,
              message: 'Attempt $newAttempt! D-${bookVm.daysLeft}',
              type: BLabSnackbarType.info,
              icon: Icons.flag);
        }
      },
    );
  }

  void _showFullScreenImage(String imageId, String imageUrl,
      {List<HighlightData>? highlights}) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.transparent,
        pageBuilder: (context, animation, secondaryAnimation) {
          return DraggableDismissNetworkImage(
            animation: animation,
            imageUrl: imageUrl,
            imageId: imageId,
            highlights: highlights,
          );
        },
        transitionDuration: const Duration(milliseconds: 200),
      ),
    );
  }

  void _showImageFullscreenOnly(Uint8List imageBytes) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black87,
        pageBuilder: (context, animation, secondaryAnimation) {
          return DraggableDismissImage(
              animation: animation, imageBytes: imageBytes);
        },
      ),
    );
  }

  void _showAddMemorablePageModal() async {
    final memorableVm = context.read<MemorablePageViewModel>();
    final bookVm = context.read<BookDetailViewModel>();

    final result = await showAddMemorablePageModal(
      context: context,
      initialImageBytes: memorableVm.pendingImageBytes,
      initialExtractedText: memorableVm.pendingExtractedText,
      initialPageNumber: memorableVm.pendingPageNumber,
      totalPages: bookVm.currentBook.totalPages,
      onImageTap: _showImageFullscreenOnly,
      onShowImageSourceSheet: (onImageSelected) =>
          _showImageSourceActionSheet(onImageSelected: onImageSelected),
      onShowReplaceImageConfirmation: (onConfirm) async {
        final confirmed =
            await showReplaceImageConfirmationSheet(context: context);
        if (confirmed == true) onConfirm();
      },
      onExtractText: (imageBytes, onResult) {
        if (!mounted) return;
        extractTextFromLocalImage(context, imageBytes, onResult);
      },
      onUpload: (
          {Uint8List? imageBytes,
          required String extractedText,
          int? pageNumber,
          List<HighlightData>? highlights}) async {
        return await _uploadAndSaveMemorablePage(
            imageBytes: imageBytes,
            extractedText: extractedText,
            pageNumber: pageNumber,
            highlights: highlights);
      },
      onStateChanged: (imageBytes, text, pageNumber) {
        if (imageBytes != null || text.isNotEmpty || pageNumber != null) {
          memorableVm.setPendingImage(
            bytes: imageBytes ?? Uint8List(0),
            extractedText: text,
            pageNumber: pageNumber,
          );
        }
      },
    );

    if (!mounted) return;

    if (result != null && result['clear'] == true) {
      memorableVm.clearPendingImage();
    }
  }

  Future<bool> _uploadAndSaveMemorablePage(
      {Uint8List? imageBytes,
      required String extractedText,
      int? pageNumber,
      List<HighlightData>? highlights}) async {
    final memorableVm = context.read<MemorablePageViewModel>();
    final bookVm = context.read<BookDetailViewModel>();

    try {
      String? publicUrl;
      if (imageBytes != null) {
        final fileName =
            'book_images/${DateTime.now().millisecondsSinceEpoch}.jpg';
        final storage = Supabase.instance.client.storage;
        await storage.from('book-images').uploadBinary(fileName, imageBytes,
            fileOptions: const FileOptions(upsert: true));
        publicUrl = storage.from('book-images').getPublicUrl(fileName);
      }

      final userId = Supabase.instance.client.auth.currentUser?.id;
      final insertData = {
        'book_id': bookVm.currentBook.id,
        'user_id': userId,
        'image_url': publicUrl,
        'caption': '',
        'extracted_text': extractedText.isEmpty ? null : extractedText,
        'page_number': pageNumber,
        'created_at': DateTime.now().toIso8601String(),
      };
      if (highlights != null && highlights.isNotEmpty) {
        insertData['highlights'] = HighlightData.toJsonList(highlights);
      }
      final insertResult = await Supabase.instance.client
          .from('book_images')
          .insert(insertData)
          .select('id')
          .single();

      await memorableVm.fetchBookImages();
      memorableVm.clearPendingImage();

      if (extractedText.isNotEmpty && userId != null) {
        RecallService().generateEmbeddingForPhotoOcr(
          userId: userId,
          bookId: bookVm.currentBook.id!,
          photoId: insertResult['id'] as String,
          ocrText: extractedText,
          pageNumber: pageNumber,
        );
      }

      if (mounted) {
        _tabController?.animateTo(0);
        _scrollController.animateTo(0,
            duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
        CustomSnackbar.show(context,
            message: AppLocalizations.of(context).bookDetailSaved, type: BLabSnackbarType.success);
      }
      return true;
    } catch (e, stackTrace) {
      debugPrint('🔴 업로드 실패: $e');
      debugPrint('🔴 스택 트레이스: $stackTrace');
      if (mounted) {
        final errorMessage = e.toString();
        final isNetworkError = errorMessage.contains('SocketException') ||
            errorMessage.contains('Connection') ||
            errorMessage.contains('timeout');
        showCupertinoDialog(
          context: context,
          builder: (dialogContext) => CupertinoAlertDialog(
            title: Text(AppLocalizations.of(context).bookDetailUploadFailed),
            content: Text(isNetworkError
                ? AppLocalizations.of(context).bookDetailNetworkError
                : AppLocalizations.of(context).bookDetailSaveError),
            actions: [
              CupertinoDialogAction(
                  child: Text(AppLocalizations.of(context).commonConfirm),
                  onPressed: () => Navigator.pop(dialogContext))
            ],
          ),
        );
      }
      return false;
    }
  }

  Future<void> _showImageSourceActionSheet(
      {required Function(Uint8List imageBytes, String ocrText, int? pageNumber)
          onImageSelected}) async {
    final sourceType = await showImageSourceSheet(context: context);
    if (sourceType == null || !mounted) return;

    switch (sourceType) {
      case ImageSourceType.documentScan:
        await scanDocumentAndExtractText(context, onImageSelected);
        break;
      case ImageSourceType.camera:
        await pickImageAndExtractText(
            context, ImageSource.camera, onImageSelected);
        break;
      case ImageSourceType.gallery:
        await pickImageAndExtractText(
            context, ImageSource.gallery, onImageSelected);
        break;
    }
  }

  Future<void> _deleteSelectedImages(MemorablePageViewModel memorableVm) async {
    if (memorableVm.selectedImageIds.isEmpty) return;

    final count = memorableVm.selectedImageIds.length;
    final confirmed =
        await showBatchDeleteConfirmationSheet(context: context, count: count);
    if (confirmed != true) return;

    final success = await memorableVm.deleteSelectedImages();
    if (success && mounted) {
      CustomSnackbar.show(context,
          message: '$count items deleted', type: BLabSnackbarType.success);
    }
  }

  void _showExistingImageModal(
      String imageId, String? initialImageUrl, String? extractedText,
      {int? pageNumber}) {
    final memorableVm = context.read<MemorablePageViewModel>();
    final bookVm = context.read<BookDetailViewModel>();

    // cachedImages에서 해당 이미지의 highlights 데이터 가져오기
    List<HighlightData>? initialHighlights;
    if (memorableVm.cachedImages != null) {
      final imageData = memorableVm.cachedImages!.firstWhere(
        (img) => img['id'] == imageId,
        orElse: () => <String, dynamic>{},
      );
      if (imageData.isNotEmpty && imageData['highlights'] != null) {
        initialHighlights = HighlightData.fromJsonList(imageData['highlights']);
      }
    }

    showExistingImageModal(
      context: context,
      imageId: imageId,
      initialImageUrl: initialImageUrl,
      initialExtractedText: extractedText,
      pageNumber: pageNumber,
      totalPages: bookVm.currentBook.totalPages,
      cachedEditedText: memorableVm.editedTexts[imageId],
      initialHighlights: initialHighlights,
      onFullScreenImage: (id, url) {
        if (url != null) {
          _showFullScreenImage(id, url, highlights: initialHighlights);
        }
      },
      onDeleteImage: (id, url, {bool dismissParentOnDelete = false}) async {
        final confirmed = await showDeleteConfirmationSheet(
            context: context,
            title: 'Delete?',
            message: 'This action cannot be undone.');
        if (confirmed != true) return;
        if (dismissParentOnDelete && mounted) Navigator.pop(context);
        await memorableVm.deleteBookImage(id);
      },
      onReExtractText: (
          {required String imageUrl,
          required void Function(String extractedText) onConfirm}) {
        if (!mounted) return;
        reExtractTextFromImage(context,
            imageUrl: imageUrl, onConfirm: onConfirm);
      },
      onReplaceImage: (
          {required String imageId,
          required String currentText,
          required void Function(String? newImageUrl) onReplaced}) async {
        final source = await showImageReplaceOptionsSheet(context: context);
        if (source != null && mounted) {
          final picker = ImagePicker();
          final pickedFile = await picker.pickImage(source: source);
          if (pickedFile == null) return;
          final imageBytes = await pickedFile.readAsBytes();
          if (!mounted) return;
          final newUrl = await memorableVm.replaceImage(
              imageId: imageId,
              imageBytes: imageBytes,
              extractedText: currentText,
              pageNumber: null);
          if (newUrl != null && mounted) {
            CustomSnackbar.show(context,
                message: AppLocalizations.of(context).bookDetailImageReplaced, type: BLabSnackbarType.success);
          }
          onReplaced(newUrl);
        }
      },
      onSave: (
          {required String imageId,
          required String extractedText,
          required int? pageNumber,
          required List<HighlightData>? highlights}) async {
        final success = await memorableVm.updateImageRecord(
            imageId: imageId,
            extractedText: extractedText,
            pageNumber: pageNumber,
            highlights: highlights);
        return success;
      },
      onTextEdited: (id, text) => memorableVm.setEditedText(id, text),
    );
  }

  bool _isBookCompleted(Book book) {
    return book.currentPage >= book.totalPages && book.totalPages > 0;
  }

  bool _isBookPlanned(Book book) {
    return book.status == BookStatus.planned.value;
  }

  bool _isBookPaused(Book book) {
    return book.status == BookStatus.willRetry.value;
  }

  bool _isBookReading(Book book) {
    return book.status == BookStatus.reading.value && !_isBookCompleted(book);
  }

  Widget _buildPlannedBookInfo(
      BuildContext context, Book book, BookDetailViewModel bookVm) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final daysUntilStart =
        book.plannedStartDate?.difference(DateTime.now()).inDays;

    return GestureDetector(
      onTap: () => _showEditPlannedBookDialog(bookVm),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: BLabColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.schedule_rounded,
                    color: BLabColors.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppLocalizations.of(context).bookDetailPlannedStart,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        book.plannedStartDate != null
                            ? '${DateFormat.yMMMd(Localizations.localeOf(context).languageCode).format(book.plannedStartDate!)}${daysUntilStart != null ? " (D${daysUntilStart >= 0 ? '-' : '+'}${daysUntilStart.abs()})" : ""}'
                            : AppLocalizations.of(context).bookDetailTbd,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                if (book.priority != null) ...[
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getPriorityColor(book.priority!)
                          .withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.flag_rounded,
                          size: 14,
                          color: _getPriorityColor(book.priority!),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _getPriorityLabel(context, book.priority!),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _getPriorityColor(book.priority!),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(width: 8),
                Icon(
                  CupertinoIcons.pencil,
                  color: isDark ? Colors.grey[500] : Colors.grey[400],
                  size: 18,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showEditPlannedBookDialog(BookDetailViewModel bookVm) async {
    final book = bookVm.currentBook;
    await EditPlannedBookDialog.show(
      context: context,
      currentPriority: book.priority,
      currentPlannedStartDate: book.plannedStartDate,
      onConfirm: (priority, plannedStartDate) async {
        final success =
            await bookVm.updatePlannedBookInfo(priority, plannedStartDate);
        if (success && mounted) {
          CustomSnackbar.show(
            context,
            message: '독서 계획이 수정되었습니다',
            type: BLabSnackbarType.success,
          );
        }
      },
    );
  }

  Widget _buildResumeReadingButton(
      BuildContext context, Book book, BookDetailViewModel bookVm) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progress =
        book.totalPages > 0 ? book.currentPage / book.totalPages : 0.0;

    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: isDark ? Colors.grey[700] : Colors.grey[200],
            valueColor: const AlwaysStoppedAnimation<Color>(BLabColors.primary),
            minHeight: 6,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Paused at: ${book.currentPage}p / ${book.totalPages}p (${(progress * 100).toInt()}%)',
          style: TextStyle(
            fontSize: 13,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => _showResumeReadingDialog(bookVm),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: isDark ? BLabColors.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: BLabColors.success.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.play_arrow_rounded,
                        color: BLabColors.success,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppLocalizations.of(context).bookDetailResumeReading,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          AppLocalizations.of(context).bookDetailAttemptCount(book.attemptCount + 1),
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Icon(
                  CupertinoIcons.chevron_right,
                  color: isDark ? Colors.grey[400] : Colors.grey[500],
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _showResumeReadingDialog(BookDetailViewModel bookVm) async {
    await UpdateTargetDateDialog.show(
      context: context,
      currentTargetDate: DateTime.now().add(const Duration(days: 14)),
      nextAttemptCount: bookVm.attemptCount + 1,
      onConfirm: (newDate, newAttempt) async {
        final success = await bookVm.resumeReading(newDate);
        if (success && mounted) {
          _scrollController.animateTo(0,
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeOutCubic);
          CustomSnackbar.show(context,
              message: AppLocalizations.of(context).bookDetailAttemptStarted(newAttempt),
              type: BLabSnackbarType.success,
              icon: Icons.play_arrow_rounded);
        } else if (!success && mounted && bookVm.shouldShowPaywall) {
          bookVm.clearPaywallState();
          final paywallSuccess = await SubscriptionService().showPaywall(context);
          if (!paywallSuccess && mounted) {
            CustomSnackbar.show(context, message: AppLocalizations.of(context).subscriptionUnavailable, type: BLabSnackbarType.info);
          }
        }
      },
    );
  }

  Color _getPriorityColor(int priority) {
    switch (priority) {
      case 1:
        return BLabColors.error;
      case 2:
        return BLabColors.warning;
      case 3:
        return BLabColors.primary;
      case 4:
        return BLabColors.successAlt;
      default:
        return Colors.grey;
    }
  }

  String _getPriorityLabel(BuildContext context, int priority) {
    final l10n = AppLocalizations.of(context);
    switch (priority) {
      case 1:
        return l10n.bookDetailPriorityUrgent;
      case 2:
        return l10n.bookDetailPriorityHigh;
      case 3:
        return l10n.bookDetailPriorityMedium;
      case 4:
        return l10n.bookDetailPriorityLow;
      default:
        return '';
    }
  }

  void _navigateToReadingStart(BuildContext context) {
    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            const ReadingStartScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 200),
      ),
    );
  }

  Future<void> _navigateToBookReview(BuildContext context, Book book) async {
    final result = await Navigator.push<bool>(
      context,
      CupertinoPageRoute(
        builder: (context) => BookReviewScreen(book: book),
      ),
    );

    if (result == true && mounted) {
      final bookVm = context.read<BookDetailViewModel>();
      await bookVm.refreshBook();
    }
  }

  Widget _buildBookReviewButton(BuildContext context, Book book) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasReview = book.longReview != null && book.longReview!.isNotEmpty;

    return GestureDetector(
      onTap: () => _navigateToBookReview(context, book),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: BLabColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    CupertinoIcons.pencil_outline,
                    color: BLabColors.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasReview ? AppLocalizations.of(context).bookDetailEditReview : AppLocalizations.of(context).bookDetailWriteReview,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hasReview
                          ? AppLocalizations.of(context).bookDetailReviewYourWritten
                          : AppLocalizations.of(context).bookDetailRecordThoughts,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Icon(
              CupertinoIcons.chevron_right,
              color: isDark ? Colors.grey[400] : Colors.grey[500],
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRestartReadingButton(BuildContext context, Book book) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => _navigateToReadingStart(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: BLabColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.refresh_rounded,
                    color: BLabColors.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppLocalizations.of(context).bookDetailContinueReading,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      AppLocalizations.of(context).bookDetailAchieveGoal,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Icon(
              CupertinoIcons.chevron_right,
              color: isDark ? Colors.grey[400] : Colors.grey[500],
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showPauseReadingConfirmation(BookDetailViewModel bookVm) async {
    final book = bookVm.currentBook;
    final confirmed = await showPauseReadingConfirmationSheet(
      context: context,
      currentPage: book.currentPage,
      totalPages: book.totalPages,
    );

    if (confirmed == true && mounted) {
      final success = await bookVm.pauseReading();
      if (success && mounted) {
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context).bookDetailReadingPaused,
          type: BLabSnackbarType.info,
          icon: CupertinoIcons.pause_circle,
        );
      }
    }
  }

  Future<void> _showDeleteConfirmation(BookDetailViewModel bookVm) async {
    final confirmed = await showDeleteConfirmationSheet(
      context: context,
      title: '독서를 삭제하시겠습니까?',
      message: '삭제된 독서 기록은 복구할 수 없습니다.',
    );

    if (confirmed == true && mounted) {
      final success = await BookService().deleteBook(bookVm.currentBook.id!);
      if (success && mounted) {
        await ReadingChartViewModel.clearCache();
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context).bookDetailDeleted,
          type: BLabSnackbarType.success,
        );
        Navigator.pop(context);
      }
    }
  }

  void _showRecallSearchSheet(BookDetailViewModel bookVm) {
    final recallVm = context.read<RecallViewModel>();
    showRecallSearchSheet(
      context: context,
      bookId: bookVm.currentBook.id!,
      existingViewModel: recallVm,
      onSourceTap: (source) async {
        if (source.type == 'photo_ocr' && source.sourceId != null) {
          final imageUrl =
              await RecallService().getImageUrlBySourceId(source.sourceId!);
          if (mounted) {
            _showExistingImageModal(
              source.sourceId!,
              imageUrl,
              source.content,
              pageNumber: source.pageNumber,
            );
          }
        }
      },
    );
  }


  void _showReadingTimerModal() {
    final bookVm = context.read<BookDetailViewModel>();

    showReadingTimerModal(
      context: context,
      bookId: bookVm.currentBook.id!,
      bookTitle: bookVm.currentBook.title,
      bookImageUrl: bookVm.currentBook.imageUrl,
      onTimerStopped: () {
        if (_isBookReading(bookVm.currentBook)) {
          _showUpdatePageDialog(bookVm);
        }
      },
    );
  }
}
