import 'package:flutter/material.dart';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/data/services/auth_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/main.dart';
import 'package:book_golas/ui/auth/widgets/login_screen.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_text_field.dart';

class PasswordRecoveryScreen extends StatefulWidget {
  const PasswordRecoveryScreen({super.key});

  @override
  State<PasswordRecoveryScreen> createState() => _PasswordRecoveryScreenState();
}

class _PasswordRecoveryScreenState extends State<PasswordRecoveryScreen> {
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final newPw = _newController.text;
    final confirmPw = _confirmController.text;

    if (newPw.length < 6) {
      CustomSnackbar.show(
        context,
        message: l10n.myPagePasswordTooShort,
        type: BLabSnackbarType.error,
        bottomOffset: 32,
      );
      return;
    }

    if (newPw != confirmPw) {
      CustomSnackbar.show(
        context,
        message: l10n.myPagePasswordMismatch,
        type: BLabSnackbarType.error,
        bottomOffset: 32,
      );
      return;
    }

    setState(() => _isLoading = true);

    final error = await AuthService().updatePassword(newPw);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (error == null) {
      CustomSnackbar.show(
        context,
        message: l10n.passwordRecoverySuccess,
        type: BLabSnackbarType.success,
        bottomOffset: 32,
      );
      await Supabase.instance.client.auth.signOut();
      navigatorKey.currentState?.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    } else {
      final message = error.contains('same as') || error.contains('different')
          ? l10n.myPagePasswordSameAsOld
          : l10n.passwordRecoveryFailed;
      CustomSnackbar.show(
        context,
        message: message,
        type: BLabSnackbarType.error,
        bottomOffset: 32,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.passwordRecoveryTitle),
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              Text(
                l10n.passwordRecoveryDescription,
                style: TextStyle(
                  fontSize: 16,
                  color: isDark ? Colors.grey[300] : Colors.grey[700],
                ),
              ),
              const SizedBox(height: 32),
              BLabTextField(
                controller: _newController,
                hintText: l10n.passwordRecoveryNewPassword,
                obscureText: _obscureNew,
                suffixIcon: IntrinsicWidth(
                  child: Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          _obscureNew
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                          size: 20,
                        ),
                        onPressed: () =>
                            setState(() => _obscureNew = !_obscureNew),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              BLabTextField(
                controller: _confirmController,
                hintText: l10n.passwordRecoveryConfirmPassword,
                obscureText: _obscureConfirm,
                suffixIcon: IntrinsicWidth(
                  child: Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          _obscureConfirm
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                          size: 20,
                        ),
                        onPressed: () =>
                            setState(() => _obscureConfirm = !_obscureConfirm),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              BLabButton(
                text: _isLoading ? '' : l10n.passwordRecoveryButton,
                variant: BLabButtonVariant.primary,
                onPressed: _isLoading ? null : _submit,
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
