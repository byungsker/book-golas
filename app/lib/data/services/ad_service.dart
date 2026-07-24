import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'package:book_golas/config/app_config.dart';

class AdService {
  static final AdService _instance = AdService._internal();
  factory AdService() => _instance;
  AdService._internal();

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      final canRequestAds = await _requestConsent();
      if (!canRequestAds) {
        debugPrint('AdMob initialization skipped: consent is not ready');
        return;
      }

      await MobileAds.instance.initialize();
      _isInitialized = true;
      debugPrint('✅ AdMob 초기화 완료');
    } catch (e) {
      debugPrint('❌ AdMob 초기화 실패: $e');
    }
  }

  Future<bool> _requestConsent() async {
    final completer = Completer<void>();

    ConsentInformation.instance.requestConsentInfoUpdate(
      ConsentRequestParameters(),
      () {
        ConsentForm.loadAndShowConsentFormIfRequired((formError) {
          if (formError != null) {
            debugPrint('AdMob consent form failed: ${formError.message}');
          }
          if (!completer.isCompleted) completer.complete();
        });
      },
      (formError) {
        debugPrint('AdMob consent update failed: ${formError.message}');
        if (!completer.isCompleted) completer.complete();
      },
    );

    await completer.future;
    return ConsentInformation.instance.canRequestAds();
  }

  Future<bool> isPrivacyOptionsRequired() async {
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

  BannerAd createBannerAd({
    required BannerAdListener listener,
    AdSize adSize = AdSize.banner,
  }) {
    return BannerAd(
      adUnitId: bannerAdUnitId,
      size: adSize,
      request: const AdRequest(),
      listener: listener,
    );
  }

  NativeAd createNativeAd({
    required NativeAdListener listener,
    required String factoryId,
  }) {
    return NativeAd(
      adUnitId: nativeAdUnitId,
      factoryId: factoryId,
      request: const AdRequest(),
      listener: listener,
    );
  }
}
