import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/ui/core/view_model/base_view_model.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/data/services/widget_data_service.dart';

enum AllTabFilter { all, reading, planned, completed, paused }

class BookListViewModel extends BaseViewModel {
  StreamSubscription<List<Map<String, dynamic>>>? _booksSubscription;
  StreamSubscription<AuthState>? _authSubscription;

  List<Book> _books = [];
  int _selectedTabIndex = 0;
  bool _showAllCurrentBooks = false;
  bool _isInitialized = false;
  AllTabFilter _allTabFilter = AllTabFilter.all;

  List<Book> get books => _books;
  int get selectedTabIndex => _selectedTabIndex;
  bool get showAllCurrentBooks => _showAllCurrentBooks;
  AllTabFilter get allTabFilter => _allTabFilter;

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

  BookListViewModel();

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
          (rows) {
            _books = rows
                .where((e) => e['deleted_at'] == null)
                .map((e) => Book.fromJson(e))
                .toList();
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
      _syncWidgetData();
      debugPrint('[BookListViewModel] refresh done: ${_books.length} books');
      notifyListeners();
    } catch (e) {
      debugPrint('[BookListViewModel] refresh failed: $e');
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
