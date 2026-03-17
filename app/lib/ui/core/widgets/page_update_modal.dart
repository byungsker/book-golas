import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/app_colors.dart';

/// 페이지 업데이트 모달
///
/// 플로팅 타이머와 독서 상세 화면에서 공통으로 사용하는 페이지 업데이트 모달
class PageUpdateModal {
  static const Color _darkBg = Color(0xFF1C1C1E);

  /// 페이지 업데이트 모달 표시
  ///
  /// [context] - BuildContext
  /// [currentPage] - 현재 페이지 (optional, 유효성 검사용)
  /// [totalPages] - 총 페이지 (optional, 유효성 검사용)
  /// [readingDuration] - 독서 시간 (optional, 표시용)
  /// [onUpdate] - 업데이트 완료 콜백 (새 페이지 번호 전달)
  /// [onSkip] - 나중에 하기 콜백 (optional)
  static Future<void> show({
    required BuildContext context,
    int? currentPage,
    int? totalPages,
    Duration? readingDuration,
    required Future<void> Function(int newPage) onUpdate,
    VoidCallback? onSkip,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final TextEditingController pageController = TextEditingController();
    final l10n = AppLocalizations.of(context);

    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      isDismissible: false,
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
            onUpdate: onUpdate,
            onSkip: onSkip,
          ),
        ),
      ),
    );
  }
}

class _PageUpdateModalContent extends StatefulWidget {
  final bool isDark;
  final TextEditingController pageController;
  final AppLocalizations l10n;
  final int? currentPage;
  final int? totalPages;
  final Duration? readingDuration;
  final Future<void> Function(int newPage) onUpdate;
  final VoidCallback? onSkip;

  const _PageUpdateModalContent({
    required this.isDark,
    required this.pageController,
    required this.l10n,
    this.currentPage,
    this.totalPages,
    this.readingDuration,
    required this.onUpdate,
    this.onSkip,
  });

  @override
  State<_PageUpdateModalContent> createState() =>
      _PageUpdateModalContentState();
}

class _PageUpdateModalContentState extends State<_PageUpdateModalContent> {
  bool _isLoading = false;
  String? _errorText;

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

  Future<void> _handleUpdate() async {
    final pageText = widget.pageController.text.trim();
    final page = int.tryParse(pageText);

    if (page == null || page <= 0) return;

    final error = _validatePage(pageText);
    if (error != null) {
      setState(() => _errorText = error);
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = null;
    });

    try {
      await widget.onUpdate(page).timeout(const Duration(seconds: 15));
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorText = widget.l10n.pageUpdateFailed;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPageInfo = widget.currentPage != null && widget.totalPages != null;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Drag handle
        Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: widget.isDark ? Colors.grey[700] : Colors.grey[300],
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(height: 24),

        // Reading complete badge (if duration provided)
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

        // Title
        Text(
          widget.l10n.pageUpdateDialogTitle,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: widget.isDark ? Colors.white : Colors.black,
          ),
        ),
        const SizedBox(height: 8),

        // Subtitle with current/total page info
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
        const SizedBox(height: 24),

        // Page input
        TextField(
          controller: widget.pageController,
          keyboardType: TextInputType.number,
          autofocus: true,
          textAlign: TextAlign.center,
          onChanged: (value) {
            setState(() {
              _errorText = _validatePage(value);
            });
          },
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

        // Update button
        SizedBox(
          width: double.infinity,
          child: GestureDetector(
            onTap: _isLoading ? null : _handleUpdate,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: _isLoading
                    ? BLabColors.primary.withValues(alpha: 0.5)
                    : BLabColors.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: _isLoading
                  ? const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      ),
                    )
                  : Text(
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

        // Skip/Cancel button
        SizedBox(
          width: double.infinity,
          child: GestureDetector(
            onTap: () {
              Navigator.pop(context);
              widget.onSkip?.call();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(
                widget.onSkip != null
                    ? widget.l10n.pageUpdateLater
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
