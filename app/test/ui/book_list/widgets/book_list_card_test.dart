import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_list/widgets/book_list_card.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

void main() {
  testWidgets('swiping a card reveals status actions and updates the book', (
    tester,
  ) async {
    BookStatus? selectedStatus;

    await _pumpCard(
      tester,
      onStatusChanged: (status) async {
        selectedStatus = status;
        return true;
      },
    );

    await tester.drag(find.byType(BookListCard), const Offset(-240, 0));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('book-status-action-completed')),
      findsOneWidget,
    );

    await tester.tap(
      find.byKey(const ValueKey('book-status-action-completed')),
    );
    await tester.pumpAndSettle();

    expect(selectedStatus, BookStatus.completed);
  });

  testWidgets('screen-edge swipes remain available to the tab view', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        theme: BLabTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: DefaultTabController(
          length: 2,
          child: Scaffold(
            body: TabBarView(
              children: [
                BookListCard(book: _readingBook, onTap: () {}),
                const Center(child: Text('second tab')),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.timedDragFrom(
      const Offset(20, 120),
      const Offset(-240, 0),
      const Duration(milliseconds: 300),
    );
    await tester.pumpAndSettle();

    expect(find.text('second tab'), findsOneWidget);
  });
}

Future<void> _pumpCard(
  WidgetTester tester, {
  required Future<bool> Function(BookStatus status) onStatusChanged,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: const Locale('en'),
      theme: BLabTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: BookListCard(
          book: _readingBook,
          onTap: () {},
          onStatusChanged: onStatusChanged,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

final _readingBook = Book(
  id: 'book-1',
  title: 'Test Book',
  author: 'Test Author',
  startDate: DateTime(2026, 8, 1),
  targetDate: DateTime(2026, 8, 31),
  currentPage: 40,
  totalPages: 200,
  status: BookStatus.reading.value,
);
