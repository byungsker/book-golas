import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/book_detail_info.dart';

class BookDetailInfoCache {
  BookDetailInfoCache._();

  static final instance = BookDetailInfoCache._();

  final Map<String, BookDetailInfo> _values = {};
  final Map<String, Future<BookDetailInfo?>> _inFlight = {};
  final Map<String, String> _activeKeyByIdentity = {};
  final Map<String, int> _generationByIdentity = {};
  int _epoch = 0;

  BookDetailInfo? read(Book book) {
    return _values[cacheKeyFor(book)];
  }

  Future<BookDetailInfo?> getOrLoad(
    Book book,
    Future<BookDetailInfo?> Function() loader,
  ) {
    final identity = _identityFor(book);
    final key = _activate(book, identity);
    final cached = _values[key];
    if (cached != null) return Future.value(cached);

    final existingRequest = _inFlight[key];
    if (existingRequest != null) return existingRequest;

    final epoch = _epoch;
    final generation = _generationByIdentity[identity] ?? 0;
    final request = Future.sync(loader);
    _inFlight[key] = request;

    return request.then((value) {
      if (value != null &&
          _epoch == epoch &&
          _activeKeyByIdentity[identity] == key &&
          _generationByIdentity[identity] == generation) {
        _values[key] = value;
      }
      return value;
    }).whenComplete(() {
      if (identical(_inFlight[key], request)) {
        _inFlight.remove(key);
      }
    });
  }

  void invalidate(Book book) {
    final identity = _identityFor(book);
    final activeKey = _activeKeyByIdentity.remove(identity);
    if (activeKey != null) {
      _values.remove(activeKey);
      _inFlight.remove(activeKey);
    }
    _generationByIdentity[identity] =
        (_generationByIdentity[identity] ?? 0) + 1;
  }

  void clear() {
    _epoch++;
    _values.clear();
    _inFlight.clear();
    _activeKeyByIdentity.clear();
    _generationByIdentity.clear();
  }

  String cacheKeyFor(Book book) {
    final identity = _identityFor(book);
    return _cacheKey(identity, _fingerprintFor(book));
  }

  String _activate(Book book, String identity) {
    final key = _cacheKey(identity, _fingerprintFor(book));
    final previousKey = _activeKeyByIdentity[identity];
    if (previousKey != key) {
      if (previousKey != null) _values.remove(previousKey);
      _activeKeyByIdentity[identity] = key;
      _generationByIdentity[identity] =
          (_generationByIdentity[identity] ?? 0) + 1;
    }
    return key;
  }

  String _identityFor(Book book) {
    final id = book.id?.trim();
    if (id != null && id.isNotEmpty) return 'id:$id';
    return 'title:${_normalize(book.title)}|author:${_normalize(book.author)}';
  }

  String _fingerprintFor(Book book) {
    return [
      _normalize(book.isbn),
      _normalize(book.title),
      _normalize(book.author),
      _normalize(book.publisher),
      _normalize(book.genre),
      _normalize(book.aladinUrl),
      _normalize(book.imageUrl),
      book.price?.toString() ?? '',
      book.totalPages.toString(),
    ].join('|');
  }

  String _cacheKey(String identity, String fingerprint) {
    return '$identity::$fingerprint';
  }

  String _normalize(String? value) => value?.trim().toLowerCase() ?? '';
}
