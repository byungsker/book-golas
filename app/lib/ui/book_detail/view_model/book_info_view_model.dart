import 'package:flutter/foundation.dart';

import 'package:book_golas/data/repositories/book_detail_info_repository.dart';
import 'package:book_golas/data/services/book_detail_info_cache.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/book_detail_info.dart';

typedef BookDetailInfoLoader = Future<BookDetailInfo?> Function(Book book);

class BookInfoViewModel extends ChangeNotifier {
  final Book _book;
  final BookDetailInfoRepository? _repository;
  final BookDetailInfoLoader? _detailLoader;

  BookDetailInfo? _bookDetailInfo;
  bool _isLoading = true;
  bool _isDisposed = false;
  Future<void>? _loadFuture;

  BookInfoViewModel({
    required Book book,
    BookDetailInfoRepository? repository,
    BookDetailInfoLoader? detailLoader,
  })  : _book = book,
        _repository = repository,
        _detailLoader = detailLoader;

  Book get book => _book;
  BookDetailInfo? get bookDetailInfo => _bookDetailInfo;
  bool get isLoading => _isLoading;

  Future<void> loadBookDetail() {
    return _loadFuture ??= _loadBookDetail();
  }

  Future<void> _loadBookDetail() async {
    try {
      final detail = await BookDetailInfoCache.instance.getOrLoad(
        _book,
        () => _detailLoader?.call(_book) ??
            (_repository ?? BookDetailInfoRepository()).fetch(_book),
      );

      if (_isDisposed) return;
      _bookDetailInfo = detail ?? BookDetailInfo.fromLocal(_book);
    } catch (e) {
      debugPrint('📚 [BookInfo] ERROR: $e');
      if (_isDisposed) return;
      _bookDetailInfo = BookDetailInfo.fromLocal(_book);
    }

    if (_isDisposed) return;
    _isLoading = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }
}
