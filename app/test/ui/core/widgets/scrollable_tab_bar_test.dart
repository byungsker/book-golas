import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/ui/core/widgets/scrollable_tab_bar.dart';

void main() {
  for (final width in [320.0, 393.0]) {
    for (final testCase in [
      const ['Reading', 'To Read', 'Completed', 'Reread', 'All'],
      const ['독서 중', '읽을 예정', '완독', '다시 읽을 책', '전체'],
    ]) {
      testWidgets(
        'every selected tab avoids visible affordances at $width pixels',
        (tester) async {
          final semantics = tester.ensureSemantics();
          final scrollController = ScrollController();
          addTearDown(scrollController.dispose);
          tester.view.physicalSize = Size(width, 640);
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
                  initialIndex: 0,
                  scrollController: scrollController,
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();

          for (var index = 0; index < testCase.length; index += 1) {
            tester.semantics.tap(find.semantics.byLabel(testCase[index]));
            await tester.pumpAndSettle();

            final labelRect = tester.getRect(
              find.byKey(ValueKey('scrollable-tab-label-$index')),
            );
            for (final affordanceKey in const [
              ValueKey('scrollable-tab-bar-leading-affordance'),
              ValueKey('scrollable-tab-bar-trailing-affordance'),
            ]) {
              final affordance = find.byKey(affordanceKey);
              if (affordance.evaluate().isNotEmpty) {
                final affordanceRect = tester.getRect(affordance);
                expect(
                  labelRect.overlaps(affordanceRect),
                  isFalse,
                  reason:
                      '${testCase[index]} $labelRect must not be covered by '
                      '$affordanceKey $affordanceRect at offset '
                      '${scrollController.offset}',
                );
              }
            }
            final selectedSemantics = tester.widget<Semantics>(
              find.byKey(ValueKey('scrollable-tab-$index')),
            );
            expect(selectedSemantics.properties.selected, isTrue);
            expect(
              find.byKey(
                const ValueKey('scrollable-tab-bar-leading-affordance'),
              ),
              index == 0 ? findsNothing : findsOneWidget,
            );
            expect(
              find.byKey(
                const ValueKey('scrollable-tab-bar-trailing-affordance'),
              ),
              index == testCase.length - 1 ? findsNothing : findsOneWidget,
            );
          }
          semantics.dispose();
        },
      );
    }
  }

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
    expect(
      find.byKey(const ValueKey('scrollable-tab-bar-trailing-affordance')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('scrollable-tab-bar-leading-affordance')),
      findsNothing,
    );

    tester.semantics.tap(find.semantics.byLabel('All'));
    await tester.pumpAndSettle();

    final selectedSemantics = tester.widget<Semantics>(
      find.byKey(const ValueKey('scrollable-tab-4')),
    );
    expect(selectedSemantics.properties.selected, isTrue);
    expect(scrollController.offset, greaterThan(0));
    expect(
      find.byKey(const ValueKey('scrollable-tab-bar-leading-affordance')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('scrollable-tab-bar-trailing-affordance')),
      findsNothing,
    );
    semantics.dispose();
  });

  testWidgets('reduced motion changes tabs without pending animations', (
    tester,
  ) async {
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
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: child!,
        ),
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
    await tester.pump();

    final selectedSemantics = tester.widget<Semantics>(
      find.byKey(const ValueKey('scrollable-tab-4')),
    );
    expect(selectedSemantics.properties.selected, isTrue);
    expect(scrollController.offset, scrollController.position.maxScrollExtent);
    expect(tester.binding.transientCallbackCount, 0);
    semantics.dispose();
  });

  testWidgets('manual tab inspection is preserved after affordance rebuild', (
    tester,
  ) async {
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
            initialIndex: 2,
            scrollController: scrollController,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(scrollController.offset, greaterThan(0));

    scrollController.jumpTo(0);
    await tester.pumpAndSettle();

    expect(scrollController.offset, 0);
    expect(
      find.byKey(const ValueKey('scrollable-tab-bar-leading-affordance')),
      findsNothing,
    );
  });

  testWidgets('keyboard focus activates the next tab', (tester) async {
    const tabs = ['Reading', 'To Read', 'Completed', 'Reread', 'All'];
    final scrollController = ScrollController();
    addTearDown(scrollController.dispose);

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

    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await tester.pumpAndSettle();

    final selectedSemantics = tester.widget<Semantics>(
      find.byKey(const ValueKey('scrollable-tab-1')),
    );
    expect(selectedSemantics.properties.selected, isTrue);
  });

  testWidgets('controller listener matches production selection wiring', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    const tabs = ['Reading', 'To Read', 'Completed', 'Reread', 'All'];
    final scrollController = ScrollController();
    addTearDown(scrollController.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: _TabBarHarness(
            tabs: tabs,
            initialIndex: 0,
            scrollController: scrollController,
            syncFromController: true,
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
    semantics.dispose();
  });
}

class _TabBarHarness extends StatefulWidget {
  final List<String> tabs;
  final int initialIndex;
  final ScrollController scrollController;
  final bool syncFromController;

  const _TabBarHarness({
    required this.tabs,
    required this.initialIndex,
    required this.scrollController,
    this.syncFromController = false,
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
    if (widget.syncFromController) {
      _tabController.addListener(_syncSelectedIndexFromController);
    }
  }

  void _syncSelectedIndexFromController() {
    if (_tabController.indexIsChanging || !mounted) return;
    setState(() {
      _selectedIndex = _tabController.index;
    });
  }

  @override
  void dispose() {
    _tabController.removeListener(_syncSelectedIndexFromController);
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
      onTabSelected: widget.syncFromController
          ? null
          : (index) {
              setState(() {
                _selectedIndex = index;
              });
            },
    );
  }
}
