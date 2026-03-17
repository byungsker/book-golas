import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/domain/models/recall_models.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/keyboard_accessory_bar.dart';
import 'package:book_golas/ui/recall/view_model/recall_view_model.dart';
import 'package:book_golas/l10n/app_localizations.dart';

Future<void> showRecallSearchSheet({
  required BuildContext context,
  required String bookId,
  RecallViewModel? existingViewModel,
  void Function(RecallSource source)? onSourceTap,
}) async {
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    isDismissible: false,
    enableDrag: false,
    builder: (sheetContext) {
      if (existingViewModel != null) {
        return ChangeNotifierProvider.value(
          value: existingViewModel,
          child: _RecallSearchSheetContent(
            bookId: bookId,
            onSourceTap: onSourceTap,
          ),
        );
      }
      return ChangeNotifierProvider(
        create: (_) => RecallViewModel()..loadRecentSearches(bookId),
        child: _RecallSearchSheetContent(
          bookId: bookId,
          onSourceTap: onSourceTap,
        ),
      );
    },
  );
}

class _RecallSearchSheetContent extends StatefulWidget {
  final String bookId;
  final void Function(RecallSource source)? onSourceTap;

  const _RecallSearchSheetContent({
    required this.bookId,
    this.onSourceTap,
  });

  @override
  State<_RecallSearchSheetContent> createState() =>
      _RecallSearchSheetContentState();
}

class _RecallSearchSheetContentState extends State<_RecallSearchSheetContent> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  double _sheetSize = 0.9;
  bool _hideKeyboardAccessory = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final viewModel = context.read<RecallViewModel>();
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
    context.read<RecallViewModel>().search(widget.bookId, query.trim());
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
    context.read<RecallViewModel>().clearResult();
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
    final viewModel = context.watch<RecallViewModel>();
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
                                    .recallSearchMyRecords,
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
                            hintText:
                                'e.g. "What did the author say about habits?"',
                            hintStyle: TextStyle(
                              color:
                                  isDark ? Colors.grey[500] : Colors.grey[400],
                            ),
                            prefixIcon: Icon(
                              Icons.search,
                              color:
                                  isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                Icons.send,
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
                            padding: const EdgeInsets.all(12),
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
                if (viewModel.contentSuggestions.isNotEmpty &&
                    viewModel.searchResult == null &&
                    !viewModel.isSearching)
                  _buildContentSuggestions(viewModel, isDark),
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

  Widget _buildContentSuggestions(RecallViewModel viewModel, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: SizedBox(
        height: 32,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: viewModel.contentSuggestions.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, index) {
            final suggestion = viewModel.contentSuggestions[index];
            return GestureDetector(
              onTap: () {
                _controller.text = suggestion;
                _search(suggestion);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey[800] : Colors.grey[200],
                  borderRadius: BorderRadius.circular(16),
                ),
                alignment: Alignment.center,
                child: Text(
                  suggestion,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[300] : Colors.grey[700],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildContent(RecallViewModel viewModel, bool isDark) {
    if (viewModel.isSearching) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: BLabColors.primary),
            const SizedBox(height: 16),
            Text(
              AppLocalizations.of(context).recallSearchingYourRecords,
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
      return _buildSearchResult(viewModel.searchResult!, isDark);
    }

    return _buildInitialContent(viewModel, isDark);
  }

  Widget _buildInitialContent(RecallViewModel viewModel, bool isDark) {
    final hasRecentSearches = viewModel.recentSearches.isNotEmpty;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      children: [
        if (hasRecentSearches) ...[
          _buildRecentSearchesSection(viewModel, isDark),
          const SizedBox(height: 24),
        ],
        _buildSuggestedQuestions(isDark),
        if (!hasRecentSearches) ...[
          const SizedBox(height: 40),
          _buildEmptyState(isDark),
        ],
      ],
    );
  }

  Widget _buildRecentSearchesSection(RecallViewModel viewModel, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              AppLocalizations.of(context).recallRecentSearches,
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

  Widget _buildRecentSearchItem(
      RecallSearchHistory history, RecallViewModel viewModel, bool isDark) {
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
      onDismissed: (_) => viewModel.deleteHistory(history.id, widget.bookId),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      history.query,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _formatDate(history.createdAt),
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[600] : Colors.grey[400],
                      ),
                    ),
                  ],
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

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    final l10n = AppLocalizations.of(context);

    if (diff.inMinutes < 1) return l10n.recallJustNow;
    if (diff.inHours < 1) return l10n.recallMinutesAgo(diff.inMinutes);
    if (diff.inDays < 1) return l10n.recallHoursAgo(diff.inHours);
    if (diff.inDays < 7) return l10n.recallDaysAgo(diff.inDays);
    return '${date.month}/${date.day}';
  }

  Widget _buildSuggestedQuestions(bool isDark) {
    final l10n = AppLocalizations.of(context);
    final suggestions = [
      l10n.recallSuggestedQuestion1,
      l10n.recallSuggestedQuestion2,
      l10n.recallSuggestedQuestion3,
      l10n.recallSuggestedQuestion4,
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.recallSuggestedQuestions,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.grey[300] : Colors.grey[700],
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: suggestions.map((text) {
            return ActionChip(
              label: Text(
                text,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.blue[200] : Colors.blue[700],
                ),
              ),
              backgroundColor:
                  isDark ? Colors.blue.withValues(alpha: 0.2) : Colors.blue[50],
              side: BorderSide.none,
              onPressed: () {
                _controller.text = text;
                _search(text);
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        children: [
          Icon(
            Icons.search,
            size: 64,
            color: isDark ? Colors.grey[700] : Colors.grey[300],
          ),
          const SizedBox(height: 16),
          Text(
            AppLocalizations.of(context).recallSearchCurious,
            style: TextStyle(
              fontSize: 16,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppLocalizations.of(context).recallFindInRecords,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResult(RecallSearchResult result, bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark
                ? BLabColors.primary.withValues(alpha: 0.15)
                : BLabColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.auto_awesome,
                      color: BLabColors.primary, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    AppLocalizations.of(context).recallAiAnswer,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => _copyAnswer(result.answer),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.black.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.copy_outlined,
                            size: 14,
                            color: isDark ? Colors.grey[300] : Colors.grey[600],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            AppLocalizations.of(context).recallCopy,
                            style: TextStyle(
                              fontSize: 12,
                              color:
                                  isDark ? Colors.grey[300] : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SelectableText(
                result.answer,
                style: TextStyle(
                  fontSize: 16,
                  height: 1.6,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
        ),
        if (result.sources.isNotEmpty) ...[
          const SizedBox(height: 24),
          Text(
            AppLocalizations.of(context).recallRelatedRecords,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 12),
          ...result.sources.map((source) => _buildSourceCard(source, isDark)),
        ],
      ],
    );
  }

  Widget _buildSourceCard(RecallSource source, bool isDark) {
    IconData icon;
    Color color;

    switch (source.type) {
      case 'highlight':
        icon = Icons.highlight;
        color = Colors.amber;
        break;
      case 'note':
        icon = Icons.notes;
        color = Colors.green;
        break;
      case 'photo_ocr':
        icon = Icons.photo;
        color = Colors.purple;
        break;
      default:
        icon = Icons.article;
        color = Colors.blue;
    }

    return GestureDetector(
      onTap: () {
        if (widget.onSourceTap != null) {
          widget.onSourceTap!(source);
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.elevatedDark : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
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
                    color: color.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 16),
                ),
                const SizedBox(width: 8),
                Text(
                  source.typeLabel,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                const Spacer(),
                if (source.pageNumber != null)
                  Text(
                    '${source.pageNumber} ${AppLocalizations.of(context).recallPage}',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey[500] : Colors.grey[600],
                    ),
                  ),
                if (widget.onSourceTap != null) ...[
                  const SizedBox(width: 8),
                  Icon(
                    CupertinoIcons.chevron_right,
                    size: 14,
                    color: isDark ? Colors.grey[600] : Colors.grey[400],
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            Text(
              source.content,
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: isDark ? Colors.grey[300] : Colors.grey[800],
              ),
              maxLines: 5,
              overflow: TextOverflow.ellipsis,
            ),
            if (source.createdAt != null) ...[
              const SizedBox(height: 8),
              Text(
                '${source.createdAt!.year}.${source.createdAt!.month.toString().padLeft(2, '0')}.${source.createdAt!.day.toString().padLeft(2, '0')}',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey[600] : Colors.grey[400],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
