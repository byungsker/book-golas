import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shimmer/shimmer.dart';

import 'package:book_golas/data/services/aladin_api_service.dart';
import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/data/services/google_books_api_service.dart';
import 'package:book_golas/data/services/naver_books_api_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/domain/models/book_detail_info.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/book_image_widget.dart';
import 'package:book_golas/ui/core/widgets/bookstore_select_sheet.dart';

Future<void> showBookInfoSheet(BuildContext context, Book book) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    isDismissible: true,
    enableDrag: true,
    builder: (_) => _BookInfoSheetContent(book: book),
  );
}

class _BookInfoSheetContent extends StatefulWidget {
  final Book book;

  const _BookInfoSheetContent({required this.book});

  @override
  State<_BookInfoSheetContent> createState() => _BookInfoSheetContentState();
}

class _BookInfoSheetContentState extends State<_BookInfoSheetContent>
    with SingleTickerProviderStateMixin {
  BookDetailInfo? _bookDetailInfo;
  bool _isLoading = true;
  bool _isDescriptionExpanded = false;
  bool _titleCopied = false;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });
    _loadBookDetail();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadBookDetail() async {
    setState(() => _isLoading = true);

    final hasIsbn = widget.book.isbn != null && widget.book.isbn!.isNotEmpty;

    debugPrint(
      '📚 [BookInfo] 시작: title="${widget.book.title}", isbn=${widget.book.isbn}, hasIsbn=$hasIsbn',
    );

    try {
      BookDetailInfo? detail;
      BookDetailInfo? googleDetail;

      if (hasIsbn) {
        debugPrint('📚 [BookInfo] Step1: 네이버 ISBN 검색 (${widget.book.isbn})');
        final naverDesc = await NaverBooksApiService.fetchDescription(
          widget.book.isbn!,
        );
        debugPrint(
          '📚 [BookInfo] Step1 결과: ${naverDesc != null ? "${naverDesc.length}자" : "null"}',
        );
        if (naverDesc != null && naverDesc.isNotEmpty) {
          detail = BookDetailInfo.fromLocal(
            widget.book,
          ).copyWith(description: naverDesc);
        }

        if (detail?.description == null || detail!.description!.isEmpty) {
          debugPrint('📚 [BookInfo] Step2: 알라딘 ISBN 검색 (${widget.book.isbn})');
          final aladinDesc = await AladinApiService.fetchDescription(
            widget.book.isbn!,
          );
          debugPrint(
            '📚 [BookInfo] Step2 결과: ${aladinDesc != null ? "${aladinDesc.length}자" : "null"}',
          );
          if (aladinDesc != null && aladinDesc.isNotEmpty) {
            detail = BookDetailInfo.fromLocal(
              widget.book,
            ).copyWith(description: aladinDesc);
          }
        }

        debugPrint(
          '📚 [BookInfo] Step3: Google Books ISBN 검색 (${widget.book.isbn})',
        );
        googleDetail = await GoogleBooksApiService.fetchBookDetail(
          widget.book.isbn!,
        );
        debugPrint(
          '📚 [BookInfo] Step3 결과: ${googleDetail?.description != null ? "${googleDetail!.description!.length}자" : "null"}',
        );

        if (detail == null ||
            detail.description == null ||
            detail.description!.isEmpty) {
          detail = googleDetail;
        }
      }

      if (detail == null ||
          detail.description == null ||
          detail.description!.isEmpty) {
        debugPrint('📚 [BookInfo] Step4: 네이버 제목 검색 ("${widget.book.title}")');
        final titleDesc = await NaverBooksApiService.fetchDescriptionByTitle(
          widget.book.title,
          widget.book.author,
        );
        debugPrint(
          '📚 [BookInfo] Step4 결과: ${titleDesc != null ? "${titleDesc.length}자" : "null"}',
        );
        if (titleDesc != null && titleDesc.isNotEmpty) {
          detail = (detail ?? BookDetailInfo.fromLocal(widget.book)).copyWith(
            description: titleDesc,
          );
        }
      }

      if (detail == null ||
          detail.description == null ||
          detail.description!.isEmpty) {
        debugPrint('📚 [BookInfo] Step5: 알라딘 제목 검색 ("${widget.book.title}")');
        final aladinTitleDesc = await AladinApiService.fetchDescriptionByTitle(
          widget.book.title,
        );
        debugPrint(
          '📚 [BookInfo] Step5 결과: ${aladinTitleDesc != null ? "${aladinTitleDesc.length}자" : "null"}',
        );
        if (aladinTitleDesc != null && aladinTitleDesc.isNotEmpty) {
          detail = (detail ?? BookDetailInfo.fromLocal(widget.book)).copyWith(
            description: aladinTitleDesc,
          );
        }
      }

      detail ??= BookDetailInfo.fromLocal(widget.book);

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

      final needsBackfill = widget.book.id != null &&
          (widget.book.publisher == null ||
              widget.book.isbn == null ||
              widget.book.genre == null ||
              widget.book.aladinUrl == null);

      if (needsBackfill) {
        debugPrint(
          '📚 [BookInfo] 메타데이터 보정 시작: '
          'publisher=${widget.book.publisher}, isbn=${widget.book.isbn}, '
          'genre=${widget.book.genre}, aladinUrl=${widget.book.aladinUrl}',
        );
        BookSearchResult? aladinResult;

        try {
          if (hasIsbn) {
            aladinResult =
                await AladinApiService.lookupByISBN(widget.book.isbn!);
            debugPrint(
              '📚 [BookInfo] 알라딘 ISBN 조회 결과: '
              'publisher=${aladinResult?.publisher}, isbn=${aladinResult?.isbn}',
            );
          }

          aladinResult ??= await AladinApiService.searchByTitle(
            widget.book.title,
            widget.book.author,
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
          final backfillPublisher =
              widget.book.publisher == null ? aladinResult.publisher : null;
          final backfillIsbn =
              widget.book.isbn == null ? aladinResult.isbn : null;
          final backfillGenre =
              widget.book.genre == null ? aladinResult.genre : null;
          final backfillAladinUrl =
              widget.book.aladinUrl == null ? aladinResult.aladinUrl : null;

          detail = detail.copyWith(
            publisher: detail.publisher ?? aladinResult.publisher,
            isbn: detail.isbn ?? aladinResult.isbn,
            categories: detail.categories ??
                (aladinResult.genre != null ? [aladinResult.genre!] : null),
          );

          debugPrint(
            '📚 [BookInfo] detail 보정 후: '
            'publisher=${detail.publisher}, isbn=${detail.isbn}, '
            'categories=${detail.categories}',
          );

          if (backfillPublisher != null ||
              backfillIsbn != null ||
              backfillGenre != null ||
              backfillAladinUrl != null) {
            BookService().updateBookMetadata(
              widget.book.id!,
              publisher: backfillPublisher,
              isbn: backfillIsbn,
              genre: backfillGenre,
              aladinUrl: backfillAladinUrl,
            );

            debugPrint(
              '📚 [BookInfo] DB 보정 요청: '
              'publisher=$backfillPublisher, isbn=$backfillIsbn, '
              'genre=$backfillGenre, aladinUrl=${backfillAladinUrl != null}',
            );
          }
        }
      }

      if (mounted) {
        setState(() {
          _bookDetailInfo = detail;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('📚 [BookInfo] ERROR: $e');
      if (mounted) {
        setState(() {
          _bookDetailInfo = BookDetailInfo.fromLocal(widget.book);
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.95,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (context, scrollController) => Container(
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[700] : Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                child: Column(
                  children: [
                    const SizedBox(height: 8),
                    _buildCoverImage(isDark),
                    const SizedBox(height: 20),
                    _buildTitle(isDark),
                    const SizedBox(height: 6),
                    _buildAuthor(isDark),
                    const SizedBox(height: 20),
                    _buildTabSection(isDark, l10n),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
            _buildBottomButton(isDark, l10n),
          ],
        ),
      ),
    );
  }

  Widget _buildCoverImage(bool isDark) {
    return Center(
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: BookImageWidget(
            imageUrl: widget.book.imageUrl,
            width: 140,
            height: 200,
            iconSize: 48,
          ),
        ),
      ),
    );
  }

  Widget _buildTitle(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(width: 28),
          Flexible(
            child: Text(
              widget.book.title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black,
                height: 1.3,
              ),
            ),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              Clipboard.setData(ClipboardData(text: widget.book.title));
              setState(() => _titleCopied = true);
              Future.delayed(const Duration(seconds: 2), () {
                if (mounted) setState(() => _titleCopied = false);
              });
            },
            child: SizedBox(
              width: 44,
              height: 44,
              child: Center(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    _titleCopied ? CupertinoIcons.checkmark : CupertinoIcons.doc_on_doc,
                    key: ValueKey(_titleCopied),
                    size: 18,
                    color: _titleCopied
                        ? Colors.green
                        : (isDark ? Colors.grey[500] : Colors.grey[400]),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAuthor(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Text(
        widget.book.author ?? '-',
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: 14,
          color: isDark ? Colors.grey[400] : Colors.grey[600],
        ),
      ),
    );
  }

  Widget _buildTabSection(bool isDark, AppLocalizations l10n) {
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          labelColor: BLabColors.primary,
          unselectedLabelColor: isDark ? Colors.grey[500] : Colors.grey[400],
          labelStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
          indicatorColor: BLabColors.primary,
          indicatorWeight: 2.5,
          dividerColor: isDark ? Colors.grey[800] : Colors.grey[200],
          tabs: [
            Tab(text: l10n.bookInfoTabDescription),
            Tab(text: l10n.bookInfoTabDetail),
          ],
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          alignment: Alignment.topCenter,
          child: _tabController.index == 0
              ? _buildDescriptionTab(isDark, l10n)
              : _buildDetailTab(isDark, l10n),
        ),
      ],
    );
  }

  Widget _buildDescriptionTab(bool isDark, AppLocalizations l10n) {
    if (_isLoading) {
      return _buildDescriptionShimmer(isDark);
    }

    final description = _bookDetailInfo?.description;

    if (description == null || description.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              CupertinoIcons.book,
              size: 40,
              color: isDark ? Colors.grey[700] : Colors.grey[300],
            ),
            const SizedBox(height: 12),
            Text(
              l10n.bookInfoNoDescription,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[500] : Colors.grey[400],
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            description,
            maxLines: _isDescriptionExpanded ? null : 8,
            overflow: _isDescriptionExpanded
                ? TextOverflow.visible
                : TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 14,
              height: 1.7,
              color: isDark ? Colors.grey[300] : Colors.grey[800],
            ),
          ),
          if (description.length > 200) ...[
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => setState(
                () => _isDescriptionExpanded = !_isDescriptionExpanded,
              ),
              child: Text(
                _isDescriptionExpanded ? '접기' : '더보기',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: BLabColors.primary,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDescriptionShimmer(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Shimmer.fromColors(
        baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
        highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 14,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              height: 14,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              height: 14,
              width: MediaQuery.of(context).size.width * 0.6,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              height: 14,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              height: 14,
              width: MediaQuery.of(context).size.width * 0.45,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailTab(bool isDark, AppLocalizations l10n) {
    final book = widget.book;
    final detail = _bookDetailInfo;

    final publisher = detail?.publisher ?? book.publisher ?? '-';
    final isbn = detail?.isbn ?? book.isbn ?? '-';
    final pageCount =
        detail?.pageCount ?? (book.totalPages > 0 ? book.totalPages : null);
    final genre = detail?.categories?.join(', ') ?? book.genre ?? '-';

    final rows = <MapEntry<String, String>>[
      MapEntry(l10n.bookInfoPublisher, publisher),
      MapEntry(l10n.bookInfoIsbn, isbn),
      MapEntry(l10n.bookInfoPageCount, pageCount?.toString() ?? '-'),
      MapEntry(l10n.bookInfoGenre, genre),
    ];

    if (detail?.publishedDate != null) {
      rows.add(MapEntry('출판일', detail!.publishedDate!));
    }

    if (detail?.language != null) {
      rows.add(MapEntry('언어', detail!.language!.toUpperCase()));
    }

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: rows
            .map((entry) => _buildInfoRow(isDark, entry.key, entry.value))
            .toList(),
      ),
    );
  }

  Widget _buildInfoRow(bool isDark, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.grey[500] : Colors.grey[500],
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomButton(bool isDark, AppLocalizations l10n) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: GestureDetector(
          onTap: () {
            showBookstoreSelectSheet(
              context: context,
              title: widget.book.title,
            );
          },
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: BLabColors.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  CupertinoIcons.arrow_up_right_square,
                  size: 18,
                  color: Colors.white,
                ),
                const SizedBox(width: 8),
                Text(
                  l10n.bookInfoViewInBookstore,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
