import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:flutter/material.dart';

/// 오늘의 분량 설정 시트
///
/// 시작 페이지와 목표 페이지를 입력받아 오늘의 분량을 설정합니다.
class TodayGoalSheet {
  /// 오늘의 분량 설정 시트 표시
  ///
  /// [context] - BuildContext
  /// [initialStartPage] - 초기 시작 페이지
  /// [initialTargetPage] - 초기 목표 페이지
  /// [onSave] - 저장 콜백 (시작 페이지, 목표 페이지)
  static void show({
    required BuildContext context,
    int? initialStartPage,
    int? initialTargetPage,
    required Function(int startPage, int targetPage) onSave,
  }) {
    final startController =
        TextEditingController(text: initialStartPage?.toString() ?? '');
    final endController =
        TextEditingController(text: initialTargetPage?.toString() ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
              const Text(
                '오늘의 분량 설정',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: startController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: '시작 페이지',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: endController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: '목표 페이지',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    final start = int.tryParse(startController.text);
                    final end = int.tryParse(endController.text);
                    if (start != null && end != null && start < end) {
                      onSave(start, end);
                      Navigator.pop(context);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: BLabColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    '저장',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
