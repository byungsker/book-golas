import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/floating_context_dropdown.dart';
import 'package:book_golas/ui/core/widgets/search_mode_dropdown.dart';

/// Apple HIG Liquid Glass 스타일 Bottom Navigation Bar
///
/// HIG_LIQUID_GLASS.md 참조:
/// - Liquid Glass 재질: 반투명 유리, 콘텐츠 위에 떠 있는 형태
/// - 적응형 색상: 아래 콘텐츠가 밝으면 어둡게, 어두우면 밝게
/// - 검색 버튼: 분리된 원형 버튼, 탭 시 검색 필드 표시
/// - 물방울 확대 애니메이션: 롱프레스로 드래그하며 탭 전환
/// - 렌즈 효과: 물방울 영역 내 콘텐츠 굴절
class BLabBottomBar extends StatefulWidget {
  final int selectedIndex;
  final ValueChanged<int> onTabSelected;

  /// 검색 버튼 탭 콜백: (버튼 위치, 버튼 크기) 전달
  final void Function(Offset position, double size) onSearchTap;

  /// 검색 모드 롱프레스 선택 콜백 (선택된 SearchMode 전달)
  final void Function(SearchMode mode)? onSearchModeSelected;

  /// 홈 서브탭 롱프레스 선택 콜백 (선택된 탭 인덱스 전달)
  final void Function(int subTabIndex)? onHomeSubTabLongPressSelected;

  const BLabBottomBar({
    super.key,
    required this.selectedIndex,
    required this.onTabSelected,
    required this.onSearchTap,
    this.onSearchModeSelected,
    this.onHomeSubTabLongPressSelected,
  });

  @override
  State<BLabBottomBar> createState() => _BLabBottomBarState();
}

class _BLabBottomBarState extends State<BLabBottomBar>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _slideAnimation;

  // 롱프레스 드래그 상태
  bool _isDragging = false;
  double _dragPosition = 0.0;
  double _tabWidth = 0.0;

  // 홈 컨텍스트 메뉴 상태
  FloatingContextDropdownController<int>? _homeMenuController;
  bool _isShowingHomeContextMenu = false;

  // 검색 컨텍스트 메뉴 상태
  FloatingContextDropdownController<SearchMode>? _searchMenuController;

  // 검색 버튼 위치 추적
  final GlobalKey _searchButtonKey = GlobalKey();

  // Pill bar 위치 추적
  final GlobalKey _pillBarKey = GlobalKey();

  static const List<_TabItemData> _tabIcons = [
    _TabItemData(
      icon: CupertinoIcons.house,
      activeIcon: CupertinoIcons.house_fill,
    ),
    _TabItemData(
      icon: CupertinoIcons.square_stack_3d_up,
      activeIcon: CupertinoIcons.square_stack_3d_up_fill,
    ),
    _TabItemData(
      icon: CupertinoIcons.book,
      activeIcon: CupertinoIcons.book_fill,
    ),
    _TabItemData(
      icon: CupertinoIcons.calendar,
      activeIcon: CupertinoIcons.calendar,
    ),
    _TabItemData(
      icon: CupertinoIcons.person_crop_circle,
      activeIcon: CupertinoIcons.person_crop_circle_fill,
    ),
  ];

  List<String> _getTabLabels(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return [
      l10n.navHome,
      l10n.navLibrary,
      l10n.navStats,
      l10n.navCalendar,
      'MY',
    ];
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _slideAnimation = Tween<double>(
      begin: widget.selectedIndex.toDouble(),
      end: widget.selectedIndex.toDouble(),
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
  }

  @override
  void didUpdateWidget(BLabBottomBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedIndex != widget.selectedIndex && !_isDragging) {
      _slideAnimation = Tween<double>(
        begin: _slideAnimation.value,
        end: widget.selectedIndex.toDouble(),
      ).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
      );
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _homeMenuController?.dismiss();
    _searchMenuController?.dismiss();
    _controller.dispose();
    super.dispose();
  }

  /// 롱프레스 시작
  void _onLongPressStart(LongPressStartDetails details) {
    if (_tabWidth <= 0) return;

    // 홈 탭(인덱스 0) 여부 체크
    final tabIndex =
        (details.localPosition.dx / _tabWidth).floor().clamp(0, _tabIcons.length - 1);

    if (tabIndex == 0 && widget.onHomeSubTabLongPressSelected != null) {
      _isShowingHomeContextMenu = true;
      HapticFeedback.mediumImpact();
      _showHomeSubTabMenu(details.globalPosition);
      return;
    }

    // 기존 드래그 로직
    setState(() {
      _isDragging = true;
      _dragPosition = _slideAnimation.value;
    });
    HapticFeedback.mediumImpact();
  }

  /// 롱프레스 드래그 중
  void _onLongPressMoveUpdate(LongPressMoveUpdateDetails details) {
    if (_isShowingHomeContextMenu) {
      _homeMenuController?.updateDragPosition(details.globalPosition);
      return;
    }

    if (!_isDragging || _tabWidth <= 0) return;

    final newPosition = details.localPosition.dx / _tabWidth;
    final clampedPosition = newPosition.clamp(
      0.0,
      (_tabIcons.length - 1).toDouble(),
    );

    setState(() {
      _dragPosition = clampedPosition;
    });

    // 탭 경계를 넘을 때 햅틱 피드백
    final currentTab = _dragPosition.round();
    final previousTab = (_dragPosition - 0.1).round();
    if (currentTab != previousTab) {
      HapticFeedback.selectionClick();
    }
  }

  /// 롱프레스 종료
  void _onLongPressEnd(LongPressEndDetails details) {
    if (_isShowingHomeContextMenu) {
      _homeMenuController?.completeDragSelection();
      _isShowingHomeContextMenu = false;
      return;
    }

    if (!_isDragging) return;

    final targetIndex = _dragPosition.round().clamp(0, _tabIcons.length - 1);

    setState(() {
      _isDragging = false;
    });

    // 애니메이션으로 최종 위치로 이동
    _slideAnimation = Tween<double>(
      begin: _dragPosition,
      end: targetIndex.toDouble(),
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward(from: 0);

    // 탭 선택
    if (targetIndex != widget.selectedIndex) {
      widget.onTabSelected(targetIndex);
    }

    HapticFeedback.lightImpact();
  }

  /// 홈 서브탭 컨텍스트 메뉴 표시
  void _showHomeSubTabMenu(Offset startGlobalPosition) {
    final l10n = AppLocalizations.of(context);

    // Pill bar의 위치 계산
    final renderBox = _pillBarKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) {
      _isShowingHomeContextMenu = false;
      return;
    }
    final pillPosition = renderBox.localToGlobal(Offset.zero);
    // 홈 탭은 pill bar 맨 왼쪽 (padding 4px 고려)
    final homeTabPosition = Offset(pillPosition.dx + 4, pillPosition.dy);

    _homeMenuController?.dismiss();

    late final FloatingContextDropdownController<int> controller;
    controller = showFloatingContextDropdown<int>(
      context,
      buttonPosition: homeTabPosition,
      buttonWidth: _tabWidth - 8, // padding 고려
      buttonHeight: 54,
      alignment: Alignment.bottomLeft,
      items: [
        FloatingContextDropdownItem(
          icon: CupertinoIcons.book_fill,
          label: l10n.bookListTabReading,
          value: 0,
        ),
        FloatingContextDropdownItem(
          icon: CupertinoIcons.bookmark_fill,
          label: l10n.bookListTabPlanned,
          value: 1,
        ),
        FloatingContextDropdownItem(
          icon: CupertinoIcons.checkmark_seal_fill,
          label: l10n.bookListTabCompleted,
          value: 2,
        ),
        FloatingContextDropdownItem(
          icon: CupertinoIcons.arrow_counterclockwise,
          label: l10n.bookListTabReread,
          value: 3,
        ),
        FloatingContextDropdownItem(
          icon: CupertinoIcons.square_stack_3d_up_fill,
          label: l10n.bookListTabAll,
          value: 4,
        ),
      ],
      onDismissed: () {
        if (identical(_homeMenuController, controller)) {
          _homeMenuController = null;
        }
        _isShowingHomeContextMenu = false;
      },
      onSelected: (value) {
        _homeMenuController = null;
        _isShowingHomeContextMenu = false;
        widget.onHomeSubTabLongPressSelected?.call(value);
      },
    );
    _homeMenuController = controller;
  }

  /// 검색 컨텍스트 메뉴 표시
  void _showSearchMenu() {
    final renderBox =
        _searchButtonKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;
    final position = renderBox.localToGlobal(Offset.zero);

    _searchMenuController?.dismiss();

    late final FloatingContextDropdownController<SearchMode> controller;
    controller = showSearchModeDropdown(
      context,
      buttonPosition: position,
      buttonSize: 62.0,
      onDismissed: () {
        if (identical(_searchMenuController, controller)) {
          _searchMenuController = null;
        }
      },
      onSelected: (mode) {
        _searchMenuController = null;
        widget.onSearchModeSelected?.call(mode);
      },
    );
    _searchMenuController = controller;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final content = Row(
      children: [
        // Pill TabBar (5개 탭)
        Expanded(child: _buildLiquidGlassTabBar(isDark)),
        const SizedBox(width: 12),
        // 분리된 원형 검색 버튼
        _buildSearchButton(isDark),
      ],
    );


    return Container(
      margin: const EdgeInsets.only(left: 12, right: 12, bottom: 22),
      child: content,
    );
  }

  /// Liquid Glass 효과가 적용된 TabBar
  Widget _buildLiquidGlassTabBar(bool isDark) {
    // HIG 적응형 색상
    final glassColor = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.black.withValues(alpha: 0.08);

    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : Colors.black.withValues(alpha: 0.08);

    final foregroundColor = isDark ? Colors.white : Colors.black;
    final inactiveForegroundColor = isDark
        ? Colors.white.withValues(alpha: 0.5)
        : Colors.black.withValues(alpha: 0.5);

    return GestureDetector(
      onLongPressStart: _onLongPressStart,
      onLongPressMoveUpdate: _onLongPressMoveUpdate,
      onLongPressEnd: _onLongPressEnd,
      child: ClipRRect(
        key: _pillBarKey,
        borderRadius: BorderRadius.circular(100),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
          child: Container(
            height: 62,
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            decoration: BoxDecoration(
              color: glassColor,
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: borderColor, width: 0.5),
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                _tabWidth = constraints.maxWidth / _tabIcons.length;
                final labels = _getTabLabels(context);

                return Stack(
                  children: [
                    // 물방울 인디케이터 (렌즈 효과)
                    _buildDropletIndicator(isDark, constraints.maxWidth, 0),
                    // 탭 아이템들
                    Row(
                      children: List.generate(_tabIcons.length, (index) {
                        return Expanded(
                          child: _buildTabItem(
                            index,
                            _tabIcons[index],
                            labels[index],
                            foregroundColor,
                            inactiveForegroundColor,
                          ),
                        );
                      }),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  /// 물방울 인디케이터 (렌즈 효과 포함)
  Widget _buildDropletIndicator(
    bool isDark,
    double maxWidth,
    double chevronWidth,
  ) {
    final indicatorColor = isDark
        ? Colors.white.withValues(alpha: 0.22)
        : Colors.black.withValues(alpha: 0.12);

    // 렌즈 효과를 위한 하이라이트 색상
    final highlightColor = isDark
        ? Colors.white.withValues(alpha: 0.35)
        : Colors.white.withValues(alpha: 0.6);

    return AnimatedBuilder(
      animation: _slideAnimation,
      builder: (context, child) {
        // 드래그 중이면 드래그 위치, 아니면 애니메이션 값 사용
        final currentPosition =
            _isDragging ? _dragPosition : _slideAnimation.value;
        final tabWidth = maxWidth / _tabIcons.length;

        return Positioned(
          left: chevronWidth + currentPosition * tabWidth,
          top: 0,
          bottom: 0,
          width: tabWidth,
          child: Center(
            child: Container(
              width: tabWidth - 8,
              height: 54,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(100),
                // 물방울 렌즈 효과: 그라디언트로 굴절 시뮬레이션
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    highlightColor,
                    indicatorColor,
                    indicatorColor.withValues(alpha: indicatorColor.a * 0.7),
                  ],
                  stops: const [0.0, 0.3, 1.0],
                ),
                // 내부 그림자로 깊이감
                boxShadow: [
                  BoxShadow(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.1)
                        : Colors.black.withValues(alpha: 0.05),
                    blurRadius: 8,
                    spreadRadius: -2,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              // 내부 하이라이트 (상단 반사광)
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(100),
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.center,
                    colors: [
                      Colors.white.withValues(alpha: isDark ? 0.15 : 0.4),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  /// 개별 탭 아이템
  Widget _buildTabItem(
    int index,
    _TabItemData tab,
    String label,
    Color foregroundColor,
    Color inactiveForegroundColor,
  ) {
    final isSelected = widget.selectedIndex == index;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        widget.onTabSelected(index);
      },
      behavior: HitTestBehavior.opaque,
      child: AnimatedBuilder(
        animation: _slideAnimation,
        builder: (context, child) {
          // 현재 위치 (드래그 중이면 드래그 위치 사용)
          final currentPosition =
              _isDragging ? _dragPosition : _slideAnimation.value;

          // 물방울과의 거리 계산 (0~1 범위로 정규화)
          final distance = (currentPosition - index).abs();

          // 물방울이 이 탭과 겹치는 정도 (0: 완전히 겹침, 1: 전혀 안겹침)
          final overlap = (1.0 - distance).clamp(0.0, 1.0);

          return _buildTabContent(
            index,
            tab,
            label,
            foregroundColor,
            inactiveForegroundColor,
            isSelected || overlap > 0.5,
          );
        },
        child: null,
      ),
    );
  }

  /// 탭 콘텐츠 (아이콘 + 라벨)
  Widget _buildTabContent(
    int index,
    _TabItemData tab,
    String label,
    Color foregroundColor,
    Color inactiveForegroundColor,
    bool isHighlighted,
  ) {
    final iconColor = isHighlighted ? foregroundColor : inactiveForegroundColor;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isHighlighted ? tab.activeIcon : tab.icon,
            color: iconColor,
            size: 24,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: iconColor,
              fontSize: 10,
              fontWeight: isHighlighted ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  /// 분리된 원형 검색 버튼 (Liquid Glass 효과)
  Widget _buildSearchButton(bool isDark) {
    // 탭바와 동일한 색상
    final glassColor = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.black.withValues(alpha: 0.08);

    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : Colors.black.withValues(alpha: 0.08);

    final iconColor = isDark
        ? Colors.white.withValues(alpha: 0.9)
        : Colors.black.withValues(alpha: 0.7);

    const buttonSize = 62.0;

    return GestureDetector(
      key: _searchButtonKey,
      onTap: () {
        HapticFeedback.selectionClick();
        // 검색 버튼의 화면 위치 계산
        final RenderBox? renderBox =
            _searchButtonKey.currentContext?.findRenderObject() as RenderBox?;
        if (renderBox != null) {
          final position = renderBox.localToGlobal(Offset.zero);
          widget.onSearchTap(position, buttonSize);
        }
      },
      onLongPressStart: (details) {
        HapticFeedback.mediumImpact();
        _showSearchMenu();
      },
      onLongPressMoveUpdate: (details) {
        _searchMenuController?.updateDragPosition(details.globalPosition);
      },
      onLongPressEnd: (details) {
        _searchMenuController?.completeDragSelection();
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(100),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
          child: Container(
            width: 62,
            height: 62,
            decoration: BoxDecoration(
              color: glassColor,
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: borderColor, width: 0.5),
            ),
            child: Icon(CupertinoIcons.search, color: iconColor, size: 22),
          ),
        ),
      ),
    );
  }
}

/// 탭 아이템 데이터
class _TabItemData {
  final IconData icon;
  final IconData activeIcon;

  const _TabItemData({
    required this.icon,
    required this.activeIcon,
  });
}
