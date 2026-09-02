import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:book_golas/data/services/deep_link_service.dart';

void main() {
  testWidgets('deep-link replacement preserves the root app shell',
      (tester) async {
    final navigatorKey = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigatorKey,
        home: const Scaffold(body: Text('home')),
      ),
    );

    showDialog<void>(
      context: navigatorKey.currentContext!,
      barrierDismissible: false,
      builder: (context) => const AlertDialog(
        content: Text('blocking-popup'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('blocking-popup'), findsOneWidget);

    DeepLinkNavigator.open(
      navigatorKey.currentState!,
      MaterialPageRoute<void>(
        builder: (context) => const Scaffold(
          body: Text('first-deep-link-destination'),
        ),
      ),
      useReplacement: true,
    );
    await tester.pumpAndSettle();

    expect(find.text('blocking-popup'), findsNothing);
    expect(find.text('first-deep-link-destination'), findsOneWidget);

    DeepLinkNavigator.open(
      navigatorKey.currentState!,
      MaterialPageRoute<void>(
        builder: (context) => const Scaffold(
          body: Text('second-deep-link-destination'),
        ),
      ),
      useReplacement: true,
    );
    await tester.pumpAndSettle();

    expect(find.text('first-deep-link-destination'), findsNothing);
    expect(find.text('second-deep-link-destination'), findsOneWidget);

    navigatorKey.currentState!.pop();
    await tester.pumpAndSettle();

    expect(find.text('home'), findsOneWidget);
    expect(find.text('second-deep-link-destination'), findsNothing);
  });

  test('dispatch guard rejects delayed completion after session loss',
      () async {
    const guard = DeepLinkDispatchGuard(
      userId: 'user-1',
      navigationGeneration: 7,
    );
    final delayedFetch = Completer<void>();
    String? currentUserId = 'user-1';
    var currentGeneration = 7;
    var navigationReady = true;

    final canCompleteAfterFetch = delayedFetch.future.then((_) {
      return guard.canComplete(
        currentUserId: currentUserId,
        currentNavigationGeneration: currentGeneration,
        navigationReady: navigationReady,
      );
    });
    currentUserId = null;
    currentGeneration += 1;
    navigationReady = false;
    delayedFetch.complete();

    expect(await canCompleteAfterFetch, isFalse);
  });

  test('dispatch guard rejects completion after an account switch', () {
    const guard = DeepLinkDispatchGuard(
      userId: 'user-1',
      navigationGeneration: 3,
    );

    expect(
      guard.canComplete(
        currentUserId: 'user-2',
        currentNavigationGeneration: 3,
        navigationReady: true,
      ),
      isFalse,
    );
  });

  test('auth callback deduplication is bounded and can be cleared', () {
    final deduplicator = DeepLinkCallbackDeduplicator(maxEntries: 2);
    final callback = Uri.parse(
      'bookgolas://login-callback?access_token=sensitive-token',
    );
    final second = Uri.parse('bookgolas://login-callback?code=second');
    final third = Uri.parse('bookgolas://reset-callback?code=third');

    expect(deduplicator.markIfNew(callback), isTrue);
    expect(deduplicator.markIfNew(callback), isFalse);
    expect(deduplicator.markIfNew(second), isTrue);
    expect(deduplicator.markIfNew(third), isTrue);
    expect(deduplicator.markIfNew(callback), isTrue);

    deduplicator.clear();

    expect(deduplicator.markIfNew(callback), isTrue);
  });

  test('auth callback logging strips query and fragment credentials', () {
    final callback = Uri.parse(
      'bookgolas://login-callback?code=secret#access_token=secret-token',
    );

    final description = DeepLinkLogSanitizer.describe(callback);

    expect(description, 'bookgolas://login-callback');
    expect(description, isNot(contains('secret')));
  });

  test('custom deep-link handler is the single auth callback owner', () {
    expect(
      DeepLinkAuthConfiguration.supabaseOptions.detectSessionInUri,
      isFalse,
    );
  });

  test('cold and warm auth callback delivery exchanges a session once',
      () async {
    final processor = DeepLinkAuthCallbackProcessor();
    final callback = Uri.parse('bookgolas://login-callback?code=secret-code');
    var exchangeCount = 0;

    final coldStart = await processor.process(
      callback,
      exchange: (_) async {
        exchangeCount += 1;
      },
    );
    final warmStartDuplicate = await processor.process(
      callback,
      exchange: (_) async {
        exchangeCount += 1;
      },
    );

    expect(coldStart, DeepLinkAuthCallbackOutcome.completed);
    expect(warmStartDuplicate, DeepLinkAuthCallbackOutcome.duplicate);
    expect(exchangeCount, 1);
  });

  test('callback-controlled errors are rejected before session exchange',
      () async {
    final processor = DeepLinkAuthCallbackProcessor();
    final callback = Uri.parse(
      'bookgolas://login-callback#error_description=secret',
    );
    var exchangeCount = 0;

    final outcome = await processor.process(
      callback,
      exchange: (_) async {
        exchangeCount += 1;
      },
    );

    expect(outcome, DeepLinkAuthCallbackOutcome.rejected);
    expect(exchangeCount, 0);
  });

  test('content deep-link logging omits identifiers and untrusted data', () {
    final uri = Uri.parse(
      'bookgolas://book/detail/private-book?token=secret#credential',
    );

    final description = DeepLinkLogSanitizer.describe(uri);

    expect(description, 'bookgolas://book/detail');
    expect(description, isNot(contains('private-book')));
    expect(description, isNot(contains('secret')));
    expect(description, isNot(contains('credential')));
  });

  test('content resolution log branches use fixed classifications', () {
    const messages = [
      DeepLinkLogMessages.currentBookResolvedFromDatabase,
      DeepLinkLogMessages.currentBookResolvedFromWidget,
      DeepLinkLogMessages.targetBookNotFound,
    ];

    for (final message in messages) {
      expect(message, isNot(contains('private-book')));
      expect(message, isNot(contains('secret')));
      expect(message, isNot(contains('current-book-id')));
    }
  });

  test('content deep links normalize to supported semantic fields', () {
    final raw = Uri.parse(
      'bookgolas://book/scan/current?homeWidget=true&token=secret#credential',
    );
    final result = DeepLinkService.parseUri(raw)!;

    final normalized = DeepLinkContentNormalizer.normalize(result);

    expect(normalized, Uri.parse('bookgolas://book/scan/current'));
    expect(normalized.query, isEmpty);
    expect(normalized.fragment, isEmpty);
  });

  group('DeepLinkBookResolver', () {
    test('does not query a book before authentication', () async {
      final resolver = DeepLinkBookResolver();
      var wasCalled = false;

      final book = await resolver.fetchOwnedBook(
        userId: null,
        bookId: 'book-1',
        fetch: (userId, bookId) async {
          wasCalled = true;
          return null;
        },
      );

      expect(book, isNull);
      expect(wasCalled, isFalse);
    });

    test('passes the authenticated owner to the book query', () async {
      final resolver = DeepLinkBookResolver();
      String? queriedUserId;
      String? queriedBookId;

      await resolver.fetchOwnedBook(
        userId: 'user-1',
        bookId: 'book-1',
        fetch: (userId, bookId) async {
          queriedUserId = userId;
          queriedBookId = bookId;
          return null;
        },
      );

      expect(queriedUserId, 'user-1');
      expect(queriedBookId, 'book-1');
    });
  });

  group('DeepLinkIntentCoordinator', () {
    test('replays a pre-auth cold-start intent exactly once when ready',
        () async {
      final coordinator = DeepLinkIntentCoordinator();
      final dispatched = <DeepLinkRequest>[];
      final request = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/search'),
        useReplacement: true,
      );

      await coordinator.receive(
        request,
        isAuthenticated: false,
        dispatch: dispatched.add,
      );
      expect(dispatched, isEmpty);

      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      expect(dispatched, [request]);
    });

    test('preserves the selected widget book across cold-start readiness',
        () async {
      final coordinator = DeepLinkIntentCoordinator();
      final dispatched = <DeepLinkRequest>[];
      final request = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/detail/book-42'),
        useReplacement: true,
      );

      await coordinator.receive(
        request,
        isAuthenticated: false,
        dispatch: dispatched.add,
      );
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      expect(dispatched, [request]);
      expect(dispatched.single.uri.pathSegments.last, 'book-42');
      expect(dispatched.single.useReplacement, isTrue);
    });

    test('dispatches the selected widget book from a warm or foreground app',
        () async {
      var now = DateTime(2026, 8, 22, 12);
      final coordinator = DeepLinkIntentCoordinator(now: () => now);
      final dispatched = <DeepLinkRequest>[];
      final request = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/detail/book-77'),
        useReplacement: true,
      );

      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );
      await coordinator.receive(
        request,
        isAuthenticated: true,
        dispatch: dispatched.add,
      );
      now = now.add(const Duration(seconds: 3));
      coordinator.markNavigationUnavailable(clearPending: false);
      await coordinator.receive(
        request,
        isAuthenticated: true,
        dispatch: dispatched.add,
      );
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      expect(dispatched, [request, request]);
      expect(
        dispatched.every((item) => item.uri.pathSegments.last == 'book-77'),
        isTrue,
      );
    });

    test('preserves current-book action and replacement mode before login',
        () async {
      final coordinator = DeepLinkIntentCoordinator();
      final dispatched = <DeepLinkRequest>[];
      final request = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/scan/current'),
        useReplacement: true,
      );

      await coordinator.receive(
        request,
        isAuthenticated: false,
        dispatch: dispatched.add,
      );
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      expect(dispatched.single.uri, request.uri);
      expect(dispatched.single.useReplacement, isTrue);
    });

    test('dispatches supported warm-start intents immediately', () async {
      final coordinator = DeepLinkIntentCoordinator();
      final dispatched = <DeepLinkRequest>[];
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );
      final requests = [
        DeepLinkRequest(uri: Uri.parse('bookgolas://book/search')),
        DeepLinkRequest(uri: Uri.parse('bookgolas://book/detail/current')),
        DeepLinkRequest(uri: Uri.parse('bookgolas://book/record/current')),
        DeepLinkRequest(uri: Uri.parse('bookgolas://book/scan/current')),
      ];

      for (final request in requests) {
        await coordinator.receive(
          request,
          isAuthenticated: true,
          dispatch: dispatched.add,
        );
      }

      expect(dispatched, requests);
    });

    test('suppresses duplicate native and plugin deliveries', () async {
      var now = DateTime(2026, 8, 1, 12);
      final coordinator = DeepLinkIntentCoordinator(now: () => now);
      final dispatched = <DeepLinkRequest>[];
      final request = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/detail/current'),
      );
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      await coordinator.receive(
        request,
        isAuthenticated: true,
        dispatch: dispatched.add,
      );
      now = now.add(const Duration(milliseconds: 500));
      await coordinator.receive(
        request,
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      expect(dispatched, [request]);
    });

    test('keeps the latest intent received while login is required', () async {
      final coordinator = DeepLinkIntentCoordinator();
      final dispatched = <DeepLinkRequest>[];
      final first = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/search'),
      );
      final latest = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/detail/current'),
      );

      await coordinator.receive(
        first,
        isAuthenticated: false,
        dispatch: dispatched.add,
      );
      await coordinator.receive(
        latest,
        isAuthenticated: false,
        dispatch: dispatched.add,
      );
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      expect(dispatched, [latest]);
    });

    test('keeps replacement navigation for duplicate pending widget intent',
        () async {
      final coordinator = DeepLinkIntentCoordinator();
      final dispatched = <DeepLinkRequest>[];
      final uri = Uri.parse(
        'bookgolas://book/detail/current?homeWidget=true',
      );

      await coordinator.receive(
        DeepLinkRequest(uri: uri, useReplacement: true),
        isAuthenticated: false,
        dispatch: dispatched.add,
      );
      await coordinator.receive(
        DeepLinkRequest(uri: uri),
        isAuthenticated: false,
        dispatch: dispatched.add,
      );
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      expect(dispatched.single.useReplacement, isTrue);
    });

    test('drains an intent received while the cold-start replay is running',
        () async {
      final coordinator = DeepLinkIntentCoordinator();
      final firstDispatchStarted = Completer<void>();
      final finishFirstDispatch = Completer<void>();
      final dispatched = <DeepLinkRequest>[];
      final first = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/search'),
      );
      final second = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/detail/current'),
      );

      await coordinator.receive(
        first,
        isAuthenticated: false,
        dispatch: dispatched.add,
      );
      final ready = coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: (request) async {
          dispatched.add(request);
          if (request == first) {
            firstDispatchStarted.complete();
            await finishFirstDispatch.future;
          }
        },
      );
      await firstDispatchStarted.future;
      await coordinator.receive(
        second,
        isAuthenticated: true,
        dispatch: dispatched.add,
      );
      finishFirstDispatch.complete();
      await ready;

      expect(dispatched, [first, second]);
    });

    test('drops session-bound pending work when navigation becomes unavailable',
        () async {
      final coordinator = DeepLinkIntentCoordinator();
      final firstDispatchStarted = Completer<void>();
      final finishFirstDispatch = Completer<void>();
      final dispatched = <DeepLinkRequest>[];
      final first = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/detail/current'),
      );
      final queuedDuringDispatch = DeepLinkRequest(
        uri: Uri.parse('bookgolas://book/scan/current'),
      );
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      final firstDispatch = coordinator.receive(
        first,
        isAuthenticated: true,
        dispatch: (request) async {
          dispatched.add(request);
          firstDispatchStarted.complete();
          await finishFirstDispatch.future;
        },
      );
      await firstDispatchStarted.future;
      await coordinator.receive(
        queuedDuringDispatch,
        isAuthenticated: true,
        dispatch: dispatched.add,
      );
      coordinator.markNavigationUnavailable(clearPending: true);
      finishFirstDispatch.complete();
      await firstDispatch;
      await coordinator.markNavigationReady(
        isAuthenticated: true,
        dispatch: dispatched.add,
      );

      expect(dispatched, [first]);
    });
  });

  group('DeepLinkRequest native payload', () {
    test('parses replacement policy from a native payload map', () {
      final request = DeepLinkRequest.fromNativePayload({
        'url': 'bookgolas://book/scan/current?homeWidget=true',
        'useReplacement': true,
      });

      expect(request?.uri.path, '/scan/current');
      expect(request?.useReplacement, isTrue);
    });

    test('supports a legacy native URL string without replacement', () {
      final request = DeepLinkRequest.fromNativePayload(
        'bookgolas://book/search',
      );

      expect(request?.uri, Uri.parse('bookgolas://book/search'));
      expect(request?.useReplacement, isFalse);
    });

    test('rejects malformed native payloads', () {
      expect(DeepLinkRequest.fromNativePayload(null), isNull);
      expect(DeepLinkRequest.fromNativePayload({'url': 42}), isNull);
    });
  });

  group('iOS deep link delivery contract', () {
    test('disables Flutter routing while app_links owns delivery', () async {
      final plist = await File('ios/Runner/Info.plist').readAsString();

      expect(
        plist,
        matches(
          RegExp(
            r'<key>FlutterDeepLinkingEnabled</key>\s*<false\s*/>',
          ),
        ),
      );
    });

    test('buffers native URLs and handles cold-start quick actions', () async {
      final appDelegate =
          await File('ios/Runner/AppDelegate.swift').readAsString();

      expect(appDelegate, contains('pendingDeepLink'));
      expect(appDelegate, contains('consumePendingDeepLink'));
      expect(appDelegate, contains('acknowledgeDeepLink'));
      expect(
        appDelegate,
        contains('value?.lowercased() == "true"'),
      );
      expect(appDelegate, contains('launchOptions?[.shortcutItem]'));
      expect(appDelegate, contains('let didFinish = super.application'));
      expect(appDelegate, contains('return didFinish'));
      expect(
        RegExp(
          r'launchOptions\?\[\.shortcutItem\][\s\S]*?sendDeepLink\(urlString, useReplacement: true\)[\s\S]*?return false',
        ).hasMatch(appDelegate),
        isTrue,
      );
    });

    test('marks every WidgetKit book URL for home_widget delivery', () async {
      final widgetSource =
          await File('ios/BookgolasWidget/BookgolasWidget.swift')
              .readAsString();
      final urls = RegExp(r'"bookgolas://book/[^"\n]+"')
          .allMatches(widgetSource)
          .map((match) => match.group(0)!)
          .toList();

      expect(urls, isNotEmpty);
      expect(urls.every((url) => url.contains('homeWidget=true')), isTrue);
    });
  });

  group('Android deep link delivery contract', () {
    test('registers the custom scheme with app_links', () async {
      final manifest =
          await File('android/app/src/main/AndroidManifest.xml').readAsString();

      expect(
        manifest,
        contains(
          '<meta-data\n'
          '                android:name="flutter_deeplinking_enabled"\n'
          '                android:value="false" />',
        ),
      );
      expect(
        manifest,
        matches(
          RegExp(
            r'<intent-filter>\s*<action android:name="android.intent.action.VIEW" />\s*'
            r'<category android:name="android.intent.category.DEFAULT" />\s*'
            r'<category android:name="android.intent.category.BROWSABLE" />\s*'
            r'<data android:scheme="bookgolas" />\s*</intent-filter>',
          ),
        ),
      );
    });
  });

  group('app_links platform ownership', () {
    test('keeps iOS custom URLs on the native channel', () {
      final uri = Uri.parse('bookgolas://book/search');

      expect(
        DeepLinkService.shouldHandleAppLinksUri(
          uri,
          platform: TargetPlatform.iOS,
        ),
        isFalse,
      );
      expect(
        DeepLinkService.shouldHandleAppLinksUri(
          uri,
          platform: TargetPlatform.android,
        ),
        isTrue,
      );
    });

    test('keeps non-custom URLs available to app_links on every platform', () {
      final uri = Uri.parse('https://bookgolas.example/book/search');

      expect(
        DeepLinkService.shouldHandleAppLinksUri(
          uri,
          platform: TargetPlatform.iOS,
        ),
        isTrue,
      );
    });
  });

  group('DeepLinkService.parseUri - search', () {
    test('should parse search URI as search action', () {
      final uri = Uri.parse('bookgolas://book/search');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.search);
      expect(result.bookId, isNull);
    });

    test('should parse search URI constructed with pathSegments', () {
      final uri = Uri(scheme: 'bookgolas', pathSegments: ['book', 'search']);
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.search);
      expect(result.bookId, isNull);
    });

    test('should ignore the home widget query marker', () {
      final uri = Uri.parse('bookgolas://book/search?homeWidget=true');
      final result = DeepLinkService.parseUri(uri);

      expect(result?.action, DeepLinkAction.search);
    });
  });

  group('DeepLinkService.parseUri - bookDetail', () {
    test('should extract bookId from detail URI', () {
      final uri = Uri.parse('bookgolas://book/detail/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookDetail);
      expect(result.bookId, 'abc-123');
    });

    test('should parse UUID-style bookId', () {
      final uri = Uri.parse(
          'bookgolas://book/detail/550e8400-e29b-41d4-a716-446655440000');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookDetail);
      expect(result.bookId, '550e8400-e29b-41d4-a716-446655440000');
    });

    test('should parse detail URI constructed with pathSegments', () {
      final uri =
          Uri(scheme: 'bookgolas', pathSegments: ['book', 'detail', 'abc-123']);
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookDetail);
      expect(result.bookId, 'abc-123');
    });
  });

  group('DeepLinkService.parseUri - bookRecord', () {
    test('should extract bookId from record URI', () {
      final uri = Uri.parse('bookgolas://book/record/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookRecord);
      expect(result.bookId, 'abc-123');
    });

    test('should extract bookId correctly in record mode', () {
      final uri = Uri.parse('bookgolas://book/record/my-book-42');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookRecord);
      expect(result.bookId, 'my-book-42');
    });
  });

  group('DeepLinkService.parseUri - bookScan', () {
    test('should extract bookId from scan URI', () {
      final uri = Uri.parse('bookgolas://book/scan/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookScan);
      expect(result.bookId, 'abc-123');
    });

    test('should parse UUID-style bookId for scan', () {
      final uri = Uri.parse(
          'bookgolas://book/scan/550e8400-e29b-41d4-a716-446655440000');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookScan);
      expect(result.bookId, '550e8400-e29b-41d4-a716-446655440000');
    });

    test('should return null for scan without bookId', () {
      final uri = Uri.parse('bookgolas://book/scan');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });
  });

  group('DeepLinkService.parseUri - invalid URIs', () {
    test('should return null for wrong scheme', () {
      final uri = Uri.parse('https://book/detail/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for empty path', () {
      final uri = Uri(scheme: 'bookgolas');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for non-book host', () {
      final uri = Uri.parse('bookgolas://settings/theme');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for unknown action', () {
      final uri = Uri.parse('bookgolas://book/unknown/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for detail without bookId', () {
      final uri = Uri.parse('bookgolas://book/detail');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for record without bookId', () {
      final uri = Uri.parse('bookgolas://book/record');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for only book segment', () {
      final uri = Uri.parse('bookgolas://book');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for empty bookId in detail', () {
      final uri = Uri.parse('bookgolas://book/detail/');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });
  });

  group('DeepLinkResult', () {
    test('should store action and bookId correctly', () {
      const result =
          DeepLinkResult(action: DeepLinkAction.bookDetail, bookId: 'abc');

      expect(result.action, DeepLinkAction.bookDetail);
      expect(result.bookId, 'abc');
    });

    test('should allow null bookId for search action', () {
      const result = DeepLinkResult(action: DeepLinkAction.search);

      expect(result.action, DeepLinkAction.search);
      expect(result.bookId, isNull);
    });
  });

  group('DeepLinkAction enum', () {
    test('should have four values', () {
      expect(DeepLinkAction.values.length, 4);
    });

    test('should contain search, bookDetail, bookRecord, bookScan', () {
      expect(DeepLinkAction.values, contains(DeepLinkAction.search));
      expect(DeepLinkAction.values, contains(DeepLinkAction.bookDetail));
      expect(DeepLinkAction.values, contains(DeepLinkAction.bookRecord));
      expect(DeepLinkAction.values, contains(DeepLinkAction.bookScan));
    });
  });

  group('URI parsing format consistency', () {
    test('Uri.parse and Uri constructor should produce same parseUri result',
        () {
      final parsed = Uri.parse('bookgolas://book/detail/abc-123');
      final constructed =
          Uri(scheme: 'bookgolas', pathSegments: ['book', 'detail', 'abc-123']);

      final parsedResult = DeepLinkService.parseUri(parsed);
      final constructedResult = DeepLinkService.parseUri(constructed);

      expect(parsedResult, isNotNull);
      expect(constructedResult, isNotNull);
      expect(parsedResult!.action, constructedResult!.action);
      expect(parsedResult.bookId, constructedResult.bookId);
    });

    test('search URI should work with both formats', () {
      final parsed = Uri.parse('bookgolas://book/search');
      final constructed =
          Uri(scheme: 'bookgolas', pathSegments: ['book', 'search']);

      expect(DeepLinkService.parseUri(parsed)?.action, DeepLinkAction.search);
      expect(
          DeepLinkService.parseUri(constructed)?.action, DeepLinkAction.search);
    });

    test('scan URI should work with both formats', () {
      final parsed = Uri.parse('bookgolas://book/scan/test-id');
      final constructed =
          Uri(scheme: 'bookgolas', pathSegments: ['book', 'scan', 'test-id']);

      final parsedResult = DeepLinkService.parseUri(parsed);
      final constructedResult = DeepLinkService.parseUri(constructed);

      expect(parsedResult?.action, DeepLinkAction.bookScan);
      expect(constructedResult?.action, DeepLinkAction.bookScan);
      expect(parsedResult?.bookId, 'test-id');
      expect(constructedResult?.bookId, 'test-id');
    });
  });
}
