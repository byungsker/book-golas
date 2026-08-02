import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_list/widgets/completed_book_card.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final locale in const [Locale('ko'), Locale('en')]) {
    for (final brightness in Brightness.values) {
      for (final width in const [320.0, 393.0]) {
        testWidgets(
          'completed metadata remains reachable at 200 percent in '
          '${locale.languageCode} ${brightness.name} ${width}px',
          (tester) async {
            await _pumpCard(
              tester,
              locale: locale,
              brightness: brightness,
              width: width,
            );

            final completedLabel = locale.languageCode == 'ko'
                ? '32일만에 완독'
                : 'Completed in 32 days';
            final pagesLabel =
                locale.languageCode == 'ko' ? '108 페이지' : '108 pages';
            final dateLabel = locale.languageCode == 'ko'
                ? '완독: 2026.08.02'
                : 'Completed: 2026.08.02';

            expect(tester.takeException(), isNull);
            expect(find.text(_bookTitle), findsOneWidget);
            expect(find.text(completedLabel), findsOneWidget);
            expect(find.text(pagesLabel), findsOneWidget);
            expect(find.text(dateLabel), findsOneWidget);

            final completionBadge = tester.widget<Container>(
              find.byKey(const Key('completedBookCompletionBadge')),
            );
            final completionText =
                tester.widget<Text>(find.text(completedLabel));
            final completionBackground =
                (completionBadge.decoration! as BoxDecoration).color!;
            final renderedCompletionBackground = Color.alphaBlend(
              completionBackground,
              brightness == Brightness.dark
                  ? BLabColors.surfaceDark
                  : BLabColors.surfaceLight,
            );
            expect(
              _contrastRatio(
                completionText.style!.color!,
                renderedCompletionBackground,
              ),
              greaterThanOrEqualTo(3),
            );

            final cardRect = tester.getRect(find.byType(CompletedBookCard));
            for (final label in [completedLabel, pagesLabel, dateLabel]) {
              final labelRect = tester.getRect(find.text(label));
              expect(labelRect.left, greaterThanOrEqualTo(cardRect.left));
              expect(labelRect.right, lessThanOrEqualTo(cardRect.right));
            }
          },
        );
      }
    }
  }

  for (final locale in const [Locale('ko'), Locale('en')]) {
    for (final brightness in Brightness.values) {
      for (final width in const [320.0, 393.0]) {
        testWidgets(
          'completed metadata remains available at default scale in '
          '${locale.languageCode} ${brightness.name} ${width}px',
          (tester) async {
            await _pumpCard(
              tester,
              locale: locale,
              brightness: brightness,
              width: width,
              textScale: 1,
            );

            final completedLabel = locale.languageCode == 'ko'
                ? '32일만에 완독'
                : 'Completed in 32 days';
            final pagesLabel =
                locale.languageCode == 'ko' ? '108 페이지' : '108 pages';
            final dateLabel = locale.languageCode == 'ko'
                ? '완독: 2026.08.02'
                : 'Completed: 2026.08.02';

            expect(tester.takeException(), isNull);
            expect(find.text(_bookTitle), findsOneWidget);
            expect(find.text(completedLabel), findsOneWidget);
            expect(find.text(pagesLabel), findsOneWidget);
            expect(find.text(dateLabel), findsOneWidget);
          },
        );
      }
    }
  }

  testWidgets('completed card remains tappable at 200 percent', (tester) async {
    var tapCount = 0;
    await _pumpCard(
      tester,
      locale: const Locale('en'),
      brightness: Brightness.dark,
      width: 320,
      onTap: () => tapCount++,
    );

    await tester.tap(find.byType(CompletedBookCard));
    await tester.pump();

    expect(tapCount, 1);
    expect(tester.takeException(), isNull);
  });

  for (final locale in const [Locale('ko'), Locale('en')]) {
    for (final brightness in Brightness.values) {
      for (final width in const [160.0, 233.0]) {
        testWidgets(
          'achievement badge remains reachable at 200 percent in '
          '${locale.languageCode} ${brightness.name} ${width}px',
          (tester) async {
            await _pumpAchievementBadge(
              tester,
              locale: locale,
              brightness: brightness,
              width: width,
            );

            final label = locale.languageCode == 'ko'
                ? '달성률 100%'
                : 'Achievement rate 100%';
            final badgeRect = tester.getRect(
              find.byKey(const Key('completedBookAchievementBadge')),
            );
            final labelRect = tester.getRect(find.text(label));
            final text = tester.widget<Text>(find.text(label));
            final badge = tester.widget<Container>(
              find.byKey(const Key('completedBookAchievementBadge')),
            );
            final background = (badge.decoration! as BoxDecoration).color!;

            expect(tester.takeException(), isNull);
            expect(labelRect.left, greaterThanOrEqualTo(badgeRect.left));
            expect(labelRect.right, lessThanOrEqualTo(badgeRect.right));
            expect(
              _contrastRatio(text.style!.color!, background),
              greaterThanOrEqualTo(3),
            );
          },
        );
      }
    }
  }
}

const _bookTitle = 'The Little Prince: An Illustrated Anniversary Edition';

Future<void> _pumpCard(
  WidgetTester tester, {
  required Locale locale,
  required Brightness brightness,
  required double width,
  double textScale = 2,
  VoidCallback? onTap,
}) async {
  tester.view.physicalSize = Size(width, 720);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final book = Book(
    title: _bookTitle,
    startDate: DateTime(2026, 7, 1),
    targetDate: DateTime(2026, 8, 15),
    updatedAt: DateTime(2026, 8, 2),
    currentPage: 108,
    totalPages: 108,
    status: 'completed',
  );

  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: BLabTheme.light,
      darkTheme: BLabTheme.dark,
      themeMode:
          brightness == Brightness.dark ? ThemeMode.dark : ThemeMode.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: TextScaler.linear(textScale),
        ),
        child: child!,
      ),
      home: Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: CompletedBookCard(
            book: book,
            onTap: onTap ?? () {},
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

Future<void> _pumpAchievementBadge(
  WidgetTester tester, {
  required Locale locale,
  required Brightness brightness,
  required double width,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: BLabTheme.light,
      darkTheme: BLabTheme.dark,
      themeMode:
          brightness == Brightness.dark ? ThemeMode.dark : ThemeMode.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: const TextScaler.linear(2),
        ),
        child: child!,
      ),
      home: Scaffold(
        body: Center(
          child: SizedBox(
            width: width,
            child: const CompletedBookAchievementBadge(rate: 100),
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

double _contrastRatio(Color foreground, Color background) {
  final foregroundLuminance = foreground.computeLuminance();
  final backgroundLuminance = background.computeLuminance();
  final lighter = foregroundLuminance > backgroundLuminance
      ? foregroundLuminance
      : backgroundLuminance;
  final darker = foregroundLuminance > backgroundLuminance
      ? backgroundLuminance
      : foregroundLuminance;
  return (lighter + 0.05) / (darker + 0.05);
}
