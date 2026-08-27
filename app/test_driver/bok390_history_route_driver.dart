import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

const _defaultEvidenceDirectory = 'build/bok390_evidence';

Future<void> main() async {
  final evidenceDirectory =
      Platform.environment['BOK390_EVIDENCE_DIR'] ?? _defaultEvidenceDirectory;
  await integrationDriver(
    onScreenshot: (name, image, [args]) async {
      final directory = Directory(evidenceDirectory);
      await directory.create(recursive: true);
      await File('${directory.path}/$name.png').writeAsBytes(image);
      return true;
    },
  );
}
