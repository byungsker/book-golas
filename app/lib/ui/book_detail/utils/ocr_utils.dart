import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/extracted_text_modal.dart';
import 'package:book_golas/data/services/google_vision_ocr_service.dart';
import 'package:book_golas/ui/book_detail/utils/document_scan_utils.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/home/widgets/pro_upgrade_banner.dart';
import 'package:book_golas/ui/subscription/widgets/ocr_limit_dialog.dart';
import 'package:book_golas/utils/subscription_utils.dart';

String sanitizeOcrText(String text) {
  if (text.isEmpty) return text;

  var result = text;

  result = result.replaceAll(
      RegExp(r'[\u200B-\u200D\uFEFF\u00AD\u034F\u061C\u180E]'), '');
  result = result.replaceAll(
      RegExp(r'[\u00A0\u2000-\u200A\u202F\u205F\u3000\u2028\u2029]'), ' ');
  result = result.replaceAll(RegExp(r'\r\n|\r'), '\n');
  result = result.replaceAll(RegExp(r'[ \t\u00A0]+'), ' ');

  result = _removeOcrSpacingErrors(result);

  result = result.replaceAll(RegExp(r' *\n *'), '\n');
  result = result.replaceAll(RegExp(r'\n{2,}'), '\n\n');
  final lines = result.split('\n');
  final cleanedLines = <String>[];
  for (final line in lines) {
    final trimmed = line.trim();
    if (trimmed.isNotEmpty) {
      cleanedLines.add(trimmed);
    } else if (cleanedLines.isNotEmpty && cleanedLines.last.isNotEmpty) {
      cleanedLines.add('');
    }
  }
  while (cleanedLines.isNotEmpty && cleanedLines.last.isEmpty) {
    cleanedLines.removeLast();
  }
  result = cleanedLines.join('\n');
  result = result.trim();

  return result;
}

String _removeOcrSpacingErrors(String text) {
  final koreanChar = RegExp(r'[\uAC00-\uD7AF]');

  final buffer = StringBuffer();
  final chars = text.split('');

  for (var i = 0; i < chars.length; i++) {
    final current = chars[i];

    if (current == ' ' && i > 0 && i < chars.length - 1) {
      final prev = chars[i - 1];
      final next = chars[i + 1];

      if (koreanChar.hasMatch(prev) && koreanChar.hasMatch(next)) {
        var singleCharCount = 0;
        var checkIdx = i - 1;
        while (checkIdx >= 0) {
          final c = chars[checkIdx];
          if (koreanChar.hasMatch(c)) {
            singleCharCount++;
            checkIdx--;
            if (checkIdx >= 0 && chars[checkIdx] == ' ') {
              checkIdx--;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        checkIdx = i + 1;
        while (checkIdx < chars.length) {
          final c = chars[checkIdx];
          if (koreanChar.hasMatch(c)) {
            singleCharCount++;
            checkIdx++;
            if (checkIdx < chars.length && chars[checkIdx] == ' ') {
              checkIdx++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        if (singleCharCount >= 3) {
          continue;
        }
      }
    }

    buffer.write(current);
  }

  return buffer.toString();
}

int? extractPageNumber(String text) {
  final patterns = [
    RegExp(r'[-–]\s*(\d{1,4})\s*[-–]'),
    RegExp(r'[pP]\.?\s*(\d{1,4})'),
    RegExp(r'[pP]age\s*(\d{1,4})', caseSensitive: false),
    RegExp(r'(\d{1,4})\s*페이지'),
    RegExp(r'(\d{1,4})\s*쪽'),
    RegExp(r'^\s*(\d{1,4})\s*$', multiLine: true),
    RegExp(r'^(\d{1,4})\s+\S', multiLine: true),
    RegExp(r'\S\s+(\d{1,4})$', multiLine: true),
    RegExp(r'\((\d{1,4})\)'),
    RegExp(r'\[(\d{1,4})\]'),
    RegExp(r'^(\d{1,4})\b'),
    RegExp(r'\b(\d{1,4})$'),
  ];

  for (final pattern in patterns) {
    final match = pattern.firstMatch(text);
    if (match != null) {
      final pageStr = match.group(1);
      if (pageStr != null) {
        final page = int.tryParse(pageStr);
        if (page != null && page > 0 && page < 10000) {
          final matchStart = match.start;
          if (matchStart > 0 && text[matchStart - 1] == '.') {
            continue;
          }
          final matchEnd = match.end;
          if (matchEnd < text.length && text[matchEnd] == '.') {
            continue;
          }
          return page;
        }
      }
    }
  }
  return null;
}

Future<void> extractTextFromLocalImage(
  BuildContext context,
  Uint8List imageBytes,
  Function(String extractedText, int? pageNumber) onComplete,
) async {
  final canUse = await SubscriptionUtils.canUseOcr();
  if (!canUse) {
    if (context.mounted) {
      showOcrLimitDialog(context);
    }
    return;
  }

  bool isLoadingDialogShown = false;
  final parentContext = context;

  try {
    final tempDir = Directory.systemTemp;
    final tempFile = File(
        '${tempDir.path}/temp_ocr_${DateTime.now().millisecondsSinceEpoch}.jpg');
    await tempFile.writeAsBytes(imageBytes);

    debugPrint('OCR: 크롭 화면 표시 중...');
    final croppedFile = await ImageCropper().cropImage(
      sourcePath: tempFile.path,
      uiSettings: [
        IOSUiSettings(
          title: '텍스트 추출 영역 선택',
          cancelButtonTitle: '취소',
          doneButtonTitle: '완료',
          aspectRatioLockEnabled: false,
          resetAspectRatioEnabled: true,
          rotateButtonsHidden: false,
          rotateClockwiseButtonHidden: true,
        ),
        AndroidUiSettings(
          toolbarTitle: '텍스트 추출 영역 선택',
          toolbarColor: BLabColors.primary,
          toolbarWidgetColor: Colors.white,
          initAspectRatio: CropAspectRatioPreset.original,
          lockAspectRatio: false,
          hideBottomControls: false,
        ),
      ],
    );

    try {
      await tempFile.delete();
    } catch (_) {}

    if (croppedFile == null) {
      debugPrint('OCR: 사용자가 크롭을 취소했습니다.');
      return;
    }

    debugPrint('OCR: 크롭 완료, 텍스트 추출 시작...');
    isLoadingDialogShown = true;
    showDialog(
      context: parentContext,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(dialogContext).brightness == Brightness.dark
                  ? BLabColors.subtleDark
                  : Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(color: BLabColors.primary),
                const SizedBox(height: 16),
                Text(
                  AppLocalizations.of(dialogContext).extractingText,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    decoration: TextDecoration.none,
                    color: Theme.of(dialogContext).brightness == Brightness.dark
                        ? Colors.white
                        : Colors.black,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    final ocrService = GoogleVisionOcrService();
    final croppedBytes = await croppedFile.readAsBytes();
    debugPrint('OCR: 크롭된 이미지 크기: ${croppedBytes.length} bytes');

    final ocrText = await ocrService.extractTextFromBytes(croppedBytes);
    final pageNumber = extractPageNumber(ocrText ?? '');

    if (isLoadingDialogShown) {
      Navigator.of(parentContext, rootNavigator: true).pop();
      isLoadingDialogShown = false;
    }

    if (ocrText == null || ocrText.isEmpty) {
      debugPrint('OCR: 텍스트 추출 결과가 비어있습니다.');
      CustomSnackbar.show(parentContext,
          message: AppLocalizations.of(parentContext).ocrExtractionFailed,
          rootOverlay: true);
      return;
    }

    debugPrint('OCR: 텍스트 추출 성공 (길이: ${ocrText.length})');
    await SubscriptionUtils.incrementOcrUsage();
    onComplete(ocrText, pageNumber);
  } catch (e) {
    debugPrint('OCR: 예외 발생 - $e');

    if (isLoadingDialogShown) {
      try {
        Navigator.of(parentContext, rootNavigator: true).pop();
      } catch (_) {}
    }

    CustomSnackbar.show(parentContext,
        message: AppLocalizations.of(parentContext).ocrExtractionFailed,
        rootOverlay: true);
  }
}

Future<void> pickImageAndExtractText(
  BuildContext context,
  ImageSource source,
  Function(Uint8List imageBytes, String ocrText, int? pageNumber) onComplete,
) async {
  final canUse = await SubscriptionUtils.canUseOcr();
  if (!canUse) {
    if (context.mounted) {
      showOcrLimitDialog(context);
    }
    return;
  }

  final parentContext = context;

  try {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source);
    if (pickedFile == null) return;

    final fullImageBytes = await pickedFile.readAsBytes();
    debugPrint('이미지 선택 완료 (${fullImageBytes.length} bytes)');

    final isDark = Theme.of(parentContext).brightness == Brightness.dark;
    final isPro = await SubscriptionUtils.isProUser();
    final remaining =
        isPro ? -1 : await SubscriptionUtils.getRemainingOcrUses();

    final shouldExtract = await showModalBottomSheet<bool>(
      context: parentContext,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (bottomSheetContext) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              AppLocalizations.of(bottomSheetContext).extractTextConfirmTitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            if (!isPro) ...[
              const SizedBox(height: 8),
              Text(
                AppLocalizations.of(bottomSheetContext)
                    .extractTextFreeRemaining(
                        remaining,
                        SubscriptionConstants.maxOcrPerDayFree),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () {
                  showModalBottomSheet(
                    context: bottomSheetContext,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (_) => const ProFeaturesSheet(),
                  );
                },
                child: Text(
                  AppLocalizations.of(bottomSheetContext).ocrProUnlimitedButton,
                  style: const TextStyle(
                    fontSize: 12,
                    color: BLabColors.primary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(bottomSheetContext, false),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey[800] : Colors.grey[200],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          AppLocalizations.of(bottomSheetContext)
                              .noThanksButton,
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
                    onTap: () => Navigator.pop(bottomSheetContext, true),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: BLabColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          AppLocalizations.of(bottomSheetContext).extractButton,
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
                height: MediaQuery.of(bottomSheetContext).padding.bottom + 8),
          ],
        ),
      ),
    );

    if (shouldExtract != true) {
      onComplete(fullImageBytes, '', null);
      return;
    }

    String? extractedText;
    int? extractedPageNumber;
    bool shouldRetry = true;

    while (shouldRetry) {
      final tempDir = Directory.systemTemp;
      final tempFile = File(
          '${tempDir.path}/temp_ocr_${DateTime.now().millisecondsSinceEpoch}.jpg');
      await tempFile.writeAsBytes(fullImageBytes);

      debugPrint('OCR: 크롭 화면 표시 중...');
      final croppedFile = await ImageCropper().cropImage(
        sourcePath: tempFile.path,
        uiSettings: [
          IOSUiSettings(
            title: AppLocalizations.of(parentContext).ocrAreaSelectTitle,
            cancelButtonTitle: AppLocalizations.of(parentContext).commonCancel,
            doneButtonTitle: AppLocalizations.of(parentContext).commonComplete,
            aspectRatioLockEnabled: false,
            resetAspectRatioEnabled: true,
            rotateButtonsHidden: false,
            rotateClockwiseButtonHidden: true,
          ),
          AndroidUiSettings(
            toolbarTitle: AppLocalizations.of(parentContext).ocrAreaSelectTitle,
            toolbarColor: BLabColors.primary,
            toolbarWidgetColor: Colors.white,
            initAspectRatio: CropAspectRatioPreset.original,
            lockAspectRatio: false,
            hideBottomControls: false,
          ),
        ],
      );

      try {
        await tempFile.delete();
      } catch (_) {}

      if (croppedFile == null) {
        debugPrint('OCR: 사용자가 크롭을 취소했습니다.');
        onComplete(fullImageBytes, '', null);
        return;
      }

      debugPrint('OCR: 크롭 완료, 텍스트 추출 시작...');
      showDialog(
        context: parentContext,
        barrierDismissible: false,
        builder: (dialogContext) => PopScope(
          canPop: false,
          child: Center(
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? BLabColors.subtleDark : Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(color: BLabColors.primary),
                  const SizedBox(height: 16),
                  Text(
                    AppLocalizations.of(dialogContext).extractingText,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                      decoration: TextDecoration.none,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );

      final ocrService = GoogleVisionOcrService();
      final croppedBytes = await croppedFile.readAsBytes();
      debugPrint('OCR: 크롭된 이미지 크기: ${croppedBytes.length} bytes');

      final ocrText = await ocrService.extractTextFromBytes(croppedBytes);
      extractedPageNumber = extractPageNumber(ocrText ?? '');

      Navigator.of(parentContext, rootNavigator: true).pop();

      if (ocrText == null || ocrText.isEmpty) {
        debugPrint('OCR: 텍스트 추출 결과가 비어있습니다.');
        CustomSnackbar.show(
          parentContext,
          message: AppLocalizations.of(parentContext).ocrExtractionFailed,
          rootOverlay: true,
        );
        onComplete(fullImageBytes, '', null);
        return;
      }

      extractedText = sanitizeOcrText(ocrText);
      debugPrint('OCR: 텍스트 추출 성공 (길이: ${extractedText.length})');

      final modifiedText = await showExtractedTextModal(
        context: parentContext,
        initialText: extractedText,
        pageNumber: extractedPageNumber,
      );

      if (modifiedText != null) {
        extractedText = modifiedText;
        shouldRetry = false;
      }
    }

    await SubscriptionUtils.incrementOcrUsage();
    onComplete(fullImageBytes, extractedText ?? '', extractedPageNumber);
  } catch (e) {
    debugPrint('이미지 선택 예외 발생 - $e');
    CustomSnackbar.show(parentContext,
        message: AppLocalizations.of(parentContext).imageLoadFailed,
        rootOverlay: true);
  }
}

Future<void> reExtractTextFromImage(
  BuildContext context, {
  required String imageUrl,
  required Function(String extractedText) onConfirm,
}) async {
  final canUse = await SubscriptionUtils.canUseOcr();
  if (!canUse) {
    if (context.mounted) {
      showOcrLimitDialog(context);
    }
    return;
  }

  final isDark = Theme.of(context).brightness == Brightness.dark;
  final isPro = await SubscriptionUtils.isProUser();
  final remaining = isPro ? -1 : await SubscriptionUtils.getRemainingOcrUses();

  final shouldProceed = await showModalBottomSheet<bool>(
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
            AppLocalizations.of(bottomSheetContext).extractTextConfirmTitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white : Colors.black,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppLocalizations.of(bottomSheetContext).extractTextOverwriteMessage,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
              height: 1.4,
            ),
          ),
          if (!isPro) ...[
            const SizedBox(height: 8),
            Text(
              AppLocalizations.of(bottomSheetContext).extractTextFreeRemaining(
                  remaining,
                  SubscriptionConstants.maxOcrPerDayFree),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.grey[500] : Colors.grey[500],
              ),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () {
                showModalBottomSheet(
                  context: bottomSheetContext,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (_) => const ProFeaturesSheet(),
                );
              },
              child: Text(
                AppLocalizations.of(bottomSheetContext).ocrProUnlimitedButton,
                style: const TextStyle(
                  fontSize: 12,
                  color: BLabColors.primary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => Navigator.pop(bottomSheetContext, false),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey[800] : Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        AppLocalizations.of(bottomSheetContext).commonCancel,
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
                  onTap: () => Navigator.pop(bottomSheetContext, true),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: BLabColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        AppLocalizations.of(bottomSheetContext).dialogExtract,
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
              height: MediaQuery.of(bottomSheetContext).padding.bottom + 8),
        ],
      ),
    ),
  );

  if (shouldProceed != true) return;

  try {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(dialogContext).brightness == Brightness.dark
                  ? BLabColors.subtleDark
                  : Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(color: BLabColors.primary),
                const SizedBox(height: 16),
                Text(
                  AppLocalizations.of(dialogContext).loadingImage,
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(dialogContext).brightness == Brightness.dark
                        ? Colors.white
                        : Colors.black,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    final httpClient = HttpClient();
    final request = await httpClient.getUrl(Uri.parse(imageUrl));
    final response = await request.close();
    final bytes = await consolidateHttpClientResponseBytes(response);

    final tempDir = Directory.systemTemp;
    final tempFile = File(
        '${tempDir.path}/temp_image_${DateTime.now().millisecondsSinceEpoch}.jpg');
    await tempFile.writeAsBytes(bytes);

    Navigator.of(context, rootNavigator: true).pop();

    final croppedFile = await ImageCropper().cropImage(
      sourcePath: tempFile.path,
      uiSettings: [
        IOSUiSettings(
          title: AppLocalizations.of(context).ocrAreaSelectTitle,
          cancelButtonTitle: AppLocalizations.of(context).commonCancel,
          doneButtonTitle: AppLocalizations.of(context).commonComplete,
          aspectRatioLockEnabled: false,
          resetAspectRatioEnabled: true,
          rotateButtonsHidden: false,
          rotateClockwiseButtonHidden: true,
        ),
        AndroidUiSettings(
          toolbarTitle: AppLocalizations.of(context).ocrAreaSelectTitle,
          toolbarColor: BLabColors.primary,
          toolbarWidgetColor: Colors.white,
          initAspectRatio: CropAspectRatioPreset.original,
          lockAspectRatio: false,
          hideBottomControls: false,
        ),
      ],
    );

    await tempFile.delete();

    if (croppedFile == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(dialogContext).brightness == Brightness.dark
                  ? BLabColors.subtleDark
                  : Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(color: BLabColors.primary),
                const SizedBox(height: 16),
                Text(
                  AppLocalizations.of(dialogContext).extractingText,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    decoration: TextDecoration.none,
                    color: Theme.of(dialogContext).brightness == Brightness.dark
                        ? Colors.white
                        : Colors.black,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    final ocrService = GoogleVisionOcrService();
    final croppedBytes = await croppedFile.readAsBytes();
    final ocrText = await ocrService.extractTextFromBytes(croppedBytes) ?? '';

    Navigator.of(context, rootNavigator: true).pop();

    if (ocrText.isNotEmpty) {
      await SubscriptionUtils.incrementOcrUsage();
    }
    onConfirm(ocrText);
  } catch (e) {
    Navigator.of(context, rootNavigator: true).pop();
    CustomSnackbar.show(context,
        message: AppLocalizations.of(context).ocrReExtractionFailed,
        rootOverlay: true);
  }
}

Future<void> scanDocumentAndExtractText(
  BuildContext context,
  Function(Uint8List imageBytes, String ocrText, int? pageNumber) onComplete, {
  bool singlePage = false,
}) async {
  final canUse = await SubscriptionUtils.canUseOcr();
  if (!canUse) {
    if (context.mounted) {
      showOcrLimitDialog(context);
    }
    return;
  }

  final parentContext = context;

  try {
    final scannedBytes =
        await scanDocumentWithCamera(parentContext, singlePage: singlePage);
    if (scannedBytes == null) {
      debugPrint('문서 스캔 취소');
      return;
    }

    debugPrint('문서 스캔 완료 (${scannedBytes.length} bytes)');

    final isDark = Theme.of(parentContext).brightness == Brightness.dark;
    final isPro = await SubscriptionUtils.isProUser();
    final remaining =
        isPro ? -1 : await SubscriptionUtils.getRemainingOcrUses();

    final shouldExtract = await showModalBottomSheet<bool>(
      context: parentContext,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (bottomSheetContext) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              AppLocalizations.of(bottomSheetContext).extractTextConfirmTitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            if (!isPro) ...[
              const SizedBox(height: 8),
              Text(
                AppLocalizations.of(bottomSheetContext)
                    .extractTextFreeRemaining(
                        remaining,
                        SubscriptionConstants.maxOcrPerDayFree),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () {
                  showModalBottomSheet(
                    context: bottomSheetContext,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (_) => const ProFeaturesSheet(),
                  );
                },
                child: Text(
                  AppLocalizations.of(bottomSheetContext).ocrProUnlimitedButton,
                  style: const TextStyle(
                    fontSize: 12,
                    color: BLabColors.primary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(bottomSheetContext, false),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey[800] : Colors.grey[200],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          AppLocalizations.of(bottomSheetContext)
                              .noThanksButton,
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
                    onTap: () => Navigator.pop(bottomSheetContext, true),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: BLabColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          AppLocalizations.of(bottomSheetContext).extractButton,
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
                height: MediaQuery.of(bottomSheetContext).padding.bottom + 8),
          ],
        ),
      ),
    );

    if (shouldExtract != true) {
      onComplete(scannedBytes, '', null);
      return;
    }

    showDialog(
      context: parentContext,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? BLabColors.subtleDark : Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(color: BLabColors.primary),
                const SizedBox(height: 16),
                Text(
                  AppLocalizations.of(dialogContext).extractingText,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    decoration: TextDecoration.none,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    final ocrService = GoogleVisionOcrService();
    final ocrText = await ocrService.extractTextFromBytes(scannedBytes);
    final pageNumber = extractPageNumber(ocrText ?? '');

    Navigator.of(parentContext, rootNavigator: true).pop();

    if (ocrText == null || ocrText.isEmpty) {
      debugPrint('OCR: 텍스트 추출 결과가 비어있습니다.');
      CustomSnackbar.show(
        parentContext,
        message: AppLocalizations.of(parentContext).ocrExtractionFailed,
        rootOverlay: true,
      );
      onComplete(scannedBytes, '', null);
      return;
    }

    final extractedText = sanitizeOcrText(ocrText);
    debugPrint('OCR: 텍스트 추출 성공 (길이: ${extractedText.length})');

    final modifiedText = await showExtractedTextModal(
      context: parentContext,
      initialText: extractedText,
      pageNumber: pageNumber,
      cancelButtonText: AppLocalizations.of(parentContext).reScanButton,
    );

    if (modifiedText != null) {
      await SubscriptionUtils.incrementOcrUsage();
      onComplete(scannedBytes, modifiedText, pageNumber);
    } else {
      await scanDocumentAndExtractText(parentContext, onComplete);
    }
  } catch (e) {
    debugPrint('문서 스캔 및 OCR 실패: $e');
    CustomSnackbar.show(
      parentContext,
      message: AppLocalizations.of(parentContext).documentScanFailed,
      rootOverlay: true,
    );
  }
}
