import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/data/repositories/reading_progress_repository.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_list/view_model/book_list_view_model.dart';
import 'package:book_golas/ui/book_list/widgets/book_list_screen.dart';
import 'package:book_golas/ui/core/widgets/scrollable_tab_bar.dart';

void main() {
  testWidgets('reduced motion synchronizes the selected book status tab', (
    tester,
  ) async {
    final viewModel = BookListViewModel(
      readingProgressRepository: _FakeReadingProgressRepository(),
    );
    addTearDown(viewModel.dispose);

    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: viewModel,
        child: const MaterialApp(
          locale: Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: MediaQuery(
            data: MediaQueryData(disableAnimations: true),
            child: Scaffold(body: BookListScreen()),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    viewModel.jumpToTab(4);
    await tester.pump();

    final selectedSemantics = tester.widget<Semantics>(
      find.byKey(const ValueKey('scrollable-tab-4')),
    );
    expect(selectedSemantics.properties.selected, isTrue);
    final tabBar = tester.widget<ScrollableTabBar>(
      find.byType(ScrollableTabBar),
    );
    expect(tabBar.controller.index, 4);
    expect(tabBar.controller.animation?.value, 4);
  });
}

class _FakeReadingProgressRepository implements ReadingProgressRepository {
  @override
  Future<Map<String, int>> getTodayPagesReadByBook() async => {};
}
