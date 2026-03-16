import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/domain/models/highlight_data.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class HighlightToolbar extends StatefulWidget {
  final String selectedColor;
  final double selectedOpacity;
  final double selectedStrokeWidth;
  final bool isEraserMode;
  final VoidCallback onUndoTap;
  final bool canUndo;
  final void Function(String color) onColorSelected;
  final void Function(double opacity) onOpacityChanged;
  final void Function(double strokeWidth) onStrokeWidthChanged;
  final void Function(bool isEraser) onEraserModeChanged;

  const HighlightToolbar({
    super.key,
    required this.selectedColor,
    this.selectedOpacity = 0.5,
    this.selectedStrokeWidth = 20.0,
    required this.isEraserMode,
    required this.onUndoTap,
    required this.canUndo,
    required this.onColorSelected,
    required this.onOpacityChanged,
    required this.onStrokeWidthChanged,
    required this.onEraserModeChanged,
  });

  @override
  State<HighlightToolbar> createState() => _HighlightToolbarState();
}

class _HighlightToolbarState extends State<HighlightToolbar> {
  bool _showSettings = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_showSettings) ...[
          _buildSettingsPanel(isDark),
          const SizedBox(height: 8),
        ],
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: isDark ? BLabColors.subtleDark : Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.1),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              _buildUndoButton(isDark),
              const SizedBox(width: 8),
              _buildDivider(isDark),
              const SizedBox(width: 8),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: HighlightColor.colors
                        .map((color) => _buildColorButton(color, isDark))
                        .toList(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _buildDivider(isDark),
              const SizedBox(width: 8),
              _buildSettingsButton(isDark),
              const SizedBox(width: 8),
              _buildEraserButton(isDark),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsPanel(bool isDark) {
    final color = HighlightColor.toColor(widget.selectedColor);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.subtleDark : Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                CupertinoIcons.sun_min,
                size: 14,
                color: isDark ? Colors.grey[500] : Colors.grey[400],
              ),
              const SizedBox(width: 8),
              Text(
                '투명도',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const Spacer(),
              Text(
                '${(widget.selectedOpacity * 100).toInt()}%',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: color.withValues(alpha: widget.selectedOpacity),
              inactiveTrackColor: isDark ? Colors.grey[700] : Colors.grey[300],
              thumbColor: color,
              overlayColor: color.withValues(alpha: 0.2),
              trackHeight: 4,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
            ),
            child: Slider(
              value: widget.selectedOpacity,
              min: 0.1,
              max: 0.8,
              onChanged: (value) {
                HapticFeedback.selectionClick();
                widget.onOpacityChanged(value);
              },
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '굵기',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const Spacer(),
              Text(
                '${widget.selectedStrokeWidth.toInt()}px',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: color.withValues(alpha: widget.selectedOpacity),
              inactiveTrackColor: isDark ? Colors.grey[700] : Colors.grey[300],
              thumbColor: color,
              overlayColor: color.withValues(alpha: 0.2),
              trackHeight: 4,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
            ),
            child: Slider(
              value: widget.selectedStrokeWidth,
              min: 4.0,
              max: 40.0,
              onChanged: (value) {
                HapticFeedback.selectionClick();
                widget.onStrokeWidthChanged(value);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsButton(bool isDark) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          _showSettings = !_showSettings;
        });
      },
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: _showSettings
              ? BLabColors.primary
              : (isDark ? Colors.grey[800] : Colors.grey[100]),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          CupertinoIcons.slider_horizontal_3,
          size: 18,
          color: _showSettings
              ? Colors.white
              : (isDark ? Colors.white : Colors.black),
        ),
      ),
    );
  }

  Widget _buildUndoButton(bool isDark) {
    return GestureDetector(
      onTap: widget.canUndo
          ? () {
              HapticFeedback.lightImpact();
              widget.onUndoTap();
            }
          : null,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: isDark ? Colors.grey[800] : Colors.grey[100],
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          CupertinoIcons.arrow_uturn_left,
          size: 18,
          color: widget.canUndo
              ? (isDark ? Colors.white : Colors.black)
              : (isDark ? Colors.grey[600] : Colors.grey[400]),
        ),
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Container(
      width: 1,
      height: 24,
      color: isDark ? Colors.grey[700] : Colors.grey[300],
    );
  }

  Widget _buildColorButton(String colorHex, bool isDark) {
    final isSelected = widget.selectedColor == colorHex && !widget.isEraserMode;
    final color = HighlightColor.toColor(colorHex);

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        widget.onEraserModeChanged(false);
        widget.onColorSelected(colorHex);
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 3),
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.7),
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected ? color : Colors.transparent,
            width: 3,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: color.withValues(alpha: 0.4),
                    blurRadius: 6,
                    spreadRadius: 1,
                  ),
                ]
              : null,
        ),
        child: isSelected
            ? const Icon(Icons.check, size: 16, color: Colors.white)
            : null,
      ),
    );
  }

  Widget _buildEraserButton(bool isDark) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        widget.onEraserModeChanged(!widget.isEraserMode);
      },
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: widget.isEraserMode
              ? BLabColors.primary
              : (isDark ? Colors.grey[800] : Colors.grey[100]),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          CupertinoIcons.clear_circled,
          size: 20,
          color: widget.isEraserMode
              ? Colors.white
              : (isDark ? Colors.white : Colors.black),
        ),
      ),
    );
  }
}
