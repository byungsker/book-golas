import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';

class CompletedBookActionCard extends StatelessWidget {
  const CompletedBookActionCard({
    super.key,
    required this.cardKey,
    required this.title,
    required this.description,
    required this.icon,
    required this.onTap,
  });

  final Key cardKey;
  final String title;
  final String description;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textScaleFactor =
        MediaQuery.textScalerOf(context).scale(15) / 15;

    return Semantics(
      button: true,
      excludeSemantics: true,
      label: '$title. $description',
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Material(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            key: cardKey,
            borderRadius: BorderRadius.circular(12),
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final shouldStack =
                      textScaleFactor >= 1.3 || constraints.maxWidth < 300;
                  return shouldStack
                      ? _StackedCardContent(
                          icon: icon,
                          title: title,
                          description: description,
                          isDark: isDark,
                        )
                      : _InlineCardContent(
                          icon: icon,
                          title: title,
                          description: description,
                          isDark: isDark,
                        );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InlineCardContent extends StatelessWidget {
  const _InlineCardContent({
    required this.icon,
    required this.title,
    required this.description,
    required this.isDark,
  });

  final IconData icon;
  final String title;
  final String description;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _ActionIcon(icon: icon),
        const SizedBox(width: 12),
        Expanded(
          child: _ActionText(
            title: title,
            description: description,
            isDark: isDark,
          ),
        ),
        const SizedBox(width: 8),
        _Chevron(isDark: isDark),
      ],
    );
  }
}

class _StackedCardContent extends StatelessWidget {
  const _StackedCardContent({
    required this.icon,
    required this.title,
    required this.description,
    required this.isDark,
  });

  final IconData icon;
  final String title;
  final String description;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _ActionIcon(icon: icon),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                key: const ValueKey('completed-book-action-title-stacked'),
                style: _titleStyle(isDark),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Padding(
          padding: const EdgeInsets.only(left: 52),
          child: Text(
            description,
            key: const ValueKey('completed-book-action-description-stacked'),
            style: _descriptionStyle(isDark),
          ),
        ),
        const SizedBox(height: 6),
        Align(
          alignment: Alignment.centerRight,
          child: _Chevron(isDark: isDark),
        ),
      ],
    );
  }
}

class _ActionIcon extends StatelessWidget {
  const _ActionIcon({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: BLabColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: BLabColors.primary, size: 22),
    );
  }
}

class _ActionText extends StatelessWidget {
  const _ActionText({
    required this.title,
    required this.description,
    required this.isDark,
  });

  final String title;
  final String description;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          key: const ValueKey('completed-book-action-title-inline'),
          style: _titleStyle(isDark),
        ),
        const SizedBox(height: 2),
        Text(
          description,
          key: const ValueKey('completed-book-action-description-inline'),
          style: _descriptionStyle(isDark),
        ),
      ],
    );
  }
}

class _Chevron extends StatelessWidget {
  const _Chevron({required this.isDark});

  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Icon(
      CupertinoIcons.chevron_right,
      color: isDark ? Colors.grey[400] : Colors.grey[500],
      size: 20,
    );
  }
}

TextStyle _titleStyle(bool isDark) {
  return TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: isDark ? Colors.white : Colors.black,
  );
}

TextStyle _descriptionStyle(bool isDark) {
  return TextStyle(
    fontSize: 12,
    color: isDark ? Colors.grey[400] : Colors.grey[600],
  );
}
