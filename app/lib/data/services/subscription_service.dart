import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/config/app_config.dart';

/// Service for managing in-app subscriptions via RevenueCat.
///
/// Provides methods for checking subscription status, presenting paywall,
/// and managing customer center interactions.
class SubscriptionService {
  final bool _isEnabled = false;

  SubscriptionService();

  bool get isEnabled => _isEnabled;

  Future<bool> initialize({
    required String userId,
    required String publicKey,
    VoidCallback? onCustomerInfoUpdated,
  }) async {
    if (!_isEnabled || publicKey.isEmpty) return false;

    try {
      await Purchases.setLogLevel(LogLevel.info);
      await Purchases.configure(
        PurchasesConfiguration(publicKey)..appUserID = userId,
      );
      await Purchases.logIn(userId);
      if (onCustomerInfoUpdated != null) {
        Purchases.addCustomerInfoUpdateListener((_) => onCustomerInfoUpdated());
      }
      return true;
    } catch (e) {
      debugPrint('Failed to initialize RevenueCat: $e');
      return false;
    }
  }

  Future<bool> ensureConfigured() async {
    if (!_isEnabled) return false;

    try {
      if (await Purchases.isConfigured) return true;

      final rcKey = AppConfig.revenueCatPublicKey.trim();
      if (rcKey.isEmpty) {
        debugPrint('⚠️ RevenueCat unavailable: API key is not configured');
        return false;
      }

      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) {
        debugPrint('⚠️ RevenueCat unavailable: user is not authenticated');
        return false;
      }

      await Purchases.setLogLevel(LogLevel.info);
      await Purchases.configure(
        PurchasesConfiguration(rcKey)..appUserID = userId,
      );
      debugPrint('✅ RevenueCat configured lazily');
      return true;
    } catch (e) {
      debugPrint('❌ RevenueCat configuration failed: $e');
      return false;
    }
  }

  /// Gets the current customer info from RevenueCat.
  ///
  /// Returns [CustomerInfo] if successful, null on failure.
  Future<CustomerInfo?> getCustomerInfo() async {
    if (!_isEnabled) return null;

    try {
      final customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (e) {
      debugPrint('Failed to get customer info: $e');
      return null;
    }
  }

  /// Commercial subscription access is disabled.
  ///
  Future<bool> isPro() async {
    return false;
  }

  /// Gets available subscription offerings from RevenueCat.
  ///
  /// Returns [Offerings] if successful, null on failure.
  Future<Offerings?> getOfferings() async {
    if (!_isEnabled) return null;

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
    if (!_isEnabled) return false;

    try {
      if (!await ensureConfigured()) return false;

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
    if (!_isEnabled) return;

    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      debugPrint('Failed to show customer center: $e');
    }
  }

  /// Restores previous purchases for the current user.
  ///
  /// Useful when user reinstalls app or switches devices.
  Future<bool> restorePurchases() async {
    if (!_isEnabled) return false;

    try {
      await Purchases.restorePurchases();
      debugPrint('Purchases restored; subscription access remains unavailable');
      return false;
    } catch (e) {
      debugPrint('Failed to restore purchases: $e');
      return false;
    }
  }

  Future<void> signOut() async {
    if (!_isEnabled) return;

    try {
      await Purchases.logOut();
    } catch (e) {
      debugPrint('RevenueCat logOut failed: $e');
    }
  }

  /// Returns simplified subscription status: 'free' or 'pro'
  Future<String> getSubscriptionStatus() async {
    if (!_isEnabled) return 'free';

    final proStatus = await isPro();
    return proStatus ? 'pro' : 'free';
  }

  /// Purchases the monthly subscription
  Future<bool> purchaseMonthly() async {
    if (!_isEnabled) return false;

    try {
      final offerings = await Purchases.getOfferings();
      final monthlyPackage = offerings.current?.availablePackages.firstWhere(
        (p) => p.identifier == 'monthly',
        orElse: () => offerings.current!.monthly!,
      );
      if (monthlyPackage == null) return false;
      await Purchases.purchase(PurchaseParams.package(monthlyPackage));
      return true;
    } catch (e) {
      debugPrint('Failed to purchase monthly: $e');
      return false;
    }
  }

  /// Purchases the yearly subscription
  Future<bool> purchaseYearly() async {
    if (!_isEnabled) return false;

    try {
      final offerings = await Purchases.getOfferings();
      final yearlyPackage = offerings.current?.availablePackages.firstWhere(
        (p) => p.identifier == 'yearly',
        orElse: () => offerings.current!.annual!,
      );
      if (yearlyPackage == null) return false;
      await Purchases.purchase(PurchaseParams.package(yearlyPackage));
      return true;
    } catch (e) {
      debugPrint('Failed to purchase yearly: $e');
      return false;
    }
  }
}
