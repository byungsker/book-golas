import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/domain/models/recall_models.dart';
import 'package:book_golas/data/services/recall_service.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/l10n/app_localizations.dart';

Future<void> showRecordDetailSheet({
  required BuildContext context,
  required RecallSource source,
  VoidCallback? onGoToBook,
}) async {
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => _RecordDetailSheetContent(
      source: source,
      onGoToBook: onGoToBook,
    ),
  );
}

class _RecordDetailSheetContent extends StatefulWidget {
  final RecallSource source;
  final VoidCallback? onGoToBook;

  const _RecordDetailSheetContent({
    required this.source,
    this.onGoToBook,
  });

  @override
  State<_RecordDetailSheetContent> createState() =>
      _RecordDetailSheetContentState();
}

class _RecordDetailSheetContentState extends State<_RecordDetailSheetContent> {
  String? _imageUrl;
  bool _isLoadingImage = false;

  @override
  void initState() {
    super.initState();
    if (widget.source.type == 'photo_ocr' && widget.source.sourceId != null) {
      _loadImageUrl();
    }
  }

  Future<void> _loadImageUrl() async {
    setState(() => _isLoadingImage = true);
    try {
      final url =
          await RecallService().getImageUrlBySourceId(widget.source.sourceId!);
      if (mounted) {
        setState(() {
          _imageUrl = url;
          _isLoadingImage = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingImage = false);
      }
    }
  }

  void _copyContent() {
    Clipboard.setData(ClipboardData(text: widget.source.content));
    CustomSnackbar.show(
      context,
      message: AppLocalizations.of(context).recallContentCopied,
      type: BLabSnackbarType.success,
      bottomOffset: 32,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final source = widget.source;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildHeader(isDark, source),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (source.type == 'photo_ocr') _buildImageSection(isDark),
                  _buildContentSection(isDark, source),
                  const SizedBox(height: 24),
                  _buildActions(isDark),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isDark, RecallSource source) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.05),
          ),
        ),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? Colors.grey[700] : Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _getTypeColor(source.type).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Text(
                  _getTypeIcon(source.type),
                  style: const TextStyle(fontSize: 16),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      source.typeLabel,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    if (source.bookTitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        source.bookTitle!,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.6)
                              : Colors.black.withValues(alpha: 0.5),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  CupertinoIcons.xmark,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildImageSection(bool isDark) {
    if (_isLoadingImage) {
      return Container(
        height: 200,
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.05)
              : Colors.black.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_imageUrl == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          _imageUrl!,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => Container(
            height: 150,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.black.withValues(alpha: 0.03),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Icon(
                CupertinoIcons.photo,
                size: 40,
                color: isDark ? Colors.grey[600] : Colors.grey[400],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContentSection(bool isDark, RecallSource source) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (source.pageNumber != null)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'p.${source.pageNumber}',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.6)
                        : Colors.black.withValues(alpha: 0.5),
                  ),
                ),
              ),
            const Spacer(),
            GestureDetector(
              onTap: _copyContent,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.black.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.copy_outlined,
                      size: 14,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      AppLocalizations.of(context).recallCopy,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.03)
                : Colors.black.withValues(alpha: 0.02),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.05),
            ),
          ),
          child: SelectableText(
            source.content,
            style: TextStyle(
              fontSize: 15,
              height: 1.7,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActions(bool isDark) {
    if (widget.onGoToBook == null) return const SizedBox.shrink();

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () {
          Navigator.pop(context);
          widget.onGoToBook?.call();
        },
        icon: const Icon(CupertinoIcons.book, size: 18),
        label: Text(AppLocalizations.of(context).recallViewInBook),
        style: ElevatedButton.styleFrom(
          backgroundColor: BLabColors.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'highlight':
        return BLabColors.primary;
      case 'note':
        return Colors.orange;
      case 'photo_ocr':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  String _getTypeIcon(String type) {
    switch (type) {
      case 'highlight':
        return '✨';
      case 'note':
        return '📝';
      case 'photo_ocr':
        return '📷';
      default:
        return '📄';
    }
  }
}
