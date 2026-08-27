import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/utils/ocr_utils.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  const qaEmail = String.fromEnvironment('BOK410_QA_EMAIL');
  const qaPassword = String.fromEnvironment('BOK410_QA_PASSWORD');
  const captureLocale = String.fromEnvironment('BOK410_CAPTURE_LOCALE');

  setUpAll(() async {
    if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
      throw StateError('Supabase test configuration is missing');
    }
    if (qaEmail.isEmpty || qaPassword.isEmpty) {
      throw StateError('QA account configuration is missing');
    }

    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
    await Supabase.instance.client.auth.signInWithPassword(
      email: qaEmail,
      password: qaPassword,
    );
  });

  tearDownAll(() async {
    final consent = ThirdPartyAiConsentService();
    await consent.withdraw(ThirdPartyAiProvider.googleCloudVision);
    await Supabase.instance.client.auth.signOut();
  });

  for (final locale in const [Locale('ko'), Locale('en')]) {
    if (captureLocale.isNotEmpty && captureLocale != locale.languageCode) {
      continue;
    }

    testWidgets(
      'BOK-410 provider failure keeps the iOS surface actionable in '
      '${locale.languageCode}',
      (tester) async {
        await _grantConsent(locale);
        await tester.pumpWidget(_OcrFailureHarness(locale: locale));
        await tester.pump();

        final context = tester.element(find.byKey(_surfaceKey));
        var confirmedText = '';
        unawaited(
          reExtractTextFromImage(
            context,
            imageUrl: 'synthetic://bok410-provider-failure',
            onConfirm: (text) => confirmedText = text,
            downloadImage: (_) async => Uint8List.fromList([1]),
            cropImage: (_, __) async => Uint8List.fromList([1]),
            extractText: (_) async => null,
          ),
        );

        await _pumpUntil(tester, () {
          final l10n = AppLocalizations.of(context);
          return find.text(l10n.extractTextConfirmTitle).evaluate().isNotEmpty;
        });
        final l10n = AppLocalizations.of(context);
        Navigator.of(context, rootNavigator: true).pop(true);
        await tester.pump();

        await _pumpUntil(tester, () {
          return find.text(l10n.ocrReExtractionFailed).evaluate().isNotEmpty;
        }, timeout: const Duration(seconds: 45));

        expect(find.text(l10n.ocrReExtractionFailed), findsOneWidget);
        expect(confirmedText, isEmpty);
        await binding.takeScreenshot(
          'BOK-410-provider-failure-${locale.languageCode}',
        );
      },
    );
  }
}

Future<void> _grantConsent(Locale locale) async {
  final consent = ThirdPartyAiConsentService();
  final result = await consent.grant(
    ThirdPartyAiProvider.googleCloudVision,
    disclosure: ThirdPartyAiDisclosure(
      locale: locale.toLanguageTag(),
      title: 'OCR test disclosure',
      description: 'Synthetic test image may be sent for OCR.',
      featureContext: 'BOK-410 provider failure regression',
      featureData: 'Synthetic image bytes only',
      additionalBehavior: 'Provider failure is surfaced to the user.',
      dataDescription: 'Synthetic image bytes only',
      optionalNotice: 'Optional feature',
    ),
  );
  if (result != ThirdPartyAiConsentGrantResult.confirmed) {
    throw StateError('Could not grant synthetic OCR consent');
  }
}

Future<void> _pumpUntil(
  WidgetTester tester,
  bool Function() condition, {
  Duration timeout = const Duration(seconds: 10),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (!condition() && DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 250));
  }
}

class _OcrFailureHarness extends StatelessWidget {
  const _OcrFailureHarness({required this.locale});

  final Locale locale;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      locale: locale,
      theme: BLabTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: const Scaffold(body: SizedBox(key: _surfaceKey)),
    );
  }
}

const _surfaceKey = ValueKey('bok410-ocr-failure-surface');
