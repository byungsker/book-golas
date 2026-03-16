import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/domain/models/recall_models.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/keyboard_accessory_bar.dart';
import 'package:book_golas/ui/recall/view_model/global_recall_view_model.dart';
import 'package:book_golas/ui/recall/widgets/record_detail_sheet.dart';
import 'package:book_golas/l10n/app_localizations.dart';

Future<void> showGlobalRecallSearchSheet({
  required BuildContext context,
  void Function(RecallSource source)? onSourceTap,
}) async {
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    isDismissible: false,
    enableDrag: false,
    builder: (sheetContext) {
      return ChangeNotifierProvider(
        create: (_) => GlobalRecallViewModel()..loadGlobalRecentSearches(),
        child: _GlobalRecallSearchSheetContent(
          onSourceTap: onSourceTap,
        ),
      );
    },
  );
}

class _GlobalRecallSearchSheetContent extends StatefulWidget {
  final void Function(RecallSource source)? onSourceTap;

  const _GlobalRecallSearchSheetContent({
    this.onSourceTap,
  });

  @override
  State<_GlobalRecallSearchSheetContent> createState() =>
      _GlobalRecallSearchSheetContentState();
}

class _GlobalRecallSearchSheetContentState
    extends State<_GlobalRecallSearchSheetContent> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  double _sheetSize = 0.9;
  bool _hideKeyboardAccessory = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final viewModel = context.read<GlobalRecallViewModel>();
      if (viewModel.searchResult == null) {
        _focusNode.requestFocus();
      }
    });
  }

  void _onFocusChange() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _search(String query) {
    if (query.trim().isEmpty) return;
    FocusScope.of(context).unfocus();
    context.read<GlobalRecallViewModel>().search(query.trim());
  }

  void _copyAnswer(String answer) {
    Clipboard.setData(ClipboardData(text: answer));
    CustomSnackbar.show(
      context,
      message: AppLocalizations.of(context).recallTextCopied,
      type: BLabSnackbarType.success,
      bottomOffset: 32,
    );
  }

  void _goToHome() {
    _controller.clear();
    context.read<GlobalRecallViewModel>().clearResult();
    _focusNode.requestFocus();
  }

  void _handleHeaderDrag(DragUpdateDetails details) {
    if (details.primaryDelta! > 0) {
      setState(() {
        _sheetSize -=
            details.primaryDelta! / MediaQuery.of(context).size.height;
        _sheetSize = _sheetSize.clamp(0.3, 0.95);
      });
    } else if (details.primaryDelta! < 0) {
      setState(() {
        _sheetSize -=
            details.primaryDelta! / MediaQuery.of(context).size.height;
        _sheetSize = _sheetSize.clamp(0.3, 0.95);
      });
    }
  }

  void _handleHeaderDragEnd(DragEndDetails details) {
    if (_sheetSize < 0.4) {
      Navigator.pop(context);
    } else if (_sheetSize < 0.7) {
      setState(() => _sheetSize = 0.5);
    } else {
      setState(() => _sheetSize = 0.9);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final viewModel = context.watch<GlobalRecallViewModel>();
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardOpen = keyboardHeight > 0;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
      height: MediaQuery.of(context).size.height * _sheetSize,
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              color: isDark ? BLabColors.surfaceDark : Colors.white,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Column(
              children: [
                GestureDetector(
                  onVerticalDragUpdate: _handleHeaderDrag,
                  onVerticalDragEnd: _handleHeaderDragEnd,
                  child: Container(
                    color: Colors.transparent,
                    child: Column(
                      children: [
                        Container(
                          margin: const EdgeInsets.symmetric(vertical: 12),
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: isDark ? Colors.grey[700] : Colors.grey[300],
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color:
                                      BLabColors.primary.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.auto_awesome,
                                  color: BLabColors.primary,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                AppLocalizations.of(context)
                                    .recallSearchAllRecords,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white : Colors.black,
                                ),
                              ),
                              const Spacer(),
                              IconButton(
                                icon: Icon(
                                  CupertinoIcons.xmark,
                                  color: isDark
                                      ? Colors.grey[400]
                                      : Colors.grey[600],
                                ),
                                onPressed: () => Navigator.pop(context),
                              ),
                            ],
                          ),
                        ),
                        const Divider(),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          focusNode: _focusNode,
                          decoration: InputDecoration(
                            hintText: AppLocalizations.of(context).recallGlobalSearchHint,
                            hintStyle: TextStyle(
                              color:
                                  isDark ? Colors.grey[500] : Colors.grey[400],
                            ),
                            prefixIcon: Container(
                              padding: const EdgeInsets.all(8),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color:
                                      BLabColors.primary.withValues(alpha: 0.15),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.auto_awesome,
                                  color: BLabColors.primary,
                                  size: 16,
                                ),
                              ),
                            ),
                            suffixIcon: IconButton(
                              icon: FaIcon(
                                FontAwesomeIcons.circleArrowUp,
                                size: 20,
                                color: _controller.text.isEmpty
                                    ? (isDark
                                        ? Colors.grey[600]
                                        : Colors.grey[400])
                                    : BLabColors.primary,
                              ),
                              onPressed: () => _search(_controller.text),
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            filled: true,
                            fillColor: isDark
                                ? BLabColors.elevatedDark
                                : Colors.grey[100],
                          ),
                          onSubmitted: _search,
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                      if (viewModel.searchResult != null) ...[
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: _goToHome,
                          child: Container(
                            height: 48,
                            width: 48,
                            decoration: BoxDecoration(
                              color: isDark
                                  ? BLabColors.elevatedDark
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              CupertinoIcons.arrow_counterclockwise,
                              size: 20,
                              color:
                                  isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Expanded(
                  child: _buildContent(viewModel, isDark),
                ),
              ],
            ),
          ),
          if (isKeyboardOpen && _focusNode.hasFocus && !_hideKeyboardAccessory)
            Positioned(
              left: 0,
              right: 0,
              bottom: keyboardHeight,
              child: KeyboardAccessoryBar(
                isDark: isDark,
                showNavigation: false,
                onDone: () {
                  setState(() => _hideKeyboardAccessory = true);
                  SystemChannels.textInput.invokeMethod('TextInput.hide');
                  Future.delayed(const Duration(milliseconds: 300), () {
                    if (mounted) {
                      setState(() => _hideKeyboardAccessory = false);
                    }
                  });
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildContent(GlobalRecallViewModel viewModel, bool isDark) {
    if (viewModel.isSearching) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: BLabColors.primary),
            const SizedBox(height: 16),
            Text(
              AppLocalizations.of(context).recallSearchingAllBooks,
              style: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    if (viewModel.errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              viewModel.shouldShowPaywall
                  ? Icons.lock_outline
                  : Icons.error_outline,
              size: 48,
              color: viewModel.shouldShowPaywall
                  ? BLabColors.primary
                  : (isDark ? Colors.grey[600] : Colors.grey[400]),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                viewModel.errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ),
            if (viewModel.shouldShowPaywall) ...[
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () async {
                  viewModel.clearPaywallState();
                  final success = await SubscriptionService().showPaywall(context);
                  if (!success && context.mounted) {
                    CustomSnackbar.show(context, message: AppLocalizations.of(context).subscriptionUnavailable, type: BLabSnackbarType.info);
                  }
                },
                icon: const Icon(Icons.star, size: 18),
                label: const Text('Pro 업그레이드'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: BLabColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ],
        ),
      );
    }

    if (viewModel.searchResult != null) {
      return _buildSearchResult(viewModel, isDark);
    }

    return _buildInitialContent(viewModel, isDark);
  }

  Widget _buildInitialContent(GlobalRecallViewModel viewModel, bool isDark) {
    final hasRecentSearches = viewModel.recentSearches.isNotEmpty;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      children: [
        if (hasRecentSearches) ...[
          _buildRecentSearchesSection(viewModel, isDark),
          const SizedBox(height: 24),
        ],
        _buildEmptyState(isDark),
      ],
    );
  }

  Widget _buildRecentSearchesSection(
      GlobalRecallViewModel viewModel, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              AppLocalizations.of(context).recallRecentGlobalSearches,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.grey[300] : Colors.grey[700],
              ),
            ),
            if (viewModel.isLoadingHistory)
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: isDark ? Colors.grey[500] : Colors.grey[400],
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        ...viewModel.recentSearches.take(5).map(
              (history) => _buildRecentSearchItem(history, viewModel, isDark),
            ),
      ],
    );
  }

  Widget _buildRecentSearchItem(RecallSearchHistory history,
      GlobalRecallViewModel viewModel, bool isDark) {
    return Dismissible(
      key: Key(history.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: Colors.red[400],
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      onDismissed: (_) => viewModel.deleteHistory(history.id),
      child: GestureDetector(
        onTap: () {
          FocusScope.of(context).unfocus();
          viewModel.loadFromHistory(history);
        },
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? BLabColors.elevatedDark : Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(
                Icons.history,
                size: 18,
                color: isDark ? Colors.grey[500] : Colors.grey[400],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  history.query,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(
                CupertinoIcons.chevron_right,
                size: 16,
                color: isDark ? Colors.grey[600] : Colors.grey[400],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: BLabColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.auto_awesome,
              size: 40,
              color: BLabColors.primary,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            AppLocalizations.of(context).recallSearchAllReadingRecords,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppLocalizations.of(context).recallAiFindsScatteredRecords,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResult(GlobalRecallViewModel viewModel, bool isDark) {
    final result = viewModel.searchResult!;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      children: [
        _buildAnswerCard(result.answer, isDark),
        const SizedBox(height: 20),
        if (result.sourcesByBook != null && result.sourcesByBook!.isNotEmpty)
          _buildSourcesByBook(viewModel, isDark)
        else if (result.sources.isNotEmpty)
          _buildSources(result.sources, isDark),
        const SizedBox(height: 100),
      ],
    );
  }

  Widget _buildAnswerCard(String answer, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? BLabColors.primary.withValues(alpha: 0.15)
            : BLabColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: BLabColors.primary.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: BLabColors.primary.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  size: 16,
                  color: BLabColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                AppLocalizations.of(context).recallAiAnswer,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: BLabColors.primary,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => _copyAnswer(answer),
                child: Icon(
                  CupertinoIcons.doc_on_doc,
                  size: 18,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            answer,
            style: TextStyle(
              fontSize: 15,
              height: 1.6,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSourcesByBook(GlobalRecallViewModel viewModel, bool isDark) {
    final visibleBooks = viewModel.visibleBooks;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${AppLocalizations.of(context).recallReferencedRecords} (${viewModel.totalBooksCount})',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.grey[300] : Colors.grey[700],
          ),
        ),
        const SizedBox(height: 12),
        ...visibleBooks.map((entry) => _buildBookSection(
              entry.key,
              entry.value,
              viewModel,
              isDark,
            )),
        if (viewModel.hiddenBooksCount > 0 && !viewModel.showAllBooks)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: GestureDetector(
              onTap: viewModel.toggleShowAllBooks,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.05)
                      : Colors.black.withValues(alpha: 0.03),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    AppLocalizations.of(context)
                        .recallMoreBooks(viewModel.hiddenBooksCount),
                    style: const TextStyle(
                      fontSize: 14,
                      color: BLabColors.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildBookSection(
    String bookTitle,
    List<RecallSource> sources,
    GlobalRecallViewModel viewModel,
    bool isDark,
  ) {
    final isExpanded = viewModel.isBookExpanded(bookTitle);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.03) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.05),
        ),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: () => viewModel.toggleBookExpanded(bookTitle),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Text('📚', style: TextStyle(fontSize: 18)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          bookTitle,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          AppLocalizations.of(context)
                              .recallRecordCount(sources.length),
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.5)
                                : Colors.black.withValues(alpha: 0.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    isExpanded
                        ? CupertinoIcons.chevron_up
                        : CupertinoIcons.chevron_down,
                    size: 18,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.4)
                        : Colors.black.withValues(alpha: 0.4),
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded) ...[
            Divider(
              height: 1,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.05),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: sources
                    .map((source) => _buildSourceItem(source, isDark))
                    .toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSources(List<RecallSource> sources, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${AppLocalizations.of(context).recallReferencedRecords} (${sources.length})',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.grey[300] : Colors.grey[700],
          ),
        ),
        const SizedBox(height: 12),
        ...sources.map((source) => _buildSourceItem(source, isDark)),
      ],
    );
  }

  void _showRecordDetail(RecallSource source) {
    showRecordDetailSheet(
      context: context,
      source: source,
      onGoToBook:
          widget.onSourceTap != null ? () => widget.onSourceTap!(source) : null,
    );
  }

  Widget _buildSourceItem(RecallSource source, bool isDark) {
    return GestureDetector(
      onTap: () => _showRecordDetail(source),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.05)
              : Colors.black.withValues(alpha: 0.02),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: _getTypeColor(source.type).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Center(
                child: Text(
                  _getTypeIcon(source.type),
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    source.content,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.5,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        source.typeLabel,
                        style: TextStyle(
                          fontSize: 11,
                          color: _getTypeColor(source.type),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (source.pageNumber != null) ...[
                        Text(
                          ' · p.${source.pageNumber}',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.4)
                                : Colors.black.withValues(alpha: 0.4),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              size: 14,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.3)
                  : Colors.black.withValues(alpha: 0.3),
            ),
          ],
        ),
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'highlight':
        return BLabColors.primary;
      case 'note':
        return Colors.orange;
      case 'photo_ocr':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  String _getTypeIcon(String type) {
    switch (type) {
      case 'highlight':
        return '✨';
      case 'note':
        return '📝';
      case 'photo_ocr':
        return '📷';
      default:
        return '📄';
    }
  }
}
