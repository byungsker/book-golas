import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shimmer/shimmer.dart';
import 'package:book_golas/l10n/app_localizations.dart';

import 'package:book_golas/data/services/highlight_settings_service.dart';
import 'package:book_golas/domain/models/highlight_data.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/keyboard_accessory_bar.dart';
import 'package:book_golas/ui/core/widgets/full_text_view_modal.dart';
import 'package:book_golas/ui/core/utils/text_history_manager.dart';
import 'package:book_golas/data/services/image_cache_manager.dart';
import 'package:book_golas/ui/core/widgets/highlight_edit_view.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class ExistingImageModal extends StatefulWidget {
  final String imageId;
  final String? initialImageUrl;
  final String? initialExtractedText;
  final int? pageNumber;
  final int totalPages;
  final String? cachedEditedText;
  final List<HighlightData>? initialHighlights;
  final void Function(String imageId, String? imageUrl) onFullScreenImage;
  final void Function(String imageId, String? imageUrl,
      {bool dismissParentOnDelete}) onDeleteImage;
  final void Function({
    required String imageUrl,
    required void Function(String extractedText) onConfirm,
  }) onReExtractText;
  final void Function({
    required String imageId,
    required String currentText,
    required void Function(String? newImageUrl) onReplaced,
  }) onReplaceImage;
  final Future<bool> Function({
    required String imageId,
    required String extractedText,
    required int? pageNumber,
    required List<HighlightData>? highlights,
  }) onSave;
  final void Function(String imageId, String text) onTextEdited;

  const ExistingImageModal({
    super.key,
    required this.imageId,
    this.initialImageUrl,
    this.initialExtractedText,
    this.pageNumber,
    required this.totalPages,
    this.cachedEditedText,
    this.initialHighlights,
    required this.onFullScreenImage,
    required this.onDeleteImage,
    required this.onReExtractText,
    required this.onReplaceImage,
    required this.onSave,
    required this.onTextEdited,
  });

  @override
  State<ExistingImageModal> createState() => _ExistingImageModalState();
}

class _ExistingImageModalState extends State<ExistingImageModal> {
  late TextEditingController _textController;
  late TextEditingController _pageNumberController;
  final _focusNode = FocusNode();
  final _pageNumberFocusNode = FocusNode();

  late String _originalText;
  late String? _imageUrl;
  late int? _editingPageNumber;

  bool _isEditing = false;
  bool _isSaving = false;
  bool _hideKeyboardAccessory = false;
  bool _pageNumberError = false;
  bool _hasShownPageError = false;
  bool _listenerAdded = false;

  bool _isHighlightMode = false;
  List<HighlightData> _highlights = [];
  List<HighlightData> _originalHighlights = [];
  String _selectedHighlightColor = HighlightColor.yellow;
  double _selectedHighlightOpacity = HighlightSettingsService.defaultOpacity;
  double _selectedHighlightStrokeWidth =
      HighlightSettingsService.defaultStrokeWidth;
  bool _isEraserMode = false;
  final List<List<HighlightData>> _highlightHistory = [];
  Size? _imageSize;
  final GlobalKey _imageKey = GlobalKey();
  bool _isImageLoaded = false;

  late TextHistoryManager _historyManager;

  void _saveTextToHistory() {
    _historyManager.saveIfChanged();
  }

  void _undoText() {
    if (_historyManager.undo()) {
      widget.onTextEdited(widget.imageId, _textController.text);
    }
  }

  void _redoText() {
    if (_historyManager.redo()) {
      widget.onTextEdited(widget.imageId, _textController.text);
    }
  }

  bool get _canUndo => _historyManager.canUndo;
  bool get _canRedo => _historyManager.canRedo;
  bool get _canUndoHighlight => _highlightHistory.isNotEmpty;

  void _addHighlight(HighlightData highlight) {
    _highlightHistory.add(List.from(_highlights));
    setState(() {
      _highlights.add(highlight);
    });
  }

  void _removeHighlight(String highlightId) {
    _highlightHistory.add(List.from(_highlights));
    setState(() {
      _highlights.removeWhere((h) => h.id == highlightId);
    });
  }

  void _undoHighlight() {
    if (_highlightHistory.isNotEmpty) {
      setState(() {
        _highlights = _highlightHistory.removeLast();
      });
    }
  }

  void _updateImageSize() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final renderBox =
          _imageKey.currentContext?.findRenderObject() as RenderBox?;
      if (renderBox != null && mounted) {
        setState(() {
          _imageSize = renderBox.size;
        });
      }
    });
  }

  bool get _hasHighlightChanges {
    if (_highlights.length != _originalHighlights.length) return true;
    for (int i = 0; i < _highlights.length; i++) {
      if (_highlights[i].id != _originalHighlights[i].id) return true;
    }
    return false;
  }

  @override
  void initState() {
    super.initState();
    _originalText =
        widget.cachedEditedText ?? widget.initialExtractedText ?? '';
    _textController = TextEditingController(text: _originalText);
    _historyManager = TextHistoryManager(
      controller: _textController,
      initialText: _originalText,
      onHistoryChanged: () {
        if (mounted) setState(() {});
      },
    );
    _textController.addListener(_onTextChanged);
    _pageNumberController = TextEditingController(
      text: widget.pageNumber?.toString() ?? '',
    );
    _imageUrl = widget.initialImageUrl;
    _editingPageNumber = widget.pageNumber;
    _highlights = List.from(widget.initialHighlights ?? []);
    _originalHighlights = List.from(widget.initialHighlights ?? []);
    _loadHighlightSettings();
  }

  Future<void> _loadHighlightSettings() async {
    final settings = await HighlightSettingsService.loadAll();
    if (mounted) {
      setState(() {
        _selectedHighlightColor =
            HighlightColor.colors.elementAtOrNull(settings.colorIndex) ??
                HighlightColor.yellow;
        _selectedHighlightOpacity = settings.opacity;
        _selectedHighlightStrokeWidth = settings.strokeWidth;
      });
    }
  }

  void _onTextChanged() {
    _saveTextToHistory();
  }

  @override
  void dispose() {
    widget.onTextEdited(widget.imageId, _textController.text);
    _textController.removeListener(_onTextChanged);
    _textController.dispose();
    _pageNumberController.dispose();
    _focusNode.dispose();
    _pageNumberFocusNode.dispose();
    super.dispose();
  }

  void _showCancelConfirmation(bool isDark) {
    final hasTextChanges = _textController.text != _originalText;
    final hasPageChanges = _editingPageNumber != widget.pageNumber;

    if (hasTextChanges || hasPageChanges || _hasHighlightChanges) {
      showModalBottomSheet(
        context: context,
        backgroundColor: Colors.transparent,
        builder: (bottomSheetContext) => Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? BLabColors.surfaceDark : Colors.white,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(20),
            ),
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
              Text(
                AppLocalizations.of(context).unsavedChangesMessage,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.white : Colors.black,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        Navigator.pop(bottomSheetContext);
                        setState(() {
                          _textController.text = _originalText;
                          _editingPageNumber = widget.pageNumber;
                          _pageNumberController.text =
                              widget.pageNumber?.toString() ?? '';
                          _isEditing = false;
                          _isHighlightMode = false;
                          _highlights = List.from(_originalHighlights);
                          _highlightHistory.clear();
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.grey[800] : Colors.grey[200],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            AppLocalizations.of(context).discardChangesButton,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color:
                                  isDark ? Colors.grey[300] : Colors.grey[700],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.pop(bottomSheetContext),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: BLabColors.primary,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            AppLocalizations.of(context).continueEditingButton,
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
    } else {
      setState(() {
        _isEditing = false;
      });
    }
  }

  void _handlePageNumberChange(String value) {
    final parsed = int.tryParse(value);
    if (parsed != null && parsed > widget.totalPages) {
      if (!_hasShownPageError) {
        HapticFeedback.vibrate();
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context)
              .pageExceedsTotalError(widget.totalPages),
          type: BLabSnackbarType.error,
          rootOverlay: true,
          aboveKeyboard: true,
        );
        _hasShownPageError = true;
      }
      setState(() {
        _pageNumberError = true;
        _editingPageNumber = parsed;
      });
    } else {
      _hasShownPageError = false;
      setState(() {
        _pageNumberError = false;
        _editingPageNumber = parsed;
      });
    }
  }

  Future<void> _handleSave() async {
    setState(() => _isSaving = true);
    try {
      final success = await widget.onSave(
        imageId: widget.imageId,
        extractedText: _textController.text,
        pageNumber: _editingPageNumber,
        highlights: _highlights.isNotEmpty ? _highlights : null,
      );
      if (success && mounted) {
        Navigator.pop(context);
        CustomSnackbar.show(context,
            message: AppLocalizations.of(context).dialogSaved,
            type: BLabSnackbarType.success);
      } else {
        setState(() => _isSaving = false);
      }
    } catch (e) {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_listenerAdded) {
      _listenerAdded = true;
      _focusNode.addListener(() => setState(() {}));
      _pageNumberFocusNode.addListener(() => setState(() {}));
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardOpen = keyboardHeight > 0;
    final hasImage = _imageUrl != null && _imageUrl!.isNotEmpty;
    final statusBarHeight = MediaQuery.of(context).padding.top;
    final screenHeight = MediaQuery.of(context).size.height;
    final defaultModalHeight = screenHeight * 0.85;
    final availableHeight = screenHeight - statusBarHeight - keyboardHeight;
    final modalHeight = isKeyboardOpen
        ? availableHeight.clamp(0.0, defaultModalHeight)
        : defaultModalHeight;

    return PopScope(
      canPop: !_isEditing,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _isEditing) {
          _showCancelConfirmation(isDark);
        }
      },
      child: GestureDetector(
        onTap: () {
          if (_isEditing) {
            _focusNode.unfocus();
          }
        },
        child: Padding(
          padding: EdgeInsets.only(
            bottom: keyboardHeight,
            top: statusBarHeight,
          ),
          child: Stack(
            children: [
              Container(
                height: modalHeight,
                decoration: BoxDecoration(
                  color: isDark ? BLabColors.surfaceDark : Colors.white,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                ),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    _buildDragHandle(isDark),
                    _buildHeader(isDark),
                    Expanded(
                      child: hasImage
                          ? _buildWithImageContent(isDark)
                          : _buildTextOnlyContent(isDark),
                    ),
                  ],
                ),
              ),
              if (_isEditing &&
                  isKeyboardOpen &&
                  (_focusNode.hasFocus || _pageNumberFocusNode.hasFocus) &&
                  !_hideKeyboardAccessory)
                _buildKeyboardAccessory(isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDragHandle(bool isDark) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onVerticalDragEnd: (details) {
        if (details.primaryVelocity != null && details.primaryVelocity! > 100) {
          final hasTextChanges = _textController.text != _originalText;
          final hasPageChanges = _editingPageNumber != widget.pageNumber;
          if (_isEditing && (hasTextChanges || hasPageChanges)) {
            _showCancelConfirmation(isDark);
          } else {
            Navigator.pop(context);
          }
        }
      },
      child: Container(
        width: double.infinity,
        height: 24,
        alignment: Alignment.center,
        child: Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: Colors.grey[400],
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          TextButton(
            onPressed: _isEditing
                ? () => _showCancelConfirmation(isDark)
                : () => Navigator.pop(context),
            child: Text(
              _isEditing
                  ? AppLocalizations.of(context).commonCancel
                  : AppLocalizations.of(context).commonClose,
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
          ),
          if (_isEditing)
            _buildPageNumberEditor(isDark)
          else
            Text(
              _editingPageNumber != null
                  ? 'p.$_editingPageNumber'
                  : AppLocalizations.of(context).pageNotSet,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
          if (_isEditing)
            TextButton(
              onPressed: (_isSaving || _pageNumberError) ? null : _handleSave,
              child: Text(
                _isSaving
                    ? AppLocalizations.of(context).dialogSaving
                    : AppLocalizations.of(context).commonSave,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: _isSaving ? Colors.grey : BLabColors.primary,
                ),
              ),
            )
          else
            TextButton(
              onPressed: () {
                widget.onDeleteImage(
                  widget.imageId,
                  _imageUrl,
                  dismissParentOnDelete: true,
                );
              },
              child: Text(
                AppLocalizations.of(context).commonDelete,
                style: TextStyle(fontSize: 16, color: Colors.red[400]),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPageNumberEditor(bool isDark) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'p.',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
          ),
        ),
        const SizedBox(width: 4),
        SizedBox(
          width: 70,
          height: 32,
          child: TextField(
            controller: _pageNumberController,
            focusNode: _pageNumberFocusNode,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: _pageNumberError
                  ? Colors.red
                  : (isDark ? Colors.white : Colors.black),
            ),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 6,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(
                  color: _pageNumberError ? Colors.red : Colors.grey[400]!,
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(
                  color: _pageNumberError ? Colors.red : Colors.grey[400]!,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(
                  color: _pageNumberError ? Colors.red : BLabColors.primary,
                ),
              ),
            ),
            onChanged: _handlePageNumberChange,
          ),
        ),
      ],
    );
  }

  Widget _buildWithImageContent(bool isDark) {
    final isTextFocused = _isEditing && _focusNode.hasFocus;

    if (isTextFocused) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildTextHeader(isDark),
            const SizedBox(height: 12),
            Expanded(child: _buildFullModeTextField(isDark)),
            const SizedBox(height: 20),
          ],
        ),
      );
    }

    if (_isHighlightMode) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _buildHighlightModeView(isDark)),
            const SizedBox(height: 20),
          ],
        ),
      );
    }

    return Scrollbar(
      thumbVisibility: true,
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildImagePreview(isDark),
            const SizedBox(height: 20),
            _buildTextHeader(isDark),
            const SizedBox(height: 12),
            _buildTextContent(isDark, minHeight: 150),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildFullModeTextField(bool isDark) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[900] : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
        ),
      ),
      child: TextField(
        controller: _textController,
        focusNode: _focusNode,
        maxLines: null,
        expands: true,
        keyboardType: TextInputType.multiline,
        textInputAction: TextInputAction.newline,
        textAlignVertical: TextAlignVertical.top,
        style: TextStyle(
          fontSize: 15,
          height: 1.6,
          color: isDark ? Colors.white : Colors.black,
        ),
        decoration: InputDecoration(
          hintText: AppLocalizations.of(context).textInputHint,
          hintStyle: TextStyle(
            color: isDark ? Colors.grey[600] : Colors.grey[400],
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(16),
        ),
      ),
    );
  }

  Widget _buildTextOnlyContent(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (!_isEditing) _buildTextActions(isDark),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(child: _buildExpandedTextContent(isDark)),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildImagePreview(bool isDark) {
    if (_isHighlightMode) {
      return _buildHighlightModeView(isDark);
    }

    return GestureDetector(
      onTap: () => widget.onFullScreenImage(widget.imageId, _imageUrl),
      child: Container(
        width: double.infinity,
        height: 250,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
          ),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(15),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final displaySize =
                  Size(constraints.maxWidth, constraints.maxHeight);

              return Stack(
                fit: StackFit.expand,
                children: [
                  Hero(
                    tag: 'book_image_${widget.imageId}',
                    child: CachedNetworkImage(
                      imageUrl: _imageUrl!,
                      cacheManager: BookImageCacheManager.instance,
                      fit: BoxFit.cover,
                      imageBuilder: (context, imageProvider) {
                        if (!_isImageLoaded) {
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            if (mounted) setState(() => _isImageLoaded = true);
                          });
                        }
                        return Image(image: imageProvider, fit: BoxFit.cover);
                      },
                      placeholder: (context, url) => Shimmer.fromColors(
                        baseColor:
                            isDark ? Colors.grey[800]! : Colors.grey[300]!,
                        highlightColor:
                            isDark ? Colors.grey[700]! : Colors.grey[100]!,
                        child: Container(
                          color: isDark ? Colors.grey[800] : Colors.grey[200],
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: isDark ? Colors.grey[800] : Colors.grey[200],
                        child: Icon(
                          CupertinoIcons.photo,
                          color: isDark ? Colors.grey[600] : Colors.grey[400],
                        ),
                      ),
                    ),
                  ),
                  if (_isImageLoaded && _highlights.isNotEmpty)
                    Positioned.fill(
                      child: IgnorePointer(
                        child: CustomPaint(
                          painter: _HighlightDisplayPainter(
                            highlights: _highlights,
                            imageSize: displaySize,
                          ),
                        ),
                      ),
                    ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: _buildHighlightModeButton(isDark),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: _buildExtractTextButton(),
                  ),
                  Positioned(
                    bottom: 8,
                    left: 8,
                    child: _buildReplaceImageButton(),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildHighlightModeButton(bool isDark) {
    final hasHighlights = _highlights.isNotEmpty;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          _isHighlightMode = true;
          _isEditing = true;
        });
        _updateImageSize();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: hasHighlights
              ? BLabColors.primary.withValues(alpha: 0.9)
              : Colors.black54,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              CupertinoIcons.pencil_outline,
              size: 14,
              color: Colors.white,
            ),
            const SizedBox(width: 4),
            Text(
              hasHighlights
                  ? AppLocalizations.of(context)
                      .highlightWithCount(_highlights.length)
                  : AppLocalizations.of(context).highlightLabel,
              style: const TextStyle(fontSize: 12, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHighlightModeView(bool isDark) {
    return HighlightEditView(
      imageWidget: CachedNetworkImage(
        key: _imageKey,
        imageUrl: _imageUrl!,
        cacheManager: BookImageCacheManager.instance,
        fit: BoxFit.cover,
        placeholder: (context, url) => Container(
          color: isDark ? Colors.grey[800] : Colors.grey[200],
        ),
        errorWidget: (context, url, error) => Container(
          color: isDark ? Colors.grey[800] : Colors.grey[200],
          child: const Icon(CupertinoIcons.photo),
        ),
      ),
      highlights: _highlights,
      selectedColor: _selectedHighlightColor,
      selectedOpacity: _selectedHighlightOpacity,
      selectedStrokeWidth: _selectedHighlightStrokeWidth,
      isEraserMode: _isEraserMode,
      canUndo: _canUndoHighlight,
      onComplete: () {
        HapticFeedback.selectionClick();
        setState(() {
          _isHighlightMode = false;
        });
      },
      onUndoTap: _undoHighlight,
      onHighlightAdded: _addHighlight,
      onHighlightRemoved: _removeHighlight,
      onColorSelected: (color) {
        final colorIndex = HighlightColor.colors.indexOf(color);
        if (colorIndex >= 0) {
          HighlightSettingsService.setColorIndex(colorIndex);
        }
        setState(() {
          _selectedHighlightColor = color;
          _isEraserMode = false;
        });
      },
      onOpacityChanged: (opacity) {
        HighlightSettingsService.setOpacity(opacity);
        setState(() {
          _selectedHighlightOpacity = opacity;
        });
      },
      onStrokeWidthChanged: (strokeWidth) {
        HighlightSettingsService.setStrokeWidth(strokeWidth);
        setState(() {
          _selectedHighlightStrokeWidth = strokeWidth;
        });
      },
      onEraserModeChanged: (isEraser) {
        setState(() {
          _isEraserMode = isEraser;
        });
      },
    );
  }

  Widget _buildExtractTextButton() {
    return GestureDetector(
      onTap: () {
        widget.onReExtractText(
          imageUrl: _imageUrl!,
          onConfirm: (extractedOcrText) {
            setState(() {
              _textController.text = extractedOcrText;
            });
          },
        );
      },
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.black54,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.document_scanner_outlined,
                size: 14, color: Colors.white),
            const SizedBox(width: 4),
            Text(
              AppLocalizations.of(context).extractTextButton,
              style: const TextStyle(fontSize: 12, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReplaceImageButton() {
    return GestureDetector(
      onTap: () {
        widget.onReplaceImage(
          imageId: widget.imageId,
          currentText: _textController.text,
          onReplaced: (newImageUrl) {
            if (newImageUrl != null) {
              setState(() {
                _imageUrl = newImageUrl;
              });
            }
          },
        );
      },
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.black54,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(CupertinoIcons.arrow_2_squarepath,
                size: 14, color: Colors.white),
            const SizedBox(width: 4),
            Text(AppLocalizations.of(context).dialogReplaceImage,
                style: const TextStyle(fontSize: 12, color: Colors.white)),
          ],
        ),
      ),
    );
  }

  Widget _buildTextHeader(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(
              CupertinoIcons.doc_text,
              size: 18,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
            const SizedBox(width: 8),
            Text(
              AppLocalizations.of(context).recordTextLabel,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
          ],
        ),
        if (!_isEditing) _buildTextActions(isDark) else _buildClearButton(),
      ],
    );
  }

  void _showFullTextModal(bool isDark) {
    showFullTextViewModal(
      context: context,
      initialText: _textController.text,
    ).then((modifiedText) {
      if (!mounted) return;
      if (modifiedText != null) {
        _saveTextToHistory();
        _textController.text = modifiedText;
        widget.onTextEdited(widget.imageId, modifiedText);
        setState(() {});
      }
    });
  }

  Widget _buildTextActions(bool isDark) {
    return Row(
      children: [
        if (_textController.text.isNotEmpty) ...[
          GestureDetector(
            onTap: () => _showFullTextModal(isDark),
            child: Row(
              children: [
                Icon(
                  CupertinoIcons.arrow_up_left_arrow_down_right,
                  size: 14,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                const SizedBox(width: 4),
                Text(
                  AppLocalizations.of(context).viewFullButton,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
        ],
        GestureDetector(
          onTap: () {
            if (_textController.text.isNotEmpty) {
              Clipboard.setData(ClipboardData(text: _textController.text));
              CustomSnackbar.show(
                context,
                message: AppLocalizations.of(context).textCopied,
                rootOverlay: true,
                bottomOffset: 40,
              );
            }
          },
          child: Row(
            children: [
              Icon(
                CupertinoIcons.doc_on_clipboard,
                size: 14,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
              const SizedBox(width: 4),
              Text(
                AppLocalizations.of(context).copyButton,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        GestureDetector(
          onTap: () {
            setState(() {
              _isEditing = true;
            });
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _focusNode.requestFocus();
            });
          },
          child: Row(
            children: [
              const Icon(CupertinoIcons.pencil,
                  size: 14, color: BLabColors.primary),
              const SizedBox(width: 4),
              Text(
                AppLocalizations.of(context).editButton,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: BLabColors.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildClearButton() {
    return GestureDetector(
      onTap: () => setState(() => _textController.clear()),
      child: Row(
        children: [
          Icon(CupertinoIcons.trash, size: 14, color: Colors.red[400]),
          const SizedBox(width: 4),
          Text(
            AppLocalizations.of(context).clearAllButton,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: Colors.red[400],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextContent(bool isDark, {required double minHeight}) {
    return GestureDetector(
      onTap: _isEditing
          ? () {
              _focusNode.requestFocus();
            }
          : null,
      child: Container(
        width: double.infinity,
        constraints: BoxConstraints(minHeight: minHeight, maxHeight: 200),
        decoration: BoxDecoration(
          color: (_isEditing || _textController.text.isNotEmpty)
              ? (isDark ? Colors.grey[900] : Colors.grey[100])
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: (_isEditing || _textController.text.isNotEmpty)
              ? Border.all(
                  color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                )
              : null,
        ),
        child: _isEditing
            ? Scrollbar(
                thumbVisibility: true,
                child: TextField(
                  controller: _textController,
                  focusNode: _focusNode,
                  maxLines: null,
                  expands: true,
                  keyboardType: TextInputType.multiline,
                  textInputAction: TextInputAction.newline,
                  textAlignVertical: TextAlignVertical.top,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.6,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                  decoration: InputDecoration(
                    hintText: AppLocalizations.of(context).textInputHint,
                    hintStyle: TextStyle(
                      color: isDark ? Colors.grey[600] : Colors.grey[400],
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.all(16),
                  ),
                ),
              )
            : Scrollbar(
                thumbVisibility: true,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: _textController.text.isEmpty
                      ? Text(
                          AppLocalizations.of(context).noRecordedText,
                          style: TextStyle(
                            fontSize: 15,
                            height: 1.6,
                            color: isDark ? Colors.grey[500] : Colors.grey[500],
                          ),
                        )
                      : SelectableText(
                          _textController.text,
                          style: TextStyle(
                            fontSize: 15,
                            height: 1.6,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                ),
              ),
      ),
    );
  }

  Widget _buildExpandedTextContent(bool isDark) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: _isEditing
            ? (isDark ? Colors.grey[900] : Colors.grey[100])
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        border: _isEditing
            ? Border.all(
                color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
              )
            : null,
      ),
      child: _isEditing
          ? TextField(
              controller: _textController,
              focusNode: _focusNode,
              maxLines: null,
              expands: true,
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.newline,
              textAlignVertical: TextAlignVertical.top,
              style: TextStyle(
                fontSize: 15,
                height: 1.6,
                color: isDark ? Colors.white : Colors.black,
              ),
              decoration: InputDecoration(
                hintText: AppLocalizations.of(context).textInputHint,
                hintStyle: TextStyle(
                  color: isDark ? Colors.grey[600] : Colors.grey[400],
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.all(16),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _textController.text.isEmpty
                  ? Text(
                      AppLocalizations.of(context).noRecordedText,
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.6,
                        color: isDark ? Colors.grey[500] : Colors.grey[500],
                      ),
                    )
                  : SelectableText(
                      _textController.text,
                      style: TextStyle(
                        fontSize: 17,
                        height: 1.8,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
            ),
    );
  }

  Widget _buildKeyboardAccessory(bool isDark) {
    final isTextFocused = _focusNode.hasFocus;

    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: KeyboardAccessoryBar(
        isDark: isDark,
        showNavigation: !isTextFocused,
        icon: CupertinoIcons.checkmark,
        onUndo: (isTextFocused && _canUndo) ? _undoText : null,
        canUndo: isTextFocused && _canUndo,
        onRedo: (isTextFocused && _canRedo) ? _redoText : null,
        canRedo: isTextFocused && _canRedo,
        onUp: !isTextFocused
            ? null
            : () {
                if (_focusNode.hasFocus) {
                  _saveTextToHistory();
                  _focusNode.unfocus();
                  _pageNumberFocusNode.requestFocus();
                }
              },
        onDown: !isTextFocused
            ? null
            : () {
                if (_pageNumberFocusNode.hasFocus) {
                  _pageNumberFocusNode.unfocus();
                  _focusNode.requestFocus();
                }
              },
        onDone: () {
          setState(() {
            _hideKeyboardAccessory = true;
          });
          if (_focusNode.hasFocus) {
            _saveTextToHistory();
          }
          SystemChannels.textInput.invokeMethod('TextInput.hide');
          Future.delayed(const Duration(milliseconds: 300), () {
            if (mounted) {
              setState(() {
                _hideKeyboardAccessory = false;
              });
            }
          });
        },
      ),
    );
  }
}

void showExistingImageModal({
  required BuildContext context,
  required String imageId,
  String? initialImageUrl,
  String? initialExtractedText,
  int? pageNumber,
  required int totalPages,
  String? cachedEditedText,
  List<HighlightData>? initialHighlights,
  required void Function(String imageId, String? imageUrl) onFullScreenImage,
  required void Function(String imageId, String? imageUrl,
          {bool dismissParentOnDelete})
      onDeleteImage,
  required void Function({
    required String imageUrl,
    required void Function(String extractedText) onConfirm,
  }) onReExtractText,
  required void Function({
    required String imageId,
    required String currentText,
    required void Function(String? newImageUrl) onReplaced,
  }) onReplaceImage,
  required Future<bool> Function({
    required String imageId,
    required String extractedText,
    required int? pageNumber,
    required List<HighlightData>? highlights,
  }) onSave,
  required void Function(String imageId, String text) onTextEdited,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    isDismissible: true,
    enableDrag: false,
    backgroundColor: Colors.transparent,
    builder: (modalContext) => ExistingImageModal(
      imageId: imageId,
      initialImageUrl: initialImageUrl,
      initialExtractedText: initialExtractedText,
      pageNumber: pageNumber,
      totalPages: totalPages,
      cachedEditedText: cachedEditedText,
      initialHighlights: initialHighlights,
      onFullScreenImage: onFullScreenImage,
      onDeleteImage: onDeleteImage,
      onReExtractText: onReExtractText,
      onReplaceImage: onReplaceImage,
      onSave: onSave,
      onTextEdited: onTextEdited,
    ),
  );
}

class _HighlightDisplayPainter extends CustomPainter {
  final List<HighlightData> highlights;
  final Size imageSize;

  _HighlightDisplayPainter({
    required this.highlights,
    required this.imageSize,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (final highlight in highlights) {
      if (highlight.points.isEmpty) continue;

      final paint = Paint()
        ..color = highlight.colorValue
        ..strokeWidth = highlight.getScaledStrokeWidth(size)
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;

      final path = highlight.toPath(size);
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _HighlightDisplayPainter oldDelegate) {
    return oldDelegate.highlights != highlights ||
        oldDelegate.imageSize != imageSize;
  }
}
