import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/book_list/view_model/book_list_view_model.dart';
import 'package:book_golas/ui/book_list/widgets/book_list_card.dart';
import 'package:book_golas/ui/book_list/widgets/book_list_skeleton.dart';
import 'package:book_golas/ui/book_list/widgets/planned_book_card.dart';
import 'package:book_golas/ui/book_list/widgets/paused_book_card.dart';
import 'package:book_golas/ui/book_list/widgets/completed_book_card.dart';
import 'package:book_golas/ui/core/widgets/scrollable_tab_bar.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/empty_state_view.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';
import 'package:book_golas/ui/reading_start/widgets/reading_start_screen.dart';

class BookListScreen extends StatefulWidget {
  const BookListScreen({super.key});

  @override
  State<BookListScreen> createState() => _BookListScreenState();
}

class _BookListScreenState extends State<BookListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late ScrollController _tabScrollController;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _tabScrollController = ScrollController();
    final vm = context.read<BookListViewModel>();
    _tabController = TabController(
        length: 5, vsync: this, initialIndex: vm.selectedTabIndex);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        vm.setSelectedTabIndex(_tabController.index);
      }
    });

    vm.addListener(_syncTabController);
  }

  void _syncTabController() {
    final vm = context.read<BookListViewModel>();
    if (_tabController.index != vm.selectedTabIndex) {
      _tabController.animateTo(vm.selectedTabIndex);
      _scrollToSelectedTab(vm.selectedTabIndex);
    }
  }

  void _scrollToSelectedTab(int index) {
    if (!_tabScrollController.hasClients) return;

    const tabWidth = 100.0;
    final screenWidth = MediaQuery.of(context).size.width;
    final targetOffset =
        (index * tabWidth) - (screenWidth / 2) + (tabWidth / 2);
    final clampedOffset = targetOffset.clamp(
      0.0,
      _tabScrollController.position.maxScrollExtent,
    );

    _tabScrollController.animateTo(
      clampedOffset,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  void dispose() {
    context.read<BookListViewModel>().removeListener(_syncTabController);
    _tabController.dispose();
    _tabScrollController.dispose();
    super.dispose();
  }

  Future<void> _onRefresh(BookListViewModel vm) async {
    if (_isRefreshing) return;

    setState(() {
      _isRefreshing = true;
    });

    await vm.refresh();

    if (mounted) {
      setState(() {
        _isRefreshing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Consumer<BookListViewModel>(
      builder: (context, vm, _) {
        return Column(
          children: [
            _buildTabBar(vm, isDark),
            Expanded(
              child: _buildBody(vm, isDark),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTabBar(BookListViewModel vm, bool isDark) {
    final l10n = AppLocalizations.of(context);
    return ScrollableTabBar(
      controller: _tabController,
      scrollController: _tabScrollController,
      selectedIndex: vm.selectedTabIndex,
      tabs: [
        l10n.bookListTabReading,
        l10n.bookListTabPlanned,
        l10n.bookListTabCompleted,
        l10n.bookListTabReread,
        l10n.bookListTabAll,
      ],
      onTabSelected: (index) => _scrollToSelectedTab(index),
    );
  }

  Widget _buildBody(BookListViewModel vm, bool isDark) {
    if (vm.isLoading && vm.books.isEmpty) {
      return const BookListSkeleton();
    }

    if (vm.errorMessage != null) {
      return _buildErrorState(isDark);
    }

    return TabBarView(
      controller: _tabController,
      children: [
        _buildReadingBooksTab(vm, isDark),
        _buildPlannedBooksTab(vm, isDark),
        _buildCompletedBooksTab(vm, isDark),
        _buildPausedBooksTab(vm, isDark),
        _buildAllBooksTab(vm, isDark),
      ],
    );
  }

  Widget _buildErrorState(bool isDark) {
    final l10n = AppLocalizations.of(context);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 60,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
          ),
          const SizedBox(height: 16),
          Text(
            l10n.bookListErrorLoadFailed,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.bookListErrorNetworkCheck,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),
          BLabButton(
            text: l10n.commonRetry,
            icon: Icons.refresh,
            onPressed: () {
              setState(() {});
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPlannedBooksTab(BookListViewModel vm, bool isDark) {
    final plannedBooks = vm.plannedBooks;
    final l10n = AppLocalizations.of(context);

    if (plannedBooks.isEmpty) {
      return EmptyStateView(message: l10n.bookListEmptyPlanned);
    }

    return RefreshIndicator(
      onRefresh: () => _onRefresh(vm),
      color: BLabColors.primary,
      backgroundColor: isDark ? BLabColors.elevatedDark : Colors.white,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 200),
        children: plannedBooks
            .map((book) => PlannedBookCard(
                  book: book,
                  onTap: () => _navigateToBookDetail(book),
                ))
            .toList(),
      ),
    );
  }

  Widget _buildPausedBooksTab(BookListViewModel vm, bool isDark) {
    final pausedBooks = vm.pausedBooks;
    final l10n = AppLocalizations.of(context);

    if (pausedBooks.isEmpty) {
      return EmptyStateView(message: l10n.bookListEmptyPaused);
    }

    return RefreshIndicator(
      onRefresh: () => _onRefresh(vm),
      color: BLabColors.primary,
      backgroundColor: isDark ? BLabColors.elevatedDark : Colors.white,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 200),
        children: pausedBooks
            .map((book) => PausedBookCard(
                  book: book,
                  onTap: () => _navigateToBookDetail(book),
                ))
            .toList(),
      ),
    );
  }

  Widget _buildReadingEmptyState(bool isDark, AppLocalizations l10n) {
    return EmptyStateView(
      message: l10n.bookListEmptyReading,
      showButton: true,
      buttonLabel: l10n.bookListReadingEmptyAction,
      onButtonPressed: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => const ReadingStartScreen(),
          ),
        );
      },
    );
  }

  Widget _buildAllBooksTab(BookListViewModel vm, bool isDark) {
    final allBooks = vm.books;
    final l10n = AppLocalizations.of(context);

    if (allBooks.isEmpty) {
      return EmptyStateView(message: l10n.bookListEmptyAll);
    }

    return RefreshIndicator(
      onRefresh: () => _onRefresh(vm),
      color: BLabColors.primary,
      backgroundColor: isDark ? BLabColors.elevatedDark : Colors.white,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPersistentHeader(
            pinned: true,
            delegate: _FilterBadgeHeaderDelegate(
              isDark: isDark,
              selectedFilter: vm.allTabFilter,
              onFilterChanged: vm.setAllTabFilter,
              readingCount: vm.readingBooks.length,
              plannedCount: vm.plannedBooks.length,
              completedCount: vm.completedBooks.length,
              pausedCount: vm.pausedBooks.length,
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 200),
            sliver: SliverList(
              delegate: SliverChildListDelegate(
                _buildFilteredContent(vm, isDark),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildFilteredContent(BookListViewModel vm, bool isDark) {
    switch (vm.allTabFilter) {
      case AllTabFilter.all:
        return _buildAllSectionsContent(vm, isDark);
      case AllTabFilter.reading:
        return _buildSingleStatusContent(vm.readingBooks, '독서 중', isDark,
            isReading: true);
      case AllTabFilter.planned:
        return _buildSingleStatusContent(vm.plannedBooks, '읽을 예정', isDark);
      case AllTabFilter.completed:
        return _buildSingleStatusContent(vm.completedBooks, '완독', isDark);
      case AllTabFilter.paused:
        return _buildSingleStatusContent(vm.pausedBooks, '다시 읽을 책', isDark);
    }
  }

  List<Widget> _buildAllSectionsContent(BookListViewModel vm, bool isDark) {
    final List<Widget> widgets = [];

    if (vm.readingBooks.isNotEmpty) {
      widgets.addAll(_buildSection(
        title: '독서 중',
        count: vm.readingBooks.length,
        books: vm.readingBooks,
        isDark: isDark,
        isReading: true,
      ));
    }

    if (vm.plannedBooks.isNotEmpty) {
      widgets.addAll(_buildSection(
        title: '읽을 예정',
        count: vm.plannedBooks.length,
        books: vm.plannedBooks,
        isDark: isDark,
        showDivider: widgets.isNotEmpty,
      ));
    }

    if (vm.completedBooks.isNotEmpty) {
      widgets.addAll(_buildSection(
        title: '완독',
        count: vm.completedBooks.length,
        books: vm.completedBooks,
        isDark: isDark,
        showDivider: widgets.isNotEmpty,
      ));
    }

    if (vm.pausedBooks.isNotEmpty) {
      widgets.addAll(_buildSection(
        title: '다시 읽을 책',
        count: vm.pausedBooks.length,
        books: vm.pausedBooks,
        isDark: isDark,
        showDivider: widgets.isNotEmpty,
      ));
    }

    return widgets;
  }

  List<Widget> _buildSection({
    required String title,
    required int count,
    required List<Book> books,
    required bool isDark,
    bool showDivider = false,
    bool isReading = false,
  }) {
    return [
      if (showDivider) ...[
        const SizedBox(height: 24),
        Divider(color: isDark ? Colors.grey[700] : Colors.grey[300]),
        const SizedBox(height: 24),
      ],
      Text(
        '$title ($count)',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: isDark ? Colors.white : Colors.black,
        ),
      ),
      const SizedBox(height: 12),
      ...books.map((book) => isReading
          ? BookListCard(
              book: book,
              onTap: () => _navigateToBookDetail(book),
            )
          : _buildBookCardByStatus(book, isDark)),
    ];
  }

  List<Widget> _buildSingleStatusContent(
      List<Book> books, String title, bool isDark,
      {bool isReading = false}) {
    if (books.isEmpty) {
      return [
        const SizedBox(height: 100),
        Center(
          child: Text(
            '$title 책이 없습니다',
            style: TextStyle(
              fontSize: 16,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
        ),
      ];
    }

    return [
      Text(
        '$title (${books.length})',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: isDark ? Colors.white : Colors.black,
        ),
      ),
      const SizedBox(height: 12),
      ...books.map((book) => isReading
          ? BookListCard(
              book: book,
              onTap: () => _navigateToBookDetail(book),
            )
          : _buildBookCardByStatus(book, isDark)),
    ];
  }

  Widget _buildBookCardByStatus(Book book, bool isDark) {
    final isCompleted = book.status == 'completed' ||
        (book.currentPage >= book.totalPages && book.totalPages > 0);

    if (isCompleted) {
      return CompletedBookCard(
        book: book,
        onTap: () => _navigateToBookDetail(book),
      );
    }

    switch (book.status) {
      case 'planned':
        return PlannedBookCard(
          book: book,
          onTap: () => _navigateToBookDetail(book),
        );
      case 'will_retry':
        return PausedBookCard(
          book: book,
          onTap: () => _navigateToBookDetail(book),
        );
      default:
        return BookListCard(
          book: book,
          onTap: () => _navigateToBookDetail(book),
        );
    }
  }

  Widget _buildReadingBooksTab(BookListViewModel vm, bool isDark) {
    final readingBooks = vm.readingBooks;
    final l10n = AppLocalizations.of(context);

    if (readingBooks.isEmpty) {
      return _buildReadingEmptyState(isDark, l10n);
    }

    return RefreshIndicator(
      onRefresh: () => _onRefresh(vm),
      color: BLabColors.primary,
      backgroundColor: isDark ? BLabColors.elevatedDark : Colors.white,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 200),
        children: readingBooks
            .map((book) => BookListCard(
                  book: book,
                  onTap: () => _navigateToBookDetail(book),
                ))
            .toList(),
      ),
    );
  }

  Widget _buildCompletedBooksTab(BookListViewModel vm, bool isDark) {
    final completedBooks = vm.completedBooks;
    final l10n = AppLocalizations.of(context);

    if (completedBooks.isEmpty) {
      return EmptyStateView(message: l10n.bookListEmptyCompleted);
    }

    return RefreshIndicator(
      onRefresh: () => _onRefresh(vm),
      color: BLabColors.primary,
      backgroundColor: isDark ? BLabColors.elevatedDark : Colors.white,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 200),
        children: completedBooks
            .map((book) => CompletedBookCard(
                  book: book,
                  onTap: () => _navigateToBookDetail(book),
                ))
            .toList(),
      ),
    );
  }

  void _navigateToBookDetail(Book book, {String? currentBookId}) async {
    final isSameBook = currentBookId != null && currentBookId == book.id;

    if (isSameBook) {
      await Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => BookDetailScreen(book: book),
        ),
      );
    } else {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => BookDetailScreen(book: book),
        ),
      );
    }
    if (mounted) {
      context.read<BookListViewModel>().refresh();
    }
  }
}

class _FilterBadgeHeaderDelegate extends SliverPersistentHeaderDelegate {
  final bool isDark;
  final AllTabFilter selectedFilter;
  final ValueChanged<AllTabFilter> onFilterChanged;
  final int readingCount;
  final int plannedCount;
  final int completedCount;
  final int pausedCount;

  _FilterBadgeHeaderDelegate({
    required this.isDark,
    required this.selectedFilter,
    required this.onFilterChanged,
    required this.readingCount,
    required this.plannedCount,
    required this.completedCount,
    required this.pausedCount,
  });

  @override
  double get minExtent => 52;

  @override
  double get maxExtent => 52;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    final l10n = AppLocalizations.of(context);
    return Container(
      color: isDark ? BLabColors.scaffoldDark : Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildFilterBadge(l10n.bookListFilterAll, AllTabFilter.all, null),
            const SizedBox(width: 8),
            _buildFilterBadge(
                l10n.bookListTabReading, AllTabFilter.reading, readingCount),
            const SizedBox(width: 8),
            _buildFilterBadge(
                l10n.bookListTabPlanned, AllTabFilter.planned, plannedCount),
            const SizedBox(width: 8),
            _buildFilterBadge(l10n.bookListTabCompleted, AllTabFilter.completed,
                completedCount),
            const SizedBox(width: 8),
            _buildFilterBadge(
                l10n.bookListTabReread, AllTabFilter.paused, pausedCount),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterBadge(String label, AllTabFilter filter, int? count) {
    final isSelected = selectedFilter == filter;
    final displayText = count != null ? '$label ($count)' : label;

    return GestureDetector(
      onTap: () => onFilterChanged(filter),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? Colors.white : Colors.black)
              : (isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.05)),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? Colors.transparent
                : (isDark
                    ? Colors.white.withValues(alpha: 0.2)
                    : Colors.black.withValues(alpha: 0.1)),
            width: 1,
          ),
        ),
        child: Text(
          displayText,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected
                ? (isDark ? Colors.black : Colors.white)
                : (isDark ? Colors.white : Colors.black),
          ),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _FilterBadgeHeaderDelegate oldDelegate) {
    return oldDelegate.selectedFilter != selectedFilter ||
        oldDelegate.isDark != isDark ||
        oldDelegate.readingCount != readingCount ||
        oldDelegate.plannedCount != plannedCount ||
        oldDelegate.completedCount != completedCount ||
        oldDelegate.pausedCount != pausedCount;
  }
}
