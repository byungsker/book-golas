import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/ui/core/view_model/auth_view_model.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/keyboard_accessory_bar.dart';

enum AuthMode { signIn, signUp, forgotPassword }

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nicknameController = TextEditingController();
  final _emailFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  final _nicknameFocusNode = FocusNode();
  final _emailFieldKey = GlobalKey();
  final _passwordFieldKey = GlobalKey();
  final _nicknameFieldKey = GlobalKey();

  AuthMode _authMode = AuthMode.signIn;
  bool _isLoading = false;
  bool _saveEmail = false;
  bool _obscurePassword = true;
  bool _isKeyboardVisible = false;
  String? _unconfirmedEmail;
  bool _isResendCooldown = false;
  Timer? _resendCooldownTimer;
  bool _emailHasText = false;
  bool _passwordHasText = false;
  bool _nicknameHasText = false;

  @override
  void initState() {
    super.initState();
    _loadSavedEmail();
    _emailFocusNode.addListener(() => _onFocusChange(_emailFieldKey));
    _passwordFocusNode.addListener(() => _onFocusChange(_passwordFieldKey));
    _nicknameFocusNode.addListener(() => _onFocusChange(_nicknameFieldKey));
    _emailController.addListener(_onTextChanged);
    _passwordController.addListener(_onTextChanged);
    _nicknameController.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    final emailHas = _emailController.text.isNotEmpty;
    final passwordHas = _passwordController.text.isNotEmpty;
    final nicknameHas = _nicknameController.text.isNotEmpty;
    if (_emailHasText != emailHas ||
        _passwordHasText != passwordHas ||
        _nicknameHasText != nicknameHas) {
      setState(() {
        _emailHasText = emailHas;
        _passwordHasText = passwordHas;
        _nicknameHasText = nicknameHas;
      });
    }
  }

  void _onFocusChange(GlobalKey fieldKey) {
    final hasFocus = _emailFocusNode.hasFocus ||
        _passwordFocusNode.hasFocus ||
        _nicknameFocusNode.hasFocus;
    if (_isKeyboardVisible != hasFocus) {
      setState(() => _isKeyboardVisible = hasFocus);
    }
    if (hasFocus) {
      _scrollToField(fieldKey);
    }
  }

  void _scrollToField(GlobalKey fieldKey) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final context = fieldKey.currentContext;
      if (context != null) {
        Scrollable.ensureVisible(
          context,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          alignment: 0.3,
        );
      }
    });
  }

  Future<void> _loadSavedEmail() async {
    final prefs = await SharedPreferences.getInstance();
    final savedEmail = prefs.getString('saved_email');
    final shouldSave = prefs.getBool('save_email') ?? false;
    if (savedEmail != null && shouldSave) {
      setState(() {
        _emailController.text = savedEmail;
        _saveEmail = true;
      });
    }
  }

  Future<void> _saveEmailPreference() async {
    final prefs = await SharedPreferences.getInstance();
    if (_saveEmail) {
      await prefs.setString('saved_email', _emailController.text.trim());
      await prefs.setBool('save_email', true);
    } else {
      await prefs.remove('saved_email');
      await prefs.setBool('save_email', false);
    }
  }

  void _dismissKeyboard() {
    _emailFocusNode.unfocus();
    _passwordFocusNode.unfocus();
    _nicknameFocusNode.unfocus();
  }

  void _focusNextField() {
    if (_emailFocusNode.hasFocus) {
      _passwordFocusNode.requestFocus();
    } else if (_passwordFocusNode.hasFocus) {
      if (_authMode == AuthMode.signUp) {
        _nicknameFocusNode.requestFocus();
      } else {
        _dismissKeyboard();
      }
    } else if (_nicknameFocusNode.hasFocus) {
      _dismissKeyboard();
    }
  }

  void _focusPreviousField() {
    if (_nicknameFocusNode.hasFocus) {
      _passwordFocusNode.requestFocus();
    } else if (_passwordFocusNode.hasFocus) {
      _emailFocusNode.requestFocus();
    }
  }

  @override
  void dispose() {
    _resendCooldownTimer?.cancel();
    _emailController.dispose();
    _passwordController.dispose();
    _nicknameController.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    _nicknameFocusNode.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final supabase = Supabase.instance.client;
      final email = _emailController.text.trim();
      final password = _passwordController.text;

      switch (_authMode) {
        case AuthMode.signIn:
          await _saveEmailPreference();
          await supabase.auth.signInWithPassword(
            email: email,
            password: password,
          );
          break;

        case AuthMode.signUp:
          final nickname = _nicknameController.text.trim();
          final authViewModel = context.read<AuthViewModel>();
          final error = await authViewModel.signUpWithEmail(
            email: email,
            password: password,
            name: nickname,
          );
          if (error != null) {
            if (mounted) {
              final l10n = AppLocalizations.of(context);
              CustomSnackbar.show(
                context,
                message: _getAuthErrorMessage(error, l10n),
                type: BLabSnackbarType.error,
                bottomOffset: 32,
                aboveKeyboard: true,
              );
            }
            return;
          }
          if (mounted) {
            final l10n = AppLocalizations.of(context);
            final signedUpEmail = email;
            _setAuthMode(AuthMode.signIn);
            setState(() {
              _unconfirmedEmail = signedUpEmail;
            });
            CustomSnackbar.show(
              context,
              message: l10n.loginSignupSuccess,
              type: BLabSnackbarType.success,
              bottomOffset: 32,
              aboveKeyboard: true,
            );
          }
          break;

        case AuthMode.forgotPassword:
          await supabase.auth.resetPasswordForEmail(email);
          if (mounted) {
            final l10n = AppLocalizations.of(context);
            CustomSnackbar.show(
              context,
              message: l10n.loginResetPasswordSuccess,
              type: BLabSnackbarType.success,
              bottomOffset: 32,
              aboveKeyboard: true,
            );
            _setAuthMode(AuthMode.signIn);
          }
          break;
      }
    } on AuthException catch (e) {
      if (mounted) {
        if (e.message.contains('Email not confirmed')) {
          setState(() {
            _unconfirmedEmail = _emailController.text.trim();
          });
        }
        final l10n = AppLocalizations.of(context);
        CustomSnackbar.show(
          context,
          message: _getAuthErrorMessage(e.message, l10n),
          type: BLabSnackbarType.error,
          bottomOffset: 32,
          aboveKeyboard: true,
        );
      }
    } catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        CustomSnackbar.show(
          context,
          message: l10n.loginUnexpectedError,
          type: BLabSnackbarType.error,
          bottomOffset: 32,
          aboveKeyboard: true,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _getAuthErrorMessage(String message, AppLocalizations l10n) {
    if (message.contains('Invalid login credentials')) {
      return l10n.loginErrorInvalidCredentials;
    } else if (message.contains('Email not confirmed')) {
      return l10n.loginErrorEmailNotConfirmed;
    } else if (message.contains('User already registered')) {
      return l10n.loginErrorEmailAlreadyRegistered;
    } else if (message.contains('Password should be at least')) {
      return l10n.loginErrorPasswordTooShort;
    } else if (message.contains('Email address') &&
        message.contains('invalid')) {
      return l10n.loginErrorEmailInvalid;
    }
    return message;
  }

  Future<void> _handleResendVerification() async {
    if (_unconfirmedEmail == null || _isResendCooldown) return;

    final supabase = Supabase.instance.client;
    try {
      await supabase.auth.resend(
        type: OtpType.signup,
        email: _unconfirmedEmail!,
      );
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        CustomSnackbar.show(
          context,
          message: l10n.loginResendVerificationSuccess,
          type: BLabSnackbarType.success,
          bottomOffset: 32,
          aboveKeyboard: true,
        );
        setState(() => _isResendCooldown = true);
        _resendCooldownTimer?.cancel();
        _resendCooldownTimer = Timer(const Duration(seconds: 60), () {
          if (mounted) {
            setState(() => _isResendCooldown = false);
          }
        });
      }
    } on AuthException catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        CustomSnackbar.show(
          context,
          message: _getAuthErrorMessage(e.message, l10n),
          type: BLabSnackbarType.error,
          bottomOffset: 32,
          aboveKeyboard: true,
        );
      }
    } catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        CustomSnackbar.show(
          context,
          message: l10n.loginUnexpectedError,
          type: BLabSnackbarType.error,
          bottomOffset: 32,
          aboveKeyboard: true,
        );
      }
    }
  }

  void _setAuthMode(AuthMode mode) {
    _unconfirmedEmail = null;
    _isResendCooldown = false;
    _resendCooldownTimer?.cancel();
    setState(() => _authMode = mode);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;

    return Scaffold(
      resizeToAvoidBottomInset: false,
      body: SafeArea(
        child: Stack(
          children: [
            LayoutBuilder(
              builder: (context, constraints) {
                final maxWidth =
                    constraints.maxWidth > 500 ? 400.0 : double.infinity;

                return SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: EdgeInsets.only(
                    left: 24,
                    right: 24,
                    bottom: keyboardHeight + 80,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: maxWidth),
                      child: Column(
                        children: [
                          const SizedBox(height: 60),
                          _buildLogoSection(isDark),
                          const SizedBox(height: 48),
                          _buildAuthCard(context, isDark),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
            if (_isKeyboardVisible && keyboardHeight > 0)
              Positioned(
                left: 0,
                right: 0,
                bottom: keyboardHeight,
                child: KeyboardAccessoryBar(
                  isDark: isDark,
                  showNavigation: true,
                  onDone: _dismissKeyboard,
                  onUp: _focusPreviousField,
                  onDown: _focusNextField,
                  canGoUp: !_emailFocusNode.hasFocus,
                  canGoDown: _authMode == AuthMode.signUp
                      ? !_nicknameFocusNode.hasFocus
                      : _authMode == AuthMode.forgotPassword
                          ? false
                          : !_passwordFocusNode.hasFocus,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoSection(bool isDark) {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.asset(
              'assets/images/logo.png',
              fit: BoxFit.cover,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          AppLocalizations.of(context).loginAppName,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : BLabColors.textPrimaryLight,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _getDescriptionText(AppLocalizations.of(context)),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w400,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
            height: 1.5,
          ),
        ),
      ],
    );
  }

  String _getDescriptionText(AppLocalizations l10n) {
    switch (_authMode) {
      case AuthMode.signIn:
        return l10n.loginDescriptionSignIn;
      case AuthMode.signUp:
        return l10n.loginDescriptionSignUp;
      case AuthMode.forgotPassword:
        return l10n.loginDescriptionForgotPassword;
    }
  }

  Widget _buildAuthCard(BuildContext context, bool isDark) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDark
                  ? [
                      Colors.white.withValues(alpha: 0.12),
                      Colors.white.withValues(alpha: 0.06),
                    ]
                  : [
                      Colors.white.withValues(alpha: 0.8),
                      Colors.white.withValues(alpha: 0.6),
                    ],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.15)
                  : Colors.white.withValues(alpha: 0.8),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildGlassTextField(
                    context: context,
                    controller: _emailController,
                    fieldKey: _emailFieldKey,
                    focusNode: _emailFocusNode,
                    label: AppLocalizations.of(context).loginEmailLabel,
                    hint: AppLocalizations.of(context).loginEmailHint,
                    keyboardType: TextInputType.emailAddress,
                    prefixIcon: Icons.email_outlined,
                    isDark: isDark,
                    textInputAction: TextInputAction.next,
                    onFieldSubmitted: (_) => _focusNextField(),
                    autofillHints: const [AutofillHints.email],
                    autocorrect: false,
                    enableSuggestions: false,
                    suffixIcon: _emailHasText
                        ? _buildClearButton(
                            controller: _emailController,
                            isDark: isDark,
                          )
                        : null,
                    validator: (value) {
                      final l10n = AppLocalizations.of(context);
                      if (value == null || value.isEmpty) {
                        return l10n.loginEmailRequired;
                      }
                      if (!value.contains('@')) {
                        return l10n.loginEmailInvalid;
                      }
                      return null;
                    },
                  ),
                  if (_authMode != AuthMode.forgotPassword) ...[
                    const SizedBox(height: 16),
                    _buildGlassTextField(
                      context: context,
                      controller: _passwordController,
                      fieldKey: _passwordFieldKey,
                      focusNode: _passwordFocusNode,
                      label: AppLocalizations.of(context).loginPasswordLabel,
                      hint: AppLocalizations.of(context).loginPasswordHint,
                      obscureText: _obscurePassword,
                      prefixIcon: Icons.lock_outline,
                      isDark: isDark,
                      textInputAction: _authMode == AuthMode.signUp
                          ? TextInputAction.next
                          : TextInputAction.done,
                      onFieldSubmitted: (_) => _focusNextField(),
                      autofillHints: _authMode == AuthMode.signIn
                          ? const [AutofillHints.password]
                          : const [AutofillHints.newPassword],
                      autocorrect: false,
                      enableSuggestions: false,
                      suffixIcon: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_passwordHasText)
                            _buildClearButton(
                              controller: _passwordController,
                              isDark: isDark,
                            ),
                          IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                              color:
                                  isDark ? Colors.grey[400] : Colors.grey[600],
                              size: 20,
                            ),
                            onPressed: () {
                              setState(
                                  () => _obscurePassword = !_obscurePassword);
                            },
                          ),
                        ],
                      ),
                      validator: (value) {
                        final l10n = AppLocalizations.of(context);
                        if (value == null || value.isEmpty) {
                          return l10n.loginPasswordRequired;
                        }
                        if (value.length < 6) {
                          return l10n.loginPasswordTooShort;
                        }
                        return null;
                      },
                    ),
                  ],
                  if (_authMode == AuthMode.signUp) ...[
                    const SizedBox(height: 16),
                    _buildGlassTextField(
                      context: context,
                      controller: _nicknameController,
                      fieldKey: _nicknameFieldKey,
                      focusNode: _nicknameFocusNode,
                      label: AppLocalizations.of(context).loginNicknameLabel,
                      hint: AppLocalizations.of(context).loginNicknameHint,
                      prefixIcon: Icons.person_outline,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _dismissKeyboard(),
                      isDark: isDark,
                      autofillHints: const [AutofillHints.nickname],
                      suffixIcon: _nicknameHasText
                          ? _buildClearButton(
                              controller: _nicknameController,
                              isDark: isDark,
                            )
                          : null,
                      validator: (value) {
                        final l10n = AppLocalizations.of(context);
                        if (value == null || value.isEmpty) {
                          return l10n.loginNicknameRequired;
                        }
                        return null;
                      },
                    ),
                  ],
                  if (_authMode == AuthMode.signIn) ...[
                    const SizedBox(height: 12),
                    _buildSaveEmailCheckbox(isDark),
                  ],
                  const SizedBox(height: 24),
                  _buildGlassButton(
                    onPressed: _isLoading ? null : _handleSubmit,
                    isDark: isDark,
                    child: _isLoading
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                isDark ? Colors.white : Colors.white,
                              ),
                            ),
                          )
                        : Text(
                            _getButtonText(AppLocalizations.of(context)),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                  ),
                  const SizedBox(height: 16),
                  if (_authMode == AuthMode.signIn) ...[
                    if (_unconfirmedEmail != null)
                      _buildTextButton(
                        _isResendCooldown
                            ? AppLocalizations.of(context)
                                .loginResendVerificationCooldown
                            : AppLocalizations.of(context)
                                .loginResendVerification,
                        _isResendCooldown
                            ? null
                            : () => _handleResendVerification(),
                        isDark,
                      ),
                    _buildTextButton(
                      AppLocalizations.of(context).loginForgotPassword,
                      () => _setAuthMode(AuthMode.forgotPassword),
                      isDark,
                    ),
                    const SizedBox(height: 8),
                    _buildDivider(isDark, context),
                    const SizedBox(height: 8),
                    _buildTextButton(
                      AppLocalizations.of(context).loginNoAccount,
                      () => _setAuthMode(AuthMode.signUp),
                      isDark,
                    ),
                  ] else if (_authMode == AuthMode.signUp) ...[
                    _buildTextButton(
                      AppLocalizations.of(context).loginHaveAccount,
                      () => _setAuthMode(AuthMode.signIn),
                      isDark,
                    ),
                  ] else ...[
                    _buildTextButton(
                      AppLocalizations.of(context).loginBackToSignIn,
                      () => _setAuthMode(AuthMode.signIn),
                      isDark,
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

  Widget _buildClearButton({
    required TextEditingController controller,
    required bool isDark,
  }) {
    return IconButton(
      icon: Icon(
        Icons.cancel,
        color: isDark ? Colors.grey[500] : Colors.grey[400],
        size: 20,
      ),
      onPressed: () {
        controller.clear();
      },
    );
  }

  Widget _buildGlassTextField({
    required BuildContext context,
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData prefixIcon,
    required bool isDark,
    GlobalKey? fieldKey,
    FocusNode? focusNode,
    TextInputType keyboardType = TextInputType.text,
    TextInputAction? textInputAction,
    void Function(String)? onFieldSubmitted,
    bool obscureText = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
    List<String>? autofillHints,
    bool autocorrect = true,
    bool enableSuggestions = true,
  }) {
    return Column(
      key: fieldKey,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.grey[300] : Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        _GlassTextFieldContainer(
          isDark: isDark,
          child: TextFormField(
            controller: controller,
            focusNode: focusNode,
            keyboardType: keyboardType,
            textInputAction: textInputAction,
            onFieldSubmitted: onFieldSubmitted,
            obscureText: obscureText,
            autocorrect: autocorrect,
            enableSuggestions: enableSuggestions,
            autofillHints: autofillHints,
            style: TextStyle(
              fontSize: 15,
              color: isDark ? Colors.white : Colors.black87,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(
                color: isDark ? Colors.grey[500] : Colors.grey[400],
                fontSize: 14,
              ),
              prefixIcon: Icon(
                prefixIcon,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                size: 20,
              ),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              focusedBorder: InputBorder.none,
              enabledBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 16,
              ),
              errorStyle: const TextStyle(
                fontSize: 12,
                height: 1,
              ),
            ),
            validator: validator,
          ),
        ),
      ],
    );
  }

  Widget _buildSaveEmailCheckbox(bool isDark) {
    return GestureDetector(
      onTap: () => setState(() => _saveEmail = !_saveEmail),
      child: Row(
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: _saveEmail
                    ? BLabColors.primary
                    : (isDark ? Colors.grey[600]! : Colors.grey[400]!),
                width: 1.5,
              ),
              color: _saveEmail ? BLabColors.primary : Colors.transparent,
            ),
            child: _saveEmail
                ? const Icon(
                    Icons.check,
                    size: 14,
                    color: Colors.white,
                  )
                : null,
          ),
          const SizedBox(width: 10),
          Text(
            AppLocalizations.of(context).loginSaveEmail,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGlassButton({
    required VoidCallback? onPressed,
    required bool isDark,
    required Widget child,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          height: 52,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                BLabColors.primaryLight,
                BLabColors.primary,
              ],
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: BLabColors.primary.withValues(alpha: 0.4),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onPressed,
              borderRadius: BorderRadius.circular(14),
              child: Center(child: child),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextButton(String text, VoidCallback? onPressed, bool isDark) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: BLabColors.primary,
        padding: const EdgeInsets.symmetric(vertical: 8),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: onPressed == null
              ? (isDark ? Colors.grey[600] : Colors.grey[400])
              : (isDark ? Colors.grey[300] : BLabColors.primary),
        ),
      ),
    );
  }

  Widget _buildDivider(bool isDark, BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 1,
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.grey.withValues(alpha: 0.2),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            AppLocalizations.of(context).loginOrDivider,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.grey[500] : Colors.grey[400],
            ),
          ),
        ),
        Expanded(
          child: Container(
            height: 1,
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.grey.withValues(alpha: 0.2),
          ),
        ),
      ],
    );
  }

  String _getButtonText(AppLocalizations l10n) {
    switch (_authMode) {
      case AuthMode.signIn:
        return l10n.loginButton;
      case AuthMode.signUp:
        return l10n.loginSignupButton;
      case AuthMode.forgotPassword:
        return '${l10n.loginButton} ${l10n.loginPasswordLabel}';
    }
  }
}

class _GlassTextFieldContainer extends StatefulWidget {
  final bool isDark;
  final Widget child;

  const _GlassTextFieldContainer({
    required this.isDark,
    required this.child,
  });

  @override
  State<_GlassTextFieldContainer> createState() =>
      _GlassTextFieldContainerState();
}

class _GlassTextFieldContainerState extends State<_GlassTextFieldContainer> {
  bool _isFocused = false;

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (hasFocus) {
        setState(() => _isFocused = hasFocus);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: widget.isDark
                      ? [
                          Colors.white
                              .withValues(alpha: _isFocused ? 0.20 : 0.08),
                          Colors.white
                              .withValues(alpha: _isFocused ? 0.12 : 0.04),
                        ]
                      : [
                          Colors.white
                              .withValues(alpha: _isFocused ? 1.0 : 0.85),
                          Colors.white
                              .withValues(alpha: _isFocused ? 0.95 : 0.65),
                        ],
                ),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: widget.isDark
                      ? Colors.white.withValues(alpha: _isFocused ? 0.30 : 0.1)
                      : (_isFocused
                          ? BLabColors.primary.withValues(alpha: 0.5)
                          : Colors.grey.withValues(alpha: 0.15)),
                  width: _isFocused ? 1.5 : 1,
                ),
              ),
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}
