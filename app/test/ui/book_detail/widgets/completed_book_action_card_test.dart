import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/completed_book_action_card.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

void main() {
  for (final locale in const [Locale('ko'), Locale('en')]) {
    testWidgets(
      'completed actions stay inline at default scale on 393px in ${locale.languageCode}',
      (tester) async {
        final actions = _ActionCounts();
        await _pumpCompletedActions(
          tester,
          testCase: (
            locale: locale,
            themeMode: ThemeMode.light,
            width: 393.0,
          ),
          actions: actions,
          textScale: 1,
        );

        expect(tester.takeException(), isNull);
        expect(
          find.byKey(const ValueKey('completed-book-action-title-inline')),
          findsNWidgets(2),
        );
        expect(
          find.byKey(
            const ValueKey('completed-book-action-description-inline'),
          ),
          findsNWidgets(2),
        );
        expect(
          find.byKey(const ValueKey('completed-book-action-title-stacked')),
          findsNothing,
        );
        expect(
          find.byKey(
            const ValueKey('completed-book-action-description-stacked'),
          ),
          findsNothing,
        );
      },
    );
  }

  final testCases = <({Locale locale, ThemeMode themeMode, double width})>[
    for (final locale in const [Locale('ko'), Locale('en')])
      for (final themeMode in const [ThemeMode.light, ThemeMode.dark])
        for (final width in const [320.0, 393.0])
          (locale: locale, themeMode: themeMode, width: width),
  ];

  for (final testCase in testCases) {
    final label =
        '${testCase.locale.languageCode} ${testCase.themeMode.name} ${testCase.width.toInt()}px';

    testWidgets(
        'completed actions reflow without truncation at 200 percent in $label',
        (
      tester,
    ) async {
      final actions = _ActionCounts();
      final semantics = tester.ensureSemantics();

      await _pumpCompletedActions(
        tester,
        testCase: testCase,
        actions: actions,
        textScale: 2,
      );

      final isKorean = testCase.locale.languageCode == 'ko';
      final reviewTitle = isKorean ? '독후감 쓰러가기' : 'Write Review';
      final reviewDescription =
          isKorean ? '생각을 기록해보세요' : 'Record your thoughts';
      final restartTitle = isKorean ? '새로운 독서 시작하기' : 'Continue Reading';
      final restartDescription =
          isKorean ? '독서 목표를 달성해보세요!' : 'Achieve your reading goal!';

      expect(tester.takeException(), isNull);
      expect(find.byKey(const ValueKey('completed-book-action-title-stacked')),
          findsNWidgets(2));
      expect(
          find.byKey(
              const ValueKey('completed-book-action-description-stacked')),
          findsNWidgets(2));
      _expectFitsInsideCard(
          tester, 'completed-book-review-action', reviewTitle);
      _expectFitsInsideCard(
          tester, 'completed-book-review-action', reviewDescription);
      _expectFitsInsideCard(
          tester, 'completed-book-restart-action', restartTitle);
      _expectFitsInsideCard(
          tester, 'completed-book-restart-action', restartDescription);

      final reviewCard =
          find.byKey(const ValueKey('completed-book-review-action'));
      final restartCard =
          find.byKey(const ValueKey('completed-book-restart-action'));
      expect(tester.getSize(reviewCard).shortestSide, greaterThanOrEqualTo(48));
      expect(
          tester.getSize(restartCard).shortestSide, greaterThanOrEqualTo(48));
      expect(find.semantics.byLabel('$reviewTitle. $reviewDescription'),
          findsOneWidget);
      final restartSemantics =
          find.semantics.byLabel('$restartTitle. $restartDescription');
      expect(restartSemantics, findsOneWidget);

      await tester.tap(reviewCard);
      await tester.pump();
      tester.semantics.tap(restartSemantics);
      await tester.pump();
      expect(actions.review, 1);
      expect(actions.restart, 1);
      semantics.dispose();
    });
  }
}

void _expectFitsInsideCard(WidgetTester tester, String cardKey, String text) {
  final cardRect = tester.getRect(find.byKey(ValueKey(cardKey)));
  final textRect = tester.getRect(find.text(text));
  expect(textRect.left, greaterThanOrEqualTo(cardRect.left));
  expect(textRect.right, lessThanOrEqualTo(cardRect.right));
  expect(textRect.top, greaterThanOrEqualTo(cardRect.top));
  expect(textRect.bottom, lessThanOrEqualTo(cardRect.bottom));
}

Future<void> _pumpCompletedActions(
  WidgetTester tester, {
  required ({Locale locale, ThemeMode themeMode, double width}) testCase,
  required _ActionCounts actions,
  required double textScale,
}) async {
  tester.view.physicalSize = Size(testCase.width, 852);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
      locale: testCase.locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      theme: BLabTheme.light,
      darkTheme: BLabTheme.dark,
      themeMode: testCase.themeMode,
      builder: (context, appChild) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: TextScaler.linear(textScale),
        ),
        child: appChild!,
      ),
      home: Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Builder(
            builder: (context) {
              final l10n = AppLocalizations.of(context);
              return Column(
                children: [
                  CompletedBookActionCard(
                    cardKey: const ValueKey('completed-book-review-action'),
                    title: l10n.bookDetailWriteReview,
                    description: l10n.bookDetailRecordThoughts,
                    icon: CupertinoIcons.pencil_outline,
                    onTap: () => actions.review += 1,
                  ),
                  const SizedBox(height: 12),
                  CompletedBookActionCard(
                    cardKey: const ValueKey('completed-book-restart-action'),
                    title: l10n.bookDetailContinueReading,
                    description: l10n.bookDetailAchieveGoal,
                    icon: Icons.refresh_rounded,
                    onTap: () => actions.restart += 1,
                  ),
                ],
              );
            },
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

class _ActionCounts {
  int review = 0;
  int restart = 0;
}
