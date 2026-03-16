import 'package:flutter/material.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// 완독 시 별점 + 한줄평 입력 바텀시트
///
/// 책을 완독했을 때 별점과 한줄평을 입력받는 바텀시트
class BookCompletionSheet {
  /// 완독 바텀시트 표시
  ///
  /// [context] - BuildContext
  /// [bookTitle] - 책 제목
  /// [onSubmit] - 제출 콜백 (별점, 한줄평)
  /// [onSkip] - 나중에 하기 콜백
  static Future<void> show({
    required BuildContext context,
    required String bookTitle,
    required Function(int rating, String? review) onSubmit,
    VoidCallback? onSkip,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    int selectedRating = 0;
    final TextEditingController reviewController = TextEditingController();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
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
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Text(
                    '🎉',
                    style: TextStyle(fontSize: 48),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '완독을 축하합니다!',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 22,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    bookTitle,
                    style: TextStyle(
                      fontSize: 16,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    '이 책은 어땠나요?',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      final starIndex = index + 1;
                      return GestureDetector(
                        onTap: () {
                          setModalState(() {
                            selectedRating = starIndex;
                          });
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Icon(
                            starIndex <= selectedRating
                                ? Icons.star_rounded
                                : Icons.star_outline_rounded,
                            size: 40,
                            color: starIndex <= selectedRating
                                ? Colors.amber
                                : (isDark
                                    ? Colors.grey[600]
                                    : Colors.grey[400]),
                          ),
                        ),
                      );
                    }),
                  ),
                  if (selectedRating > 0) ...[
                    const SizedBox(height: 8),
                    Text(
                      _getRatingMessage(selectedRating),
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.amber[700],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  TextField(
                    controller: reviewController,
                    maxLength: 100,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: '한줄평 (선택사항)',
                      hintText: '이 책을 한 마디로 표현하면...',
                      alignLabelWithHint: true,
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
                      counterStyle: TextStyle(
                        color: isDark ? Colors.grey[500] : Colors.grey[600],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () {
                            Navigator.pop(context);
                            onSkip?.call();
                          },
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: Text(
                            '나중에',
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
                          onPressed: selectedRating > 0
                              ? () {
                                  Navigator.pop(context);
                                  onSubmit(
                                    selectedRating,
                                    reviewController.text.trim().isEmpty
                                        ? null
                                        : reviewController.text.trim(),
                                  );
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
                            '완료',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: selectedRating > 0
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

  static String _getRatingMessage(int rating) {
    switch (rating) {
      case 1:
        return '아쉬웠어요 😢';
      case 2:
        return '그저 그랬어요 😐';
      case 3:
        return '괜찮았어요 🙂';
      case 4:
        return '재미있었어요! 😊';
      case 5:
        return '최고였어요! 🤩';
      default:
        return '';
    }
  }
}
