import 'package:flutter/material.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';

Future<bool> requestThirdPartyAiConsent({
  required BuildContext context,
  required ThirdPartyAiProvider provider,
  ThirdPartyAiConsentService? consentService,
}) async {
  final service = consentService ?? ThirdPartyAiConsentService();
  if (await service.hasConsent(provider)) return true;
  if (!context.mounted) return false;
  final l10n = AppLocalizations.of(context);
  final disclosure = ThirdPartyAiDisclosure(
    locale: Localizations.localeOf(context).toLanguageTag(),
    title: switch (provider) {
      ThirdPartyAiProvider.googleCloudVision =>
        l10n.thirdPartyAiGoogleConsentTitle,
      ThirdPartyAiProvider.openAi => l10n.thirdPartyAiOpenAiConsentTitle,
    },
    description: switch (provider) {
      ThirdPartyAiProvider.googleCloudVision =>
        l10n.thirdPartyAiGoogleConsentDescription,
      ThirdPartyAiProvider.openAi => l10n.thirdPartyAiOpenAiConsentDescription,
    },
    dataDescription: switch (provider) {
      ThirdPartyAiProvider.googleCloudVision =>
        l10n.thirdPartyAiGoogleDataDescription,
      ThirdPartyAiProvider.openAi => l10n.thirdPartyAiOpenAiDataDescription,
    },
    optionalNotice: switch (provider) {
      ThirdPartyAiProvider.googleCloudVision =>
        l10n.thirdPartyAiGoogleOptionalNotice,
      ThirdPartyAiProvider.openAi => l10n.thirdPartyAiOpenAiOptionalNotice,
    },
  );

  final granted = await showModalBottomSheet<bool>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (sheetContext) => _ThirdPartyAiConsentSheet(provider: provider),
  );

  if (granted != true) return false;
  return await service.grant(provider, disclosure: disclosure);
}

class _ThirdPartyAiConsentSheet extends StatelessWidget {
  final ThirdPartyAiProvider provider;

  const _ThirdPartyAiConsentSheet({required this.provider});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final title = switch (provider) {
      ThirdPartyAiProvider.googleCloudVision =>
        l10n.thirdPartyAiGoogleConsentTitle,
      ThirdPartyAiProvider.openAi => l10n.thirdPartyAiOpenAiConsentTitle,
    };
    final description = switch (provider) {
      ThirdPartyAiProvider.googleCloudVision =>
        l10n.thirdPartyAiGoogleConsentDescription,
      ThirdPartyAiProvider.openAi => l10n.thirdPartyAiOpenAiConsentDescription,
    };
    final dataDescription = switch (provider) {
      ThirdPartyAiProvider.googleCloudVision =>
        l10n.thirdPartyAiGoogleDataDescription,
      ThirdPartyAiProvider.openAi => l10n.thirdPartyAiOpenAiDataDescription,
    };
    final optionalNotice = switch (provider) {
      ThirdPartyAiProvider.googleCloudVision =>
        l10n.thirdPartyAiGoogleOptionalNotice,
      ThirdPartyAiProvider.openAi => l10n.thirdPartyAiOpenAiOptionalNotice,
    };
    final useStackedActions = MediaQuery.textScalerOf(context).scale(1) > 1.3;

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        child: Container(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
          decoration: BoxDecoration(
            color: isDark ? BLabColors.surfaceDark : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey[700] : Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Semantics(
                header: true,
                child: Text(
                  title,
                  style: TextStyle(
                    color: isDark ? Colors.white : Colors.black,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                description,
                style: TextStyle(
                  color: isDark ? Colors.grey[300] : Colors.grey[700],
                  fontSize: 15,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: BLabColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  dataDescription,
                  style: TextStyle(
                    color: isDark ? Colors.grey[200] : Colors.grey[800],
                    fontSize: 14,
                    height: 1.45,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                optionalNotice,
                style: TextStyle(
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              if (useStackedActions) ...[
                BLabButton(
                  text: l10n.thirdPartyAiAllow,
                  isFullWidth: true,
                  onPressed: () => Navigator.pop(context, true),
                ),
                const SizedBox(height: 12),
                BLabButton(
                  text: l10n.thirdPartyAiNotNow,
                  variant: BLabButtonVariant.secondary,
                  isFullWidth: true,
                  onPressed: () => Navigator.pop(context, false),
                ),
              ] else
                Row(
                  children: [
                    Expanded(
                      child: BLabButton(
                        text: l10n.thirdPartyAiNotNow,
                        variant: BLabButtonVariant.secondary,
                        isFullWidth: true,
                        onPressed: () => Navigator.pop(context, false),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: BLabButton(
                        text: l10n.thirdPartyAiAllow,
                        isFullWidth: true,
                        onPressed: () => Navigator.pop(context, true),
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
