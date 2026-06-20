import 'package:book_golas/data/services/reading_progress_service.dart';

abstract class ReadingProgressRepository {
  Future<Map<String, int>> getTodayPagesReadByBook();
}

class ReadingProgressRepositoryImpl implements ReadingProgressRepository {
  final ReadingProgressService _readingProgressService;

  ReadingProgressRepositoryImpl(this._readingProgressService);

  @override
  Future<Map<String, int>> getTodayPagesReadByBook() {
    return _readingProgressService.fetchTodayPagesReadByBook();
  }
}
