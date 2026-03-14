import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/ui/core/theme/design_system.dart';

class PageSwipeUpdater extends StatefulWidget {
  final int currentPage;
  final int totalPages;
  final Future<void> Function(int newPage) onPageUpdate;
  final Widget child;

  const PageSwipeUpdater({
    super.key,
    required this.currentPage,
    required this.totalPages,
    required this.onPageUpdate,
    required this.child,
  });

  @override
  State<PageSwipeUpdater> createState() => _PageSwipeUpdaterState();
}

class _PageSwipeUpdaterState extends State<PageSwipeUpdater> {
  int _pendingPage = 0;
  bool _isSwiping = false;
  bool _isUpdating = false;
  Timer? _debounceTimer;
  double _dragDelta = 0;

  static const double _swipeThreshold = 12.0;
  static const int _debounceMs = 800;

  @override
  void initState() {
    super.initState();
    _pendingPage = widget.currentPage;
  }

  @override
  void didUpdateWidget(PageSwipeUpdater oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentPage != widget.currentPage && !_isSwiping) {
      _pendingPage = widget.currentPage;
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onHorizontalDragStart(DragStartDetails details) {
    _dragDelta = 0;
    _isSwiping = true;
    _debounceTimer?.cancel();
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details) {
    if (_isUpdating) return;
    _dragDelta += details.delta.dx;

    final pagesDelta = (_dragDelta / _swipeThreshold).truncate();
    if (pagesDelta != 0) {
      _dragDelta -= pagesDelta * _swipeThreshold;
      final newPage = (_pendingPage + pagesDelta).clamp(0, widget.totalPages);
      if (newPage != _pendingPage) {
        setState(() => _pendingPage = newPage);
        HapticFeedback.selectionClick();
        _restartDebounce();
      }
    }
  }

  void _onHorizontalDragEnd(DragEndDetails details) {
    _isSwiping = false;
    if (_pendingPage != widget.currentPage && !_isUpdating) {
      _restartDebounce();
    }
  }

  void _restartDebounce() {
    _debounceTimer?.cancel();
    _debounceTimer =
        Timer(const Duration(milliseconds: _debounceMs), _commitUpdate);
  }

  Future<void> _commitUpdate() async {
    if (_pendingPage == widget.currentPage || _isUpdating) return;
    setState(() => _isUpdating = true);
    try {
      await widget.onPageUpdate(_pendingPage);
    } finally {
      if (mounted) {
        setState(() => _isUpdating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasChanged = _pendingPage != widget.currentPage;

    return GestureDetector(
      onHorizontalDragStart: _onHorizontalDragStart,
      onHorizontalDragUpdate: _onHorizontalDragUpdate,
      onHorizontalDragEnd: _onHorizontalDragEnd,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          widget.child,
          if (hasChanged || _isUpdating)
            Positioned(
              bottom: -8,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: _isUpdating
                        ? BLabColors.primary.withValues(alpha: 0.8)
                        : BLabColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: _isUpdating
                      ? const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(
                            strokeWidth: 1.5,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          '${_pendingPage}p',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
