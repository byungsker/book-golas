import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:book_golas/l10n/app_localizations.dart';

import 'package:book_golas/ui/core/widgets/bookstore_select_sheet.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// AI 추천 도서 선택 시 표시되는 액션 바텀시트
/// - 책 내용 상세보기: 서점에서 책 정보 확인 (슬라이드 트랜지션)
/// - 독서 시작: 해당 책으로 독서 시작
void showRecommendationActionSheet({
  required BuildContext context,
  required String title,
  required String author,
  required String reason,
  required VoidCallback onViewDetail,
  required VoidCallback onStartReading,
}) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (sheetContext) => _RecommendationActionSheetContent(
      title: title,
      author: author,
      reason: reason,
      onStartReading: () {
        Navigator.pop(sheetContext);
        onStartReading();
      },
    ),
  );
}

class _RecommendationActionSheetContent extends StatefulWidget {
  final String title;
  final String author;
  final String reason;
  final VoidCallback onStartReading;

  const _RecommendationActionSheetContent({
    required this.title,
    required this.author,
    required this.reason,
    required this.onStartReading,
  });

  @override
  State<_RecommendationActionSheetContent> createState() =>
      _RecommendationActionSheetContentState();
}

class _RecommendationActionSheetContentState
    extends State<_RecommendationActionSheetContent> {
  int _currentPage = 0;

  void _goToBookstorePage() {
    setState(() => _currentPage = 1);
  }

  void _goBackToActionPage() {
    setState(() => _currentPage = 0);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              transitionBuilder: (child, animation) {
                final slideIn = _currentPage == 1;
                return SlideTransition(
                  position: Tween<Offset>(
                    begin: Offset(slideIn ? 1.0 : -1.0, 0),
                    end: Offset.zero,
                  ).animate(CurvedAnimation(
                    parent: animation,
                    curve: Curves.easeOutCubic,
                  )),
                  child: child,
                );
              },
              child: _currentPage == 0
                  ? _buildActionPage(isDark)
                  : _buildBookstorePage(isDark),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionPage(bool isDark) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      key: const ValueKey('action'),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            widget.author,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: BLabColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              widget.reason,
              style: const TextStyle(
                fontSize: 13,
                color: BLabColors.primary,
                fontWeight: FontWeight.w500,
                height: 1.4,
              ),
            ),
          ),
          const SizedBox(height: 16),
          _ActionButton(
            isDark: isDark,
            icon: CupertinoIcons.book,
            label: l10n.recommendationViewDetail,
            subtitle: l10n.recommendationViewDetailSubtitle,
            onTap: _goToBookstorePage,
          ),
          const SizedBox(height: 12),
          _ActionButton(
            isDark: isDark,
            icon: CupertinoIcons.play_fill,
            label: l10n.recommendationStartReading,
            subtitle: l10n.recommendationStartReadingSubtitle,
            isPrimary: true,
            onTap: widget.onStartReading,
          ),
        ],
      ),
    );
  }

  Widget _buildBookstorePage(bool isDark) {
    final l10n = AppLocalizations.of(context);
    final searchTitle = getSearchTitle(widget.title);
    final encodedTitle = Uri.encodeComponent(searchTitle);

    return GestureDetector(
      key: const ValueKey('bookstore'),
      onHorizontalDragEnd: (details) {
        if (details.primaryVelocity != null && details.primaryVelocity! > 300) {
          _goBackToActionPage();
        }
      },
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                GestureDetector(
                  onTap: _goBackToActionPage,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Icon(
                      CupertinoIcons.chevron_back,
                      size: 22,
                      color: isDark ? Colors.white70 : Colors.black54,
                    ),
                  ),
                ),
                Text(
                  l10n.recommendationBookstoreSelect,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '아래 서점에서 "$searchTitle"을 검색합니다',
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 20),
            _BookstoreButton(
              isDark: isDark,
              logoPath: 'assets/images/logo-aladin.png',
              name: '알라딘',
              onTap: () async {
                Navigator.pop(context);
                final url =
                    'https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=$encodedTitle';
                await launchUrl(Uri.parse(url),
                    mode: LaunchMode.externalApplication);
              },
            ),
            const SizedBox(height: 12),
            _BookstoreButton(
              isDark: isDark,
              logoPath: 'assets/images/logo-yes24.png',
              name: 'Yes24',
              onTap: () async {
                Navigator.pop(context);
                final url =
                    'https://www.yes24.com/Product/Search?domain=ALL&query=$encodedTitle';
                await launchUrl(Uri.parse(url),
                    mode: LaunchMode.externalApplication);
              },
            ),
            const SizedBox(height: 12),
            _BookstoreButton(
              isDark: isDark,
              logoPath: 'assets/images/logo-kyobo.svg',
              name: '교보문고',
              isSvg: true,
              onTap: () async {
                Navigator.pop(context);
                final url =
                    'https://search.kyobobook.co.kr/search?keyword=$encodedTitle';
                await launchUrl(Uri.parse(url),
                    mode: LaunchMode.externalApplication);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final bool isDark;
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;
  final bool isPrimary;

  const _ActionButton({
    required this.isDark,
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
    this.isPrimary = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isPrimary
              ? BLabColors.primary
              : (isDark ? BLabColors.subtleDark : Colors.grey[50]),
          borderRadius: BorderRadius.circular(12),
          border: isPrimary
              ? null
              : Border.all(
                  color: isDark ? Colors.grey[700]! : Colors.grey[200]!,
                ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 22,
              color: isPrimary
                  ? Colors.white
                  : (isDark ? Colors.white70 : Colors.grey[700]),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: isPrimary
                          ? Colors.white
                          : (isDark ? Colors.white : Colors.black),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: isPrimary
                          ? Colors.white70
                          : (isDark ? Colors.grey[400] : Colors.grey[600]),
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              size: 18,
              color: isPrimary
                  ? Colors.white70
                  : (isDark ? Colors.grey[500] : Colors.grey[400]),
            ),
          ],
        ),
      ),
    );
  }
}

class _BookstoreButton extends StatelessWidget {
  final bool isDark;
  final String logoPath;
  final String name;
  final VoidCallback onTap;
  final bool isSvg;

  const _BookstoreButton({
    required this.isDark,
    required this.logoPath,
    required this.name,
    required this.onTap,
    this.isSvg = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.subtleDark : Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? Colors.grey[700]! : Colors.grey[200]!,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                color: Colors.white,
              ),
              padding: const EdgeInsets.all(4),
              child: isSvg
                  ? SvgPicture.asset(logoPath, fit: BoxFit.contain)
                  : Image.asset(logoPath, fit: BoxFit.contain),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                name,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              size: 18,
              color: isDark ? Colors.grey[500] : Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }
}
