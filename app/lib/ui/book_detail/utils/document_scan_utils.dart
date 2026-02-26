import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image/image.dart' as img;

import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';

Future<Uint8List?> scanDocumentWithCamera(BuildContext context) async {
  try {
    final cameraStatus = await Permission.camera.request();
    if (!cameraStatus.isGranted) {
      if (context.mounted) {
        CustomSnackbar.show(
          context,
          message: '카메라 권한이 필요합니다.',
          rootOverlay: true,
        );
      }
      return null;
    }

    debugPrint('문서 스캔 시작');

    final imagesPath = await CunningDocumentScanner.getPictures(
      noOfPages: 1,
      isGalleryImportAllowed: false,
    );

    if (imagesPath == null || imagesPath.isEmpty) {
      debugPrint('문서 스캔 취소 또는 실패');
      return null;
    }

    final scannedFile = File(imagesPath.first);
    if (!await scannedFile.exists()) {
      debugPrint('스캔된 파일이 존재하지 않음: ${imagesPath.first}');
      return null;
    }

    final imageBytes = await scannedFile.readAsBytes();
    final compressedBytes = await _compressImage(imageBytes);

    try {
      await scannedFile.delete();
    } catch (e) {
      debugPrint('임시 파일 삭제 실패 (무시): $e');
    }

    debugPrint(
        '문서 스캔 완료 (압축 전: ${imageBytes.length} bytes, 압축 후: ${compressedBytes.length} bytes)');
    return compressedBytes;
  } catch (e, stackTrace) {
    debugPrint('문서 스캔 실패: $e');
    debugPrint('Stack trace: $stackTrace');

    if (context.mounted) {
      CustomSnackbar.show(
        context,
        message: '문서 스캔에 실패했습니다.',
        rootOverlay: true,
      );
    }
    return null;
  }
}

Future<Uint8List?> scanDocumentFromGallery(BuildContext context) async {
  try {
    final photosStatus = await Permission.photos.request();
    if (!photosStatus.isGranted) {
      if (context.mounted) {
        CustomSnackbar.show(
          context,
          message: '사진 권한이 필요합니다.',
          rootOverlay: true,
        );
      }
      return null;
    }

    debugPrint('갤러리 문서 스캔 시작');

    final imagesPath = await CunningDocumentScanner.getPictures(
      isGalleryImportAllowed: true,
    );

    if (imagesPath == null || imagesPath.isEmpty) {
      debugPrint('갤러리 문서 스캔 취소 또는 실패');
      return null;
    }

    final scannedFile = File(imagesPath.first);
    if (!await scannedFile.exists()) {
      debugPrint('스캔된 파일이 존재하지 않음: ${imagesPath.first}');
      return null;
    }

    final imageBytes = await scannedFile.readAsBytes();
    final compressedBytes = await _compressImage(imageBytes);

    try {
      await scannedFile.delete();
    } catch (e) {
      debugPrint('임시 파일 삭제 실패 (무시): $e');
    }

    debugPrint(
        '갤러리 문서 스캔 완료 (압축 전: ${imageBytes.length} bytes, 압축 후: ${compressedBytes.length} bytes)');
    return compressedBytes;
  } catch (e, stackTrace) {
    debugPrint('갤러리 문서 스캔 실패: $e');
    debugPrint('Stack trace: $stackTrace');

    if (context.mounted) {
      CustomSnackbar.show(
        context,
        message: '이미지 처리에 실패했습니다.',
        rootOverlay: true,
      );
    }
    return null;
  }
}

Future<Uint8List> _compressImage(Uint8List imageBytes) async {
  try {
    final image = img.decodeImage(imageBytes);
    if (image == null) {
      debugPrint('이미지 디코딩 실패, 원본 반환');
      return imageBytes;
    }

    final compressedBytes = img.encodeJpg(image, quality: 85);

    final compressionRatio =
        (imageBytes.length - compressedBytes.length) / imageBytes.length * 100;
    debugPrint('이미지 압축 완료 (압축률: ${compressionRatio.toStringAsFixed(1)}%)');

    return Uint8List.fromList(compressedBytes);
  } catch (e) {
    debugPrint('이미지 압축 실패, 원본 반환: $e');
    return imageBytes;
  }
}
