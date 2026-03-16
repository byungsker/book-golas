import 'dart:io';

import 'package:book_golas/data/services/notification_category_prefs.dart';
import 'package:book_golas/ui/core/view_model/base_view_model.dart';

class MyPageViewModel extends BaseViewModel {
  bool _isEditingNickname = false;
  File? _pendingAvatarFile;
  Map<NotificationCategory, bool> _categoryStates = {};

  bool get isEditingNickname => _isEditingNickname;
  File? get pendingAvatarFile => _pendingAvatarFile;
  Map<NotificationCategory, bool> get categoryStates => _categoryStates;

  bool isCategoryEnabled(NotificationCategory category) =>
      _categoryStates[category] ?? true;

  Future<void> loadCategoryStates() async {
    await NotificationCategoryPrefs.loadFromSupabase();
    final states = <NotificationCategory, bool>{};
    for (final category in NotificationCategory.values) {
      states[category] =
          await NotificationCategoryPrefs.isCategoryEnabled(category);
    }
    _categoryStates = states;
    notifyListeners();
  }

  Future<void> toggleCategory(
      NotificationCategory category, bool enabled) async {
    _categoryStates[category] = enabled;
    notifyListeners();
    await NotificationCategoryPrefs.setCategoryEnabled(category, enabled);
  }

  void startEditingNickname() {
    _isEditingNickname = true;
    notifyListeners();
  }

  void cancelEditingNickname() {
    _isEditingNickname = false;
    notifyListeners();
  }

  void finishEditingNickname() {
    _isEditingNickname = false;
    notifyListeners();
  }

  void setPendingAvatarFile(File? file) {
    _pendingAvatarFile = file;
    notifyListeners();
  }

  void clearPendingAvatarFile() {
    _pendingAvatarFile = null;
    notifyListeners();
  }

  void reset() {
    _isEditingNickname = false;
    _pendingAvatarFile = null;
    _categoryStates = {};
    notifyListeners();
  }
}
