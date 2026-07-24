abstract final class FeatureFlags {
  static const bool paidSubscriptionsEnabled = bool.fromEnvironment(
    'PAID_SUBSCRIPTIONS_ENABLED',
    defaultValue: false,
  );
}
