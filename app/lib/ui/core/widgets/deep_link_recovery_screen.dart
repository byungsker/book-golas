import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';

class DeepLinkRecoveryScreen extends StatelessWidget {
  const DeepLinkRecoveryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.deepLinkBookUnavailableTitle),
        automaticallyImplyLeading: true,
      ),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.menu_book_outlined,
                  size: 64,
                  color: isDark
                      ? BLabColors.grey(400, context)
                      : BLabColors.grey(600, context),
                ),
                const SizedBox(height: 20),
                Text(
                  l10n.deepLinkBookUnavailableDescription,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    height: 1.5,
                    color: isDark
                        ? BLabColors.grey(300, context)
                        : BLabColors.grey(700, context),
                  ),
                ),
                const SizedBox(height: 28),
                BLabButton(
                  text: l10n.deepLinkBookUnavailableAction,
                  icon: Icons.home_outlined,
                  isFullWidth: true,
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
