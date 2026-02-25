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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAd();
    });
  }

  void _loadAd() {
    final adViewModel = context.read<AdViewModel>();
    if (!adViewModel.shouldShowAds || !adViewModel.isInitialized) return;

    _nativeAd = adViewModel.adService.createNativeAd(
      factoryId: widget.factoryId,
      listener: NativeAdListener(
        onAdLoaded: (ad) {
          if (mounted) {
            setState(() {
              _isAdLoaded = true;
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
            });
          }
        },
      ),
    );
    _nativeAd?.load();
  }

  @override
  void dispose() {
    _nativeAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AdViewModel>(
      builder: (context, adViewModel, _) {
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
