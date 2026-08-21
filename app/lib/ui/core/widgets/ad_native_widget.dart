import 'package:flutter/material.dart';

import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/view_model/ad_view_model.dart';

class AdNativeWidget extends StatefulWidget {
  final double height;
  final String factoryId;

  const AdNativeWidget({
    super.key,
    this.height = 120,
    this.factoryId = 'listTile',
  });

  @override
  State<AdNativeWidget> createState() => _AdNativeWidgetState();
}

class _AdNativeWidgetState extends State<AdNativeWidget> {
  NativeAd? _nativeAd;
  bool _isAdLoaded = false;
  bool _isLoadingAd = false;
  bool _hasAttemptedLoad = false;
  AdViewModel? _adViewModel;

  @override
  void initState() {
    super.initState();
    _adViewModel = context.read<AdViewModel>();
    _adViewModel!.addListener(_handleAdVisibilityChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAd();
    });
  }

  void _loadAd() {
    if (_hasAttemptedLoad || _isLoadingAd || _nativeAd != null) return;

    final adViewModel = _adViewModel!;
    if (!adViewModel.shouldShowAds || !adViewModel.isInitialized) return;

    _hasAttemptedLoad = true;
    _isLoadingAd = true;
    final nativeAd = adViewModel.adService.createNativeAd(
      factoryId: widget.factoryId,
      listener: NativeAdListener(
        onAdLoaded: (ad) {
          if (mounted) {
            setState(() {
              _isAdLoaded = true;
              _isLoadingAd = false;
            });
          }
        },
        onAdFailedToLoad: (ad, error) {
          debugPrint('Native ad failed to load: ${error.message}');
          ad.dispose();
          if (mounted) {
            setState(() {
              _nativeAd = null;
              _isAdLoaded = false;
              _isLoadingAd = false;
            });
          }
        },
      ),
    );
    if (nativeAd == null) {
      _isLoadingAd = false;
      return;
    }

    _nativeAd = nativeAd;
    nativeAd.load();
  }

  void _handleAdVisibilityChanged() {
    final adViewModel = _adViewModel;
    if (!mounted ||
        adViewModel == null ||
        (adViewModel.shouldShowAds && adViewModel.isInitialized)) {
      return;
    }

    _nativeAd?.dispose();
    setState(() {
      _nativeAd = null;
      _isAdLoaded = false;
      _isLoadingAd = false;
      _hasAttemptedLoad = false;
    });
  }

  @override
  void dispose() {
    _adViewModel?.removeListener(_handleAdVisibilityChanged);
    _nativeAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AdViewModel>(
      builder: (context, adViewModel, _) {
        if (adViewModel.shouldShowAds &&
            adViewModel.isInitialized &&
            _nativeAd == null &&
            !_isLoadingAd &&
            !_hasAttemptedLoad) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _loadAd();
          });
        }

        if (!adViewModel.shouldShowAds || !_isAdLoaded || _nativeAd == null) {
          return const SizedBox.shrink();
        }

        final isDark = Theme.of(context).brightness == Brightness.dark;

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          height: widget.height,
          decoration: BoxDecoration(
            color: isDark ? BLabColors.elevatedDark : BLabColors.elevatedLight,
            borderRadius: BorderRadius.circular(12),
          ),
          clipBehavior: Clip.antiAlias,
          child: AdWidget(ad: _nativeAd!),
        );
      },
    );
  }
}
