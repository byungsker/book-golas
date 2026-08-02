import 'dart:ui';

import 'package:flutter/material.dart';

class BLabTextField extends StatefulWidget {
  final TextEditingController controller;
  final String? label;
  final String? hintText;
  final bool readOnly;
  final bool obscureText;
  final VoidCallback? onTap;
  final Widget? suffixIcon;
  final int maxLines;
  final TextInputType? keyboardType;
  final bool autofocus;
  final TextAlign textAlign;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final TextStyle? textStyle;
  final String? errorText;
  final String? suffixText;
  final TextStyle? suffixStyle;
  final bool showClearButton;
  final String? semanticLabel;

  const BLabTextField({
    super.key,
    required this.controller,
    this.label,
    this.hintText,
    this.readOnly = false,
    this.obscureText = false,
    this.onTap,
    this.suffixIcon,
    this.maxLines = 1,
    this.keyboardType,
    this.autofocus = false,
    this.textAlign = TextAlign.start,
    this.onChanged,
    this.onSubmitted,
    this.textStyle,
    this.errorText,
    this.suffixText,
    this.suffixStyle,
    this.showClearButton = true,
    this.semanticLabel,
  });

  @override
  State<BLabTextField> createState() => _BLabTextFieldState();
}

class _BLabTextFieldState extends State<BLabTextField> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
    _hasText = widget.controller.text.isNotEmpty;
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() {
    final hasText = widget.controller.text.isNotEmpty;
    if (_hasText != hasText) {
      setState(() => _hasText = hasText);
    }
  }

  void _clearText() {
    widget.controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final glassColor = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.black.withValues(alpha: 0.08);

    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : Colors.black.withValues(alpha: 0.08);

    final textColor = isDark ? Colors.white : Colors.black;
    final hintColor = isDark
        ? Colors.white.withValues(alpha: 0.5)
        : Colors.black.withValues(alpha: 0.5);
    final textField = TextField(
      controller: widget.controller,
      readOnly: widget.readOnly,
      obscureText: widget.obscureText,
      onTap: widget.onTap,
      maxLines: widget.obscureText ? 1 : widget.maxLines,
      keyboardType: widget.keyboardType,
      autofocus: widget.autofocus,
      textAlign: widget.textAlign,
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
      style: widget.textStyle ?? TextStyle(color: textColor, fontSize: 16),
      cursorColor: textColor,
      decoration: InputDecoration(
        hintText: widget.hintText,
        hintStyle: TextStyle(color: hintColor, fontSize: 16),
        filled: false,
        border: InputBorder.none,
        enabledBorder: InputBorder.none,
        focusedBorder: InputBorder.none,
        isDense: true,
        errorText: widget.errorText,
        suffixText: widget.suffixText,
        suffixStyle: widget.suffixStyle,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        suffixIcon: _buildSuffixIcon(isDark),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: TextStyle(
              color: textColor.withValues(alpha: 0.7),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
        ],
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
            child: Container(
              decoration: BoxDecoration(
                color: glassColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: borderColor, width: 0.5),
              ),
              child: widget.semanticLabel == null
                  ? textField
                  : MergeSemantics(
                      child: Semantics(
                        label: widget.semanticLabel,
                        child: textField,
                      ),
                    ),
            ),
          ),
        ),
      ],
    );
  }

  Widget? _buildSuffixIcon(bool isDark) {
    if (widget.suffixIcon != null) {
      return widget.suffixIcon;
    }

    if (widget.showClearButton && !widget.readOnly && _hasText) {
      return GestureDetector(
        onTap: _clearText,
        child: Padding(
          padding: const EdgeInsets.only(right: 12),
          child: Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.3)
                  : Colors.black.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.clear,
              color: isDark
                  ? Colors.black.withValues(alpha: 0.7)
                  : Colors.white.withValues(alpha: 0.9),
              size: 14,
            ),
          ),
        ),
      );
    }

    return null;
  }
}
