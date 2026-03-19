import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/floating_context_dropdown.dart';

class FloatingActionBar extends StatelessWidget {
  final VoidCallback? onUpdatePageTap;
  final VoidCallback onAddMemorablePageTap;
  final VoidCallback? onRecallSearchTap;
  final VoidCallback? onTimerTap;
  final bool isReadingMode;
  final bool isTimerRunning;

  const FloatingActionBar({
    super.key,
    this.onUpdatePageTap,
    required this.onAddMemorablePageTap,
    this.onRecallSearchTap,
    this.onTimerTap,
    this.isReadingMode = true,
    this.isTimerRunning = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Positioned(
      left: 16,
      right: 16,
      bottom: 22,
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
    );
  }
}

class _ReadingModeBar extends StatelessWidget {
  final bool isDark;
  final VoidCallback? onUpdatePageTap;
  final VoidCallback onAddMemorablePageTap;
  final VoidCallback? onRecallSearchTap;
  final VoidCallback? onTimerTap;

  final GlobalKey _startReadingKey = GlobalKey();
  final GlobalKey _recordKey = GlobalKey();

  _ReadingModeBar({
    required this.isDark,
    this.onUpdatePageTap,
    required this.onAddMemorablePageTap,
    this.onRecallSearchTap,
    this.onTimerTap,
  });

  void _onStartReadingTap(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final items = <FloatingContextDropdownItem<String>>[];

    if (onTimerTap != null) {
      items.add(FloatingContextDropdownItem(
        icon: CupertinoIcons.timer,
        label: l10n.bottomBarTimerStart,
        value: 'timer',
      ));
    }

    if (onUpdatePageTap != null) {
      items.add(FloatingContextDropdownItem(
        icon: CupertinoIcons.book_fill,
        label: l10n.bottomBarPageUpdate,
        value: 'page_update',
      ));
    }

    if (items.length == 1) {
      if (items.first.value == 'timer') {
        onTimerTap?.call();
      } else {
        onUpdatePageTap?.call();
      }
      return;
    }

    if (items.isEmpty) return;

    final renderBox =
        _startReadingKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;
    final position = renderBox.localToGlobal(Offset.zero);

    showFloatingContextDropdown<String>(
      context,
      buttonPosition: position,
      buttonWidth: renderBox.size.width,
      buttonHeight: renderBox.size.height,
      alignment: Alignment.bottomLeft,
      items: items,
      onSelected: (value) {
        switch (value) {
          case 'timer':
            onTimerTap?.call();
          case 'page_update':
            onUpdatePageTap?.call();
        }
      },
    );
  }

  void _onRecordTap(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final items = <FloatingContextDropdownItem<String>>[
      FloatingContextDropdownItem(
        icon: CupertinoIcons.plus,
        label: l10n.bottomBarAddRecord,
        value: 'add_record',
      ),
    ];

    if (onRecallSearchTap != null) {
      items.add(FloatingContextDropdownItem(
        icon: Icons.auto_awesome,
        label: l10n.bottomBarAiRecordSearch,
        value: 'ai_search',
      ));
    }

    if (items.length == 1) {
      onAddMemorablePageTap();
      return;
    }

    final renderBox =
        _recordKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;
    final position = renderBox.localToGlobal(Offset.zero);

    showFloatingContextDropdown<String>(
      context,
      buttonPosition: position,
      buttonWidth: renderBox.size.width,
      buttonHeight: renderBox.size.height,
      alignment: Alignment.bottomRight,
      items: items,
      onSelected: (value) {
        switch (value) {
          case 'add_record':
            onAddMemorablePageTap();
          case 'ai_search':
            onRecallSearchTap?.call();
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Row(
      children: [
        Expanded(
          flex: 7,
          child: _GlassPillButton(
            key: _startReadingKey,
            isDark: isDark,
            icon: CupertinoIcons.book_fill,
            label: l10n.bottomBarStartReading,
            onTap: () => _onStartReadingTap(context),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 3,
          child: _GlassPillButton(
            key: _recordKey,
            isDark: isDark,
            icon: CupertinoIcons.pencil,
            label: l10n.bottomBarRecord,
            onTap: () => _onRecordTap(context),
          ),
        ),
      ],
    );
  }
}

class _CompletedModeBar extends StatelessWidget {
  final bool isDark;
  final VoidCallback onAddMemorablePageTap;
  final VoidCallback? onRecallSearchTap;

  final GlobalKey _recordKey = GlobalKey();

  _CompletedModeBar({
    required this.isDark,
    required this.onAddMemorablePageTap,
    this.onRecallSearchTap,
  });

  void _onRecordTap(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final items = <FloatingContextDropdownItem<String>>[
      FloatingContextDropdownItem(
        icon: CupertinoIcons.plus,
        label: l10n.bottomBarAddRecord,
        value: 'add_record',
      ),
    ];

    if (onRecallSearchTap != null) {
      items.add(FloatingContextDropdownItem(
        icon: Icons.auto_awesome,
        label: l10n.bottomBarAiRecordSearch,
        value: 'ai_search',
      ));
    }

    if (items.length == 1) {
      onAddMemorablePageTap();
      return;
    }

    final renderBox =
        _recordKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;
    final position = renderBox.localToGlobal(Offset.zero);

    showFloatingContextDropdown<String>(
      context,
      buttonPosition: position,
      buttonWidth: renderBox.size.width,
      buttonHeight: renderBox.size.height,
      alignment: Alignment.bottomLeft,
      items: items,
      onSelected: (value) {
        switch (value) {
          case 'add_record':
            onAddMemorablePageTap();
          case 'ai_search':
            onRecallSearchTap?.call();
        }
      },
    );
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
            isDark: isDark,
            icon: CupertinoIcons.pencil,
            label: l10n.bottomBarRecord,
            onTap: () => _onRecordTap(context),
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

  const _GlassPillButton({
    super.key,
    required this.isDark,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(100),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(100),
            child: Container(
              height: 62,
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
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.85)
                          : Colors.black.withValues(alpha: 0.65),
                    ),
                  ),
                ],
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
