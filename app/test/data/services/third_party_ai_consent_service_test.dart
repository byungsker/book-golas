import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:book_golas/data/services/ai_content_service.dart';
import 'package:book_golas/data/services/third_party_ai_consent_service.dart';
import 'package:book_golas/data/services/google_vision_ocr_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('consent defaults to denied for every provider', () async {
    final service = ThirdPartyAiConsentService();

    expect(
      await service.hasConsent(ThirdPartyAiProvider.googleCloudVision),
      isFalse,
    );
    expect(
      await service.hasConsent(ThirdPartyAiProvider.openAi),
      isFalse,
    );
  });

  test('grant and withdrawal are stored independently', () async {
    final service = ThirdPartyAiConsentService();

    await service.grant(ThirdPartyAiProvider.googleCloudVision);
    var snapshot = await service.loadSnapshot();

    expect(snapshot.googleCloudVision, isTrue);
    expect(snapshot.openAi, isFalse);

    await service.grant(ThirdPartyAiProvider.openAi);
    await service.withdraw(ThirdPartyAiProvider.googleCloudVision);
    snapshot = await service.loadSnapshot();

    expect(snapshot.googleCloudVision, isFalse);
    expect(snapshot.openAi, isTrue);
  });

  test('OCR returns before network access when consent is missing', () async {
    final result = await GoogleVisionOcrService().extractTextFromBytes(
      Uint8List.fromList([1, 2, 3]),
    );

    expect(result, isNull);
  });

  test('OpenAI feature returns before network access without consent',
      () async {
    final result = await AIContentService().generateBookReviewDraft(
      bookId: 'book-id',
    );

    expect(result, isNull);
  });
}
