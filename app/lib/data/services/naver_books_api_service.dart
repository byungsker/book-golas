import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'package:book_golas/config/app_config.dart';
import 'package:book_golas/utils/html_utils.dart';

class NaverBooksApiService {
  static const String _baseUrl =
      'https://openapi.naver.com/v1/search/book.json';

  static Future<String?> fetchDescription(String isbn) async {
    return _fetchDescriptionByQuery(isbn);
  }

  static Future<String?> fetchDescriptionByTitle(
    String title,
    String? author,
  ) async {
    final shortTitle = _extractMainTitle(title);
    final cleanAuthor = _cleanAuthorName(author);
    debugPrint(
      '📗 [Naver] shortTitle="$shortTitle", cleanAuthor="$cleanAuthor"',
    );

    final query = cleanAuthor != null ? '$shortTitle $cleanAuthor' : shortTitle;
    final result = await _fetchDescriptionByQuery(query);

    if (result != null) return result;

    if (cleanAuthor != null) {
      debugPrint('📗 [Naver] 제목+저자 실패 → 제목만 재시도');
      return _fetchDescriptionByQuery(shortTitle);
    }

    return null;
  }

  static String _extractMainTitle(String title) {
    var main = _normalizeUnicode(title);

    final dashRegex = RegExp(
      r'\s+[\-\u2010\u2011\u2012\u2013\u2014\u2015\uFF0D]\s+',
    );
    final dashMatch = dashRegex.firstMatch(main);
    if (dashMatch != null && dashMatch.start > 0) {
      main = main.substring(0, dashMatch.start);
    }

    final colonRegex = RegExp(r'\s+[\:\uFF1A]\s+');
    final colonMatch = colonRegex.firstMatch(main);
    if (colonMatch != null && colonMatch.start > 0) {
      main = main.substring(0, colonMatch.start);
    }

    final parenRegex = RegExp(r'\s+[\(\uFF08]');
    final parenMatch = parenRegex.firstMatch(main);
    if (parenMatch != null && parenMatch.start > 0) {
      main = main.substring(0, parenMatch.start);
    }

    return main.trim();
  }

  static String _normalizeUnicode(String text) {
    return text
        .replaceAll('\u00A0', ' ')
        .replaceAll('\u2009', ' ')
        .replaceAll('\u200B', '')
        .replaceAll('\u3000', ' ')
        .replaceAll('\uFEFF', '');
  }

  static String? _cleanAuthorName(String? author) {
    if (author == null || author.isEmpty) return null;
    var clean = _normalizeUnicode(author)
        .replaceAll(RegExp(r'\s*[\(\uFF08]지은이[\)\uFF09]'), '')
        .replaceAll(RegExp(r'\s*[\(\uFF08]저[\)\uFF09]'), '')
        .replaceAll(RegExp(r'\s*[\(\uFF08]옮긴이[\)\uFF09]'), '')
        .replaceAll(RegExp(r'\s*[\(\uFF08]글[\)\uFF09]'), '')
        .replaceAll(RegExp(r'\s*[\(\uFF08]그림[\)\uFF09]'), '')
        .replaceAll(RegExp(r'\s*[\(\uFF08]엮은이[\)\uFF09]'), '')
        .replaceAll(RegExp(r'\s*[\(\uFF08]편[\)\uFF09]'), '')
        .trim();
    return clean.isNotEmpty ? clean : null;
  }

  static Future<String?> _fetchDescriptionByQuery(String query) async {
    debugPrint('📗 [Naver] query="$query"');
    debugPrint(
      '📗 [Naver] clientId=${AppConfig.naverClientId.isNotEmpty ? "${AppConfig.naverClientId.substring(0, 4)}..." : "EMPTY"}',
    );
    if (AppConfig.naverClientId.isEmpty ||
        AppConfig.naverClientSecret.isEmpty) {
      debugPrint('📗 [Naver] API 키 없음 → null 반환');
      return null;
    }

    try {
      final uri = Uri.parse(
        _baseUrl,
      ).replace(queryParameters: {'query': query});
      debugPrint('📗 [Naver] URL: $uri');

      final response = await http
          .get(
            uri,
            headers: {
              'X-Naver-Client-Id': AppConfig.naverClientId,
              'X-Naver-Client-Secret': AppConfig.naverClientSecret,
            },
          )
          .timeout(const Duration(seconds: 5));

      debugPrint('📗 [Naver] status=${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['errorCode'] != null) {
          debugPrint(
            '📗 [Naver] API ERROR: code=${data['errorCode']}, msg=${data['errorMessage']}',
          );
          return null;
        }

        final items = data['items'] as List?;
        debugPrint(
          '📗 [Naver] total=${data['total']}, items=${items?.length ?? 0}',
        );

        if (items != null && items.isNotEmpty) {
          final description = items[0]['description'] as String?;
          debugPrint(
            '📗 [Naver] desc=${description != null ? "${description.length}자" : "null"}',
          );
          if (description != null && description.isNotEmpty) {
            return stripAndDecodeHtml(description);
          }
        }
      } else {
        debugPrint(
          '📗 [Naver] ERROR status=${response.statusCode}, body=${response.body.substring(0, 200)}',
        );
      }

      return null;
    } catch (e) {
      debugPrint('📗 [Naver] EXCEPTION: $e');
      return null;
    }
  }
}
