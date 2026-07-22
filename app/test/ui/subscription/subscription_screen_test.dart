import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/subscription/view_model/subscription_view_model.dart';
import 'package:book_golas/ui/subscription/widgets/subscription_screen.dart';

void main() {
  testWidgets('renders English subscription pricing without overflow',
      (tester) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => SubscriptionViewModel(SubscriptionService()),
        child: const MaterialApp(
          locale: Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: SubscriptionScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('POPULAR'), findsOneWidget);
    expect(find.text(r'US$2.99'), findsOneWidget);
    expect(find.text(r'US$19.99'), findsOneWidget);
  });
}
