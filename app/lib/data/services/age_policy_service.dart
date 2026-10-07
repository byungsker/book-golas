import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AgePolicyStatus {
  unknown,
  under14,
  age14OrOlder,
}

class AgePolicyService extends ChangeNotifier {
  static const _agePolicyKey = 'age_policy_status';

  final Future<SharedPreferences> Function() _getPreferences;
  AgePolicyStatus _status = AgePolicyStatus.unknown;
  bool _isLoaded = false;

  AgePolicyService({
    Future<SharedPreferences> Function()? getPreferences,
  }) : _getPreferences = getPreferences ?? SharedPreferences.getInstance;

  AgePolicyStatus get status => _status;
  bool get isLoaded => _isLoaded;
  bool get canRequestAds =>
      _isLoaded && _status == AgePolicyStatus.age14OrOlder;

  Future<AgePolicyStatus> load() async {
    try {
      final preferences = await _getPreferences();
      final value = preferences.getString(_agePolicyKey);
      _status = switch (value) {
        'under14' => AgePolicyStatus.under14,
        'age14OrOlder' => AgePolicyStatus.age14OrOlder,
        _ => AgePolicyStatus.unknown,
      };
    } catch (error) {
      debugPrint('Failed to load local age policy: $error');
      _status = AgePolicyStatus.unknown;
    }
    _isLoaded = true;
    notifyListeners();
    return _status;
  }

  Future<bool> setStatus(AgePolicyStatus status) async {
    if (status == AgePolicyStatus.unknown) return false;

    try {
      final preferences = await _getPreferences();
      final saved = await preferences.setString(
        _agePolicyKey,
        switch (status) {
          AgePolicyStatus.under14 => 'under14',
          AgePolicyStatus.age14OrOlder => 'age14OrOlder',
          AgePolicyStatus.unknown => '',
        },
      );
      if (!saved) return false;

      _status = status;
      _isLoaded = true;
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }
}
