import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/reading_chart/view_model/reading_chart_view_model.dart';
import 'package:book_golas/ui/reading_chart/widgets/reading_stats_share_card.dart';

class _MockReadingChartViewModel extends Mock
    implements ReadingChartViewModel {}

void main() {
  group('ReadingStatsShareCard', () {
    testWidgets('renders localized english labels',
        (WidgetTester tester) async {
      final vm = _MockReadingChartViewModel();
      when(() => vm.completedBooks).thenReturn(8);
      when(() => vm.totalHighlights).thenReturn(14);
      when(() => vm.totalNotes).thenReturn(6);
      when(() => vm.totalPhotos).thenReturn(3);
      when(() => vm.goalRate).thenReturn(0.7);
      when(() => vm.genreDistribution).thenReturn({
        'Essay': 4,
        'Humanities': 2,
        'Science': 1,
      });

      await tester.pumpWidget(
        _buildTestApp(
          locale: const Locale('en'),
          child: ReadingStatsShareCard(vm: vm),
        ),
      );

      expect(find.text('My Reading Record'), findsOneWidget);
      expect(find.text('Books finished'), findsOneWidget);
      expect(find.text('Records'), findsOneWidget);
      expect(find.text('Photos'), findsOneWidget);
      expect(find.text('Goal achievement'), findsOneWidget);
      expect(find.text('Top genres'), findsOneWidget);
      expect(find.text('Bookgolas'), findsOneWidget);
    });
  });
}

Widget _buildTestApp({required Locale locale, required Widget child}) {
  return MaterialApp(
    locale: locale,
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: AppLocalizations.supportedLocales,
    home: Scaffold(body: Center(child: child)),
  );
}
