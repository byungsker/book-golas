// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

import 'package:book_golas/config/flavor_config.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions have not been configured for web - '
        'you can reconfigure this by running the FlutterFire CLI again.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return FlavorConfig.isDev ? iosDev : ios;
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for macos - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBhDEH-wSFEW4xyP6GGKjhMbcDj6huMPoY',
    appId: '1:817480840922:android:d98d65121a0161ca73d7e3',
    messagingSenderId: '817480840922',
    projectId: 'book-golas',
    storageBucket: 'book-golas.firebasestorage.app',
  );

  static const FirebaseOptions iosDev = FirebaseOptions(
    apiKey: 'AIzaSyDpBdl0fF8LztXpXdbzc7q1mS3q2ZybDT4',
    appId: '1:817480840922:ios:27fe608d861f33c973d7e3',
    messagingSenderId: '817480840922',
    projectId: 'book-golas',
    storageBucket: 'book-golas.firebasestorage.app',
    iosBundleId: 'com.bookgolas.app.dev',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDpBdl0fF8LztXpXdbzc7q1mS3q2ZybDT4',
    appId: '1:817480840922:ios:a6d9bcdceddd457773d7e3',
    messagingSenderId: '817480840922',
    projectId: 'book-golas',
    storageBucket: 'book-golas.firebasestorage.app',
    iosBundleId: 'com.bookgolas.app',
  );
}
