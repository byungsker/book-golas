import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:book_golas/data/services/reading_insights_service.dart';
import 'package:book_golas/domain/models/reading_insight.dart';
import 'package:book_golas/ui/reading_chart/view_model/reading_insights_view_model.dart';
import 'package:book_golas/ui/reading_chart/widgets/cards/ai_insight_card.dart';

// Mock classes
class MockReadingInsightsService extends Mock
    implements ReadingInsightsService {}

void main() {
  group('ReadingInsightsViewModel', () {
    late ReadingInsightsViewModel viewModel;
    late MockReadingInsightsService mockInsightsService;

    setUp(() {
      mockInsightsService = MockReadingInsightsService();
      // Mock the getLatestInsight to return null by default
      when(() => mockInsightsService.getLatestInsight('test-user-id'))
          .thenAnswer((_) async => null);
      when(() => mockInsightsService.canGenerateToday('test-user-id'))
          .thenAnswer((_) async => false);

      viewModel = ReadingInsightsViewModel(
        userId: 'test-user-id',
        insightsService: mockInsightsService,
      );
    });

    tearDown(() {
      viewModel.dispose();
    });

    test('should load cached insights successfully', () async {
      final mockInsights = [
        ReadingInsight(
          id: '1',
          title: 'Cached Insight',
          description: 'This is a cached insight',
          category: 'milestone',
          relatedBooks: [],
          generatedAt: DateTime.now(),
        ),
      ];

      when(() => mockInsightsService.getLatestInsight('test-user-id'))
          .thenAnswer((_) async => mockInsights);

      await viewModel.loadInsight();

      expect(viewModel.insights, isNotNull);
      expect(viewModel.insights!.length, 1);
      expect(viewModel.insights![0].title, 'Cached Insight');
      expect(viewModel.error, null);
      expect(viewModel.isLoading, false);
    });

    test('should handle null response when no cached insights exist', () async {
      when(() => mockInsightsService.getLatestInsight('test-user-id'))
          .thenAnswer((_) async => null);

      await viewModel.loadInsight();

      expect(viewModel.insights, null);
      expect(viewModel.error, null);
      expect(viewModel.isLoading, false);
    });

    test('should set isLoading to false after insight loading completes',
        () async {
      when(() => mockInsightsService.getLatestInsight('test-user-id'))
          .thenAnswer((_) async => []);

      await viewModel.loadInsight();

      expect(viewModel.isLoading, false);
    });

    test('should verify service method is called during loadInsight', () async {
      when(() => mockInsightsService.getLatestInsight('test-user-id'))
          .thenAnswer((_) async => null);

      await viewModel.loadInsight();

      // getLatestInsight is called in _initialize and loadInsight, so expect >= 1 calls
      verify(() => mockInsightsService.getLatestInsight('test-user-id'))
          .called(greaterThanOrEqualTo(1));
    });

    test('should clear memory successfully', () async {
      when(() => mockInsightsService.clearMemory('test-user-id'))
          .thenAnswer((_) async => {});
      when(() => mockInsightsService.canGenerateToday('test-user-id'))
          .thenAnswer((_) async => true);

      await viewModel.clearMemory();

      expect(viewModel.insights, null);
      expect(viewModel.error, null);
      expect(viewModel.isLoading, false);
    });

    test('should set isLoading to false after clearing memory', () async {
      when(() => mockInsightsService.clearMemory('test-user-id'))
          .thenAnswer((_) async => {});
      when(() => mockInsightsService.canGenerateToday('test-user-id'))
          .thenAnswer((_) async => false);

      await viewModel.clearMemory();

      expect(viewModel.isLoading, false);
    });

    test('should notify listeners when state changes', () async {
      var notifyCount = 0;
      viewModel.addListener(() {
        notifyCount++;
      });

      // Trigger a state change by calling loadInsight
      when(() => mockInsightsService.getLatestInsight('test-user-id'))
          .thenAnswer((_) async => null);

      await viewModel.loadInsight();

      expect(notifyCount, greaterThan(0));
    });

    test('should verify service method is called during clearMemory', () async {
      when(() => mockInsightsService.clearMemory('test-user-id'))
          .thenAnswer((_) async => {});
      when(() => mockInsightsService.canGenerateToday('test-user-id'))
          .thenAnswer((_) async => false);

      await viewModel.clearMemory();

      verify(() => mockInsightsService.clearMemory('test-user-id')).called(1);
    });

    test('should handle multiple insights in loadInsight', () async {
      final mockInsights = [
        ReadingInsight(
          id: '1',
          title: 'First Insight',
          description: 'First description',
          category: 'pattern',
          relatedBooks: ['Book 1'],
          generatedAt: DateTime.now(),
        ),
        ReadingInsight(
          id: '2',
          title: 'Second Insight',
          description: 'Second description',
          category: 'milestone',
          relatedBooks: ['Book 2', 'Book 3'],
          generatedAt: DateTime.now(),
        ),
      ];

      when(() => mockInsightsService.getLatestInsight('test-user-id'))
          .thenAnswer((_) async => mockInsights);

      await viewModel.loadInsight();

      expect(viewModel.insights, isNotNull);
      expect(viewModel.insights!.length, 2);
      expect(viewModel.insights![0].title, 'First Insight');
      expect(viewModel.insights![1].title, 'Second Insight');
    });
  });

  group('AiInsightCard Widget', () {
    testWidgets('should show loading state', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: true,
              insights: null,
              error: null,
              canGenerate: false,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('독서 패턴을 분석하고 있어요...'), findsOneWidget);
    });

    testWidgets('should show disabled state when bookCount < 3',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: null,
              canGenerate: false,
              bookCount: 2,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.text('AI 인사이트를 받으려면 책을 더 읽어보세요'), findsOneWidget);
      expect(find.text('현재 완독한 책: 2권'), findsOneWidget);
      expect(find.text('최소 3권, 권장 5권 이상'), findsOneWidget);
    });

    testWidgets('should show error state with retry button',
        (WidgetTester tester) async {
      var retryPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: 'Network error occurred',
              canGenerate: true,
              bookCount: 5,
              onGenerate: () {},
              onRetry: () {
                retryPressed = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('Network error occurred'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.text('다시 시도'), findsOneWidget);

      await tester.tap(find.text('다시 시도'));
      await tester.pumpAndSettle();

      expect(retryPressed, true);
    });

    testWidgets('should show empty state when no insights',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: null,
              canGenerate: true,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.text('아래 버튼을 눌러 인사이트를 생성해보세요'), findsOneWidget);
      expect(find.text('분석하기'), findsOneWidget);
    });

    testWidgets('should show success state with insights',
        (WidgetTester tester) async {
      final insights = [
        ReadingInsight(
          id: '1',
          title: 'Fiction Preference',
          description: 'You have been reading more fiction books recently',
          category: 'pattern',
          relatedBooks: ['Book A', 'Book B'],
          generatedAt: DateTime.now(),
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: insights,
              error: null,
              canGenerate: false,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.text('Fiction Preference'), findsOneWidget);
      expect(find.text('You have been reading more fiction books recently'),
          findsOneWidget);
      expect(find.text('Book A'), findsOneWidget);
      expect(find.text('Book B'), findsOneWidget);
    });

    testWidgets('should show multiple insights', (WidgetTester tester) async {
      final insights = [
        ReadingInsight(
          id: '1',
          title: 'First Insight',
          description: 'First insight description',
          category: 'pattern',
          relatedBooks: [],
          generatedAt: DateTime.now(),
        ),
        ReadingInsight(
          id: '2',
          title: 'Second Insight',
          description: 'Second insight description',
          category: 'milestone',
          relatedBooks: [],
          generatedAt: DateTime.now(),
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: insights,
              error: null,
              canGenerate: false,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.text('First Insight'), findsOneWidget);
      expect(find.text('Second Insight'), findsOneWidget);
      expect(find.text('First insight description'), findsOneWidget);
      expect(find.text('Second insight description'), findsOneWidget);
    });

    testWidgets('should call onGenerate when button is pressed',
        (WidgetTester tester) async {
      var generatePressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: null,
              canGenerate: true,
              bookCount: 5,
              onGenerate: () {
                generatePressed = true;
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('분석하기'));
      await tester.pumpAndSettle();

      expect(generatePressed, true);
    });

    testWidgets('should show rate limit message when canGenerate is false',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: null,
              canGenerate: false,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.text('오늘 이미 분석했어요. 내일 다시 시도해주세요.'), findsOneWidget);
    });

    testWidgets('should display correct category icon for pattern',
        (WidgetTester tester) async {
      final insights = [
        ReadingInsight(
          id: '1',
          title: 'Pattern Insight',
          description: 'Pattern description',
          category: 'pattern',
          relatedBooks: [],
          generatedAt: DateTime.now(),
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: insights,
              error: null,
              canGenerate: false,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.trending_up), findsOneWidget);
    });

    testWidgets('should display correct category icon for milestone',
        (WidgetTester tester) async {
      final insights = [
        ReadingInsight(
          id: '1',
          title: 'Milestone Insight',
          description: 'Milestone description',
          category: 'milestone',
          relatedBooks: [],
          generatedAt: DateTime.now(),
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: insights,
              error: null,
              canGenerate: false,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.emoji_events), findsOneWidget);
    });

    testWidgets('should display correct category icon for reflection',
        (WidgetTester tester) async {
      final insights = [
        ReadingInsight(
          id: '1',
          title: 'Reflection Insight',
          description: 'Reflection description',
          category: 'reflection',
          relatedBooks: [],
          generatedAt: DateTime.now(),
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: insights,
              error: null,
              canGenerate: false,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.lightbulb_outline), findsOneWidget);
    });

    testWidgets('should display AI header with icon',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: null,
              canGenerate: true,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.text('AI 인사이트'), findsOneWidget);
      expect(find.byIcon(Icons.auto_awesome), findsOneWidget);
    });

    testWidgets('should handle empty related books list',
        (WidgetTester tester) async {
      final insights = [
        ReadingInsight(
          id: '1',
          title: 'No Books Insight',
          description: 'Insight with no related books',
          category: 'pattern',
          relatedBooks: [],
          generatedAt: DateTime.now(),
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: insights,
              error: null,
              canGenerate: false,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.text('No Books Insight'), findsOneWidget);
      expect(find.text('Insight with no related books'), findsOneWidget);
    });

    testWidgets('should display error message when error is provided',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: 'Custom error message',
              canGenerate: true,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.text('Custom error message'), findsOneWidget);
    });

    testWidgets('should not show retry button when onRetry is null',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: 'Some error',
              canGenerate: true,
              bookCount: 5,
              onGenerate: () {},
              onRetry: null,
            ),
          ),
        ),
      );

      expect(find.text('Some error'), findsOneWidget);
      expect(find.text('다시 시도'), findsNothing);
    });

    testWidgets('should display book count correctly when bookCount >= 3',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: null,
              canGenerate: false,
              bookCount: 5,
              onGenerate: () {},
            ),
          ),
        ),
      );

      // When bookCount >= 3 and canGenerate is false, show rate limit message
      expect(find.text('오늘 이미 분석했어요. 내일 다시 시도해주세요.'), findsOneWidget);
    });

    testWidgets(
        'should display book count in disabled state when bookCount < 3',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AiInsightCard(
              isLoading: false,
              insights: null,
              error: null,
              canGenerate: false,
              bookCount: 2,
              onGenerate: () {},
            ),
          ),
        ),
      );

      expect(find.text('현재 완독한 책: 2권'), findsOneWidget);
    });
  });
}
