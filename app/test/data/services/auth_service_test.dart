import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/auth_service.dart';

void main() {
  test('Apple profile name write failure is non-fatal', () async {
    final updates = <String>[];

    await AuthService.saveAppleNicknameIfAvailable(
      userId: 'test-user',
      givenName: 'Ada',
      familyName: 'Lovelace',
      updateNickname: (userId, nickname) async {
        updates.add('$userId:$nickname');
        throw StateError('profile write failed');
      },
    );

    expect(updates, ['test-user:Lovelace Ada']);
  });

  test(
    'Apple profile name write is skipped when Apple returns no name',
    () async {
      var updateCount = 0;

      await AuthService.saveAppleNicknameIfAvailable(
        userId: 'test-user',
        givenName: null,
        familyName: null,
        updateNickname: (userId, nickname) async {
          updateCount += 1;
        },
      );

      expect(updateCount, 0);
    },
  );
}
