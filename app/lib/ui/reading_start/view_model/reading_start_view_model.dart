import 'dart:async';

import 'package:flutter/widgets.dart';

import 'package:book_golas/ui/core/view_model/base_view_model.dart';
import 'package:book_golas/data/services/book_search_service.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/data/services/recommendation_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/core/utils/isbn_validator.dart';
import 'package:book_golas/exceptions/subscription_exceptions.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ReadingStartViewModel extends BaseViewModel {
  final BookService _bookService;
  final RecommendationService _recommendationService = RecommendationService();

  Timer? _debounce;

  List<BookSearchResult> _searchResults = [];
  bool _isSearching = false;
  BookSearchResult? _selectedBook;
  DateTime _startDate = DateTime.now();
  DateTime _targetDate = DateTime.now().add(const Duration(days: 14));
  int _currentPageIndex = 0;
  bool _isSaving = false;

  BookStatus _readingStatus = BookStatus.reading;
  DateTime _plannedStartDate = DateTime.now().add(const Duration(days: 1));
  bool _hasPlannedDate = true;
  int? _dailyTargetPages;
  Book? _createdBook;
  int? _priority;
  String? _scanError;

  List<BookRecommendation> _recommendations = [];
  bool _isLoadingRecommendations = false;
  RecommendationStats? _recommendationStats;
  String? _recommendationError;
  bool _hasLoadedRecommendations = false;
  bool _hasCompletedBooks = false;

  bool _shouldShowPaywall = false;
  String? _paywallReason;

  List<BookSearchResult> get searchResults => _searchResults;
  bool get isSearching => _isSearching;
  BookSearchResult? get selectedBook => _selectedBook;
  DateTime get startDate => _startDate;
  DateTime get targetDate => _targetDate;
  int get currentPageIndex => _currentPageIndex;
  bool get isSaving => _isSaving;

  BookStatus get readingStatus => _readingStatus;
  DateTime get plannedStartDate => _plannedStartDate;
  bool get hasPlannedDate => _hasPlannedDate;
  int? get dailyTargetPages => _dailyTargetPages;
  Book? get createdBook => _createdBook;
  int? get priority => _priority;
  String? get scanError => _scanError;

  List<BookRecommendation> get recommendations => _recommendations;
  bool get isLoadingRecommendations => _isLoadingRecommendations;
  RecommendationStats? get recommendationStats => _recommendationStats;
  String? get recommendationError => _recommendationError;
  bool get hasRecommendations => _recommendations.isNotEmpty;
  bool get hasCompletedBooks => _hasCompletedBooks;
  bool get shouldShowRecommendations =>
      _hasCompletedBooks &&
      (_isLoadingRecommendations || _recommendations.isNotEmpty);

  bool get shouldShowPaywall => _shouldShowPaywall;
  String? get paywallReason => _paywallReason;

  /// Clear paywall state
  void clearPaywallState() {
    _shouldShowPaywall = false;
    _paywallReason = null;
  }

  /// 실제 사용할 시작일 (상태에 따라 다름)
  DateTime get effectiveStartDate =>
      _readingStatus == BookStatus.planned ? _plannedStartDate : DateTime.now();

  bool get canProceedToSchedule => _selectedBook != null;

  ReadingStartViewModel(this._bookService);

  /// Load recommendations with locale (called from UI after widget build)
  Future<void> loadRecommendationsWithLocale(String locale) async {
    if (_hasLoadedRecommendations) return;
    _hasLoadedRecommendations = true;

    try {
      final completedCount =
          await _recommendationService.getCompletedBooksCount();
      _hasCompletedBooks = completedCount > 0;

      if (!_hasCompletedBooks) {
        notifyListeners();
        return;
      }

      _isLoadingRecommendations = true;
      notifyListeners();

      final cached = await _recommendationService.getCachedRecommendations();
      if (cached != null && cached.recommendations.isNotEmpty) {
        _recommendations = cached.recommendations;
        _recommendationStats = cached.stats;
        _isLoadingRecommendations = false;
        notifyListeners();
        return;
      }

      final result =
          await _recommendationService.getRecommendations(locale: locale);
      if (result.success) {
        _recommendations = result.recommendations;
        _recommendationStats = result.stats;
      } else {
        _recommendationError = result.error;
      }
    } catch (e) {
      _recommendationError = e.toString();
    } finally {
      _isLoadingRecommendations = false;
      notifyListeners();
    }
  }

  /// 추천 도서들의 이미지를 백그라운드에서 로드 (캐시 사용)
  /// 배치 업데이트로 notifyListeners() 호출 최소화 (iOS 키보드 유지)
  Future<void> _loadRecommendationImages(Locale locale) async {
    bool hasUpdates = false;

    for (int i = 0; i < _recommendations.length; i++) {
      final rec = _recommendations[i];
      if (rec.imageUrl != null) continue;

      // 캐시 확인
      final cachedUrl = RecommendationService.getCachedImageUrl(rec.title);
      if (cachedUrl != null) {
        _recommendations[i] = rec.copyWith(imageUrl: cachedUrl);
        hasUpdates = true;
        continue;
      }

      // API 호출 (제목 정규화: 콜론/대시 이전 부분만 사용)
      try {
        final normalizedTitle = _normalizeBookTitle(rec.title);
        final results =
            await BookSearchService.searchBooks(normalizedTitle, locale);
        if (results.isNotEmpty && results.first.imageUrl != null) {
          final imageUrl = results.first.imageUrl!;
          RecommendationService.cacheImageUrl(rec.title, imageUrl);
          _recommendations[i] = rec.copyWith(imageUrl: imageUrl);
          hasUpdates = true;
        }
      } catch (e) {
        debugPrint(
            '[ReadingStartViewModel] Failed to load image for ${rec.title}: $e');
      }
    }

    // 모든 이미지 로드 후 한 번만 notifyListeners() 호출
    if (hasUpdates) {
      notifyListeners();
    }
  }

  /// 책 제목 정규화: 부제목(콜론/대시 이후) 제거
  /// 예: "그릿: 역경에 굴하지 않는 힘" → "그릿"
  String _normalizeBookTitle(String title) {
    // 콜론(:) 또는 대시(-) 이전 부분 추출
    final colonIndex = title.indexOf(':');
    final dashIndex = title.indexOf(' - ');

    int cutIndex = -1;
    if (colonIndex > 0 && dashIndex > 0) {
      cutIndex = colonIndex < dashIndex ? colonIndex : dashIndex;
    } else if (colonIndex > 0) {
      cutIndex = colonIndex;
    } else if (dashIndex > 0) {
      cutIndex = dashIndex;
    }

    if (cutIndex > 0) {
      return title.substring(0, cutIndex).trim();
    }
    return title;
  }

  Future<void> refreshRecommendations(String locale) async {
    _isLoadingRecommendations = true;
    _recommendationError = null;
    notifyListeners();

    try {
      final result =
          await _recommendationService.getRecommendations(locale: locale);
      if (result.success) {
        _recommendations = result.recommendations;
        _recommendationStats = result.stats;
      } else {
        _recommendationError = result.error;
      }
    } catch (e) {
      _recommendationError = e.toString();
    } finally {
      _isLoadingRecommendations = false;
      notifyListeners();
    }
  }

  /// Public method to load recommendation images (called from UI with locale)
  void loadRecommendationImagesWithLocale(Locale locale) {
    _loadRecommendationImages(locale);
  }

  void selectRecommendation(BookRecommendation recommendation, Locale locale) {
    _titleController?.text = recommendation.title;
    _searchBooks(recommendation.title, locale);
  }

  /// 추천 도서 검색 후 첫 번째 결과를 자동 선택
  /// 검색 완료 후 selectedBook이 설정되면 true 반환
  Future<bool> searchAndSelectFirstResult(String title, Locale locale) async {
    _titleController?.text = title;
    _isSearching = true;
    notifyListeners();

    try {
      final results = await BookSearchService.searchBooks(title, locale);
      _searchResults = results;

      if (results.isNotEmpty) {
        _selectedBook = results.first;
        return true;
      }
      return false;
    } catch (e) {
      _searchResults = [];
      return false;
    } finally {
      _isSearching = false;
      notifyListeners();
    }
  }

  TextEditingController? _titleController;
  void setTitleController(TextEditingController controller) {
    _titleController = controller;
  }

  void onSearchQueryChanged(String query, Locale locale) {
    if (_selectedBook != null) {
      _selectedBook = null;
      notifyListeners();
    }

    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      final trimmed = query.trim();
      if (trimmed.isEmpty) {
        _searchResults = [];
        _isSearching = false;
        notifyListeners();
        return;
      }
      _searchBooks(trimmed, locale);
    });
  }

  Future<void> _searchBooks(String query, Locale locale) async {
    _isSearching = true;
    notifyListeners();

    try {
      final results = await BookSearchService.searchBooks(query, locale);
      _searchResults = results;
    } catch (e) {
      _searchResults = [];
    } finally {
      _isSearching = false;
      notifyListeners();
    }
  }

  void selectBook(BookSearchResult book) {
    _selectedBook = book;
    notifyListeners();
  }

  void clearSelection() {
    _selectedBook = null;
    notifyListeners();
  }

  Future<void> searchByISBN(String isbn13, Locale locale) async {
    _isSearching = true;
    _scanError = null;
    notifyListeners();

    try {
      if (!IsbnValidator.isValidISBN13(isbn13)) {
        _scanError = 'ISBN 형식이 올바르지 않습니다';
        _searchResults = [];
        return;
      }

      final result = await BookSearchService.lookupByISBN(isbn13, locale);

      if (result != null) {
        _searchResults = [result];
        _selectedBook = result;
      } else {
        _scanError = '책 정보를 찾을 수 없습니다 ($isbn13)';
        _searchResults = [];
      }
    } catch (e) {
      _scanError = '책 검색에 실패했습니다';
      _searchResults = [];
    } finally {
      _isSearching = false;
      notifyListeners();
    }
  }

  void clearScanError() {
    _scanError = null;
    notifyListeners();
  }

  void setStartDate(DateTime date) {
    _startDate = date;
    notifyListeners();
  }

  void setTargetDate(DateTime date) {
    _targetDate = date;
    notifyListeners();
  }

  void setReadingStatus(BookStatus status) {
    _readingStatus = status;
    if (status == BookStatus.planned) {
      _targetDate = _plannedStartDate.add(const Duration(days: 14));
      _hasPlannedDate = true;
    } else {
      _targetDate = DateTime.now().add(const Duration(days: 14));
    }
    notifyListeners();
  }

  void setPlannedStartDate(DateTime date) {
    _plannedStartDate = date;
    if (_readingStatus == BookStatus.planned) {
      _targetDate = date.add(const Duration(days: 14));
    }
    notifyListeners();
  }

  void setHasPlannedDate(bool value) {
    _hasPlannedDate = value;
    notifyListeners();
  }

  void setPriority(int? priority) {
    _priority = priority;
    notifyListeners();
  }

  /// 하루 목표 페이지 설정
  void setDailyTargetPages(int? pages) {
    _dailyTargetPages = pages;
    notifyListeners();
  }

  void goToSchedulePage() {
    if (_currentPageIndex < 1) {
      _currentPageIndex = 1;
      notifyListeners();
    }
  }

  void goToSearchPage() {
    if (_currentPageIndex > 0) {
      _currentPageIndex = 0;
      notifyListeners();
    }
  }

  bool isSameBook(BookSearchResult a, BookSearchResult b) {
    final sameTitle = a.title == b.title;
    final sameAuthor = a.author == b.author;
    final samePages = (a.totalPages ?? -1) == (b.totalPages ?? -1);
    final sameImage = (a.imageUrl ?? '') == (b.imageUrl ?? '');
    return sameTitle && sameAuthor && samePages && sameImage;
  }

  Future<bool> startReading({
    String? fallbackTitle,
    String? fallbackImageUrl,
    int? fallbackTotalPages,
  }) async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return false;

    _isSaving = true;
    notifyListeners();

    try {
      // 상태에 따라 시작일 결정
      final actualStartDate = _readingStatus == BookStatus.planned
          ? (_hasPlannedDate ? _plannedStartDate : DateTime.now())
          : DateTime.now();

      // plannedStartDate: 읽을 예정 상태이고 날짜가 정해진 경우만 설정
      final actualPlannedStartDate =
          _readingStatus == BookStatus.planned && _hasPlannedDate
              ? _plannedStartDate
              : null;

      final book = Book(
        title: _selectedBook?.title ?? fallbackTitle ?? '',
        author: _selectedBook?.author,
        startDate: actualStartDate,
        targetDate: _targetDate,
        imageUrl: _selectedBook?.imageUrl ?? fallbackImageUrl,
        totalPages: _selectedBook?.totalPages ?? fallbackTotalPages ?? 0,
        status: _readingStatus.value,
        dailyTargetPages: _dailyTargetPages,
        priority: _priority,
        plannedStartDate: actualPlannedStartDate,
        isbn: _selectedBook?.isbn,
        genre: _selectedBook?.genre,
        publisher: _selectedBook?.publisher,
        aladinUrl: _selectedBook?.aladinUrl,
      );

      final bookData = book.toJson();
      bookData['user_id'] = userId;

      final result = await _bookService.addBookWithUserId(bookData);
      if (result != null) {
        _createdBook = result;
        return true;
      }
      return false;
    } on ConcurrentReadingLimitException catch (e) {
      _shouldShowPaywall = true;
      _paywallReason = e.message;
      clearError();
      return false;
    } catch (e) {
      setError(e.toString());
      return false;
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}
