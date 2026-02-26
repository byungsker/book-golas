import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/data/services/book_service.dart';
import 'package:book_golas/data/services/subscription_service.dart';
import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/book_detail/book_detail_screen.dart';
import 'package:book_golas/ui/barcode_scanner/barcode_scanner_screen.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/book_image_widget.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';

import 'package:book_golas/ui/core/widgets/recommendation_action_sheet.dart';
import 'package:book_golas/ui/core/view_model/auth_view_model.dart';
import 'package:book_golas/ui/reading_start/view_model/reading_start_view_model.dart';
import 'package:book_golas/ui/reading_start/widgets/priority_selector_widget.dart';
import 'package:book_golas/ui/reading_start/widgets/schedule_change_modal.dart';
import 'package:book_golas/ui/reading_start/widgets/schedule_preview_widget.dart';
import 'package:book_golas/ui/reading_start/widgets/status_selector_widget.dart';
import 'package:book_golas/ui/core/widgets/korean_date_picker.dart';
import 'package:book_golas/l10n/app_localizations.dart';

class ReadingStartScreen extends StatelessWidget {
  final String? title;
  final int? totalPages;
  final String? imageUrl;

  const ReadingStartScreen({
    super.key,
    this.title,
    this.totalPages,
    this.imageUrl,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => ReadingStartViewModel(context.read<BookService>()),
      child: _ReadingStartContent(
        title: title,
        totalPages: totalPages,
        imageUrl: imageUrl,
      ),
    );
  }
}

class _ReadingStartContent extends StatefulWidget {
  final String? title;
  final int? totalPages;
  final String? imageUrl;

  const _ReadingStartContent({
    this.title,
    this.totalPages,
    this.imageUrl,
  });

  @override
  State<_ReadingStartContent> createState() => _ReadingStartContentState();
}

class _ReadingStartContentState extends State<_ReadingStartContent>
    with SingleTickerProviderStateMixin {
  final TextEditingController _titleController = TextEditingController();
  final PageController _pageController = PageController();
  final FocusNode _searchFocusNode = FocusNode();

  // 선택 완료 버튼 슬라이드 애니메이션
  late AnimationController _selectionBarAnimController;
  late Animation<double> _selectionBarAnimation;

  // 선택 완료 버튼 pressed 상태
  bool _isSelectionButtonPressed = false;

  // 검색어 입력 상태 (clear 버튼 표시용)
  bool _hasSearchText = false;

  @override
  void initState() {
    super.initState();

    // 선택 완료 버튼 애니메이션 초기화
    _selectionBarAnimController = AnimationController(
      duration: const Duration(milliseconds: 350),
      vsync: this,
    );
    _selectionBarAnimation = CurvedAnimation(
      parent: _selectionBarAnimController,
      curve: Curves.easeOutCubic,
    );

    final vm = context.read<ReadingStartViewModel>();
    vm.setTitleController(_titleController);

    // Load recommendations and images with locale
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final locale = Localizations.localeOf(context);
        vm.loadRecommendationsWithLocale(locale.languageCode);
        vm.loadRecommendationImagesWithLocale(locale);
      }
    });

    if (widget.title != null) {
      _titleController.text = widget.title!;
      _hasSearchText = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _pageController.animateToPage(
          1,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
        vm.goToSchedulePage();
      });
    } else {
      // 화면 진입 시 키보드 자동 표시 (약간의 지연 필요)
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted) {
            _searchFocusNode.requestFocus();
            // iOS에서 키보드 강제 표시
            SystemChannels.textInput.invokeMethod('TextInput.show');
          }
        });
      });
    }

    _titleController.addListener(_onSearchTextChanged);
  }

  void _onSearchTextChanged() {
    final vm = context.read<ReadingStartViewModel>();
    final locale = Localizations.localeOf(context);
    vm.onSearchQueryChanged(_titleController.text, locale);

    final hasText = _titleController.text.isNotEmpty;
    if (_hasSearchText != hasText) {
      setState(() {
        _hasSearchText = hasText;
      });
    }
  }

  void _clearSearchText() {
    _titleController.clear();
    _searchFocusNode.requestFocus();
  }

  Future<void> _openBarcodeScanner() async {
    final vm = context.read<ReadingStartViewModel>();
    final locale = Localizations.localeOf(context);

    final String? isbn = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (context) => const BarcodeScannerScreen(),
        fullscreenDialog: true,
      ),
    );

    if (isbn != null && mounted) {
      await vm.searchByISBN(isbn, locale);

      if (vm.scanError != null) {
        if (mounted) {
          CustomSnackbar.show(
            context,
            message: vm.scanError!,
            rootOverlay: true,
          );
        }
        vm.clearScanError();
      } else if (vm.selectedBook != null) {
        _nextPage(vm);
      }
    }
  }

  @override
  void dispose() {
    _titleController.removeListener(_onSearchTextChanged);
    _titleController.dispose();
    _pageController.dispose();
    _searchFocusNode.dispose();
    _selectionBarAnimController.dispose();
    super.dispose();
  }

  void _nextPage(ReadingStartViewModel vm) {
    if (vm.currentPageIndex < 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      vm.goToSchedulePage();
    }
  }

  void _showActionSheetForRecommendation(
    dynamic recommendation,
    ReadingStartViewModel vm,
  ) {
    final locale = Localizations.localeOf(context);
    showRecommendationActionSheet(
      context: context,
      title: recommendation.title,
      author: recommendation.author,
      reason: recommendation.reason,
      onViewDetail: () {},
      onStartReading: () async {
        final success =
            await vm.searchAndSelectFirstResult(recommendation.title, locale);
        if (success && mounted) {
          _nextPage(vm);
        }
      },
    );
  }

  void _previousPage(ReadingStartViewModel vm) {
    if (vm.currentPageIndex > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      vm.goToSearchPage();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Consumer 범위 최소화: TextField가 리빌드되지 않도록 Scaffold는 밖에 위치
    return Scaffold(
      backgroundColor: isDark ? BLabColors.scaffoldDark : Colors.white,
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 커스텀 헤더: pageIndex만 필요
            Selector<ReadingStartViewModel, int>(
              selector: (_, vm) => vm.currentPageIndex,
              builder: (context, pageIndex, _) {
                final vm = context.read<ReadingStartViewModel>();
                return _buildHeader(vm, isDark);
              },
            ),
            // 콘텐츠
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildBookTitleInputPage(isDark),
                  Consumer<ReadingStartViewModel>(
                    builder: (context, vm, _) =>
                        _buildReadingSchedulePage(vm, isDark),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ReadingStartViewModel vm, bool isDark) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        // 헤더 영역 터치 시 키보드 닫기
        FocusScope.of(context).unfocus();
      },
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 뒤로가기 버튼
            GestureDetector(
              onTap: () {
                if (vm.currentPageIndex > 0) {
                  _previousPage(vm);
                } else {
                  Navigator.pop(context);
                }
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Icon(
                  CupertinoIcons.back,
                  color: isDark ? Colors.white : Colors.black,
                  size: 24,
                ),
              ),
            ),
            const SizedBox(height: 8),
            // 제목
            Text(
              AppLocalizations.of(context).readingStartTitle,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 4),
            // 부제목 (검색 페이지일 때만)
            if (vm.currentPageIndex == 0)
              Text(
                AppLocalizations.of(context).readingStartSubtitle,
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.white54 : Colors.grey[600],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookTitleInputPage(bool isDark) {
    // 좌→우 스와이프로 홈으로 돌아가기
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragEnd: (details) {
        // 우측으로 스와이프 (velocity > 0)
        if (details.primaryVelocity != null && details.primaryVelocity! > 300) {
          Navigator.pop(context);
        }
      },
      child: Stack(
        children: [
          // 검색 결과 리스트 영역: 터치 시 키보드 닫기
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () {
                // 검색 결과 영역 터치 시 키보드 닫기
                FocusScope.of(context).unfocus();
              },
              child: Consumer<ReadingStartViewModel>(
                builder: (context, vm, _) =>
                    _buildSearchResultsList(vm, isDark),
              ),
            ),
          ),
          // 하단 바 (플로팅) - 키보드 위 10px (resizeToAvoidBottomInset이 키보드 처리)
          Positioned(
            left: 16,
            right: 16,
            bottom: 10,
            child:
                Selector<ReadingStartViewModel, (int, BookSearchResult?, bool)>(
              selector: (_, vm) =>
                  (vm.currentPageIndex, vm.selectedBook, vm.isSaving),
              builder: (context, data, _) {
                final vm = context.read<ReadingStartViewModel>();
                return _buildBottomBar(vm, isDark);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResultsList(ReadingStartViewModel vm, bool isDark) {
    if (vm.isSearching) {
      return const Center(child: CircularProgressIndicator());
    }

    if (vm.searchResults.isNotEmpty) {
      return ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        itemCount: vm.searchResults.length,
        itemBuilder: (context, index) {
          final book = vm.searchResults[index];
          final isSelected =
              vm.selectedBook != null && vm.isSameBook(vm.selectedBook!, book);
          return _buildSearchResultItem(book, isSelected, vm, isDark);
        },
      );
    }

    if (_titleController.text.trim().isNotEmpty) {
      return Center(
        child: Text(
          AppLocalizations.of(context).readingStartNoResults,
          style: TextStyle(
            color: isDark ? Colors.white54 : Colors.grey[600],
            fontSize: 14,
          ),
        ),
      );
    }

    return _buildRecommendationsSection(vm, isDark);
  }

  Widget _buildRecommendationsSection(ReadingStartViewModel vm, bool isDark) {
    if (!vm.hasCompletedBooks) {
      return const SizedBox.shrink();
    }

    if (vm.isLoadingRecommendations) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 40),
            SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: isDark ? Colors.white54 : Colors.grey[400],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              AppLocalizations.of(context).readingStartAnalyzing,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white54 : Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    if (vm.recommendationError != null || !vm.hasRecommendations) {
      return const SizedBox.shrink();
    }

    final authVm = context.watch<AuthViewModel>();
    final userName = authVm.currentUser?.nickname ?? '회원';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      children: [
        // 섹션 헤더 (타이틀 + 디스크립션)
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.auto_awesome,
                    color: BLabColors.primary,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    AppLocalizations.of(context).readingStartAiRecommendation,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white70 : Colors.black54,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                AppLocalizations.of(context)
                    .readingStartAiRecommendationDesc(userName),
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.white38 : Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
        ...vm.recommendations
            .map<Widget>((rec) => _buildRecommendationCard(rec, vm, isDark)),
      ],
    );
  }

  Widget _buildRecommendationCard(
    dynamic recommendation,
    ReadingStartViewModel vm,
    bool isDark,
  ) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        _showActionSheetForRecommendation(recommendation, vm);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.subtleDark : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
          ),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: recommendation.imageUrl != null
                  ? Image.network(
                      recommendation.imageUrl!,
                      width: 48,
                      height: 64,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: 48,
                        height: 64,
                        color:
                            isDark ? BLabColors.elevatedDark : Colors.grey[200],
                        child: Icon(
                          Icons.menu_book_rounded,
                          color: isDark ? Colors.white38 : Colors.grey[400],
                          size: 24,
                        ),
                      ),
                    )
                  : Container(
                      width: 48,
                      height: 64,
                      color: isDark ? BLabColors.elevatedDark : Colors.grey[200],
                      child: Icon(
                        Icons.menu_book_rounded,
                        color: isDark ? Colors.white38 : Colors.grey[400],
                        size: 24,
                      ),
                    ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    recommendation.title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    recommendation.author,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.white54 : Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    recommendation.reason,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white38 : Colors.grey[500],
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (recommendation.keywords.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: recommendation.keywords
                          .take(3)
                          .map<Widget>((keyword) => Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color:
                                      BLabColors.primary.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  keyword,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: BLabColors.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ))
                          .toList(),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchResultItem(
    BookSearchResult book,
    bool isSelected,
    ReadingStartViewModel vm,
    bool isDark,
  ) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        vm.selectBook(book);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          // 다크 배경 (#343434)
          color: BLabColors.elevatedDark,
          borderRadius: BorderRadius.circular(16),
          // 이너 보더: 항상 2px로 유지 (레이아웃 시프트 방지)
          border: Border.all(
            color: isSelected ? BLabColors.primary : Colors.transparent,
            width: 2,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14), // 16 - 2 (border) = 14
          child: Row(
            children: [
              // 책 표지 (더 큰 사이즈)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: book.imageUrl != null
                    ? Image.network(
                        book.imageUrl!,
                        width: 60,
                        height: 84,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            width: 60,
                            height: 84,
                            color: Colors.grey[800],
                            child: const Icon(
                              Icons.book,
                              size: 28,
                              color: Colors.grey,
                            ),
                          );
                        },
                      )
                    : Container(
                        width: 60,
                        height: 84,
                        color: Colors.grey[800],
                        child: const Icon(
                          Icons.book,
                          size: 28,
                          color: Colors.grey,
                        ),
                      ),
              ),
              const SizedBox(width: 16),
              // 책 정보
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 제목
                    Text(
                      book.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    // 저자
                    Text(
                      book.author,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.6),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    // 페이지 수
                    if (book.totalPages != null)
                      Text(
                        '${book.totalPages}p',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.white.withValues(alpha: 0.6),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // 체크마크 영역 (항상 공간 확보, 레이아웃 시프트 방지)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isSelected ? BLabColors.primary : Colors.transparent,
                  shape: BoxShape.circle,
                ),
                child: isSelected
                    ? const Icon(
                        Icons.check,
                        color: Colors.white,
                        size: 18,
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 하단 바: 검색 모드 ↔ 선택 모드 간 부드러운 전환 애니메이션
  Widget _buildBottomBar(ReadingStartViewModel vm, bool isDark) {
    final isSelectionMode = vm.selectedBook != null;

    // 애니메이션 제어
    if (isSelectionMode && !_selectionBarAnimController.isCompleted) {
      _selectionBarAnimController.forward();
    } else if (!isSelectionMode && _selectionBarAnimController.value > 0) {
      _selectionBarAnimController.reverse();
    }

    final glassColor = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.black.withValues(alpha: 0.08);

    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : Colors.black.withValues(alpha: 0.08);

    final foregroundColor = isDark ? Colors.white : Colors.black;
    final hintColor = isDark
        ? Colors.white.withValues(alpha: 0.5)
        : Colors.black.withValues(alpha: 0.5);

    final iconColor = isDark
        ? Colors.white.withValues(alpha: 0.7)
        : Colors.black.withValues(alpha: 0.5);

    return AnimatedBuilder(
      animation: _selectionBarAnimation,
      builder: (context, _) {
        final t = _selectionBarAnimation.value;

        return LayoutBuilder(
          builder: (context, constraints) {
            final totalWidth = constraints.maxWidth;
            const buttonSize = 48.0;
            const gap = 12.0;

            // 검색 모드: [검색바(expanded)] [gap] [뒤로가기(48)]
            // 선택 모드: [뒤로가기(48)] [gap] [선택완료(expanded)]
            // t=0: 검색 모드, t=1: 선택 모드

            final expandedWidth = totalWidth - buttonSize - gap;

            // 좌측 요소 너비: 검색바(expanded) → 뒤로가기(48)
            final leftWidth = expandedWidth - (expandedWidth - buttonSize) * t;

            // 우측 요소 너비: 뒤로가기(48) → 선택완료(expanded)
            final rightWidth = buttonSize + (expandedWidth - buttonSize) * t;

            return Row(
              children: [
                // 좌측: 검색바 → 뒤로가기 버튼으로 모핑
                SizedBox(
                  width: leftWidth,
                  child: _buildLeftElement(
                    vm,
                    isDark,
                    t,
                    glassColor,
                    borderColor,
                    foregroundColor,
                    hintColor,
                    iconColor,
                  ),
                ),
                const SizedBox(width: gap),
                // 우측: 뒤로가기 버튼 → 선택 완료로 모핑
                SizedBox(
                  width: rightWidth,
                  child: _buildRightElement(
                    vm,
                    isDark,
                    t,
                    glassColor,
                    borderColor,
                    foregroundColor,
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  /// 좌측 요소: 검색바 (t=0) ↔ 뒤로가기 버튼 (t=1)
  Widget _buildLeftElement(
    ReadingStartViewModel vm,
    bool isDark,
    double t,
    Color glassColor,
    Color borderColor,
    Color foregroundColor,
    Color hintColor,
    Color iconColor,
  ) {
    return GestureDetector(
      onTap: t > 0.5
          ? () {
              HapticFeedback.selectionClick();
              vm.clearSelection();
            }
          : null,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(100),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
          child: Container(
            height: 48,
            decoration: BoxDecoration(
              color: glassColor,
              borderRadius: BorderRadius.circular(100),
              border: Border.all(
                color: borderColor,
                width: 0.5,
              ),
            ),
            child: Stack(
              children: [
                // 검색바 내용 (t=0일 때 보임)
                Opacity(
                  opacity: (1 - t * 2).clamp(0.0, 1.0),
                  child: Center(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(left: 16),
                          child: Icon(
                            CupertinoIcons.search,
                            color: isDark
                                ? Colors.white
                                : Colors.black.withValues(alpha: 0.5),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _titleController,
                            focusNode: _searchFocusNode,
                            style: TextStyle(
                              color: foregroundColor,
                              fontSize: 16,
                              height: 1.2,
                            ),
                            cursorColor: foregroundColor,
                            textAlignVertical: TextAlignVertical.center,
                            decoration: InputDecoration(
                              hintText: AppLocalizations.of(context)
                                  .readingStartSearchHint,
                              hintStyle: TextStyle(
                                color: hintColor,
                                fontSize: 16,
                                height: 1.2,
                              ),
                              filled: false,
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              isDense: true,
                              isCollapsed: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                            textInputAction: TextInputAction.search,
                          ),
                        ),
                        if (_hasSearchText)
                          GestureDetector(
                            onTap: _clearSearchText,
                            child: Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? Colors.white.withValues(alpha: 0.3)
                                      : Colors.black.withValues(alpha: 0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  CupertinoIcons.xmark,
                                  color: isDark
                                      ? Colors.black.withValues(alpha: 0.7)
                                      : Colors.white.withValues(alpha: 0.9),
                                  size: 12,
                                ),
                              ),
                            ),
                          ),
                        GestureDetector(
                          onTap: _openBarcodeScanner,
                          child: Padding(
                            padding: const EdgeInsets.only(right: 14),
                            child: Icon(
                              CupertinoIcons.barcode_viewfinder,
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.7)
                                  : Colors.black.withValues(alpha: 0.5),
                              size: 22,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // 뒤로가기 아이콘 (t=1일 때 보임)
                Opacity(
                  opacity: ((t - 0.5) * 2).clamp(0.0, 1.0),
                  child: Center(
                    child: Icon(
                      CupertinoIcons.chevron_back,
                      color: foregroundColor.withValues(alpha: 0.9),
                      size: 22,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// 우측 요소: 뒤로가기 버튼 (t=0) ↔ 선택 완료 버튼 (t=1)
  Widget _buildRightElement(
    ReadingStartViewModel vm,
    bool isDark,
    double t,
    Color glassColor,
    Color borderColor,
    Color foregroundColor,
  ) {
    // t < 0.5: 뒤로가기 버튼 (화면 닫기)
    // t >= 0.5: 선택 완료 버튼
    final isSelectionButton = t > 0.5;

    if (!isSelectionButton) {
      // 뒤로가기 버튼 (검색 모드)
      return GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          Navigator.pop(context);
        },
        child: ClipRRect(
          borderRadius: BorderRadius.circular(100),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: glassColor,
                borderRadius: BorderRadius.circular(100),
                border: Border.all(
                  color: borderColor,
                  width: 0.5,
                ),
              ),
              child: Center(
                child: Icon(
                  CupertinoIcons.chevron_back,
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.9)
                      : Colors.black.withValues(alpha: 0.7),
                  size: 22,
                ),
              ),
            ),
          ),
        ),
      );
    }

    // 선택 완료 버튼 (선택 모드)
    return GestureDetector(
      onTapDown: (_) {
        setState(() => _isSelectionButtonPressed = true);
      },
      onTapUp: (_) {
        setState(() => _isSelectionButtonPressed = false);
        HapticFeedback.selectionClick();
        FocusScope.of(context).unfocus();
        _nextPage(vm);
      },
      onTapCancel: () {
        setState(() => _isSelectionButtonPressed = false);
      },
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(
          begin: _isSelectionButtonPressed ? 0.0 : 1.0,
          end: _isSelectionButtonPressed ? 1.0 : 0.0,
        ),
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOutCubic,
        builder: (context, pressValue, child) {
          return Opacity(
            opacity: ((t - 0.5) * 2).clamp(0.0, 1.0),
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(100),
                border: Border.all(
                  color: Colors.black.withValues(alpha: 0.06),
                  width: 0.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black
                        .withValues(alpha: 0.12 + 0.08 * pressValue),
                    blurRadius: 16 + 8 * pressValue,
                    offset: Offset(0, 4 + 4 * pressValue),
                    spreadRadius: -2,
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  AppLocalizations.of(context).readingStartSelectionComplete,
                  style: TextStyle(
                    color: Colors.black.withValues(alpha: 0.9),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  /// 다이얼 UI 날짜 선택 모달 표시
  void _showDatePickerModal({
    required BuildContext context,
    required bool isDark,
    required DateTime selectedDate,
    required DateTime minimumDate,
    required void Function(DateTime) onDateChanged,
  }) {
    DateTime pickedDate = selectedDate;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: BoxDecoration(
                color: isDark ? BLabColors.surfaceDark : Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 드래그 핸들
                  Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: Colors.grey[400],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  // 선택된 날짜 표시
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? BLabColors.subtleDark : Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        DateFormat.yMMMd(
                                Localizations.localeOf(context).languageCode)
                            .format(pickedDate),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // 다이얼 피커
                  Container(
                    height: 180,
                    decoration: BoxDecoration(
                      color: isDark ? BLabColors.subtleDark : Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: KoreanDatePicker(
                      isDark: isDark,
                      selectedDate: pickedDate,
                      minimumDate: minimumDate,
                      onDateChanged: (newDate) {
                        HapticFeedback.selectionClick();
                        setModalState(() {
                          pickedDate = newDate;
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 24),
                  // 확인 버튼
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () {
                        onDateChanged(pickedDate);
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: BLabColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        AppLocalizations.of(context).readingStartConfirm,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: MediaQuery.of(context).viewInsets.bottom),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildReadingSchedulePage(ReadingStartViewModel vm, bool isDark) {
    final totalPages = vm.selectedBook?.totalPages ?? widget.totalPages ?? 0;

    return GestureDetector(
      onHorizontalDragEnd: (details) {
        // 우측으로 스와이프 시 뒤로가기
        if (details.primaryVelocity != null && details.primaryVelocity! > 300) {
          _previousPage(vm);
        }
      },
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 책 정보
              Center(
                child: Container(
                  width: 120,
                  height: 160,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: BookImageWidget(
                      imageUrl: vm.selectedBook?.imageUrl ?? widget.imageUrl,
                      iconSize: 50,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  vm.selectedBook?.title ?? _titleController.text,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              if (totalPages > 0) ...[
                const SizedBox(height: 4),
                Center(
                  child: Text(
                    AppLocalizations.of(context).readingStartPages(totalPages),
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white54 : Colors.grey[600],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),

              StatusSelectorWidget(
                selectedStatus: vm.readingStatus,
                onStatusChanged: vm.setReadingStatus,
                isDark: isDark,
              ),
              const SizedBox(height: 20),

              if (vm.readingStatus == BookStatus.planned) ...[
                PrioritySelectorWidget(
                  selectedPriority: vm.priority,
                  onPriorityChanged: vm.setPriority,
                  isDark: isDark,
                ),
                const SizedBox(height: 20),
              ],

              if (vm.readingStatus == BookStatus.planned) ...[
                Text(
                  AppLocalizations.of(context).readingStartSetDate,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                ),
                const SizedBox(height: 8),
                SegmentedButton<bool>(
                  segments: <ButtonSegment<bool>>[
                    ButtonSegment<bool>(
                      value: true,
                      label: Text(
                          AppLocalizations.of(context).readingStartSetDate),
                    ),
                    ButtonSegment<bool>(
                      value: false,
                      label: Text(AppLocalizations.of(context)
                          .readingStartUndetermined),
                    ),
                  ],
                  selected: <bool>{vm.hasPlannedDate},
                  onSelectionChanged: (Set<bool> newSelection) {
                    vm.setHasPlannedDate(newSelection.first);
                  },
                ),
                const SizedBox(height: 20),
              ],

              if (vm.readingStatus == BookStatus.planned &&
                  vm.hasPlannedDate) ...[
                Text(
                  AppLocalizations.of(context).readingStartPlannedDate,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () => _showDatePickerModal(
                    context: context,
                    isDark: isDark,
                    selectedDate: vm.plannedStartDate,
                    minimumDate: DateTime.now(),
                    onDateChanged: vm.setPlannedStartDate,
                  ),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: isDark
                          ? BLabColors.subtleDark
                          : BLabColors.elevatedLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          DateFormat.yMMMd(
                                  Localizations.localeOf(context).languageCode)
                              .format(vm.plannedStartDate),
                          style: TextStyle(
                            fontSize: 15,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        Icon(
                          Icons.calendar_today,
                          size: 18,
                          color: isDark ? Colors.white54 : Colors.black45,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ] else ...[
                // 바로 시작 선택 시 오늘 시작 안내
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: BLabColors.success.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle_outline,
                        color: BLabColors.success,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        AppLocalizations.of(context).readingStartToday,
                        style: const TextStyle(
                          fontSize: 14,
                          color: BLabColors.success,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              Text(
                AppLocalizations.of(context).readingStartTargetDate,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white70 : Colors.black54,
                ),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => _showDatePickerModal(
                  context: context,
                  isDark: isDark,
                  selectedDate: vm.targetDate,
                  minimumDate: vm.effectiveStartDate,
                  onDateChanged: vm.setTargetDate,
                ),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    color:
                        isDark ? BLabColors.subtleDark : BLabColors.elevatedLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            DateFormat.yMMMd(Localizations.localeOf(context)
                                    .languageCode)
                                .format(vm.targetDate),
                            style: TextStyle(
                              fontSize: 15,
                              color: isDark ? Colors.white : Colors.black87,
                            ),
                          ),
                          Icon(
                            Icons.calendar_today,
                            size: 18,
                            color: isDark ? Colors.white54 : Colors.black45,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        AppLocalizations.of(context)
                            .readingStartTargetDateNote,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[500] : Colors.grey[500],
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // 스케줄 미리보기
              if (totalPages > 0)
                SchedulePreviewWidget(
                  totalPages: totalPages,
                  startDate: vm.effectiveStartDate,
                  targetDate: vm.targetDate,
                  dailyTargetPages: vm.dailyTargetPages,
                  isDark: isDark,
                  onChangeSchedule: () async {
                    final newTarget = await ScheduleChangeModal.show(
                      context: context,
                      totalPages: totalPages,
                      startDate: vm.effectiveStartDate,
                      targetDate: vm.targetDate,
                      currentDailyTarget: vm.dailyTargetPages,
                    );
                    if (newTarget != null) {
                      vm.setDailyTargetPages(newTarget);
                    }
                  },
                ),

              const SizedBox(height: 24),

              // 독서 시작 버튼
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: vm.isSaving
                      ? null
                      : () async {
                          final success = await vm.startReading(
                            fallbackTitle: _titleController.text,
                            fallbackImageUrl: widget.imageUrl,
                            fallbackTotalPages: widget.totalPages,
                          );

                          if (mounted && success && vm.createdBook != null) {
                            // BookDetailScreen으로 이동 (축하 애니메이션 포함)
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (context) => BookDetailScreen(
                                  book: vm.createdBook!,
                                  showCelebration: true,
                                ),
                              ),
                            );
                          } else if (mounted && !success) {
                            if (vm.shouldShowPaywall) {
                              vm.clearPaywallState();
                              final paywallSuccess = await SubscriptionService().showPaywall(context);
                              if (!paywallSuccess && mounted) {
                                CustomSnackbar.show(context, message: AppLocalizations.of(context).subscriptionUnavailable, type: BLabSnackbarType.info);
                              }
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    vm.errorMessage ??
                                        AppLocalizations.of(context)
                                            .readingStartSaveError,
                                  ),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: BLabColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: vm.isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          vm.readingStatus == BookStatus.planned
                              ? AppLocalizations.of(context)
                                  .readingStartReserve
                              : AppLocalizations.of(context).readingStartBegin,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
