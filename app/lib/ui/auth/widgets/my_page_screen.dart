import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'package:book_golas/data/services/fcm_service.dart';
import 'package:book_golas/data/services/auth_service.dart';
import 'package:book_golas/data/services/notification_category_prefs.dart';
import 'package:book_golas/ui/auth/view_model/my_page_view_model.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/view_model/auth_view_model.dart';
import 'package:book_golas/ui/core/view_model/notification_settings_view_model.dart';
import 'package:book_golas/ui/core/view_model/locale_view_model.dart';
import 'package:book_golas/ui/core/view_model/theme_view_model.dart';
import 'package:book_golas/ui/core/widgets/locale_time_picker.dart';
import '../../../l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_card.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_text_field.dart';

import 'login_screen.dart';
import 'terms_webview_screen.dart';
import 'package:book_golas/ui/subscription/view_model/subscription_view_model.dart';
import 'package:book_golas/ui/subscription/widgets/subscription_screen.dart';

class MyPageScreen extends StatelessWidget {
  const MyPageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => MyPageViewModel(),
      child: const _MyPageContent(),
    );
  }
}

class _MyPageContent extends StatefulWidget {
  const _MyPageContent();

  @override
  State<_MyPageContent> createState() => _MyPageContentState();
}

class _MyPageContentState extends State<_MyPageContent> {
  late TextEditingController _nicknameController;
  bool _isUploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    _nicknameController = TextEditingController();
    Future.microtask(() {
      context.read<AuthViewModel>().fetchCurrentUser();
      context.read<NotificationSettingsViewModel>().loadSettings();
      context.read<MyPageViewModel>().loadCategoryStates();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final user = context.watch<AuthViewModel>().currentUser;
    if (_nicknameController.text.isEmpty && user?.nickname != null) {
      _nicknameController.text = user!.nickname!;
    }
  }

  @override
  void dispose() {
    _nicknameController.dispose();
    super.dispose();
  }

  void _showDeleteAccountDialog(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          backgroundColor: isDark ? BLabColors.surfaceDark : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text(
            AppLocalizations.of(context).myPageDeleteAccount,
            style: TextStyle(
              color: isDark ? Colors.white : Colors.black,
              fontWeight: FontWeight.w600,
            ),
          ),
          content: Text(
            AppLocalizations.of(context).myPageDeleteAccountConfirm,
            style: TextStyle(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.7)
                  : Colors.black.withValues(alpha: 0.7),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(
                AppLocalizations.of(context).commonCancel,
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ),
            TextButton(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await _deleteAccount();
              },
              style: TextButton.styleFrom(
                foregroundColor: BLabColors.error,
              ),
              child: Text(AppLocalizations.of(context).commonDelete),
            ),
          ],
        );
      },
    );
  }

  Future<void> _deleteAccount() async {
    try {
      final authViewModel = context.read<AuthViewModel>();
      final success = await authViewModel.deleteAccount();

      if (success && mounted) {
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context).myPageDeleteAccountSuccess,
          type: BLabSnackbarType.success,
          bottomOffset: 32,
        );

        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      } else if (mounted) {
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context).myPageDeleteAccountFailed,
          type: BLabSnackbarType.error,
          bottomOffset: 32,
        );
      }
    } catch (e) {
      if (mounted) {
        CustomSnackbar.show(
          context,
          message: AppLocalizations.of(context)
              .myPageDeleteAccountError(e.toString()),
          type: BLabSnackbarType.error,
          bottomOffset: 32,
        );
      }
    }
  }

  Future<void> _showTimePicker({
    required int initialHour,
    required int initialMinute,
    required String type,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    int selectedHour = initialHour;
    int selectedMinute = initialMinute;

    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (BuildContext sheetContext) {
        return Container(
          height: 350,
          decoration: BoxDecoration(
            color: isDark ? BLabColors.surfaceDark : Colors.white,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
          ),
          child: Column(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : Colors.black.withValues(alpha: 0.1),
                      width: 0.5,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(sheetContext),
                      child: Text(
                        AppLocalizations.of(context).commonCancel,
                        style: const TextStyle(
                          color: BLabColors.error,
                          fontSize: 17,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    Text(
                      AppLocalizations.of(context).myPageNotificationTimeTitle,
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    TextButton(
                      onPressed: () async {
                        Navigator.pop(sheetContext);
                        await _saveNotificationTime(
                            selectedHour, selectedMinute, type);
                      },
                      child: Text(
                        AppLocalizations.of(context).commonConfirm,
                        style: const TextStyle(
                          color: BLabColors.primary,
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: LocaleTimePicker(
                  isDark: isDark,
                  initialHour: initialHour,
                  initialMinute: initialMinute,
                  onTimeChanged: (hour, minute) {
                    selectedHour = hour;
                    selectedMinute = minute;
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _saveNotificationTime(
      int hour, int minute, String type) async {
    final settingsViewModel = context.read<NotificationSettingsViewModel>();

    bool success;
    if (type == 'goalAlarm') {
      success = await settingsViewModel.updateGoalAlarmTime(hour, minute);
      if (success) {
        await FCMService().scheduleGoalAlarm(hour: hour, minute: minute);
      }
    } else {
      success = await settingsViewModel.updateDailyReminderTime(hour, minute);
      if (success) {
        await FCMService().scheduleDailyReminder(hour: hour, minute: minute);
      }
    }

    if (success && mounted) {
      final formattedTime = type == 'goalAlarm'
          ? settingsViewModel.getFormattedGoalAlarmTime()
          : settingsViewModel.getFormattedDailyReminderTime();
      CustomSnackbar.show(
        context,
        message: AppLocalizations.of(context)
            .myPageNotificationTime(formattedTime),
        type: BLabSnackbarType.success,
        bottomOffset: 32,
      );
    } else if (!success && mounted) {
      CustomSnackbar.show(
        context,
        message: settingsViewModel.errorMessage ??
            AppLocalizations.of(context).myPageNotificationChangeFailed,
        type: BLabSnackbarType.error,
        bottomOffset: 32,
      );
    }
  }

  String _formatTime(int hour, [int minute = 0]) {
    final l10n = AppLocalizations.of(context);
    String hourStr;
    if (hour == 0) {
      hourStr = '${l10n.timeAm} 12${l10n.unitHour}';
    } else if (hour < 12) {
      hourStr = '${l10n.timeAm} $hour${l10n.unitHour}';
    } else if (hour == 12) {
      hourStr = '${l10n.timePm} 12${l10n.unitHour}';
    } else {
      hourStr = '${l10n.timePm} ${hour - 12}${l10n.unitHour}';
    }

    if (minute == 0) {
      return hourStr;
    }
    return '$hourStr $minute${l10n.unitMinute}';
  }

  Widget _buildProfileCard(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authViewModel = context.watch<AuthViewModel>();
    final user = authViewModel.currentUser;
    final vm = context.watch<MyPageViewModel>();

    if (user == null) {
      return const SizedBox.shrink();
    }

    final textColor = isDark ? Colors.white : Colors.black;

    return BLabCard(
      child: Column(
        children: [
          GestureDetector(
            onTap: vm.pendingAvatarFile != null
                ? null
                : () async {
                    HapticFeedback.selectionClick();
                    final picker = ImagePicker();
                    final picked =
                        await picker.pickImage(source: ImageSource.gallery);
                    if (picked != null) {
                      vm.setPendingAvatarFile(File(picked.path));
                    }
                  },
            child: Stack(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.2)
                          : Colors.black.withValues(alpha: 0.1),
                      width: 2,
                    ),
                  ),
                  child: ClipOval(
                    child: vm.pendingAvatarFile != null
                        ? Image.file(
                            vm.pendingAvatarFile!,
                            width: 80,
                            height: 80,
                            fit: BoxFit.cover,
                          )
                        : (user.avatarUrl != null && user.avatarUrl!.isNotEmpty)
                            ? Image.network(
                                user.avatarUrl!,
                                width: 80,
                                height: 80,
                                fit: BoxFit.cover,
                                loadingBuilder:
                                    (context, child, loadingProgress) {
                                  if (loadingProgress == null) return child;
                                  return Shimmer.fromColors(
                                    baseColor: isDark
                                        ? Colors.grey[800]!
                                        : Colors.grey[300]!,
                                    highlightColor: isDark
                                        ? Colors.grey[700]!
                                        : Colors.grey[100]!,
                                    child: Container(
                                      width: 80,
                                      height: 80,
                                      decoration: BoxDecoration(
                                        color: isDark
                                            ? Colors.grey[800]
                                            : Colors.grey[300],
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  );
                                },
                                errorBuilder: (context, error, stackTrace) {
                                  return _buildDefaultAvatar(isDark);
                                },
                              )
                            : _buildDefaultAvatar(isDark),
                  ),
                ),
                if (vm.pendingAvatarFile == null)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: BLabColors.primary,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isDark ? BLabColors.surfaceDark : Colors.white,
                          width: 2,
                        ),
                      ),
                      child: const Icon(
                        Icons.camera_alt,
                        color: Colors.white,
                        size: 14,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (vm.pendingAvatarFile != null) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                BLabButton(
                  text: _isUploadingAvatar ? '' : '변경',
                  variant: BLabButtonVariant.primary,
                  onPressed: _isUploadingAvatar
                      ? null
                      : () async {
                          if (vm.pendingAvatarFile != null) {
                            setState(() => _isUploadingAvatar = true);
                            try {
                              await authViewModel
                                  .uploadAvatar(vm.pendingAvatarFile!);
                              vm.clearPendingAvatarFile();

                              if (context.mounted) {
                                CustomSnackbar.show(
                                  context,
                                  message: AppLocalizations.of(context)
                                      .myPageAvatarChanged,
                                  type: BLabSnackbarType.success,
                                  bottomOffset: 32,
                                );
                              }
                            } catch (e) {
                              debugPrint('🖼️ [Avatar] Error: $e');
                              vm.clearPendingAvatarFile();
                              if (context.mounted) {
                                CustomSnackbar.show(
                                  context,
                                  message: AppLocalizations.of(context)
                                      .myPageAvatarChangeFailed(e.toString()),
                                  type: BLabSnackbarType.error,
                                  bottomOffset: 32,
                                );
                              }
                            } finally {
                              if (mounted) {
                                setState(() => _isUploadingAvatar = false);
                              }
                            }
                          }
                        },
                  child: _isUploadingAvatar
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 8),
                BLabButton(
                  text: '취소',
                  variant: BLabButtonVariant.secondary,
                  onPressed: _isUploadingAvatar
                      ? null
                      : () {
                          vm.clearPendingAvatarFile();
                        },
                ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          if (!vm.isEditingNickname) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  user.nickname ??
                      AppLocalizations.of(context).myPageNoNickname,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: textColor,
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    vm.startEditingNickname();
                    _nicknameController.text = user.nickname ?? '';
                  },
                  child: Icon(
                    Icons.edit,
                    size: 16,
                    color: textColor.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          ] else ...[
            Row(
              children: [
                Expanded(
                  child: BLabTextField(
                    controller: _nicknameController,
                    hintText: AppLocalizations.of(context).myPageNicknameHint,
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () async {
                    HapticFeedback.selectionClick();
                    await authViewModel
                        .updateNickname(_nicknameController.text);
                    vm.finishEditingNickname();
                  },
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: BLabColors.success,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    vm.cancelEditingNickname();
                    _nicknameController.text = user.nickname ?? '';
                  },
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : Colors.black.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.close,
                      color: textColor.withValues(alpha: 0.6),
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 8),
          Text(
            user.email ?? '',
            style: TextStyle(
              fontSize: 15,
              color: textColor.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDefaultAvatar(bool isDark) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: isDark ? BLabColors.subtleDark : Colors.blue[50],
        shape: BoxShape.circle,
      ),
      child: Icon(
        Icons.person,
        size: 40,
        color: isDark ? Colors.white.withValues(alpha: 0.5) : Colors.blue[300],
      ),
    );
  }

  Widget _buildSettingsCard(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black;

    return BLabCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppLocalizations.of(context).myPageSettings,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          const SizedBox(height: 20),
          Consumer<ThemeViewModel>(
            builder: (context, themeViewModel, child) {
              return _buildSettingRow(
                context: context,
                icon: themeViewModel.isDarkMode
                    ? Icons.dark_mode
                    : Icons.light_mode,
                title: AppLocalizations.of(context).myPageDarkMode,
                trailing: Switch(
                  value: themeViewModel.isDarkMode,
                  onChanged: (value) {
                    HapticFeedback.selectionClick();
                    themeViewModel.toggleTheme();
                  },
                  activeTrackColor: BLabColors.primary,
                ),
              );
            },
          ),
          Divider(
            height: 32,
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.black.withValues(alpha: 0.1),
          ),
          Consumer<LocaleViewModel>(
            builder: (context, localeViewModel, child) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSettingRow(
                    context: context,
                    icon: Icons.language,
                    title: AppLocalizations.of(context).languageSettingLabel,
                    trailing: const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: SegmentedButton<String>(
                      segments: [
                        ButtonSegment(
                            value: 'ko',
                            label: Text(
                                AppLocalizations.of(context).languageKorean)),
                        ButtonSegment(
                            value: 'en',
                            label: Text(
                                AppLocalizations.of(context).languageEnglish)),
                      ],
                      selected: {localeViewModel.locale.languageCode},
                      onSelectionChanged: (selection) async {
                        final newLocale = selection.first;
                        if (newLocale == localeViewModel.locale.languageCode) {
                          return;
                        }

                        HapticFeedback.selectionClick();

                        final localizations = AppLocalizations.of(context);
                        final languageName = newLocale == 'ko'
                            ? localizations.languageKorean
                            : localizations.languageEnglish;

                        final confirmed = await showModalBottomSheet<bool>(
                          context: context,
                          backgroundColor: Colors.transparent,
                          builder: (context) => Container(
                            decoration: BoxDecoration(
                              color:
                                  isDark ? BLabColors.surfaceDark : Colors.white,
                              borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(24)),
                            ),
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 40,
                                  height: 4,
                                  margin: const EdgeInsets.only(bottom: 20),
                                  decoration: BoxDecoration(
                                    color: Colors.grey[400],
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                                Text(
                                  localizations.languageChangeConfirmTitle,
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? Colors.white : Colors.black,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  localizations.languageChangeConfirmMessage(
                                      languageName),
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 15,
                                    color: isDark
                                        ? Colors.grey[400]
                                        : Colors.grey[600],
                                  ),
                                ),
                                const SizedBox(height: 24),
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton(
                                        onPressed: () =>
                                            Navigator.pop(context, false),
                                        style: OutlinedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 14),
                                          side: BorderSide(
                                            color: isDark
                                                ? Colors.white
                                                    .withValues(alpha: 0.2)
                                                : Colors.black
                                                    .withValues(alpha: 0.2),
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(12),
                                          ),
                                        ),
                                        child: Text(
                                          localizations.commonCancel,
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                            color: isDark
                                                ? Colors.white
                                                : Colors.black,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: ElevatedButton(
                                        onPressed: () =>
                                            Navigator.pop(context, true),
                                        style: ElevatedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 14),
                                          backgroundColor: BLabColors.primary,
                                          foregroundColor: Colors.white,
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(12),
                                          ),
                                        ),
                                        child: Text(
                                          localizations.commonConfirm,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );

                        if (confirmed == true) {
                          localeViewModel.setLocale(Locale(newLocale));
                        }
                      },
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black;

    return BLabCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppLocalizations.of(context).myPageNotificationCategories,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          const SizedBox(height: 20),
          Consumer<NotificationSettingsViewModel>(
            builder: (context, settingsViewModel, child) {
              final settings = settingsViewModel.settings;
              final isLoading = settingsViewModel.isLoading;

              return Column(
                children: [
                  _buildSettingRow(
                    context: context,
                    icon: Icons.notifications,
                    title: AppLocalizations.of(context)
                        .myPageDailyReadingNotification,
                    subtitle: settings.notificationEnabled
                        ? AppLocalizations.of(context).myPageNotificationTime(
                            _formatTime(settings.dailyReminderHour,
                                settings.dailyReminderMinute))
                        : AppLocalizations.of(context).myPageNoNotification,
                    trailing: isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Switch(
                            value: settings.notificationEnabled,
                            onChanged: (value) async {
                              HapticFeedback.selectionClick();
                              final success = await settingsViewModel
                                  .updateNotificationEnabled(value);

                              if (success) {
                                if (value) {
                                  await FCMService().scheduleDailyReminder(
                                    hour: settings.dailyReminderHour,
                                    minute: settings.dailyReminderMinute,
                                  );
                                  await FCMService().scheduleGoalAlarm(
                                    hour: settings.goalAlarmHour,
                                    minute: settings.goalAlarmMinute,
                                  );
                                } else {
                                  await FCMService().cancelDailyReminder();
                                  await FCMService().cancelGoalAlarm();
                                }

                                if (mounted) {
                                  CustomSnackbar.show(
                                    context,
                                    message: value
                                        ? AppLocalizations.of(context)
                                            .myPageNotificationEnabled
                                        : AppLocalizations.of(context)
                                            .myPageNotificationDisabled,
                                    type: value
                                        ? BLabSnackbarType.success
                                        : BLabSnackbarType.info,
                                    bottomOffset: 32,
                                  );
                                }
                              } else if (mounted) {
                                CustomSnackbar.show(
                                  context,
                                  message: settingsViewModel.errorMessage ??
                                      AppLocalizations.of(context)
                                          .myPageNotificationChangeFailed,
                                  type: BLabSnackbarType.error,
                                  bottomOffset: 32,
                                );
                              }
                            },
                            activeTrackColor: BLabColors.primary,
                          ),
                  ),
                  if (settings.notificationEnabled) ...[
                    Divider(
                      height: 32,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : Colors.black.withValues(alpha: 0.1),
                    ),
                    _buildSettingRow(
                      context: context,
                      icon: Icons.bookmark,
                    title: AppLocalizations.of(context).myPageNotificationDailyReminder,
                      subtitle: settings.dailyReminderEnabled
                          ? _formatTime(settings.dailyReminderHour,
                              settings.dailyReminderMinute)
                          : null,
                      trailing: Switch(
                        value: settings.dailyReminderEnabled,
                        onChanged: isLoading
                            ? null
                            : (value) async {
                                HapticFeedback.selectionClick();
                                final success = await settingsViewModel
                                    .updateDailyReminderEnabled(value);
                                if (success) {
                                  if (value) {
                                    await FCMService().scheduleDailyReminder(
                                      hour: settings.dailyReminderHour,
                                      minute: settings.dailyReminderMinute,
                                    );
                                  } else {
                                    await FCMService().cancelDailyReminder();
                                  }
                                }
                              },
                        activeTrackColor: BLabColors.primary,
                      ),
                    ),
                    if (settings.dailyReminderEnabled) ...[
                      const SizedBox(height: 8),
                      BLabButton(
                        text: _formatTime(settings.dailyReminderHour,
                            settings.dailyReminderMinute),
                        icon: Icons.access_time,
                        variant: BLabButtonVariant.secondary,
                        isFullWidth: true,
                        onPressed: isLoading
                            ? null
                            : () => _showTimePicker(
                                  initialHour: settings.dailyReminderHour,
                                  initialMinute:
                                      settings.dailyReminderMinute,
                                  type: 'dailyReminder',
                                ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    _buildSettingRow(
                      context: context,
                      icon: Icons.emoji_events,
                      title: AppLocalizations.of(context)
                          .myPageNotificationGoalAlarm,
                      subtitle: settings.goalAlarmEnabled
                          ? _formatTime(settings.goalAlarmHour,
                              settings.goalAlarmMinute)
                          : null,
                      trailing: Switch(
                        value: settings.goalAlarmEnabled,
                        onChanged: isLoading
                            ? null
                            : (value) async {
                                HapticFeedback.selectionClick();
                                final success = await settingsViewModel
                                    .updateGoalAlarmEnabled(value);
                                if (success) {
                                  if (value) {
                                    await FCMService().scheduleGoalAlarm(
                                      hour: settings.goalAlarmHour,
                                      minute: settings.goalAlarmMinute,
                                    );
                                  } else {
                                    await FCMService().cancelGoalAlarm();
                                  }
                                }
                              },
                        activeTrackColor: BLabColors.primary,
                      ),
                    ),
                    if (settings.goalAlarmEnabled) ...[
                      const SizedBox(height: 8),
                      BLabButton(
                        text: _formatTime(settings.goalAlarmHour,
                            settings.goalAlarmMinute),
                        icon: Icons.access_time,
                        variant: BLabButtonVariant.secondary,
                        isFullWidth: true,
                        onPressed: isLoading
                            ? null
                            : () => _showTimePicker(
                                  initialHour: settings.goalAlarmHour,
                                  initialMinute: settings.goalAlarmMinute,
                                  type: 'goalAlarm',
                                ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    _buildSettingRow(
                      context: context,
                      icon: Icons.flash_on,
                      title: AppLocalizations.of(context)
                          .myPageNotificationEventNudge,
                      trailing: Switch(
                        value: settings.eventNudgeEnabled,
                        onChanged: isLoading
                            ? null
                            : (value) async {
                                HapticFeedback.selectionClick();
                                await settingsViewModel
                                    .updateEventNudgeEnabled(value);
                              },
                        activeTrackColor: BLabColors.primary,
                      ),
                    ),
                    Divider(
                      height: 32,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : Colors.black.withValues(alpha: 0.1),
                    ),
                    _buildSettingRow(
                      context: context,
                      icon: Icons.campaign,
                    title: AppLocalizations.of(context).myPageNotificationAnnouncements,
                      trailing: Consumer<MyPageViewModel>(
                        builder: (context, vm, child) {
                          return Switch(
                      value: vm.isCategoryEnabled(NotificationCategory.announcements),
                            onChanged: (value) {
                              HapticFeedback.selectionClick();
                        vm.toggleCategory(NotificationCategory.announcements, value);
                            },
                            activeTrackColor: BLabColors.primary,
                          );
                        },
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
          if (kDebugMode) ...[
            const SizedBox(height: 20),
            BLabButton(
              text: AppLocalizations.of(context).myPageTestNotification,
              icon: Icons.notifications_active,
              variant: BLabButtonVariant.secondary,
              isFullWidth: true,
              onPressed: () async {
                await FCMService().scheduleTestNotification(seconds: 30);

                if (mounted) {
                  CustomSnackbar.show(
                    context,
                    message: AppLocalizations.of(context)
                        .myPageTestNotificationSent,
                    type: BLabSnackbarType.success,
                    bottomOffset: 32,
                    duration: const Duration(seconds: 3),
                  );
                }
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAccountCard(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black;

    return BLabCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppLocalizations.of(context).myPageAccountSection,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          if (AuthService().isEmailAuthUser()) ...[
            const SizedBox(height: 20),
            GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                _showPasswordChangeSheet();
              },
              behavior: HitTestBehavior.opaque,
              child: _buildSettingRow(
                context: context,
                icon: Icons.lock,
                title: AppLocalizations.of(context).myPageChangePassword,
                trailing: Icon(
                  Icons.chevron_right,
                  size: 20,
                color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.4),
                ),
              ),
            ),
            Divider(
              height: 32,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.1),
            ),
          ],
          Consumer<SubscriptionViewModel>(
            builder: (context, subscriptionVm, child) {
              return BLabButton(
                text: subscriptionVm.isProUser
                    ? AppLocalizations.of(context).myPageSubscriptionManage
                    : AppLocalizations.of(context).myPageSubscriptionUpgrade,
                icon: subscriptionVm.isProUser ? Icons.star : Icons.star_border,
                variant: BLabButtonVariant.secondary,
                isFullWidth: true,
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => SubscriptionScreen(
                        onClose: () => Navigator.pop(context),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSettingRow({
    required BuildContext context,
    required IconData icon,
    required String title,
    String? subtitle,
    required Widget trailing,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black;

    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.black.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            size: 20,
            color: textColor.withValues(alpha: 0.7),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 14,
                    color: textColor.withValues(alpha: 0.5),
                  ),
                ),
              ],
            ],
          ),
        ),
        trailing,
      ],
    );
  }

  Future<void> _showPasswordChangeSheet() async {
    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const _PasswordChangeSheet(),
    );
  }

  Widget _buildInfoCard(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black;

    return BLabCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppLocalizations.of(context).myPageInfoSection,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          const SizedBox(height: 16),
          _buildInfoRow(
            context: context,
            icon: Icons.description,
            title: AppLocalizations.of(context).myPageTermsAndPolicy,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => TermsWebViewScreen(
                    title: AppLocalizations.of(context).myPageTermsAndPolicy,
                    url: 'https://placeholder.com/terms',
                  ),
                ),
              );
            },
          ),
          Divider(
            height: 24,
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.black.withValues(alpha: 0.1),
          ),
          _buildInfoRow(
            context: context,
            icon: Icons.campaign,
            title: AppLocalizations.of(context).myPageAnnouncements,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => TermsWebViewScreen(
                    title: AppLocalizations.of(context).myPageAnnouncements,
                    url: 'https://placeholder.com/announcements',
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required BuildContext context,
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 20,
              color: textColor.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: textColor,
              ),
            ),
          ),
          Icon(
            Icons.chevron_right,
            size: 20,
            color: textColor.withValues(alpha: 0.4),
          ),
        ],
      ),
    );
  }

  Widget _buildVersionInfo(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black;

    return FutureBuilder<PackageInfo>(
      future: PackageInfo.fromPlatform(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();
        return Text(
          '${AppLocalizations.of(context).myPageVersion} ${snapshot.data!.version}',
          style: TextStyle(
            fontSize: 12,
            color: textColor.withValues(alpha: 0.3),
          ),
        );
      },
    );
  }

  Widget _buildDangerZoneCard(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black;

    return Center(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          TextButton(
            onPressed: () async {
              await context.read<AuthViewModel>().signOut();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              AppLocalizations.of(context).myPageLogout,
              style: TextStyle(
                fontSize: 13,
                color: textColor.withValues(alpha: 0.5),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              '|',
              style: TextStyle(
                fontSize: 13,
                color: textColor.withValues(alpha: 0.3),
              ),
            ),
          ),
          TextButton(
            onPressed: () => _showDeleteAccountDialog(context),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              AppLocalizations.of(context).myPageDeleteAccount,
              style: TextStyle(
                fontSize: 13,
                color: textColor.withValues(alpha: 0.5),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    context.watch<AuthViewModel>();

    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context).myPageTitle),
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: isDark ? Colors.white : Colors.black,
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              _buildProfileCard(context),
              const SizedBox(height: 16),
              _buildSettingsCard(context),
              const SizedBox(height: 16),
              _buildNotificationCard(context),
              const SizedBox(height: 16),
              _buildAccountCard(context),
              const SizedBox(height: 16),
              _buildInfoCard(context),
              const SizedBox(height: 16),
              _buildDangerZoneCard(context),
              const SizedBox(height: 8),
              _buildVersionInfo(context),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }
}


class _PasswordChangeSheet extends StatefulWidget {
  const _PasswordChangeSheet();

  @override
  State<_PasswordChangeSheet> createState() => _PasswordChangeSheetState();
}

class _PasswordChangeSheetState extends State<_PasswordChangeSheet> {
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _currentController.addListener(() => setState(() {}));
    _newController.addListener(() => setState(() {}));
    _confirmController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final currentPw = _currentController.text;
    final newPw = _newController.text;
    final confirmPw = _confirmController.text;

    if (currentPw.isEmpty) {
      CustomSnackbar.show(
        context,
        message: l10n.myPageCurrentPasswordRequired,
        type: BLabSnackbarType.error,
        bottomOffset: 32,
      );
      return;
    }
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
        message: l10n.myPagePasswordChanged,
        type: BLabSnackbarType.success,
        bottomOffset: 32,
      );
      Navigator.pop(context);
    } else {
      final message =
          error.contains('same as') || error.contains('different')
              ? l10n.myPagePasswordSameAsOld
              : l10n.myPagePasswordChangeErrorDetail(error);
      CustomSnackbar.show(
        context,
        message: message,
        type: BLabSnackbarType.error,
        bottomOffset: 32,
      );
    }

  }
  Widget _buildPasswordField({
    required TextEditingController controller,
    required String hint,
    required bool obscure,
    required VoidCallback onToggle,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconColor =
        (isDark ? Colors.white : Colors.black).withValues(alpha: 0.4);
    return BLabTextField(
      controller: controller,
      hintText: hint,
      obscureText: obscure,
      suffixIcon: IntrinsicWidth(
        child: Row(
          children: [
            if (controller.text.isNotEmpty)
              IconButton(
                icon: Icon(Icons.close, size: 18, color: iconColor),
                onPressed: () => controller.clear(),
              ),
            IconButton(
              icon: Icon(
                obscure
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                size: 20,
                color: iconColor,
              ),
              onPressed: onToggle,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey[400],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text(
                l10n.myPageChangePasswordTitle,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const SizedBox(height: 20),
              _buildPasswordField(
                controller: _currentController,
                hint: l10n.myPageCurrentPassword,
                obscure: _obscureCurrent,
                onToggle: () =>
                    setState(() => _obscureCurrent = !_obscureCurrent),
              ),
              const SizedBox(height: 12),
              _buildPasswordField(
                controller: _newController,
                hint: l10n.myPageNewPassword,
                obscure: _obscureNew,
                onToggle: () => setState(() => _obscureNew = !_obscureNew),
              ),
              const SizedBox(height: 12),
              _buildPasswordField(
                controller: _confirmController,
                hint: l10n.myPageConfirmPassword,
                obscure: _obscureConfirm,
                onToggle: () =>
                    setState(() => _obscureConfirm = !_obscureConfirm),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: BLabButton(
                  text: _isLoading ? '' : l10n.myPageChangePassword,
                  variant: BLabButtonVariant.primary,
                  isFullWidth: true,
                  onPressed: _isLoading ? null : _submit,
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}