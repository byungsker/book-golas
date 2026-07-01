import 'package:flutter/foundation.dart';

enum BookStatus {
  planned('planned'),
  reading('reading'),
  completed('completed'),
  willRetry('will_retry');

  final String value;
  const BookStatus(this.value);

  static BookStatus fromString(String? s) =>
      values.firstWhere((e) => e.value == s, orElse: () => reading);
}

class BookSearchResult {
  final String title;
  final String author;
  final String? imageUrl;
  final int? totalPages;
  final String? isbn;
  final String? genre;
  final String? publisher;
  final String? aladinUrl;
  final int? price;

  BookSearchResult({
    required this.title,
    required this.author,
    this.imageUrl,
    this.totalPages,
    this.isbn,
    this.genre,
    this.publisher,
    this.aladinUrl,
    this.price,
  });

  factory BookSearchResult.fromJson(Map<String, dynamic> json) {
    int? parsedPages;
    final itemPage = json['subInfo']?['itemPage'];

    if (itemPage != null) {
      if (itemPage is int) {
        parsedPages = itemPage;
      } else if (itemPage is String) {
        parsedPages = int.tryParse(itemPage);
      } else {
        parsedPages = int.tryParse(itemPage.toString());
      }
    }

    String? parsedGenre;
    final categoryName = json['categoryName'] as String?;
    if (categoryName != null && categoryName.isNotEmpty) {
      final parts = categoryName.split('>');
      parsedGenre = parts.length > 1 ? parts[1].trim() : parts.last.trim();
    }

    debugPrint(
        '📖 책 파싱 완료 - 제목: ${json['title']}, 페이지: $parsedPages, 장르: $parsedGenre');

    return BookSearchResult(
      title: json['title'] ?? '',
      author: json['author'] ?? '',
      imageUrl: json['cover'],
      totalPages: parsedPages,
      isbn: json['isbn13'] ?? json['isbn'],
      genre: parsedGenre,
      publisher: json['publisher'] as String?,
      aladinUrl: json['link'] as String?,
      price: _parseInt(json['priceStandard'] ?? json['priceSales']),
    );
  }
}

int? _parseInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

class Book {
  final String? id;
  final String title;
  final String? author;
  final DateTime startDate;
  final DateTime targetDate;
  final String? imageUrl;
  final int currentPage;
  final int totalPages;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? status;
  final int attemptCount;
  final int? dailyTargetPages;
  final int? priority;
  final DateTime? pausedAt;
  final DateTime? plannedStartDate;
  final DateTime? deletedAt;
  final String? genre;
  final String? publisher;
  final String? isbn;
  final int? rating;
  final String? review;
  final String? reviewLink;
  final String? aladinUrl;
  final String? longReview;
  final int? price;

  Book({
    this.id,
    required this.title,
    this.author,
    required this.startDate,
    required this.targetDate,
    this.imageUrl,
    this.currentPage = 0,
    this.totalPages = 0,
    this.createdAt,
    this.updatedAt,
    this.status,
    this.attemptCount = 1,
    this.dailyTargetPages,
    this.priority,
    this.pausedAt,
    this.plannedStartDate,
    this.deletedAt,
    this.genre,
    this.publisher,
    this.isbn,
    this.rating,
    this.review,
    this.reviewLink,
    this.aladinUrl,
    this.longReview,
    this.price,
  });

  Book copyWith({
    String? id,
    String? title,
    String? author,
    DateTime? startDate,
    DateTime? targetDate,
    String? imageUrl,
    int? currentPage,
    int? totalPages,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? status,
    int? attemptCount,
    int? dailyTargetPages,
    int? priority,
    DateTime? pausedAt,
    DateTime? plannedStartDate,
    DateTime? deletedAt,
    String? genre,
    String? publisher,
    String? isbn,
    int? rating,
    String? review,
    String? reviewLink,
    String? aladinUrl,
    String? longReview,
    int? price,
  }) {
    return Book(
      id: id ?? this.id,
      title: title ?? this.title,
      author: author ?? this.author,
      startDate: startDate ?? this.startDate,
      targetDate: targetDate ?? this.targetDate,
      imageUrl: imageUrl ?? this.imageUrl,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      status: status ?? this.status,
      attemptCount: attemptCount ?? this.attemptCount,
      dailyTargetPages: dailyTargetPages ?? this.dailyTargetPages,
      priority: priority ?? this.priority,
      pausedAt: pausedAt ?? this.pausedAt,
      plannedStartDate: plannedStartDate ?? this.plannedStartDate,
      deletedAt: deletedAt ?? this.deletedAt,
      genre: genre ?? this.genre,
      publisher: publisher ?? this.publisher,
      isbn: isbn ?? this.isbn,
      rating: rating ?? this.rating,
      review: review ?? this.review,
      reviewLink: reviewLink ?? this.reviewLink,
      aladinUrl: aladinUrl ?? this.aladinUrl,
      longReview: longReview ?? this.longReview,
      price: price ?? this.price,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'title': title,
      'author': author,
      'start_date': startDate.toIso8601String(),
      'target_date': targetDate.toIso8601String(),
      'image_url': imageUrl,
      'current_page': currentPage,
      'total_pages': totalPages,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
      if (status != null) 'status': status,
      'attempt_count': attemptCount,
      if (dailyTargetPages != null) 'daily_target_pages': dailyTargetPages,
      if (priority != null) 'priority': priority,
      if (pausedAt != null) 'paused_at': pausedAt!.toIso8601String(),
      if (plannedStartDate != null)
        'planned_start_date': plannedStartDate!.toIso8601String(),
      if (deletedAt != null) 'deleted_at': deletedAt!.toIso8601String(),
      if (genre != null) 'genre': genre,
      if (publisher != null) 'publisher': publisher,
      if (isbn != null) 'isbn': isbn,
      if (rating != null) 'rating': rating,
      if (review != null) 'review': review,
      if (reviewLink != null) 'review_link': reviewLink,
      if (aladinUrl != null) 'aladin_url': aladinUrl,
      if (longReview != null) 'long_review': longReview,
      if (price != null) 'price': price,
    };
  }

  factory Book.fromJson(Map<String, dynamic> json) {
    return Book(
      id: json['id'] as String?,
      title: json['title'] as String,
      author: json['author'] as String?,
      startDate: DateTime.parse(json['start_date'] as String),
      targetDate: DateTime.parse(json['target_date'] as String),
      imageUrl: json['image_url'] as String?,
      currentPage: json['current_page'] as int? ?? 0,
      totalPages: json['total_pages'] as int? ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
      status: json['status'] as String?,
      attemptCount: json['attempt_count'] as int? ?? 1,
      dailyTargetPages: json['daily_target_pages'] as int?,
      priority: json['priority'] as int?,
      pausedAt:
          json['paused_at'] != null ? DateTime.parse(json['paused_at']) : null,
      plannedStartDate: json['planned_start_date'] != null
          ? DateTime.parse(json['planned_start_date'])
          : null,
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'])
          : null,
      genre: json['genre'] as String?,
      publisher: json['publisher'] as String?,
      isbn: json['isbn'] as String?,
      rating: json['rating'] as int?,
      review: json['review'] as String?,
      reviewLink: json['review_link'] as String?,
      aladinUrl: json['aladin_url'] as String?,
      longReview: json['long_review'] as String?,
      price: _parseInt(json['price']),
    );
  }
}
