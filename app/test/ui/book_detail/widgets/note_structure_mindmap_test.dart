import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:book_golas/domain/models/note_structure_models.dart';
import 'package:book_golas/ui/book_detail/widgets/note_structure_mindmap.dart';

void main() {
  group('NoteStructureMindmap', () {
    testWidgets('shows empty message when structure is null',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: NoteStructureMindmap(structure: null),
          ),
        ),
      );

      expect(find.text('독서 기록이 부족합니다.\n최소 5개 이상의 하이라이트나 메모가 필요합니다.'),
          findsOneWidget);
    });

    testWidgets('shows empty message when clusters are empty',
        (WidgetTester tester) async {
      final emptyStructure = NoteStructure(
        bookId: 'test-book',
        generatedAt: DateTime.now(),
        clusters: [],
        connections: [],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NoteStructureMindmap(structure: emptyStructure),
          ),
        ),
      );

      expect(find.text('독서 기록이 부족합니다.\n최소 5개 이상의 하이라이트나 메모가 필요합니다.'),
          findsOneWidget);
    });

    testWidgets('renders cluster name and summary',
        (WidgetTester tester) async {
      final structure = NoteStructure(
        bookId: 'test-book',
        generatedAt: DateTime.now(),
        clusters: [
          Cluster(
            id: 'cluster-1',
            name: 'Test Cluster',
            summary: 'This is a test summary',
            nodes: [],
          ),
        ],
        connections: [],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NoteStructureMindmap(structure: structure),
          ),
        ),
      );

      expect(find.text('Test Cluster'), findsOneWidget);
      expect(find.text('This is a test summary'), findsOneWidget);
    });

    testWidgets('renders nodes within cluster', (WidgetTester tester) async {
      final structure = NoteStructure(
        bookId: 'test-book',
        generatedAt: DateTime.now(),
        clusters: [
          Cluster(
            id: 'cluster-1',
            name: 'Test Cluster',
            summary: 'Summary',
            nodes: [
              Node(
                id: 'node-1',
                type: 'highlight',
                content: 'Test highlight content',
                pageNumber: 42,
              ),
              Node(
                id: 'node-2',
                type: 'note',
                content: 'Test note content',
              ),
            ],
          ),
        ],
        connections: [],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NoteStructureMindmap(structure: structure),
          ),
        ),
      );

      expect(find.text('Test highlight content'), findsOneWidget);
      expect(find.text('Test note content'), findsOneWidget);
    });

    testWidgets('truncates long node content', (WidgetTester tester) async {
      const longContent =
          'This is a very long content that should be truncated';
      final structure = NoteStructure(
        bookId: 'test-book',
        generatedAt: DateTime.now(),
        clusters: [
          Cluster(
            id: 'cluster-1',
            name: 'Test Cluster',
            summary: 'Summary',
            nodes: [
              Node(
                id: 'node-1',
                type: 'highlight',
                content: longContent,
              ),
            ],
          ),
        ],
        connections: [],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NoteStructureMindmap(structure: structure),
          ),
        ),
      );

      expect(find.text('${longContent.substring(0, 30)}...'), findsOneWidget);
      expect(find.text(longContent), findsNothing);
    });

    testWidgets('has InteractiveViewer for zoom/pan',
        (WidgetTester tester) async {
      final structure = NoteStructure(
        bookId: 'test-book',
        generatedAt: DateTime.now(),
        clusters: [
          Cluster(
            id: 'cluster-1',
            name: 'Test Cluster',
            summary: 'Summary',
            nodes: [],
          ),
        ],
        connections: [],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NoteStructureMindmap(structure: structure),
          ),
        ),
      );

      expect(find.byType(InteractiveViewer), findsOneWidget);
    });
  });
}
