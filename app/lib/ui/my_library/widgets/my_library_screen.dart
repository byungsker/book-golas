import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/recall_models.dart';
import 'package:book_golas/domain/models/reading_record.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/my_library/view_model/my_library_view_model.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_tab_bar.dart';
import 'package:book_golas/ui/core/widgets/empty_state_view.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/book_list/widgets/book_list_card.dart';
import 'package:book_golas/ui/my_library/widgets/my_library_book_skeleton.dart';
import 'package:book_golas/ui/my_library/widgets/my_library_record_skeleton.dart';
import 'package:book_golas/ui/my_library/widgets/record_list_item.dart';
import 'package:book_golas/ui/recall/widgets/global_recall_search_sheet.dart';
import 'package:book_golas/ui/recall/widgets/record_detail_sheet.dart';

class MyLibraryScreen extends StatefulWidget {
  const MyLibraryScreen({super.key});

  static final GlobalKey<_MyLibraryScreenState> globalKey =
      GlobalKey<_MyLibraryScreenState>();

  static void cycleToNextTab() {
    globalKey.currentState?.cycleToNextTab();
  }

  @override
  State<MyLibraryScreen> createState() => _MyLibraryScreenState();
}

class _MyLibraryScreenState extends State<MyLibraryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _readingSearchController =
      TextEditingController();
  final TextEditingController _reviewSearchController = TextEditingController();
  Timer? _readingDebounceTimer;
  Timer? _reviewDebounceTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    _readingSearchController.addListener(_onSearchTextChanged);
    _reviewSearchController.addListener(_onSearchTextChanged);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MyLibraryViewModel>().loadBooks();
    });
  }

  void _onSearchTextChanged() {
    setState(() {});
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      context
          .read<MyLibraryViewModel>()
          .setSelectedTabIndex(_tabController.index);
    }
  }

  void cycleToNextTab() {
    final nextIndex = (_tabController.index + 1) % 3;
    _tabController.animateTo(nextIndex);
  }

  void _onReadingSearchChanged(String query) {
    _readingDebounceTimer?.cancel();
    _readingDebounceTimer = Timer(const Duration(milliseconds: 300), () {
      context.read<MyLibraryViewModel>().setReadingSearchQuery(query);
    });
  }

  void _onReviewSearchChanged(String query) {
    _reviewDebounceTimer?.cancel();
    _reviewDebounceTimer = Timer(const Duration(milliseconds: 300), () {
      context.read<MyLibraryViewModel>().setReviewSearchQuery(query);
    });
  }

  @override
  void dispose() {
    _readingDebounceTimer?.cancel();
    _reviewDebounceTimer?.cancel();
    _readingSearchController.removeListener(_onSearchTextChanged);
    _reviewSearchController.removeListener(_onSearchTextChanged);
    _readingSearchController.dispose();
    _reviewSearchController.dispose();
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _navigateToBookDetail(Book book, {int? initialTabIndex}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BookDetailScreen(
          book: book,
          initialTabIndex: initialTabIndex,
        ),
      ),
    );
  }

  void _navigateToBookDetailById(String bookId, {int? initialTabIndex}) async {
    final vm = context.read<MyLibraryViewModel>();
    final book = vm.books.firstWhere(
      (b) => b.id == bookId,
      orElse: () => vm.books.first,
    );
    _navigateToBookDetail(book, initialTabIndex: initialTabIndex);
  }

  void _openGlobalSearch() {
    showGlobalRecallSearchSheet(
      context: context,
      onSourceTap: (source) {
        if (source.bookId != null) {
          _navigateToBookDetailById(source.bookId!, initialTabIndex: 0);
        }
      },
    );
  }

  RecallSource _recordToSource(ReadingRecord record) {
    return RecallSource(
      type: record.contentType,
      content: record.contentText,
      pageNumber: record.pageNumber,
      sourceId: record.sourceId,
      createdAt: record.createdAt,
      bookId: record.bookId,
      bookTitle: record.bookTitle,
    );
  }

  void _showRecordDetail(ReadingRecord record) {
    final source = _recordToSource(record);
    showRecordDetailSheet(
      context: context,
      source: source,
      onGoToBook: () => _navigateToBookDetailById(
        record.bookId,
        initialTabIndex: 0,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight,
      appBar: AppBar(
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text(AppLocalizations.of(context).myLibraryTitle),
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: isDark ? Colors.white : Colors.black,
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(kToolbarHeight),
          child: Selector<MyLibraryViewModel, (int, int, int)>(
            selector: (_, vm) => (
              vm.allBooks.length,
              vm.booksWithReview.length,
              vm.totalRecordCount
            ),
            builder: (context, counts, _) {
              final (allCount, reviewCount, recordCount) = counts;
              return LiquidGlassTabBar(
                controller: _tabController,
                tabs: [
                  '${AppLocalizations.of(context).myLibraryTabReading} ($allCount)',
                  '${AppLocalizations.of(context).myLibraryTabReview} ($reviewCount)',
                  '${AppLocalizations.of(context).myLibraryTabRecord} ($recordCount)',
                ],
              );
            },
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildReadingTab(isDark),
          _buildReviewTab(isDark),
          _buildRecordTab(isDark),
        ],
      ),
    );
  }

  Widget _buildSearchBar({
    required bool isDark,
    required TextEditingController controller,
    required ValueChanged<String> onChanged,
    required VoidCallback onClear,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: AppLocalizations.of(context).myLibrarySearchHint,
          hintStyle: TextStyle(
            color: isDark
                ? Colors.white.withValues(alpha: 0.4)
                : Colors.black.withValues(alpha: 0.4),
            fontSize: 14,
          ),
          prefixIcon: Icon(
            CupertinoIcons.search,
            color: isDark
                ? Colors.white.withValues(alpha: 0.5)
                : Colors.black.withValues(alpha: 0.5),
            size: 20,
          ),
          suffixIcon: controller.text.isNotEmpty
              ? GestureDetector(
                  onTap: () {
                    controller.clear();
                    onClear();
                  },
                  child: Icon(
                    CupertinoIcons.xmark_circle_fill,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.4)
                        : Colors.black.withValues(alpha: 0.4),
                    size: 18,
                  ),
                )
              : null,
          filled: true,
          fillColor: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.04),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.2)
                  : Colors.black.withValues(alpha: 0.1),
            ),
          ),
        ),
        style: TextStyle(
          color: isDark ? Colors.white : Colors.black,
          fontSize: 14,
        ),
      ),
    );
  }

  Widget _buildFilterSection(bool isDark) {
    return Consumer<MyLibraryViewModel>(
      builder: (context, vm, _) {
        if (vm.availableYears.isEmpty) return const SizedBox.shrink();

        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Row(
            children: [
              _buildFilterChip(
                AppLocalizations.of(context).myLibraryFilterAll,
                vm.selectedYear == null,
                isDark,
                () => vm.setSelectedYear(null),
              ),
              ...vm.availableYears.map(
                (year) => Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: _buildFilterChip(
                    '$year',
                    vm.selectedYear == year,
                    isDark,
                    () => vm.setSelectedYear(year),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilterChip(
    String label,
    bool isSelected,
    bool isDark,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark
                  ? Colors.white.withValues(alpha: 0.2)
                  : Colors.black.withValues(alpha: 0.1))
              : (isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.04)),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? (isDark
                    ? Colors.white.withValues(alpha: 0.3)
                    : Colors.black.withValues(alpha: 0.2))
                : Colors.transparent,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            color: isDark ? Colors.white : Colors.black,
          ),
        ),
      ),
    );
  }

  Widget _buildReadingTab(bool isDark) {
    return Column(
      children: [
        _buildSearchBar(
          isDark: isDark,
          controller: _readingSearchController,
          onChanged: _onReadingSearchChanged,
          onClear: () =>
              context.read<MyLibraryViewModel>().setReadingSearchQuery(''),
        ),
        _buildFilterSection(isDark),
        Expanded(
          child: Consumer<MyLibraryViewModel>(
            builder: (context, vm, _) {
              if (vm.isLoading && vm.books.isEmpty) {
                return const MyLibraryBookSkeleton();
              }

              final books = vm.filteredBooks;

              if (books.isEmpty) {
                final emptyMessage = vm.readingSearchQuery.isNotEmpty
                    ? AppLocalizations.of(context).myLibraryNoSearchResults
                    : AppLocalizations.of(context).myLibraryNoBooks;
                return EmptyStateView(message: emptyMessage);
              }

              return ListView.builder(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                itemCount: books.length,
                itemBuilder: (context, index) {
                  final book = books[index];
                  return BookListCard(
                    book: book,
                    onTap: () => _navigateToBookDetail(book),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildReviewTab(bool isDark) {
    return Column(
      children: [
        _buildSearchBar(
          isDark: isDark,
          controller: _reviewSearchController,
          onChanged: _onReviewSearchChanged,
          onClear: () =>
              context.read<MyLibraryViewModel>().setReviewSearchQuery(''),
        ),
        Expanded(
          child: Consumer<MyLibraryViewModel>(
            builder: (context, vm, _) {
              if (vm.isLoading && vm.books.isEmpty) {
                return const MyLibraryBookSkeleton();
              }

              final books = vm.booksWithReview;

              if (books.isEmpty) {
                final emptyMessage = vm.reviewSearchQuery.isNotEmpty
                    ? AppLocalizations.of(context).myLibraryNoSearchResults
                    : AppLocalizations.of(context).myLibraryNoReviewBooks;
                return EmptyStateView(message: emptyMessage);
              }

              return ListView.builder(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                itemCount: books.length,
                itemBuilder: (context, index) {
                  final book = books[index];
                  return BookListCard(
                    book: book,
                    onTap: () =>
                        _navigateToBookDetail(book, initialTabIndex: 2),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRecordTab(bool isDark) {
    return Column(
      children: [
        _buildRecordHeader(isDark),
        _buildRecordTypeFilter(isDark),
        Expanded(
          child: Consumer<MyLibraryViewModel>(
            builder: (context, vm, _) {
              if (vm.isLoadingRecords && vm.groupedRecords.isEmpty) {
                return const MyLibraryRecordSkeleton();
              }

              final groups = vm.groupedRecords;

              if (groups.isEmpty) {
                return EmptyStateView(
                    message: AppLocalizations.of(context).myLibraryNoRecords);
              }

              return ListView.builder(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                itemCount: groups.length,
                itemBuilder: (context, index) {
                  final group = groups[index];
                  return GroupedRecordSection(
                    group: group,
                    isExpanded: vm.isBookExpanded(group.bookId),
                    onToggleExpand: () => vm.toggleBookExpanded(group.bookId),
                    onBookTap: () => _navigateToBookDetailById(
                      group.bookId,
                      initialTabIndex: 1,
                    ),
                    onRecordTap: _showRecordDetail,
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRecordHeader(bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: _openGlobalSearch,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.04),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: BLabColors.primary.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.auto_awesome,
                        color: BLabColors.primary,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      AppLocalizations.of(context).myLibraryAiSearch,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.6)
                            : Colors.black.withValues(alpha: 0.5),
                      ),
                    ),
                    const Spacer(),
                    FaIcon(
                      FontAwesomeIcons.circleArrowUp,
                      size: 18,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.4)
                          : Colors.black.withValues(alpha: 0.4),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecordTypeFilter(bool isDark) {
    return Consumer<MyLibraryViewModel>(
      builder: (context, vm, _) {
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Row(
            children: [
              _buildFilterChip(
                AppLocalizations.of(context).myLibraryFilterAll,
                vm.selectedRecordType == null,
                isDark,
                () => vm.setSelectedRecordType(null),
              ),
              const SizedBox(width: 8),
              _buildFilterChip(
                AppLocalizations.of(context).myLibraryFilterHighlight,
                vm.selectedRecordType == 'highlight',
                isDark,
                () => vm.setSelectedRecordType('highlight'),
              ),
              const SizedBox(width: 8),
              _buildFilterChip(
                AppLocalizations.of(context).myLibraryFilterMemo,
                vm.selectedRecordType == 'note',
                isDark,
                () => vm.setSelectedRecordType('note'),
              ),
              const SizedBox(width: 8),
              _buildFilterChip(
                AppLocalizations.of(context).myLibraryFilterPhoto,
                vm.selectedRecordType == 'photo_ocr',
                isDark,
                () => vm.setSelectedRecordType('photo_ocr'),
              ),
            ],
          ),
        );
      },
    );
  }

}
