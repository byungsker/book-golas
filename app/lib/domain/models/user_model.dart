import 'package:supabase_flutter/supabase_flutter.dart';

class UserModel {
  final String id;
  final String? nickname;
  final String? email;
  final String? name;
  final String? avatarUrl;
  final Map<String, dynamic>? metadata;
  final DateTime? createdAt;
  final DateTime? lastSignInAt;

  UserModel({
    required this.id,
    this.nickname,
    this.email,
    this.name,
    this.avatarUrl,
    this.metadata,
    this.createdAt,
    this.lastSignInAt,
  });

  factory UserModel.fromUser(User user) {
    return UserModel(
      id: user.id,
      nickname: user.userMetadata?['nickname'] as String?,
      email: user.email,
      name: user.userMetadata?['name'] as String?,
      avatarUrl: user.userMetadata?['avatar_url'] as String?,
      metadata: user.userMetadata,
      createdAt: DateTime.tryParse(user.createdAt),
      lastSignInAt: DateTime.tryParse(user.lastSignInAt ?? ''),
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      nickname: json['nickname'] as String?,
      email: json['email'] as String?,
      name: json['name'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      lastSignInAt: json['last_sign_in_at'] != null
          ? DateTime.parse(json['last_sign_in_at'])
          : null,
    );
  }

  UserModel copyWith({
    String? id,
    String? nickname,
    String? email,
    String? name,
    String? avatarUrl,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? lastSignInAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      nickname: nickname ?? this.nickname,
      email: email ?? this.email,
      name: name ?? this.name,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      lastSignInAt: lastSignInAt ?? this.lastSignInAt,
    );
  }
}
