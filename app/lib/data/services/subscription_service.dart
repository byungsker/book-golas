import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

/// Service for managing in-app subscriptions via RevenueCat.
///
/// Provides methods for checking subscription status, presenting paywall,
/// and managing customer center interactions.
class SubscriptionService {
  static const String _proEntitlementId = "byungsker's lab Pro";

  /// Gets the current customer info from RevenueCat.
  ///
  /// Returns [CustomerInfo] if successful, null on failure.
  Future<CustomerInfo?> getCustomerInfo() async {
    try {
      final customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (e) {
      debugPrint('Failed to get customer info: $e');
      return null;
    }
  }

  /// Checks if the current user has Pro entitlement.
  ///
  /// Returns true if user has active Pro subscription, false otherwise.
  Future<bool> isPro() async {
    try {
      final customerInfo = await Purchases.getCustomerInfo();
      return _hasProEntitlement(customerInfo);
    } catch (e) {
      debugPrint('Failed to check Pro status: $e');
      return false;
    }
  }

  /// Gets available subscription offerings from RevenueCat.
  ///
  /// Returns [Offerings] if successful, null on failure.
  Future<Offerings?> getOfferings() async {
    try {
      final offerings = await Purchases.getOfferings();
      return offerings;
    } catch (e) {
      debugPrint('Failed to get offerings: $e');
      return null;
    }
  }

  /// Presents the RevenueCat Paywall UI.
  ///
  /// Checks offerings availability before presenting.
  /// Returns true if paywall was shown, false if configuration is unavailable.
  Future<bool> showPaywall(BuildContext context) async {
    try {
      final offerings = await Purchases.getOfferings();
      if (offerings.current == null ||
          offerings.current!.availablePackages.isEmpty) {
        debugPrint('⚠️ Paywall skipped: no offerings available');
        return false;
      }
      await RevenueCatUI.presentPaywall();
      return true;
    } on PlatformException catch (e) {
      final errorCode = PurchasesErrorHelper.getErrorCode(e);
      if (errorCode == PurchasesErrorCode.configurationError) {
        debugPrint('⚠️ Paywall config error (Error 23): ${e.message}');
      } else {
        debugPrint('Paywall platform error: ${e.code} - ${e.message}');
      }
      return false;
    } catch (e) {
      debugPrint('Failed to show paywall: $e');
      return false;
    }
  }

  /// Presents the RevenueCat Customer Center UI.
  ///
  /// Allows users to manage their subscriptions.
  Future<void> showCustomerCenter(BuildContext context) async {
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      debugPrint('Failed to show customer center: $e');
    }
  }

  /// Restores previous purchases for the current user.
  ///
  /// Useful when user reinstalls app or switches devices.
  Future<void> restorePurchases() async {
    try {
      await Purchases.restorePurchases();
      debugPrint('Purchases restored successfully');
    } catch (e) {
      debugPrint('Failed to restore purchases: $e');
    }
  }

  /// Logs in the user to RevenueCat (call after Supabase auth)
  Future<void> initialize(String userId) async {
    try {
      await Purchases.logIn(userId);
      debugPrint('RevenueCat logged in: $userId');
    } catch (e) {
      debugPrint('Failed to initialize RevenueCat for user: $e');
    }
  }

  /// Returns simplified subscription status: 'free' or 'pro'
  Future<String> getSubscriptionStatus() async {
    final proStatus = await isPro();
    return proStatus ? 'pro' : 'free';
  }

  /// Purchases the monthly subscription
  Future<bool> purchaseMonthly() async {
    try {
      final offerings = await Purchases.getOfferings();
      final monthlyPackage = offerings.current?.availablePackages.firstWhere(
        (p) => p.identifier == 'monthly',
        orElse: () => offerings.current!.monthly!,
      );
      if (monthlyPackage == null) return false;
      await Purchases.purchasePackage(monthlyPackage);
      return true;
    } catch (e) {
      debugPrint('Failed to purchase monthly: $e');
      return false;
    }
  }

  /// Purchases the yearly subscription
  Future<bool> purchaseYearly() async {
    try {
      final offerings = await Purchases.getOfferings();
      final yearlyPackage = offerings.current?.availablePackages.firstWhere(
        (p) => p.identifier == 'yearly',
        orElse: () => offerings.current!.annual!,
      );
      if (yearlyPackage == null) return false;
      await Purchases.purchasePackage(yearlyPackage);
      return true;
    } catch (e) {
      debugPrint('Failed to purchase yearly: $e');
      return false;
    }
  }

  /// Checks if the given [CustomerInfo] has Pro entitlement.
  bool _hasProEntitlement(CustomerInfo info) {
    return info.entitlements.active.containsKey(_proEntitlementId);
  }
}
