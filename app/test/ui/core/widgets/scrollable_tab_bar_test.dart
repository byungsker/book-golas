import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/ui/core/widgets/scrollable_tab_bar.dart';

void main() {
  for (final testCase in [
    const ['Reading', 'To Read', 'Completed', 'Reread', 'All'],
    const ['독서 중', '읽을 예정', '완독', '다시 읽을 책', '전체'],
  ]) {
    testWidgets(
      'large text tabs remain readable and selected destination is visible',
      (tester) async {
        final semantics = tester.ensureSemantics();
        final scrollController = ScrollController();
        addTearDown(scrollController.dispose);
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: const TextScaler.linear(2)),
              child: child!,
            ),
            home: Scaffold(
              body: _TabBarHarness(
                tabs: testCase,
                initialIndex: 4,
                scrollController: scrollController,
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
        expect(scrollController.position.maxScrollExtent, greaterThan(0));
        expect(scrollController.offset, greaterThan(0));

        for (var index = 0; index < testCase.length; index += 1) {
          final labelFinder = find.byKey(
            ValueKey('scrollable-tab-label-$index'),
          );
          final paragraph = tester.renderObject<RenderParagraph>(labelFinder);
          final semanticsNode = tester.getSemantics(
            find.byKey(ValueKey('scrollable-tab-$index')),
          );
          expect(paragraph.didExceedMaxLines, isFalse);
          expect(paragraph.textScaler.scale(14), 28);
          expect(semanticsNode.label, testCase[index]);
          expect(semanticsNode.flagsCollection.isButton, isTrue);
          expect(
            semanticsNode.getSemanticsData().hasAction(SemanticsAction.tap),
            isTrue,
          );
        }

        final viewport = tester.getRect(
          find.byKey(const ValueKey('scrollable-tab-bar-scroll-view')),
        );
        final selectedTab = tester.getRect(
          find.byKey(const ValueKey('scrollable-tab-4')),
        );
        expect(selectedTab.left, greaterThanOrEqualTo(viewport.left - 0.5));
        expect(selectedTab.right, lessThanOrEqualTo(viewport.right + 0.5));
        final selectedSemantics = tester.widget<Semantics>(
          find.byKey(const ValueKey('scrollable-tab-4')),
        );
        expect(selectedSemantics.properties.selected, isTrue);
        semantics.dispose();
      },
    );
  }

  testWidgets('semantic tap changes the selected tab', (tester) async {
    final semantics = tester.ensureSemantics();
    const tabs = ['Reading', 'To Read', 'Completed', 'Reread', 'All'];
    final scrollController = ScrollController();
    addTearDown(scrollController.dispose);
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: _TabBarHarness(
            tabs: tabs,
            initialIndex: 0,
            scrollController: scrollController,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    tester.semantics.tap(find.semantics.byLabel('All'));
    await tester.pumpAndSettle();

    final selectedSemantics = tester.widget<Semantics>(
      find.byKey(const ValueKey('scrollable-tab-4')),
    );
    expect(selectedSemantics.properties.selected, isTrue);
    expect(scrollController.offset, greaterThan(0));
    semantics.dispose();
  });
}

class _TabBarHarness extends StatefulWidget {
  final List<String> tabs;
  final int initialIndex;
  final ScrollController scrollController;

  const _TabBarHarness({
    required this.tabs,
    required this.initialIndex,
    required this.scrollController,
  });

  @override
  State<_TabBarHarness> createState() => _TabBarHarnessState();
}

class _TabBarHarnessState extends State<_TabBarHarness>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  late int _selectedIndex;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;
    _tabController = TabController(
      length: widget.tabs.length,
      initialIndex: widget.initialIndex,
      vsync: this,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScrollableTabBar(
      controller: _tabController,
      tabs: widget.tabs,
      selectedIndex: _selectedIndex,
      scrollController: widget.scrollController,
      onTabSelected: (index) {
        setState(() {
          _selectedIndex = index;
        });
      },
    );
  }
}
