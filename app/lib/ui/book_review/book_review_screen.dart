import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:book_golas/data/services/ai_content_service.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/confirmation_bottom_sheet.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/keyboard_accessory_bar.dart';

class BookReviewScreen extends StatefulWidget {
  final Book book;

  const BookReviewScreen({
    super.key,
    required this.book,
  });

  @override
  State<BookReviewScreen> createState() => _BookReviewScreenState();
}

class _BookReviewScreenState extends State<BookReviewScreen> {
  late TextEditingController _reviewController;
  late FocusNode _focusNode;
  late ScrollController _scrollController;
  bool _isSaving = false;
  bool _hasChanges = false;
  bool _isGeneratingAI = false;
  bool _hasDraft = false;
  bool _isShowingExitSheet = false;

  final List<String> _undoStack = [];
  final List<String> _redoStack = [];
  String _lastSavedText = '';
  bool _isUndoRedoAction = false;

  static const double _edgeSwipeWidth = 20.0;

  String get _draftKey => 'book_review_draft_${widget.book.id}';

  @override
  void initState() {
    super.initState();
    final initialText = widget.book.longReview ?? '';
    _reviewController = TextEditingController(text: initialText);
    _focusNode = FocusNode();
    _scrollController = ScrollController();
    _lastSavedText = initialText;
    _reviewController.addListener(_onTextChanged);
    _focusNode.addListener(_onFocusChanged);
    _loadDraft();
  }

  Future<void> _loadDraft() async {
    final prefs = await SharedPreferences.getInstance();
    final draft = prefs.getString(_draftKey);
    if (draft != null && draft.isNotEmpty && draft != widget.book.longReview) {
      if (!mounted) return;
      _reviewController.text = draft;
      setState(() {
        _hasDraft = true;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          CustomSnackbar.show(
            context,
            message: AppLocalizations.of(context).reviewDraftLoaded,
            type: BLabSnackbarType.info,
          );
        }
      });
    }
  }

  Future<void> _saveDraft() async {
    final text = _reviewController.text.trim();
    final prefs = await SharedPreferences.getInstance();
    if (text.isNotEmpty && text != widget.book.longReview) {
      await prefs.setString(_draftKey, text);
    } else {
      await prefs.remove(_draftKey);
    }
  }

  Future<void> _clearDraft() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_draftKey);
  }

  @override
  void dispose() {
    _saveDraft();
    _reviewController.removeListener(_onTextChanged);
    _focusNode.removeListener(_onFocusChanged);
    _reviewController.dispose();
    _focusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onFocusChanged() {
    setState(() {});
  }

  void _onTextChanged() {
    final currentText = _reviewController.text;
    final hasChanges = currentText != (widget.book.longReview ?? '');

    if (!_isUndoRedoAction && currentText != _lastSavedText) {
      if (_lastSavedText.isNotEmpty || _undoStack.isNotEmpty) {
        _undoStack.add(_lastSavedText);
        if (_undoStack.length > 50) {
          _undoStack.removeAt(0);
        }
      }
      _redoStack.clear();
      _lastSavedText = currentText;
    }

    if (hasChanges != _hasChanges) {
      setState(() {
        _hasChanges = hasChanges;
      });
    } else {
      setState(() {});
    }
  }

  void _undo() {
    if (_undoStack.isEmpty) return;

    _isUndoRedoAction = true;
    _redoStack.add(_reviewController.text);
    final previousText = _undoStack.removeLast();
    _reviewController.text = previousText;
    _reviewController.selection = TextSelection.collapsed(
      offset: previousText.length,
    );
    _lastSavedText = previousText;
    _isUndoRedoAction = false;
    setState(() {});
  }

  void _redo() {
    if (_redoStack.isEmpty) return;

    _isUndoRedoAction = true;
    _undoStack.add(_reviewController.text);
    final nextText = _redoStack.removeLast();
    _reviewController.text = nextText;
    _reviewController.selection = TextSelection.collapsed(
      offset: nextText.length,
    );
    _lastSavedText = nextText;
    _isUndoRedoAction = false;
    setState(() {});
  }

  void _dismissKeyboard() {
    _focusNode.unfocus();
  }

  Future<void> _copyAll() async {
    final text = _reviewController.text;
    if (text.isEmpty) return;

    await Clipboard.setData(ClipboardData(text: text));
    HapticFeedback.lightImpact();
    if (mounted) {
      CustomSnackbar.show(
        context,
        message: AppLocalizations.of(context).reviewCopied,
        type: BLabSnackbarType.success,
        icon: CupertinoIcons.doc_on_doc,
        aboveKeyboard: true,
      );
    }
  }

  void _clearAll() {
    final currentText = _reviewController.text;
    if (currentText.isEmpty) return;

    _isUndoRedoAction = true;
    _undoStack.add(currentText);
    if (_undoStack.length > 50) {
      _undoStack.removeAt(0);
    }
    _redoStack.clear();
    _reviewController.clear();
    _lastSavedText = '';
    _isUndoRedoAction = false;
    HapticFeedback.lightImpact();
    setState(() {});
  }

  Future<void> _saveReview() async {
    if (_isSaving) return;

    final bookId = widget.book.id;
    if (bookId == null) {
      CustomSnackbar.show(
        context,
        message: AppLocalizations.of(context).reviewBookNotFound,
        type: BLabSnackbarType.error,
      );
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      final bookService = context.read<BookService>();
      final reviewText = _reviewController.text.trim();
      final updatedBook = await bookService.updateLongReview(
        bookId,
        reviewText.isEmpty ? null : reviewText,
      );

      if (!mounted) return;

      if (updatedBook != null) {
        await _clearDraft();
        await _showSaveCompleteSheet();
        if (mounted) {
          Navigator.pop(context, true);
        }
      } else {
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context).reviewSaveFailed,
          type: BLabSnackbarType.error,
        );
      }
    } catch (e) {
      debugPrint('Failed to save review: $e');
      if (mounted) {
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context).reviewSaveError,
          type: BLabSnackbarType.error,
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  Future<void> _generateAIDraft() async {
    if (_isGeneratingAI) return;

    final bookId = widget.book.id;
    if (bookId == null) {
      CustomSnackbar.show(
        context,
        message: AppLocalizations.of(context).reviewBookNotFound,
        type: BLabSnackbarType.error,
      );
      return;
    }

    if (_reviewController.text.trim().isNotEmpty) {
      final shouldReplace = await showConfirmationBottomSheet(
        context: context,
        title: AppLocalizations.of(context).reviewReplaceConfirm,
        confirmText: AppLocalizations.of(context).reviewReplaceButton,
        isDestructive: true,
      );

      if (shouldReplace != true) return;
    }

    setState(() {
      _isGeneratingAI = true;
    });

    try {
      final aiService = AIContentService();
      final draft = await aiService.generateBookReviewDraft(bookId: bookId);

      if (!mounted) return;

      if (draft != null && draft.isNotEmpty) {
        _reviewController.text = draft;
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context).reviewAIDraftGenerated,
          type: BLabSnackbarType.success,
          icon: CupertinoIcons.sparkles,
        );
      } else {
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context).reviewAIDraftFailed,
          type: BLabSnackbarType.error,
        );
      }
    } catch (e) {
      debugPrint('Failed to generate AI draft: $e');
      if (mounted) {
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context).reviewAIDraftError,
          type: BLabSnackbarType.error,
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isGeneratingAI = false;
        });
      }
    }
  }

  Future<void> _showSaveCompleteSheet() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    await showModalBottomSheet(
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
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: BLabColors.success.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                CupertinoIcons.checkmark_alt,
                color: BLabColors.success,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              AppLocalizations.of(context).reviewSaveComplete,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 20,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              AppLocalizations.of(context).reviewSaveCompleteMessage,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: () => Navigator.pop(bottomSheetContext),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: BLabColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    AppLocalizations.of(context).commonConfirm,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
            SizedBox(
              height: MediaQuery.of(bottomSheetContext).padding.bottom + 8,
            ),
          ],
        ),
      ),
    );
  }

  Future<bool> _onWillPop() async {
    if (!_hasChanges) return true;

    final shouldDiscard = await showConfirmationBottomSheet(
      context: context,
      title: AppLocalizations.of(context).reviewExitConfirm,
      subtitle: AppLocalizations.of(context).reviewExitMessage,
      confirmText: AppLocalizations.of(context).reviewExit,
      isDestructive: false,
    );

    return shouldDiscard ?? false;
  }

  Future<void> _handleSwipeBack() async {
    if (_isShowingExitSheet) return;

    if (!_hasChanges) {
      Navigator.pop(context);
      return;
    }

    _isShowingExitSheet = true;
    final shouldPop = await _onWillPop();
    _isShowingExitSheet = false;

    if (shouldPop && mounted) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardVisible = keyboardHeight > 0;

    return PopScope(
      canPop: !_hasChanges,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await _onWillPop();
        if (shouldPop && mounted) {
          Navigator.pop(context);
        }
      },
      child: Stack(
        children: [
          Scaffold(
            backgroundColor:
                isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight,
            resizeToAvoidBottomInset: true,
            appBar: AppBar(
              backgroundColor:
                  isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight,
              elevation: 0,
              leading: IconButton(
                icon: Icon(
                  CupertinoIcons.chevron_left,
                  color: isDark ? Colors.white : Colors.black,
                ),
                onPressed: () async {
                  if (_hasChanges) {
                    final shouldPop = await _onWillPop();
                    if (shouldPop && mounted) {
                      Navigator.pop(context);
                    }
                  } else {
                    Navigator.pop(context);
                  }
                },
              ),
              title: Text(
                AppLocalizations.of(context).reviewTitle,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              centerTitle: true,
              actions: [
                TextButton(
                  onPressed: _hasChanges && !_isSaving ? _saveReview : null,
                  child: _isSaving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: BLabColors.primary,
                          ),
                        )
                      : Text(
                          AppLocalizations.of(context).commonSave,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: _hasChanges
                                ? BLabColors.primary
                                : (isDark
                                    ? Colors.grey[600]
                                    : Colors.grey[400]),
                          ),
                        ),
                ),
              ],
            ),
            body: Stack(
              children: [
                SafeArea(
                  child: Padding(
                    padding: EdgeInsets.only(
                      left: 20,
                      right: 20,
                      top: 20,
                      bottom: isKeyboardVisible ? 70 : 20,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildBookInfo(isDark),
                        const SizedBox(height: 16),
                        _buildAIButton(isDark),
                        const SizedBox(height: 16),
                        Expanded(
                          child: _buildReviewTextField(isDark),
                        ),
                      ],
                    ),
                  ),
                ),
                if (isKeyboardVisible)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: KeyboardAccessoryBar(
                      isDark: isDark,
                      onDone: _dismissKeyboard,
                      onUndo: _undo,
                      onRedo: _redo,
                      onCopy: _copyAll,
                      onClearAll: _clearAll,
                      canUndo: _undoStack.isNotEmpty,
                      canRedo: _redoStack.isNotEmpty,
                      canCopy: _reviewController.text.isNotEmpty,
                      canClearAll: _reviewController.text.isNotEmpty,
                    ),
                  ),
              ],
            ),
          ),
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            width: _edgeSwipeWidth,
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onHorizontalDragEnd: (details) {
                if (details.primaryVelocity != null &&
                    details.primaryVelocity! > 300) {
                  _handleSwipeBack();
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookInfo(bool isDark) {
    return Row(
      children: [
        if (widget.book.imageUrl != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              widget.book.imageUrl!,
              width: 50,
              height: 70,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 50,
                height: 70,
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey[800] : Colors.grey[200],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.book_rounded,
                  color: isDark ? Colors.grey[600] : Colors.grey[400],
                ),
              ),
            ),
          ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.book.title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (widget.book.author != null) ...[
                const SizedBox(height: 4),
                Text(
                  widget.book.author!,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAIButton(bool isDark) {
    return GestureDetector(
      onTap: _isGeneratingAI ? null : _generateAIDraft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: BLabColors.primary.withValues(alpha: 0.3),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isGeneratingAI) ...[
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: BLabColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                AppLocalizations.of(context).aiDraftGenerating,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: BLabColors.primary,
                ),
              ),
            ] else ...[
              const Icon(
                CupertinoIcons.sparkles,
                size: 18,
                color: BLabColors.primary,
              ),
              const SizedBox(width: 8),
              Text(
                AppLocalizations.of(context).aiDraftGenerate,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: BLabColors.primary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildReviewTextField(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Scrollbar(
          controller: _scrollController,
          thumbVisibility: true,
          child: TextField(
            controller: _reviewController,
            focusNode: _focusNode,
            scrollController: _scrollController,
            maxLines: null,
            expands: true,
            textAlignVertical: TextAlignVertical.top,
            style: TextStyle(
              fontSize: 16,
              height: 1.6,
              color: isDark ? Colors.white : Colors.black,
            ),
            decoration: InputDecoration(
              hintText: AppLocalizations.of(context).reviewHint,
              hintStyle: TextStyle(
                fontSize: 15,
                color: isDark ? Colors.grey[600] : Colors.grey[400],
                height: 1.6,
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
        ),
      ),
    );
  }
}
