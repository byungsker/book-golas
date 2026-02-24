import 'package:flutter/widgets.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import 'package:book_golas/ui/core/view_model/base_view_model.dart';
import 'package:book_golas/data/services/subscription_service.dart';

/// ViewModel for managing subscription state and user interactions.
///
/// Provides methods for loading subscription status, purchasing subscriptions,
/// and restoring previous purchases.
class SubscriptionViewModel extends BaseViewModel {
  final SubscriptionService _subscriptionService;

  bool _isProUser = false;
  Offerings? _offerings;

  bool get isProUser => _isProUser;
  Offerings? get offerings => _offerings;

  SubscriptionViewModel(this._subscriptionService);

  /// Loads the current subscription status from RevenueCat.
  ///
  /// Updates [isProUser] based on whether the user has active Pro entitlement.
  Future<void> loadSubscriptionStatus() async {
    await runAsync(() async {
      final isPro = await _subscriptionService.isPro();
      if (!isDisposed) {
        _isProUser = isPro;
      }
    });
  }

  /// Loads available subscription offerings from RevenueCat.
  ///
  /// Returns [Offerings] if successful, null on failure.
  Future<void> loadOfferings() async {
    await runAsync(() async {
      final offerings = await _subscriptionService.getOfferings();
      if (!isDisposed) {
        _offerings = offerings;
      }
    });
  }

  /// Loads both subscription status and offerings.
  ///
  /// Convenience method that calls [loadSubscriptionStatus] and [loadOfferings].
  Future<void> loadAll() async {
    setLoading(true);
    try {
      await loadSubscriptionStatus();
      await loadOfferings();
    } finally {
      setLoading(false);
    }
  }

  /// Presents the paywall UI for subscription purchase.
  ///
  /// Uses RevenueCat's built-in paywall presentation.
  Future<void> showPaywall(BuildContext context) async {
    try {
      await _subscriptionService.showPaywall(context);
      await loadSubscriptionStatus();
    } catch (e) {
      debugPrint('Failed to show paywall: $e');
    }
  }

  /// Restores previous purchases for the current user.
  ///
  /// Useful when user reinstalls app or switches devices.
  Future<bool> restorePurchases() async {
    setLoading(true);
    clearError();
    try {
      await _subscriptionService.restorePurchases();
      await loadSubscriptionStatus();
      return true;
    } catch (e) {
      setError('복원에 실패했습니다: $e');
      return false;
    } finally {
      setLoading(false);
    }
  }

  /// Gets the current customer info from RevenueCat.
  ///
  /// Returns [CustomerInfo] if successful, null on failure.
  Future<CustomerInfo?> getCustomerInfo() async {
    return await _subscriptionService.getCustomerInfo();
  }

  /// Presents the customer center UI for subscription management.
  ///
  /// Allows users to manage their subscriptions (cancel, upgrade, etc.).
  Future<void> showCustomerCenter(BuildContext context) async {
    try {
      await _subscriptionService.showCustomerCenter(context);
    } catch (e) {
      debugPrint('Failed to show customer center: $e');
    }
  }
}
