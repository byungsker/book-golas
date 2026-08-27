import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/config/app_config.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/core/utils/isbn_validator.dart';
import 'package:book_golas/utils/html_utils.dart';

class AladinApiService {
  static SupabaseClient get _supabase => Supabase.instance.client;

  static Future<List<BookSearchResult>> searchBooks(String query) async {
    if (query.trim().isEmpty) return [];

    try {
      final cleanedQuery = IsbnValidator.cleanISBN(query);
      if (IsbnValidator.isValidISBN13(cleanedQuery)) {
        final result = await lookupByISBN(cleanedQuery);
        return result != null ? [result] : [];
      }

      final data = await _invoke(
        action: 'search',
        query: query,
        maxResults: AppConfig.maxSearchResults,
      );
      final items = _items(data);
      final books = <BookSearchResult>[];

      for (final item in items.take(5)) {
        final isbn = item['isbn13']?.toString();
        if (isbn != null && isbn.isNotEmpty) {
          final detailed = await lookupByISBN(isbn);
          books.add(detailed ?? BookSearchResult.fromJson(item));
        } else {
          books.add(BookSearchResult.fromJson(item));
        }
      }

      return books;
    } catch (error) {
      debugPrint('Error searching books: $error');
      return [];
    }
  }

  static Future<BookSearchResult?> lookupByISBN(String isbn) async {
    try {
      final data = await _invoke(action: 'lookup', isbn: isbn);
      final items = _items(data);
      return items.isEmpty ? null : BookSearchResult.fromJson(items.first);
    } catch (error) {
      debugPrint('Failed to look up Aladin book: $error');
      return null;
    }
  }

  static Future<BookSearchResult?> searchByTitle(
    String title,
    String? author,
  ) async {
    try {
      final cleanTitle = _cleanTitle(title);
      final cleanAuthor = _cleanAuthor(author);
      final query =
          cleanAuthor == null ? cleanTitle : '$cleanTitle $cleanAuthor';
      var result = await _searchFirst(query);
      if (result == null && cleanAuthor != null) {
        result = await _searchFirst(cleanTitle);
      }
      return result;
    } catch (error) {
      debugPrint('Failed to search Aladin title: $error');
      return null;
    }
  }

  static Future<String?> fetchDescriptionByTitle(String title) async {
    try {
      final data = await _invoke(
        action: 'search',
        query: title,
        maxResults: 1,
      );
      return _description(_items(data));
    } catch (error) {
      debugPrint('Failed to fetch Aladin description by title: $error');
      return null;
    }
  }

  static Future<String?> fetchDescription(String isbn13) async {
    try {
      final data = await _invoke(action: 'lookup', isbn: isbn13);
      return _description(_items(data));
    } catch (error) {
      debugPrint('Failed to fetch Aladin description: $error');
      return null;
    }
  }

  static Future<BookSearchResult?> _searchFirst(String query) async {
    final data = await _invoke(
      action: 'search',
      query: query,
      maxResults: 1,
    );
    final items = _items(data);
    if (items.isEmpty) return null;

    final isbn = items.first['isbn13']?.toString();
    if (isbn != null && isbn.isNotEmpty) {
      final detailed = await lookupByISBN(isbn);
      if (detailed != null) return detailed;
    }
    return BookSearchResult.fromJson(items.first);
  }

  static Future<Map<String, dynamic>> _invoke({
    required String action,
    String? query,
    String? isbn,
    int? maxResults,
  }) async {
    final response = await _supabase.functions.invoke(
      'aladin-books',
      body: {
        'action': action,
        if (query != null) 'query': query,
        if (isbn != null) 'isbn': isbn,
        if (maxResults != null) 'maxResults': maxResults,
      },
    );

    if (response.status != 200 || response.data is! Map) {
      throw StateError('Aladin proxy request failed');
    }
    return Map<String, dynamic>.from(response.data as Map);
  }

  static List<Map<String, dynamic>> _items(Map<String, dynamic> data) {
    final rawItems = data['item'];
    if (rawItems is! List) return [];
    return rawItems
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  static String? _description(List<Map<String, dynamic>> items) {
    if (items.isEmpty) return null;
    final description = items.first['description']?.toString();
    if (description == null || description.isEmpty) return null;
    return stripAndDecodeHtml(description);
  }

  static String _cleanTitle(String title) {
    var cleaned = title.split(' - ').first.trim();
    cleaned = cleaned.split(' : ').first.trim();
    return cleaned.split('(').first.trim();
  }

  static String? _cleanAuthor(String? author) {
    if (author == null || author.isEmpty) return null;
    final cleaned = author
        .replaceAll(RegExp(r'\s*\(지은이\)'), '')
        .replaceAll(RegExp(r'\s*\(옮긴이\)'), '')
        .replaceAll(RegExp(r'\s*\(글\)'), '')
        .replaceAll(RegExp(r'\s*\(그림\)'), '')
        .replaceAll(RegExp(r'\s*\(저\)'), '')
        .replaceAll(RegExp(r'\s*\(역\)'), '')
        .replaceAll(RegExp(r'\s*\(편\)'), '')
        .trim()
        .split(',')
        .first
        .trim();
    return cleaned.isEmpty ? null : cleaned;
  }
}
