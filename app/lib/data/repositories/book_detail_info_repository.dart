import 'package:flutter/foundation.dart';

import 'package:book_golas/data/services/aladin_api_service.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/data/services/google_books_api_service.dart';
import 'package:book_golas/data/services/naver_books_api_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/book_detail_info.dart';

class BookDetailInfoRepository {
  final BookService _bookService;

  BookDetailInfoRepository({BookService? bookService})
      : _bookService = bookService ?? BookService();

  Future<BookDetailInfo?> fetch(Book book) async {
    final hasIsbn = book.isbn != null && book.isbn!.isNotEmpty;
    var hasRemoteData = false;

    debugPrint(
      '📚 [BookInfo] 시작: title="${book.title}", isbn=${book.isbn}, hasIsbn=$hasIsbn',
    );

    BookDetailInfo? detail;
    BookDetailInfo? googleDetail;

    if (hasIsbn) {
      debugPrint('📚 [BookInfo] Step1: 네이버 ISBN 검색 (${book.isbn})');
      final naverDesc = await NaverBooksApiService.fetchDescription(book.isbn!);
      debugPrint(
        '📚 [BookInfo] Step1 결과: ${naverDesc != null ? "${naverDesc.length}자" : "null"}',
      );
      if (naverDesc != null && naverDesc.isNotEmpty) {
        hasRemoteData = true;
        detail = BookDetailInfo.fromLocal(book).copyWith(
          description: naverDesc,
        );
      }

      if (detail?.description == null || detail!.description!.isEmpty) {
        debugPrint('📚 [BookInfo] Step2: 알라딘 ISBN 검색 (${book.isbn})');
        final aladinDesc = await AladinApiService.fetchDescription(book.isbn!);
        debugPrint(
          '📚 [BookInfo] Step2 결과: ${aladinDesc != null ? "${aladinDesc.length}자" : "null"}',
        );
        if (aladinDesc != null && aladinDesc.isNotEmpty) {
          hasRemoteData = true;
          detail = BookDetailInfo.fromLocal(book).copyWith(
            description: aladinDesc,
          );
        }
      }

      debugPrint('📚 [BookInfo] Step3: Google Books ISBN 검색 (${book.isbn})');
      googleDetail = await GoogleBooksApiService.fetchBookDetail(book.isbn!);
      debugPrint(
        '📚 [BookInfo] Step3 결과: ${googleDetail?.description != null ? "${googleDetail!.description!.length}자" : "null"}',
      );
      if (googleDetail != null) hasRemoteData = true;

      if (detail == null ||
          detail.description == null ||
          detail.description!.isEmpty) {
        detail = googleDetail;
      }
    }

    if (detail == null ||
        detail.description == null ||
        detail.description!.isEmpty) {
      debugPrint('📚 [BookInfo] Step4: 네이버 제목 검색 ("${book.title}")');
      final titleDesc = await NaverBooksApiService.fetchDescriptionByTitle(
        book.title,
        book.author,
      );
      debugPrint(
        '📚 [BookInfo] Step4 결과: ${titleDesc != null ? "${titleDesc.length}자" : "null"}',
      );
      if (titleDesc != null && titleDesc.isNotEmpty) {
        hasRemoteData = true;
        detail = (detail ?? BookDetailInfo.fromLocal(book)).copyWith(
          description: titleDesc,
        );
      }
    }

    if (detail == null ||
        detail.description == null ||
        detail.description!.isEmpty) {
      debugPrint('📚 [BookInfo] Step5: 알라딘 제목 검색 ("${book.title}")');
      final aladinTitleDesc = await AladinApiService.fetchDescriptionByTitle(
        book.title,
      );
      debugPrint(
        '📚 [BookInfo] Step5 결과: ${aladinTitleDesc != null ? "${aladinTitleDesc.length}자" : "null"}',
      );
      if (aladinTitleDesc != null && aladinTitleDesc.isNotEmpty) {
        hasRemoteData = true;
        detail = (detail ?? BookDetailInfo.fromLocal(book)).copyWith(
          description: aladinTitleDesc,
        );
      }
    }

    detail ??= BookDetailInfo.fromLocal(book);

    if (googleDetail != null) {
      detail = detail.copyWith(
        publisher: detail.publisher ?? googleDetail.publisher,
        isbn: detail.isbn ?? googleDetail.isbn,
        categories: detail.categories ?? googleDetail.categories,
        publishedDate: detail.publishedDate ?? googleDetail.publishedDate,
        language: detail.language ?? googleDetail.language,
        pageCount: detail.pageCount ?? googleDetail.pageCount,
      );
    }

    debugPrint(
      '📚 [BookInfo] 최종: description=${detail.description != null ? "${detail.description!.length}자" : "null"}',
    );

    final needsBackfill = book.id != null &&
        (book.publisher == null ||
            book.isbn == null ||
            book.genre == null ||
            book.aladinUrl == null ||
            book.price == null);

    if (needsBackfill) {
      debugPrint(
        '📚 [BookInfo] 메타데이터 보정 시작: '
        'publisher=${book.publisher}, isbn=${book.isbn}, '
        'genre=${book.genre}, aladinUrl=${book.aladinUrl}, '
        'price=${book.price}',
      );
      BookSearchResult? aladinResult;

      try {
        if (hasIsbn) {
          aladinResult = await AladinApiService.lookupByISBN(book.isbn!);
          debugPrint(
            '📚 [BookInfo] 알라딘 ISBN 조회 결과: '
            'publisher=${aladinResult?.publisher}, isbn=${aladinResult?.isbn}',
          );
        }

        aladinResult ??= await AladinApiService.searchByTitle(
          book.title,
          book.author,
        );
        debugPrint(
          '📚 [BookInfo] 알라딘 최종 결과: '
          'publisher=${aladinResult?.publisher}, isbn=${aladinResult?.isbn}, '
          'genre=${aladinResult?.genre}, aladinUrl=${aladinResult?.aladinUrl != null}',
        );
      } catch (e) {
        debugPrint('📚 [BookInfo] 알라딘 조회 실패: $e');
      }

      if (aladinResult != null) {
        hasRemoteData = true;
        final backfillPublisher =
            book.publisher == null ? aladinResult.publisher : null;
        final backfillIsbn = book.isbn == null ? aladinResult.isbn : null;
        final backfillGenre = book.genre == null ? aladinResult.genre : null;
        final backfillAladinUrl =
            book.aladinUrl == null ? aladinResult.aladinUrl : null;
        final backfillPrice = book.price == null ? aladinResult.price : null;

        detail = detail.copyWith(
          publisher: detail.publisher ?? aladinResult.publisher,
          isbn: detail.isbn ?? aladinResult.isbn,
          categories: detail.categories ??
              (aladinResult.genre != null ? [aladinResult.genre!] : null),
          price: detail.price ?? aladinResult.price,
        );

        debugPrint(
          '📚 [BookInfo] detail 보정 후: '
          'publisher=${detail.publisher}, isbn=${detail.isbn}, '
          'categories=${detail.categories}, price=${detail.price}',
        );

        if (backfillPublisher != null ||
            backfillIsbn != null ||
            backfillGenre != null ||
            backfillAladinUrl != null ||
            backfillPrice != null) {
          await _bookService.updateBookMetadata(
            book.id!,
            publisher: backfillPublisher,
            isbn: backfillIsbn,
            genre: backfillGenre,
            aladinUrl: backfillAladinUrl,
            price: backfillPrice,
          );

          debugPrint(
            '📚 [BookInfo] DB 보정 요청: '
            'publisher=$backfillPublisher, isbn=$backfillIsbn, '
            'genre=$backfillGenre, aladinUrl=${backfillAladinUrl != null}, '
            'price=$backfillPrice',
          );
        }
      }
    }

    return hasRemoteData ? detail : null;
  }
}
