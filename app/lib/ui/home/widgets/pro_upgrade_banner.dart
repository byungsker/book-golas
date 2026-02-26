import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/subscription/view_model/subscription_view_model.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';

class ProUpgradeBanner extends StatelessWidget {
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;

  const ProUpgradeBanner({super.key, this.onTap, this.onDismiss});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: GestureDetector(
        onTap: onTap ?? () => _showProFeaturesSheet(context),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    BLabColors.primary.withValues(alpha: 0.35),
                    BLabColors.primary.withValues(alpha: 0.15),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: BLabColors.primary.withValues(alpha: 0.4),
                  width: 0.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: BLabColors.primary.withValues(alpha: 0.1),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.star_rounded,
                      color: Colors.amber[400],
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          l10n.proUpgradeBannerMini,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.95),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          l10n.proUpgradeBannerMiniDesc,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.55),
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (onDismiss != null) ...[
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: onDismiss,
                      behavior: HitTestBehavior.opaque,
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Icon(
                          CupertinoIcons.xmark,
                          color: Colors.white.withValues(alpha: 0.5),
                          size: 14,
                        ),
                      ),
                    ),
                  ] else ...[
                    Icon(
                      CupertinoIcons.chevron_right,
                      color: Colors.white.withValues(alpha: 0.5),
                      size: 14,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showProFeaturesSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ProFeaturesSheet(),
    );
  }
}

class ProFeaturesSheet extends StatelessWidget {
  const ProFeaturesSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? BLabColors.elevatedDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.2)
                      : Colors.black.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              Icon(
                Icons.star_rounded,
                color: Colors.amber[400],
                size: 40,
              ),
              const SizedBox(height: 12),
              Text(
                l10n.proUpgradeBannerTitle,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.proUpgradeBannerSubtitle,
                style: TextStyle(
                  fontSize: 14,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.6)
                      : Colors.black.withValues(alpha: 0.5),
                ),
              ),
              const SizedBox(height: 24),
              _buildBenefitRow(
                context,
                icon: CupertinoIcons.book_fill,
                text: l10n.subscriptionBenefit1,
                isDark: isDark,
              ),
              const SizedBox(height: 14),
              _buildBenefitRow(
                context,
                icon: Icons.auto_awesome,
                text: l10n.subscriptionBenefit2,
                isDark: isDark,
              ),
              const SizedBox(height: 14),
              _buildBenefitRow(
                context,
                icon: CupertinoIcons.chart_bar_fill,
                text: l10n.subscriptionBenefit3,
                isDark: isDark,
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final vm = context.read<SubscriptionViewModel>();
                    final l10n = AppLocalizations.of(context);
                    final success = await vm.showPaywall(context);
                    if (context.mounted) {
                      if (!success) {
                        CustomSnackbar.show(context, message: l10n.subscriptionUnavailable, type: BLabSnackbarType.info, rootOverlay: true);
                      }
                      Navigator.pop(context);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: BLabColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    l10n.proUpgradeBannerCta,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBenefitRow(
    BuildContext context, {
    required IconData icon,
    required String text,
    required bool isDark,
  }) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: BLabColors.primary.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            color: BLabColors.primary,
            size: 18,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
        ),
      ],
    );
  }
}
