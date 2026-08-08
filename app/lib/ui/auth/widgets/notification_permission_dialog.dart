import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';

class NotificationPermissionDialog extends StatelessWidget {
  const NotificationPermissionDialog({
    super.key,
    required this.onCancel,
    required this.onOpenSettings,
  });

  final VoidCallback onCancel;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AlertDialog(
      backgroundColor: isDark ? BLabColors.surfaceDark : Colors.white,
      title: Text(localizations.myPageNotificationPermissionTitle),
      content: Text(localizations.myPageNotificationPermissionDenied),
      actions: [
        BLabButton(
          text: localizations.commonCancel,
          variant: BLabButtonVariant.secondary,
          onPressed: onCancel,
        ),
        BLabButton(
          text: localizations.myPageOpenSettings,
          onPressed: onOpenSettings,
        ),
      ],
    );
  }
}

class NotificationPermissionFailureDialog extends StatelessWidget {
  const NotificationPermissionFailureDialog({
    super.key,
    required this.onClose,
  });

  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AlertDialog(
      backgroundColor: isDark ? BLabColors.surfaceDark : Colors.white,
      title: Text(localizations.myPageNotificationSettingsFailed),
      content: Text(
        localizations.myPageNotificationPermissionRequestFailed,
      ),
      actions: [
        BLabButton(
          text: localizations.commonConfirm,
          onPressed: onClose,
        ),
      ],
    );
  }
}
