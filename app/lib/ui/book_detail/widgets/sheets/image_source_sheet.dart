import 'package:book_golas/ui/core/theme/design_system.dart';
import 'dart:io';

import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:book_golas/l10n/app_localizations.dart';

import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';

enum ImageSourceType {
  camera,
  gallery,
  documentScan,
}

Future<ImageSourceType?> showImageSourceSheet({
  required BuildContext context,
}) async {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  final isCameraAvailable = !kIsWeb &&
      (Platform.isAndroid || Platform.isIOS) &&
      (Platform.isAndroid || (Platform.isIOS && !Platform.isMacOS));

  return showModalBottomSheet<ImageSourceType>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      return Container(
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: BLabColors.success.withAlpha(25),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    CupertinoIcons.doc_text_viewfinder,
                    color: BLabColors.success,
                  ),
                ),
                title: Text(
                  AppLocalizations.of(sheetContext).imageSourceDocumentScan,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                subtitle: Text(
                  AppLocalizations.of(sheetContext).imageSourceDocumentScanDesc,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
                onTap: isCameraAvailable && Platform.isIOS
                    ? () => Navigator.pop(
                        sheetContext, ImageSourceType.documentScan)
                    : () {
                        Navigator.pop(sheetContext);
                        CustomSnackbar.show(
                          context,
                          message: '시뮬레이터에서는 카메라를 사용할 수 없습니다',
                          type: BLabSnackbarType.warning,
                        );
                      },
              ),

              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: BLabColors.primary.withAlpha(25),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    CupertinoIcons.camera_fill,
                    color: BLabColors.primary,
                  ),
                ),
                title: Text(
                  AppLocalizations.of(sheetContext).imageSourceCameraTitle,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                subtitle: Text(
                  AppLocalizations.of(sheetContext).imageSourceCameraDesc,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
                onTap: isCameraAvailable && Platform.isIOS
                    ? () => Navigator.pop(sheetContext, ImageSourceType.camera)
                    : () {
                        Navigator.pop(sheetContext);
                        CustomSnackbar.show(
                          context,
                          message: '시뮬레이터에서는 카메라를 사용할 수 없습니다',
                          type: BLabSnackbarType.warning,
                        );
                      },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: BLabColors.primary.withAlpha(25),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    CupertinoIcons.photo_fill,
                    color: BLabColors.primary,
                  ),
                ),
                title: Text(
                  AppLocalizations.of(sheetContext).imageSourceGalleryTitle,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                subtitle: Text(
                  AppLocalizations.of(sheetContext).imageSourceGalleryDesc,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
                onTap: () =>
                    Navigator.pop(sheetContext, ImageSourceType.gallery),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      );
    },
  );
}

Future<ImageSource?> showImageReplaceOptionsSheet({
  required BuildContext context,
}) async {
  final isDark = Theme.of(context).brightness == Brightness.dark;

  return showModalBottomSheet<ImageSource>(
    context: context,
    backgroundColor: isDark ? BLabColors.surfaceDark : Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              AppLocalizations.of(sheetContext).dialogReplaceImage,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: BLabColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  CupertinoIcons.camera,
                  color: BLabColors.primary,
                ),
              ),
              title: Text(AppLocalizations.of(sheetContext).dialogTakePhoto),
              onTap: () => Navigator.pop(sheetContext, ImageSource.camera),
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: BLabColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  CupertinoIcons.photo,
                  color: BLabColors.success,
                ),
              ),
              title: Text(AppLocalizations.of(sheetContext).dialogSelect),
              onTap: () => Navigator.pop(sheetContext, ImageSource.gallery),
            ),
          ],
        ),
      ),
    ),
  );
}

Future<bool?> showReplaceImageConfirmationSheet({
  required BuildContext context,
}) async {
  final isDark = Theme.of(context).brightness == Brightness.dark;

  return showModalBottomSheet<bool>(
    context: context,
    backgroundColor: isDark ? BLabColors.surfaceDark : Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: BLabColors.amber,
                shape: BoxShape.circle,
              ),
              child: Icon(
                CupertinoIcons.exclamationmark_triangle,
                size: 32,
                color: Colors.amber[700],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              AppLocalizations.of(sheetContext).dialogReplaceImage,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              AppLocalizations.of(sheetContext).dialogReplaceImage,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.pop(sheetContext, false),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                        ),
                      ),
                    ),
                    child: Text(
                      AppLocalizations.of(sheetContext).commonCancel,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.grey[300] : Colors.grey[700],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.pop(sheetContext, true),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: BLabColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      AppLocalizations.of(sheetContext).dialogReplaceImage,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}
