import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/domain/models/home_display_mode.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/home/view_model/home_view_model.dart';
import 'package:book_golas/ui/home/widgets/home_mode_toggle_button.dart';
import 'package:book_golas/ui/home/widgets/pro_upgrade_banner.dart';
import 'package:book_golas/ui/book_list/view_model/book_list_view_model.dart';
import 'package:book_golas/ui/book_list/widgets/book_list_screen.dart';
import 'package:book_golas/ui/book_list/widgets/sheets/reading_books_selection_sheet.dart';
import 'package:book_golas/ui/reading_progress/widgets/reading_progress_screen.dart';
import 'package:book_golas/ui/subscription/view_model/subscription_view_model.dart';

class HomeScreen extends StatefulWidget {
  final void Function(VoidCallback updatePage, VoidCallback addMemorable)?
      onCallbacksReady;

  const HomeScreen({
    super.key,
    this.onCallbacksReady,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final GlobalKey<HomeModeToggleButtonState> _toggleButtonKey = GlobalKey();



  void _toggleDisplayMode(HomeViewModel vm) {
    if (vm.displayMode == HomeDisplayMode.allBooks) {
      vm.setDisplayMode(HomeDisplayMode.readingDetail);
      _handleReadingDetailMode(vm);
    } else {
      vm.setDisplayMode(HomeDisplayMode.allBooks);
      _showModeChangeSnackBar(
          AppLocalizations.of(context).homeViewAllBooksMessage);
    }
  }

  void _handleReadingDetailMode(HomeViewModel vm) {
    final bookListVm = context.read<BookListViewModel>();
    final readingBooks = bookListVm.readingBooks;

    if (readingBooks.isEmpty) {
      CustomSnackbar.show(
        context,
        message: AppLocalizations.of(context).homeNoReadingBooksShort,
        type: BLabSnackbarType.info,
        bottomOffset: 100,
      );
      vm.setDisplayMode(HomeDisplayMode.allBooks);
      return;
    }

    if (readingBooks.length == 1) {
      vm.setSelectedBook(readingBooks.first.id!);
      _showModeChangeSnackBar(
          AppLocalizations.of(context).homeViewReadingMessage);
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ReadingBooksSelectionSheet(
        books: readingBooks,
        onBookSelected: (book) {
          Navigator.pop(context);
          vm.setSelectedBook(book.id!);
          _showModeChangeSnackBar(
              AppLocalizations.of(context).homeViewReadingMessage);
        },
      ),
    );
  }

  void _showModeChangeSnackBar(String message) {
    _toggleButtonKey.currentState?.triggerTransitionAnimation();
    CustomSnackbar.show(
      context,
      message: message,
      type: BLabSnackbarType.success,
      bottomOffset: 100,
    );
  }

  String _getToggleButtonLabel(HomeDisplayMode mode) {
    final l10n = AppLocalizations.of(context);
    return mode == HomeDisplayMode.readingDetail
        ? l10n.homeViewAllBooks
        : l10n.homeViewReadingOnly;
  }

  Book? _findSelectedBook(String? bookId, List<Book> books) {
    if (bookId == null) return null;
    try {
      return books.firstWhere((b) => b.id == bookId);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Consumer2<HomeViewModel, BookListViewModel>(
      builder: (context, vm, bookListVm, _) {
        if (!vm.isPreferencesLoaded) {
          return Scaffold(
            backgroundColor:
                isDark ? BLabColors.scaffoldDark : BLabColors.elevatedLight,
            body: const SizedBox.shrink(),
          );
        }

        final selectedBook =
            _findSelectedBook(vm.selectedBookId, bookListVm.books);
        final isReadingDetailMode =
            vm.displayMode == HomeDisplayMode.readingDetail;
        final isReadingDetail = isReadingDetailMode && selectedBook != null;

        if (isReadingDetailMode &&
            selectedBook == null &&
            bookListVm.isLoading) {
          return Scaffold(
            backgroundColor:
                isDark ? BLabColors.scaffoldDark : BLabColors.elevatedLight,
            body: const SizedBox.shrink(),
          );
        }

        if (isReadingDetail) {
          return SafeArea(
            bottom: false,
            child: Column(
              children: [
                _buildReadingDetailHeader(vm, isDark),
                Expanded(
                  child: ReadingProgressScreen(
                    book: selectedBook,
                    onCallbacksReady: widget.onCallbacksReady,
                  ),
                ),
              ],
            ),
          );
        }

        return Scaffold(
          backgroundColor:
              isDark ? BLabColors.scaffoldDark : BLabColors.elevatedLight,
          appBar: _buildAppBar(vm, isDark),
          body: Column(
            children: [
              Consumer<SubscriptionViewModel>(
                builder: (context, subscriptionVm, _) =>
                    !subscriptionVm.isProUser
                        ? ProUpgradeBanner(
                            onTap: () => subscriptionVm.showPaywall(context),
                          )
                        : const SizedBox.shrink(),
              ),
              const Expanded(
                child: BookListScreen(),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildReadingDetailHeader(HomeViewModel vm, bool isDark) {
    return Container(
      height: kToolbarHeight,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          HomeModeToggleButton(
            key: _toggleButtonKey,
            label: _getToggleButtonLabel(vm.displayMode),
            icon: Icons.sync_alt,
            onTap: () => _toggleDisplayMode(vm),
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(HomeViewModel vm, bool isDark) {
    return AppBar(
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      scrolledUnderElevation: 0,
      title: Text(AppLocalizations.of(context).homeBookList),
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: isDark ? Colors.white : Colors.black,
      ),
      actions: [
        HomeModeToggleButton(
          key: _toggleButtonKey,
          label: _getToggleButtonLabel(vm.displayMode),
          icon: Icons.sync_alt,
          onTap: () => _toggleDisplayMode(vm),
        ),
      ],
    );
  }
}
