import 'dart:math';

import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/note_structure_models.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class NoteStructureMindmap extends StatefulWidget {
  final NoteStructure? structure;
  final String bookTitle;

  const NoteStructureMindmap({
    super.key,
    required this.structure,
    this.bookTitle = '',
  });

  @override
  State<NoteStructureMindmap> createState() => _NoteStructureMindmapState();
}

class _NoteStructureMindmapState extends State<NoteStructureMindmap>
    with SingleTickerProviderStateMixin {
  final TransformationController _transformController =
      TransformationController();
  late AnimationController _animController;
  late Animation<double> _fadeAnimation;

  List<_MindmapNodeData> _nodeDataList = [];
  _MindmapNodeData? _selectedNode;

  static const double _centerNodeRadius = 48.0;
  static const double _clusterNodeRadius = 36.0;
  static const double _leafNodeRadius = 28.0;
  static const double _clusterOrbitRadius = 160.0;
  static const double _leafOrbitRadius = 100.0;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    );
    _buildLayout();
    _animController.forward();
  }

  @override
  void didUpdateWidget(covariant NoteStructureMindmap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.structure != widget.structure) {
      _buildLayout();
      _animController.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    _transformController.dispose();
    super.dispose();
  }

  void _buildLayout() {
    _nodeDataList = [];
    _selectedNode = null;
    final structure = widget.structure;
    if (structure == null || structure.clusters.isEmpty) return;

    final clusters = structure.clusters;
    const centerX = 0.0;
    const centerY = 0.0;

    final centerNode = _MindmapNodeData(
      id: '__center__',
      label: widget.bookTitle.isNotEmpty ? widget.bookTitle : 'Book',
      type: _NodeType.center,
      x: centerX,
      y: centerY,
      radius: _centerNodeRadius,
      color: BLabColors.primary,
    );
    _nodeDataList.add(centerNode);

    final clusterAngleStep = 2 * pi / clusters.length;
    for (int i = 0; i < clusters.length; i++) {
      final cluster = clusters[i];
      final angle = clusterAngleStep * i - pi / 2;
      final cx = centerX + _clusterOrbitRadius * cos(angle);
      final cy = centerY + _clusterOrbitRadius * sin(angle);
      final clusterColor = _getClusterColor(i);

      final clusterNode = _MindmapNodeData(
        id: cluster.id,
        label: cluster.name,
        summary: cluster.summary,
        type: _NodeType.cluster,
        x: cx,
        y: cy,
        radius: _clusterNodeRadius,
        color: clusterColor,
        parentId: '__center__',
      );
      _nodeDataList.add(clusterNode);

      final leafCount = cluster.nodes.length;
      if (leafCount == 0) continue;
      final leafAngleStep = 2 * pi / max(leafCount, 1);
      final leafOrbit = _leafOrbitRadius + (leafCount > 6 ? 20.0 : 0.0);

      for (int j = 0; j < leafCount; j++) {
        final node = cluster.nodes[j];
        final leafAngle = leafAngleStep * j - pi / 2;
        final lx = cx + leafOrbit * cos(leafAngle);
        final ly = cy + leafOrbit * sin(leafAngle);

        final leafNode = _MindmapNodeData(
          id: node.id,
          label: node.content.length > 30
              ? '${node.content.substring(0, 30)}...'
              : node.content,
          fullContent: node.content,
          type: _NodeType.leaf,
          nodeType: node.type,
          pageNumber: node.pageNumber,
          x: lx,
          y: ly,
          radius: _leafNodeRadius,
          color: _getNodeTypeColor(node.type, clusterColor),
          parentId: cluster.id,
        );
        _nodeDataList.add(leafNode);
      }
    }

    for (final conn in structure.connections) {
      final fromNode =
          _nodeDataList.where((n) => n.id == conn.fromNodeId).firstOrNull;
      if (fromNode != null) {
        fromNode.connectionTargets.add(conn.toNodeId);
      }
    }
  }

  Color _getClusterColor(int index) {
    return BLabColors.chartColors[index % BLabColors.chartColors.length];
  }

  Color _getNodeTypeColor(String type, Color fallback) {
    switch (type) {
      case 'highlight':
        return Colors.amber[700]!;
      case 'note':
        return BLabColors.success;
      case 'photo_ocr':
        return BLabColors.purple;
      default:
        return fallback.withValues(alpha: 0.8);
    }
  }

  double get _offsetX {
    if (_nodeDataList.isEmpty) return 150;
    double minX = double.infinity;
    for (final node in _nodeDataList) {
      minX = min(minX, node.x - node.radius);
    }
    return -minX + 150;
  }

  double get _offsetY {
    if (_nodeDataList.isEmpty) return 150;
    double minY = double.infinity;
    for (final node in _nodeDataList) {
      minY = min(minY, node.y - node.radius);
    }
    return -minY + 150;
  }

  double _calculateCanvasWidth() {
    if (_nodeDataList.isEmpty) return 600;
    double minX = double.infinity;
    double maxX = double.negativeInfinity;
    for (final node in _nodeDataList) {
      minX = min(minX, node.x - node.radius);
      maxX = max(maxX, node.x + node.radius);
    }
    return (maxX - minX) + 300;
  }

  double _calculateCanvasHeight() {
    if (_nodeDataList.isEmpty) return 600;
    double minY = double.infinity;
    double maxY = double.negativeInfinity;
    for (final node in _nodeDataList) {
      minY = min(minY, node.y - node.radius);
      maxY = max(maxY, node.y + node.radius);
    }
    return (maxY - minY) + 300;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (widget.structure == null || widget.structure!.clusters.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.account_tree_outlined,
                size: 64,
                color: isDark ? Colors.grey[600] : Colors.grey[300],
              ),
              const SizedBox(height: 16),
              Text(
                '독서 기록이 부족합니다.\n최소 5개 이상의 하이라이트나 메모가 필요합니다.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return AnimatedBuilder(
      animation: _fadeAnimation,
      builder: (context, child) {
        return Opacity(
          opacity: _fadeAnimation.value,
          child: child,
        );
      },
      child: InteractiveViewer(
        transformationController: _transformController,
        constrained: false,
        boundaryMargin: const EdgeInsets.all(500),
        minScale: 0.3,
        maxScale: 2.5,
        child: SizedBox(
          width: _calculateCanvasWidth(),
          height: _calculateCanvasHeight(),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              CustomPaint(
                size: Size(_calculateCanvasWidth(), _calculateCanvasHeight()),
                painter: _ConnectionPainter(
                  nodes: _nodeDataList,
                  isDark: isDark,
                  offsetX: _offsetX,
                  offsetY: _offsetY,
                ),
              ),
              ..._nodeDataList.map((node) => _buildNodeWidget(node, isDark)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNodeWidget(_MindmapNodeData node, bool isDark) {
    final isSelected = _selectedNode?.id == node.id;
    final ox = _offsetX;
    final oy = _offsetY;

    Widget nodeContent;

    switch (node.type) {
      case _NodeType.center:
        nodeContent = _buildCenterNode(node, isDark, isSelected);
        break;
      case _NodeType.cluster:
        nodeContent = _buildClusterNode(node, isDark, isSelected);
        break;
      case _NodeType.leaf:
        nodeContent = _buildLeafNode(node, isDark, isSelected);
        break;
    }

    return Positioned(
      left: node.x + ox - node.radius,
      top: node.y + oy - node.radius,
      child: GestureDetector(
        onTap: () => _onNodeTap(node),
        child: nodeContent,
      ),
    );
  }

  Widget _buildCenterNode(_MindmapNodeData node, bool isDark, bool isSelected) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: node.radius * 2,
      height: node.radius * 2,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            node.color,
            node.color.withValues(alpha: 0.7),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: node.color.withValues(alpha: 0.4),
            blurRadius: isSelected ? 20 : 12,
            spreadRadius: isSelected ? 4 : 2,
          ),
        ],
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Text(
            node.label,
            textAlign: TextAlign.center,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              height: 1.2,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildClusterNode(
      _MindmapNodeData node, bool isDark, bool isSelected) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: node.radius * 2,
      height: node.radius * 2,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isDark
            ? node.color.withValues(alpha: 0.25)
            : node.color.withValues(alpha: 0.15),
        border: Border.all(
          color: node.color.withValues(alpha: isSelected ? 1.0 : 0.6),
          width: isSelected ? 3 : 2,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: node.color.withValues(alpha: 0.3),
                  blurRadius: 12,
                  spreadRadius: 2,
                ),
              ]
            : [],
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(6.0),
          child: Text(
            node.label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: isDark ? node.color : node.color.withValues(alpha: 0.9),
              height: 1.2,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLeafNode(_MindmapNodeData node, bool isDark, bool isSelected) {
    IconData icon;
    switch (node.nodeType) {
      case 'highlight':
        icon = Icons.format_quote_rounded;
        break;
      case 'note':
        icon = Icons.edit_note_rounded;
        break;
      case 'photo_ocr':
        icon = Icons.camera_alt_rounded;
        break;
      default:
        icon = Icons.circle;
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: node.radius * 2,
      height: node.radius * 2,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isDark
            ? node.color.withValues(alpha: 0.2)
            : node.color.withValues(alpha: 0.12),
        border: Border.all(
          color: node.color.withValues(alpha: isSelected ? 1.0 : 0.5),
          width: isSelected ? 2.5 : 1.5,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: node.color.withValues(alpha: 0.3),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ]
            : [],
      ),
      child: Center(
        child: Icon(
          icon,
          size: 16,
          color: node.color.withValues(alpha: isDark ? 0.9 : 0.7),
        ),
      ),
    );
  }

  void _onNodeTap(_MindmapNodeData node) {
    setState(() {
      _selectedNode = _selectedNode?.id == node.id ? null : node;
    });

    if (node.type == _NodeType.leaf && node.fullContent != null) {
      _showLeafNodeDetail(node);
    } else if (node.type == _NodeType.cluster && node.summary != null) {
      _showClusterDetail(node);
    }
  }

  void _showLeafNodeDetail(_MindmapNodeData node) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color badgeColor;
    String badgeLabel;

    switch (node.nodeType) {
      case 'highlight':
        badgeColor = Colors.amber[700]!;
        badgeLabel = '하이라이트';
        break;
      case 'note':
        badgeColor = BLabColors.success;
        badgeLabel = '메모';
        break;
      case 'photo_ocr':
        badgeColor = BLabColors.purple;
        badgeLabel = '사진 OCR';
        break;
      default:
        badgeColor = Colors.grey;
        badgeLabel = node.nodeType ?? '';
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetContext) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.85,
        builder: (_, scrollController) => Container(
          decoration: BoxDecoration(
            color: isDark ? BLabColors.surfaceDark : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[400],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: badgeColor,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badgeLabel,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    if (node.pageNumber != null) ...[
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.grey[800] : Colors.grey[200],
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'p.${node.pageNumber}',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isDark ? Colors.grey[300] : Colors.grey[700],
                          ),
                        ),
                      ),
                    ],
                    const Spacer(),
                    IconButton(
                      icon: Icon(
                        Icons.close,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                      onPressed: () => Navigator.pop(sheetContext),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Divider(
                color: isDark ? Colors.grey[800] : Colors.grey[200],
                height: 1,
              ),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    node.fullContent ?? node.label,
                    style: TextStyle(
                      fontSize: 16,
                      height: 1.7,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showClusterDetail(_MindmapNodeData node) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? BLabColors.surfaceDark : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.grey[400],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: node.color,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    node.label,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(
                    Icons.close,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                  onPressed: () => Navigator.pop(sheetContext),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              node.summary ?? '',
              style: TextStyle(
                fontSize: 15,
                height: 1.6,
                color: isDark ? Colors.grey[300] : Colors.grey[700],
              ),
            ),
            SizedBox(
              height: MediaQuery.of(sheetContext).padding.bottom + 16,
            ),
          ],
        ),
      ),
    );
  }
}

class _ConnectionPainter extends CustomPainter {
  final List<_MindmapNodeData> nodes;
  final bool isDark;
  final double offsetX;
  final double offsetY;

  _ConnectionPainter({
    required this.nodes,
    required this.isDark,
    required this.offsetX,
    required this.offsetY,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (nodes.isEmpty) return;

    for (final node in nodes) {
      if (node.parentId == null) continue;
      final parent = nodes.where((n) => n.id == node.parentId).firstOrNull;
      if (parent == null) continue;

      final paint = Paint()
        ..strokeWidth = node.type == _NodeType.cluster ? 2.0 : 1.2
        ..style = PaintingStyle.stroke;

      if (node.type == _NodeType.cluster) {
        paint.color = node.color.withValues(alpha: isDark ? 0.4 : 0.3);
      } else {
        paint.color = node.color.withValues(alpha: isDark ? 0.25 : 0.2);
      }

      final startX = parent.x + offsetX;
      final startY = parent.y + offsetY;
      final endX = node.x + offsetX;
      final endY = node.y + offsetY;

      final midX = (startX + endX) / 2;
      final midY = (startY + endY) / 2;
      final controlX = midX + (endY - startY) * 0.15;
      final controlY = midY - (endX - startX) * 0.15;

      final path = Path()
        ..moveTo(startX, startY)
        ..quadraticBezierTo(controlX, controlY, endX, endY);

      canvas.drawPath(path, paint);
    }

    for (final node in nodes) {
      for (final targetId in node.connectionTargets) {
        final target = nodes.where((n) => n.id == targetId).firstOrNull;
        if (target == null) continue;

        final paint = Paint()
          ..color = isDark
              ? Colors.white.withValues(alpha: 0.15)
              : Colors.black.withValues(alpha: 0.1)
          ..strokeWidth = 1.0
          ..style = PaintingStyle.stroke;

        final startX = node.x + offsetX;
        final startY = node.y + offsetY;
        final endX = target.x + offsetX;
        final endY = target.y + offsetY;

        _drawDashedLine(canvas, paint, startX, startY, endX, endY);
      }
    }
  }

  void _drawDashedLine(
      Canvas canvas, Paint paint, double x1, double y1, double x2, double y2) {
    const dashLength = 6.0;
    const gapLength = 4.0;
    final dx = x2 - x1;
    final dy = y2 - y1;
    final distance = sqrt(dx * dx + dy * dy);
    if (distance == 0) return;
    final unitDx = dx / distance;
    final unitDy = dy / distance;

    double currentDistance = 0;
    bool isDash = true;

    while (currentDistance < distance) {
      final segmentLength = isDash ? dashLength : gapLength;
      final endDistance = min(currentDistance + segmentLength, distance);

      if (isDash) {
        canvas.drawLine(
          Offset(x1 + unitDx * currentDistance, y1 + unitDy * currentDistance),
          Offset(x1 + unitDx * endDistance, y1 + unitDy * endDistance),
          paint,
        );
      }

      currentDistance = endDistance;
      isDash = !isDash;
    }
  }

  @override
  bool shouldRepaint(covariant _ConnectionPainter oldDelegate) {
    return oldDelegate.nodes != nodes || oldDelegate.isDark != isDark;
  }
}

enum _NodeType { center, cluster, leaf }

class _MindmapNodeData {
  final String id;
  final String label;
  final String? fullContent;
  final String? summary;
  final _NodeType type;
  final String? nodeType;
  final int? pageNumber;
  final double x;
  final double y;
  final double radius;
  final Color color;
  final String? parentId;
  final List<String> connectionTargets;

  _MindmapNodeData({
    required this.id,
    required this.label,
    this.fullContent,
    this.summary,
    required this.type,
    this.nodeType,
    this.pageNumber,
    required this.x,
    required this.y,
    required this.radius,
    required this.color,
    this.parentId,
    List<String>? connectionTargets,
  }) : connectionTargets = connectionTargets ?? [];
}
