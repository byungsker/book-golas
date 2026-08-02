import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

const _evidenceDirectory = String.fromEnvironment(
  'BOK385_EVIDENCE_DIR',
  defaultValue:
      '/Users/byungskersmacbook/Library/Mobile Documents/iCloud~md~obsidian/Documents/byungsker-archive/project/bookgolas/evidence/BOK-385/native-driver-candidate',
);

Future<void> main() async {
  await integrationDriver(
    onScreenshot: (name, image, [args]) async {
      final directory = Directory(_evidenceDirectory);
      await directory.create(recursive: true);
      await File('${directory.path}/$name.png').writeAsBytes(image);
      return true;
    },
  );
}
