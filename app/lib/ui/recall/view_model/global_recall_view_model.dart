import 'package:flutter/foundation.dart';

import 'package:book_golas/data/services/recall_service.dart';
import 'package:book_golas/domain/models/recall_models.dart';
import 'package:book_golas/exceptions/subscription_exceptions.dart';

class GlobalRecallViewModel extends ChangeNotifier {
  final RecallService _recallService = RecallService();

  bool _isSearching = false;
  bool get isSearching => _isSearching;

  bool _isLoadingHistory = false;
  bool get isLoadingHistory => _isLoadingHistory;

  RecallSearchResult? _searchResult;
  RecallSearchResult? get searchResult => _searchResult;

  String? _currentQuery;
  String? get currentQuery => _currentQuery;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  List<RecallSearchHistory> _recentSearches = [];
  List<RecallSearchHistory> get recentSearches => _recentSearches;

  final Set<String> _expandedBooks = {};
  Set<String> get expandedBooks => _expandedBooks;

  bool _showAllBooks = false;
  bool get showAllBooks => _showAllBooks;

  bool _shouldShowPaywall = false;
  int _paywallRemainingUses = 0;

  bool get shouldShowPaywall => _shouldShowPaywall;
  int get paywallRemainingUses => _paywallRemainingUses;

  void clearPaywallState() {
    _shouldShowPaywall = false;
    _paywallRemainingUses = 0;
  }

  Future<void> loadGlobalRecentSearches() async {
    _isLoadingHistory = true;
    notifyListeners();

    try {
      _recentSearches = await _recallService.getGlobalRecentSearches();
    } catch (e) {
      debugPrint('Failed to load global recent searches: $e');
    } finally {
      _isLoadingHistory = false;
      notifyListeners();
    }
  }

  Future<void> search(String query) async {
    _isSearching = true;
    _searchResult = null;
    _errorMessage = null;
    _currentQuery = query;
    _expandedBooks.clear();
    _showAllBooks = false;
    notifyListeners();

    try {
      final result = await _recallService.search(
        query: query,
      );

      if (result != null) {
        _searchResult = result;
        if (result.sourcesByBook != null && result.sourcesByBook!.isNotEmpty) {
          _expandedBooks.add(result.sourcesByBook!.keys.first);
        }
        await loadGlobalRecentSearches();
      } else {
        _errorMessage = '검색 중 오류가 발생했습니다';
      }
    } on AiRecallLimitException catch (e) {
      _errorMessage = e.message;
      _shouldShowPaywall = true;
      _paywallRemainingUses = e.remainingUses;
    } catch (e) {
      debugPrint('Global recall search error: $e');
      _errorMessage = '검색 중 오류가 발생했습니다';
    } finally {
      _isSearching = false;
      notifyListeners();
    }
  }

  void loadFromHistory(RecallSearchHistory history) {
    _currentQuery = history.query;
    _searchResult = history.toSearchResult();
    _errorMessage = null;
    _expandedBooks.clear();
    _showAllBooks = false;
    notifyListeners();
  }

  Future<void> deleteHistory(String historyId) async {
    final success = await _recallService.deleteSearchHistory(historyId);
    if (success) {
      _recentSearches.removeWhere((h) => h.id == historyId);
      notifyListeners();
    }
  }

  void clearResult() {
    _searchResult = null;
    _currentQuery = null;
    _errorMessage = null;
    _expandedBooks.clear();
    _showAllBooks = false;
    notifyListeners();
  }

  void toggleBookExpanded(String bookTitle) {
    if (_expandedBooks.contains(bookTitle)) {
      _expandedBooks.remove(bookTitle);
    } else {
      _expandedBooks.add(bookTitle);
    }
    notifyListeners();
  }

  bool isBookExpanded(String bookTitle) {
    return _expandedBooks.contains(bookTitle);
  }

  void toggleShowAllBooks() {
    _showAllBooks = !_showAllBooks;
    notifyListeners();
  }

  List<MapEntry<String, List<RecallSource>>> get visibleBooks {
    if (_searchResult?.sourcesByBook == null) return [];
    final entries = _searchResult!.sourcesByBook!.entries.toList();
    if (_showAllBooks) return entries;
    return entries.take(5).toList();
  }

  int get totalBooksCount => _searchResult?.sourcesByBook?.length ?? 0;
  int get hiddenBooksCount => totalBooksCount > 5 ? totalBooksCount - 5 : 0;
}
