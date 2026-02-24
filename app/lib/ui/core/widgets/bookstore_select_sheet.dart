import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:book_golas/l10n/app_localizations.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';

/// 서점 선택 바텀시트를 표시합니다.
/// 알라딘, Yes24, 교보문고에서 책을 검색할 수 있습니다.
void showBookstoreSelectSheet({
  required BuildContext context,
  required String title,
  VoidCallback? onBack,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  final l10n = AppLocalizations.of(context);
  final searchTitle = getSearchTitle(title);
  final encodedTitle = Uri.encodeComponent(searchTitle);

  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => Container(
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
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (onBack != null)
                        GestureDetector(
                          onTap: () {
                            Navigator.pop(sheetContext);
                            onBack();
                          },
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
                        l10n.bookstoreSelectTitle,
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
                    '"$searchTitle" 검색',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 20),
                  BookstoreButton(
                    isDark: isDark,
                    logoPath: 'assets/images/logo-aladin.png',
                    name: l10n.bookstoreAladdin,
                    onTap: () async {
                      Navigator.pop(sheetContext);
                      final url =
                          'https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=$encodedTitle';
                      await launchUrl(Uri.parse(url),
                          mode: LaunchMode.externalApplication);
                    },
                  ),
                  const SizedBox(height: 12),
                  BookstoreButton(
                    isDark: isDark,
                    logoPath: 'assets/images/logo-yes24.png',
                    name: 'Yes24',
                    onTap: () async {
                      Navigator.pop(sheetContext);
                      final url =
                          'https://www.yes24.com/Product/Search?domain=ALL&query=$encodedTitle';
                      await launchUrl(Uri.parse(url),
                          mode: LaunchMode.externalApplication);
                    },
                  ),
                  const SizedBox(height: 12),
                  BookstoreButton(
                    isDark: isDark,
                    logoPath: 'assets/images/logo-kyobo.svg',
                    name: l10n.bookstoreKyobo,
                    isSvg: true,
                    onTap: () async {
                      Navigator.pop(sheetContext);
                      final url =
                          'https://search.kyobobook.co.kr/search?keyword=$encodedTitle';
                      await launchUrl(Uri.parse(url),
                          mode: LaunchMode.externalApplication);
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// 책 제목에서 부제목을 제거하여 검색에 적합한 제목을 반환합니다.
String getSearchTitle(String title) {
  final hyphenIndex = title.indexOf(' - ');
  if (hyphenIndex > 0) {
    return title.substring(0, hyphenIndex).trim();
  }
  final dashIndex = title.indexOf('-');
  if (dashIndex > 0) {
    return title.substring(0, dashIndex).trim();
  }
  return title.trim();
}

/// 서점 버튼 위젯
class BookstoreButton extends StatelessWidget {
  final bool isDark;
  final String logoPath;
  final String name;
  final VoidCallback onTap;
  final bool isSvg;

  const BookstoreButton({
    super.key,
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
