import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:book_golas/data/services/ad_service.dart';
import 'package:book_golas/data/services/age_policy_service.dart';

Future<AgePolicyService> _agePolicy(AgePolicyStatus status) async {
  final service = AgePolicyService();
  if (status != AgePolicyStatus.unknown) {
    await service.setStatus(status);
  }
  return service;
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('does not initialize or request consent when age is unknown', () async {
    var consentRequests = 0;
    var mobileAdsInitializations = 0;
    final service = AdService.forTesting(
      requestConsent: () async {
        consentRequests += 1;
        return true;
      },
      requestTrackingAuthorization: () async => true,
      initializeMobileAds: () async {
        mobileAdsInitializations += 1;
      },
      agePolicyService: await _agePolicy(AgePolicyStatus.unknown),
    );

    expect(await service.initialize(), isFalse);
    expect(consentRequests, 0);
    expect(mobileAdsInitializations, 0);
  });

  test('does not create ads before successful initialization', () async {
    final service = AdService.forTesting(
      requestConsent: () async => true,
      requestTrackingAuthorization: () async => true,
      initializeMobileAds: () async {},
      agePolicyService: await _agePolicy(AgePolicyStatus.age14OrOlder),
    );

    expect(
      service.createBannerAd(listener: const BannerAdListener()),
      isNull,
    );
    expect(
      service.createNativeAd(
        listener: NativeAdListener(),
        factoryId: 'listTile',
      ),
      isNull,
    );
  });

  test('does not initialize or request consent for users under 14', () async {
    var consentRequests = 0;
    var mobileAdsInitializations = 0;
    final service = AdService.forTesting(
      requestConsent: () async {
        consentRequests += 1;
        return true;
      },
      requestTrackingAuthorization: () async => true,
      initializeMobileAds: () async {
        mobileAdsInitializations += 1;
      },
      agePolicyService: await _agePolicy(AgePolicyStatus.under14),
    );

    expect(await service.initialize(), isFalse);
    expect(consentRequests, 0);
    expect(mobileAdsInitializations, 0);
  });

  test('does not initialize when consent fails', () async {
    var mobileAdsInitializations = 0;
    final service = AdService.forTesting(
      requestConsent: () async => false,
      requestTrackingAuthorization: () async => true,
      initializeMobileAds: () async {
        mobileAdsInitializations += 1;
      },
      agePolicyService: await _agePolicy(AgePolicyStatus.age14OrOlder),
    );

    expect(await service.initialize(), isFalse);
    expect(service.isInitialized, isFalse);
    expect(mobileAdsInitializations, 0);
  });

  test('does not initialize when tracking authorization is denied', () async {
    var mobileAdsInitializations = 0;
    final service = AdService.forTesting(
      requestConsent: () async => true,
      requestTrackingAuthorization: () async => false,
      initializeMobileAds: () async {
        mobileAdsInitializations += 1;
      },
      agePolicyService: await _agePolicy(AgePolicyStatus.age14OrOlder),
    );

    expect(await service.initialize(), isFalse);
    expect(service.isInitialized, isFalse);
    expect(mobileAdsInitializations, 0);
  });

  test('requires fresh consent after opening privacy options', () async {
    var consentCanRequestAds = true;
    var mobileAdsInitializations = 0;
    final service = AdService.forTesting(
      requestConsent: () async => consentCanRequestAds,
      requestTrackingAuthorization: () async => true,
      initializeMobileAds: () async {
        mobileAdsInitializations += 1;
      },
      showPrivacyOptions: () async => true,
      agePolicyService: await _agePolicy(AgePolicyStatus.age14OrOlder),
    );

    expect(await service.initialize(), isTrue);
    expect(await service.showPrivacyOptions(), isTrue);
    expect(service.isInitialized, isFalse);

    consentCanRequestAds = false;
    expect(await service.initialize(), isFalse);
    expect(mobileAdsInitializations, 1);
  });

  test('rejects initialization completed after privacy options open', () async {
    final consent = Completer<bool>();
    var mobileAdsInitializations = 0;
    final service = AdService.forTesting(
      requestConsent: () => consent.future,
      requestTrackingAuthorization: () async => true,
      initializeMobileAds: () async {
        mobileAdsInitializations += 1;
      },
      showPrivacyOptions: () async => true,
      agePolicyService: await _agePolicy(AgePolicyStatus.age14OrOlder),
    );

    final initialization = service.initialize();
    await service.showPrivacyOptions();
    consent.complete(true);

    expect(await initialization, isFalse);
    expect(service.isInitialized, isFalse);
    expect(mobileAdsInitializations, 0);
  });
}
