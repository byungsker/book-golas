import 'dart:ui';
import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/floating_context_dropdown.dart';

class FloatingActionBar extends StatelessWidget {
  static const double bottomOffset = 22;
  static const double contentSeparation = 16;
  static const actionBarKey = ValueKey('book-detail-floating-action-bar');

  final VoidCallback? onUpdatePageTap;
  final VoidCallback onAddMemorablePageTap;
  final VoidCallback? onRecallSearchTap;
  final VoidCallback? onTimerTap;
  final ValueChanged<double>? onHeightChanged;
  final bool isReadingMode;
  final bool isTimerRunning;

  const FloatingActionBar({
    super.key,
    this.onUpdatePageTap,
    required this.onAddMemorablePageTap,
    this.onRecallSearchTap,
    this.onTimerTap,
    this.onHeightChanged,
    this.isReadingMode = true,
    this.isTimerRunning = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bottomSafeArea = MediaQuery.viewPaddingOf(context).bottom;

    return Positioned(
      left: 16,
      right: 16,
      bottom: bottomOffset + bottomSafeArea,
      child: _MeasureSize(
        key: actionBarKey,
        onChange: (size) => onHeightChanged?.call(size.height),
        child: isReadingMode
            ? _ReadingModeBar(
                isDark: isDark,
                onUpdatePageTap: onUpdatePageTap,
                onAddMemorablePageTap: onAddMemorablePageTap,
                onRecallSearchTap: onRecallSearchTap,
                onTimerTap: onTimerTap,
              )
            : _CompletedModeBar(
                isDark: isDark,
                onAddMemorablePageTap: onAddMemorablePageTap,
                onRecallSearchTap: onRecallSearchTap,
              ),
      ),
    );
  }

  static double contentBottomClearance({
    required double actionBarHeight,
    required double bottomSafeArea,
  }) {
    return actionBarHeight + bottomOffset + bottomSafeArea + contentSeparation;
  }

  static double minimumHeightFor(
    BuildContext context, {
    required bool isReadingMode,
  }) {
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final buttonHeight = math
        .max(62, MediaQuery.textScalerOf(context).scale(15) * 2.4 + 16)
        .toDouble();
    if (isReadingMode && textScale >= 1.4) {
      return buttonHeight * 2 + 8;
    }
    return buttonHeight;
  }
}

class _MeasureSize extends SingleChildRenderObjectWidget {
  const _MeasureSize({
    super.key,
    required this.onChange,
    required super.child,
  });

  final ValueChanged<Size> onChange;

  @override
  RenderObject createRenderObject(BuildContext context) {
    return _RenderMeasureSize(onChange);
  }

  @override
  void updateRenderObject(
    BuildContext context,
    covariant _RenderMeasureSize renderObject,
  ) {
    renderObject.onChange = onChange;
  }
}

class _RenderMeasureSize extends RenderProxyBox {
  _RenderMeasureSize(this.onChange);

  ValueChanged<Size> onChange;
  Size? _oldSize;

  @override
  void performLayout() {
    super.performLayout();
    if (size == _oldSize) return;
    _oldSize = size;
    WidgetsBinding.instance.addPostFrameCallback((_) => onChange(size));
  }
}

class _ReadingModeBar extends StatefulWidget {
  final bool isDark;
  final VoidCallback? onUpdatePageTap;
  final VoidCallback onAddMemorablePageTap;
  final VoidCallback? onRecallSearchTap;
  final VoidCallback? onTimerTap;

  const _ReadingModeBar({
    required this.isDark,
    this.onUpdatePageTap,
    required this.onAddMemorablePageTap,
    this.onRecallSearchTap,
    this.onTimerTap,
  });

  @override
  State<_ReadingModeBar> createState() => _ReadingModeBarState();
}

class _ReadingModeBarState extends State<_ReadingModeBar> {
  final GlobalKey _startReadingKey = GlobalKey();
  final GlobalKey _recordKey = GlobalKey();

  FloatingContextDropdownController<String>? _activeMenuController;

  @override
  void dispose() {
    _activeMenuController?.dismiss();
    super.dispose();
  }

  List<FloatingContextDropdownItem<String>> _buildStartReadingItems(
      BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final items = <FloatingContextDropdownItem<String>>[];

    if (widget.onTimerTap != null) {
      items.add(FloatingContextDropdownItem(
        icon: CupertinoIcons.timer,
        label: l10n.bottomBarTimerStart,
        value: 'timer',
      ));
    }

    if (widget.onUpdatePageTap != null) {
      items.add(FloatingContextDropdownItem(
        icon: CupertinoIcons.book_fill,
        label: l10n.bottomBarPageUpdate,
        value: 'page_update',
      ));
    }

    return items;
  }

  List<FloatingContextDropdownItem<String>> _buildRecordItems(
      BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final items = <FloatingContextDropdownItem<String>>[
      FloatingContextDropdownItem(
        icon: CupertinoIcons.plus,
        label: l10n.bottomBarAddRecord,
        value: 'add_record',
      ),
    ];

    if (widget.onRecallSearchTap != null) {
      items.add(FloatingContextDropdownItem(
        icon: Icons.auto_awesome,
        label: l10n.bottomBarAiRecordSearch,
        value: 'ai_search',
      ));
    }

    return items;
  }

  void _handleStartReadingSelection(String value) {
    switch (value) {
      case 'timer':
        widget.onTimerTap?.call();
        return;
      case 'page_update':
        widget.onUpdatePageTap?.call();
        return;
    }
  }

  void _handleRecordSelection(String value) {
    switch (value) {
      case 'add_record':
        widget.onAddMemorablePageTap();
        return;
      case 'ai_search':
        widget.onRecallSearchTap?.call();
        return;
    }
  }

  void _dismissActiveMenu() {
    _activeMenuController?.dismiss();
    _activeMenuController = null;
  }

  void _showMenu({
    required BuildContext context,
    required GlobalKey buttonKey,
    required Alignment alignment,
    required List<FloatingContextDropdownItem<String>> items,
    required ValueChanged<String> onSelected,
  }) {
    final renderBox =
        buttonKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final position = renderBox.localToGlobal(Offset.zero);
    _dismissActiveMenu();
    late final FloatingContextDropdownController<String> controller;
    controller = showFloatingContextDropdown<String>(
      context,
      buttonPosition: position,
      buttonWidth: renderBox.size.width,
      buttonHeight: renderBox.size.height,
      alignment: alignment,
      items: items,
      onDismissed: () {
        if (identical(_activeMenuController, controller)) {
          _activeMenuController = null;
        }
      },
      onSelected: (value) {
        _activeMenuController = null;
        onSelected(value);
      },
    );
    _activeMenuController = controller;
  }

  void _onStartReadingTap(BuildContext context) {
    final items = _buildStartReadingItems(context);
    if (items.isEmpty) return;

    if (items.length == 1) {
      _handleStartReadingSelection(items.first.value);
      return;
    }

    _showMenu(
      context: context,
      buttonKey: _startReadingKey,
      alignment: Alignment.bottomRight,
      items: items,
      onSelected: _handleStartReadingSelection,
    );
  }

  void _onRecordTap(BuildContext context) {
    final items = _buildRecordItems(context);

    if (items.length == 1) {
      widget.onAddMemorablePageTap();
      return;
    }

    _showMenu(
      context: context,
      buttonKey: _recordKey,
      alignment: Alignment.bottomLeft,
      items: items,
      onSelected: _handleRecordSelection,
    );
  }

  void _onStartReadingLongPressStart(
    BuildContext context,
    LongPressStartDetails details,
  ) {
    final items = _buildStartReadingItems(context);
    if (items.length <= 1) return;

    _showMenu(
      context: context,
      buttonKey: _startReadingKey,
      alignment: Alignment.bottomRight,
      items: items,
      onSelected: _handleStartReadingSelection,
    );
  }

  void _onRecordLongPressStart(
    BuildContext context,
    LongPressStartDetails details,
  ) {
    final items = _buildRecordItems(context);
    if (items.length <= 1) return;

    _showMenu(
      context: context,
      buttonKey: _recordKey,
      alignment: Alignment.bottomLeft,
      items: items,
      onSelected: _handleRecordSelection,
    );
  }

  void _onLongPressMoveUpdate(LongPressMoveUpdateDetails details) {
    _activeMenuController?.updateDragPosition(details.globalPosition);
  }

  void _onLongPressEnd(LongPressEndDetails details) {
    final controller = _activeMenuController;
    controller?.completeDragSelection();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final shouldStackActions = MediaQuery.textScalerOf(context).scale(1) >= 1.4;

    final recordAction = _GlassPillButton(
      key: _recordKey,
      isDark: widget.isDark,
      icon: CupertinoIcons.pencil,
      label: l10n.bottomBarRecord,
      onTap: () => _onRecordTap(context),
      onLongPressStart: (details) => _onRecordLongPressStart(context, details),
      onLongPressMoveUpdate: _onLongPressMoveUpdate,
      onLongPressEnd: _onLongPressEnd,
    );
    final startReadingAction = _GlassPillButton(
      key: _startReadingKey,
      isDark: widget.isDark,
      icon: CupertinoIcons.book_fill,
      label: l10n.bottomBarStartReading,
      onTap: () => _onStartReadingTap(context),
      onLongPressStart: (details) =>
          _onStartReadingLongPressStart(context, details),
      onLongPressMoveUpdate: _onLongPressMoveUpdate,
      onLongPressEnd: _onLongPressEnd,
    );

    if (shouldStackActions) {
      return Column(
        key: const ValueKey('reading-action-bar-stacked'),
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(width: double.infinity, child: recordAction),
          const SizedBox(height: 8),
          SizedBox(width: double.infinity, child: startReadingAction),
        ],
      );
    }

    return Row(
      key: const ValueKey('reading-action-bar-inline'),
      children: [
        Expanded(flex: 4, child: recordAction),
        const SizedBox(width: 12),
        Expanded(flex: 6, child: startReadingAction),
      ],
    );
  }
}

class _CompletedModeBar extends StatefulWidget {
  final bool isDark;
  final VoidCallback onAddMemorablePageTap;
  final VoidCallback? onRecallSearchTap;

  const _CompletedModeBar({
    required this.isDark,
    required this.onAddMemorablePageTap,
    this.onRecallSearchTap,
  });

  @override
  State<_CompletedModeBar> createState() => _CompletedModeBarState();
}

class _CompletedModeBarState extends State<_CompletedModeBar> {
  final GlobalKey _recordKey = GlobalKey();

  FloatingContextDropdownController<String>? _activeMenuController;

  @override
  void dispose() {
    _activeMenuController?.dismiss();
    super.dispose();
  }

  List<FloatingContextDropdownItem<String>> _buildRecordItems(
      BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final items = <FloatingContextDropdownItem<String>>[
      FloatingContextDropdownItem(
        icon: CupertinoIcons.plus,
        label: l10n.bottomBarAddRecord,
        value: 'add_record',
      ),
    ];

    if (widget.onRecallSearchTap != null) {
      items.add(FloatingContextDropdownItem(
        icon: Icons.auto_awesome,
        label: l10n.bottomBarAiRecordSearch,
        value: 'ai_search',
      ));
    }

    return items;
  }

  void _handleRecordSelection(String value) {
    switch (value) {
      case 'add_record':
        widget.onAddMemorablePageTap();
        return;
      case 'ai_search':
        widget.onRecallSearchTap?.call();
        return;
    }
  }

  void _dismissActiveMenu() {
    _activeMenuController?.dismiss();
    _activeMenuController = null;
  }

  void _showRecordMenu(BuildContext context) {
    final items = _buildRecordItems(context);

    if (items.length == 1) {
      widget.onAddMemorablePageTap();
      return;
    }

    final renderBox =
        _recordKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final position = renderBox.localToGlobal(Offset.zero);
    _dismissActiveMenu();
    late final FloatingContextDropdownController<String> controller;
    controller = showFloatingContextDropdown<String>(
      context,
      buttonPosition: position,
      buttonWidth: renderBox.size.width,
      buttonHeight: renderBox.size.height,
      alignment: Alignment.bottomLeft,
      items: items,
      onDismissed: () {
        if (identical(_activeMenuController, controller)) {
          _activeMenuController = null;
        }
      },
      onSelected: (value) {
        _activeMenuController = null;
        _handleRecordSelection(value);
      },
    );
    _activeMenuController = controller;
  }

  void _onRecordLongPressStart(
    BuildContext context,
    LongPressStartDetails details,
  ) {
    final items = _buildRecordItems(context);
    if (items.length <= 1) return;
    _showRecordMenu(context);
  }

  void _onLongPressMoveUpdate(LongPressMoveUpdateDetails details) {
    _activeMenuController?.updateDragPosition(details.globalPosition);
  }

  void _onLongPressEnd(LongPressEndDetails details) {
    final controller = _activeMenuController;
    controller?.completeDragSelection();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Row(
      children: [
        Expanded(
          flex: 7,
          child: _GlassPillButton(
            key: _recordKey,
            isDark: widget.isDark,
            icon: CupertinoIcons.pencil,
            label: l10n.bottomBarRecord,
            onTap: () => _showRecordMenu(context),
            onLongPressStart: (details) =>
                _onRecordLongPressStart(context, details),
            onLongPressMoveUpdate: _onLongPressMoveUpdate,
            onLongPressEnd: _onLongPressEnd,
          ),
        ),
      ],
    );
  }
}

class _GlassPillButton extends StatelessWidget {
  final bool isDark;
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final GestureLongPressStartCallback? onLongPressStart;
  final GestureLongPressMoveUpdateCallback? onLongPressMoveUpdate;
  final GestureLongPressEndCallback? onLongPressEnd;

  const _GlassPillButton({
    super.key,
    required this.isDark,
    required this.icon,
    required this.label,
    required this.onTap,
    this.onLongPressStart,
    this.onLongPressMoveUpdate,
    this.onLongPressEnd,
  });

  @override
  Widget build(BuildContext context) {
    final supportsWrappedLabel = MediaQuery.textScalerOf(context).scale(1) >= 1.4;

    return Semantics(
      button: true,
      label: label,
      onTap: onTap,
      child: ExcludeSemantics(
        child: GestureDetector(
          onTap: onTap,
          onLongPressStart: onLongPressStart,
          onLongPressMoveUpdate: onLongPressMoveUpdate,
          onLongPressEnd: onLongPressEnd,
          behavior: HitTestBehavior.opaque,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
              child: Container(
                constraints: const BoxConstraints(minHeight: 62),
                padding: EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: supportsWrappedLabel ? 8 : 0,
                ),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.12)
                      : Colors.black.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(100),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.15)
                        : Colors.black.withValues(alpha: 0.08),
                    width: 0.5,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      icon,
                      size: 17,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.85)
                          : Colors.black.withValues(alpha: 0.65),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        label,
                        maxLines: supportsWrappedLabel ? 2 : 1,
                        overflow: TextOverflow.visible,
                        softWrap: supportsWrappedLabel,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.85)
                              : Colors.black.withValues(alpha: 0.65),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class KeyboardDoneButton extends StatelessWidget {
  const KeyboardDoneButton({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Positioned(
      left: 20,
      right: 20,
      bottom: MediaQuery.of(context).viewInsets.bottom + 12,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () {
                FocusScope.of(context).unfocus();
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.white.withValues(alpha: isDark ? 0.18 : 0.9),
                      Colors.white.withValues(alpha: isDark ? 0.12 : 0.7),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.25)
                        : Colors.black.withValues(alpha: 0.1),
                    width: 0.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      CupertinoIcons.keyboard_chevron_compact_down,
                      size: 20,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.9)
                          : BLabColors.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '완료',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.9)
                            : BLabColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
