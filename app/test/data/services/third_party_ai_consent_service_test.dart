import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/ai_content_service.dart';
import 'package:book_golas/data/services/google_vision_ocr_service.dart';
import 'package:book_golas/data/services/third_party_ai_consent_service.dart';

class MockSupabaseClient extends Mock implements SupabaseClient {}

class FakeConsentStore implements ThirdPartyAiConsentStore {
  final Map<String, ThirdPartyAiConsentRecord> records = {};
  bool failReads = false;
  bool failWrites = false;

  String _key(String userId, ThirdPartyAiProvider provider) =>
      '$userId:${provider.databaseValue}';

  @override
  Future<ThirdPartyAiConsentRecord?> read(
    String userId,
    ThirdPartyAiProvider provider,
  ) async {
    if (failReads) throw StateError('read failed');
    return records[_key(userId, provider)];
  }

  @override
  Future<void> grant(
    String userId,
    ThirdPartyAiProvider provider,
    int policyVersion,
    ThirdPartyAiDisclosure disclosure,
  ) async {
    if (failWrites) throw StateError('write failed');
    records[_key(userId, provider)] = ThirdPartyAiConsentRecord(
      granted: true,
      policyVersion: policyVersion,
    );
  }

  @override
  Future<void> withdraw(
    String userId,
    ThirdPartyAiProvider provider,
  ) async {
    if (failWrites) throw StateError('write failed');
    final key = _key(userId, provider);
    final previous = records[key];
    if (previous != null) {
      records[key] = ThirdPartyAiConsentRecord(
        granted: false,
        policyVersion: previous.policyVersion,
      );
    }
  }
}

const disclosure = ThirdPartyAiDisclosure(
  locale: 'ko-KR',
  title: 'title',
  description: 'description',
  dataDescription: 'data',
  optionalNotice: 'optional',
);

void main() {
  test('consent defaults to denied for every provider', () async {
    final service = ThirdPartyAiConsentService.withStore(
      FakeConsentStore(),
      () => 'user-a',
    );

    expect(
      await service.hasConsent(ThirdPartyAiProvider.googleCloudVision),
      isFalse,
    );
    expect(
      await service.hasConsent(ThirdPartyAiProvider.openAi),
      isFalse,
    );
  });

  test('grant and withdrawal remain provider separated', () async {
    final service = ThirdPartyAiConsentService.withStore(
      FakeConsentStore(),
      () => 'user-a',
    );

    expect(
      await service.grant(
        ThirdPartyAiProvider.googleCloudVision,
        disclosure: disclosure,
      ),
      isTrue,
    );
    var snapshot = await service.loadSnapshot();
    expect(snapshot.googleCloudVision, isTrue);
    expect(snapshot.openAi, isFalse);

    await service.grant(
      ThirdPartyAiProvider.openAi,
      disclosure: disclosure,
    );
    await service.withdraw(ThirdPartyAiProvider.googleCloudVision);
    snapshot = await service.loadSnapshot();

    expect(snapshot.googleCloudVision, isFalse);
    expect(snapshot.openAi, isTrue);
  });

  test('one account cannot read another account consent', () async {
    final store = FakeConsentStore();
    final userA = ThirdPartyAiConsentService.withStore(store, () => 'user-a');
    final userB = ThirdPartyAiConsentService.withStore(store, () => 'user-b');

    await userA.grant(
      ThirdPartyAiProvider.openAi,
      disclosure: disclosure,
    );

    expect(
      await userA.hasConsent(ThirdPartyAiProvider.openAi),
      isTrue,
    );
    expect(
      await userB.hasConsent(ThirdPartyAiProvider.openAi),
      isFalse,
    );
  });

  test('another device observes an account withdrawal', () async {
    final store = FakeConsentStore();
    final deviceA = ThirdPartyAiConsentService.withStore(store, () => 'user-a');
    final deviceB = ThirdPartyAiConsentService.withStore(store, () => 'user-a');

    await deviceA.grant(
      ThirdPartyAiProvider.openAi,
      disclosure: disclosure,
    );
    expect(
      await deviceB.hasConsent(ThirdPartyAiProvider.openAi),
      isTrue,
    );

    expect(
      await deviceB.withdraw(ThirdPartyAiProvider.openAi),
      isTrue,
    );

    expect(
      await deviceA.hasConsent(ThirdPartyAiProvider.openAi),
      isFalse,
    );
  });

  test('stale policy receipts and persistence failures fail closed', () async {
    final store = FakeConsentStore();
    store.records['user-a:open_ai'] = const ThirdPartyAiConsentRecord(
      granted: true,
      policyVersion: 0,
    );
    final service = ThirdPartyAiConsentService.withStore(store, () => 'user-a');

    expect(
      await service.hasConsent(ThirdPartyAiProvider.openAi),
      isFalse,
    );

    store.failReads = true;
    expect(
      await service.hasConsent(ThirdPartyAiProvider.openAi),
      isFalse,
    );

    store.failReads = false;
    store.failWrites = true;
    expect(
      await service.grant(
        ThirdPartyAiProvider.openAi,
        disclosure: disclosure,
      ),
      isFalse,
    );

    store.failWrites = false;
    await service.grant(
      ThirdPartyAiProvider.openAi,
      disclosure: disclosure,
    );
    store.failWrites = true;
    expect(
      await service.withdraw(ThirdPartyAiProvider.openAi),
      isFalse,
    );
    store.failWrites = false;
    expect(
      await service.hasConsent(ThirdPartyAiProvider.openAi),
      isTrue,
    );
  });

  test('OCR adapter makes zero client calls without consent', () async {
    final client = MockSupabaseClient();
    final denied = ThirdPartyAiConsentService.withStore(
      FakeConsentStore(),
      () => 'user-a',
    );
    final service = GoogleVisionOcrService.withDependencies(denied, client);

    final result = await service.extractTextFromBytes(
      Uint8List.fromList([1, 2, 3]),
    );

    expect(result, isNull);
    verifyNever(() => client.functions);
  });

  test('OpenAI adapter makes zero client calls without consent', () async {
    final client = MockSupabaseClient();
    final denied = ThirdPartyAiConsentService.withStore(
      FakeConsentStore(),
      () => 'user-a',
    );
    final service = AIContentService.withDependencies(denied, client);

    final result = await service.generateBookReviewDraft(bookId: 'book-id');

    expect(result, isNull);
    verifyNever(() => client.auth);
    verifyNever(() => client.functions);
  });
}
