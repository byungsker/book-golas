import 'package:flutter/foundation.dart';

import 'package:book_golas/data/repositories/book_repository.dart';
import 'package:book_golas/domain/models/book.dart';

class HomeViewModel extends ChangeNotifier {
  static Future<void> preloadPreferences() async {}

  final BookRepository _bookRepository;

  bool _isLoading = false;
  String? _errorMessage;

  HomeViewModel(this._bookRepository);

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<Book> get books => _bookRepository.cachedBooks;
  bool get hasBooks => _bookRepository.hasBooks;
  Book? get latestBook => _bookRepository.latestBook;

  Future<void> loadBooks() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _bookRepository.getBooks();
    } catch (e) {
      _errorMessage = '책 목록을 불러오는데 실패했습니다: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  int getDaysPassed(Book book) {
    return DateTime.now().difference(book.startDate).inDays;
  }

  int getTotalDays(Book book) {
    return book.targetDate.difference(book.startDate).inDays;
  }

  double getProgressPercentage(Book book) {
    final daysPassed = getDaysPassed(book);
    final totalDays = getTotalDays(book);
    return totalDays > 0 ? (daysPassed / totalDays * 100).clamp(0, 100) : 0;
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
