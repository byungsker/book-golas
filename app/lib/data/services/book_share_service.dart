import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/book_detail/widgets/book_share_card.dart';
import 'package:book_golas/ui/reading_chart/view_model/reading_chart_view_model.dart';
import 'package:book_golas/ui/reading_chart/widgets/reading_stats_share_card.dart';

class BookShareService {
  static Future<void> shareBookCard({
    required BuildContext context,
    required Book book,
    required int highlightCount,
  }) async {
    await _shareCard(
      context: context,
      filePrefix: 'bookgolas_share',
      subject: book.title,
      precache: () => _precacheBookCover(context, book.imageUrl),
      child: BookShareCard(book: book, highlightCount: highlightCount),
    );
  }

  static Future<void> shareStatsCard({
    required BuildContext context,
    required ReadingChartViewModel vm,
  }) async {
    await _shareCard(
      context: context,
      filePrefix: 'bookgolas_stats',
      child: ReadingStatsShareCard(vm: vm),
    );
  }

  static Future<void> _shareCard({
    required BuildContext context,
    required String filePrefix,
    required Widget child,
    Future<void> Function()? precache,
    String? subject,
  }) async {
    final repaintKey = GlobalKey();
    OverlayEntry? entry;

    try {
      if (precache != null) {
        await precache();
      }

      if (!context.mounted) return;
      final mediaQuery = MediaQuery.of(context);
      final directionality = Directionality.of(context);
      final overlay = Overlay.maybeOf(context, rootOverlay: true);
      if (overlay == null) return;

      entry = OverlayEntry(
        builder: (_) => Positioned(
          left: -10000,
          top: -10000,
          child: IgnorePointer(
            child: MediaQuery(
              data: mediaQuery.copyWith(
                textScaler: const TextScaler.linear(1),
              ),
              child: Directionality(
                textDirection: directionality,
                child: Material(
                  type: MaterialType.transparency,
                  child: RepaintBoundary(
                    key: repaintKey,
                    child: child,
                  ),
                ),
              ),
            ),
          ),
        ),
      );

      overlay.insert(entry);

      final bytes = await _capturePngBytes(
        repaintKey: repaintKey,
        pixelRatio: _sharePixelRatio(mediaQuery),
      );
      if (bytes == null) return;

      final dir = await getTemporaryDirectory();
      final file = File(
        '${dir.path}/${filePrefix}_${DateTime.now().millisecondsSinceEpoch}.png',
      );
      await file.writeAsBytes(bytes, flush: true);

      if (!context.mounted) return;
      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'image/png')],
        subject: subject,
      );
    } catch (e) {
      debugPrint('Failed to share card: $e');
    } finally {
      entry?.remove();
    }
  }

  static Future<void> _precacheBookCover(
    BuildContext context,
    String? imageUrl,
  ) async {
    if (imageUrl == null || imageUrl.isEmpty) return;

    try {
      await precacheImage(CachedNetworkImageProvider(imageUrl), context);
    } catch (e) {
      debugPrint('Failed to precache share cover: $e');
    }
  }

  static Future<Uint8List?> _capturePngBytes({
    required GlobalKey repaintKey,
    required double pixelRatio,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    await WidgetsBinding.instance.endOfFrame;
    await Future<void>.delayed(const Duration(milliseconds: 32));

    final boundary =
        repaintKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return null;

    if (boundary.debugNeedsPaint) {
      await Future<void>.delayed(const Duration(milliseconds: 20));
      return _capturePngBytes(
        repaintKey: repaintKey,
        pixelRatio: pixelRatio,
      );
    }

    final image = await boundary.toImage(pixelRatio: pixelRatio);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData?.buffer.asUint8List();
  }

  static double _sharePixelRatio(MediaQueryData mediaQuery) {
    final targetWidth = mediaQuery.size.width * mediaQuery.devicePixelRatio;
    const logicalWidth =
        BookShareCard.cardWidth > ReadingStatsShareCard.cardWidth
            ? BookShareCard.cardWidth
            : ReadingStatsShareCard.cardWidth;
    return (targetWidth / logicalWidth).clamp(3.0, 6.0);
  }
}
