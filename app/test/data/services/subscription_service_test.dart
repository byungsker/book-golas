import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/subscription_service.dart';

void main() {
  group('disabled subscriptions', () {
    late SubscriptionService service;

    setUp(() {
      service = SubscriptionService(isEnabled: false);
    });

    test('does not initialize RevenueCat', () async {
      final initialized = await service.initialize(
        userId: 'user-id',
        publicKey: 'public-key',
      );

      expect(initialized, isFalse);
      expect(service.isEnabled, isFalse);
    });

    test('returns free access state without RevenueCat calls', () async {
      expect(await service.getCustomerInfo(), isNull);
      expect(await service.isPro(), isFalse);
      expect(await service.getOfferings(), isNull);
      expect(await service.getSubscriptionStatus(), 'free');
      expect(await service.restorePurchases(), isFalse);
      expect(await service.purchaseMonthly(), isFalse);
      expect(await service.purchaseYearly(), isFalse);
      await expectLater(service.signOut(), completes);
    });
  });
}
