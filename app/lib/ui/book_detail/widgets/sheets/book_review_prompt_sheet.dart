import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';

Future<bool> showBookReviewPromptSheet({
  required BuildContext context,
  required String bookTitle,
}) async {
  final result = await showModalBottomSheet<bool>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    isDismissible: true,
    enableDrag: true,
    builder: (sheetContext) {
      final mediaQuery = MediaQuery.of(sheetContext);
      final keyboardInset = mediaQuery.viewInsets.bottom;
      final maxHeight =
          (mediaQuery.size.height - keyboardInset - mediaQuery.padding.top)
              .clamp(0.0, mediaQuery.size.height)
              .toDouble();

      return AnimatedPadding(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.only(bottom: keyboardInset),
        child: Container(
          constraints: BoxConstraints(maxHeight: maxHeight),
          decoration: BoxDecoration(
            color: BLabColors.surface(sheetContext),
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(24),
            ),
          ),
          child: SafeArea(
            top: false,
            child: _BookReviewPromptContent(bookTitle: bookTitle),
          ),
        ),
      );
    },
  );

  return result ?? false;
}

class _BookReviewPromptContent extends StatelessWidget {
  final String bookTitle;

  const _BookReviewPromptContent({required this.bookTitle});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final isLargeText = MediaQuery.textScalerOf(context).scale(1) >= 1.5;

    return SingleChildScrollView(
      key: const ValueKey('book-review-prompt-scroll'),
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ExcludeSemantics(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: BLabColors.grey(400, context),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const ExcludeSemantics(
            child: Text('🎉', style: TextStyle(fontSize: 48)),
          ),
          const SizedBox(height: 12),
          Semantics(
            header: true,
            child: Text(
              l10n.bookDetailCompletionCongrats,
              textAlign: TextAlign.center,
              style: textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: BLabColors.textPrimary(context),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            bookTitle,
            textAlign: TextAlign.center,
            style: textTheme.titleMedium?.copyWith(
              color: BLabColors.textSecondary(context),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            l10n.bookDetailCompletionPrompt,
            textAlign: TextAlign.center,
            style: textTheme.bodyLarge?.copyWith(
              color: BLabColors.textSecondary(context),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          if (isLargeText)
            Column(
              children: [
                BLabButton(
                  key: const ValueKey('book-review-prompt-write'),
                  text: l10n.bookDetailWriteReview,
                  onPressed: () => Navigator.pop(context, true),
                  isFullWidth: true,
                ),
                const SizedBox(height: 8),
                BLabButton(
                  key: const ValueKey('book-review-prompt-later'),
                  text: l10n.bookDetailLater,
                  onPressed: () => Navigator.pop(context, false),
                  variant: BLabButtonVariant.secondary,
                  isFullWidth: true,
                ),
              ],
            )
          else
            Row(
              children: [
                Expanded(
                  child: BLabButton(
                    key: const ValueKey('book-review-prompt-later'),
                    text: l10n.bookDetailLater,
                    onPressed: () => Navigator.pop(context, false),
                    variant: BLabButtonVariant.secondary,
                    isFullWidth: true,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: BLabButton(
                    key: const ValueKey('book-review-prompt-write'),
                    text: l10n.bookDetailWriteReview,
                    onPressed: () => Navigator.pop(context, true),
                    isFullWidth: true,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
