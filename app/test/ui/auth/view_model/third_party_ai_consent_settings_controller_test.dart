import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';
import 'package:book_golas/ui/auth/view_model/third_party_ai_consent_settings_controller.dart';

class _UnusedConsentStore implements ThirdPartyAiConsentStore {
  @override
  Future<bool> grant(
    String userId,
    ThirdPartyAiProvider provider,
    int policyVersion,
    ThirdPartyAiDisclosure disclosure,
  ) async =>
      true;

  @override
  Future<ThirdPartyAiConsentRecord?> read(
    String userId,
    ThirdPartyAiProvider provider,
  ) async =>
      null;

  @override
  Future<void> withdraw(
    String userId,
    ThirdPartyAiProvider provider,
  ) async {}
}

class _DelayedRefreshConsentService extends ThirdPartyAiConsentService {
  final Completer<ThirdPartyAiConsentSnapshot> refresh = Completer();
  int loadCount = 0;

  _DelayedRefreshConsentService()
      : super.withStore(_UnusedConsentStore(), () => 'user-a');

  @override
  Future<ThirdPartyAiConsentSnapshot> loadSnapshot() {
    loadCount += 1;
    if (loadCount == 1) {
      return Future.value(
        const ThirdPartyAiConsentSnapshot(
          googleCloudVision: ThirdPartyAiConsentState.notAllowed,
          openAi: ThirdPartyAiConsentState.allowed,
        ),
      );
    }
    return refresh.future;
  }
}

void main() {
  testWidgets('provider stays non-interactive until refreshed state resolves',
      (tester) async {
    final service = _DelayedRefreshConsentService();
    final controller = ThirdPartyAiConsentSettingsController(service);

    await tester.pumpWidget(
      MaterialApp(
        home: AnimatedBuilder(
          animation: controller,
          builder: (context, _) => Scaffold(
            body: FutureBuilder<ThirdPartyAiConsentSnapshot>(
              future: controller.snapshot,
              builder: (context, snapshot) {
                final state = snapshot.data?.openAi;
                final busy = controller.isUpdating(ThirdPartyAiProvider.openAi);
                return Switch(
                  key: const Key('openAiConsentSwitch'),
                  value: state == ThirdPartyAiConsentState.allowed,
                  onChanged: busy ? null : (_) {},
                );
              },
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    var toggle = tester.widget<Switch>(
      find.byKey(const Key('openAiConsentSwitch')),
    );
    expect(toggle.value, isTrue);
    expect(toggle.onChanged, isNotNull);

    final mutation = controller.runMutation(
      ThirdPartyAiProvider.openAi,
      () async {},
    );
    await tester.pump();

    toggle = tester.widget<Switch>(
      find.byKey(const Key('openAiConsentSwitch')),
    );
    expect(toggle.value, isTrue);
    expect(toggle.onChanged, isNull);

    service.refresh.complete(
      const ThirdPartyAiConsentSnapshot(
        googleCloudVision: ThirdPartyAiConsentState.notAllowed,
        openAi: ThirdPartyAiConsentState.notAllowed,
      ),
    );
    await mutation;
    await tester.pumpAndSettle();

    toggle = tester.widget<Switch>(
      find.byKey(const Key('openAiConsentSwitch')),
    );
    expect(toggle.value, isFalse);
    expect(toggle.onChanged, isNotNull);
    controller.dispose();
  });
}
