import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:book_golas/data/services/third_party_ai_consent_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_card.dart';

enum ThirdPartyAiFeature {
  googleOcr,
  recall,
  reviewDraft,
  readingInsights,
  mindMap,
  recommendations,
  manageGoogleOcr,
  manageOpenAi,
}

extension ThirdPartyAiFeatureProvider on ThirdPartyAiFeature {
  ThirdPartyAiProvider get provider => switch (this) {
        ThirdPartyAiFeature.googleOcr ||
        ThirdPartyAiFeature.manageGoogleOcr =>
          ThirdPartyAiProvider.googleCloudVision,
        _ => ThirdPartyAiProvider.openAi,
      };
}

Future<bool> requestThirdPartyAiConsent({
  required BuildContext context,
  required ThirdPartyAiFeature feature,
  ThirdPartyAiConsentService? consentService,
}) async {
  final service = consentService ?? ThirdPartyAiConsentService();
  final initialState = await service.loadState(feature.provider);
  if (initialState == ThirdPartyAiConsentState.allowed) return true;
  if (!context.mounted) return false;
  final disclosure = _buildDisclosure(context, feature);

  return await showModalBottomSheet<bool>(
        context: context,
        backgroundColor: Colors.transparent,
        isScrollControlled: true,
        isDismissible: false,
        enableDrag: false,
        builder: (sheetContext) => _ThirdPartyAiConsentSheet(
          feature: feature,
          disclosure: disclosure,
          consentService: service,
          statusUnavailable:
              initialState == ThirdPartyAiConsentState.unavailable,
        ),
      ) ??
      false;
}

Future<void> showThirdPartyAiConsentDetails({
  required BuildContext context,
  required ThirdPartyAiProvider provider,
}) async {
  final feature = provider == ThirdPartyAiProvider.googleCloudVision
      ? ThirdPartyAiFeature.manageGoogleOcr
      : ThirdPartyAiFeature.manageOpenAi;
  final disclosure = _buildDisclosure(context, feature);
  await showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    builder: (sheetContext) => _ThirdPartyAiConsentSheet(
      feature: feature,
      disclosure: disclosure,
      consentService: ThirdPartyAiConsentService(),
      detailsOnly: true,
    ),
  );
}

ThirdPartyAiDisclosure _buildDisclosure(
  BuildContext context,
  ThirdPartyAiFeature feature,
) {
  final l10n = AppLocalizations.of(context);
  final provider = feature.provider;
  final title = provider == ThirdPartyAiProvider.googleCloudVision
      ? l10n.thirdPartyAiGoogleConsentTitle
      : l10n.thirdPartyAiOpenAiConsentTitle;
  final description = provider == ThirdPartyAiProvider.googleCloudVision
      ? l10n.thirdPartyAiGoogleConsentDescription
      : l10n.thirdPartyAiOpenAiConsentDescription;
  final featureContext = switch (feature) {
    ThirdPartyAiFeature.googleOcr => l10n.thirdPartyAiContextGoogleOcr,
    ThirdPartyAiFeature.recall => l10n.thirdPartyAiContextRecall,
    ThirdPartyAiFeature.reviewDraft => l10n.thirdPartyAiContextReviewDraft,
    ThirdPartyAiFeature.readingInsights =>
      l10n.thirdPartyAiContextReadingInsights,
    ThirdPartyAiFeature.mindMap => l10n.thirdPartyAiContextMindMap,
    ThirdPartyAiFeature.recommendations =>
      l10n.thirdPartyAiContextRecommendations,
    ThirdPartyAiFeature.manageGoogleOcr => l10n.thirdPartyAiContextManageGoogle,
    ThirdPartyAiFeature.manageOpenAi => l10n.thirdPartyAiContextManageOpenAi,
  };
  final featureData = switch (feature) {
    ThirdPartyAiFeature.googleOcr ||
    ThirdPartyAiFeature.manageGoogleOcr =>
      l10n.thirdPartyAiDataGoogleOcr,
    ThirdPartyAiFeature.recall => l10n.thirdPartyAiDataRecall,
    ThirdPartyAiFeature.reviewDraft => l10n.thirdPartyAiDataReviewDraft,
    ThirdPartyAiFeature.readingInsights => l10n.thirdPartyAiDataReadingInsights,
    ThirdPartyAiFeature.mindMap => l10n.thirdPartyAiDataMindMap,
    ThirdPartyAiFeature.recommendations => l10n.thirdPartyAiDataRecommendations,
    ThirdPartyAiFeature.manageOpenAi => l10n.thirdPartyAiDataManageOpenAi,
  };
  final additionalBehavior = provider == ThirdPartyAiProvider.googleCloudVision
      ? l10n.thirdPartyAiAdditionalGoogle
      : l10n.thirdPartyAiAdditionalOpenAi;

  return ThirdPartyAiDisclosure(
    locale: Localizations.localeOf(context).toLanguageTag(),
    title: title,
    description: description,
    featureContext: featureContext,
    featureData: featureData,
    additionalBehavior: additionalBehavior,
    dataDescription: provider == ThirdPartyAiProvider.googleCloudVision
        ? l10n.thirdPartyAiGoogleDataDescription
        : l10n.thirdPartyAiOpenAiDataDescription,
    optionalNotice: provider == ThirdPartyAiProvider.googleCloudVision
        ? l10n.thirdPartyAiGoogleOptionalNotice
        : l10n.thirdPartyAiOpenAiOptionalNotice,
  );
}

class _ThirdPartyAiConsentSheet extends StatefulWidget {
  final ThirdPartyAiFeature feature;
  final ThirdPartyAiDisclosure disclosure;
  final ThirdPartyAiConsentService consentService;
  final bool detailsOnly;
  final bool statusUnavailable;

  const _ThirdPartyAiConsentSheet({
    required this.feature,
    required this.disclosure,
    required this.consentService,
    this.detailsOnly = false,
    this.statusUnavailable = false,
  });

  @override
  State<_ThirdPartyAiConsentSheet> createState() =>
      _ThirdPartyAiConsentSheetState();
}

class _ThirdPartyAiConsentSheetState extends State<_ThirdPartyAiConsentSheet> {
  late bool _detailsExpanded = widget.detailsOnly;
  bool _isSaving = false;
  bool _saveFailed = false;

  Future<void> _grant() async {
    if (_isSaving) return;
    setState(() {
      _isSaving = true;
      _saveFailed = false;
    });
    final granted = await widget.consentService.grant(
      widget.feature.provider,
      disclosure: widget.disclosure,
    );
    if (!mounted) return;
    if (granted) {
      Navigator.pop(context, true);
      return;
    }
    setState(() {
      _isSaving = false;
      _saveFailed = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final height = MediaQuery.sizeOf(context).height * 0.9;
    final surfaceColor = BLabColors.surface(context);
    final textColor = BLabColors.textPrimary(context);
    final secondaryTextColor = BLabColors.textSecondary(context);
    final provider = widget.feature.provider;
    final recipient = provider == ThirdPartyAiProvider.googleCloudVision
        ? l10n.thirdPartyAiRecipientGoogle
        : l10n.thirdPartyAiRecipientOpenAi;

    return PopScope(
      canPop: false,
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: height,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
            ),
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    key: const Key('thirdPartyAiConsentContent'),
                    padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Container(
                            width: 40,
                            height: 4,
                            margin: const EdgeInsets.only(bottom: 24),
                            decoration: BoxDecoration(
                              color: BLabColors.grey(300, context),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                        Semantics(
                          header: true,
                          child: Text(
                            widget.disclosure.title,
                            style: AppTypography.headline6.copyWith(
                              color: textColor,
                              height: 1.25,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          widget.disclosure.description,
                          style: AppTypography.bodyMedium.copyWith(
                            color: secondaryTextColor,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 20),
                        BLabCard(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _SummaryItem(
                                icon: Icons.play_circle_outline_rounded,
                                label: l10n.thirdPartyAiSectionAction,
                                value: widget.disclosure.featureContext,
                              ),
                              const SizedBox(height: 16),
                              _SummaryItem(
                                icon: Icons.description_outlined,
                                label: l10n.thirdPartyAiSectionData,
                                value: widget.disclosure.featureData,
                              ),
                              const SizedBox(height: 16),
                              _SummaryItem(
                                icon: Icons.public_rounded,
                                label: l10n.thirdPartyAiSectionRecipient,
                                value: recipient,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        _NoticeRow(
                          icon: Icons.lock_outline_rounded,
                          text: l10n.thirdPartyAiNothingSent,
                        ),
                        const SizedBox(height: 10),
                        _NoticeRow(
                          icon: Icons.info_outline_rounded,
                          text: widget.disclosure.additionalBehavior,
                        ),
                        if (widget.statusUnavailable) ...[
                          const SizedBox(height: 10),
                          _StatusMessage(
                            message: l10n.thirdPartyAiStatusUnavailable,
                            isError: true,
                          ),
                        ],
                        const SizedBox(height: 18),
                        Semantics(
                          button: true,
                          expanded: _detailsExpanded,
                          child: BLabCard(
                            padding: EdgeInsets.zero,
                            onTap: () => setState(() {
                              _detailsExpanded = !_detailsExpanded;
                            }),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      _detailsExpanded
                                          ? l10n.thirdPartyAiHideDetails
                                          : l10n.thirdPartyAiShowDetails,
                                      style: AppTypography.labelLarge.copyWith(
                                        color: textColor,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    _detailsExpanded
                                        ? Icons.expand_less_rounded
                                        : Icons.expand_more_rounded,
                                    color: textColor,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        if (_detailsExpanded) ...[
                          const SizedBox(height: 16),
                          _DisclosureDetails(
                            provider: provider,
                            dataDescription: widget.disclosure.dataDescription,
                            optionalNotice: widget.disclosure.optionalNotice,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                _buildFooter(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final agreeText =
        widget.feature.provider == ThirdPartyAiProvider.googleCloudVision
            ? l10n.thirdPartyAiAgreeGoogle
            : l10n.thirdPartyAiAgreeOpenAi;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: BLabColors.surface(context),
        border: Border(
          top: BorderSide(
            color: BLabColors.grey(200, context),
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 14, 24, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_isSaving)
                _StatusMessage(
                  message: l10n.thirdPartyAiSaving,
                  showProgress: true,
                ),
              if (_saveFailed)
                _StatusMessage(
                  message: l10n.thirdPartyAiSaveFailed,
                  isError: true,
                ),
              if (_isSaving || _saveFailed) const SizedBox(height: 12),
              if (widget.detailsOnly)
                _ActionButton(
                  text: l10n.thirdPartyAiClose,
                  variant: BLabButtonVariant.secondary,
                  onPressed: () => Navigator.pop(context),
                )
              else ...[
                _ActionButton(
                  text: l10n.thirdPartyAiDecline,
                  variant: BLabButtonVariant.secondary,
                  onPressed:
                      _isSaving ? null : () => Navigator.pop(context, false),
                ),
                const SizedBox(height: 10),
                _ActionButton(
                  text: _saveFailed ? l10n.thirdPartyAiRetry : agreeText,
                  onPressed: _isSaving ? null : _grant,
                  textColor: BLabColors.textPrimaryLight,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _SummaryItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: BLabColors.textSecondary(context)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AppTypography.labelMedium.copyWith(
                  color: BLabColors.textTertiary(context),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                value,
                style: AppTypography.bodyMedium.copyWith(
                  color: BLabColors.textPrimary(context),
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _NoticeRow extends StatelessWidget {
  final IconData icon;
  final String text;

  const _NoticeRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: BLabColors.textSecondary(context)),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: AppTypography.bodySmall.copyWith(
              color: BLabColors.textSecondary(context),
              height: 1.45,
            ),
          ),
        ),
      ],
    );
  }
}

class _DisclosureDetails extends StatelessWidget {
  final ThirdPartyAiProvider provider;
  final String dataDescription;
  final String optionalNotice;

  const _DisclosureDetails({
    required this.provider,
    required this.dataDescription,
    required this.optionalNotice,
  });

  @override
  Widget build(BuildContext context) {
    final details = dataDescription
        .split('\n')
        .where((line) => line.trim().isNotEmpty)
        .map(_DisclosureDetail.fromLine)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...details.map(
          (detail) => Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Semantics(
              container: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(
                    header: true,
                    child: Text(
                      detail.label,
                      style: AppTypography.labelLarge.copyWith(
                        color: BLabColors.textPrimary(context),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  SelectableText(
                    detail.value,
                    style: AppTypography.bodySmall.copyWith(
                      color: BLabColors.textSecondary(context),
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        _ProviderLinks(provider: provider),
        const SizedBox(height: 14),
        Text(
          optionalNotice,
          style: AppTypography.bodySmall.copyWith(
            color: BLabColors.textSecondary(context),
            height: 1.5,
          ),
        ),
      ],
    );
  }
}

class _DisclosureDetail {
  final String label;
  final String value;

  const _DisclosureDetail({required this.label, required this.value});

  factory _DisclosureDetail.fromLine(String line) {
    final separator = line.indexOf(':');
    if (separator <= 0) {
      return _DisclosureDetail(label: line, value: line);
    }
    return _DisclosureDetail(
      label: line.substring(0, separator).trim(),
      value: line.substring(separator + 1).trim(),
    );
  }
}

class _ProviderLinks extends StatelessWidget {
  final ThirdPartyAiProvider provider;

  const _ProviderLinks({required this.provider});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final links = provider == ThirdPartyAiProvider.googleCloudVision
        ? [
            (
              l10n.thirdPartyAiGooglePrivacyLink,
              Uri.parse('https://cloud.google.com/privacy'),
            ),
          ]
        : [
            (
              l10n.thirdPartyAiOpenAiSubprocessorsLink,
              Uri.parse('https://openai.com/policies/sub-processor-list/'),
            ),
            (
              l10n.thirdPartyAiOpenAiPrivacyContact,
              Uri.parse('mailto:privacy@openai.com'),
            ),
          ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: links
          .map(
            (link) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Semantics(
                key: Key('thirdPartyAiExternalLink-${link.$2}'),
                link: true,
                label: link.$1,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 44),
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => launchUrl(
                      link.$2,
                      mode: LaunchMode.externalApplication,
                    ),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        link.$1,
                        style: AppTypography.labelLarge.copyWith(
                          color: BLabColors.textPrimary(context),
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _StatusMessage extends StatelessWidget {
  final String message;
  final bool isError;
  final bool showProgress;

  const _StatusMessage({
    required this.message,
    this.isError = false,
    this.showProgress = false,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (showProgress)
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Icon(
              isError
                  ? Icons.error_outline_rounded
                  : Icons.info_outline_rounded,
              size: 18,
              color: isError
                  ? BLabColors.error
                  : BLabColors.textSecondary(context),
            ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: AppTypography.bodySmall.copyWith(
                color: isError
                    ? BLabColors.error
                    : BLabColors.textSecondary(context),
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final BLabButtonVariant variant;
  final Color? textColor;

  const _ActionButton({
    required this.text,
    required this.onPressed,
    this.variant = BLabButtonVariant.primary,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: text,
      child: BLabButton(
        text: text,
        variant: variant,
        isFullWidth: true,
        onPressed: onPressed,
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: AppTypography.buttonMedium.copyWith(
            color: textColor ?? BLabColors.textPrimary(context),
            height: 1.25,
          ),
        ),
      ),
    );
  }
}
