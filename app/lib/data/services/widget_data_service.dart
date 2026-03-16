import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:home_widget/home_widget.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/domain/models/book.dart';

class WidgetDataService {
  static final WidgetDataService _instance = WidgetDataService._internal();
  factory WidgetDataService() => _instance;
  WidgetDataService._internal();

  static const List<String> _widgetKinds = [
    'BookgolasSmallWidget',
    'BookgolasMediumWidget',
    'BookgolasQuickActionWidget',
  ];

  Future<void> syncReadingBooks(List<Book> readingBooks) async {
    try {
      final List<Map<String, dynamic>> bookListData = [];
      for (int i = 0; i < readingBooks.length; i++) {
        final book = readingBooks[i];
        final localImagePath =
            await _cacheBookCoverToAppGroup(book.imageUrl, index: i);
        bookListData.add({
          'id': book.id ?? '',
          'title': book.title,
          'author': book.author ?? '',
          'currentPage': book.currentPage,
          'totalPages': book.totalPages,
          'imagePath': localImagePath ?? '',
          'status': book.status ?? '',
        });
      }

      await HomeWidget.saveWidgetData<String>(
          'reading_books_json', jsonEncode(bookListData));
      await HomeWidget.saveWidgetData<int>(
          'reading_books_count', readingBooks.length);

      if (readingBooks.isNotEmpty) {
        await syncCurrentBook(readingBooks.first);
      }

      await refreshWidget();

      debugPrint(
          '📱 [WidgetDataService] 읽고 있는 책 ${readingBooks.length}권 동기화 완료');
    } catch (e) {
      debugPrint('📱 [WidgetDataService] 읽고 있는 책 동기화 실패: $e');
    }
  }

  Future<void> syncCurrentBook(Book book) async {
    try {
      final localImagePath = await cacheBookCoverToAppGroup(book.imageUrl);

      await HomeWidget.saveWidgetData<String>('book_id', book.id ?? '');
      await HomeWidget.saveWidgetData<String>('book_title', book.title);
      await HomeWidget.saveWidgetData<String>('book_author', book.author ?? '');
      await HomeWidget.saveWidgetData<int>('current_page', book.currentPage);
      await HomeWidget.saveWidgetData<int>('total_pages', book.totalPages);
      await HomeWidget.saveWidgetData<String>(
          'image_path', localImagePath ?? '');
      await HomeWidget.saveWidgetData<String>('book_status', book.status ?? '');
      await HomeWidget.saveWidgetData<String>(
          'last_updated', DateTime.now().toIso8601String());

      debugPrint('📱 [WidgetDataService] 위젯 데이터 동기화 완료: ${book.title}');
    } catch (e) {
      debugPrint('📱 [WidgetDataService] 위젯 데이터 동기화 실패: $e');
    }
  }

  Future<void> clearWidgetData() async {
    try {
      await HomeWidget.saveWidgetData<String>('book_id', '');
      await HomeWidget.saveWidgetData<String>('book_title', '');
      await HomeWidget.saveWidgetData<String>('book_author', '');
      await HomeWidget.saveWidgetData<int>('current_page', 0);
      await HomeWidget.saveWidgetData<int>('total_pages', 0);
      await HomeWidget.saveWidgetData<String>('image_path', '');
      await HomeWidget.saveWidgetData<String>('book_status', '');
      await HomeWidget.saveWidgetData<String>('last_updated', '');
      await HomeWidget.saveWidgetData<bool>('needs_sync', false);
      await HomeWidget.saveWidgetData<String>('reading_books_json', '[]');
      await HomeWidget.saveWidgetData<int>('reading_books_count', 0);

      await refreshWidget();

      debugPrint('📱 [WidgetDataService] 위젯 데이터 초기화 완료');
    } catch (e) {
      debugPrint('📱 [WidgetDataService] 위젯 데이터 초기화 실패: $e');
    }
  }

  Future<void> refreshWidget() async {
    try {
      for (final kind in _widgetKinds) {
        await HomeWidget.updateWidget(
          iOSName: kind,
          name: kind,
        );
      }
      debugPrint('📱 [WidgetDataService] 위젯 갱신 요청 완료');
    } catch (e) {
      debugPrint('📱 [WidgetDataService] 위젯 갱신 실패: $e');
    }
  }

  static const _appGroupChannel = MethodChannel('com.bookgolas.app/app_group');

  Future<String?> _getAppGroupDirectory() async {
    try {
      final path =
          await _appGroupChannel.invokeMethod<String>('getAppGroupDirectory');
      return path;
    } catch (e) {
      debugPrint('📱 [WidgetDataService] App Group 경로 조회 실패: $e');
      return null;
    }
  }

  Future<String?> cacheBookCoverToAppGroup(String? networkUrl) async {
    return _cacheBookCoverToAppGroup(networkUrl, index: 0);
  }

  Future<String?> _cacheBookCoverToAppGroup(String? networkUrl,
      {required int index}) async {
    if (networkUrl == null || networkUrl.isEmpty) return null;

    try {
      final groupDir = await _getAppGroupDirectory();
      if (groupDir == null) return null;

      final file = await DefaultCacheManager().getSingleFile(networkUrl);

      final widgetImageDir = Directory('$groupDir/widget_images');
      if (!widgetImageDir.existsSync()) {
        widgetImageDir.createSync(recursive: true);
      }

      final ext = file.path.split('.').last;
      final fileName = index == 0 ? 'book_cover' : 'book_cover_$index';
      final localPath = '${widgetImageDir.path}/$fileName.$ext';
      await file.copy(localPath);

      debugPrint('📱 [WidgetDataService] 커버 이미지 App Group 저장 완료: $localPath');
      return 'widget_images/$fileName.$ext';
    } catch (e) {
      debugPrint('📱 [WidgetDataService] 커버 이미지 캐시 실패: $e');
      return null;
    }
  }

  Future<void> handleNeedsSyncFlag() async {
    try {
      final needsSync =
          await HomeWidget.getWidgetData<bool>('needs_sync') ?? false;

      if (!needsSync) return;

      final bookId = await HomeWidget.getWidgetData<String>('book_id');
      final currentPageRaw =
          await HomeWidget.getWidgetData<int>('current_page');

      if (bookId == null || bookId.isEmpty) {
        return;
      }

      final currentPage = currentPageRaw;
      if (currentPage == null || currentPage <= 0) return;

      final supabase = Supabase.instance.client;
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;

      await supabase.from('books').update({
        'current_page': currentPage,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', bookId);

      await HomeWidget.saveWidgetData<bool>('needs_sync', false);

      debugPrint(
          '📱 [WidgetDataService] 위젯 → Supabase 동기화 완료: bookId=$bookId, page=$currentPage');
    } catch (e) {
      debugPrint('📱 [WidgetDataService] needs_sync 처리 실패: $e');
    }
  }
}
