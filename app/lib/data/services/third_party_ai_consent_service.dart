import 'package:supabase_flutter/supabase_flutter.dart';

enum ThirdPartyAiProvider {
  googleCloudVision,
  openAi,
}

extension ThirdPartyAiProviderValue on ThirdPartyAiProvider {
  String get databaseValue => switch (this) {
        ThirdPartyAiProvider.googleCloudVision => 'google_cloud_vision',
        ThirdPartyAiProvider.openAi => 'open_ai',
      };
}

class ThirdPartyAiDisclosure {
  final String locale;
  final String title;
  final String description;
  final String dataDescription;
  final String optionalNotice;

  const ThirdPartyAiDisclosure({
    required this.locale,
    required this.title,
    required this.description,
    required this.dataDescription,
    required this.optionalNotice,
  });

  Map<String, dynamic> toJson() => {
        'title': title,
        'description': description,
        'data_description': dataDescription,
        'optional_notice': optionalNotice,
      };
}

class ThirdPartyAiConsentRecord {
  final bool granted;
  final int policyVersion;

  const ThirdPartyAiConsentRecord({
    required this.granted,
    required this.policyVersion,
  });
}

abstract class ThirdPartyAiConsentStore {
  Future<ThirdPartyAiConsentRecord?> read(
    String userId,
    ThirdPartyAiProvider provider,
  );

  Future<void> grant(
    String userId,
    ThirdPartyAiProvider provider,
    int policyVersion,
    ThirdPartyAiDisclosure disclosure,
  );

  Future<void> withdraw(
    String userId,
    ThirdPartyAiProvider provider,
  );
}

class SupabaseThirdPartyAiConsentStore implements ThirdPartyAiConsentStore {
  final SupabaseClient Function() _clientProvider;

  SupabaseThirdPartyAiConsentStore(this._clientProvider);

  @override
  Future<ThirdPartyAiConsentRecord?> read(
    String userId,
    ThirdPartyAiProvider provider,
  ) async {
    final response = await _clientProvider()
        .from('third_party_ai_consents')
        .select('granted, policy_version')
        .eq('user_id', userId)
        .eq('provider', provider.databaseValue)
        .maybeSingle();
    if (response == null) return null;
    return ThirdPartyAiConsentRecord(
      granted: response['granted'] == true,
      policyVersion: response['policy_version'] as int? ?? 0,
    );
  }

  @override
  Future<void> grant(
    String userId,
    ThirdPartyAiProvider provider,
    int policyVersion,
    ThirdPartyAiDisclosure disclosure,
  ) async {
    await _clientProvider().rpc('record_third_party_ai_consent', params: {
      'p_provider': provider.databaseValue,
      'p_policy_version': policyVersion,
      'p_granted': true,
      'p_disclosure_locale': disclosure.locale,
      'p_disclosure_snapshot': disclosure.toJson(),
    });
  }

  @override
  Future<void> withdraw(
    String userId,
    ThirdPartyAiProvider provider,
  ) async {
    final recorded = await _clientProvider().rpc(
      'record_third_party_ai_consent',
      params: {
        'p_provider': provider.databaseValue,
        'p_policy_version': ThirdPartyAiConsentService.policyVersion,
        'p_granted': false,
      },
    );
    if (recorded != true) {
      throw StateError('Consent withdrawal was not recorded');
    }
  }
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
  static const int policyVersion = 1;
  static final ThirdPartyAiConsentService _instance =
      ThirdPartyAiConsentService.withStore(
    SupabaseThirdPartyAiConsentStore(() => Supabase.instance.client),
    () => Supabase.instance.client.auth.currentUser?.id,
  );

  final ThirdPartyAiConsentStore _store;
  final String? Function() _userIdProvider;

  factory ThirdPartyAiConsentService() => _instance;

  ThirdPartyAiConsentService.withStore(
    this._store,
    this._userIdProvider,
  );

  Future<bool> hasConsent(ThirdPartyAiProvider provider) async {
    final userId = _userIdProvider();
    if (userId == null) return false;
    try {
      final record = await _store.read(userId, provider);
      return record?.granted == true && record?.policyVersion == policyVersion;
    } catch (_) {
      return false;
    }
  }

  Future<ThirdPartyAiConsentSnapshot> loadSnapshot() async {
    final results = await Future.wait([
      hasConsent(ThirdPartyAiProvider.googleCloudVision),
      hasConsent(ThirdPartyAiProvider.openAi),
    ]);
    return ThirdPartyAiConsentSnapshot(
      googleCloudVision: results[0],
      openAi: results[1],
    );
  }

  Future<bool> grant(
    ThirdPartyAiProvider provider, {
    required ThirdPartyAiDisclosure disclosure,
  }) async {
    final userId = _userIdProvider();
    if (userId == null) return false;
    try {
      await _store.grant(
        userId,
        provider,
        policyVersion,
        disclosure,
      );
      return await hasConsent(provider);
    } catch (_) {
      return false;
    }
  }

  Future<bool> withdraw(ThirdPartyAiProvider provider) async {
    final userId = _userIdProvider();
    if (userId == null) return false;
    try {
      await _store.withdraw(userId, provider);
      final record = await _store.read(userId, provider);
      return record?.granted == false;
    } catch (_) {
      return false;
    }
  }
}
