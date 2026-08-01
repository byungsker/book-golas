import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:home_widget/home_widget.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/reading_start/widgets/reading_start_screen.dart';

enum DeepLinkAction {
  search,
  bookDetail,
  bookRecord,
  bookScan,
}

class DeepLinkResult {
  final DeepLinkAction action;
  final String? bookId;

  const DeepLinkResult({required this.action, this.bookId});
}

class DeepLinkRequest {
  final Uri uri;
  final bool useReplacement;

  const DeepLinkRequest({required this.uri, this.useReplacement = false});

  static DeepLinkRequest? fromNativePayload(Object? payload) {
    if (payload is String) {
      final uri = Uri.tryParse(payload);
      return uri == null ? null : DeepLinkRequest(uri: uri);
    }
    if (payload is! Map) return null;
    final urlString = payload['url'];
    if (urlString is! String) return null;
    final uri = Uri.tryParse(urlString);
    if (uri == null) return null;
    return DeepLinkRequest(
      uri: uri,
      useReplacement: payload['useReplacement'] == true,
    );
  }
}

typedef DeepLinkDispatch = FutureOr<void> Function(DeepLinkRequest request);
typedef UserScopedBookFetch = Future<Book?> Function(
  String userId,
  String bookId,
);

class DeepLinkBookResolver {
  Future<Book?> fetchOwnedBook({
    required String? userId,
    required String bookId,
    required UserScopedBookFetch fetch,
  }) async {
    if (userId == null) return null;
    return fetch(userId, bookId);
  }
}

class DeepLinkNavigator {
  static void open(
    NavigatorState navigator,
    Route<void> route, {
    required bool useReplacement,
  }) {
    navigator.popUntil((activeRoute) => activeRoute is! PopupRoute);
    if (useReplacement) {
      navigator.pushAndRemoveUntil<void>(route, (activeRoute) {
        return activeRoute.isFirst;
      });
    } else {
      navigator.push<void>(route);
    }
  }
}

class DeepLinkDispatchGuard {
  final String userId;
  final int navigationGeneration;

  const DeepLinkDispatchGuard({
    required this.userId,
    required this.navigationGeneration,
  });

  bool canComplete({
    required String? currentUserId,
    required int currentNavigationGeneration,
    required bool navigationReady,
  }) {
    return navigationReady &&
        currentUserId == userId &&
        currentNavigationGeneration == navigationGeneration;
  }
}

class DeepLinkIntentCoordinator {
  final DateTime Function() _now;
  final Duration _duplicateWindow;
  final Map<String, DateTime> _recentlyDispatched = {};
  DeepLinkRequest? _pendingRequest;
  bool _navigationReady = false;
  bool _isDispatching = false;

  DeepLinkIntentCoordinator({
    DateTime Function()? now,
    Duration duplicateWindow = const Duration(seconds: 2),
  })  : _now = now ?? DateTime.now,
        _duplicateWindow = duplicateWindow;

  Future<void> receive(
    DeepLinkRequest request, {
    required bool isAuthenticated,
    required DeepLinkDispatch dispatch,
  }) async {
    if (!_navigationReady || !isAuthenticated) {
      _storePending(request);
      return;
    }

    if (_isDispatching) {
      _storePending(request);
      return;
    }

    await _dispatch(request, dispatch);
    await _drainPending(
      isAuthenticated: isAuthenticated,
      dispatch: dispatch,
    );
  }

  Future<void> markNavigationReady({
    required bool isAuthenticated,
    required DeepLinkDispatch dispatch,
  }) async {
    _navigationReady = true;
    await _drainPending(
      isAuthenticated: isAuthenticated,
      dispatch: dispatch,
    );
  }

  void markNavigationUnavailable({required bool clearPending}) {
    _navigationReady = false;
    if (clearPending) {
      _pendingRequest = null;
    }
  }

  bool get isNavigationReady => _navigationReady;

  void _storePending(DeepLinkRequest request) {
    final pending = _pendingRequest;
    if (pending != null && pending.uri == request.uri) {
      _pendingRequest = DeepLinkRequest(
        uri: request.uri,
        useReplacement: pending.useReplacement || request.useReplacement,
      );
      return;
    }
    _pendingRequest = request;
  }

  Future<void> _drainPending({
    required bool isAuthenticated,
    required DeepLinkDispatch dispatch,
  }) async {
    while (_navigationReady && isAuthenticated && !_isDispatching) {
      final request = _pendingRequest;
      if (request == null) return;
      _pendingRequest = null;
      await _dispatch(request, dispatch);
    }
  }

  Future<void> _dispatch(
    DeepLinkRequest request,
    DeepLinkDispatch dispatch,
  ) async {
    final now = _now();
    _recentlyDispatched.removeWhere(
      (_, timestamp) => now.difference(timestamp) >= _duplicateWindow,
    );
    final key = request.uri.toString();
    final lastDispatched = _recentlyDispatched[key];
    if (lastDispatched != null &&
        now.difference(lastDispatched) < _duplicateWindow) {
      return;
    }

    _recentlyDispatched[key] = now;
    _isDispatching = true;
    try {
      await dispatch(request);
    } finally {
      _isDispatching = false;
    }
  }

  void reset() {
    _pendingRequest = null;
    _navigationReady = false;
    _isDispatching = false;
    _recentlyDispatched.clear();
  }
}

class DeepLinkService {
  static final AppLinks _appLinks = AppLinks();
  static StreamSubscription<Uri>? _linkSubscription;
  static StreamSubscription<Uri?>? _widgetClickSubscription;
  static GlobalKey<NavigatorState>? _navigatorKey;
  static const _deepLinkChannel = MethodChannel('com.bookgolas.app/deep_link');
  static final Set<String> _handledAuthUrls = {};
  static final DeepLinkIntentCoordinator _intentCoordinator =
      DeepLinkIntentCoordinator();
  static final DeepLinkBookResolver _bookResolver = DeepLinkBookResolver();
  static bool _isInitialized = false;
  static int _navigationGeneration = 0;

  static DeepLinkResult? parseUri(Uri uri) {
    if (uri.scheme != 'bookgolas') return null;

    final segments = _extractSegments(uri);
    if (segments.isEmpty) return null;

    if (segments.first != 'book') return null;

    if (segments.length == 2 && segments[1] == 'search') {
      return const DeepLinkResult(action: DeepLinkAction.search);
    }

    if (segments.length == 3 && segments[1] == 'detail') {
      final bookId = segments[2];
      if (bookId.isNotEmpty) {
        return DeepLinkResult(
          action: DeepLinkAction.bookDetail,
          bookId: bookId,
        );
      }
    }

    if (segments.length == 3 && segments[1] == 'record') {
      final bookId = segments[2];
      if (bookId.isNotEmpty) {
        return DeepLinkResult(
          action: DeepLinkAction.bookRecord,
          bookId: bookId,
        );
      }
    }

    if (segments.length == 3 && segments[1] == 'scan') {
      final bookId = segments[2];
      if (bookId.isNotEmpty) {
        return DeepLinkResult(
          action: DeepLinkAction.bookScan,
          bookId: bookId,
        );
      }
    }

    return null;
  }

  static List<String> _extractSegments(Uri uri) {
    if (uri.host.isNotEmpty) {
      return [uri.host, ...uri.pathSegments];
    }
    return uri.pathSegments;
  }

  static Future<void> init({
    GlobalKey<NavigatorState>? navigatorKey,
  }) async {
    _navigatorKey = navigatorKey;
    if (_isInitialized) return;
    _isInitialized = true;
    _setupNativeDeepLinkChannel();
    await _consumePendingNativeDeepLink();
    await _initWidgetClickHandler();
    await _initAppLinks();
  }

  static void _setupNativeDeepLinkChannel() {
    _deepLinkChannel.setMethodCallHandler((call) async {
      if (call.method == 'onDeepLink') {
        final request = DeepLinkRequest.fromNativePayload(call.arguments);
        if (request == null) return;
        await _handleNativeDeepLink(request);
      }
    });
  }

  static Future<void> _consumePendingNativeDeepLink() async {
    try {
      final payload = await _deepLinkChannel
          .invokeMethod<Object?>('consumePendingDeepLink');
      final request = DeepLinkRequest.fromNativePayload(payload);
      if (request != null) {
        await _handleNativeDeepLink(request);
      }
    } catch (e) {
      debugPrint('📱 네이티브 대기 딥링크 확인 실패: $e');
    }
  }

  static Future<void> _handleNativeDeepLink(DeepLinkRequest request) async {
    debugPrint('📱 네이티브 딥링크 수신: ${request.uri}');
    try {
      await _handleDeepLink(
        request.uri,
        useReplacement: request.useReplacement,
      );
    } finally {
      try {
        await _deepLinkChannel.invokeMethod<void>(
          'acknowledgeDeepLink',
          {
            'url': request.uri.toString(),
            'useReplacement': request.useReplacement,
          },
        );
      } catch (e) {
        debugPrint('📱 네이티브 딥링크 확인 응답 실패: $e');
      }
    }
  }

  static NavigatorState? get _navigator => _navigatorKey?.currentState;

  static Future<void> _initWidgetClickHandler() async {
    try {
      final initialWidgetUri =
          await HomeWidget.initiallyLaunchedFromHomeWidget();
      if (initialWidgetUri != null) {
        debugPrint('📱 위젯 콜드스타트 딥링크: $initialWidgetUri');
        await _handleDeepLink(initialWidgetUri, useReplacement: true);
      }
    } catch (e) {
      debugPrint('📱 위젯 초기 링크 처리 실패: $e');
    }

    _widgetClickSubscription?.cancel();
    _widgetClickSubscription = HomeWidget.widgetClicked.listen(
      (Uri? uri) {
        if (uri != null) {
          debugPrint('📱 위젯 클릭 딥링크: $uri');
          _handleDeepLink(uri, useReplacement: true);
        }
      },
      onError: (e) {
        debugPrint('📱 위젯 클릭 스트림 에러: $e');
      },
    );
  }

  static Future<void> _initAppLinks() async {
    try {
      final initialUri = await _appLinks.getInitialLink();
      if (initialUri != null && initialUri.scheme != 'bookgolas') {
        await _handleDeepLink(initialUri);
      }
    } catch (e) {
      debugPrint('🔗 딥링크 초기 링크 처리 실패: $e');
    }

    _linkSubscription?.cancel();
    _linkSubscription = _appLinks.uriLinkStream.listen(
      (Uri uri) {
        if (uri.scheme == 'bookgolas') return;
        _handleDeepLink(uri);
      },
      onError: (e) {
        debugPrint('🔗 딥링크 스트림 에러: $e');
      },
    );
  }

  static Future<String?> _resolveBookId(
    String? bookId, {
    required String userId,
  }) async {
    if (bookId == null) return null;
    if (bookId != 'current') return bookId;

    try {
      final response = await Supabase.instance.client
          .from('books')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'reading')
          .isFilter('deleted_at', null)
          .order('updated_at', ascending: false)
          .limit(1);
      if ((response as List).isNotEmpty) {
        final id = response.first['id'] as String;
        debugPrint('🔗 "current" → DB 첫 reading 책 ID: $id');
        return id;
      }

      final storedId = await HomeWidget.getWidgetData<String>('book_id');
      if (storedId != null && storedId.isNotEmpty) {
        debugPrint('🔗 "current" → 위젯 저장 책 ID: $storedId');
        return storedId;
      }
    } catch (e) {
      debugPrint('🔗 "current" bookId 해석 실패: $e');
    }
    return null;
  }

  static Future<void> _handleDeepLink(Uri uri,
      {bool useReplacement = false}) async {
    debugPrint('🔗 딥링크 수신: $uri (useReplacement=$useReplacement)');
    if (uri.host == 'login-callback' || uri.host == 'reset-callback') {
      if (uri.query.contains('error=') || uri.fragment.contains('error=')) {
        debugPrint('🔗 인증 콜백 에러 파라미터 감지 — 무시: $uri');
        return;
      }
      final urlKey = uri.toString();
      if (_handledAuthUrls.contains(urlKey)) {
        debugPrint('🔗 이미 처리된 인증 콜백 — 무시: $uri');
        return;
      }
      _handledAuthUrls.add(urlKey);
      debugPrint('🔗 Supabase 인증 콜백: $uri');
      try {
        await Supabase.instance.client.auth.getSessionFromUrl(uri);
        debugPrint('🔗 Supabase 인증 콜백 완료');
      } catch (e) {
        debugPrint('🔗 Supabase 인증 콜백 실패: $e');
      }
      return;
    }

    if (parseUri(uri) == null) {
      debugPrint('🔗 유효하지 않은 딥링크: $uri');
      return;
    }

    await _intentCoordinator.receive(
      DeepLinkRequest(uri: uri, useReplacement: useReplacement),
      isAuthenticated: Supabase.instance.client.auth.currentUser != null,
      dispatch: _dispatchDeepLink,
    );
  }

  static Future<void> _dispatchDeepLink(DeepLinkRequest request) async {
    final navigator = _navigator;
    if (navigator == null) {
      markNavigationUnavailable();
      if (_isInitialized && Supabase.instance.client.auth.currentUser != null) {
        await _intentCoordinator.receive(
          request,
          isAuthenticated: true,
          dispatch: _dispatchDeepLink,
        );
      }
      return;
    }

    final result = parseUri(request.uri);
    if (result == null) return;
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;
    final guard = DeepLinkDispatchGuard(
      userId: userId,
      navigationGeneration: _navigationGeneration,
    );

    bool canComplete() {
      return _isInitialized &&
          identical(_navigator, navigator) &&
          guard.canComplete(
            currentUserId: Supabase.instance.client.auth.currentUser?.id,
            currentNavigationGeneration: _navigationGeneration,
            navigationReady: _intentCoordinator.isNavigationReady,
          );
    }

    switch (result.action) {
      case DeepLinkAction.search:
        if (!canComplete()) return;
        final searchRoute = MaterialPageRoute<void>(
          builder: (context) => const ReadingStartScreen(),
        );
        DeepLinkNavigator.open(
          navigator,
          searchRoute,
          useReplacement: request.useReplacement,
        );
        break;

      case DeepLinkAction.bookDetail:
        final resolvedId = await _resolveBookId(
          result.bookId,
          userId: userId,
        );
        if (!canComplete()) return;
        if (resolvedId == null) return;
        final book = await _fetchBook(resolvedId, userId: userId);
        if (!canComplete()) return;
        if (book == null) {
          debugPrint('🔗 책을 찾을 수 없음: $resolvedId');
          return;
        }
        final detailRoute = MaterialPageRoute<void>(
          builder: (context) => BookDetailScreen(book: book),
        );
        DeepLinkNavigator.open(
          navigator,
          detailRoute,
          useReplacement: request.useReplacement,
        );
        break;

      case DeepLinkAction.bookRecord:
        final resolvedRecordId = await _resolveBookId(
          result.bookId,
          userId: userId,
        );
        if (!canComplete()) return;
        if (resolvedRecordId == null) return;
        final recordBook = await _fetchBook(
          resolvedRecordId,
          userId: userId,
        );
        if (!canComplete()) return;
        if (recordBook == null) {
          debugPrint('🔗 책을 찾을 수 없음: $resolvedRecordId');
          return;
        }
        final recordRoute = MaterialPageRoute<void>(
          builder: (context) => BookDetailScreen(
            book: recordBook,
            initialTabIndex: 1,
          ),
        );
        DeepLinkNavigator.open(
          navigator,
          recordRoute,
          useReplacement: request.useReplacement,
        );
        break;

      case DeepLinkAction.bookScan:
        final resolvedScanId = await _resolveBookId(
          result.bookId,
          userId: userId,
        );
        if (!canComplete()) return;
        if (resolvedScanId == null) return;
        final scanBook = await _fetchBook(
          resolvedScanId,
          userId: userId,
        );
        if (!canComplete()) return;
        if (scanBook == null) {
          debugPrint('🔗 책을 찾을 수 없음: $resolvedScanId');
          return;
        }
        final scanRoute = MaterialPageRoute<void>(
          builder: (context) => BookDetailScreen(
            book: scanBook,
            autoOpenScan: true,
          ),
        );
        DeepLinkNavigator.open(
          navigator,
          scanRoute,
          useReplacement: request.useReplacement,
        );
        break;
    }
  }

  static Future<void> markNavigationReady() async {
    _navigationGeneration += 1;
    await _intentCoordinator.markNavigationReady(
      isAuthenticated: Supabase.instance.client.auth.currentUser != null,
      dispatch: _dispatchDeepLink,
    );
  }

  static void markNavigationUnavailable() {
    _navigationGeneration += 1;
    _intentCoordinator.markNavigationUnavailable(clearPending: true);
  }

  static Future<Book?> _fetchBook(
    String bookId, {
    required String userId,
  }) async {
    try {
      return await _bookResolver.fetchOwnedBook(
        userId: userId,
        bookId: bookId,
        fetch: (userId, ownedBookId) async {
          final response = await Supabase.instance.client
              .from('books')
              .select()
              .eq('id', ownedBookId)
              .eq('user_id', userId)
              .isFilter('deleted_at', null)
              .maybeSingle();
          return response == null ? null : Book.fromJson(response);
        },
      );
    } catch (e) {
      debugPrint('🔗 딥링크 책 조회 실패: $e');
      return null;
    }
  }

  static void dispose() {
    _linkSubscription?.cancel();
    _linkSubscription = null;
    _widgetClickSubscription?.cancel();
    _widgetClickSubscription = null;
    _deepLinkChannel.setMethodCallHandler(null);
    _navigatorKey = null;
    _isInitialized = false;
    _navigationGeneration += 1;
    _intentCoordinator.reset();
  }
}
