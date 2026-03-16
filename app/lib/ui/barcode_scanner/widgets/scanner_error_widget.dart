import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class ScannerErrorWidget extends StatelessWidget {
  final MobileScannerException error;

  const ScannerErrorWidget({required this.error, super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    String message;
    IconData icon;

    switch (error.errorCode) {
      case MobileScannerErrorCode.permissionDenied:
        message = l10n.scannerErrorPermissionDenied;
        icon = Icons.no_photography_outlined;
        break;
      case MobileScannerErrorCode.controllerUninitialized:
        message = l10n.scannerErrorInitializing;
        icon = Icons.hourglass_empty;
        break;
      default:
        message = l10n.scannerErrorDefault;
        icon = Icons.error_outline;
    }

    return Container(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 64,
                color: Colors.white.withValues(alpha: 0.7),
              ),
              const SizedBox(height: 24),
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.9),
                  fontSize: 16,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 32),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text(
                  '닫기',
                  style: TextStyle(
                    color: BLabColors.primary,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
