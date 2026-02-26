import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_tab_bar.dart';

void showBookstoreSelectSheet({
  required BuildContext context,
  required String title,
  VoidCallback? onBack,
}) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => _BookstoreSheetContent(
      title: title,
      onBack: onBack,
    ),
  );
}

class _BookstoreSheetContent extends StatefulWidget {
  final String title;
  final VoidCallback? onBack;

  const _BookstoreSheetContent({
    required this.title,
    this.onBack,
  });

  @override
  State<_BookstoreSheetContent> createState() => _BookstoreSheetContentState();
}

class _BookstoreSheetContentState extends State<_BookstoreSheetContent>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = AppLocalizations.of(context);
    final searchTitle = getSearchTitle(widget.title);
    final encodedTitle = Uri.encodeComponent(searchTitle);

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
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (widget.onBack != null)
                        GestureDetector(
                          onTap: () {
                            Navigator.pop(context);
                            widget.onBack!();
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
                    '"$searchTitle" ${l10n.bookstoreSearchSuffix}',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            LiquidGlassTabBar(
              controller: _tabController,
              tabs: [l10n.bookstoreTabNew, l10n.bookstoreTabUsed],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: _tabController.index == 0
                    ? _buildNewBookstoreButtons(isDark, l10n, encodedTitle)
                    : _buildUsedBookstoreButtons(isDark, l10n, encodedTitle),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNewBookstoreButtons(
      bool isDark, AppLocalizations l10n, String encodedTitle) {
    return Column(
      key: const ValueKey('new'),
      mainAxisSize: MainAxisSize.min,
      children: [
        BookstoreButton(
          isDark: isDark,
          logoPath: 'assets/images/logo-aladin.png',
          name: l10n.bookstoreAladdin,
          onTap: () async {
            Navigator.pop(context);
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
            Navigator.pop(context);
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
            Navigator.pop(context);
            final url =
                'https://search.kyobobook.co.kr/search?keyword=$encodedTitle';
            await launchUrl(Uri.parse(url),
                mode: LaunchMode.externalApplication);
          },
        ),
      ],
    );
  }

  Widget _buildUsedBookstoreButtons(
      bool isDark, AppLocalizations l10n, String encodedTitle) {
    return Column(
      key: const ValueKey('used'),
      mainAxisSize: MainAxisSize.min,
      children: [
        BookstoreButton(
          isDark: isDark,
          logoPath: 'assets/images/logo-aladin.png',
          name: l10n.bookstoreAladdinUsed,
          onTap: () async {
            Navigator.pop(context);
            final url =
                'https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=Used&SearchWord=$encodedTitle';
            await launchUrl(Uri.parse(url),
                mode: LaunchMode.externalApplication);
          },
        ),
        const SizedBox(height: 12),
        BookstoreButton(
          isDark: isDark,
          logoPath: 'assets/images/logo-aladin.png',
          name: l10n.bookstoreAladdinUsedStore,
          onTap: () async {
            Navigator.pop(context);
            final url =
                'https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=UsedStore&SearchWord=$encodedTitle';
            await launchUrl(Uri.parse(url),
                mode: LaunchMode.externalApplication);
          },
        ),
        const SizedBox(height: 12),
        BookstoreButton(
          isDark: isDark,
          logoPath: 'assets/images/logo-yes24.png',
          name: l10n.bookstoreYes24Used,
          onTap: () async {
            Navigator.pop(context);
            final url =
                'https://www.yes24.com/Product/Search?domain=USED&query=$encodedTitle';
            await launchUrl(Uri.parse(url),
                mode: LaunchMode.externalApplication);
          },
        ),
      ],
    );
  }
}

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
