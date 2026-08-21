import 'package:flutter/foundation.dart';

import 'package:book_golas/data/services/ad_service.dart';
import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/utils/subscription_utils.dart';

class AdViewModel extends ChangeNotifier {
  final SubscriptionService _subscriptionService;
  final bool Function() _isSuperAdmin;
  final AdService _adService;
  late final Future<bool> Function() _initializeAds;

  bool _shouldShowAds = false;
  bool _isInitialized = false;
  bool _isInitializing = false;
  bool _hasInitializationError = false;
  bool _isDisposed = false;
  Future<bool>? _initializationAttempt;
  int _consentEpoch = 0;

  bool get shouldShowAds => _shouldShowAds;
  bool get isInitialized => _isInitialized;
  bool get isInitializing => _isInitializing;
  bool get hasInitializationError => _hasInitializationError;
  AdService get adService => _adService;

  AdViewModel(
    this._subscriptionService, {
    bool Function()? isSuperAdmin,
    Future<bool> Function()? initializeAds,
    AdService? adService,
  })  : _isSuperAdmin = isSuperAdmin ?? SubscriptionUtils.isSuperAdmin,
        _adService = adService ?? AdService() {
    _initializeAds = initializeAds ?? _adService.initialize;
    _adService.addConsentInvalidationListener(_handleConsentInvalidated);
  }

  Future<bool> initialize() {
    if (_isInitialized) return Future.value(true);
    if (_isDisposed) return Future.value(false);
    final existingAttempt = _initializationAttempt;
    if (existingAttempt != null) return existingAttempt;

    final consentEpoch = _consentEpoch;
    final attempt = _runInitialization(consentEpoch);
    _initializationAttempt = attempt;
    return attempt.whenComplete(() {
      if (identical(_initializationAttempt, attempt)) {
        _initializationAttempt = null;
      }
    });
  }

  Future<bool> _runInitialization(int consentEpoch) async {
    _isInitializing = true;
    _hasInitializationError = false;
    notifyListeners();

    var initialized = false;
    try {
      initialized = await _initializeAds();
      if (!_isDisposed && consentEpoch == _consentEpoch && initialized) {
        await refreshAdVisibility();
      }
    } catch (_) {
      initialized = false;
    }

    if (_isDisposed) {
      return false;
    }
    if (consentEpoch != _consentEpoch) {
      _isInitialized = false;
      _isInitializing = false;
      _shouldShowAds = false;
      notifyListeners();
      return false;
    }

    _isInitialized = initialized && _adService.isInitialized;
    if (!_isInitialized) {
      _shouldShowAds = false;
      _hasInitializationError = true;
    }
    _isInitializing = false;
    notifyListeners();
    return _isInitialized;
  }

  Future<bool> retryInitialization() => initialize();

  Future<bool> showPrivacyOptions() => _adService.showPrivacyOptions();

  void _handleConsentInvalidated() {
    if (_isDisposed) return;
    _consentEpoch += 1;
    _isInitialized = false;
    _isInitializing = false;
    _shouldShowAds = false;
    _hasInitializationError = false;
    notifyListeners();
  }

  Future<void> refreshAdVisibility() async {
    if (_isDisposed) return;

    try {
      await _adService.agePolicyService.load();
      if (!_adService.canRequestAds) {
        _shouldShowAds = false;
        notifyListeners();
        return;
      }

      if (_isSuperAdmin()) {
        _shouldShowAds = false;
        if (!_isDisposed) notifyListeners();
        return;
      }

      if (!_subscriptionService.isEnabled) {
        _shouldShowAds = true;
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
      _shouldShowAds = false;
      notifyListeners();
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
    _adService.removeConsentInvalidationListener(_handleConsentInvalidated);
    super.dispose();
  }
}
