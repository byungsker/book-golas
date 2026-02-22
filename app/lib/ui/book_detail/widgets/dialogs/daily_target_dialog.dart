import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:book_golas/l10n/app_localizations.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/keyboard_accessory_bar.dart';

/// 일일 목표 페이지 변경 다이얼로그
///
/// 수평 다이얼 피커와 예상 스케줄 테이블을 표시합니다.
class DailyTargetDialog {
  /// 일일 목표 페이지 변경 다이얼로그 표시
  ///
  /// [context] - BuildContext
  /// [book] - 현재 책 정보
  /// [pagesLeft] - 남은 페이지 수
  /// [daysLeft] - 남은 일수
  /// [onSave] - 저장 완료 콜백 (새 일일 목표 전달)
  static Future<void> show({
    required BuildContext context,
    required Book book,
    required int pagesLeft,
    required int daysLeft,
    required Function(int newDailyTarget) onSave,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final parentContext = context;

    // 현재 일일 목표: 저장된 값 우선 사용, 없으면 동적 계산
    final currentDailyTarget = book.dailyTargetPages ??
        (daysLeft > 0 ? (pagesLeft / daysLeft).ceil() : pagesLeft);

    int newDailyTarget = currentDailyTarget;
    final wheelController =
        FixedExtentScrollController(initialItem: newDailyTarget - 1);

    // 스케줄 계산 함수 (점차 줄어드는 방식)
    List<Map<String, dynamic>> calculateSchedule(int dailyTarget) {
      final schedule = <Map<String, dynamic>>[];
      int remainingPages = pagesLeft;
      DateTime currentDate = DateTime.now();
      final targetDate = book.targetDate;

      while (remainingPages > 0 &&
          !currentDate.isAfter(targetDate.add(const Duration(days: 30)))) {
        int pagesToRead;
        if (schedule.isEmpty) {
          pagesToRead = dailyTarget;
        } else {
          final daysRemaining = targetDate.difference(currentDate).inDays + 1;
          if (daysRemaining > 0) {
            pagesToRead = (remainingPages / daysRemaining).ceil();
          } else {
            pagesToRead = remainingPages;
          }
        }
        pagesToRead = pagesToRead.clamp(1, remainingPages);

        List<String> getWeekdayLabels(BuildContext context) {
          final l10n = AppLocalizations.of(context);
          return [
            l10n.weekdayMon,
            l10n.weekdayTue,
            l10n.weekdayWed,
            l10n.weekdayThu,
            l10n.weekdayFri,
            l10n.weekdaySat,
            l10n.weekdaySun,
          ];
        }

        final weekday = getWeekdayLabels(context)[currentDate.weekday - 1];

        schedule.add({
          'date': currentDate,
          'weekday': weekday,
          'pages': pagesToRead,
          'isToday': currentDate.day == DateTime.now().day &&
              currentDate.month == DateTime.now().month &&
              currentDate.year == DateTime.now().year,
        });

        remainingPages -= pagesToRead;
        currentDate = currentDate.add(const Duration(days: 1));
      }

      return schedule;
    }

    // 캐시된 스케줄 (dailyTarget 변경 시에만 재계산)
    var cachedSchedule = calculateSchedule(currentDailyTarget);
    int lastCalculatedTarget = currentDailyTarget;

    // 직접 입력용 컨트롤러
    final inputController =
        TextEditingController(text: currentDailyTarget.toString());
    final inputFocusNode = FocusNode();
    final sheetController = DraggableScrollableController();
    bool isInputFocused = false;
    bool listenerAdded = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            // 포커스 리스너 설정 (한 번만)
            if (!listenerAdded) {
              listenerAdded = true;
              inputFocusNode.addListener(() {
                setModalState(() {
                  isInputFocused = inputFocusNode.hasFocus;
                });
                if (inputFocusNode.hasFocus) {
                  sheetController.animateTo(
                    0.95,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOut,
                  );
                }
              });
            }

            // dailyTarget이 변경된 경우에만 재계산
            if (newDailyTarget != lastCalculatedTarget) {
              cachedSchedule = calculateSchedule(newDailyTarget);
              lastCalculatedTarget = newDailyTarget;
            }
            final schedule = cachedSchedule;
            final maxPages = schedule.isNotEmpty
                ? schedule
                    .map((s) => s['pages'] as int)
                    .reduce((a, b) => a > b ? a : b)
                : newDailyTarget;

            return Stack(
              children: [
                // 투명한 영역 터치 시 모달 닫기
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    color: Colors.transparent,
                  ),
                ),
                // DraggableScrollableSheet
                NotificationListener<DraggableScrollableNotification>(
                  onNotification: (notification) {
                    return true;
                  },
                  child: DraggableScrollableSheet(
                    controller: sheetController,
                    initialChildSize: isInputFocused ? 0.95 : 0.6,
                    minChildSize: isInputFocused ? 0.95 : 0.6,
                    maxChildSize: 0.95,
                    builder: (context, scrollController) {
                      return Container(
                        decoration: BoxDecoration(
                          color: isDark ? BLabColors.surfaceDark : Colors.white,
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(24)),
                        ),
                        child: Column(
                          children: [
                            Expanded(
                              child: CustomScrollView(
                                controller: scrollController,
                                slivers: [
                                  SliverToBoxAdapter(
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 12),
                                        Center(
                                          child: Container(
                                            width: 40,
                                            height: 4,
                                            decoration: BoxDecoration(
                                              color: Colors.grey[400],
                                              borderRadius:
                                                  BorderRadius.circular(2),
                                            ),
                                          ),
                                        ),
                                        Padding(
                                          padding: const EdgeInsets.all(24),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              _buildHeader(
                                                context: context,
                                                isDark: isDark,
                                                pagesLeft: pagesLeft,
                                                daysLeft: daysLeft,
                                              ),
                                              const SizedBox(height: 28),
                                              // 수평 다이얼 피커
                                              _buildDialPicker(
                                                isDark: isDark,
                                                pagesLeft: pagesLeft,
                                                newDailyTarget: newDailyTarget,
                                                wheelController:
                                                    wheelController,
                                                onChanged: (value) {
                                                  HapticFeedback.lightImpact();
                                                  setModalState(() {
                                                    newDailyTarget = value;
                                                    inputController.text =
                                                        value.toString();
                                                  });
                                                },
                                              ),
                                              const SizedBox(height: 12),
                                              // 직접 입력 필드
                                              _buildInputField(
                                                isDark: isDark,
                                                pagesLeft: pagesLeft,
                                                inputController:
                                                    inputController,
                                                inputFocusNode: inputFocusNode,
                                                wheelController:
                                                    wheelController,
                                                onChanged: (value) {
                                                  setModalState(() {
                                                    newDailyTarget = value;
                                                  });
                                                },
                                              ),
                                              const SizedBox(height: 16),
                                              Text(
                                                AppLocalizations.of(context)
                                                    .expectedSchedule,
                                                style: TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w600,
                                                  color: isDark
                                                      ? Colors.white
                                                      : Colors.black,
                                                ),
                                              ),
                                              const SizedBox(height: 12),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  // 스케줄 리스트
                                  SliverList(
                                    delegate: SliverChildBuilderDelegate(
                                      (context, index) {
                                        if (index >= schedule.length) {
                                          return null;
                                        }
                                        return _buildScheduleItem(
                                          isDark: isDark,
                                          item: schedule[index],
                                          index: index,
                                          totalCount: schedule.length,
                                          maxPages: maxPages,
                                        );
                                      },
                                      childCount: schedule.length,
                                    ),
                                  ),
                                  // 하단 버튼 공간 확보용
                                  const SliverToBoxAdapter(
                                    child: SizedBox(height: 16),
                                  ),
                                ],
                              ),
                            ),
                            // 버튼 영역 (하단 고정, 인풋 활성화 시 숨김)
                            if (!isInputFocused)
                              _buildButtonRow(
                                context: context,
                                parentContext: parentContext,
                                isDark: isDark,
                                book: book,
                                newDailyTarget: newDailyTarget,
                                onSave: onSave,
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                // 키보드 액세서리 바 (인풋 포커스 시, 키보드 위 8px)
                if (isInputFocused)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: MediaQuery.of(context).viewInsets.bottom + 8,
                    child: KeyboardAccessoryBar(
                      onDone: () {
                        inputFocusNode.unfocus();
                      },
                      isDark: isDark,
                      icon: CupertinoIcons.checkmark,
                    ),
                  ),
              ],
            );
          },
        );
      },
    );
  }

  static Widget _buildHeader({
    required BuildContext context,
    required bool isDark,
    required int pagesLeft,
    required int daysLeft,
  }) {
    final l10n = AppLocalizations.of(context);
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: BLabColors.success.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            CupertinoIcons.book,
            color: BLabColors.success,
            size: 24,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.dailyTargetChangeTitle,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: l10n.pagesRemainingShort(pagesLeft),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.grey[300] : Colors.grey[700],
                      ),
                    ),
                    TextSpan(
                      text: l10n.pagesRemainingWithDays(daysLeft),
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  static Widget _buildDialPicker({
    required bool isDark,
    required int pagesLeft,
    required int newDailyTarget,
    required FixedExtentScrollController wheelController,
    required Function(int) onChanged,
  }) {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: isDark ? BLabColors.subtleDark : Colors.grey[100],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Stack(
        children: [
          Center(
            child: Container(
              width: 100,
              height: 90,
              decoration: BoxDecoration(
                color: BLabColors.success.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          RotatedBox(
            quarterTurns: 3,
            child: ListWheelScrollView.useDelegate(
              controller: wheelController,
              itemExtent: 90,
              perspective: 0.005,
              diameterRatio: 1.5,
              physics: const FixedExtentScrollPhysics(),
              onSelectedItemChanged: (index) {
                onChanged(index + 1);
              },
              childDelegate: ListWheelChildBuilderDelegate(
                childCount: pagesLeft.clamp(1, 200),
                builder: (context, index) {
                  final value = index + 1;
                  final isSelected = value == newDailyTarget;
                  return GestureDetector(
                    onTap: () {
                      wheelController.animateToItem(
                        index,
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                    child: RotatedBox(
                      quarterTurns: 1,
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$value',
                              style: TextStyle(
                                fontSize: isSelected ? 42 : 18,
                                fontWeight: isSelected
                                    ? FontWeight.w700
                                    : FontWeight.w400,
                                color: isSelected
                                    ? BLabColors.success
                                    : (isDark
                                        ? Colors.grey[500]
                                        : Colors.grey[400]),
                              ),
                            ),
                            if (isSelected)
                              Builder(
                                builder: (context) => Text(
                                  AppLocalizations.of(context).pagesPerDay,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark
                                        ? Colors.grey[400]
                                        : Colors.grey[600],
                                  ),
                                ),
                              ),
                          ],
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

  static Widget _buildInputField({
    required bool isDark,
    required int pagesLeft,
    required TextEditingController inputController,
    required FocusNode inputFocusNode,
    required FixedExtentScrollController wheelController,
    required Function(int) onChanged,
  }) {
    return Center(
      child: SizedBox(
        width: 80,
        height: 36,
        child: TextField(
          controller: inputController,
          focusNode: inputFocusNode,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : Colors.black,
          ),
          decoration: InputDecoration(
            isDense: true,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey[400]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: BLabColors.success),
            ),
            suffixText: 'p',
            suffixStyle: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          onChanged: (value) {
            final parsed = int.tryParse(value);
            if (parsed != null &&
                parsed >= 1 &&
                parsed <= pagesLeft.clamp(1, 200)) {
              onChanged(parsed);
              wheelController.jumpToItem(parsed - 1);
            }
          },
        ),
      ),
    );
  }

  static Widget _buildScheduleItem({
    required bool isDark,
    required Map<String, dynamic> item,
    required int index,
    required int totalCount,
    required int maxPages,
  }) {
    final date = item['date'] as DateTime;
    final isToday = item['isToday'] as bool;
    final pages = item['pages'] as int;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 10,
      ),
      decoration: BoxDecoration(
        color: isToday
            ? BLabColors.primary.withValues(alpha: 0.1)
            : (isDark ? BLabColors.subtleDark : Colors.grey[50]),
        borderRadius: index == 0
            ? const BorderRadius.vertical(top: Radius.circular(12))
            : (index == totalCount - 1
                ? const BorderRadius.vertical(bottom: Radius.circular(12))
                : null),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '${date.month}/${date.day} (${item['weekday']})',
              style: TextStyle(
                fontSize: 14,
                fontWeight: isToday ? FontWeight.bold : FontWeight.w400,
                color: isToday
                    ? BLabColors.primary
                    : (isDark ? Colors.grey[300] : Colors.grey[700]),
              ),
            ),
          ),
          Expanded(
            child: Container(
              height: 6,
              margin: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[700] : Colors.grey[200],
                borderRadius: BorderRadius.circular(3),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: pages / maxPages,
                child: Container(
                  decoration: BoxDecoration(
                    color: BLabColors.success,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ),
          Text(
            '${pages}p',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  static Widget _buildButtonRow({
    required BuildContext context,
    required BuildContext parentContext,
    required bool isDark,
    required Book book,
    required int newDailyTarget,
    required Function(int) onSave,
  }) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        16,
        24,
        24 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Row(
        children: [
          Expanded(
            child: TextButton(
              onPressed: () => Navigator.pop(context),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: Text(AppLocalizations.of(context).commonCancel),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: () async {
                // book id 확인
                final l10n = AppLocalizations.of(context);
                final bookId = book.id;
                if (bookId == null) {
                  Navigator.pop(context);
                  CustomSnackbar.show(
                    parentContext,
                    message: l10n.bookInfoNotFound,
                    type: BLabSnackbarType.error,
                    bottomOffset: 100,
                  );
                  return;
                }

                try {
                  await Supabase.instance.client.from('books').update(
                      {'daily_target_pages': newDailyTarget}).eq('id', bookId);

                  if (!context.mounted) return;
                  Navigator.pop(context);

                  onSave(newDailyTarget);

                  CustomSnackbar.show(
                    parentContext,
                    message: l10n.todayGoalChanged(newDailyTarget),
                    type: BLabSnackbarType.success,
                    bottomOffset: 100,
                  );
                } catch (e) {
                  if (!context.mounted) return;
                  Navigator.pop(context);
                  CustomSnackbar.show(
                    parentContext,
                    message: '${l10n.goalChangeFailed}: $e',
                    type: BLabSnackbarType.error,
                    bottomOffset: 100,
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: BLabColors.success,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                AppLocalizations.of(context).commonChange,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
