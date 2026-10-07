import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/deep_link_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/deep_link_recovery_screen.dart';

void main() {
  Future<void> pumpScreen(WidgetTester tester, Locale locale) {
    return tester.pumpWidget(
      MaterialApp(
        locale: locale,
        theme: BLabTheme.light,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: const DeepLinkRecoveryScreen(),
      ),
    );
  }

  testWidgets('missing book recovery is localized in Korean', (tester) async {
    await pumpScreen(tester, const Locale('ko'));

    expect(find.text('책을 열 수 없습니다'), findsOneWidget);
    expect(
      find.text(
        '요청한 책이 삭제되었거나 현재 계정에서 더 이상 볼 수 없습니다. '
        '서재에서 책을 확인한 뒤 다시 시도해 주세요.',
      ),
      findsOneWidget,
    );
    expect(find.text('서재로 돌아가기'), findsOneWidget);
  });

  testWidgets('missing book recovery is localized in English', (tester) async {
    await pumpScreen(tester, const Locale('en'));

    expect(find.text('Book unavailable'), findsOneWidget);
    expect(
      find.text(
        'This book may have been deleted or is no longer available for your '
        'account. Check your library and try again.',
      ),
      findsOneWidget,
    );
    expect(find.text('Return to library'), findsOneWidget);
  });

  testWidgets('recovery action dismisses the deep-link route', (tester) async {
    final navigatorKey = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigatorKey,
        locale: const Locale('ko'),
        theme: BLabTheme.light,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: const Scaffold(body: Text('home')),
      ),
    );

    DeepLinkNavigator.open(
      navigatorKey.currentState!,
      DeepLinkRecoveryRoute.bookUnavailable(),
      useReplacement: false,
    );
    await tester.pumpAndSettle();

    expect(find.byType(DeepLinkRecoveryScreen), findsOneWidget);
    await tester.tap(find.text('서재로 돌아가기'));
    await tester.pumpAndSettle();

    expect(find.text('home'), findsOneWidget);
    expect(find.byType(DeepLinkRecoveryScreen), findsNothing);
  });
}
