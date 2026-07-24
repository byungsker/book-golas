import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/ui/core/view_model/ad_view_model.dart';

void main() {
  test('shows ads when paid subscriptions are disabled', () async {
    final viewModel = AdViewModel(
      SubscriptionService(isEnabled: false),
      isSuperAdmin: () => false,
    );

    await viewModel.refreshAdVisibility();

    expect(viewModel.shouldShowAds, isTrue);
    viewModel.dispose();
  });

  test('keeps ads hidden for the super admin', () async {
    final viewModel = AdViewModel(
      SubscriptionService(isEnabled: false),
      isSuperAdmin: () => true,
    );

    await viewModel.refreshAdVisibility();

    expect(viewModel.shouldShowAds, isFalse);
    viewModel.dispose();
  });
}
