import 'package:blab_design_system/blab_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget reference(Brightness brightness) {
  final theme = brightness == Brightness.dark ? BLabTheme.dark : BLabTheme.light;
  return MaterialApp(
    theme: theme,
    home: Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bookgolas', style: theme.textTheme.headlineMedium),
            const SizedBox(height: 24),
            BLabTextField(
              controller: TextEditingController(),
              label: 'Email',
              hintText: 'reader@example.com',
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: BLabButton(
                text: 'Refresh',
                variant: BLabButtonVariant.secondary,
                onPressed: () {},
              ),
            ),
            const SizedBox(height: 16),
            BLabCard(
              child: Text(
                'The library is temporarily unavailable',
                style: theme.textTheme.titleMedium,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

void main() {
  testWidgets('renders light BLDS native reference', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    await tester.pumpWidget(reference(Brightness.light));
    await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/blab-native-reference-light.png'));
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  });

  testWidgets('renders dark BLDS native reference', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    await tester.pumpWidget(reference(Brightness.dark));
    await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/blab-native-reference-dark.png'));
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
  });
}
