import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/ui/book_detail/widgets/book_share_card.dart';

class BookShareService {
  static Future<void> shareBookCard({
    required BuildContext context,
    required Book book,
    required int highlightCount,
  }) async {
    final repaintKey = GlobalKey();
    OverlayEntry? entry;

    try {
      entry = OverlayEntry(
        builder: (_) => Positioned(
          left: -2000,
          top: -2000,
          child: Material(
            color: Colors.transparent,
            child: RepaintBoundary(
              key: repaintKey,
              child: BookShareCard(book: book, highlightCount: highlightCount),
            ),
          ),
        ),
      );

      if (!context.mounted) return;
      Overlay.of(context).insert(entry);

      await Future.delayed(const Duration(milliseconds: 300));

      final boundary =
          repaintKey.currentContext?.findRenderObject()
              as RenderRepaintBoundary?;
      if (boundary == null) return;

      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) return;

      final bytes = byteData.buffer.asUint8List();
      final dir = await getTemporaryDirectory();
      final file = File(
        '${dir.path}/bookgolas_share_${DateTime.now().millisecondsSinceEpoch}.png',
      );
      await file.writeAsBytes(bytes);

      if (!context.mounted) return;
      await Share.shareXFiles([
        XFile(file.path, mimeType: 'image/png'),
      ], subject: book.title);
    } catch (e) {
      debugPrint('Failed to share book card: $e');
    } finally {
      entry?.remove();
    }
  }
}
