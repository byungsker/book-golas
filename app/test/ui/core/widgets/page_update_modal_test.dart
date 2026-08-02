import 'dart:ui' show SemanticsAction, Tristate;

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
              try {
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
                expect(
                  find.byKey(const ValueKey('page-update-dial')),
                  findsNothing,
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
                final cancelLabel =
                    locale.languageCode == 'ko' ? '취소' : 'Cancel';
                final inputLabel = locale.languageCode == 'ko'
                    ? '새 페이지 번호'
                    : 'New Page Number';
                final inputSemantics = find.bySemanticsLabel(
                  RegExp(inputLabel),
                );
                final inputNode = tester.getSemantics(inputSemantics);
                expect(inputNode.label, contains(inputLabel));
                expect(inputNode.flagsCollection.isTextField, isTrue);
                expect(
                  inputNode.flagsCollection.isEnabled,
                  Tristate.isTrue,
                );
                expect(
                  inputNode.flagsCollection.isFocused,
                  isNot(Tristate.none),
                );
                final inputData = inputNode.getSemanticsData();
                expect(inputData.hasAction(SemanticsAction.tap), isTrue);
                expect(inputData.hasAction(SemanticsAction.focus), isTrue);
                expect(
                  find.semantics.byLabel(updateLabel),
                  findsOneWidget,
                );
                expect(
                  find.semantics.byLabel(cancelLabel),
                  findsOneWidget,
                );
              } finally {
                semantics.dispose();
              }
            },
          );
        }
      }
    }
  }

  for (final width in const [320.0, 393.0]) {
    for (final page in const [12, 108]) {
      testWidgets(
        'direct input submits $page at ${width}px with keyboard visible',
        (tester) async {
          PageUpdateResult? result;
          final semantics = tester.ensureSemantics();
          try {
            await _pumpModalHarness(
              tester,
              locale: const Locale('en'),
              brightness: Brightness.dark,
              width: width,
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
            await tester.enterText(input, '$page');
            await tester.pump();

            final inputNode = tester.getSemantics(
              find.bySemanticsLabel(RegExp('New Page Number')),
            );
            expect(inputNode.label, contains('New Page Number'));
            expect(inputNode.value, '$page');
            expect(inputNode.flagsCollection.isTextField, isTrue);
            expect(inputNode.flagsCollection.isFocused, Tristate.isTrue);
            expect(
              inputNode.getSemanticsData().hasAction(SemanticsAction.setText),
              isTrue,
            );

            final submit = find.byKey(const ValueKey('page-update-submit'));
            await tester.ensureVisible(submit);
            await tester.pumpAndSettle();
            await tester.tap(submit);
            await tester.pumpAndSettle();

            expect(result?.page, page);
            expect(result?.didNotRead, isFalse);
            expect(
              find.byKey(const ValueKey('page-update-modal-scroll')),
              findsNothing,
            );
            expect(tester.takeException(), isNull);
          } finally {
            semantics.dispose();
          }
        },
      );
    }
  }

  testWidgets('default next page submits without wheel interaction',
      (tester) async {
    PageUpdateResult? result;
    await _pumpModalHarness(
      tester,
      locale: const Locale('ko'),
      brightness: Brightness.dark,
      width: 320,
      keyboardInset: 0,
      onResult: (value) => result = value,
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    final input = find.descendant(
      of: find.byKey(const ValueKey('page-update-input')),
      matching: find.byType(TextField),
    );
    expect(tester.widget<TextField>(input).controller?.text, '1');

    await tester
        .ensureVisible(find.byKey(const ValueKey('page-update-submit')));
    await tester.tap(find.byKey(const ValueKey('page-update-submit')));
    await tester.pumpAndSettle();

    expect(result?.page, 1);
    expect(result?.didNotRead, isFalse);
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
