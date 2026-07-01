import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/reading_start/view_model/reading_start_view_model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://localhost:54321',
      anonKey: 'test-anon-key',
    );
  });

  group('ReadingStartViewModel', () {
    test(
        'selecting planned status defaults the planned start date to undetermined',
        () {
      final viewModel = ReadingStartViewModel(BookService());

      viewModel.setReadingStatus(BookStatus.planned);

      expect(viewModel.readingStatus, BookStatus.planned);
      expect(viewModel.hasPlannedDate, isFalse);
    });
  });
}
