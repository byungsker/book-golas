import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/page_update_modal.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final locale in const [Locale('ko'), Locale('en')]) {
    for (final brightness in Brightness.values) {
      for (final width in const [320.0, 393.0]) {
        for (final keyboardInset in const [0.0, 280.0]) {
          testWidgets(
            'actions remain reachable at 200 percent in '
            '${locale.languageCode} ${brightness.name} ${width}px '
            'keyboard $keyboardInset',
            (tester) async {
              final semantics = tester.ensureSemantics();
              await _pumpModalHarness(
                tester,
                locale: locale,
                brightness: brightness,
                width: width,
                keyboardInset: keyboardInset,
              );

              await tester.tap(find.text('open'));
              await tester.pumpAndSettle();

              expect(tester.takeException(), isNull);
              expect(
                find.byKey(const ValueKey('page-update-modal-scroll')),
                findsOneWidget,
              );
              expect(
                find.byKey(const ValueKey('page-update-input')),
                findsOneWidget,
              );

              for (final key in const [
                ValueKey('page-update-submit'),
                ValueKey('page-update-cancel'),
              ]) {
                final action = find.byKey(key);
                await tester.ensureVisible(action);
                await tester.pumpAndSettle();
                expect(action.hitTestable(), findsOneWidget);
                expect(tester.takeException(), isNull);
              }

              final updateLabel =
                  locale.languageCode == 'ko' ? '업데이트' : 'Update';
              final cancelLabel = locale.languageCode == 'ko' ? '취소' : 'Cancel';
              expect(
                find.semantics.byLabel(updateLabel),
                findsOneWidget,
              );
              expect(
                find.semantics.byLabel(cancelLabel),
                findsOneWidget,
              );
              semantics.dispose();
            },
          );
        }
      }
    }
  }

  testWidgets('direct input submits while the keyboard inset is visible',
      (tester) async {
    PageUpdateResult? result;
    await _pumpModalHarness(
      tester,
      locale: const Locale('en'),
      brightness: Brightness.dark,
      width: 320,
      keyboardInset: 280,
      onResult: (value) => result = value,
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    final input = find.descendant(
      of: find.byKey(const ValueKey('page-update-input')),
      matching: find.byType(TextField),
    );
    await tester.ensureVisible(input);
    await tester.enterText(input, '12');
    await tester.pump();

    final submit = find.byKey(const ValueKey('page-update-submit'));
    await tester.ensureVisible(submit);
    await tester.pumpAndSettle();
    await tester.tap(submit);
    await tester.pumpAndSettle();

    expect(result?.page, 12);
    expect(result?.didNotRead, isFalse);
    expect(
        find.byKey(const ValueKey('page-update-modal-scroll')), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pumpModalHarness(
  WidgetTester tester, {
  required Locale locale,
  required Brightness brightness,
  required double width,
  required double keyboardInset,
  ValueChanged<PageUpdateResult>? onResult,
}) async {
  tester.view.physicalSize = Size(width, 720);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: ThemeData.light(),
      darkTheme: ThemeData.dark(),
      themeMode:
          brightness == Brightness.dark ? ThemeMode.dark : ThemeMode.light,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: const TextScaler.linear(2),
          viewInsets: EdgeInsets.only(bottom: keyboardInset),
          viewPadding: const EdgeInsets.only(bottom: 34),
        ),
        child: child!,
      ),
      home: Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              final result = await PageUpdateModal.show(
                context: context,
                currentPage: 0,
                totalPages: 144,
              );
              onResult?.call(result);
            },
            child: const Text('open'),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}
