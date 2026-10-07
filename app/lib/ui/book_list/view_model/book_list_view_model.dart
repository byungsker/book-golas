import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/ui/core/view_model/base_view_model.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/data/repositories/reading_progress_repository.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/data/services/reading_progress_service.dart';
import 'package:book_golas/data/services/widget_data_service.dart';

enum AllTabFilter { all, reading, planned, completed, paused }

class BookListViewModel extends BaseViewModel {
  final ReadingProgressRepository _readingProgressRepository;
  final BookService? _bookService;
  StreamSubscription<List<Map<String, dynamic>>>? _booksSubscription;
  StreamSubscription<AuthState>? _authSubscription;

  List<Book> _books = [];
  Map<String, int> _todayPagesReadByBook = {};
  final Set<String> _statusUpdatesInFlight = {};
  int _selectedTabIndex = 0;
  bool _showAllCurrentBooks = false;
  bool _isInitialized = false;
  AllTabFilter _allTabFilter = AllTabFilter.all;

  List<Book> get books => _books;
  int get selectedTabIndex => _selectedTabIndex;
  bool get showAllCurrentBooks => _showAllCurrentBooks;
  AllTabFilter get allTabFilter => _allTabFilter;

  int todayPagesReadFor(Book book) {
    final id = book.id;
    if (id == null) return 0;
    return _todayPagesReadByBook[id] ?? 0;
  }

  @override
  bool get isLoading => !_isInitialized || super.isLoading;

  List<Book> get readingBooks => _books
      .where((book) =>
          book.status == BookStatus.reading.value &&
          !(book.currentPage >= book.totalPages && book.totalPages > 0))
      .toList();

  List<Book> get completedBooks => _books
      .where((book) =>
          book.status == BookStatus.completed.value ||
          (book.currentPage >= book.totalPages && book.totalPages > 0))
      .toList();

  BookListViewModel({
    ReadingProgressRepository? readingProgressRepository,
    BookService? bookService,
  })
      : _readingProgressRepository = readingProgressRepository ??
            ReadingProgressRepositoryImpl(ReadingProgressService()),
        _bookService = bookService;

  void initialize() {
    if (_isInitialized) return;

    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId != null) {
      _isInitialized = true;
      _init();
    } else {
      _setupAuthListener();
    }
  }

  void _setupAuthListener() {
    _authSubscription?.cancel();
    _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen(
      (data) {
        if (data.session?.user.id != null && !_isInitialized) {
          _isInitialized = true;
          _authSubscription?.cancel();
          _authSubscription = null;
          _init();
        }
      },
    );
  }

  void cycleToNextTab() {
    _selectedTabIndex = (_selectedTabIndex + 1) % 5;
    notifyListeners();
  }

  void jumpToTab(int index) {
    _selectedTabIndex = index.clamp(0, 4);
    notifyListeners();
  }

  List<Book> get plannedBooks =>
      _books.where((book) => book.status == BookStatus.planned.value).toList()
        ..sort((a, b) {
          if (a.priority != null && b.priority != null) {
            return a.priority!.compareTo(b.priority!);
          } else if (a.priority != null) {
            return -1;
          } else if (b.priority != null) {
            return 1;
          }
          if (a.plannedStartDate != null && b.plannedStartDate != null) {
            return a.plannedStartDate!.compareTo(b.plannedStartDate!);
          } else if (a.plannedStartDate != null) {
            return -1;
          } else if (b.plannedStartDate != null) {
            return 1;
          }
          return b.createdAt?.compareTo(a.createdAt ?? DateTime.now()) ?? 0;
        });

  List<Book> get pausedBooks =>
      _books.where((book) => book.status == BookStatus.willRetry.value).toList()
        ..sort((a, b) => (b.pausedAt ?? b.updatedAt ?? DateTime.now())
            .compareTo(a.pausedAt ?? a.updatedAt ?? DateTime.now()));

  Future<void> _init() async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;

    setLoading(true);

    try {
      final response = await Supabase.instance.client
          .from('books')
          .select()
          .eq('user_id', userId)
          .isFilter('deleted_at', null)
          .order('created_at', ascending: false);

      _books = (response as List).map((e) => Book.fromJson(e)).toList();
      _todayPagesReadByBook =
          await _readingProgressRepository.getTodayPagesReadByBook();
      _syncWidgetData();
      setLoading(false);
      notifyListeners();
    } catch (e) {
      debugPrint('[BookListViewModel] Initial fetch failed: $e');
      setError(e.toString());
      setLoading(false);
      return;
    }

    _booksSubscription = Supabase.instance.client
        .from('books')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .listen(
          (rows) async {
            _books = rows
                .where((e) => e['deleted_at'] == null)
                .map((e) => Book.fromJson(e))
                .toList();
            _todayPagesReadByBook =
                await _readingProgressRepository.getTodayPagesReadByBook();
            _syncWidgetData();
            notifyListeners();
          },
          onError: (error) {
            debugPrint('[BookListViewModel] Realtime stream error: $error');
          },
        );
  }

  void setSelectedTabIndex(int index) {
    if (_selectedTabIndex != index) {
      _selectedTabIndex = index;
      notifyListeners();
    }
  }

  void toggleShowAllCurrentBooks() {
    _showAllCurrentBooks = !_showAllCurrentBooks;
    notifyListeners();
  }

  void setAllTabFilter(AllTabFilter filter) {
    if (_allTabFilter != filter) {
      _allTabFilter = filter;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;

    try {
      final response = await Supabase.instance.client
          .from('books')
          .select()
          .eq('user_id', userId)
          .isFilter('deleted_at', null)
          .order('created_at', ascending: false);

      _books = (response as List).map((e) => Book.fromJson(e)).toList();
      _todayPagesReadByBook =
          await _readingProgressRepository.getTodayPagesReadByBook();
      _syncWidgetData();
      debugPrint('[BookListViewModel] refresh done: ${_books.length} books');
      notifyListeners();
    } catch (e) {
      debugPrint('[BookListViewModel] refresh failed: $e');
    }
  }

  Future<bool> updateBookStatus(Book book, BookStatus status) async {
    final bookId = book.id;
    if (bookId == null || _statusUpdatesInFlight.contains(bookId)) {
      return false;
    }
    if (book.status == status.value) return true;

    _statusUpdatesInFlight.add(bookId);
    try {
      final updatedBook =
          await (_bookService ?? BookService()).updateStatus(bookId, status);
      if (updatedBook == null) return false;

      final index = _books.indexWhere((currentBook) => currentBook.id == bookId);
      if (index != -1) {
        _books[index] = updatedBook;
      }
      _syncWidgetData();
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('[BookListViewModel] status update failed: $e');
      return false;
    } finally {
      _statusUpdatesInFlight.remove(bookId);
    }
  }

  void _syncWidgetData() {
    final reading = _books
        .where((b) =>
            b.status == BookStatus.reading.value &&
            !(b.currentPage >= b.totalPages && b.totalPages > 0))
        .toList();
    if (reading.isNotEmpty) {
      WidgetDataService().syncReadingBooks(reading);
    } else {
      WidgetDataService().clearWidgetData();
    }
  }

  @override
  void dispose() {
    _booksSubscription?.cancel();
    _authSubscription?.cancel();
    super.dispose();
  }
}
