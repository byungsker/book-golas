import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/data/services/recommendation_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/reading_start/view_model/reading_start_view_model.dart';

class MockRecommendationService extends Mock implements RecommendationService {}

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

    test('missing consent exposes a recovery state and grant retry succeeds',
        () async {
      final recommendationService = MockRecommendationService();
      when(() => recommendationService.getCompletedBooksCount())
          .thenAnswer((_) async => 1);
      when(() => recommendationService.getCachedRecommendations())
          .thenAnswer((_) async => null);
      when(() => recommendationService.getRecommendations(locale: 'ko'))
          .thenAnswer(
        (_) async => RecommendationResult(
          success: false,
          recommendations: [],
          error: 'third_party_ai_consent_required',
        ),
      );
      final viewModel = ReadingStartViewModel(
        BookService(),
        recommendationService: recommendationService,
      );

      await viewModel.loadRecommendationsWithLocale('ko');

      expect(viewModel.recommendationConsentRequired, isTrue);
      expect(viewModel.shouldShowRecommendations, isTrue);

      when(() => recommendationService.getRecommendations(locale: 'ko'))
          .thenAnswer(
        (_) async => RecommendationResult(
          success: true,
          recommendations: [
            BookRecommendation(
              title: 'Book',
              author: 'Author',
              reason: 'Reason',
            ),
          ],
        ),
      );

      await viewModel.refreshRecommendations('ko');

      expect(viewModel.recommendationConsentRequired, isFalse);
      expect(viewModel.hasRecommendations, isTrue);
      verify(() => recommendationService.getRecommendations(locale: 'ko'))
          .called(2);
    });

    test('cached recommendations do not invoke the provider', () async {
      final recommendationService = MockRecommendationService();
      when(() => recommendationService.getCompletedBooksCount())
          .thenAnswer((_) async => 1);
      when(() => recommendationService.getCachedRecommendations()).thenAnswer(
        (_) async => RecommendationResult(
          success: true,
          recommendations: [
            BookRecommendation(
              title: 'Cached',
              author: 'Author',
              reason: 'Reason',
            ),
          ],
        ),
      );
      final viewModel = ReadingStartViewModel(
        BookService(),
        recommendationService: recommendationService,
      );

      await viewModel.loadRecommendationsWithLocale('ko');

      expect(viewModel.hasRecommendations, isTrue);
      verifyNever(
        () => recommendationService.getRecommendations(
            locale: any(named: 'locale')),
      );
    });
  });
}
