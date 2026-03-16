import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:book_golas/ui/core/theme/app_theme.dart';
import 'package:book_golas/ui/core/theme/app_colors.dart';

void main() {
  group('BLabTheme', () {
    group('Light theme', () {
      test('returns valid ThemeData', () {
        final theme = BLabTheme.light;
        expect(theme, isA<ThemeData>());
      });

      test('has light brightness', () {
        final theme = BLabTheme.light;
        expect(theme.brightness, equals(Brightness.light));
      });

      test('uses Material 3', () {
        final theme = BLabTheme.light;
        expect(theme.useMaterial3, isTrue);
      });

      test('has correct scaffold background color', () {
        final theme = BLabTheme.light;
        expect(
          theme.scaffoldBackgroundColor,
          equals(BLabColors.scaffoldLight),
        );
      });

      test('primary color is correctly set in colorScheme', () {
        final theme = BLabTheme.light;
        expect(
          theme.colorScheme.primary,
          isNotNull,
        );
      });
    });

    group('Dark theme', () {
      test('returns valid ThemeData', () {
        final theme = BLabTheme.dark;
        expect(theme, isA<ThemeData>());
      });

      test('has dark brightness', () {
        final theme = BLabTheme.dark;
        expect(theme.brightness, equals(Brightness.dark));
      });

      test('uses Material 3', () {
        final theme = BLabTheme.dark;
        expect(theme.useMaterial3, isTrue);
      });

      test('has correct scaffold background color', () {
        final theme = BLabTheme.dark;
        expect(
          theme.scaffoldBackgroundColor,
          equals(BLabColors.scaffoldDark),
        );
      });
    });

    group('Input decoration theme', () {
      test('light theme has filled input decoration', () {
        final theme = BLabTheme.light;
        expect(theme.inputDecorationTheme.filled, isTrue);
      });

      test('dark theme has filled input decoration', () {
        final theme = BLabTheme.dark;
        expect(theme.inputDecorationTheme.filled, isTrue);
      });
    });

    group('Button themes', () {
      test('light theme has elevated button theme', () {
        final theme = BLabTheme.light;
        expect(theme.elevatedButtonTheme, isNotNull);
      });

      test('dark theme has elevated button theme', () {
        final theme = BLabTheme.dark;
        expect(theme.elevatedButtonTheme, isNotNull);
      });
    });
  });
}
