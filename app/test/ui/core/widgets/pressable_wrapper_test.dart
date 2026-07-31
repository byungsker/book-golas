import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/ui/core/widgets/pressable_wrapper.dart';

void main() {
  testWidgets('activates immediately when reduced motion is enabled',
      (tester) async {
    var tapCount = 0;

    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: child!,
        ),
        home: Scaffold(
          body: Center(
            child: BLabPressableWrapper(
              key: const Key('target'),
              onTap: () => tapCount += 1,
              child: const ColoredBox(
                color: Colors.transparent,
                child: SizedBox(width: 100, height: 48),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('target')));

    expect(tapCount, 1);
  });
}
