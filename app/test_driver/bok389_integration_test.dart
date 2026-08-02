import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() {
  final evidenceDirectory = Platform.environment['BOK389_EVIDENCE_DIR'];
  if (evidenceDirectory == null || evidenceDirectory.isEmpty) {
    throw StateError('BOK389_EVIDENCE_DIR must be set for native evidence.');
  }

  return integrationDriver(
    onScreenshot: (name, bytes, [args]) async {
      final file = File('$evidenceDirectory/$name.png');
      await file.parent.create(recursive: true);
      await file.writeAsBytes(bytes, flush: true);
      return true;
    },
  );
}
