import 'dart:async';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/ui/core/view_model/base_view_model.dart';
import 'package:book_golas/data/repositories/auth_repository.dart';
import 'package:book_golas/domain/models/user_model.dart';
import 'package:book_golas/ui/auth/widgets/password_recovery_screen.dart';
import 'package:book_golas/main.dart';

class AuthViewModel extends BaseViewModel {
  final AuthRepository _authRepository;
  StreamSubscription<AuthState>? _authSubscription;

  UserModel? _currentUser;

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;

  AuthViewModel(this._authRepository) {
    _init();
  }

  void _init() {
    _currentUser = _authRepository.currentUser;

    _authSubscription =
        Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      final AuthChangeEvent event = data.event;
      final Session? session = data.session;

      switch (event) {
        case AuthChangeEvent.signedIn:
          if (session?.user != null) {
            _currentUser = UserModel.fromUser(session!.user);
            notifyListeners();
          }
          break;
        case AuthChangeEvent.signedOut:
          _currentUser = null;
          notifyListeners();
          break;
        case AuthChangeEvent.passwordRecovery:
          WidgetsBinding.instance.addPostFrameCallback((_) {
            navigatorKey.currentState?.pushAndRemoveUntil(
              MaterialPageRoute(
                builder: (_) => const PasswordRecoveryScreen(),
              ),
              (route) => route.isFirst,
            );
          });
          break;
        default:
          break;
      }
    });
  }

  Future<String?> signUpWithEmail({
    required String email,
    required String password,
    String? name,
  }) async {
    setLoading(true);
    clearError();
    try {
      final error = await _authRepository.signUpWithEmail(
        email: email,
        password: password,
        name: name,
      );
      if (error != null) {
        setError(error);
      }
      return error;
    } finally {
      setLoading(false);
    }
  }

  Future<String?> signInWithEmail({
    required String email,
    required String password,
  }) async {
    setLoading(true);
    clearError();
    try {
      final error = await _authRepository.signInWithEmail(
        email: email,
        password: password,
      );
      if (error != null) {
        setError(error);
      }
      return error;
    } finally {
      setLoading(false);
    }
  }

  Future<String?> signInWithKakao() async {
    setLoading(true);
    clearError();
    try {
      final error = await _authRepository.signInWithKakao();
      if (error != null) {
        setError(error);
      }
      return error;
    } finally {
      setLoading(false);
    }
  }

  Future<String?> signInWithGoogle() async {
    setLoading(true);
    clearError();
    try {
      final error = await _authRepository.signInWithGoogle();
      if (error != null) {
        setError(error);
      }
      return error;
    } finally {
      setLoading(false);
    }
  }

  Future<String?> signOut() async {
    final error = await _authRepository.signOut();
    if (error == null) {
      _currentUser = null;
      notifyListeners();
    }
    return error;
  }

  Future<String?> resetPassword(String email) async {
    setLoading(true);
    clearError();
    try {
      final error = await _authRepository.resetPassword(email);
      if (error != null) {
        setError(error);
      }
      return error;
    } finally {
      setLoading(false);
    }
  }

  Future<UserModel?> fetchCurrentUser() async {
    final user = await _authRepository.fetchCurrentUser();
    if (user != null) {
      _currentUser = user;
      notifyListeners();
    }
    return user;
  }

  Future<void> updateNickname(String nickname) async {
    await runAsync(() async {
      await _authRepository.updateNickname(nickname);
      await fetchCurrentUser();
    });
  }

  Future<void> uploadAvatar(File file) async {
    await runAsync(() async {
      await _authRepository.uploadAvatar(file);
      await fetchCurrentUser();
    });
  }

  Future<UserModel?> getCurrentUser() async {
    final user = await _authRepository.getCurrentUser();
    if (user != null) {
      _currentUser = user;
      notifyListeners();
    }
    return user;
  }

  Future<bool> deleteAccount() async {
    final result = await _authRepository.deleteAccount();
    if (result) {
      _currentUser = null;
      notifyListeners();
    }
    return result;
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }
}
