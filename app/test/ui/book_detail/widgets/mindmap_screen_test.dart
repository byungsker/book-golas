import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/ui/book_detail/widgets/mindmap_screen.dart';

void main() {
  test('does not regenerate after consent when screen is disposed', () async {
    final consent = Completer<bool>();
    var mounted = true;
    var regenerateCount = 0;

    final result = runMindMapRegenerationAfterConsent(
      consent: consent.future,
      isMounted: () => mounted,
      regenerate: () async => regenerateCount += 1,
    );

    mounted = false;
    consent.complete(true);

    expect(await result, isFalse);
    expect(regenerateCount, 0);
  });
}
