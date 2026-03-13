import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/domain/models/user_model.dart';

class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final GoogleSignIn _googleSignIn;
  UserModel? _currentUser;

  UserModel? get currentUser => _currentUser;

  AuthService()
      : _googleSignIn = GoogleSignIn(
          scopes: ['email', 'profile'],
          serverClientId: dotenv.env['GOOGLE_SERVER_CLIENT_ID'],
        ) {
    _init();
  }

  void _init() {
    _currentUser = _supabase.auth.currentUser != null
        ? UserModel.fromUser(_supabase.auth.currentUser!)
        : null;
  }

  Future<String?> signUpWithEmail({
    required String email,
    required String password,
    String? name,
  }) async {
    try {
      final AuthResponse response = await _supabase.auth.signUp(
        email: email,
        password: password,
        data: {'name': name},
        emailRedirectTo: 'bookgolas://login-callback',
      );
      final userId = response.user?.id;
      if (userId != null) {
        await _supabase.from('users').insert({
          'id': userId,
          'email': email,
          'nickname': name,
          'created_at': DateTime.now().toUtc().toIso8601String(),
        });
      }
      return null;
    } on AuthException catch (error) {
      return error.message;
    } on PostgrestException catch (error) {
      debugPrint('회원가입 DB 오류: ${error.message} (code: ${error.code})');
      if (error.code == '23505') {
        return '이미 사용 중인 이메일입니다.';
      }
      return '회원가입 중 오류가 발생했습니다.';
    } catch (error) {
      return '알 수 없는 오류가 발생했습니다.';
    }
  }

  Future<String?> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return null;
    } on AuthException catch (error) {
      return error.message;
    } catch (error) {
      return '알 수 없는 오류가 발생했습니다.';
    }
  }

  Future<String?> signInWithKakao() async {
    try {
      await _supabase.auth.signInWithOAuth(
        OAuthProvider.kakao,
        redirectTo: kIsWeb ? null : 'bookgolas://login-callback',
        authScreenLaunchMode: kIsWeb
            ? LaunchMode.platformDefault
            : LaunchMode.externalApplication,
      );

      return null;
    } on AuthException catch (error) {
      return error.message;
    } catch (error) {
      return '알 수 없는 오류가 발생했습니다.';
    }
  }

  Future<String?> signInWithGoogle() async {
    try {
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        return 'Google 로그인이 취소되었습니다.';
      }

      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;
      final accessToken = googleAuth.accessToken;

      if (idToken == null) {
        return 'Google ID 토큰을 가져올 수 없습니다.';
      }

      await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: accessToken,
      );

      return null;
    } catch (e) {
      debugPrint('Google Sign-In error: $e');
      if (e.toString().contains('canceled') ||
          e.toString().contains('cancelled')) {
        return null;
      }
      return '알 수 없는 오류가 발생했습니다.';
    }
  }

  Future<String?> signInWithApple() async {
    if (!Platform.isIOS && !Platform.isMacOS) {
      return 'Apple 로그인은 iOS/macOS에서만 사용할 수 있습니다.';
    }

    try {
      final rawNonce = _generateNonce();
      final nonce = _sha256ofString(rawNonce);

      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: nonce,
      );

      final identityToken = credential.identityToken;
      if (identityToken == null) {
        return 'Apple ID 토큰을 가져올 수 없습니다.';
      }

      final response = await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: identityToken,
        nonce: rawNonce,
      );

      if (response.user != null) {
        final givenName = credential.givenName;
        final familyName = credential.familyName;
        if (givenName != null || familyName != null) {
          final fullName = [familyName, givenName]
              .where((n) => n != null && n.isNotEmpty)
              .join(' ');
          if (fullName.isNotEmpty) {
            await _supabase
                .from('users')
                .update({'nickname': fullName}).eq('id', response.user!.id);
          }
        }
      }

      return null;
    } catch (e) {
      debugPrint('Apple Sign-In error: $e');
      if (e.toString().contains('canceled') ||
          e.toString().contains('cancelled') ||
          e.toString().contains('AuthorizationErrorCode.canceled')) {
        return null;
      }
      return '알 수 없는 오류가 발생했습니다.';
    }
  }

  String _generateNonce([int length = 32]) {
    const charset =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(length, (_) => charset[random.nextInt(charset.length)])
        .join();
  }

  String _sha256ofString(String input) {
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  Future<String?> signOut() async {
    try {
      try {
        await Purchases.logOut();
      } catch (e) {
        debugPrint('RevenueCat logOut failed: $e');
      }
      await _supabase.auth.signOut();
      await _googleSignIn.signOut();
      _currentUser = null;
      return null;
    } on AuthException catch (error) {
      return error.message;
    } catch (error) {
      return '알 수 없는 오류가 발생했습니다.';
    }
  }

  Future<String?> resetPassword(String email) async {
    try {
      await _supabase.auth.resetPasswordForEmail(
        email,
        redirectTo: kIsWeb ? null : 'bookgolas://reset-callback',
      );
      return null;
    } on AuthException catch (error) {
      return error.message;
    } catch (error) {
      return '알 수 없는 오류가 발생했습니다.';
    }
  }

  Future<String?> verifyCurrentPassword(String currentPassword) async {
    try {
      final email = _supabase.auth.currentUser?.email;
      if (email == null) return '이메일 정보를 찾을 수 없습니다.';

      await _supabase.auth.signInWithPassword(
        email: email,
        password: currentPassword,
      );
      return null;
    } on AuthException catch (e) {
      debugPrint('현재 비밀번호 확인 오류: ${e.message}');
      return e.message;
    } catch (e) {
      debugPrint('현재 비밀번호 확인 오류: $e');
      return e.toString();
    }
  }

  Future<String?> updatePassword(String newPassword) async {
    try {
      await _supabase.auth.updateUser(
        UserAttributes(password: newPassword),
      );
      return null;
    } on AuthException catch (e) {
      debugPrint('비밀번호 변경 오류: ${e.message}');
      return e.message;
    } catch (e) {
      debugPrint('비밀번호 변경 오류: $e');
      return e.toString();
    }
  }

  bool isEmailAuthUser() {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    final identities = user.identities;
    if (identities == null || identities.isEmpty) return false;

    return identities.any((identity) => identity.provider == 'email');
  }

  Future<String?> resendVerificationEmail(String email) async {
    try {
      await _supabase.auth.resend(
        type: OtpType.signup,
        email: email,
      );
      return null;
    } on AuthException catch (error) {
      return error.message;
    } catch (error) {
      return '알 수 없는 오류가 발생했습니다.';
    }
  }

  Future<UserModel?> fetchCurrentUser() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return null;

    final data =
        await _supabase.from('users').select().eq('id', userId).maybeSingle();

    if (data == null) {
      final email = _supabase.auth.currentUser?.email ?? '';
      final nickname = email.split('@').first;

      await _supabase.from('users').insert({
        'id': userId,
        'email': email,
        'nickname': nickname,
      });

      final newData =
          await _supabase.from('users').select().eq('id', userId).single();
      _currentUser = UserModel.fromJson(newData);
    } else {
      _currentUser = UserModel.fromJson(data);
    }

    return _currentUser;
  }

  Future<void> updateNickname(String nickname) async {
    final userId = _currentUser?.id;
    if (userId == null) return;
    await _supabase
        .from('users')
        .update({'nickname': nickname}).eq('id', userId);
    await fetchCurrentUser();
  }

  Future<void> uploadAvatar(File file) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) {
      throw Exception('User not logged in');
    }

    final filePath = '$userId/avatar.png';
    debugPrint('🖼️ [Avatar] Uploading to: $filePath');

    await _supabase.storage.from('avatars').upload(
          filePath,
          file,
          fileOptions: const FileOptions(upsert: true),
        );
    debugPrint('🖼️ [Avatar] Upload complete');

    final baseUrl = _supabase.storage.from('avatars').getPublicUrl(filePath);
    final urlWithBust = '$baseUrl?ts=${DateTime.now().millisecondsSinceEpoch}';
    debugPrint('🖼️ [Avatar] URL: $urlWithBust');

    await _supabase
        .from('users')
        .update({'avatar_url': urlWithBust}).eq('id', userId);
    debugPrint('🖼️ [Avatar] Updated users table');

    await _supabase.auth.updateUser(
      UserAttributes(data: {'avatar_url': urlWithBust}),
    );
    debugPrint('🖼️ [Avatar] Updated auth metadata');

    await fetchCurrentUser();
  }

  Future<UserModel?> getCurrentUser() async {
    final user = await _supabase.auth.getUser();
    _currentUser = UserModel.fromUser(user.user!);
    return _currentUser;
  }

  Future<bool> deleteAccount() async {
    try {
      final response = await _supabase.functions.invoke('delete-user');
      if (response.status == 200) {
        _currentUser = null;
        await _supabase.auth.signOut();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('계정 삭제 오류: $e');
      return false;
    }
  }
}
