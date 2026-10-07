import 'package:flutter/material.dart';

import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/ui/core/view_model/ad_view_model.dart';

class AdBannerWidget extends StatefulWidget {
  final AdSize adSize;

  const AdBannerWidget({
    super.key,
    this.adSize = AdSize.banner,
  });

  @override
  State<AdBannerWidget> createState() => _AdBannerWidgetState();
}

class _AdBannerWidgetState extends State<AdBannerWidget> {
  BannerAd? _bannerAd;
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
    if (_hasAttemptedLoad || _isLoadingAd || _bannerAd != null) return;

    final adViewModel = _adViewModel!;
    if (!adViewModel.shouldShowAds || !adViewModel.isInitialized) return;

    _hasAttemptedLoad = true;
    _isLoadingAd = true;
    final bannerAd = adViewModel.adService.createBannerAd(
      adSize: widget.adSize,
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          if (mounted) {
            setState(() {
              _isAdLoaded = true;
              _isLoadingAd = false;
            });
          }
        },
        onAdFailedToLoad: (ad, error) {
          debugPrint('Banner ad failed to load: ${error.message}');
          ad.dispose();
          if (mounted) {
            setState(() {
              _bannerAd = null;
              _isAdLoaded = false;
              _isLoadingAd = false;
            });
          }
        },
      ),
    );
    if (bannerAd == null) {
      _isLoadingAd = false;
      return;
    }

    _bannerAd = bannerAd;
    bannerAd.load();
  }

  void _handleAdVisibilityChanged() {
    final adViewModel = _adViewModel;
    if (!mounted ||
        adViewModel == null ||
        (adViewModel.shouldShowAds && adViewModel.isInitialized)) {
      return;
    }

    _bannerAd?.dispose();
    setState(() {
      _bannerAd = null;
      _isAdLoaded = false;
      _isLoadingAd = false;
      _hasAttemptedLoad = false;
    });
  }

  @override
  void dispose() {
    _adViewModel?.removeListener(_handleAdVisibilityChanged);
    _bannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AdViewModel>(
      builder: (context, adViewModel, _) {
        if (!adViewModel.shouldShowAds) {
          return const SizedBox.shrink();
        }

        if (adViewModel.isInitialized &&
            _bannerAd == null &&
            !_isLoadingAd &&
            !_hasAttemptedLoad) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _loadAd();
          });
        }

        if (!_isAdLoaded || _bannerAd == null) {
          return const SizedBox.shrink();
        }

        return Container(
          alignment: Alignment.center,
          width: widget.adSize.width.toDouble(),
          height: widget.adSize.height.toDouble(),
          child: AdWidget(ad: _bannerAd!),
        );
      },
    );
  }
}
