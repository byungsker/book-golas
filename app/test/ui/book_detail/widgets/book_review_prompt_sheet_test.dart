import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/sheets/book_review_prompt_sheet.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final locale in const [Locale('ko'), Locale('en')]) {
    for (final brightness in Brightness.values) {
      for (final width in const [320.0, 393.0]) {
        testWidgets(
          'completion prompt remains reachable at 200 percent in '
          '${locale.languageCode} ${brightness.name} ${width}px',
          (tester) async {
            await _pumpSheetHarness(
              tester,
              locale: locale,
              brightness: brightness,
              width: width,
            );

            await tester.tap(find.text('open'));
            await tester.pumpAndSettle();

            final expectedTitle = locale.languageCode == 'ko'
                ? '완독을 축하합니다!'
                : 'Congratulations on finishing!';
            final expectedPrompt = locale.languageCode == 'ko'
                ? '독서의 여운이 남아있을 때\n독후감을 작성해보시겠어요?'
                : 'While the afterglow of reading is still fresh,\n'
                    'would you like to write a review?';
            final laterLabel = locale.languageCode == 'ko' ? '나중에' : 'Later';
            final reviewLabel =
                locale.languageCode == 'ko' ? '독후감 쓰러가기' : 'Write Review';

            expect(tester.takeException(), isNull);
            expect(
              find.byKey(const ValueKey('book-review-prompt-scroll')),
              findsOneWidget,
            );
            expect(find.text(expectedTitle), findsOneWidget);
            expect(find.text(expectedPrompt), findsOneWidget);
            expect(find.text(_bookTitle), findsOneWidget);

            for (final key in const [
              ValueKey('book-review-prompt-write'),
              ValueKey('book-review-prompt-later'),
            ]) {
              final action = find.byKey(key);
              await tester.ensureVisible(action);
              await tester.pumpAndSettle();
              expect(action.hitTestable(), findsOneWidget);
              expect(tester.takeException(), isNull);
            }

            expect(find.semantics.byLabel(reviewLabel), findsOneWidget);
            expect(find.semantics.byLabel(laterLabel), findsOneWidget);
          },
        );
      }
    }
  }

  testWidgets('later closes the prompt without opening a review',
      (tester) async {
    bool? shouldWriteReview;
    await _pumpSheetHarness(
      tester,
      locale: const Locale('ko'),
      brightness: Brightness.light,
      width: 320,
      onResult: (value) => shouldWriteReview = value,
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(
      find.byKey(const ValueKey('book-review-prompt-later')),
    );
    await tester.tap(find.byKey(const ValueKey('book-review-prompt-later')));
    await tester.pumpAndSettle();

    expect(shouldWriteReview, isFalse);
    expect(
      find.byKey(const ValueKey('book-review-prompt-scroll')),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('write review closes the prompt with a positive result',
      (tester) async {
    bool? shouldWriteReview;
    await _pumpSheetHarness(
      tester,
      locale: const Locale('en'),
      brightness: Brightness.dark,
      width: 393,
      onResult: (value) => shouldWriteReview = value,
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(
      find.byKey(const ValueKey('book-review-prompt-write')),
    );
    await tester.tap(find.byKey(const ValueKey('book-review-prompt-write')));
    await tester.pumpAndSettle();

    expect(shouldWriteReview, isTrue);
    expect(
      find.byKey(const ValueKey('book-review-prompt-scroll')),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
  });
}

const _bookTitle =
    'A Very Long Book Title That Must Remain Available Without Truncation';

Future<void> _pumpSheetHarness(
  WidgetTester tester, {
  required Locale locale,
  required Brightness brightness,
  required double width,
  ValueChanged<bool>? onResult,
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
          viewPadding: const EdgeInsets.only(bottom: 34),
        ),
        child: child!,
      ),
      home: Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              final result = await showBookReviewPromptSheet(
                context: context,
                bookTitle: _bookTitle,
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
