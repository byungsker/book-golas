class AppConfig {
  static const String _supabaseUrlOverride = String.fromEnvironment(
    'SUPABASE_URL_OVERRIDE',
  );
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );
  static const String _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String _supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
  );
  static const String googleBooksApiKey = String.fromEnvironment(
    'GOOGLE_BOOKS_API_KEY',
  );
  static const String revenueCatPublicKey = String.fromEnvironment(
    'REVENUECAT_PUBLIC_KEY',
  );
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
  );
  static const String naverClientId = '';
  static const String naverClientSecret = '';

  static String get supabaseUrl {
    if (_supabaseUrlOverride.isNotEmpty) {
      return _supabaseUrlOverride;
    }
    if (_supabaseUrl.isNotEmpty) {
      return _supabaseUrl;
    }
    return isProduction
        ? 'https://enyxrgxixrnoazzgqyyd.supabase.co'
        : 'https://reoiqefoymdsqzpbouxi.supabase.co';
  }

  static String get supabaseAnonKey => _supabaseAnonKey;
  static const int maxSearchResults = 10;
  static const String apiVersion = '20131101';

  static bool get isProduction => environment == 'production';
  static bool get isDevelopment => environment == 'development';

  static void validateRuntimeConfig() {
    if (supabaseAnonKey.isEmpty) {
      throw Exception(
          'SUPABASE_ANON_KEY is required but not properly configured');
    }
  }
}
