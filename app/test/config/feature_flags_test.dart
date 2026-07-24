import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/config/feature_flags.dart';

void main() {
  test('paid subscriptions are disabled by default', () {
    expect(FeatureFlags.paidSubscriptionsEnabled, isFalse);
  });
}
