import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:book_golas/data/services/note_structure_service.dart';

class MockSupabaseClient extends Mock implements SupabaseClient {}

class MockFunctionsClient extends Mock implements FunctionsClient {}

void main() {
  group('NoteStructureService', () {
    late MockSupabaseClient mockSupabaseClient;
    late NoteStructureService service;

    setUp(() {
      mockSupabaseClient = MockSupabaseClient();
    });

    group('structureNotes', () {
      test('should return NoteStructure on successful function invocation',
          () async {
        final mockResponse = {
          'bookId': 'book-123',
          'generatedAt': '2026-01-27T10:30:00Z',
          'clusters': [
            {
              'id': 'cluster-1',
              'name': 'Main Theme',
              'summary': 'The main theme of the book',
              'nodes': [
                {
                  'id': 'node-1',
                  'type': 'highlight',
                  'content': 'Important quote',
                  'pageNumber': 10,
                  'sourceId': 'highlight-1',
                }
              ],
            }
          ],
          'connections': [
            {
              'fromNodeId': 'node-1',
              'toNodeId': 'node-2',
              'reason': 'Related concepts',
            }
          ],
        };

        final mockFunctionsClient = MockFunctionsClient();
        when(() => mockSupabaseClient.functions)
            .thenReturn(mockFunctionsClient);

        final mockFunctionResponse = FunctionResponse(
          status: 200,
          data: mockResponse,
        );

        when(() => mockFunctionsClient.invoke(
              'structure-notes',
              body: any(named: 'body'),
            )).thenAnswer((_) async => mockFunctionResponse);

        service = NoteStructureService(supabaseClient: mockSupabaseClient);
        final result = await service.structureNotes('book-123');

        expect(result, isNotNull);
        expect(result?.bookId, 'book-123');
        expect(result?.clusters.length, 1);
        expect(result?.clusters[0].name, 'Main Theme');
        expect(result?.connections.length, 1);
      });

      test('should return null on function invocation error', () async {
        final mockFunctionsClient = MockFunctionsClient();
        when(() => mockSupabaseClient.functions)
            .thenReturn(mockFunctionsClient);

        when(() => mockFunctionsClient.invoke(
              'structure-notes',
              body: any(named: 'body'),
            )).thenThrow(Exception('Function invocation failed'));

        service = NoteStructureService(supabaseClient: mockSupabaseClient);
        final result = await service.structureNotes('book-123');

        expect(result, isNull);
      });

      test('should return null on non-200 status response', () async {
        final mockFunctionsClient = MockFunctionsClient();
        when(() => mockSupabaseClient.functions)
            .thenReturn(mockFunctionsClient);

        final mockFunctionResponse = FunctionResponse(
          status: 400,
          data: {'error': 'Invalid request'},
        );

        when(() => mockFunctionsClient.invoke(
              'structure-notes',
              body: any(named: 'body'),
            )).thenAnswer((_) async => mockFunctionResponse);

        service = NoteStructureService(supabaseClient: mockSupabaseClient);
        final result = await service.structureNotes('book-123');

        expect(result, isNull);
      });

      test('should handle timeout gracefully', () async {
        final mockFunctionsClient = MockFunctionsClient();
        when(() => mockSupabaseClient.functions)
            .thenReturn(mockFunctionsClient);

        when(() => mockFunctionsClient.invoke(
              'structure-notes',
              body: any(named: 'body'),
            )).thenThrow(TimeoutException('Timeout'));

        service = NoteStructureService(supabaseClient: mockSupabaseClient);
        final result = await service.structureNotes('book-123');

        expect(result, isNull);
      });

      test('should pass bookId in function body', () async {
        final mockFunctionsClient = MockFunctionsClient();
        when(() => mockSupabaseClient.functions)
            .thenReturn(mockFunctionsClient);

        final mockFunctionResponse = FunctionResponse(
          status: 200,
          data: {
            'bookId': 'book-456',
            'generatedAt': '2026-01-27T10:30:00Z',
            'clusters': [],
            'connections': [],
          },
        );

        when(() => mockFunctionsClient.invoke(
              'structure-notes',
              body: any(named: 'body'),
            )).thenAnswer((_) async => mockFunctionResponse);

        service = NoteStructureService(supabaseClient: mockSupabaseClient);
        await service.structureNotes('book-456');

        verify(() => mockFunctionsClient.invoke(
              'structure-notes',
              body: {'bookId': 'book-456'},
            )).called(1);
      });

      test('should handle empty clusters and connections', () async {
        final mockResponse = {
          'bookId': 'book-empty',
          'generatedAt': '2026-01-27T10:30:00Z',
          'clusters': [],
          'connections': [],
        };

        final mockFunctionsClient = MockFunctionsClient();
        when(() => mockSupabaseClient.functions)
            .thenReturn(mockFunctionsClient);

        final mockFunctionResponse = FunctionResponse(
          status: 200,
          data: mockResponse,
        );

        when(() => mockFunctionsClient.invoke(
              'structure-notes',
              body: any(named: 'body'),
            )).thenAnswer((_) async => mockFunctionResponse);

        service = NoteStructureService(supabaseClient: mockSupabaseClient);
        final result = await service.structureNotes('book-empty');

        expect(result, isNotNull);
        expect(result?.clusters.isEmpty, true);
        expect(result?.connections.isEmpty, true);
      });
    });
  });
}
