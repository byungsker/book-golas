import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/timer_button.dart';

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
          ? _buildReadingModeLayout(isDark)
          : _buildCompletedModeLayout(isDark),
    );
  }

  Widget _buildReadingModeLayout(bool isDark) {
    return Row(
      children: [
        if (onTimerTap != null) ...[
          _buildTimerButtonCircle(isDark),
          const SizedBox(width: 12),
        ],
        if (onRecallSearchTap != null) ...[
          _buildRecallSearchButtonCircle(isDark),
          const SizedBox(width: 12),
        ],
        if (onUpdatePageTap != null)
          Expanded(
            child: _buildUpdatePageButton(isDark),
          ),
        const SizedBox(width: 12),
        _buildAddButton(isDark),
      ],
    );
  }

  Widget _buildCompletedModeLayout(bool isDark) {
    return Row(
      children: [
        if (onRecallSearchTap != null)
          Expanded(
            child: _buildRecallSearchButtonBar(isDark),
          ),
        const SizedBox(width: 12),
        _buildAddButton(isDark),
      ],
    );
  }

  Widget _buildTimerButtonCircle(bool isDark) {
    return TimerButton(
      onTap: onTimerTap,
      isRunning: isTimerRunning,
    );
  }

  Widget _buildRecallSearchButtonCircle(bool isDark) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(100),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onRecallSearchTap,
            borderRadius: BorderRadius.circular(100),
            child: Container(
              width: 62,
              height: 62,
              decoration: BoxDecoration(
                color: isDark
                    ? BLabColors.primary.withValues(alpha: 0.3)
                    : BLabColors.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(
                  color: isDark
                      ? BLabColors.primary.withValues(alpha: 0.5)
                      : BLabColors.primary.withValues(alpha: 0.3),
                  width: 0.5,
                ),
              ),
              child: const Stack(
                alignment: Alignment.center,
                children: [
                  Positioned(
                    left: 14,
                    child: Icon(
                      Icons.auto_awesome,
                      size: 18,
                      color: BLabColors.primary,
                    ),
                  ),
                  Positioned(
                    right: 14,
                    child: Icon(
                      Icons.search,
                      size: 18,
                      color: BLabColors.primary,
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

  Widget _buildRecallSearchButtonBar(bool isDark) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(100),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onRecallSearchTap,
            borderRadius: BorderRadius.circular(100),
            child: Container(
              height: 62,
              decoration: BoxDecoration(
                color: isDark
                    ? BLabColors.primary.withValues(alpha: 0.3)
                    : BLabColors.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(100),
                border: Border.all(
                  color: isDark
                      ? BLabColors.primary.withValues(alpha: 0.5)
                      : BLabColors.primary.withValues(alpha: 0.3),
                  width: 0.5,
                ),
              ),
              child: Builder(
                builder: (context) => Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.auto_awesome,
                      size: 18,
                      color: BLabColors.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      AppLocalizations.of(context).searchRecordsButton,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: BLabColors.primary,
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

  Widget _buildUpdatePageButton(bool isDark) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(100),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onUpdatePageTap,
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
              child: Builder(
                builder: (context) => Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      CupertinoIcons.book_fill,
                      size: 17,
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.85)
                          : Colors.black.withValues(alpha: 0.65),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      AppLocalizations.of(context).pageUpdateButton,
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
      ),
    );
  }

  Widget _buildAddButton(bool isDark) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(100),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onAddMemorablePageTap,
            borderRadius: BorderRadius.circular(100),
            child: Container(
              width: 62,
              height: 62,
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.12)
                    : Colors.black.withValues(alpha: 0.08),
                shape: BoxShape.circle,
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.15)
                      : Colors.black.withValues(alpha: 0.08),
                  width: 0.5,
                ),
              ),
              child: Icon(
                CupertinoIcons.plus,
                size: 22,
                color: isDark
                    ? Colors.white.withValues(alpha: 0.9)
                    : Colors.black.withValues(alpha: 0.7),
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
