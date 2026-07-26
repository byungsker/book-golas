import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/book_share_composer.dart';

void main() {
  testWidgets('merges selected notes and returns editable share text', (
    WidgetTester tester,
  ) async {
    _configureViewport(tester);
    BookShareComposerResult? result;
    final book = Book(
      id: 'book-1',
      title: 'Atomic Habits',
      startDate: DateTime(2026, 3, 1),
      targetDate: DateTime(2026, 3, 31),
      totalPages: 240,
      status: BookStatus.reading.value,
    );
    final notes = [
      const BookShareNote(id: 'note-1', text: '첫 번째 기록', pageNumber: 12),
      const BookShareNote(id: 'note-2', text: '두 번째 기록', pageNumber: 44),
      const BookShareNote(id: 'note-3', text: '세 번째 기록', pageNumber: 88),
    ];

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ko'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: Builder(
            builder: (context) {
              return ElevatedButton(
                onPressed: () async {
                  result = await showBookShareComposer(
                    context: context,
                    book: book,
                    notes: notes,
                  );
                },
                child: const Text('open'),
              );
            },
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('공유 카드 꾸미기'), findsOneWidget);
    var textField = tester.widget<TextField>(find.byType(TextField).last);
    expect(textField.controller!.text, '첫 번째 기록\n\n두 번째 기록');

    await tester.tap(find.text('세 번째 기록'));
    await tester.pump();
    textField = tester.widget<TextField>(find.byType(TextField).last);
    expect(
      textField.controller!.text,
      '첫 번째 기록\n\n두 번째 기록\n\n세 번째 기록',
    );

    await tester.enterText(
      find.byType(TextField).last,
      '첫 번째 기록\n\n두 번째 기록\n\n세 번째 기록\n\n직접 다듬은 문장',
    );
    await tester.tap(find.text('세 번째 기록'));
    await tester.pump();
    textField = tester.widget<TextField>(find.byType(TextField).last);
    expect(
      textField.controller!.text,
      '첫 번째 기록\n\n두 번째 기록\n\n직접 다듬은 문장',
    );

    await tester.tap(find.text('세 번째 기록'));
    await tester.pump();
    textField = tester.widget<TextField>(find.byType(TextField).last);
    expect(
      textField.controller!.text,
      '첫 번째 기록\n\n두 번째 기록\n\n직접 다듬은 문장\n\n세 번째 기록',
    );

    await tester.tap(find.text('공유 이미지 만들기'));
    await tester.pumpAndSettle();

    expect(
      result?.noteText,
      '첫 번째 기록\n\n두 번째 기록\n\n직접 다듬은 문장\n\n세 번째 기록',
    );
  });

  testWidgets('keeps a large note list usable with large text', (
    WidgetTester tester,
  ) async {
    _configureViewport(tester);
    final book = Book(
      id: 'book-large',
      title: 'Atomic Habits',
      startDate: DateTime(2026, 3, 1),
      targetDate: DateTime(2026, 3, 31),
      totalPages: 240,
      status: BookStatus.reading.value,
    );
    final notes = List.generate(
      12,
      (index) => BookShareNote(
        id: 'note-$index',
        text: '긴 독서 기록 ${index + 1} — 다음 행동을 더 분명하게 만든다.',
        pageNumber: index + 1,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ko'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        builder: (context, child) {
          return MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: const TextScaler.linear(2),
            ),
            child: child!,
          );
        },
        home: Scaffold(
          body: Builder(
            builder: (context) {
              return ElevatedButton(
                onPressed: () => showBookShareComposer(
                  context: context,
                  book: book,
                  notes: notes,
                ),
                child: const Text('open'),
              );
            },
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('공유 카드 꾸미기'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('marks an intentionally empty note as a deliberate omission', (
    WidgetTester tester,
  ) async {
    _configureViewport(tester);
    BookShareComposerResult? result;
    final book = Book(
      id: 'book-clear',
      title: 'Essentialism',
      startDate: DateTime(2026, 3, 1),
      targetDate: DateTime(2026, 3, 31),
      totalPages: 240,
      status: BookStatus.reading.value,
      review: 'Existing review must not return.',
    );

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: Builder(
            builder: (context) {
              return ElevatedButton(
                onPressed: () async {
                  result = await showBookShareComposer(
                    context: context,
                    book: book,
                    notes: const [
                      BookShareNote(id: 'note-1', text: 'A note'),
                    ],
                  );
                },
                child: const Text('open'),
              );
            },
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '');
    await tester.tap(find.text('Create share image'));
    await tester.pumpAndSettle();

    expect(result?.noteText, isNull);
    expect(result?.useBookReviewFallback, isFalse);
  });
}

void _configureViewport(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(500, 900);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
}
