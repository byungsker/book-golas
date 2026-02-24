import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:flutter/services.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// 연간 독서 목표 설정 바텀시트
///
/// 온보딩 및 설정 화면에서 연간 독서 목표를 설정하는 바텀시트
class ReadingGoalSheet {
  /// 연간 목표 설정 바텀시트 표시
  ///
  /// [context] - BuildContext
  /// [year] - 목표 연도
  /// [currentGoal] - 현재 설정된 목표 (수정 시)
  /// [onSave] - 저장 콜백 (목표 권수)
  static Future<int?> show({
    required BuildContext context,
    required int year,
    int? currentGoal,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    int selectedGoal = currentGoal ?? 24;
    final TextEditingController customController = TextEditingController();
    bool useCustom = false;

    final presetGoals = [12, 24, 36, 50];

    return await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: BoxDecoration(
                color: isDark ? BLabColors.surfaceDark : BLabColors.surfaceLight,
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
                  Row(
                    children: [
                      const Text(
                        '📚',
                        style: TextStyle(fontSize: 28),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        AppLocalizations.of(context)
                            .readingGoalSheetTitle(year),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 22,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppLocalizations.of(context).readingGoalSheetQuestion,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    AppLocalizations.of(context).readingGoalSheetRecommended,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.grey[300] : Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: presetGoals.map((goal) {
                      final isSelected = !useCustom && selectedGoal == goal;
                      return Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(
                            right: goal != presetGoals.last ? 8 : 0,
                          ),
                          child: GestureDetector(
                            onTap: () {
                              setModalState(() {
                                selectedGoal = goal;
                                useCustom = false;
                                customController.clear();
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                vertical: 16,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? BLabColors.primary
                                    : (isDark
                                        ? Colors.grey[800]
                                        : Colors.grey[100]),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isSelected
                                      ? BLabColors.primary
                                      : (isDark
                                          ? Colors.grey[700]!
                                          : Colors.grey[300]!),
                                ),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    '$goal',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: isSelected
                                          ? Colors.white
                                          : (isDark
                                              ? Colors.white
                                              : Colors.black87),
                                    ),
                                  ),
                                  Text(
                                    AppLocalizations.of(context)
                                        .readingGoalSheetBooks,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isSelected
                                          ? Colors.white70
                                          : (isDark
                                              ? Colors.grey[500]
                                              : Colors.grey[600]),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Text(
                        AppLocalizations.of(context).readingGoalSheetCustom,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.grey[300] : Colors.grey[700],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _getGoalMessage(context, selectedGoal),
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[500] : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: customController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(3),
                    ],
                    onChanged: (value) {
                      setModalState(() {
                        final parsed = int.tryParse(value);
                        if (parsed != null && parsed > 0) {
                          selectedGoal = parsed;
                          useCustom = true;
                        }
                      });
                    },
                    decoration: InputDecoration(
                      hintText:
                          AppLocalizations.of(context).readingGoalSheetHint,
                      suffixText:
                          AppLocalizations.of(context).readingGoalSheetBooks,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: BLabColors.primary,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark
                          ? BLabColors.subtleDark
                          : BLabColors.subtleBlueLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.lightbulb_outline_rounded,
                          size: 20,
                          color: BLabColors.primary,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _getMotivationMessage(context, selectedGoal),
                            style: TextStyle(
                              fontSize: 13,
                              color:
                                  isDark ? Colors.grey[300] : Colors.grey[700],
                            ),
                          ),
                        ),
                      ],
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
                          child: Text(
                            AppLocalizations.of(context)
                                .readingGoalSheetCancel,
                            style: TextStyle(
                              color:
                                  isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: selectedGoal > 0
                              ? () => Navigator.pop(context, selectedGoal)
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
                            currentGoal != null
                                ? AppLocalizations.of(context)
                                    .readingGoalSheetUpdate
                                : AppLocalizations.of(context)
                                    .readingGoalSheetSet,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
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

  static String _getGoalMessage(BuildContext context, int goal) {
    final booksPerMonth = (goal / 12).toStringAsFixed(1);
    return AppLocalizations.of(context)
        .readingGoalSheetBooksPerMonth(booksPerMonth);
  }

  static String _getMotivationMessage(BuildContext context, int goal) {
    if (goal <= 12) {
      return AppLocalizations.of(context).readingGoalSheetMotivation1;
    } else if (goal <= 24) {
      return AppLocalizations.of(context).readingGoalSheetMotivation2;
    } else if (goal <= 36) {
      return AppLocalizations.of(context).readingGoalSheetMotivation3;
    } else if (goal <= 50) {
      return AppLocalizations.of(context).readingGoalSheetMotivation4;
    } else {
      return AppLocalizations.of(context).readingGoalSheetMotivation5;
    }
  }
}
