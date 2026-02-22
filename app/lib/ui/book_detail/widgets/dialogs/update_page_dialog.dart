import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';

/// 현재 페이지 업데이트 다이얼로그
///
/// 사용자가 현재 읽은 페이지를 업데이트할 수 있는 바텀시트
class UpdatePageDialog {
  /// 페이지 업데이트 다이얼로그 표시
  ///
  /// [context] - BuildContext
  /// [currentPage] - 현재 페이지
  /// [totalPages] - 총 페이지
  /// [onUpdate] - 업데이트 완료 콜백 (새 페이지 번호 전달)
  static Future<void> show({
    required BuildContext context,
    required int currentPage,
    required int totalPages,
    required Function(int newPage) onUpdate,
  }) async {
    final TextEditingController controller = TextEditingController(text: '');
    final isDark = Theme.of(context).brightness == Brightness.dark;
    String? errorText;
    bool isValid = false;

    String? validatePage(BuildContext context, String value) {
      final l10n = AppLocalizations.of(context);
      if (value.isEmpty) {
        return null;
      }
      final page = int.tryParse(value);
      if (page == null) {
        return l10n.validationEnterNumber;
      }
      if (page < 0) {
        return l10n.validationPageMinimum;
      }
      if (page > totalPages) {
        return l10n.validationPageExceedsTotal(totalPages);
      }
      if (page < currentPage) {
        return l10n.validationPageBelowCurrent(currentPage);
      }
      return null;
    }

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: BoxDecoration(
                color: isDark ? BLabColors.surfaceDark : Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    AppLocalizations.of(context).updatePageTitle,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 20,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        AppLocalizations.of(context)
                            .currentPageLabel(currentPage),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: BLabColors.primary,
                        ),
                      ),
                      Text(
                        AppLocalizations.of(context)
                            .totalPageLabel(totalPages),
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: controller,
                    keyboardType: TextInputType.number,
                    autofocus: true,
                    onChanged: (value) {
                      setModalState(() {
                        errorText = validatePage(context, value);
                        isValid = errorText == null && value.isNotEmpty;
                      });
                    },
                    decoration: InputDecoration(
                      labelText: AppLocalizations.of(context).newPageNumber,
                      hintText: '${currentPage + 1} ~ $totalPages',
                      errorText: errorText,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: errorText != null
                              ? Colors.red
                              : BLabColors.primary,
                          width: 2,
                        ),
                      ),
                      errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: Colors.red,
                          width: 2,
                        ),
                      ),
                      focusedErrorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: Colors.red,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.pop(context),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child:
                              Text(AppLocalizations.of(context).commonCancel),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: isValid
                              ? () {
                                  final page = int.parse(controller.text);
                                  Navigator.pop(context);
                                  onUpdate(page);
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: BLabColors.primary,
                            disabledBackgroundColor:
                                isDark ? Colors.grey[700] : Colors.grey[300],
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            AppLocalizations.of(context).updateButton,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: isValid
                                  ? Colors.white
                                  : (isDark
                                      ? Colors.grey[500]
                                      : Colors.grey[500]),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
