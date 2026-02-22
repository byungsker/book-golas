import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';

import 'package:book_golas/ui/onboarding/widgets/onboarding_page.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const OnboardingScreen({
    super.key,
    required this.onComplete,
  });

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  List<OnboardingPageData>? _pages;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _pages ??= _buildPages();
  }

  List<OnboardingPageData> _buildPages() {
    final l10n = AppLocalizations.of(context);
    return [
      OnboardingPageData(
        icon: Icons.menu_book_outlined,
        title: l10n.onboardingTitle1,
        description: l10n.onboardingDescription1,
      ),
      OnboardingPageData(
        icon: Icons.search,
        title: l10n.onboardingTitle2,
        description: l10n.onboardingDescription2,
      ),
      OnboardingPageData(
        icon: Icons.auto_awesome,
        title: l10n.onboardingTitle3,
        description: l10n.onboardingDescription3,
      ),
    ];
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int page) {
    setState(() {
      _currentPage = page;
    });
  }

  void _nextPage() {
    if (_currentPage < _pages!.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      widget.onComplete();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1A1B2E) : Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: _onPageChanged,
                itemCount: _pages!.length,
                itemBuilder: (context, index) {
                  final page = _pages![index];
                  return OnboardingPage(
                    icon: page.icon,
                    title: page.title,
                    description: page.description,
                  );
                },
              ),
            ),
            _buildBottomSection(isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomSection(bool isDark) {
    final isLastPage = _currentPage == _pages!.length - 1;
    final l10n = AppLocalizations.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          TextButton(
            onPressed: widget.onComplete,
            child: Text(
              l10n.commonSkip,
              style: TextStyle(
                color: isDark ? Colors.white54 : Colors.black45,
                fontSize: 16,
              ),
            ),
          ),
          Row(
            children: List.generate(
              _pages!.length,
              (index) => _buildPageIndicator(index, isDark),
            ),
          ),
          FilledButton(
            onPressed: _nextPage,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF5B7FFF),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              isLastPage ? l10n.commonStart : l10n.commonNext,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPageIndicator(int index, bool isDark) {
    final isActive = index == _currentPage;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.symmetric(horizontal: 4),
      width: isActive ? 24 : 8,
      height: 8,
      decoration: BoxDecoration(
        color: isActive
            ? const Color(0xFF5B7FFF)
            : (isDark ? Colors.white24 : Colors.black12),
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }
}

class OnboardingPageData {
  final IconData icon;
  final String title;
  final String description;

  const OnboardingPageData({
    required this.icon,
    required this.title,
    required this.description,
  });
}
