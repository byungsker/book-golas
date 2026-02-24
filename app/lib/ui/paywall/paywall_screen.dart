import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/subscription/view_model/subscription_view_model.dart';

/// Paywall screen for subscription purchase.
///
/// Displays Pro benefits, pricing options, and handles purchase/restore flows.
class PaywallScreen extends StatefulWidget {
  final VoidCallback? onClose;
  final VoidCallback? onPurchaseComplete;

  const PaywallScreen({super.key, this.onClose, this.onPurchaseComplete});

  @override
  State<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends State<PaywallScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadOfferings();
    });
  }

  Future<void> _loadOfferings() async {
    final viewModel = context.read<SubscriptionViewModel>();
    await viewModel.loadOfferings();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final viewModel = context.watch<SubscriptionViewModel>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark
          ? const Color(0xFF1A1B2E).withOpacity(0.95)
          : Colors.white.withOpacity(0.95),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context, l10n),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildTitle(l10n),
                    const SizedBox(height: 8),
                    _buildSubtitle(l10n),
                    const SizedBox(height: 32),
                    _buildBenefits(l10n),
                    const SizedBox(height: 32),
                    _buildPricingSection(viewModel, l10n),
                    const SizedBox(height: 24),
                    _buildRestoreButton(viewModel, l10n),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, AppLocalizations l10n) {
    return Padding(
      padding: const EdgeInsets.only(top: 16, right: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          IconButton(
            onPressed: widget.onClose ?? () => Navigator.of(context).pop(),
            icon: Icon(Icons.close, color: Theme.of(context).iconTheme.color),
          ),
        ],
      ),
    );
  }

  Widget _buildTitle(AppLocalizations l10n) {
    return Text(
      l10n.paywallTitle,
      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildSubtitle(AppLocalizations l10n) {
    return Text(
      l10n.paywallSubtitle,
      style: TextStyle(fontSize: 14, color: Colors.grey[600]),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildBenefits(AppLocalizations l10n) {
    final benefits = [
      (Icons.book_outlined, l10n.paywallBenefit1),
      (Icons.auto_awesome_outlined, l10n.paywallBenefit2),
      (Icons.layers_outlined, l10n.paywallBenefit3),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: benefits.map((benefit) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(
            children: [
              Icon(benefit.$1, size: 24, color: Theme.of(context).primaryColor),
              const SizedBox(width: 16),
              Expanded(
                child: Text(benefit.$2, style: const TextStyle(fontSize: 16)),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPricingSection(
    SubscriptionViewModel viewModel,
    AppLocalizations l10n,
  ) {
    if (viewModel.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildMonthlyOption(l10n),
        const SizedBox(height: 12),
        _buildYearlyOption(l10n),
      ],
    );
  }

  Widget _buildMonthlyOption(AppLocalizations l10n) {
    return _PricingCard(
      title: l10n.paywallMonthly,
      price: l10n.paywallMonthlyPrice,
      period: l10n.paywallPerMonth,
      isPopular: true,
      onTap: () => _purchase('monthly'),
    );
  }

  Widget _buildYearlyOption(AppLocalizations l10n) {
    return _PricingCard(
      title: l10n.paywallYearly,
      price: l10n.paywallYearlyPrice,
      period: l10n.paywallPerYear,
      savings: l10n.paywallYearlySavings,
      onTap: () => _purchase('yearly'),
    );
  }

  Future<void> _purchase(String packageId) async {
    final viewModel = context.read<SubscriptionViewModel>();
    await viewModel.showPaywall(context);
    widget.onPurchaseComplete?.call();
  }

  Widget _buildRestoreButton(
    SubscriptionViewModel viewModel,
    AppLocalizations l10n,
  ) {
    return TextButton(
      onPressed: viewModel.isLoading
          ? null
          : () async {
              final success = await viewModel.restorePurchases();
              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(l10n.paywallRestoreSuccess)),
                );
              }
            },
      child: Text(
        l10n.paywallRestore,
        style: TextStyle(fontSize: 14, color: Theme.of(context).primaryColor),
      ),
    );
  }
}

class _PricingCard extends StatelessWidget {
  final String title;
  final String price;
  final String period;
  final String? savings;
  final bool isPopular;
  final VoidCallback onTap;

  const _PricingCard({
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
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(
            color: isPopular
                ? Theme.of(context).primaryColor
                : Colors.grey[300]!,
          ),
          borderRadius: BorderRadius.circular(16),
          color: isPopular
              ? Theme.of(context).primaryColor.withOpacity(0.1)
              : Colors.transparent,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (isPopular)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      borderRadius: BorderRadius.circular(8),
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
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  price,
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  period,
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),
              ],
            ),
            if (savings != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  savings!,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.green[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
