import 'dart:io';

import 'package:book_golas/data/services/auth_service.dart';
import 'package:book_golas/domain/models/user_model.dart';

abstract class AuthRepository {
  UserModel? get currentUser;

  Future<String?> signUpWithEmail({
    required String email,
    required String password,
    String? name,
  });

  Future<String?> signInWithEmail({
    required String email,
    required String password,
  });

  Future<String?> signInWithKakao();

  Future<String?> signInWithGoogle();

  Future<String?> signInWithApple();

  Future<String?> signOut();

  Future<String?> resetPassword(String email);

  Future<String?> resendVerificationEmail(String email);

  Future<UserModel?> fetchCurrentUser();

  Future<void> updateNickname(String nickname);

  Future<void> uploadAvatar(File file);

  Future<UserModel?> getCurrentUser();

  Future<bool> deleteAccount();
}

class AuthRepositoryImpl implements AuthRepository {
  final AuthService _authService;

  AuthRepositoryImpl(this._authService);

  @override
  UserModel? get currentUser => _authService.currentUser;

  @override
  Future<String?> signUpWithEmail({
    required String email,
    required String password,
    String? name,
  }) =>
      _authService.signUpWithEmail(
        email: email,
        password: password,
        name: name,
      );

  @override
  Future<String?> signInWithEmail({
    required String email,
    required String password,
  }) =>
      _authService.signInWithEmail(
        email: email,
        password: password,
      );

  @override
  Future<String?> signInWithKakao() => _authService.signInWithKakao();

  @override
  Future<String?> signInWithGoogle() => _authService.signInWithGoogle();

  @override
  Future<String?> signInWithApple() => _authService.signInWithApple();

  @override
  Future<String?> signOut() => _authService.signOut();

  @override
  Future<String?> resetPassword(String email) =>
      _authService.resetPassword(email);

  @override
  Future<String?> resendVerificationEmail(String email) =>
      _authService.resendVerificationEmail(email);

  @override
  Future<UserModel?> fetchCurrentUser() => _authService.fetchCurrentUser();

  @override
  Future<void> updateNickname(String nickname) =>
      _authService.updateNickname(nickname);

  @override
  Future<void> uploadAvatar(File file) => _authService.uploadAvatar(file);

  @override
  Future<UserModel?> getCurrentUser() => _authService.getCurrentUser();

  @override
  Future<bool> deleteAccount() => _authService.deleteAccount();
}
