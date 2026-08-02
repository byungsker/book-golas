import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/floating_action_bar.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

void main() {
  for (final width in const [320.0, 393.0]) {
    for (final locale in const [Locale('ko'), Locale('en')]) {
      testWidgets(
        'final detail content clears the measured action bar at ${width.toInt()}px in ${locale.languageCode}',
        (tester) async {
          tester.view.physicalSize = Size(width, 852);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);

          final scrollController = ScrollController();
          await tester.pumpWidget(
            MaterialApp(
              locale: locale,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              theme: BLabTheme.light,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context)
                    .copyWith(textScaler: const TextScaler.linear(2)),
                child: _BottomClearanceHost(
                  scrollController: scrollController,
                ),
              ),
            ),
          );

          await tester.pumpAndSettle();
          scrollController.jumpTo(scrollController.position.maxScrollExtent);
          await tester.pumpAndSettle();

          final finalContentRect = tester.getRect(
            find.byKey(const ValueKey('bottom-clearance-final-content')),
          );
          final actionBarRect = tester.getRect(
            find.byKey(const ValueKey('reading-action-bar-stacked')),
          );
          expect(finalContentRect.bottom,
              lessThanOrEqualTo(actionBarRect.top - 16));
        },
      );
    }
  }
}

class _BottomClearanceHost extends StatefulWidget {
  final ScrollController scrollController;

  const _BottomClearanceHost({required this.scrollController});

  @override
  State<_BottomClearanceHost> createState() => _BottomClearanceHostState();
}

class _BottomClearanceHostState extends State<_BottomClearanceHost> {
  double? _actionBarHeight;

  void _updateActionBarHeight(double height) {
    if (_actionBarHeight != null && (_actionBarHeight! - height).abs() < 0.5) {
      return;
    }
    setState(() => _actionBarHeight = height);
  }

  @override
  Widget build(BuildContext context) {
    final actionBarHeight = _actionBarHeight ??
        FloatingActionBar.minimumHeightFor(context, isReadingMode: true);
    final bottomPadding = FloatingActionBar.contentBottomClearance(
      actionBarHeight: actionBarHeight,
      bottomSafeArea: MediaQuery.viewPaddingOf(context).bottom,
    );

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: SingleChildScrollView(
              controller: widget.scrollController,
              padding: EdgeInsets.only(bottom: bottomPadding),
              child: Column(
                children: [
                  const SizedBox(height: 1000),
                  Container(
                    key: const ValueKey('bottom-clearance-final-content'),
                    height: 48,
                    color: BLabColors.primary,
                  ),
                ],
              ),
            ),
          ),
          FloatingActionBar(
            onUpdatePageTap: () {},
            onAddMemorablePageTap: () {},
            onHeightChanged: _updateActionBarHeight,
          ),
        ],
      ),
    );
  }
}
