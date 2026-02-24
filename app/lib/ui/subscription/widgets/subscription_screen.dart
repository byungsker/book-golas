import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/subscription/view_model/subscription_view_model.dart';

/// Subscription management screen.
///
/// Displays current subscription status, upgrade options, and manage subscription.
class SubscriptionScreen extends StatelessWidget {
  final VoidCallback? onClose;

  const SubscriptionScreen({super.key, this.onClose});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final viewModel = context.watch<SubscriptionViewModel>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isPro = viewModel.isProUser;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1A1B2E) : Colors.white,
      appBar: AppBar(
        leading: IconButton(
          onPressed: onClose ?? () => Navigator.of(context).pop(),
          icon: Icon(
            Icons.arrow_back_ios,
            color: Theme.of(context).iconTheme.color,
          ),
        ),
        title: Text(
          l10n.subscriptionTitle,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildCurrentStatus(context, viewModel, l10n),
            const SizedBox(height: 24),
            if (!isPro) ...[
              _buildUpgradeSection(context, viewModel, l10n),
              const SizedBox(height: 24),
            ],
            _buildBenefitsSection(context, l10n),
            const SizedBox(height: 24),
            _buildManageSubscription(context, viewModel, l10n),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentStatus(
    BuildContext context,
    SubscriptionViewModel viewModel,
    AppLocalizations l10n,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isPro = viewModel.isProUser;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: isPro
            ? Theme.of(context).primaryColor.withValues(alpha: 0.1)
            : (isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.grey[100]),
        border: Border.all(
          color: isPro ? Theme.of(context).primaryColor : Colors.grey[300]!,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isPro ? Theme.of(context).primaryColor : Colors.grey[400],
              shape: BoxShape.circle,
            ),
            child: Icon(
              isPro ? Icons.star : Icons.star_border,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isPro
                      ? l10n.subscriptionProStatus
                      : l10n.subscriptionFreeStatus,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isPro
                      ? l10n.subscriptionProDescription
                      : l10n.subscriptionFreeDescription,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white70 : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpgradeSection(
    BuildContext context,
    SubscriptionViewModel viewModel,
    AppLocalizations l10n,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.subscriptionUpgradeTitle,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        _PricingButton(
          title: l10n.subscriptionMonthly,
          price: l10n.subscriptionMonthlyPrice,
          period: l10n.subscriptionPerMonth,
          isPopular: true,
          onTap: () => viewModel.showPaywall(context),
        ),
        const SizedBox(height: 10),
        _PricingButton(
          title: l10n.subscriptionYearly,
          price: l10n.subscriptionYearlyPrice,
          period: l10n.subscriptionPerYear,
          savings: l10n.subscriptionYearlySavings,
          onTap: () => viewModel.showPaywall(context),
        ),
      ],
    );
  }

  Widget _buildBenefitsSection(BuildContext context, AppLocalizations l10n) {
    final benefits = [
      (Icons.book_outlined, l10n.subscriptionBenefit1),
      (Icons.auto_awesome_outlined, l10n.subscriptionBenefit2),
      (Icons.layers_outlined, l10n.subscriptionBenefit3),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.subscriptionBenefitsTitle,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        ...benefits.map((benefit) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Icon(
                    benefit.$1,
                    size: 24,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      benefit.$2,
                      style: const TextStyle(
                        fontSize: 15,
                      ),
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }

  Widget _buildManageSubscription(
    BuildContext context,
    SubscriptionViewModel viewModel,
    AppLocalizations l10n,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.subscriptionManageTitle,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        _ActionButton(
          icon: Icons.restore,
          title: l10n.subscriptionRestore,
          onTap: () async {
            final success = await viewModel.restorePurchases();
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    success
                        ? l10n.subscriptionRestoreSuccess
                        : l10n.subscriptionRestoreFailed,
                  ),
                ),
              );
            }
          },
        ),
        const SizedBox(height: 8),
        _ActionButton(
          icon: Icons.settings,
          title: l10n.subscriptionManageSubscription,
          subtitle: l10n.subscriptionManageSubtitle,
          onTap: () => viewModel.showCustomerCenter(context),
        ),
      ],
    );
  }
}

class _PricingButton extends StatelessWidget {
  final String title;
  final String price;
  final String period;
  final String? savings;
  final bool isPopular;
  final VoidCallback onTap;

  const _PricingButton({
    required this.title,
    required this.price,
    required this.period,
    this.savings,
    this.isPopular = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(
            color:
                isPopular ? Theme.of(context).primaryColor : Colors.grey[300]!,
          ),
          borderRadius: BorderRadius.circular(12),
          color: isPopular
              ? Theme.of(context).primaryColor.withValues(alpha: 0.1)
              : Colors.transparent,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                if (isPopular)
                  Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'POPULAR',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onPrimary,
                      ),
                    ),
                  ),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  price,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  period,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Theme.of(context).cardColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 24,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              size: 20,
              color: Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }
}
