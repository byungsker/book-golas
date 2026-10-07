import 'package:flutter/foundation.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';

class ThirdPartyAiConsentSettingsController extends ChangeNotifier {
  final ThirdPartyAiConsentService _service;
  final Set<ThirdPartyAiProvider> _updating = {};
  bool _disposed = false;
  late Future<ThirdPartyAiConsentSnapshot> snapshot;

  ThirdPartyAiConsentSettingsController(this._service) {
    snapshot = _service.loadSnapshot();
  }

  bool isUpdating(ThirdPartyAiProvider provider) =>
      _updating.contains(provider);

  void reload() {
    snapshot = _service.loadSnapshot();
    _notify();
  }

  Future<void> runMutation(
    ThirdPartyAiProvider provider,
    Future<void> Function() mutation,
  ) async {
    if (_updating.contains(provider)) return;
    _updating.add(provider);
    _notify();
    try {
      await mutation();
      snapshot = _service.loadSnapshot();
      _notify();
      await snapshot;
    } finally {
      _updating.remove(provider);
      _notify();
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
