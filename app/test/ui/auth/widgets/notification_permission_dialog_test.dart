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

  Future<void> pumpFailureDialog(
    WidgetTester tester, {
    required Locale locale,
    required VoidCallback onClose,
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
          body: NotificationPermissionFailureDialog(onClose: onClose),
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

  testWidgets('technical failure is distinct and dismissible in Korean',
      (tester) async {
    var closes = 0;

    await pumpFailureDialog(
      tester,
      locale: const Locale('ko'),
      onClose: () => closes++,
    );

    expect(find.text('알림 설정 변경에 실패했습니다'), findsOneWidget);
    expect(
      find.text('알림을 켜지 못했어요. 이 안내를 닫은 뒤 스위치를 다시 켜 주세요.'),
      findsOneWidget,
    );

    await tester.tap(find.text('확인'));
    await tester.pump(const Duration(milliseconds: 300));

    expect(closes, 1);
  });

  testWidgets('technical failure is distinct in English', (tester) async {
    await pumpFailureDialog(
      tester,
      locale: const Locale('en'),
      onClose: () {},
    );

    expect(find.text('Failed to change notification settings'), findsOneWidget);
    expect(
      find.text(
        "Couldn't enable notifications. Close this message, then turn the switch on again.",
      ),
      findsOneWidget,
    );
  });
}
