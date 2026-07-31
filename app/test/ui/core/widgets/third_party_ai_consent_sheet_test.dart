import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/third_party_ai_consent_sheet.dart';

class FakeConsentStore implements ThirdPartyAiConsentStore {
  final Map<ThirdPartyAiProvider, ThirdPartyAiConsentRecord> records = {};
  bool failReads = false;
  bool failWrites = false;
  Completer<void>? grantGate;

  @override
  Future<ThirdPartyAiConsentRecord?> read(
    String userId,
    ThirdPartyAiProvider provider,
  ) async {
    if (failReads) throw StateError('read failed');
    return records[provider];
  }

  @override
  Future<void> grant(
    String userId,
    ThirdPartyAiProvider provider,
    int policyVersion,
    ThirdPartyAiDisclosure disclosure,
  ) async {
    await grantGate?.future;
    if (failWrites) throw StateError('write failed');
    records[provider] = ThirdPartyAiConsentRecord(
      granted: true,
      policyVersion: policyVersion,
    );
  }

  @override
  Future<void> withdraw(
    String userId,
    ThirdPartyAiProvider provider,
  ) async {
    records.remove(provider);
  }
}

Widget buildTestApp({
  required Widget child,
  Locale locale = const Locale('en'),
  TextScaler textScaler = TextScaler.noScaling,
}) {
  return MaterialApp(
    locale: locale,
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: AppLocalizations.supportedLocales,
    builder: (context, appChild) => MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: textScaler),
      child: appChild!,
    ),
    home: child,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('OpenAI consent starts with contextual summary and fixed actions',
      (tester) async {
    bool? result;
    final service = ThirdPartyAiConsentService.withStore(
      FakeConsentStore(),
      () => 'user-a',
    );

    await tester.pumpWidget(
      buildTestApp(
        child: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              result = await requestThirdPartyAiConsent(
                context: context,
                feature: ThirdPartyAiFeature.recall,
                consentService: service,
              );
            },
            child: const Text('Open'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    expect(find.text('Search your reading records with AI'), findsOneWidget);
    expect(find.textContaining('Your question and relevant'), findsOneWidget);
    expect(find.text('OpenAI OpCo, LLC · United States'), findsOneWidget);
    expect(find.text('Nothing is sent until you agree.'), findsOneWidget);
    expect(find.text('View full transfer details'), findsOneWidget);
    expect(find.text("Don't allow").hitTestable(), findsOneWidget);
    expect(find.text('Agree to OpenAI transfer').hitTestable(), findsOneWidget);

    await tester.ensureVisible(find.text('View full transfer details'));
    await tester.tap(find.text('View full transfer details'));
    await tester.pumpAndSettle();

    expect(find.text('Primary country and recipient'), findsOneWidget);
    expect(find.textContaining('1455 3rd Street'), findsOneWidget);
    expect(find.text("Open OpenAI's subprocessor list"), findsOneWidget);

    await tester.tap(find.text("Don't allow"));
    await tester.pumpAndSettle();

    expect(result, isFalse);
    expect(await service.hasConsent(ThirdPartyAiProvider.openAi), isFalse);
  });

  testWidgets(
      'agreement stays open while saving and resumes after verification',
      (tester) async {
    bool? result;
    final store = FakeConsentStore()..grantGate = Completer<void>();
    final service = ThirdPartyAiConsentService.withStore(
      store,
      () => 'user-a',
    );

    await tester.pumpWidget(
      buildTestApp(
        locale: const Locale('ko'),
        child: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              result = await requestThirdPartyAiConsent(
                context: context,
                feature: ThirdPartyAiFeature.googleOcr,
                consentService: service,
              );
            },
            child: const Text('열기'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Google OCR 국외 이전에 동의'));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('선택을 저장하고 있어요…'), findsOneWidget);
    expect(find.text('Google Cloud Vision OCR을 허용할까요?'), findsOneWidget);
    expect(result, isNull);

    await tester.tapAt(const Offset(5, 5));
    await tester.pump();
    expect(find.text('Google Cloud Vision OCR을 허용할까요?'), findsOneWidget);
    expect(await tester.binding.handlePopRoute(), isTrue);
    await tester.pump();
    expect(find.text('선택을 저장하고 있어요…'), findsOneWidget);
    expect(result, isNull);

    store.grantGate!.complete();
    await tester.pumpAndSettle();

    expect(result, isTrue);
    expect(
      await service.hasConsent(ThirdPartyAiProvider.googleCloudVision),
      isTrue,
    );
  });

  testWidgets('failed agreement remains visible and supports retry',
      (tester) async {
    bool? result;
    final store = FakeConsentStore()..failWrites = true;
    final service = ThirdPartyAiConsentService.withStore(
      store,
      () => 'user-a',
    );

    await tester.pumpWidget(
      buildTestApp(
        child: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              result = await requestThirdPartyAiConsent(
                context: context,
                feature: ThirdPartyAiFeature.reviewDraft,
                consentService: service,
              );
            },
            child: const Text('Open'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Agree to OpenAI transfer'));
    await tester.pumpAndSettle();

    expect(find.textContaining("couldn't save your choice"), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
    expect(result, isNull);

    store.failWrites = false;
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();

    expect(result, isTrue);
  });

  testWidgets('actions stay visible at 200 percent text size', (tester) async {
    tester.view.physicalSize = const Size(390, 600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final service = ThirdPartyAiConsentService.withStore(
      FakeConsentStore(),
      () => 'user-a',
    );

    await tester.pumpWidget(
      buildTestApp(
        textScaler: const TextScaler.linear(2),
        child: Builder(
          builder: (context) => TextButton(
            onPressed: () => requestThirdPartyAiConsent(
              context: context,
              feature: ThirdPartyAiFeature.recall,
              consentService: service,
            ),
            child: const Text('Open'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.byKey(const Key('thirdPartyAiConsentContent')), findsOneWidget);
    expect(find.text("Don't allow").hitTestable(), findsOneWidget);
    expect(find.text('Agree to OpenAI transfer').hitTestable(), findsOneWidget);
  });

  testWidgets('settings can reopen full details without changing consent',
      (tester) async {
    final semantics = tester.ensureSemantics();

    await tester.pumpWidget(
      buildTestApp(
        child: Builder(
          builder: (context) => TextButton(
            onPressed: () => showThirdPartyAiConsentDetails(
              context: context,
              provider: ThirdPartyAiProvider.openAi,
            ),
            child: const Text('Details'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Details'));
    await tester.pumpAndSettle();

    expect(find.text('Hide transfer details'), findsOneWidget);
    expect(find.text('Primary country and recipient'), findsOneWidget);
    expect(find.textContaining('Data varies by feature'), findsOneWidget);
    expect(find.text('Close').hitTestable(), findsOneWidget);
    expect(find.text('Agree to OpenAI transfer'), findsNothing);

    final heading = tester.getSemantics(
      find.text('Primary country and recipient'),
    );
    expect(heading.flagsCollection.isHeader, isTrue);

    final linkFinder = find.byKey(
      const Key(
        'thirdPartyAiExternalLink-https://openai.com/policies/sub-processor-list/',
      ),
    );
    final link = tester.getSemantics(linkFinder);
    expect(link.flagsCollection.isLink, isTrue);
    expect(link.flagsCollection.isButton, isFalse);
    expect(tester.getSize(linkFinder).height, greaterThanOrEqualTo(44));
    semantics.dispose();
  });

  testWidgets('status lookup error is distinct from refusal', (tester) async {
    final store = FakeConsentStore()..failReads = true;
    final service = ThirdPartyAiConsentService.withStore(
      store,
      () => 'user-a',
    );

    await tester.pumpWidget(
      buildTestApp(
        child: Builder(
          builder: (context) => TextButton(
            onPressed: () => requestThirdPartyAiConsent(
              context: context,
              feature: ThirdPartyAiFeature.recall,
              consentService: service,
            ),
            child: const Text('Open'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    expect(
      find.text("We couldn't check your current sharing status."),
      findsOneWidget,
    );
  });
}
