import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_bottom_bar.dart';

void main() {
  for (final testCase in [
    (
      locale: const Locale('ko'),
      width: 393.0,
      labels: const ['홈', '서재', '상태', '캘린더', 'MY'],
    ),
    (
      locale: const Locale('en'),
      width: 393.0,
      labels: const ['Home', 'Library', 'Stats', 'Calendar', 'MY'],
    ),
    (
      locale: const Locale('ko'),
      width: 320.0,
      labels: const ['홈', '서재', '상태', '캘린더', 'MY'],
    ),
    (
      locale: const Locale('en'),
      width: 320.0,
      labels: const ['Home', 'Library', 'Stats', 'Calendar', 'MY'],
    ),
  ]) {
    testWidgets(
        'bottom navigation preserves 200 percent ${testCase.locale.languageCode} labels at ${testCase.width.toInt()}px',
        (tester) async {
      final semantics = tester.ensureSemantics();
      var selectedIndex = -1;
      var searchCount = 0;
      tester.view.physicalSize = Size(testCase.width, 852);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          locale: testCase.locale,
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
            ),
            child: child!,
          ),
          home: Scaffold(
            bottomNavigationBar: BLabBottomBar(
              selectedIndex: 4,
              onTabSelected: (index) => selectedIndex = index,
              onSearchTap: (_, __) => searchCount += 1,
            ),
          ),
        ),
      );

      expect(tester.takeException(), isNull);
      for (var index = 0; index < testCase.labels.length; index += 1) {
        final labelFinder = find.byKey(ValueKey('bottom-nav-label-$index'));
        final labelText = tester.widget<Text>(labelFinder);
        final labelParagraph = tester.renderObject<RenderParagraph>(
          labelFinder,
        );
        final itemNode = tester.getSemantics(
          find.byKey(ValueKey('bottom-nav-item-$index')),
        );
        expect(
          labelText.data?.replaceAll('\u200B', ''),
          testCase.labels[index],
        );
        expect(labelText.maxLines, 4);
        expect(labelText.textScaler, isNull);
        expect(labelParagraph.textScaler.scale(10), 20);
        expect(labelParagraph.didExceedMaxLines, isFalse);
        expect(itemNode.label, testCase.labels[index]);
        expect(itemNode.flagsCollection.isButton, isTrue);
        expect(
          itemNode.getSemanticsData().hasAction(SemanticsAction.tap),
          isTrue,
        );
      }

      final homeFinder = find.byKey(const ValueKey('bottom-nav-item-0'));
      final selectedFinder = find.byKey(const ValueKey('bottom-nav-item-4'));
      final homeNode = tester.getSemantics(homeFinder);
      final selectedNode = tester.getSemantics(selectedFinder);
      final homeSemantics = tester.widget<Semantics>(homeFinder);
      final selectedSemantics = tester.widget<Semantics>(selectedFinder);
      expect(homeSemantics.properties.selected, isFalse);
      expect(selectedSemantics.properties.selected, isTrue);
      tester.semantics.tap(find.semantics.byLabel(testCase.labels.first));
      await tester.pump();
      expect(selectedIndex, 0);

      final searchFinder = find.byKey(const ValueKey('bottom-nav-search'));
      final searchNode = tester.getSemantics(searchFinder);
      expect(searchNode.label,
          testCase.locale.languageCode == 'ko' ? '검색' : 'Search');
      expect(searchNode.flagsCollection.isButton, isTrue);
      expect(
          searchNode.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      expect(
        searchNode.getSemanticsData().hasAction(SemanticsAction.longPress),
        isTrue,
      );
      tester.semantics.tap(find.semantics.byLabel(searchNode.label));
      await tester.pump();
      expect(searchCount, 1);
      semantics.dispose();
    });
  }
}
