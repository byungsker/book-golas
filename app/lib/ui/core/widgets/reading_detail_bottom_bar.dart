import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/l10n/app_localizations.dart';

class ReadingDetailBottomBar extends StatelessWidget {
  final VoidCallback onBackTap;
  final VoidCallback onUpdatePageTap;
  final VoidCallback onAddMemorablePageTap;

  const ReadingDetailBottomBar({
    super.key,
    required this.onBackTap,
    required this.onUpdatePageTap,
    required this.onAddMemorablePageTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final glassColor = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.black.withValues(alpha: 0.08);

    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : Colors.black.withValues(alpha: 0.08);

    final iconColor = isDark
        ? Colors.white.withValues(alpha: 0.9)
        : Colors.black.withValues(alpha: 0.7);

    final textColor = isDark
        ? Colors.white.withValues(alpha: 0.85)
        : Colors.black.withValues(alpha: 0.65);

    return Row(
      children: [
        _buildBackButton(glassColor, borderColor, iconColor),
        const SizedBox(width: 12),
        Expanded(
          child: _buildUpdatePageButton(glassColor, borderColor, textColor),
        ),
        const SizedBox(width: 12),
        _buildAddButton(glassColor, borderColor, iconColor),
      ],
    );
  }

  Widget _buildBackButton(
      Color glassColor, Color borderColor, Color iconColor) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onBackTap();
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
              shape: BoxShape.circle,
              border: Border.all(
                color: borderColor,
                width: 0.5,
              ),
            ),
            child: Icon(
              CupertinoIcons.arrow_left,
              color: iconColor,
              size: 22,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildUpdatePageButton(
      Color glassColor, Color borderColor, Color textColor) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(100),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              HapticFeedback.selectionClick();
              onUpdatePageTap();
            },
            borderRadius: BorderRadius.circular(100),
            child: Container(
              height: 62,
              decoration: BoxDecoration(
                color: glassColor,
                borderRadius: BorderRadius.circular(100),
                border: Border.all(
                  color: borderColor,
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
                      color: textColor,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      AppLocalizations.of(context).pageUpdateButton,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: textColor,
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

  Widget _buildAddButton(Color glassColor, Color borderColor, Color iconColor) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onAddMemorablePageTap();
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
              shape: BoxShape.circle,
              border: Border.all(
                color: borderColor,
                width: 0.5,
              ),
            ),
            child: Icon(
              CupertinoIcons.plus,
              color: iconColor,
              size: 22,
            ),
          ),
        ),
      ),
    );
  }
}
