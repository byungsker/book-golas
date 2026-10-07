import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:permission_handler/permission_handler.dart';

import 'package:book_golas/config/app_config.dart';
import 'package:book_golas/data/services/age_policy_service.dart';

class AdService {
  static final AdService _instance = AdService._internal();
  factory AdService() => _instance;
  AdService._internal({
    Future<bool> Function()? requestConsent,
    Future<bool> Function()? requestTrackingAuthorization,
    Future<void> Function()? initializeMobileAds,
    Future<bool> Function()? showPrivacyOptions,
    AgePolicyService? agePolicyService,
  })  : _requestConsentOverride = requestConsent,
        _requestTrackingAuthorizationOverride = requestTrackingAuthorization,
        _initializeMobileAdsOverride = initializeMobileAds,
        _showPrivacyOptionsOverride = showPrivacyOptions,
        _agePolicyService = agePolicyService ?? AgePolicyService() {
    _agePolicyService.addListener(_handleAgePolicyChanged);
  }

  @visibleForTesting
  factory AdService.forTesting({
    required Future<bool> Function() requestConsent,
    Future<bool> Function()? requestTrackingAuthorization,
    Future<void> Function()? initializeMobileAds,
    Future<bool> Function()? showPrivacyOptions,
    AgePolicyService? agePolicyService,
  }) {
    return AdService._internal(
      requestConsent: requestConsent,
      requestTrackingAuthorization: requestTrackingAuthorization,
      initializeMobileAds: initializeMobileAds,
      showPrivacyOptions: showPrivacyOptions,
      agePolicyService: agePolicyService,
    );
  }

  bool _isInitialized = false;
  Future<bool>? _initializationAttempt;
  int _consentEpoch = 0;
  final Future<bool> Function()? _requestConsentOverride;
  final Future<bool> Function()? _requestTrackingAuthorizationOverride;
  final Future<void> Function()? _initializeMobileAdsOverride;
  final Future<bool> Function()? _showPrivacyOptionsOverride;
  final AgePolicyService _agePolicyService;
  final Set<VoidCallback> _consentInvalidationListeners = {};
  bool get isInitialized => _isInitialized;
  bool get canRequestAds => _agePolicyService.canRequestAds;
  AgePolicyService get agePolicyService => _agePolicyService;

  void addConsentInvalidationListener(VoidCallback listener) {
    _consentInvalidationListeners.add(listener);
  }

  void removeConsentInvalidationListener(VoidCallback listener) {
    _consentInvalidationListeners.remove(listener);
  }

  Future<bool> initialize() {
    if (_isInitialized) return Future.value(true);
    final existingAttempt = _initializationAttempt;
    if (existingAttempt != null) return existingAttempt;

    final consentEpoch = _consentEpoch;
    final attempt = _initialize(consentEpoch);
    _initializationAttempt = attempt;
    return attempt.whenComplete(() {
      if (identical(_initializationAttempt, attempt)) {
        _initializationAttempt = null;
      }
    });
  }

  Future<bool> _initialize(int consentEpoch) async {
    try {
      await _agePolicyService.load();
      if (!_agePolicyService.canRequestAds) {
        debugPrint('AdMob initialization skipped: age policy blocks ads');
        return false;
      }

      final canRequestAds =
          await (_requestConsentOverride?.call() ?? _requestConsent());
      if (!canRequestAds || consentEpoch != _consentEpoch) {
        debugPrint('AdMob initialization skipped: consent is not ready');
        return false;
      }

      final trackingAuthorized =
          await (_requestTrackingAuthorizationOverride?.call() ??
              _requestTrackingAuthorization());
      if (!trackingAuthorized || consentEpoch != _consentEpoch) {
        debugPrint('AdMob initialization skipped: tracking is not authorized');
        return false;
      }

      if (_initializeMobileAdsOverride != null) {
        await _initializeMobileAdsOverride();
      } else {
        await MobileAds.instance.initialize();
      }
      if (consentEpoch != _consentEpoch) return false;

      _isInitialized = true;
      debugPrint('AdMob initialization completed');
      return true;
    } catch (_) {
      debugPrint('AdMob initialization failed');
      return false;
    }
  }

  Future<bool> _requestConsent() async {
    final completer = Completer<bool>();

    ConsentInformation.instance.requestConsentInfoUpdate(
      ConsentRequestParameters(),
      () {
        ConsentForm.loadAndShowConsentFormIfRequired((formError) {
          if (formError != null) {
            debugPrint('AdMob consent form failed: ${formError.message}');
            if (!completer.isCompleted) completer.complete(false);
            return;
          }
          if (!completer.isCompleted) {
            completer.complete(ConsentInformation.instance.canRequestAds());
          }
        });
      },
      (formError) {
        debugPrint('AdMob consent update failed: ${formError.message}');
        if (!completer.isCompleted) completer.complete(false);
      },
    );

    return completer.future;
  }

  Future<bool> _requestTrackingAuthorization() async {
    if (!Platform.isIOS) return true;

    final status = await Permission.appTrackingTransparency.request();
    return status.isGranted;
  }

  Future<bool> isPrivacyOptionsRequired() async {
    await _agePolicyService.load();
    if (!_agePolicyService.canRequestAds) return false;

    try {
      final status = await ConsentInformation.instance
          .getPrivacyOptionsRequirementStatus();
      return status == PrivacyOptionsRequirementStatus.required;
    } catch (e) {
      debugPrint('Failed to read AdMob privacy options status: $e');
      return false;
    }
  }

  Future<bool> showPrivacyOptions() async {
    await _agePolicyService.load();
    if (!_agePolicyService.canRequestAds) return false;

    _invalidateConsent();
    if (_showPrivacyOptionsOverride != null) {
      return _showPrivacyOptionsOverride();
    }

    final completer = Completer<bool>();

    ConsentForm.showPrivacyOptionsForm((formError) {
      if (formError != null) {
        debugPrint(
            'Failed to show AdMob privacy options: ${formError.message}');
      }
      completer.complete(formError == null);
    });

    return completer.future;
  }

  void _handleAgePolicyChanged() {
    if (!_agePolicyService.canRequestAds &&
        (_isInitialized || _initializationAttempt != null)) {
      _invalidateConsent();
    }
  }

  void _invalidateConsent() {
    _consentEpoch += 1;
    _isInitialized = false;
    _initializationAttempt = null;
    for (final listener
        in List<VoidCallback>.from(_consentInvalidationListeners)) {
      listener();
    }
  }

  String get bannerAdUnitId {
    if (AppConfig.isDevelopment || kDebugMode) {
      return Platform.isIOS
          ? 'ca-app-pub-3940256099942544/2934735716'
          : 'ca-app-pub-3940256099942544/6300978111';
    }
    return Platform.isIOS
        ? (const String.fromEnvironment('ADMOB_BANNER_IOS',
            defaultValue: 'ca-app-pub-2826132306659672/3505110941'))
        : (const String.fromEnvironment('ADMOB_BANNER_ANDROID',
            defaultValue: 'ca-app-pub-3940256099942544/6300978111'));
  }

  String get nativeAdUnitId {
    if (AppConfig.isDevelopment || kDebugMode) {
      return Platform.isIOS
          ? 'ca-app-pub-3940256099942544/3986624511'
          : 'ca-app-pub-3940256099942544/2247696110';
    }
    return Platform.isIOS
        ? (const String.fromEnvironment('ADMOB_NATIVE_IOS',
            defaultValue: 'ca-app-pub-2826132306659672/2344072517'))
        : (const String.fromEnvironment('ADMOB_NATIVE_ANDROID',
            defaultValue: 'ca-app-pub-3940256099942544/2247696110'));
  }

  BannerAd? createBannerAd({
    required BannerAdListener listener,
    AdSize adSize = AdSize.banner,
  }) {
    if (!canRequestAds || !_isInitialized) return null;

    return BannerAd(
      adUnitId: bannerAdUnitId,
      size: adSize,
      request: const AdRequest(),
      listener: listener,
    );
  }

  NativeAd? createNativeAd({
    required NativeAdListener listener,
    required String factoryId,
  }) {
    if (!canRequestAds || !_isInitialized) return null;

    return NativeAd(
      adUnitId: nativeAdUnitId,
      factoryId: factoryId,
      request: const AdRequest(),
      listener: listener,
    );
  }
}
