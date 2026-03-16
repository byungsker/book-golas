import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'package:book_golas/config/app_config.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/book_detail_info.dart';
import 'package:book_golas/ui/core/utils/isbn_validator.dart';

class GoogleBooksApiService {
  static const String _baseUrl = 'https://www.googleapis.com/books/v1/volumes';

  static Future<List<BookSearchResult>> searchBooks(String query) async {
    if (query.trim().isEmpty) return [];

    try {
      final cleanedQuery = IsbnValidator.cleanISBN(query);
      if (IsbnValidator.isValidISBN13(cleanedQuery)) {
        return await _searchByISBN(cleanedQuery);
      }

      return await _searchByTitle(query);
    } catch (e) {
      debugPrint('Error searching Google Books: $e');
      return [];
    }
  }

  static Future<List<BookSearchResult>> _searchByTitle(String title) async {
    final uri = Uri.parse(_baseUrl).replace(queryParameters: {
      'q': title,
      'maxResults': '10',
      'langRestrict': 'en',
      'printType': 'books',
      if (AppConfig.googleBooksApiKey.isNotEmpty)
        'key': AppConfig.googleBooksApiKey,
    });

    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final List<dynamic> items = data['items'] ?? [];

      return items
          .map((item) => _convertToBookSearchResult(item))
          .where((book) => book != null)
          .cast<BookSearchResult>()
          .toList();
    } else {
      throw Exception('Failed to search books: ${response.statusCode}');
    }
  }

  static Future<List<BookSearchResult>> _searchByISBN(String isbn) async {
    final uri = Uri.parse(_baseUrl).replace(queryParameters: {
      'q': 'isbn:$isbn',
      if (AppConfig.googleBooksApiKey.isNotEmpty)
        'key': AppConfig.googleBooksApiKey,
    });

    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final List<dynamic> items = data['items'] ?? [];

      if (items.isEmpty) return [];

      final result = _convertToBookSearchResult(items.first);
      return result != null ? [result] : [];
    } else {
      throw Exception('Failed to lookup ISBN: ${response.statusCode}');
    }
  }

  static BookSearchResult? _convertToBookSearchResult(
      Map<String, dynamic> item) {
    try {
      final volumeInfo = item['volumeInfo'] as Map<String, dynamic>?;
      if (volumeInfo == null) return null;

      final title = volumeInfo['title'] as String? ?? 'Unknown Title';
      final authors = (volumeInfo['authors'] as List<dynamic>?)
              ?.map((a) => a.toString())
              .join(', ') ??
          'Unknown Author';
      final publisher = volumeInfo['publisher'] as String? ?? '';
      final publishedDate = volumeInfo['publishedDate'] as String? ?? '';
      final description = volumeInfo['description'] as String? ?? '';
      final pageCount = volumeInfo['pageCount'] as int? ?? 0;

      final imageLinks = volumeInfo['imageLinks'] as Map<String, dynamic>?;
      final coverUrl = imageLinks?['thumbnail'] as String? ??
          imageLinks?['smallThumbnail'] as String? ??
          '';

      final industryIdentifiers =
          volumeInfo['industryIdentifiers'] as List<dynamic>?;
      String? isbn13;
      if (industryIdentifiers != null) {
        for (var identifier in industryIdentifiers) {
          if (identifier['type'] == 'ISBN_13') {
            isbn13 = identifier['identifier'] as String?;
            break;
          }
        }
      }

      final categories = (volumeInfo['categories'] as List<dynamic>?)
              ?.map((c) => c.toString())
              .toList() ??
          [];

      return BookSearchResult(
        title: title,
        author: authors,
        imageUrl: coverUrl.isNotEmpty ? coverUrl : null,
        totalPages: pageCount > 0 ? pageCount : null,
        isbn: isbn13,
        genre: categories.isNotEmpty ? categories.first : null,
        publisher: publisher.isNotEmpty ? publisher : null,
        aladinUrl: item['selfLink'] as String?,
      );
    } catch (e) {
      debugPrint('Error converting Google Books item: $e');
      return null;
    }
  }

  static Future<BookSearchResult?> lookupByISBN(String isbn) async {
    final results = await _searchByISBN(isbn);
    return results.isNotEmpty ? results.first : null;
  }

  static Future<BookDetailInfo?> fetchBookDetail(String isbn) async {
    try {
      final uri = Uri.parse(_baseUrl).replace(queryParameters: {
        'q': 'isbn:$isbn',
        if (AppConfig.googleBooksApiKey.isNotEmpty)
          'key': AppConfig.googleBooksApiKey,
      });

      final response = await http.get(uri).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> items = data['items'] ?? [];

        if (items.isEmpty) return null;

        final volumeInfo = items.first['volumeInfo'] as Map<String, dynamic>?;
        if (volumeInfo == null) return null;

        return BookDetailInfo.fromGoogleBooks(volumeInfo);
      } else {
        debugPrint('Failed to fetch book detail: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('Error fetching book detail: $e');
      return null;
    }
  }
}
