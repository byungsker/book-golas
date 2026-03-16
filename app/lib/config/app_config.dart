import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static String get aladinApiKey => dotenv.env['ALADIN_TTB_KEY'] ?? '';

  static String get environment => dotenv.env['ENVIRONMENT'] ?? 'development';

  static String get aladinBaseUrl =>
      'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx';

  // Supabase 설정 (환경별 분기)
  static String get supabaseUrl {
    if (isProduction) {
      return dotenv.env['SUPABASE_URL_PROD'] ??
          dotenv.env['SUPABASE_URL'] ??
          'https://enyxrgxixrnoazzgqyyd.supabase.co';
    }
    return dotenv.env['SUPABASE_URL_DEV'] ??
        dotenv.env['SUPABASE_URL'] ??
        'https://reoiqefoymdsqzpbouxi.supabase.co';
  }

  static String get supabaseAnonKey {
    if (isProduction) {
      return dotenv.env['SUPABASE_ANON_KEY_PROD'] ??
          dotenv.env['SUPABASE_ANON_KEY'] ??
          '';
    }
    return dotenv.env['SUPABASE_ANON_KEY_DEV'] ??
        dotenv.env['SUPABASE_ANON_KEY'] ??
        '';
  }

  // Google Books API 설정
  static String get googleBooksApiKey =>
      dotenv.env['GOOGLE_BOOKS_API_KEY'] ?? '';

  // Google Cloud Vision API 설정
  static String get googleCloudVisionApiKey =>
      dotenv.env['GOOGLE_CLOUD_VISION_API_KEY'] ?? '';

  // Naver Books API 설정
  static String get naverClientId => dotenv.env['NAVER_CLIENT_ID'] ?? '';
  static String get naverClientSecret =>
      dotenv.env['NAVER_CLIENT_SECRET'] ?? '';

  // RevenueCat 설정
  static String get revenueCatPublicKey =>
      dotenv.env['REVENUECAT_PUBLIC_KEY'] ?? '';

  static const int maxSearchResults = 10;
  static const String apiVersion = '20131101';

  static bool get isProduction => environment == 'production';
  static bool get isDevelopment => environment == 'development';

  static void validateApiKeys() {
    if (aladinApiKey.isEmpty) {
      throw Exception(
          'ALADIN_TTB_KEY is required but not found in environment variables');
    }
    if (supabaseAnonKey.isEmpty) {
      throw Exception(
          'SUPABASE_ANON_KEY is required but not properly configured');
    }
  }

  static bool get hasGoogleCloudVisionApiKey =>
      googleCloudVisionApiKey.isNotEmpty;
}
