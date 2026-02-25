import 'package:flutter/foundation.dart';

import 'package:book_golas/data/services/ad_service.dart';
import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/utils/subscription_utils.dart';

class AdViewModel extends ChangeNotifier {
  final SubscriptionService _subscriptionService;
  final AdService _adService = AdService();

  bool _shouldShowAds = false;
  bool _isInitialized = false;
  bool _isDisposed = false;

  bool get shouldShowAds => _shouldShowAds;
  bool get isInitialized => _isInitialized;
  AdService get adService => _adService;

  AdViewModel(this._subscriptionService);

  Future<void> initialize() async {
    if (_isInitialized || _isDisposed) return;

    await _adService.initialize();
    await refreshAdVisibility();

    _isInitialized = true;
    if (!_isDisposed) {
      notifyListeners();
    }
  }

  Future<void> refreshAdVisibility() async {
    if (_isDisposed) return;

    try {
      if (SubscriptionUtils.isSuperAdmin()) {
        _shouldShowAds = false;
        if (!_isDisposed) notifyListeners();
        return;
      }

      final isPro = await _subscriptionService.isPro();
      _shouldShowAds = !isPro;

      if (!_isDisposed) {
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Failed to check ad visibility: $e');
      _shouldShowAds = true;
      if (!_isDisposed) notifyListeners();
    }
  }

  @override
  void notifyListeners() {
    if (!_isDisposed) {
      super.notifyListeners();
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }
}
