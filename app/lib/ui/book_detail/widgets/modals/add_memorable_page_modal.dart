import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/data/services/highlight_settings_service.dart';
import 'package:book_golas/domain/models/highlight_data.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/keyboard_accessory_bar.dart';
import 'package:book_golas/ui/core/widgets/extracted_text_modal.dart';
import 'package:book_golas/ui/core/widgets/full_text_view_modal.dart';
import 'package:book_golas/ui/core/utils/text_history_manager.dart';
import 'package:book_golas/ui/book_detail/widgets/highlight/highlight_painter.dart';
import 'package:book_golas/ui/core/widgets/highlight_edit_view.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class AddMemorablePageModal extends StatefulWidget {
  final Uint8List? initialImageBytes;
  final String initialExtractedText;
  final int? initialPageNumber;
  final int totalPages;
  final void Function(Uint8List imageBytes) onImageTap;
  final void Function(void Function(Uint8List?, String, int?) onImageSelected)
      onShowImageSourceSheet;
  final void Function(VoidCallback onConfirm) onShowReplaceImageConfirmation;
  final void Function(
    Uint8List imageBytes,
    void Function(String ocrText, int? pageNumber) onResult,
  ) onExtractText;
  final Future<bool> Function({
    Uint8List? imageBytes,
    required String extractedText,
    int? pageNumber,
    List<HighlightData>? highlights,
  }) onUpload;
  final void Function(Uint8List? imageBytes, String text, int? pageNumber)?
      onStateChanged;

  const AddMemorablePageModal({
    super.key,
    this.initialImageBytes,
    this.initialExtractedText = '',
    this.initialPageNumber,
    required this.totalPages,
    required this.onImageTap,
    required this.onShowImageSourceSheet,
    required this.onShowReplaceImageConfirmation,
    required this.onExtractText,
    required this.onUpload,
    this.onStateChanged,
  });

  @override
  State<AddMemorablePageModal> createState() => _AddMemorablePageModalState();
}

class _AddMemorablePageModalState extends State<AddMemorablePageModal> {
  late Uint8List? _fullImageBytes;
  late TextEditingController _textController;
  late TextEditingController _pageController;
  final _textFocusNode = FocusNode();
  final _pageFocusNode = FocusNode();
  final _scrollController = ScrollController();

  bool _isUploading = false;
  String? _pageValidationError;
  bool _hasShownPageError = false;
  bool _hideKeyboardAccessory = false;
  bool _uploadSuccess = false;
  late TextHistoryManager _historyManager;

  bool _isHighlightMode = false;
  List<HighlightData> _highlights = [];
  String _selectedHighlightColor = HighlightColor.yellow;
  double _selectedHighlightOpacity = HighlightSettingsService.defaultOpacity;
  double _selectedHighlightStrokeWidth =
      HighlightSettingsService.defaultStrokeWidth;
  bool _isEraserMode = false;
  final List<List<HighlightData>> _highlightHistory = [];

  @override
  void initState() {
    super.initState();
    _fullImageBytes = widget.initialImageBytes;
    _textController = TextEditingController(text: widget.initialExtractedText);
    _historyManager = TextHistoryManager(
      controller: _textController,
      initialText: widget.initialExtractedText,
      onHistoryChanged: () {
        if (mounted) setState(() {});
      },
    );
    _pageController = TextEditingController(
      text: widget.initialPageNumber != null
          ? widget.initialPageNumber.toString()
          : '',
    );

    _pageFocusNode.addListener(_onFocusChange);
    _textFocusNode.addListener(_onFocusChange);
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

  void _onFocusChange() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _pageFocusNode.removeListener(_onFocusChange);
    _textFocusNode.removeListener(_onFocusChange);
    _textController.dispose();
    _pageController.dispose();
    _textFocusNode.dispose();
    _pageFocusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _saveTextToHistory() {
    _historyManager.saveIfChanged();
  }

  void _undoText() {
    if (_historyManager.undo()) {
      _notifyStateChanged();
    }
  }

  void _redoText() {
    if (_historyManager.redo()) {
      _notifyStateChanged();
    }
  }

  bool get _canUndo => _historyManager.canUndo;
  bool get _canRedo => _historyManager.canRedo;

  void _enterHighlightMode() {
    _highlightHistory.clear();
    _highlightHistory.add(List.from(_highlights));
    setState(() {
      _isHighlightMode = true;
      _isEraserMode = false;
    });
  }

  void _exitHighlightMode() {
    setState(() {
      _isHighlightMode = false;
      _isEraserMode = false;
    });
    _highlightHistory.clear();
  }

  void _saveHighlightState() {
    _highlightHistory.add(List.from(_highlights));
    if (_highlightHistory.length > 50) {
      _highlightHistory.removeAt(0);
    }
  }

  void _undoHighlight() {
    if (_highlightHistory.length > 1) {
      _highlightHistory.removeLast();
      setState(() {
        _highlights = List.from(_highlightHistory.last);
      });
    }
  }

  bool get _canUndoHighlight => _highlightHistory.length > 1;

  void _handleClose() {
    Navigator.pop(context);
  }

  void _handleOcrExtraction(bool isDark) {
    if (_fullImageBytes == null) return;

    widget.onExtractText(_fullImageBytes!, (ocrText, extractedPageNum) {
      if (!mounted) return;

      if (ocrText.isEmpty) {
        return;
      }

      _showOcrResultConfirmation(
        isDark: isDark,
        extractedText: ocrText,
        extractedPageNum: extractedPageNum,
      );
    });
  }

  void _showOcrResultConfirmation({
    required bool isDark,
    required String extractedText,
    required int? extractedPageNum,
  }) {
    showExtractedTextModal(
      context: context,
      initialText: extractedText,
      pageNumber: extractedPageNum,
      creditWarning: '소모된 크레딧은 복구되지 않습니다.',
    ).then((modifiedText) {
      if (!mounted) return;

      if (modifiedText != null) {
        _saveTextToHistory();
        setState(() {
          _textController.text = modifiedText;
          if (extractedPageNum != null) {
            _pageController.text = extractedPageNum.toString();
          }
        });
        _notifyStateChanged();
      } else {
        _handleOcrExtraction(Theme.of(context).brightness == Brightness.dark);
      }
    });
  }

  void _handlePageNumberChange(String value) {
    if (value.isEmpty) {
      setState(() {
        _pageValidationError = null;
        _hasShownPageError = false;
      });
      _notifyStateChanged();
      return;
    }
    final parsed = int.tryParse(value);
    if (parsed != null) {
      if (parsed > widget.totalPages) {
        if (!_hasShownPageError) {
          HapticFeedback.heavyImpact();
          CustomSnackbar.show(
            context,
            message: '총 페이지 수(${widget.totalPages})를 초과할 수 없습니다',
            type: BLabSnackbarType.error,
            rootOverlay: true,
            aboveKeyboard: true,
          );
          _hasShownPageError = true;
        }
        setState(() {
          _pageValidationError = '전체 페이지 수를 초과할 수 없습니다.';
        });
      } else {
        setState(() {
          _pageValidationError = null;
          _hasShownPageError = false;
        });
      }
      _notifyStateChanged();
    }
  }

  Future<void> _handleUpload() async {
    setState(() => _isUploading = true);
    final success = await widget.onUpload(
      imageBytes: _fullImageBytes,
      extractedText: _textController.text,
      pageNumber: int.tryParse(_pageController.text),
      highlights: _highlights.isNotEmpty ? _highlights : null,
    );
    if (success && mounted) {
      _uploadSuccess = true;
      Navigator.pop(context, {'clear': true});
    } else {
      setState(() => _isUploading = false);
    }
  }

  bool get _canUpload =>
      _textController.text.isNotEmpty &&
      _pageController.text.isNotEmpty &&
      _pageValidationError == null;

  Map<String, dynamic> _getCurrentState() {
    return {
      'imageBytes': _fullImageBytes,
      'text': _textController.text,
      'pageNumber': int.tryParse(_pageController.text),
    };
  }

  void _notifyStateChanged() {
    widget.onStateChanged?.call(
      _fullImageBytes,
      _textController.text,
      int.tryParse(_pageController.text),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardOpen = keyboardHeight > 0;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_uploadSuccess) {
          Navigator.pop(context, null);
        } else {
          Navigator.pop(context, _getCurrentState());
        }
      },
      child: GestureDetector(
        onTap: () {
          _textFocusNode.unfocus();
          _pageFocusNode.unfocus();
        },
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: EdgeInsets.only(bottom: keyboardHeight),
            child: Stack(
              children: [
                Container(
                  height: MediaQuery.of(context).size.height * 0.85 -
                      MediaQuery.of(context).padding.top,
                  decoration: BoxDecoration(
                    color: isDark ? BLabColors.surfaceDark : Colors.white,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                  ),
                  child: Column(
                    children: [
                      SizedBox(height: 12 + MediaQuery.of(context).padding.top),
                      _buildDragHandle(),
                      _buildHeader(isDark),
                      Expanded(child: _buildContent(isDark)),
                    ],
                  ),
                ),
                if (!isKeyboardOpen &&
                    !_isUploading &&
                    !_textFocusNode.hasFocus &&
                    !_isHighlightMode)
                  _buildUploadButton(isDark),
                if (isKeyboardOpen &&
                    (_textFocusNode.hasFocus || _pageFocusNode.hasFocus) &&
                    !_hideKeyboardAccessory)
                  _buildKeyboardAccessory(isDark),
                if (_isUploading) _buildLoadingOverlay(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDragHandle() {
    return Container(
      width: 40,
      height: 4,
      decoration: BoxDecoration(
        color: Colors.grey[400],
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  bool get _hasContent =>
      _fullImageBytes != null ||
      _textController.text.isNotEmpty ||
      _pageController.text.isNotEmpty;

  void _showResetConfirmation(bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
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
              AppLocalizations.of(context).resetConfirmMessage,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.white : Colors.black,
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
                          AppLocalizations.of(context).commonCancel,
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
                  child: GestureDetector(
                    onTap: () {
                      Navigator.pop(bottomSheetContext);
                      _resetAll();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.red[400],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          AppLocalizations.of(context).resetButton,
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

  void _resetAll() {
    _saveTextToHistory();
    setState(() {
      _fullImageBytes = null;
      _textController.clear();
      _pageController.clear();
      _pageValidationError = null;
      _hasShownPageError = false;
      _highlights.clear();
      _highlightHistory.clear();
    });
    _notifyStateChanged();
  }

  Widget _buildHeader(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: _handleClose,
            child: Container(
              padding: const EdgeInsets.all(8),
              child: Icon(
                CupertinoIcons.xmark,
                size: 22,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
          ),
          Text(
            AppLocalizations.of(context).addRecordTitle,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          _hasContent
              ? GestureDetector(
                  onTap: () => _showResetConfirmation(isDark),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    child: Text(
                      AppLocalizations.of(context).resetButton,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ),
                )
              : const SizedBox(width: 38),
        ],
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    final isTextFocused = _textFocusNode.hasFocus;

    if (_isHighlightMode && _fullImageBytes != null) {
      return _buildHighlightModeView(isDark);
    }

    if (isTextFocused) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildTextSectionHeader(isDark),
            const SizedBox(height: 12),
            Expanded(child: _buildExpandedTextField(isDark)),
            const SizedBox(height: 20),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildImageSection(isDark),
          const SizedBox(height: 20),
          _buildPageNumberSection(isDark),
          const SizedBox(height: 20),
          _buildTextSection(isDark),
          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildHighlightModeView(bool isDark) {
    return HighlightEditView(
      imageWidget: Image.memory(
        _fullImageBytes!,
        fit: BoxFit.contain,
      ),
      highlights: _highlights,
      selectedColor: _selectedHighlightColor,
      selectedOpacity: _selectedHighlightOpacity,
      selectedStrokeWidth: _selectedHighlightStrokeWidth,
      isEraserMode: _isEraserMode,
      canUndo: _canUndoHighlight,
      onComplete: _exitHighlightMode,
      onUndoTap: _undoHighlight,
      onHighlightAdded: (highlight) {
        _saveHighlightState();
        setState(() {
          _highlights.add(highlight);
        });
      },
      onHighlightRemoved: (highlightId) {
        _saveHighlightState();
        setState(() {
          _highlights.removeWhere((h) => h.id == highlightId);
        });
      },
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

  Widget _buildImageSection(bool isDark) {
    return Container(
      width: double.infinity,
      height: 180,
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[850] : Colors.grey[100],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
          width: 2,
        ),
      ),
      child: _fullImageBytes != null
          ? _buildImagePreview(isDark)
          : _buildImagePlaceholder(isDark),
    );
  }

  Widget _buildImagePreview(bool isDark) {
    return GestureDetector(
      onTap: () => widget.onImageTap(_fullImageBytes!),
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Stack(
              children: [
                Image.memory(
                  _fullImageBytes!,
                  width: double.infinity,
                  height: double.infinity,
                  fit: BoxFit.cover,
                ),
                if (_highlights.isNotEmpty)
                  Positioned.fill(
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        return CustomPaint(
                          painter: HighlightPainter(
                            highlights: _highlights,
                            imageSize: Size(
                              constraints.maxWidth,
                              constraints.maxHeight,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
          Positioned(
            top: 8,
            right: 8,
            child: GestureDetector(
              onTap: _enterHighlightMode,
              behavior: HitTestBehavior.opaque,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: _highlights.isNotEmpty
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
                      _highlights.isNotEmpty
                          ? AppLocalizations.of(context)
                              .highlightWithCount(_highlights.length)
                          : AppLocalizations.of(context).highlightLabel,
                      style: const TextStyle(fontSize: 12, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 8,
            right: 8,
            child: GestureDetector(
              onTap: () => _handleOcrExtraction(isDark),
              behavior: HitTestBehavior.opaque,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.document_scanner_outlined,
                      size: 14,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      AppLocalizations.of(context).extractTextButton,
                      style: const TextStyle(fontSize: 12, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 8,
            left: 8,
            child: GestureDetector(
              onTap: () {
                widget.onShowReplaceImageConfirmation(() {
                  widget.onShowImageSourceSheet((
                    imageBytes,
                    ocrText,
                    ocrPageNumber,
                  ) {
                    if (!mounted) return;
                    setState(() {
                      _fullImageBytes = imageBytes;
                      _highlights.clear();
                      if (ocrText.isNotEmpty) {
                        _textController.text = ocrText;
                      }
                      if (ocrPageNumber != null) {
                        _pageController.text = ocrPageNumber.toString();
                      }
                    });
                    _notifyStateChanged();
                  });
                });
              },
              behavior: HitTestBehavior.opaque,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      CupertinoIcons.arrow_2_squarepath,
                      size: 14,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      AppLocalizations.of(context).replaceButton,
                      style: const TextStyle(fontSize: 12, color: Colors.white),
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

  Widget _buildImagePlaceholder(bool isDark) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => widget.onShowImageSourceSheet((
        imageBytes,
        ocrText,
        ocrPageNumber,
      ) {
        if (!mounted) return;
        setState(() {
          _fullImageBytes = imageBytes;
          if (ocrText.isNotEmpty) {
            _textController.text = ocrText;
          }
          if (ocrPageNumber != null) {
            _pageController.text = ocrPageNumber.toString();
          }
        });
        _notifyStateChanged();
      }),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              CupertinoIcons.camera,
              size: 40,
              color: isDark ? Colors.grey[500] : Colors.grey[400],
            ),
            const SizedBox(height: 12),
            Text(
              AppLocalizations.of(context).tapToAddImage,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[500] : Colors.grey[500],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              AppLocalizations.of(context).optionalLabel,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.grey[600] : Colors.grey[400],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPageNumberSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              CupertinoIcons.book,
              size: 16,
              color: _pageValidationError != null
                  ? Colors.red[400]
                  : (isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
            const SizedBox(width: 8),
            Text(
              AppLocalizations.of(context).recallPage,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: _pageValidationError != null
                    ? Colors.red[400]
                    : (isDark ? Colors.white : Colors.black),
              ),
            ),
            Text(
              ' *',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.red[400],
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: 80,
              child: TextField(
                controller: _pageController,
                focusNode: _pageFocusNode,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: _pageValidationError != null
                      ? Colors.red[400]
                      : (isDark ? Colors.white : Colors.black),
                ),
                onChanged: _handlePageNumberChange,
                decoration: InputDecoration(
                  hintText: '',
                  hintStyle: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.grey[600] : Colors.grey[400],
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: _pageValidationError != null
                          ? Colors.red[400]!
                          : (isDark ? Colors.grey[700]! : Colors.grey[300]!),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: _pageValidationError != null
                          ? Colors.red[400]!
                          : (isDark ? Colors.grey[700]! : Colors.grey[300]!),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: _pageValidationError != null
                          ? Colors.red[400]!
                          : BLabColors.primary,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showFullTextModal(bool isDark) {
    showFullTextViewModal(
      context: context,
      initialText: _textController.text,
      hintText: AppLocalizations.of(context).recordHint,
      startInEditMode: true,
    ).then((modifiedText) {
      if (!mounted) return;
      if (modifiedText != null) {
        _saveTextToHistory();
        _textController.text = modifiedText;
        _notifyStateChanged();
        setState(() {});
      }
    });
  }

  Widget _buildTextSectionHeader(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(
              CupertinoIcons.doc_text,
              size: 16,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
            const SizedBox(width: 8),
            Text(
              AppLocalizations.of(context).recordTextLabel,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            Text(
              ' *',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.red[400],
              ),
            ),
          ],
        ),
        Row(
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
                _saveTextToHistory();
                setState(() {
                  _textController.clear();
                });
                _notifyStateChanged();
              },
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
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildExpandedTextField(bool isDark) {
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
        focusNode: _textFocusNode,
        maxLines: null,
        expands: true,
        keyboardType: TextInputType.multiline,
        textInputAction: TextInputAction.newline,
        textAlignVertical: TextAlignVertical.top,
        onChanged: (value) {
          _saveTextToHistory();
          _notifyStateChanged();
        },
        style: TextStyle(
          fontSize: 15,
          height: 1.6,
          color: isDark ? Colors.white : Colors.black,
        ),
        decoration: InputDecoration(
          hintText: AppLocalizations.of(context).recordHint,
          hintStyle: TextStyle(
            color: isDark ? Colors.grey[600] : Colors.grey[400],
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(16),
        ),
      ),
    );
  }

  Widget _buildTextSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildTextSectionHeader(isDark),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () {
            _textFocusNode.requestFocus();
          },
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 150, maxHeight: 180),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey[900] : Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
              ),
            ),
            child: TextField(
              controller: _textController,
              focusNode: _textFocusNode,
              maxLines: null,
              expands: true,
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.newline,
              textAlignVertical: TextAlignVertical.top,
              onChanged: (value) {
                _saveTextToHistory();
                _notifyStateChanged();
              },
              style: TextStyle(
                fontSize: 15,
                height: 1.6,
                color: isDark ? Colors.white : Colors.black,
              ),
              decoration: InputDecoration(
                hintText: AppLocalizations.of(context).recordHint,
                hintStyle: TextStyle(
                  color: isDark ? Colors.grey[600] : Colors.grey[400],
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.all(16),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUploadButton(bool isDark) {
    return Positioned(
      left: 20,
      right: 20,
      bottom: 32,
      child: GestureDetector(
        onTap: _canUpload ? _handleUpload : null,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: _canUpload
                ? BLabColors.primary
                : (isDark ? Colors.grey[700] : Colors.grey[300]),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: _canUpload
                    ? BLabColors.primary.withValues(alpha: 0.3)
                    : Colors.transparent,
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Text(
              AppLocalizations.of(context).uploadButton,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: _canUpload
                    ? Colors.white
                    : (isDark ? Colors.grey[500] : Colors.grey[500]),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildKeyboardAccessory(bool isDark) {
    final isPageFocused = _pageFocusNode.hasFocus;
    final isTextFocused = _textFocusNode.hasFocus;

    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: KeyboardAccessoryBar(
        isDark: isDark,
        showNavigation: true,
        canGoUp: isTextFocused,
        canGoDown: isPageFocused,
        onUndo: (isTextFocused && _canUndo) ? _undoText : null,
        canUndo: isTextFocused && _canUndo,
        onRedo: (isTextFocused && _canRedo) ? _redoText : null,
        canRedo: isTextFocused && _canRedo,
        onUp: () {
          if (_textFocusNode.hasFocus) {
            _saveTextToHistory();
            _textFocusNode.unfocus();
            _pageFocusNode.requestFocus();
          }
        },
        onDown: () {
          if (_pageFocusNode.hasFocus) {
            _pageFocusNode.unfocus();
            _textFocusNode.requestFocus();
          }
        },
        onDone: () {
          setState(() {
            _hideKeyboardAccessory = true;
          });
          if (_textFocusNode.hasFocus) {
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

  Widget _buildLoadingOverlay() {
    return Positioned.fill(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.5),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: BLabColors.primary),
              const SizedBox(height: 16),
              Text(
                AppLocalizations.of(context).uploading,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Future<Map<String, dynamic>?> showAddMemorablePageModal({
  required BuildContext context,
  Uint8List? initialImageBytes,
  String initialExtractedText = '',
  int? initialPageNumber,
  required int totalPages,
  required void Function(Uint8List imageBytes) onImageTap,
  required void Function(
          void Function(Uint8List?, String, int?) onImageSelected)
      onShowImageSourceSheet,
  required void Function(VoidCallback onConfirm) onShowReplaceImageConfirmation,
  required void Function(
    Uint8List imageBytes,
    void Function(String ocrText, int? pageNumber) onResult,
  ) onExtractText,
  required Future<bool> Function({
    Uint8List? imageBytes,
    required String extractedText,
    int? pageNumber,
    List<HighlightData>? highlights,
  }) onUpload,
  void Function(Uint8List? imageBytes, String text, int? pageNumber)?
      onStateChanged,
}) {
  return showModalBottomSheet<Map<String, dynamic>?>(
    context: context,
    isScrollControlled: true,
    isDismissible: true,
    enableDrag: false,
    backgroundColor: Colors.transparent,
    builder: (modalContext) => AddMemorablePageModal(
      initialImageBytes: initialImageBytes,
      initialExtractedText: initialExtractedText,
      initialPageNumber: initialPageNumber,
      totalPages: totalPages,
      onImageTap: onImageTap,
      onShowImageSourceSheet: onShowImageSourceSheet,
      onShowReplaceImageConfirmation: onShowReplaceImageConfirmation,
      onExtractText: onExtractText,
      onUpload: onUpload,
      onStateChanged: onStateChanged,
    ),
  );
}
