import 'package:flutter_test/flutter_test.dart';
import 'package:book_golas/data/services/deep_link_service.dart';

void main() {
  group('DeepLinkService.parseUri - search', () {
    test('should parse search URI as search action', () {
      final uri = Uri.parse('bookgolas://book/search');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.search);
      expect(result.bookId, isNull);
    });

    test('should parse search URI constructed with pathSegments', () {
      final uri = Uri(scheme: 'bookgolas', pathSegments: ['book', 'search']);
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.search);
      expect(result.bookId, isNull);
    });
  });

  group('DeepLinkService.parseUri - bookDetail', () {
    test('should extract bookId from detail URI', () {
      final uri = Uri.parse('bookgolas://book/detail/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookDetail);
      expect(result.bookId, 'abc-123');
    });

    test('should parse UUID-style bookId', () {
      final uri = Uri.parse(
          'bookgolas://book/detail/550e8400-e29b-41d4-a716-446655440000');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookDetail);
      expect(result.bookId, '550e8400-e29b-41d4-a716-446655440000');
    });

    test('should parse detail URI constructed with pathSegments', () {
      final uri =
          Uri(scheme: 'bookgolas', pathSegments: ['book', 'detail', 'abc-123']);
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookDetail);
      expect(result.bookId, 'abc-123');
    });
  });

  group('DeepLinkService.parseUri - bookRecord', () {
    test('should extract bookId from record URI', () {
      final uri = Uri.parse('bookgolas://book/record/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookRecord);
      expect(result.bookId, 'abc-123');
    });

    test('should extract bookId correctly in record mode', () {
      final uri = Uri.parse('bookgolas://book/record/my-book-42');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookRecord);
      expect(result.bookId, 'my-book-42');
    });
  });

  group('DeepLinkService.parseUri - bookScan', () {
    test('should extract bookId from scan URI', () {
      final uri = Uri.parse('bookgolas://book/scan/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookScan);
      expect(result.bookId, 'abc-123');
    });

    test('should parse UUID-style bookId for scan', () {
      final uri = Uri.parse(
          'bookgolas://book/scan/550e8400-e29b-41d4-a716-446655440000');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNotNull);
      expect(result!.action, DeepLinkAction.bookScan);
      expect(result.bookId, '550e8400-e29b-41d4-a716-446655440000');
    });

    test('should return null for scan without bookId', () {
      final uri = Uri.parse('bookgolas://book/scan');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });
  });

  group('DeepLinkService.parseUri - invalid URIs', () {
    test('should return null for wrong scheme', () {
      final uri = Uri.parse('https://book/detail/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for empty path', () {
      final uri = Uri(scheme: 'bookgolas');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for non-book host', () {
      final uri = Uri.parse('bookgolas://settings/theme');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for unknown action', () {
      final uri = Uri.parse('bookgolas://book/unknown/abc-123');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for detail without bookId', () {
      final uri = Uri.parse('bookgolas://book/detail');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for record without bookId', () {
      final uri = Uri.parse('bookgolas://book/record');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for only book segment', () {
      final uri = Uri.parse('bookgolas://book');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });

    test('should return null for empty bookId in detail', () {
      final uri = Uri.parse('bookgolas://book/detail/');
      final result = DeepLinkService.parseUri(uri);

      expect(result, isNull);
    });
  });

  group('DeepLinkResult', () {
    test('should store action and bookId correctly', () {
      const result =
          DeepLinkResult(action: DeepLinkAction.bookDetail, bookId: 'abc');

      expect(result.action, DeepLinkAction.bookDetail);
      expect(result.bookId, 'abc');
    });

    test('should allow null bookId for search action', () {
      const result = DeepLinkResult(action: DeepLinkAction.search);

      expect(result.action, DeepLinkAction.search);
      expect(result.bookId, isNull);
    });
  });

  group('DeepLinkAction enum', () {
    test('should have four values', () {
      expect(DeepLinkAction.values.length, 4);
    });

    test('should contain search, bookDetail, bookRecord, bookScan', () {
      expect(DeepLinkAction.values, contains(DeepLinkAction.search));
      expect(DeepLinkAction.values, contains(DeepLinkAction.bookDetail));
      expect(DeepLinkAction.values, contains(DeepLinkAction.bookRecord));
      expect(DeepLinkAction.values, contains(DeepLinkAction.bookScan));
    });
  });

  group('URI parsing format consistency', () {
    test('Uri.parse and Uri constructor should produce same parseUri result',
        () {
      final parsed = Uri.parse('bookgolas://book/detail/abc-123');
      final constructed =
          Uri(scheme: 'bookgolas', pathSegments: ['book', 'detail', 'abc-123']);

      final parsedResult = DeepLinkService.parseUri(parsed);
      final constructedResult = DeepLinkService.parseUri(constructed);

      expect(parsedResult, isNotNull);
      expect(constructedResult, isNotNull);
      expect(parsedResult!.action, constructedResult!.action);
      expect(parsedResult.bookId, constructedResult.bookId);
    });

    test('search URI should work with both formats', () {
      final parsed = Uri.parse('bookgolas://book/search');
      final constructed =
          Uri(scheme: 'bookgolas', pathSegments: ['book', 'search']);

      expect(DeepLinkService.parseUri(parsed)?.action, DeepLinkAction.search);
      expect(
          DeepLinkService.parseUri(constructed)?.action, DeepLinkAction.search);
    });

    test('scan URI should work with both formats', () {
      final parsed = Uri.parse('bookgolas://book/scan/test-id');
      final constructed =
          Uri(scheme: 'bookgolas', pathSegments: ['book', 'scan', 'test-id']);

      final parsedResult = DeepLinkService.parseUri(parsed);
      final constructedResult = DeepLinkService.parseUri(constructed);

      expect(parsedResult?.action, DeepLinkAction.bookScan);
      expect(constructedResult?.action, DeepLinkAction.bookScan);
      expect(parsedResult?.bookId, 'test-id');
      expect(constructedResult?.bookId, 'test-id');
    });
  });
}
