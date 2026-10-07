import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:book_golas/data/services/age_policy_service.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('blocks ads when the age policy is unknown', () async {
    final service = AgePolicyService();

    await service.load();

    expect(service.status, AgePolicyStatus.unknown);
    expect(service.canRequestAds, isFalse);
  });

  test('blocks ads for users under 14', () async {
    final service = AgePolicyService();

    expect(await service.setStatus(AgePolicyStatus.under14), isTrue);
    expect(service.canRequestAds, isFalse);
  });

  test('allows ads only after a 14-or-older choice is persisted', () async {
    final service = AgePolicyService();

    expect(await service.setStatus(AgePolicyStatus.age14OrOlder), isTrue);

    final reloadedService = AgePolicyService();
    await reloadedService.load();

    expect(reloadedService.status, AgePolicyStatus.age14OrOlder);
    expect(reloadedService.canRequestAds, isTrue);
  });
}
