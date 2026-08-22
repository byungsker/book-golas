import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:book_golas/data/services/book_detail_info_cache.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/book_detail_info.dart';

void main() {
  final cache = BookDetailInfoCache.instance;

  setUp(cache.clear);

  test('reuses a successful result for the same book', () async {
    var loadCount = 0;
    final detail = BookDetailInfo(description: 'cached description');

    final first = await cache.getOrLoad(_book, () async {
      loadCount++;
      return detail;
    });
    final second = await cache.getOrLoad(_book, () async {
      loadCount++;
      return BookDetailInfo(description: 'unexpected');
    });

    expect(first, same(detail));
    expect(second, same(detail));
    expect(loadCount, 1);
  });

  test('merges concurrent requests for the same book', () async {
    final completer = Completer<BookDetailInfo?>();
    var loadCount = 0;
    final detail = BookDetailInfo(description: 'shared description');

    final first = cache.getOrLoad(_book, () {
      loadCount++;
      return completer.future;
    });
    final second = cache.getOrLoad(_book, () async {
      loadCount++;
      return BookDetailInfo(description: 'unexpected');
    });

    completer.complete(detail);
    final results = await Future.wait([first, second]);

    expect(results, everyElement(same(detail)));
    expect(loadCount, 1);
  });

  test('changes the cache entry when book metadata changes', () async {
    var loadCount = 0;
    final updatedBook = _book.copyWith(isbn: '979-2');
    final firstDetail = BookDetailInfo(description: 'old description');
    final secondDetail = BookDetailInfo(description: 'new description');

    final first = await cache.getOrLoad(_book, () async {
      loadCount++;
      return firstDetail;
    });
    final second = await cache.getOrLoad(updatedBook, () async {
      loadCount++;
      return secondDetail;
    });

    expect(first, same(firstDetail));
    expect(second, same(secondDetail));
    expect(cache.read(_book), isNull);
    expect(cache.read(updatedBook), same(secondDetail));
    expect(loadCount, 2);
  });

  test('does not cache failures and supports explicit invalidation', () async {
    var loadCount = 0;
    final detail = BookDetailInfo(description: 'fresh description');

    Future<BookDetailInfo?> loader() async {
      loadCount++;
      return null;
    }

    expect(await cache.getOrLoad(_book, loader), isNull);
    expect(await cache.getOrLoad(_book, loader), isNull);
    expect(loadCount, 2);

    await cache.getOrLoad(_book, () async {
      loadCount++;
      return detail;
    });
    cache.invalidate(_book);
    expect(cache.read(_book), isNull);

    await cache.getOrLoad(_book, () async {
      loadCount++;
      return detail;
    });
    expect(loadCount, 4);
  });
}

final _book = Book(
  id: 'book-1',
  title: 'Test Book',
  author: 'Test Author',
  isbn: '979-1',
  startDate: DateTime(2026, 8, 1),
  targetDate: DateTime(2026, 8, 31),
);
