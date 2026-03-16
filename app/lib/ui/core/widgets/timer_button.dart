import 'dart:async';
import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// Enhanced timer button with pulsing animation when running
class TimerButton extends StatefulWidget {
  final VoidCallback? onTap;
  final bool isRunning;
  final Duration? elapsed;

  const TimerButton({
    super.key,
    this.onTap,
    this.isRunning = false,
    this.elapsed,
  });

  @override
  State<TimerButton> createState() => _TimerButtonState();
}

class _TimerButtonState extends State<TimerButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(
        parent: _pulseController,
        curve: Curves.easeInOut,
      ),
    );

    if (widget.isRunning) {
      _pulseController.repeat(reverse: true);
    }

    _refreshTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void didUpdateWidget(TimerButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isRunning != oldWidget.isRunning) {
      if (widget.isRunning) {
        _pulseController.repeat(reverse: true);
      } else {
        _pulseController.stop();
        _pulseController.value = 0;
      }
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _refreshTimer?.cancel();
    super.dispose();
  }

  String _formatDuration(Duration? duration) {
    if (duration == null) return '00:00';
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    if (duration.inHours > 0) {
      return '$hours:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: widget.isRunning ? _pulseAnimation.value : 1.0,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: widget.onTap,
                  borderRadius: BorderRadius.circular(100),
                  child: Container(
                    width: 62,
                    height: 62,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          if (widget.isRunning) ...[
                            BLabColors.primary
                                .withValues(alpha: isDark ? 0.6 : 0.4),
                            BLabColors.primary
                                .withValues(alpha: isDark ? 0.4 : 0.25),
                          ] else ...[
                            BLabColors.primary
                                .withValues(alpha: isDark ? 0.4 : 0.2),
                            BLabColors.primary
                                .withValues(alpha: isDark ? 0.2 : 0.1),
                          ],
                        ],
                      ),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: widget.isRunning
                            ? BLabColors.primary.withValues(alpha: 0.8)
                            : BLabColors.primary.withValues(alpha: 0.4),
                        width: widget.isRunning ? 2 : 1,
                      ),
                      boxShadow: widget.isRunning
                          ? [
                              BoxShadow(
                                color: BLabColors.primary.withValues(alpha: 0.4),
                                blurRadius: 12,
                                spreadRadius: 2,
                              ),
                            ]
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          widget.isRunning
                              ? CupertinoIcons.pause_fill
                              : CupertinoIcons.timer_fill,
                          size: 20,
                          color: Colors.white,
                        ),
                        if (widget.isRunning && widget.elapsed != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            _formatDuration(widget.elapsed),
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
