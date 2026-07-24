import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/app_colors.dart';

class PageUpdateResult {
  final int? page;
  final bool didNotRead;

  const PageUpdateResult({this.page, this.didNotRead = false});

  static const cancelled = PageUpdateResult();
  static const notRead = PageUpdateResult(didNotRead: true);
}

class PageUpdateModal {
  static const Color _darkBg = Color(0xFF1C1C1E);

  static Future<PageUpdateResult> show({
    required BuildContext context,
    int? currentPage,
    int? totalPages,
    Duration? readingDuration,
    bool isTimerFlow = false,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final TextEditingController pageController = TextEditingController();
    final l10n = AppLocalizations.of(context);

    final result = await showModalBottomSheet<PageUpdateResult>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      useRootNavigator: true,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: Container(
          padding: EdgeInsets.fromLTRB(
            24,
            24,
            24,
            24 + MediaQuery.of(sheetContext).viewPadding.bottom,
          ),
          decoration: BoxDecoration(
            color: isDark ? _darkBg : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: _PageUpdateModalContent(
            isDark: isDark,
            pageController: pageController,
            l10n: l10n,
            currentPage: currentPage,
            totalPages: totalPages,
            readingDuration: readingDuration,
            isTimerFlow: isTimerFlow,
          ),
        ),
      ),
    );

    return result ?? PageUpdateResult.cancelled;
  }
}

class _PageUpdateModalContent extends StatefulWidget {
  final bool isDark;
  final TextEditingController pageController;
  final AppLocalizations l10n;
  final int? currentPage;
  final int? totalPages;
  final Duration? readingDuration;
  final bool isTimerFlow;

  const _PageUpdateModalContent({
    required this.isDark,
    required this.pageController,
    required this.l10n,
    this.currentPage,
    this.totalPages,
    this.readingDuration,
    this.isTimerFlow = false,
  });

  @override
  State<_PageUpdateModalContent> createState() =>
      _PageUpdateModalContentState();
}

class _PageUpdateModalContentState extends State<_PageUpdateModalContent> {
  String? _errorText;
  late FixedExtentScrollController _wheelController;
  int _selectedPage = 0;
  bool _updatingFromWheel = false;

  @override
  void initState() {
    super.initState();
    final start = (widget.currentPage ?? 0) + 1;
    _selectedPage = start;
    _wheelController = FixedExtentScrollController(initialItem: 0);
  }

  @override
  void dispose() {
    _wheelController.dispose();
    super.dispose();
  }

  int get _minPage => (widget.currentPage ?? 0) + 1;
  int get _maxPage => widget.totalPages ?? 9999;
  int get _itemCount => (_maxPage - _minPage + 1).clamp(1, 9999);

  String _formatReadingComplete(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    final seconds = duration.inSeconds % 60;

    return widget.l10n.readingComplete(hours, minutes, seconds);
  }

  String? _validatePage(String value) {
    if (value.isEmpty) return null;

    final page = int.tryParse(value);
    if (page == null) {
      return widget.l10n.validationEnterNumber;
    }
    if (page < 0) {
      return widget.l10n.validationPageMinimum;
    }
    if (widget.totalPages != null && page > widget.totalPages!) {
      return widget.l10n.validationPageExceedsTotal(widget.totalPages!);
    }
    if (widget.currentPage != null && page < widget.currentPage!) {
      return widget.l10n.validationPageBelowCurrent(widget.currentPage!);
    }
    return null;
  }

  void _handleUpdate() {
    final pageText = widget.pageController.text.trim();
    final page = int.tryParse(pageText);

    if (page == null || page <= 0) return;

    final error = _validatePage(pageText);
    if (error != null) {
      setState(() => _errorText = error);
      return;
    }

    Navigator.of(context, rootNavigator: true)
        .pop(PageUpdateResult(page: page));
  }

  Widget _buildDialPicker() {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: widget.isDark ? BLabColors.subtleDark : Colors.grey[100],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Stack(
        children: [
          Center(
            child: Container(
              width: 100,
              height: 90,
              decoration: BoxDecoration(
                color: BLabColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          RotatedBox(
            quarterTurns: 3,
            child: ListWheelScrollView.useDelegate(
              controller: _wheelController,
              itemExtent: 90,
              perspective: 0.005,
              diameterRatio: 1.5,
              physics: const FixedExtentScrollPhysics(),
              onSelectedItemChanged: (index) {
                HapticFeedback.selectionClick();
                final value = _minPage + index;
                _updatingFromWheel = true;
                setState(() {
                  _selectedPage = value;
                  widget.pageController.text = value.toString();
                  _errorText = _validatePage(value.toString());
                });
                _updatingFromWheel = false;
              },
              childDelegate: ListWheelChildBuilderDelegate(
                childCount: _itemCount,
                builder: (context, index) {
                  final value = _minPage + index;
                  final isSelected = value == _selectedPage;
                  return RotatedBox(
                    quarterTurns: 1,
                    child: Center(
                      child: Text(
                        '$value',
                        style: TextStyle(
                          fontSize: isSelected ? 42 : 18,
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w400,
                          color: isSelected
                              ? BLabColors.primary
                              : (widget.isDark
                                  ? Colors.grey[500]
                                  : Colors.grey[400]),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasPageInfo = widget.currentPage != null && widget.totalPages != null;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: widget.isDark ? Colors.grey[700] : Colors.grey[300],
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(height: 24),
        if (widget.readingDuration != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _formatReadingComplete(widget.readingDuration!),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.green,
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
        Text(
          widget.l10n.pageUpdateDialogTitle,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: widget.isDark ? Colors.white : Colors.black,
          ),
        ),
        const SizedBox(height: 8),
        if (hasPageInfo)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                widget.l10n.currentPageLabel(widget.currentPage!),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: BLabColors.primary,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                widget.l10n.totalPageLabel(widget.totalPages!),
                style: TextStyle(
                  fontSize: 14,
                  color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ],
          )
        else
          Text(
            widget.l10n.pageUpdateValidationRequired,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
        if (hasPageInfo) ...[
          const SizedBox(height: 20),
          _buildDialPicker(),
        ],
        const SizedBox(height: 16),
        TextField(
          controller: widget.pageController,
          keyboardType: TextInputType.number,
          autofocus: !hasPageInfo,
          textAlign: TextAlign.center,
          onChanged: (value) {
            setState(() {
              _errorText = _validatePage(value);
            });
            if (!_updatingFromWheel) {
              final parsed = int.tryParse(value);
              if (parsed != null && parsed >= _minPage && parsed <= _maxPage) {
                _selectedPage = parsed;
                _wheelController.jumpToItem(parsed - _minPage);
              }
            }
          },
          onSubmitted: (_) => _handleUpdate(),
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: widget.isDark ? Colors.white : Colors.black,
          ),
          decoration: InputDecoration(
            hintText: hasPageInfo
                ? '${widget.currentPage! + 1} ~ ${widget.totalPages}'
                : widget.l10n.pageInputHint,
            hintStyle: TextStyle(
              color: widget.isDark ? Colors.grey[600] : Colors.grey[400],
            ),
            suffixText: 'p',
            suffixStyle: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: widget.isDark ? Colors.grey[500] : Colors.grey[500],
            ),
            errorText: _errorText,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: widget.isDark
                    ? Colors.white.withValues(alpha: 0.2)
                    : Colors.black.withValues(alpha: 0.1),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: _errorText != null ? Colors.red : BLabColors.primary,
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.red, width: 2),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.red, width: 2),
            ),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: GestureDetector(
            onTap: _handleUpdate,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: BLabColors.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                widget.l10n.pageUpdateButton,
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
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: GestureDetector(
            onTap: () {
              if (widget.isTimerFlow) {
                Navigator.of(context, rootNavigator: true)
                    .pop(PageUpdateResult.notRead);
              } else {
                Navigator.of(context, rootNavigator: true)
                    .pop(PageUpdateResult.cancelled);
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(
                widget.isTimerFlow
                    ? widget.l10n.timerDidNotRead
                    : widget.l10n.commonCancel,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
