import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum ThirdPartyAiProvider {
  googleCloudVision,
  openAi,
}

class ThirdPartyAiConsentSnapshot {
  final bool googleCloudVision;
  final bool openAi;

  const ThirdPartyAiConsentSnapshot({
    required this.googleCloudVision,
    required this.openAi,
  });
}

class ThirdPartyAiConsentService {
  static final ThirdPartyAiConsentService _instance =
      ThirdPartyAiConsentService._internal();

  factory ThirdPartyAiConsentService() => _instance;

  ThirdPartyAiConsentService._internal();

  static const String _googleCloudVisionKey =
      'third_party_ai_consent_google_cloud_vision_v1';
  static const String _openAiKey = 'third_party_ai_consent_open_ai_v1';

  Future<bool> hasConsent(ThirdPartyAiProvider provider) async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getBool(_scopedKey(provider)) ?? false;
  }

  Future<ThirdPartyAiConsentSnapshot> loadSnapshot() async {
    final preferences = await SharedPreferences.getInstance();
    return ThirdPartyAiConsentSnapshot(
      googleCloudVision: preferences
              .getBool(_scopedKey(ThirdPartyAiProvider.googleCloudVision)) ??
          false,
      openAi:
          preferences.getBool(_scopedKey(ThirdPartyAiProvider.openAi)) ?? false,
    );
  }

  Future<void> grant(ThirdPartyAiProvider provider) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_scopedKey(provider), true);
  }

  Future<void> withdraw(ThirdPartyAiProvider provider) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_scopedKey(provider), false);
  }

  String _scopedKey(ThirdPartyAiProvider provider) {
    return '${_keyFor(provider)}_${_currentUserScope()}';
  }

  String _currentUserScope() {
    try {
      return Supabase.instance.client.auth.currentUser?.id ?? 'anonymous';
    } catch (_) {
      return 'anonymous';
    }
  }

  String _keyFor(ThirdPartyAiProvider provider) {
    switch (provider) {
      case ThirdPartyAiProvider.googleCloudVision:
        return _googleCloudVisionKey;
      case ThirdPartyAiProvider.openAi:
        return _openAiKey;
    }
  }
}
