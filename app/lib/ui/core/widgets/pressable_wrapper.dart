import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class BLabPressableWrapper extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final double scaleEnd;
  final double brightnessEnd;
  final Duration animationDuration;
  final bool enableHaptic;

  const BLabPressableWrapper({
    super.key,
    required this.child,
    required this.onTap,
    this.onLongPress,
    this.scaleEnd = 0.96,
    this.brightnessEnd = 0.1,
    this.animationDuration = const Duration(milliseconds: 150),
    this.enableHaptic = true,
  });

  @override
  State<BLabPressableWrapper> createState() => _BLabPressableWrapperState();
}

class _BLabPressableWrapperState extends State<BLabPressableWrapper>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _brightnessAnimation;
  final GlobalKey _key = GlobalKey();
  bool _isLongPressing = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.animationDuration,
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: widget.scaleEnd).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    _brightnessAnimation =
        Tween<double>(begin: 0.0, end: widget.brightnessEnd).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    _controller.forward();
  }

  void _onTapUp(TapUpDetails details) {
    Future.delayed(const Duration(milliseconds: 80), () {
      if (mounted) {
        _controller.reverse().then((_) {
          if (mounted) {
            widget.onTap();
          }
        });
      }
    });
  }

  void _onTapCancel() {
    Future.delayed(const Duration(milliseconds: 50), () {
      if (!_isLongPressing && mounted) {
        _controller.reverse();
      }
    });
  }

  void _onLongPressStart(LongPressStartDetails details) {
    _isLongPressing = true;
    if (widget.enableHaptic) {
      HapticFeedback.mediumImpact();
    }
  }

  void _onLongPressEnd(LongPressEndDetails details) {
    _isLongPressing = false;
    _controller.reverse();

    final RenderBox? renderBox =
        _key.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox != null) {
      final localPosition = renderBox.globalToLocal(details.globalPosition);
      final isInside = localPosition.dx >= 0 &&
          localPosition.dx <= renderBox.size.width &&
          localPosition.dy >= 0 &&
          localPosition.dy <= renderBox.size.height;

      if (isInside) {
        if (widget.enableHaptic) {
          HapticFeedback.lightImpact();
        }
        if (widget.onLongPress != null) {
          widget.onLongPress!();
        } else {
          widget.onTap();
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      key: _key,
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onLongPressStart: _onLongPressStart,
      onLongPressEnd: _onLongPressEnd,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: Stack(
              children: [
                widget.child,
                Positioned.fill(
                  child: IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white
                            .withValues(alpha: _brightnessAnimation.value),
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
