import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/domain/models/highlight_data.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/book_detail/widgets/highlight/highlight_overlay.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class HighlightEditView extends StatefulWidget {
  final Widget imageWidget;
  final List<HighlightData> highlights;
  final String selectedColor;
  final double selectedOpacity;
  final double selectedStrokeWidth;
  final bool isEraserMode;
  final bool canUndo;
  final VoidCallback onComplete;
  final VoidCallback onUndoTap;
  final void Function(HighlightData highlight) onHighlightAdded;
  final void Function(String highlightId) onHighlightRemoved;
  final void Function(String color) onColorSelected;
  final void Function(double opacity) onOpacityChanged;
  final void Function(double strokeWidth) onStrokeWidthChanged;
  final void Function(bool isEraser) onEraserModeChanged;

  const HighlightEditView({
    super.key,
    required this.imageWidget,
    required this.highlights,
    required this.selectedColor,
    required this.selectedOpacity,
    required this.selectedStrokeWidth,
    required this.isEraserMode,
    required this.canUndo,
    required this.onComplete,
    required this.onUndoTap,
    required this.onHighlightAdded,
    required this.onHighlightRemoved,
    required this.onColorSelected,
    required this.onOpacityChanged,
    required this.onStrokeWidthChanged,
    required this.onEraserModeChanged,
  });

  @override
  State<HighlightEditView> createState() => _HighlightEditViewState();
}

class _HighlightEditViewState extends State<HighlightEditView> {
  bool _showSettings = false;

  void _toggleSettings() {
    HapticFeedback.selectionClick();
    setState(() {
      _showSettings = !_showSettings;
    });
  }

  void _closeSettings() {
    if (_showSettings) {
      setState(() {
        _showSettings = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        _buildHeader(context, isDark),
        Expanded(
          child: Stack(
            children: [
              _buildImageArea(isDark),
              if (_showSettings) _buildSettingsOverlay(isDark),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _buildToolbar(isDark),
        ),
        SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
      ],
    );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            l10n.highlightEditTitle,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          GestureDetector(
            onTap: widget.onComplete,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: BLabColors.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                l10n.highlightEditDone,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageArea(bool isDark) {
    return GestureDetector(
      onTap: _closeSettings,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: isDark ? Colors.grey[900] : Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return InteractiveViewer(
                minScale: 1.0,
                maxScale: 3.0,
                panEnabled: false,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    widget.imageWidget,
                    Positioned.fill(
                      child: HighlightOverlay(
                        imageSize: Size(
                          constraints.maxWidth,
                          constraints.maxHeight,
                        ),
                        highlights: widget.highlights,
                        selectedColor: widget.selectedColor,
                        selectedOpacity: widget.selectedOpacity,
                        strokeWidth: widget.selectedStrokeWidth,
                        isEraserMode: widget.isEraserMode,
                        onHighlightAdded: widget.onHighlightAdded,
                        onHighlightRemoved: widget.onHighlightRemoved,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildSettingsOverlay(bool isDark) {
    final color = HighlightColor.toColor(widget.selectedColor);

    return Positioned(
      left: 32,
      right: 32,
      bottom: 16,
      child: GestureDetector(
        onTap: () {},
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? BLabColors.subtleDark : Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.5 : 0.2),
                blurRadius: 20,
                offset: const Offset(0, 4),
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
                    size: 16,
                    color: isDark ? Colors.grey[500] : Colors.grey[400],
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '투명도',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${(widget.selectedOpacity * 100).toInt()}%',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SliderTheme(
                data: SliderThemeData(
                  activeTrackColor:
                      color.withValues(alpha: widget.selectedOpacity),
                  inactiveTrackColor:
                      isDark ? Colors.grey[700] : Colors.grey[300],
                  thumbColor: color,
                  overlayColor: color.withValues(alpha: 0.2),
                  trackHeight: 4,
                  thumbShape:
                      const RoundSliderThumbShape(enabledThumbRadius: 10),
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
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '굵기',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${widget.selectedStrokeWidth.toInt()}px',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SliderTheme(
                data: SliderThemeData(
                  activeTrackColor:
                      color.withValues(alpha: widget.selectedOpacity),
                  inactiveTrackColor:
                      isDark ? Colors.grey[700] : Colors.grey[300],
                  thumbColor: color,
                  overlayColor: color.withValues(alpha: 0.2),
                  trackHeight: 4,
                  thumbShape:
                      const RoundSliderThumbShape(enabledThumbRadius: 10),
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
        ),
      ),
    );
  }

  Widget _buildToolbar(bool isDark) {
    return Container(
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

  Widget _buildSettingsButton(bool isDark) {
    return GestureDetector(
      onTap: _toggleSettings,
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
          Icons.highlight_off,
          size: 20,
          color: widget.isEraserMode
              ? Colors.white
              : (isDark ? Colors.white : Colors.black),
        ),
      ),
    );
  }
}
