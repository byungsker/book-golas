import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/reading_insights_service.dart';

void main() {
  test('missing consent is distinct and does not initialize the client', () {
    expect(
      () => ReadingInsightsService().generateInsight('user-a'),
      throwsA(isA<ThirdPartyAiConsentRequiredException>()),
    );
  });
}
