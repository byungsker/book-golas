import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/reading_record.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/data/services/record_service.dart';

class MyLibraryViewModel extends ChangeNotifier {
  static const _booksCacheKey = 'my_library_books_cache';
  static const _recordsCacheKey = 'my_library_records_cache';

  final BookService _bookService = BookService();
  final RecordService _recordService = RecordService();

  List<Book> _books = [];
  bool _isLoading = false;
  int _selectedTabIndex = 0;
  int? _selectedYear;
  String? _selectedGenre;
  int? _selectedRating;
  String _readingSearchQuery = '';
  String _reviewSearchQuery = '';

  List<GroupedRecords> _groupedRecords = [];
  bool _isLoadingRecords = false;
  String? _selectedRecordType;
  final Set<String> _expandedBookIds = {};
  int _totalRecordCount = 0;

  List<Book> get books => _books;
  bool get isLoading => _isLoading;
  int get selectedTabIndex => _selectedTabIndex;
  int? get selectedYear => _selectedYear;
  String? get selectedGenre => _selectedGenre;
  int? get selectedRating => _selectedRating;
  String get readingSearchQuery => _readingSearchQuery;
  String get reviewSearchQuery => _reviewSearchQuery;

  List<GroupedRecords> get groupedRecords => _groupedRecords;
  bool get isLoadingRecords => _isLoadingRecords;
  String? get selectedRecordType => _selectedRecordType;
  Set<String> get expandedBookIds => _expandedBookIds;
  int get totalRecordCount => _totalRecordCount;

  List<Book> get allBooks => _books;

  List<Book> _applySearchFilter(List<Book> books, String searchQuery) {
    if (searchQuery.isEmpty) return books;
    final query = searchQuery.toLowerCase();
    return books.where((b) {
      final titleMatch = b.title.toLowerCase().contains(query);
      final authorMatch = b.author?.toLowerCase().contains(query) ?? false;
      return titleMatch || authorMatch;
    }).toList();
  }

  List<Book> get filteredBooks {
    var result = allBooks;
    if (_selectedYear != null) {
      result = result.where((b) => b.startDate.year == _selectedYear).toList();
    }
    if (_selectedGenre != null) {
      result = result.where((b) => b.genre == _selectedGenre).toList();
    }
    if (_selectedRating != null) {
      result = result.where((b) => b.rating == _selectedRating).toList();
    }
    return _applySearchFilter(result, _readingSearchQuery);
  }

  List<Book> get booksWithReview {
    final reviewBooks = _books
        .where(
          (b) =>
              (b.review != null && b.review!.isNotEmpty) ||
              (b.longReview != null && b.longReview!.isNotEmpty),
        )
        .toList();
    return _applySearchFilter(reviewBooks, _reviewSearchQuery);
  }

  List<int> get availableYears {
    final years = allBooks.map((b) => b.startDate.year).toSet().toList();
    years.sort((a, b) => b.compareTo(a));
    return years;
  }

  List<String> get availableGenres {
    final genres = allBooks
        .where((b) => b.genre != null && b.genre!.isNotEmpty)
        .map((b) => b.genre!)
        .toSet()
        .toList();
    genres.sort();
    return genres;
  }

  void setSelectedTabIndex(int index) {
    _selectedTabIndex = index;
    if (index == 2 && _groupedRecords.isEmpty && !_isLoadingRecords) {
      loadRecords();
    }
    notifyListeners();
  }

  void setSelectedYear(int? year) {
    _selectedYear = year;
    notifyListeners();
  }

  void setSelectedGenre(String? genre) {
    _selectedGenre = genre;
    notifyListeners();
  }

  void setSelectedRating(int? rating) {
    _selectedRating = rating;
    notifyListeners();
  }

  void clearFilters() {
    _selectedYear = null;
    _selectedGenre = null;
    _selectedRating = null;
    notifyListeners();
  }

  void setReadingSearchQuery(String query) {
    _readingSearchQuery = query;
    notifyListeners();
  }

  void setReviewSearchQuery(String query) {
    _reviewSearchQuery = query;
    notifyListeners();
  }

  Future<void> loadBooks() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedData = prefs.getString(_booksCacheKey);
      if (cachedData != null) {
        try {
          final List<dynamic> jsonList = jsonDecode(cachedData);
          _books = jsonList
              .map((json) => Book.fromJson(json as Map<String, dynamic>))
              .toList();
          notifyListeners();
        } catch (e) {
          debugPrint('Failed to parse books cache: $e');
        }
      }

      final serverBooks = await _bookService.fetchBooks();
      _books = serverBooks;
      _totalRecordCount = await _recordService.getTotalRecordCount();

      await prefs.setString(
        _booksCacheKey,
        jsonEncode(_books.map((b) => b.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('Failed to load books: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadRecords() async {
    _isLoadingRecords = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheKey = _selectedRecordType != null
          ? '${_recordsCacheKey}_$_selectedRecordType'
          : _recordsCacheKey;
      final cachedData = prefs.getString(cacheKey);
      if (cachedData != null) {
        try {
          final List<dynamic> jsonList = jsonDecode(cachedData);
          _groupedRecords = jsonList
              .map((json) =>
                  GroupedRecords.fromJson(json as Map<String, dynamic>))
              .toList();
          if (_groupedRecords.isNotEmpty && _expandedBookIds.isEmpty) {
            _expandedBookIds.add(_groupedRecords.first.bookId);
          }
          notifyListeners();
        } catch (e) {
          debugPrint('Failed to parse records cache: $e');
        }
      }

      final serverRecords = await _recordService.fetchGroupedRecords(
        contentType: _selectedRecordType,
      );
      _groupedRecords = serverRecords;
      if (_groupedRecords.isNotEmpty && _expandedBookIds.isEmpty) {
        _expandedBookIds.add(_groupedRecords.first.bookId);
      }

      await prefs.setString(
        cacheKey,
        jsonEncode(_groupedRecords.map((g) => g.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('Failed to load records: $e');
    } finally {
      _isLoadingRecords = false;
      notifyListeners();
    }
  }

  void setSelectedRecordType(String? type) {
    _selectedRecordType = type;
    loadRecords();
  }

  void toggleBookExpanded(String bookId) {
    if (_expandedBookIds.contains(bookId)) {
      _expandedBookIds.remove(bookId);
    } else {
      _expandedBookIds.add(bookId);
    }
    notifyListeners();
  }

  bool isBookExpanded(String bookId) {
    return _expandedBookIds.contains(bookId);
  }

  Future<void> invalidateCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_booksCacheKey);
    await prefs.remove(_recordsCacheKey);
    final keys = prefs.getKeys();
    for (final key in keys) {
      if (key.startsWith(_recordsCacheKey)) {
        await prefs.remove(key);
      }
    }
  }
}
