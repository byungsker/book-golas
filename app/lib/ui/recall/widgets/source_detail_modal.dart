import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shimmer/shimmer.dart';

import 'package:book_golas/domain/models/recall_models.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/data/services/recall_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';

class SourceDetailModal extends StatefulWidget {
  final RecallSource source;

  const SourceDetailModal({super.key, required this.source});

  @override
  State<SourceDetailModal> createState() => _SourceDetailModalState();
}

class _SourceDetailModalState extends State<SourceDetailModal> {
  String? _imageUrl;
  bool _isLoadingImage = false;

  @override
  void initState() {
    super.initState();
    if (widget.source.type == 'photo_ocr' && widget.source.sourceId != null) {
      _loadImage();
    }
  }

  Future<void> _loadImage() async {
    setState(() => _isLoadingImage = true);
    final url =
        await RecallService().getImageUrlBySourceId(widget.source.sourceId!);
    if (mounted) {
      setState(() {
        _imageUrl = url;
        _isLoadingImage = false;
      });
    }
  }

  void _copyText() {
    Clipboard.setData(ClipboardData(text: widget.source.content));
    CustomSnackbar.show(
      context,
      message: AppLocalizations.of(context).recallTextCopied,
      type: BLabSnackbarType.success,
      bottomOffset: 32,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final source = widget.source;

    IconData icon;
    Color color;
    switch (source.type) {
      case 'highlight':
        icon = Icons.highlight;
        color = Colors.amber;
        break;
      case 'note':
        icon = Icons.notes;
        color = Colors.green;
        break;
      case 'photo_ocr':
        icon = Icons.photo;
        color = Colors.purple;
        break;
      default:
        icon = Icons.article;
        color = Colors.blue;
    }

    return GestureDetector(
      onTap: () => Navigator.pop(context),
      child: Container(
        color: Colors.black54,
        child: GestureDetector(
          onTap: () {},
          child: DraggableScrollableSheet(
            initialChildSize: 0.7,
            minChildSize: 0.3,
            maxChildSize: 0.9,
            builder: (_, scrollController) => Container(
              decoration: BoxDecoration(
                color: isDark ? BLabColors.surfaceDark : Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 12),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey[700] : Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(icon, color: color, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          source.typeLabel,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                        if (source.pageNumber != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color:
                                  isDark ? Colors.grey[800] : Colors.grey[200],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${source.pageNumber}p',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? Colors.grey[400]
                                    : Colors.grey[600],
                              ),
                            ),
                          ),
                        ],
                        const Spacer(),
                        GestureDetector(
                          onTap: _copyText,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            child: Icon(
                              Icons.copy_outlined,
                              size: 20,
                              color:
                                  isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            child: Icon(
                              CupertinoIcons.xmark,
                              size: 20,
                              color:
                                  isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(),
                  Expanded(
                    child: ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.all(20),
                      children: [
                        if (source.type == 'photo_ocr') ...[
                          if (_isLoadingImage)
                            _buildImageShimmer(isDark)
                          else if (_imageUrl != null)
                            _buildImage(isDark),
                          const SizedBox(height: 16),
                        ],
                        SelectableText(
                          source.content,
                          style: TextStyle(
                            fontSize: 16,
                            height: 1.7,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        if (source.createdAt != null) ...[
                          const SizedBox(height: 24),
                          Text(
                            '${source.createdAt!.year}.${source.createdAt!.month.toString().padLeft(2, '0')}.${source.createdAt!.day.toString().padLeft(2, '0')}',
                            style: TextStyle(
                              fontSize: 13,
                              color:
                                  isDark ? Colors.grey[600] : Colors.grey[400],
                            ),
                          ),
                        ],
                      ],
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

  Widget _buildImageShimmer(bool isDark) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Shimmer.fromColors(
        baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
        highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
        child: Container(
          height: 200,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildImage(bool isDark) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: CachedNetworkImage(
        imageUrl: _imageUrl!,
        fit: BoxFit.cover,
        placeholder: (_, __) => _buildImageShimmer(isDark),
        errorWidget: (_, __, ___) => Container(
          height: 100,
          color: isDark ? Colors.grey[800] : Colors.grey[200],
          child: Center(
            child: Icon(
              Icons.broken_image_outlined,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
            ),
          ),
        ),
      ),
    );
  }
}

Future<void> showSourceDetailModal({
  required BuildContext context,
  required RecallSource source,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    isDismissible: true,
    enableDrag: true,
    builder: (_) => SourceDetailModal(source: source),
  );
}
