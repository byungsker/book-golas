import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/third_party_ai_consent_sheet.dart';

class FakeConsentStore implements ThirdPartyAiConsentStore {
  final Map<ThirdPartyAiProvider, ThirdPartyAiConsentRecord> records = {};

  @override
  Future<ThirdPartyAiConsentRecord?> read(
    String userId,
    ThirdPartyAiProvider provider,
  ) async =>
      records[provider];

  @override
  Future<void> grant(
    String userId,
    ThirdPartyAiProvider provider,
    int policyVersion,
    ThirdPartyAiDisclosure disclosure,
  ) async {
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

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('OpenAI sheet discloses recipient and keeps decline optional',
      (tester) async {
    bool? result;
    final service = ThirdPartyAiConsentService.withStore(
      FakeConsentStore(),
      () => 'user-a',
    );

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              result = await requestThirdPartyAiConsent(
                context: context,
                provider: ThirdPartyAiProvider.openAi,
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

    expect(find.textContaining('Recipient: OpenAI'), findsOneWidget);
    expect(find.textContaining('You may refuse'), findsOneWidget);

    await tester.ensureVisible(find.text('Not now'));
    await tester.tap(find.text('Not now'));
    await tester.pumpAndSettle();

    expect(result, isFalse);
    expect(
      await service.hasConsent(ThirdPartyAiProvider.openAi),
      isFalse,
    );
  });

  testWidgets('Google Cloud Vision consent is granted only after Allow',
      (tester) async {
    bool? result;
    final service = ThirdPartyAiConsentService.withStore(
      FakeConsentStore(),
      () => 'user-a',
    );

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ko'),
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              result = await requestThirdPartyAiConsent(
                context: context,
                provider: ThirdPartyAiProvider.googleCloudVision,
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

    expect(find.textContaining('Google Cloud Vision'), findsWidgets);
    await tester.ensureVisible(find.text('허용'));
    await tester.tap(find.text('허용'));
    await tester.pumpAndSettle();

    expect(result, isTrue);
    expect(
      await service.hasConsent(ThirdPartyAiProvider.googleCloudVision),
      isTrue,
    );
  });

  testWidgets('consent sheet remains usable at 200 percent text size',
      (tester) async {
    tester.view.physicalSize = const Size(390, 600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final service = ThirdPartyAiConsentService.withStore(
      FakeConsentStore(),
      () => 'user-a',
    );

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: const TextScaler.linear(2),
          ),
          child: child!,
        ),
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => requestThirdPartyAiConsent(
              context: context,
              provider: ThirdPartyAiProvider.openAi,
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
    expect(find.byType(Scrollable), findsWidgets);

    await tester.ensureVisible(find.text('Allow'));
    await tester.tap(find.text('Allow'));
    await tester.pumpAndSettle();

    expect(
      await service.hasConsent(ThirdPartyAiProvider.openAi),
      isTrue,
    );
  });
}
