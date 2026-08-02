import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/auth/widgets/notification_permission_dialog.dart';

void main() {
  Future<void> pumpDialog(
    WidgetTester tester, {
    required Locale locale,
    required VoidCallback onOpenSettings,
  }) {
    return tester.pumpWidget(
      MaterialApp(
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: NotificationPermissionDialog(
            onCancel: () {},
            onOpenSettings: onOpenSettings,
          ),
        ),
      ),
    );
  }

  testWidgets('Korean denial dialog provides a settings recovery action',
      (tester) async {
    var settingsOpens = 0;

    await pumpDialog(
      tester,
      locale: const Locale('ko'),
      onOpenSettings: () => settingsOpens++,
    );

    expect(find.text('설정에서 알림을 허용해 주세요'), findsOneWidget);
    expect(
      find.text('기기 설정에서 북골라스 알림을 켠 뒤 다시 시도해 주세요.'),
      findsOneWidget,
    );

    await tester.tap(find.text('설정 열기'));
    await tester.pump(const Duration(milliseconds: 300));

    expect(settingsOpens, 1);
  });

  testWidgets('English denial dialog provides a settings recovery action',
      (tester) async {
    var settingsOpens = 0;

    await pumpDialog(
      tester,
      locale: const Locale('en'),
      onOpenSettings: () => settingsOpens++,
    );

    expect(find.text('Allow notifications in Settings'), findsOneWidget);
    expect(
      find.text(
        'Turn on notifications for Bookgolas in your device settings, then try again.',
      ),
      findsOneWidget,
    );

    await tester.tap(find.text('Open Settings'));
    await tester.pump(const Duration(milliseconds: 300));

    expect(settingsOpens, 1);
  });
}
