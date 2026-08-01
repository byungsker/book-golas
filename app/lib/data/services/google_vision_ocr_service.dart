import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';

class GoogleVisionOcrService {
  static final GoogleVisionOcrService _instance =
      GoogleVisionOcrService._internal(
    ThirdPartyAiConsentService(),
    () => Supabase.instance.client,
  );
  factory GoogleVisionOcrService() => _instance;
  GoogleVisionOcrService._internal(
    this._consentService,
    this._supabaseProvider,
  );

  GoogleVisionOcrService.withDependencies(
    this._consentService,
    SupabaseClient supabaseClient,
  ) : _supabaseProvider = (() => supabaseClient);

  static const int _maxImageBytes = 8 * 1024 * 1024;
  final ThirdPartyAiConsentService _consentService;
  final SupabaseClient Function() _supabaseProvider;

  SupabaseClient get _supabase => _supabaseProvider();

  Future<String?> extractTextFromImageUrl(String imageUrl) async {
    try {
      final response = await http
          .get(Uri.parse(imageUrl))
          .timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) {
        debugPrint('OCR image download failed: ${response.statusCode}');
        return null;
      }

      return await extractTextFromBytes(response.bodyBytes);
    } catch (error) {
      debugPrint('OCR image download failed: $error');
      return null;
    }
  }

  Future<String?> extractTextFromBytes(Uint8List imageBytes) async {
    if (imageBytes.isEmpty || imageBytes.length > _maxImageBytes) {
      debugPrint('OCR image size is invalid');
      return null;
    }

    try {
      final consent = await _consentService
          .hasConsent(ThirdPartyAiProvider.googleCloudVision);
      if (!consent) {
        debugPrint('OCR request blocked because consent is missing');
        return null;
      }

      final response = await _supabase.functions.invoke(
        'vision-ocr',
        body: {'imageBase64': base64Encode(imageBytes)},
      );
      if (response.status != 200 || response.data is! Map) {
        debugPrint('OCR request failed');
        return null;
      }

      final data = Map<String, dynamic>.from(response.data as Map);
      final text = data['text']?.toString() ?? '';
      return text.isEmpty ? null : _cleanupExtractedText(text);
    } catch (error) {
      debugPrint('OCR request failed: $error');
      return null;
    }
  }

  String _cleanupExtractedText(String rawText) {
    String cleaned = rawText.trim();

    cleaned = cleaned
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .replaceAll(RegExp(r' {2,}'), ' ')
        .replaceAll(RegExp(r'[\u200B-\u200D\uFEFF]'), '');

    final lines = cleaned.split('\n');
    final cleanedLines = lines.map((line) => line.trim()).toList();
    cleaned = cleanedLines.join('\n');

    return cleaned;
  }

  String getPreviewText(String? fullText, {int maxLines = 2}) {
    if (fullText == null || fullText.isEmpty) {
      return '';
    }

    final lines =
        fullText.split('\n').where((line) => line.trim().isNotEmpty).toList();

    if (lines.isEmpty) {
      return '';
    }

    if (lines.length <= maxLines) {
      return lines.join('\n');
    }

    return '${lines.take(maxLines).join('\n')}...';
  }
}
