import 'package:book_golas/domain/models/book.dart';

class BookDetailInfo {
  final String? description;
  final String? publishedDate;
  final List<String>? categories;
  final int? pageCount;
  final String? language;
  final String? title;
  final String? author;
  final String? imageUrl;
  final String? publisher;
  final String? isbn;

  BookDetailInfo({
    this.description,
    this.publishedDate,
    this.categories,
    this.pageCount,
    this.language,
    this.title,
    this.author,
    this.imageUrl,
    this.publisher,
    this.isbn,
  });

  factory BookDetailInfo.fromGoogleBooks(Map<String, dynamic> volumeInfo) {
    final authors = (volumeInfo['authors'] as List<dynamic>?)
        ?.map((a) => a.toString())
        .join(', ');

    final imageLinks = volumeInfo['imageLinks'] as Map<String, dynamic>?;
    final coverUrl = imageLinks?['thumbnail'] as String? ??
        imageLinks?['smallThumbnail'] as String?;

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
        .toList();

    return BookDetailInfo(
      description: volumeInfo['description'] as String?,
      publishedDate: volumeInfo['publishedDate'] as String?,
      categories: categories,
      pageCount: volumeInfo['pageCount'] as int?,
      language: volumeInfo['language'] as String?,
      title: volumeInfo['title'] as String?,
      author: authors,
      imageUrl: coverUrl,
      publisher: volumeInfo['publisher'] as String?,
      isbn: isbn13,
    );
  }

  factory BookDetailInfo.fromLocal(Book book) {
    return BookDetailInfo(
      title: book.title,
      author: book.author,
      imageUrl: book.imageUrl,
      publisher: book.publisher,
      isbn: book.isbn,
      pageCount: book.totalPages > 0 ? book.totalPages : null,
    );
  }

  BookDetailInfo copyWith({
    String? description,
    String? publishedDate,
    List<String>? categories,
    int? pageCount,
    String? language,
    String? title,
    String? author,
    String? imageUrl,
    String? publisher,
    String? isbn,
  }) {
    return BookDetailInfo(
      description: description ?? this.description,
      publishedDate: publishedDate ?? this.publishedDate,
      categories: categories ?? this.categories,
      pageCount: pageCount ?? this.pageCount,
      language: language ?? this.language,
      title: title ?? this.title,
      author: author ?? this.author,
      imageUrl: imageUrl ?? this.imageUrl,
      publisher: publisher ?? this.publisher,
      isbn: isbn ?? this.isbn,
    );
  }
}
