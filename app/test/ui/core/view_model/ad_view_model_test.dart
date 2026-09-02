import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:book_golas/data/services/ad_service.dart';
import 'package:book_golas/data/services/age_policy_service.dart';
import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/ui/core/view_model/ad_view_model.dart';

Future<AdService> _adService(AgePolicyStatus status) async {
  final agePolicyService = AgePolicyService();
  await agePolicyService.setStatus(status);
  return AdService.forTesting(
    requestConsent: () async => true,
    requestTrackingAuthorization: () async => true,
    agePolicyService: agePolicyService,
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('shows ads when paid subscriptions are disabled', () async {
    final viewModel = AdViewModel(
      SubscriptionService(isEnabled: false),
      adService: await _adService(AgePolicyStatus.age14OrOlder),
    );

    await viewModel.refreshAdVisibility();

    expect(viewModel.shouldShowAds, isTrue);
    viewModel.dispose();
  });

  test('keeps ads hidden when the age policy is unknown', () async {
    final viewModel = AdViewModel(
      SubscriptionService(isEnabled: false),
      adService: await _adService(AgePolicyStatus.unknown),
    );

    await viewModel.refreshAdVisibility();

    expect(viewModel.shouldShowAds, isFalse);
    viewModel.dispose();
  });
}
